import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, style } = await req.json();

    if (action === 'generate_filter') {
      const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a creative camera filter engineer. Generate a valid CSS 'filter' property value that creates a unique and viral visual style.
              The style requested is: ${style}.
              Respond ONLY with the value of the filter property, for example: "saturate(1.5) contrast(1.2) hue-rotate(10deg)".
              Do not include the property name 'filter:', just the value. Keep it high quality and distinct.`
            }
          ],
        }),
      });

      const data = await response.json();
      const filter = data.choices?.[0]?.message?.content?.trim();

      return new Response(JSON.stringify({ filter }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
