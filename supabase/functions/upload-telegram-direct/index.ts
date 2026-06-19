import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileData, fileName, fileSize, mimeType = 'video/mp4' } = await req.json();

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: 'fileData and fileName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || '@indianreels_storage';

    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Telegram Bot Token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Uploading file: ${fileName}, size: ${fileSize} bytes`);

    // Decode base64 to binary
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const fileBlob = new Blob([bytes], { type: mimeType });
    
    console.log('File decoded, size:', fileBlob.size);

    // Prepare form data for Telegram
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', fileBlob, fileName);
    formData.append('caption', `📹 ${fileName}\n💾 Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB\n⏰ ${new Date().toLocaleString()}`);

    // Upload to Telegram using sendDocument
    console.log('Uploading to Telegram...');
    const uploadResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.ok) {
      console.error('Telegram API error:', uploadResult);
      throw new Error(uploadResult.description || 'Failed to upload to Telegram');
    }

    console.log('Upload successful!');

    // Extract file information
    const message = uploadResult.result;
    const document = message.document;
    const fileId = document.file_id;
    const fileUniqueId = document.file_unique_id;
    const messageId = message.message_id;
    const chatId = message.chat.id;

    // Create Telegram file link
    // Format: https://t.me/c/{chat_id}/{message_id}
    let telegramLink = '';
    const chatIdStr = String(chatId).replace('-100', '');
    telegramLink = `https://t.me/c/${chatIdStr}/${messageId}`;

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        fileUniqueId,
        messageId,
        chatId,
        telegramLink,
        fileName,
        fileSize: document.file_size,
        uploadedAt: new Date().toISOString(),
        method: 'telegram-bot-api-base64',
        message: 'File uploaded successfully to Telegram',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error uploading to Telegram:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
