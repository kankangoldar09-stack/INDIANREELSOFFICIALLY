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
    const { videoId } = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    const rapidApiHost = Deno.env.get('RAPIDAPI_HOST') || 'youtube-mp36.p.rapidapi.com';

    if (!rapidApiKey) {
      throw new Error('RapidAPI Key not configured');
    }

    console.log('🔗 Fetching audio link for:', videoId);

    const rapidRes = await fetch(`https://${rapidApiHost}/dl?id=${videoId}`, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost
      }
    });
    
    const rapidData = await rapidRes.json();
    
    if (rapidData.status !== 'ok' || !rapidData.link) {
      throw new Error(rapidData.msg || 'Failed to get audio download link');
    }

    return new Response(
      JSON.stringify({ audioUrl: rapidData.link }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ youtube-audio-link error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
