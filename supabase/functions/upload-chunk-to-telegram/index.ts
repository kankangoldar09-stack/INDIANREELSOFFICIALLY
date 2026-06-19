import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { chunkIndex, totalChunks, uploadId, userId, fileExt } = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Load dynamic config
    const { data: configs } = await supabase.from('telegram_config').select('*')
    const configMap: Record<string, string> = {}
    (configs || []).forEach((c: any) => { configMap[c.key] = c.value })

    const TELEGRAM_BOT_TOKEN = configMap['bot_token'] || Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHAT_ID = configMap['chat_id'] || Deno.env.get('TELEGRAM_CHAT_ID')

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Telegram configuration not found. Please set in Settings.')
    }

    // Download chunk
    const chunkPath = `temp/${userId}/${uploadId}/chunk_${chunkIndex}.${fileExt}`
    const { data: chunkData, error: downloadError } = await supabase.storage.from('media').download(chunkPath)
    if (downloadError) throw new Error(`Download error: ${downloadError.message}`)

    // Upload to Telegram
    const formData = new FormData()
    formData.append('chat_id', TELEGRAM_CHAT_ID)
    formData.append('document', chunkData, `${uploadId}_part${chunkIndex + 1}.${fileExt}`)
    formData.append('caption', `Part ${chunkIndex + 1}/${totalChunks}`)

    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST', body: formData
    })
    
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json()
      throw new Error(`Telegram Error: ${errorData.description || JSON.stringify(errorData)}`)
    }
    
    const telegramData = await telegramResponse.json()
    const fileId = telegramData.result.document?.file_id
    const proxyUrl = `${supabaseUrl}/functions/v1/telegram-proxy?file_id=${fileId}`

    // Cleanup
    await supabase.storage.from('media').remove([chunkPath])

    return new Response(JSON.stringify({ 
      success: true, chunkIndex, fileId, telegramUrl: proxyUrl, message: `Part ${chunkIndex + 1}/${totalChunks} uploaded`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Chunk upload error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
