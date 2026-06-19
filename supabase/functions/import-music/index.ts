import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoUrl, adminUserId } = await req.json();

    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    console.log('📥 Importing music from:', videoUrl);

    // 1. Get metadata via noembed
    let title = 'Unknown Title';
    let artist = 'Unknown Artist';
    let thumbnailUrl = '';
    
    try {
      const metadataRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);
      const metadata = await metadataRes.json();
      title = metadata.title || 'Unknown Title';
      artist = metadata.author_name || 'Unknown Artist';
      thumbnailUrl = metadata.thumbnail_url || '';

      // Clean Title: Remove common YouTube junk to make it look "real"
      title = title
        .replace(/\(Official Video\)/gi, '')
        .replace(/\[Official Video\]/gi, '')
        .replace(/\(Official Audio\)/gi, '')
        .replace(/\[Official Audio\]/gi, '')
        .replace(/\(Official Music Video\)/gi, '')
        .replace(/\[Official Music Video\]/gi, '')
        .replace(/\(Lyrics\)/gi, '')
        .replace(/\[Lyrics\]/gi, '')
        .replace(/\(Full Video\)/gi, '')
        .replace(/\(HD\)/gi, '')
        .replace(/\(1080p\)/gi, '')
        .replace(/\(4K\)/gi, '')
        .replace(/\|.*$/g, '') // Remove everything after |
        .replace(/-.*$/g, (match) => artist.toLowerCase().includes(match.slice(1).trim().toLowerCase()) ? '' : match) // Remove artist name if it's in the title
        .trim();
        
      if (artist.toLowerCase().includes(' - topic')) {
        artist = artist.replace(/ - topic/gi, '').trim();
      }
    } catch (e) {
      console.warn('⚠️ Could not fetch metadata via noembed:', e.message);
    }

    // 2. Extract Video ID
    let videoId = '';
    if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    } else if (videoUrl.includes('youtube.com/watch')) {
      const urlObj = new URL(videoUrl);
      videoId = urlObj.searchParams.get('v') || '';
    } else if (videoUrl.includes('youtube.com/shorts/')) {
      videoId = videoUrl.split('shorts/')[1].split('?')[0];
    }

    if (!videoId) {
      throw new Error('Could not extract YouTube Video ID');
    }

    console.log('🎥 Video ID:', videoId);

    // 3. Get Audio Download Link via RapidAPI
    let rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    let rapidApiHost = Deno.env.get('RAPIDAPI_HOST') || 'youtube-mp36.p.rapidapi.com';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    if (!rapidApiKey || rapidApiHost === 'youtube-mp36.p.rapidapi.com') {
      const { data: configs } = await supabase.from('telegram_config').select('key, value');
      const apiCfg = configs?.find(c => c.key === 'rapidapi_key');
      const hostCfg = configs?.find(c => c.key === 'rapidapi_host');
      if (apiCfg) rapidApiKey = apiCfg.value;
      if (hostCfg) rapidApiHost = hostCfg.value;
    }

    if (!rapidApiKey) {
      throw new Error('RapidAPI Key not configured. Please set it in Admin Dashboard.');
    }

    console.log('🔌 Calling RapidAPI for conversion...');
    let audioDownloadUrl = '';
    
    // Support for different RapidAPI structures
    if (rapidApiHost.includes('youtube-to-mp315')) {
      // Start conversion
      const startRes = await fetch(`https://${rapidApiHost}/fetch?id=${videoId}`, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': rapidApiHost
        }
      });
      const startData = await startRes.json();
      const jobId = startData.id || startData.jobId;
      
      if (!jobId) throw new Error('Failed to start conversion job');
      
      // Poll for status
      let attempts = 0;
      while (attempts < 10) {
        console.log(`⏳ Checking conversion status (Attempt ${attempts + 1})...`);
        const statusRes = await fetch(`https://${rapidApiHost}/status/${jobId}`, {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': rapidApiHost
          }
        });
        const statusData = await statusRes.json();
        
        if (statusData.status === 'completed' || statusData.status === 'ok') {
          audioDownloadUrl = statusData.link || statusData.downloadUrl;
          break;
        } else if (statusData.status === 'failed') {
          throw new Error('Conversion failed');
        }
        
        await new Promise(r => setTimeout(r, 3000));
        attempts++;
      }
    } else {
      // Default /dl?id= logic (for youtube-mp36 and others)
      const rapidRes = await fetch(`https://${rapidApiHost}/dl?id=${videoId}`, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': rapidApiHost
        }
      });
      const rapidData = await rapidRes.json();
      
      if (rapidData.status === 'ok' && rapidData.link) {
        audioDownloadUrl = rapidData.link;
      } else if (rapidData.link) {
        audioDownloadUrl = rapidData.link;
      } else {
        console.error('❌ RapidAPI error:', rapidData);
        throw new Error(rapidData.msg || 'Failed to get audio download link from RapidAPI');
      }
    }

    if (!audioDownloadUrl) {
      throw new Error('Could not obtain audio download URL');
    }

    console.log('🔗 Audio download URL obtained');

    // 4. Send Audio to Telegram
    let botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    let channelId = Deno.env.get('TELEGRAM_CHANNEL_ID') || '@indianreels_official';

    if (!botToken || !channelId) {
      const { data: configs } = await supabase.from('telegram_config').select('key, value');
      const tokenCfg = configs?.find(c => c.key === 'bot_token');
      const channelCfg = configs?.find(c => c.key === 'channel_id');
      if (tokenCfg) botToken = tokenCfg.value;
      if (channelCfg) channelId = channelCfg.value;
    }

    if (!botToken) {
      throw new Error('Telegram Bot Token not configured. Please set it in Admin Dashboard.');
    }

    console.log('📤 Sending audio to Telegram channel:', channelId);
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendAudio`;
    const formData = new FormData();
    formData.append('chat_id', channelId);
    formData.append('audio', audioDownloadUrl);
    formData.append('title', title);
    formData.append('performer', artist);
    formData.append('caption', `🎵 ${title} - ${artist}\n🔗 Source: ${videoUrl}\nImported via INDIANREELS`);

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      body: formData,
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('❌ Telegram API error:', telegramResult);
      throw new Error(`Telegram API Error: ${telegramResult.description}`);
    }

    const fileId = telegramResult.result?.audio?.file_id;
    const messageId = telegramResult.result?.message_id;
    console.log('✅ Sent to Telegram. File ID:', fileId);

    let telegramUrl = '';
    if (typeof channelId === 'string' && channelId.startsWith('@')) {
      const channelUsername = channelId.replace('@', '');
      telegramUrl = `https://t.me/${channelUsername}/${messageId}`;
    } else {
      telegramUrl = `Message ID: ${messageId}`;
    }

    // 5. Save to Supabase
    const mainTokenId = crypto.randomUUID();

    // 6. Optional: Upload audio to Supabase Storage for preview
    let supabasePreviewUrl = null;
    try {
      console.log('📦 Transferring audio to Supabase Storage for preview...');
      const audioResponse = await fetch(audioDownloadUrl);
      if (audioResponse.ok) {
        const audioBlob = await audioResponse.blob();
        const filePath = `music_previews/${mainTokenId}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, audioBlob, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          console.warn('⚠️ Storage upload failed:', uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);
          supabasePreviewUrl = publicUrl;
          console.log('✅ Supabase Preview URL:', supabasePreviewUrl);
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not upload to Supabase Storage:', e.message);
    }

    console.log('💾 Saving records to Supabase...');
    // Save to music_library
    const { error: musicError } = await supabase
      .from('music_library')
      .insert({
        song_name: title,
        artist_name: artist,
        telegram_file_id: fileId,
        image_url: thumbnailUrl,
        main_token_id: mainTokenId,
        preview_url: supabasePreviewUrl
      });

    if (musicError) {
      console.error('❌ Error saving to music_library:', musicError);
      throw musicError;
    }

    // Save to video_links
    const { error: videoLinkError } = await supabase
      .from('video_links')
      .insert({
        video_url: videoUrl,
        telegram_channel_id: channelId,
        admin_user_id: adminUserId,
        status: 'completed',
        main_token_id: mainTokenId
      });

    if (videoLinkError) {
      console.error('❌ Error saving to video_links:', videoLinkError);
      throw videoLinkError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Music imported successfully',
        data: { title, artist, fileId, telegramUrl }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Import-music function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
