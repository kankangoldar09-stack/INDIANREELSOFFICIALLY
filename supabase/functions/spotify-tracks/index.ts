import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  audioUrl: string;
  previewUrl: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Read request body safely
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
    
    const { query, category } = body as any;
    console.log('Request received:', { query, category });

    // Get Spotify access token
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    console.log('Credentials check:', { 
      hasClientId: !!clientId, 
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length,
      clientSecretLength: clientSecret?.length
    });

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Spotify credentials not configured. Please check environment variables.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Get access token using Client Credentials flow
    // Using built-in btoa for base64 encoding
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = btoa(credentials);
    
    console.log('Requesting Spotify token...');
    
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedCredentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Spotify Auth Failed:', tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Spotify Auth Failed (${tokenResponse.status})`,
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;
    
    if (!access_token) {
      console.error('No access token in response:', tokenData);
      return new Response(
        JSON.stringify({ error: 'No access token received from Spotify' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('Token received successfully');

    let tracks: Track[] = [];

    if (query) {
      // Search for tracks
      console.log('Searching for:', query);
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=25&market=IN`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Search failed:', searchResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to search Spotify tracks' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      const searchData = await searchResponse.json();
      tracks = await Promise.all(searchData.tracks.items.map(async (track: any) => {
        let previewUrl = track.preview_url;
        
        // Fallback to Deezer if Spotify preview is missing
        if (!previewUrl) {
          try {
            const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}&limit=1`);
            const deezerData = await deezerRes.json();
            if (deezerData.data && deezerData.data.length > 0) {
              previewUrl = deezerData.data[0].preview;
              console.log(`✅ Deezer fallback success for: ${track.name}`);
            }
          } catch (e) {
            console.warn(`⚠️ Deezer fallback failed for: ${track.name}`, e.message);
          }
        }

        return {
          id: track.id,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          duration: formatDuration(track.duration_ms),
          thumbnail: track.album.images[0]?.url || '',
          audioUrl: track.external_urls.spotify,
          previewUrl: previewUrl,
        };
      }));
    } else {
      // Get playlist tracks based on category
      const playlistId = getCategoryPlaylistId(category || 'trending');
      console.log('Fetching playlist:', playlistId);
      
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=25&market=IN`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );

      if (!playlistResponse.ok) {
        const errorText = await playlistResponse.text();
        console.error('Playlist fetch failed:', playlistResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch Spotify playlist' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      const playlistData = await playlistResponse.json();
      tracks = await Promise.all(playlistData.items
        .filter((item: any) => item.track) // Filter out null tracks
        .map(async (item: any) => {
          const track = item.track;
          let previewUrl = track.preview_url;

          // Fallback to Deezer if Spotify preview is missing
          if (!previewUrl) {
            try {
              const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}&limit=1`);
              const deezerData = await deezerRes.json();
              if (deezerData.data && deezerData.data.length > 0) {
                previewUrl = deezerData.data[0].preview;
                console.log(`✅ Deezer fallback success for: ${track.name}`);
              }
            } catch (e) {
              console.warn(`⚠️ Deezer fallback failed for: ${track.name}`, e.message);
            }
          }

          return {
            id: track.id,
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(', '),
            duration: formatDuration(track.duration_ms),
            thumbnail: track.album.images[0]?.url || '',
            audioUrl: track.external_urls.spotify,
            previewUrl: previewUrl,
          };
        }));
    }

    console.log('Returning', tracks.length, 'tracks');
    return new Response(
      JSON.stringify({ tracks }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function formatDuration(ms: number): string {
  if (!ms) return '00:00';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getCategoryPlaylistId(category: string): string {
  const playlists: Record<string, string> = {
    'trending': '37i9dQZEVXbMDoHDwVN2tF', // Global Top 50
    'bollywood': '37i9dQZEVXbLZ52XmnySJg', // Bollywood Hits
    'punjabi': '37i9dQZEVXbMWDif5SCBJq', // Punjabi 101
    'love': '37i9dQZF1DX50QitC6Oqtn', // Love Pop
    'party': '37i9dQZF1DX8mBRYewE6or', // Party Hits
    'international': '37i9dQZEVXbNG2KDcFcKOF', // Top Songs Global
  };
  
  return playlists[category] || playlists['trending'];
}
