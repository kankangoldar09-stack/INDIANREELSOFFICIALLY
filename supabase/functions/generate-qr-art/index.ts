import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { qrData, prompt, style = 'artistic' } = await req.json();

    if (!qrData) {
      return new Response(
        JSON.stringify({ error: 'QR data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HUGGINGFACE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Hugging Face API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate artistic QR code using Hugging Face API
    // Using the QR Code Monster model for artistic QR codes
    const modelUrl = 'https://api-inference.huggingface.co/models/monster-labs/control_v1p_sd15_qrcode_monster';

    // Create a default prompt based on style if not provided
    const defaultPrompt = prompt || getDefaultPrompt(style);

    console.log('Generating QR art with prompt:', defaultPrompt);
    console.log('QR data:', qrData);

    // Call Hugging Face API
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: defaultPrompt,
        parameters: {
          qr_code_content: qrData,
          guidance_scale: 7.5,
          num_inference_steps: 30,
          controlnet_conditioning_scale: 1.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      
      // If model is loading, return a message
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ 
            error: 'Model is loading, please try again in a moment',
            loading: true 
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate QR art', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the image blob
    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(
      JSON.stringify({
        success: true,
        image: `data:image/png;base64,${base64Image}`,
        prompt: defaultPrompt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating QR art:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getDefaultPrompt(style: string): string {
  const prompts: Record<string, string> = {
    artistic: 'beautiful artistic QR code, vibrant colors, modern design, high quality, detailed, aesthetic',
    cyberpunk: 'cyberpunk style QR code, neon lights, futuristic, glowing, dark background, high tech',
    nature: 'natural QR code design, flowers, leaves, organic patterns, green and blue colors, peaceful',
    abstract: 'abstract art QR code, geometric shapes, colorful gradients, modern art style',
    minimal: 'minimalist QR code design, clean, simple, elegant, monochrome, professional',
    galaxy: 'galaxy space QR code, stars, nebula, cosmic, purple and blue colors, universe',
    fire: 'fire and flames QR code, orange and red colors, dynamic, energetic, glowing',
    ocean: 'ocean waves QR code, blue water, sea foam, peaceful, flowing, aquatic',
  };

  return prompts[style] || prompts.artistic;
}
