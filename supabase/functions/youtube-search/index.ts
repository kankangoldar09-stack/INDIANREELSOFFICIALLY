import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract channel ID from various YouTube URL formats
function extractChannelId(url: string): string | null {
  try {
    // Handle @username format: youtube.com/@username
    const usernameMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (usernameMatch) {
      return `@${usernameMatch[1]}`;
    }

    // Handle channel ID format: youtube.com/channel/CHANNEL_ID
    const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }

    // Handle custom URL: youtube.com/c/CustomName
    const customMatch = url.match(/youtube\.com\/c\/([^\/\?]+)/);
    if (customMatch) {
      return customMatch[1];
    }

    // Handle user URL: youtube.com/user/UserName
    const userMatch = url.match(/youtube\.com\/user\/([^\/\?]+)/);
    if (userMatch) {
      return userMatch[1];
    }

    // If just a plain ID or @username is provided
    if (url.startsWith('@') || url.startsWith('UC')) {
      return url;
    }

    return null;
  } catch (e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channelUrl, q: searchItem } = await req.json();
    
    if (!channelUrl && !searchItem) {
      throw new Error('Channel URL or Search Query is required');
    }

    let rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    if (!rapidApiKey) {
      const { data: configs } = await supabase.from('telegram_config').select('key, value');
      const apiCfg = configs?.find(c => c.key === 'rapidapi_key');
      if (apiCfg) rapidApiKey = apiCfg.value;
    }

    if (!rapidApiKey) {
      throw new Error('RapidAPI Key not configured. Please set it in Admin Dashboard.');
    }

    let searchParams = new URLSearchParams();
    searchParams.append('part', 'snippet,id');
    searchParams.append('maxResults', '50');
    searchParams.append('type', 'video');
    searchParams.append('order', 'relevance');

    if (channelUrl) {
      const channelId = extractChannelId(channelUrl);
      if (!channelId) {
        throw new Error('Invalid YouTube channel URL. Please provide a valid channel link.');
      }

      console.log('🔍 Fetching videos from channel:', channelId);

      // First, get channel details to resolve @username or custom names to channel ID
      let actualChannelId = channelId;
      if (channelId.startsWith('@') || !channelId.startsWith('UC')) {
        const channelSearchUrl = new URL('https://youtube-v31.p.rapidapi.com/search');
        channelSearchUrl.searchParams.append('q', channelId);
        channelSearchUrl.searchParams.append('part', 'snippet');
        channelSearchUrl.searchParams.append('type', 'channel');
        channelSearchUrl.searchParams.append('maxResults', '1');

        const channelSearchRes = await fetch(channelSearchUrl.toString(), {
          headers: {
            'X-RapidAPI-Key': rapidApiKey,
            'X-RapidAPI-Host': 'youtube-v31.p.rapidapi.com'
          }
        });

        if (!channelSearchRes.ok) {
          const errBody = await channelSearchRes.text();
          console.error('RapidAPI Channel Search Error:', channelSearchRes.status, errBody);
          throw new Error(`Failed to find channel (RapidAPI Error: ${channelSearchRes.status})`);
        }

        const channelSearchData = await channelSearchRes.json();
        if (channelSearchData.items && channelSearchData.items.length > 0) {
          actualChannelId = channelSearchData.items[0].id.channelId;
        }
      }
      searchParams.append('channelId', actualChannelId);
      searchParams.append('order', 'date');
    } else {
      searchParams.append('q', searchItem);
    }

    const videosUrl = new URL('https://youtube-v31.p.rapidapi.com/search');
    searchParams.forEach((val, key) => videosUrl.searchParams.append(key, val));

    const videosRes = await fetch(videosUrl.toString(), {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'youtube-v31.p.rapidapi.com'
      }
    });

    if (!videosRes.ok) {
      const errText = await videosRes.text();
      console.error('YouTube Search Error:', videosRes.status, errText);
      throw new Error('Failed to fetch YouTube content');
    }

    const videosData = await videosRes.json();
    
    if (!videosData.items || videosData.items.length === 0) {
      return new Response(
        JSON.stringify({ tracks: [], channelName: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tracks = videosData.items.map((item: any) => {
      let title = item.snippet.title;
      let artist = item.snippet.channelTitle;

      // Clean Title
      title = title
        .replace(/\(Official Video\)/gi, '')
        .replace(/\[Official Video\]/gi, '')
        .replace(/\(Official Audio\)/gi, '')
        .replace(/\(Official Music Video\)/gi, '')
        .replace(/\(Lyrics\)/gi, '')
        .replace(/\|.*$/g, '')
        .replace(/\(.*?\)/g, '') // Remove everything in parentheses
        .replace(/\[.*?\]/g, '') // Remove everything in brackets
        .trim();

      if (artist.toLowerCase().includes(' - topic')) {
        artist = artist.replace(/ - topic/gi, '').trim();
      }

      return {
        id: item.id.videoId,
        title,
        artist,
        duration: '04:00',
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        audioUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        previewUrl: null,
        source: 'youtube'
      };
    });

    return new Response(
      JSON.stringify({ 
        tracks,
        channelName: channelUrl ? (videosData.items[0]?.snippet?.channelTitle || 'Unknown Channel') : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ youtube-search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
