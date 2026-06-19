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
    const { prompt, qrData, style = 'artistic' } = await req.json();

    if (!prompt && !qrData) {
      return new Response(
        JSON.stringify({ error: 'Either prompt or qrData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GROK_API_KEY = Deno.env.get('GROK_API_KEY');
    if (!GROK_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Grok API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt for Grok
    let finalPrompt = prompt;
    if (qrData && !prompt) {
      finalPrompt = getQRPrompt(style, qrData);
    }

    console.log('Generating image with Grok AI:', finalPrompt);

    // Call Grok API for image generation
    // Note: Using xAI's API endpoint (this is a placeholder - adjust based on actual xAI API)
    const response = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-vision',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate image with Grok AI', 
          details: errorText,
          fallback: true 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract image URL from response
    const imageUrl = data.data?.[0]?.url || data.url;
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'No image URL in response', fallback: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(
      JSON.stringify({
        success: true,
        image: `data:image/png;base64,${base64Image}`,
        prompt: finalPrompt,
        provider: 'grok',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating image with Grok:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        fallback: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getQRPrompt(style: string, qrData: string): string {
  const basePrompt = `Create a beautiful artistic QR code design that is scannable and functional. The QR code should encode: ${qrData}. `;
  
  const stylePrompts: Record<string, string> = {
    artistic: basePrompt + 'Style: vibrant colors, modern design, high quality, detailed, aesthetic, artistic patterns',
    cyberpunk: basePrompt + 'Style: cyberpunk aesthetic, neon lights, futuristic, glowing elements, dark background, high tech, digital art',
    nature: basePrompt + 'Style: natural organic design, flowers, leaves, green and blue colors, peaceful, botanical elements',
    abstract: basePrompt + 'Style: abstract art, geometric shapes, colorful gradients, modern art style, contemporary',
    minimal: basePrompt + 'Style: minimalist design, clean, simple, elegant, monochrome, professional, sophisticated',
    galaxy: basePrompt + 'Style: galaxy space theme, stars, nebula, cosmic, purple and blue colors, universe, celestial',
    fire: basePrompt + 'Style: fire and flames, orange and red colors, dynamic, energetic, glowing, intense',
    ocean: basePrompt + 'Style: ocean waves, blue water, sea foam, peaceful, flowing, aquatic, underwater theme',
  };

  return stylePrompts[style] || stylePrompts.artistic;
}
