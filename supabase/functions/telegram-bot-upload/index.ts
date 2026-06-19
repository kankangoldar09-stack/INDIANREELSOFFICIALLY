import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileName, fileSize, mimeType, caption } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'File URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Get Telegram config
    let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    let channelId = Deno.env.get('TELEGRAM_CHANNEL_ID') || '@indianreels_official';

    if (!botToken) {
      console.log('🔍 Fetching Telegram config from database...');
      const { data: configs } = await supabase
        .from('telegram_config')
        .select('key, value');

      if (configs) {
        const tokenCfg = configs.find((c: any) => c.key === 'bot_token');
        const channelCfg = configs.find((c: any) => c.key === 'channel_id');
        if (tokenCfg) botToken = tokenCfg.value;
        if (channelCfg) channelId = channelCfg.value;
      }
    }

    if (!botToken) {
      console.error('❌ Telegram Bot Token not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram Bot Token not configured.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isVideo = mimeType?.startsWith('video/') ||
      (fileName && /\.(mp4|mov|webm|mkv|3gp|avi)$/i.test(fileName));
    const method = isVideo ? 'sendVideo' : 'sendPhoto';
    const fileField = isVideo ? 'video' : 'photo';

    console.log(`📤 Downloading file from Supabase Storage: ${fileName} (${fileSize} bytes)`);

    // ── Download file as binary then re-upload to Telegram ──
    const downloadRes = await fetch(fileUrl, { headers: { 'User-Agent': 'INDIANREELS/1.0' } });
    if (!downloadRes.ok) {
      throw new Error(`Failed to download file: HTTP ${downloadRes.status}`);
    }
    const fileBlob = await downloadRes.blob();
    const safeFileName = fileName || (isVideo ? 'reel.mp4' : 'photo.jpg');
    const contentType = mimeType || (isVideo ? 'video/mp4' : 'image/jpeg');

    console.log(`✅ Downloaded ${fileBlob.size} bytes, uploading to Telegram as ${safeFileName}...`);

    const formData = new FormData();
    formData.append('chat_id', channelId);
    formData.append(fileField, new Blob([fileBlob], { type: contentType }), safeFileName);
    if (caption) formData.append('caption', caption);
    // For videos: disable notification for large files, allow more time
    if (isVideo) {
      formData.append('supports_streaming', 'true');
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/${method}`;
    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      body: formData,
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('❌ Telegram API Error:', JSON.stringify(telegramResult));
      return new Response(
        JSON.stringify({ success: false, error: telegramResult.description || 'Telegram send failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageId = telegramResult.result?.message_id;
    let telegramUrl = '';
    if (typeof channelId === 'string' && channelId.startsWith('@')) {
      telegramUrl = `https://t.me/${channelId.replace('@', '')}/${messageId}`;
    } else {
      telegramUrl = `Message ID: ${messageId}`;
    }

    console.log('✅ Telegram upload success:', telegramUrl);

    return new Response(
      JSON.stringify({ success: true, telegramUrl, messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in telegram-bot-upload:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
