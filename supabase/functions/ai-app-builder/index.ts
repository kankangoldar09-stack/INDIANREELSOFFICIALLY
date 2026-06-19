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
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

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
            content: `You are an AI App Builder. Based on the user's prompt, generate a JSON configuration for a modern web application.
            Respond ONLY with the JSON object, no other text.
            
            The JSON structure MUST be:
            {
              "name": "App Name",
              "description": "Short description",
              "theme": {
                "primary": "#hex",
                "secondary": "#hex",
                "accent": "#hex",
                "background": "#0a0a0a",
                "fontFamily": "Inter"
              },
              "features": [
                { "id": "home", "label": "Home", "icon": "Home", "enabled": true },
                { "id": "profile", "label": "Profile", "icon": "User", "enabled": true },
                { "id": "settings", "label": "Settings", "icon": "Settings", "enabled": true },
                { "id": "analytics", "label": "Analytics", "icon": "BarChart", "enabled": true },
                { "id": "chat", "label": "Chat", "icon": "MessageSquare", "enabled": true }
              ],
              "layout": {
                "type": "sidebar",
                "headerEnabled": true,
                "footerEnabled": true
              }
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenRouter API Error:', data);
      throw new Error(data.error?.message || `API failed with status ${response.status}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Empty response from AI:', data);
      throw new Error('AI failed to generate app configuration. Please try again.');
    }

    const config = JSON.parse(content);

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
