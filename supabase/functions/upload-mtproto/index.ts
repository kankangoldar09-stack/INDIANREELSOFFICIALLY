import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { fileUrl, fileName, fileSize, mimeType = 'video/mp4' } = await req.json();
    
    console.log(`[MTProto] Starting upload: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Load dynamic config from DB
    let TELEGRAM_BOT_TOKEN = '';
    let TELEGRAM_CHAT_ID = '@indianreels_storage';
    
    try {
      const configRes = await fetch(`${supabaseUrl}/rest/v1/telegram_config`, {
        headers: { 
          'Authorization': `Bearer ${supabaseServiceRole}`, 
          'apikey': supabaseServiceRole,
          'Content-Type': 'application/json'
        }
      });
      
      if (configRes.ok) {
        const configs = await configRes.json();
        const configMap: Record<string, string> = {};
        (configs || []).forEach((c: any) => { 
          if (c.key && c.value) configMap[c.key] = c.value; 
        });
        
        TELEGRAM_BOT_TOKEN = configMap['bot_token'] || Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
        TELEGRAM_CHAT_ID = configMap['chat_id'] || Deno.env.get('TELEGRAM_CHAT_ID') || '@indianreels_storage';
        
        console.log(`[MTProto] Config loaded: Bot Token ${TELEGRAM_BOT_TOKEN ? 'found' : 'missing'}, Chat ID: ${TELEGRAM_CHAT_ID}`);
      }
    } catch (configError) {
      console.warn('[MTProto] Config fetch failed, using env vars:', configError.message);
      TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
    }

    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.trim() === '') {
      throw new Error('Telegram Bot Token not configured. Please go to Settings -> Telegram Configuration (Admin).');
    }

    // Validate file URL
    if (!fileUrl || !fileUrl.startsWith('http')) {
      throw new Error('Invalid file URL provided');
    }

    // For files <= 50MB, use single request (Telegram Bot API limit)
    if (fileSize <= 50 * 1024 * 1024) {
      console.log('[MTProto] Using single request upload (file <= 50MB)');
      
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file from storage: ${fileResponse.statusText}`);
      }
      
      const fileBlob = await fileResponse.blob();
      console.log(`[MTProto] File fetched, blob size: ${fileBlob.size} bytes`);
      
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_CHAT_ID);
      formData.append('document', fileBlob, fileName);
      formData.append('caption', `📹 ${fileName}\n💾 ${(fileSize / 1024 / 1024).toFixed(2)} MB\n🚀 INDIANREELS`);

      console.log(`[MTProto] Sending to Telegram API...`);
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData,
      });

      const result = await tgRes.json();
      console.log(`[MTProto] Telegram API response:`, result);
      
      if (!result.ok) {
        throw new Error(`Telegram API Error: ${result.description || 'Unknown error'}`);
      }

      const chatIdStr = String(result.result.chat.id).replace('-100', '');
      const telegramLink = `https://t.me/c/${chatIdStr}/${result.result.message_id}`;
      
      console.log(`[MTProto] ✅ Upload successful! Link: ${telegramLink}`);
      
      return new Response(JSON.stringify({
        success: true,
        telegramLink,
        method: 'direct',
        fileSize: fileSize,
        fileName: fileName
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      
    } else {
      // For files > 50MB, use chunked upload
      console.log('[MTProto] Using chunked upload (file > 50MB)');
      
      const CHUNK_SIZE = 49 * 1024 * 1024; // 49MB chunks (safe under 50MB limit)
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const uploadedParts = [];

      console.log(`[MTProto] Will upload ${totalChunks} chunks`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
        const chunkSize = end - start + 1;
        
        console.log(`[MTProto] Chunk ${i+1}/${totalChunks}: bytes ${start}-${end} (${(chunkSize / 1024 / 1024).toFixed(2)} MB)`);
        
        try {
          // Fetch specific range from Supabase Storage
          const chunkResponse = await fetch(fileUrl, {
            headers: { 'Range': `bytes=${start}-${end}` }
          });
          
          if (!chunkResponse.ok) {
            console.error(`[MTProto] Failed to fetch chunk ${i+1}: ${chunkResponse.statusText}`);
            continue; // Skip this chunk but continue with others
          }
          
          const chunkBlob = await chunkResponse.blob();
          console.log(`[MTProto] Chunk ${i+1} fetched: ${chunkBlob.size} bytes`);
          
          const formData = new FormData();
          formData.append('chat_id', TELEGRAM_CHAT_ID);
          formData.append('document', chunkBlob, `${fileName}.part${i + 1}.mp4`);
          formData.append('caption', `📦 Part ${i + 1}/${totalChunks}\n📹 ${fileName}\n💾 ${(chunkSize / 1024 / 1024).toFixed(2)} MB`);

          const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: formData
          });
          
          const result = await res.json();
          
          if (result.ok) {
            const chatIdStr = String(result.result.chat.id).replace('-100', '');
            const partLink = `https://t.me/c/${chatIdStr}/${result.result.message_id}`;
            uploadedParts.push(partLink);
            console.log(`[MTProto] ✅ Chunk ${i+1} uploaded: ${partLink}`);
          } else {
            console.error(`[MTProto] ❌ Chunk ${i+1} failed:`, result.description);
          }
          
          // Delay to prevent rate limiting
          if (i < totalChunks - 1) {
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (chunkError) {
          console.error(`[MTProto] Error processing chunk ${i+1}:`, chunkError.message);
        }
      }

      if (uploadedParts.length === 0) {
        throw new Error('All chunks failed to upload to Telegram. Check Bot Token and Chat ID.');
      }

      console.log(`[MTProto] ✅ Chunked upload complete! ${uploadedParts.length}/${totalChunks} parts uploaded`);

      return new Response(JSON.stringify({
        success: true,
        telegramLink: uploadedParts[0],
        parts: uploadedParts,
        method: 'chunked',
        totalParts: totalChunks,
        uploadedParts: uploadedParts.length
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error('[MTProto] ❌ Error:', error.message);
    console.error('[MTProto] Stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: 'Check Edge Function logs for more information'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
