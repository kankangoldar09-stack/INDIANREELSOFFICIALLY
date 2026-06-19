import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { uploadId, userId, fileExt, totalChunks } = await req.json()
    
    if (!uploadId || !userId || !fileExt || !totalChunks) {
      throw new Error('Missing required parameters: uploadId, userId, fileExt, totalChunks')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Starting merge for uploadId: ${uploadId}, userId: ${userId}, totalChunks: ${totalChunks}`)

    // Strategy: Instead of downloading, merging, and re-uploading (which hits size limits),
    // we'll move/copy chunks to final location and let the client handle concatenation
    // OR use Storage's built-in features
    
    // For single chunk, just move it to final location
    if (totalChunks === 1) {
      const chunkPath = `temp/${userId}/${uploadId}/chunk_0.${fileExt}`
      const finalPath = `${userId}/${uploadId}.${fileExt}`
      
      console.log(`Single chunk - moving from ${chunkPath} to ${finalPath}`)
      
      // Download and re-upload with final name
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('media')
        .download(chunkPath)
      
      if (downloadError) {
        throw new Error(`Failed to download chunk: ${downloadError.message}`)
      }
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(finalPath, chunkData, {
          contentType: `video/${fileExt}`,
          upsert: false
        })
      
      if (uploadError) {
        throw new Error(`Failed to upload final file: ${uploadError.message}`)
      }
      
      // Delete temp chunk
      await supabase.storage.from('media').remove([chunkPath])
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(finalPath)
      
      return new Response(JSON.stringify({ 
        success: true,
        publicUrl,
        finalPath,
        totalSize: chunkData.size,
        message: 'Video uploaded successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // For multiple chunks: Download all, merge as Blob, upload in smaller parts
    const chunkBlobs: Blob[] = []
    let totalSize = 0

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `temp/${userId}/${uploadId}/chunk_${i}.${fileExt}`
      
      console.log(`Downloading chunk ${i + 1}/${totalChunks} from ${chunkPath}`)
      
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('media')
        .download(chunkPath)
      
      if (downloadError) {
        console.error(`Failed to download chunk ${i}:`, downloadError)
        throw new Error(`Failed to download chunk ${i}: ${downloadError.message}`)
      }
      
      chunkBlobs.push(chunkData)
      totalSize += chunkData.size
      
      console.log(`Chunk ${i + 1} downloaded: ${chunkData.size} bytes`)
    }

    console.log(`All chunks downloaded. Total size: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`)

    // Merge all chunks into one Blob
    const mergedBlob = new Blob(chunkBlobs, { type: `video/${fileExt}` })
    console.log(`Chunks merged successfully. Final size: ${mergedBlob.size} bytes`)

    const finalFileName = `${uploadId}.${fileExt}`
    const finalPath = `${userId}/${finalFileName}`
    
    // Try uploading to Supabase Storage first
    console.log(`Uploading merged file to Supabase Storage at ${finalPath} (size: ${(mergedBlob.size / 1024 / 1024).toFixed(2)} MB)`)
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(finalPath, mergedBlob, {
        contentType: `video/${fileExt}`,
        upsert: true,
        cacheControl: '3600'
      })
    
    if (uploadError) {
      console.error('Supabase upload failed:', uploadError)
      
      // If Supabase fails due to size, try Telegram as fallback
      const MAX_TELEGRAM_SIZE = 50 * 1024 * 1024 // 50MB for Telegram HTTP upload
      
      if (mergedBlob.size <= MAX_TELEGRAM_SIZE) {
        console.log('Trying Telegram as fallback...')
        
        const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID')
        
        if (telegramBotToken && telegramChatId) {
          try {
            const formData = new FormData()
            formData.append('chat_id', telegramChatId)
            formData.append('video', mergedBlob, finalFileName)
            formData.append('supports_streaming', 'true')
            
            const telegramResponse = await fetch(
              `https://api.telegram.org/bot${telegramBotToken}/sendVideo`,
              {
                method: 'POST',
                body: formData,
              }
            )
            
            if (telegramResponse.ok) {
              const telegramData = await telegramResponse.json()
              
              if (telegramData.ok && telegramData.result?.video?.file_id) {
                const fileId = telegramData.result.video.file_id
                const telegramProxyUrl = `https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${fileId}`
                
                console.log(`Video uploaded to Telegram successfully. File ID: ${fileId}`)
                
                // Clean up temporary chunks
                const chunkPaths = []
                for (let i = 0; i < totalChunks; i++) {
                  chunkPaths.push(`temp/${userId}/${uploadId}/chunk_${i}.${fileExt}`)
                }
                await supabase.storage.from('media').remove(chunkPaths)
                
                return new Response(JSON.stringify({ 
                  success: true,
                  publicUrl: telegramProxyUrl,
                  finalPath: `telegram:${fileId}`,
                  totalSize: mergedBlob.size,
                  usedTelegram: true,
                  message: 'Video uploaded to Telegram (Supabase fallback)'
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                })
              }
            }
          } catch (telegramError) {
            console.error('Telegram fallback also failed:', telegramError)
          }
        }
      }
      
      // Both Supabase and Telegram failed
      throw new Error(`Failed to upload merged file: ${uploadError.message}. File size: ${(mergedBlob.size / 1024 / 1024).toFixed(2)} MB. Please try compressing the video or splitting it into smaller parts.`)
    }
    
    console.log('Upload to Supabase completed successfully')

    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(finalPath)

    console.log(`Merged file uploaded successfully: ${publicUrl}`)

    // Clean up temporary chunks
    console.log('Cleaning up temporary chunks...')
    
    const chunkPaths = []
    for (let i = 0; i < totalChunks; i++) {
      chunkPaths.push(`temp/${userId}/${uploadId}/chunk_${i}.${fileExt}`)
    }
    
    const { error: deleteError } = await supabase.storage
      .from('media')
      .remove(chunkPaths)
    
    if (deleteError) {
      console.warn('Failed to delete some chunks:', deleteError)
    } else {
      console.log('Temporary chunks cleaned up successfully')
    }

    return new Response(JSON.stringify({ 
      success: true,
      publicUrl,
      finalPath,
      totalSize: mergedBlob.size,
      message: 'Video chunks merged successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Merge error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
