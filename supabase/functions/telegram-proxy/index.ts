import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

    try {
      let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim()
      const chatId = Deno.env.get('TELEGRAM_CHAT_ID')?.trim()

      if (botToken?.toLowerCase().startsWith('bot')) {
        botToken = botToken.substring(3).trim();
      }
      if (botToken?.startsWith('/')) {
        botToken = botToken.substring(1).trim();
      }

      if (!botToken || !chatId) {
        throw new Error('Telegram credentials not configured')
      }

      if (!botToken.includes(':')) {
        throw new Error('Invalid Telegram Bot Token format. It must include a colon (e.g., 123456:ABC...).')
      }

    const url = new URL(req.url)
    const queryFileId = url.searchParams.get('file_id')
    const queryFileIds = url.searchParams.get('file_ids')

    let bodyData: any = {}
    if (req.method === 'POST') {
      try {
        bodyData = await req.json()
      } catch (e) {
        console.warn('Could not parse JSON body')
      }
    }

    const file_id = queryFileId || bodyData.file_id
    const file_ids = queryFileIds ? queryFileIds.split(',') : (bodyData.file_ids || (file_id ? [file_id] : []))
    const method = bodyData.method
    const video = bodyData.video
    const photo = bodyData.photo
    const caption = bodyData.caption

    // If file_ids are provided, we are in "streaming/proxy" mode
    if (file_ids && file_ids.length > 0) {
      console.log(`Proxying ${file_ids.length} file(s)...`)
      
      // For single file, just proxy it directly
      if (file_ids.length === 1) {
        const fid = file_ids[0];
        console.log(`Proxying single file: ${fid}`);
        
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fid}`);
        const fileInfo = await fileInfoRes.json();
        
        if (!fileInfo.ok) {
          throw new Error(`Failed to get file info: ${fileInfo.description}`);
        }

        const filePath = fileInfo.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        
        const response = await fetch(fileUrl);
        const { body, headers } = response;

        return new Response(body, {
          headers: {
            ...corsHeaders,
            'Content-Type': headers.get('Content-Type') || 'video/mp4',
            'Content-Length': headers.get('Content-Length') || '',
            'Accept-Ranges': 'bytes',
          },
        });
      }
      
      // For multiple files, stream them sequentially
      console.log(`Streaming ${file_ids.length} chunks...`)
      
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      // Handle the streaming in a separate promise
      const streamChunks = async () => {
        try {
          for (const fid of file_ids) {
            console.log(`Fetching chunk: ${fid}`)
            const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fid}`)
            const fileInfo = await fileInfoRes.json()
            
            if (!fileInfo.ok) {
              console.error(`Failed to get file info for ${fid}:`, fileInfo)
              continue
            }

            const filePath = fileInfo.result.file_path
            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`
            
            const response = await fetch(fileUrl)
            if (!response.body) continue

            // Pipe the chunk to the main writer
            const reader = response.body.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              await writer.write(value)
            }
          }
        } catch (err) {
          console.error('Streaming error:', err)
        } finally {
          await writer.close()
        }
      }

      streamChunks()

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'none',
        },
      })
    }

    // Otherwise, we are in "upload" mode
    const telegramUrl = `https://api.telegram.org/bot${botToken}/${method}`
    
    // For simplicity, we assume the video/photo is a URL from Supabase Storage
    const body: any = {
      chat_id: chatId,
      caption: caption || '',
    }

    if (method === 'sendVideo') {
      body.video = video
    } else {
      body.photo = photo
    }

    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!data.ok) {
      return new Response(JSON.stringify({ success: false, error: data.description }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Return the file_id so we can proxy it later
    const resultFileId = data.result.video?.file_id || data.result.photo?.[data.result.photo.length - 1]?.file_id

    return new Response(JSON.stringify({ 
      success: true, 
      data, 
      file_id: resultFileId,
      proxy_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-proxy?file_id=${resultFileId}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
