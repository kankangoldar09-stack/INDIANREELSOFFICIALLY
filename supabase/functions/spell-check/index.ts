const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openrouterApiKey?.trim()) {
      return new Response(
        JSON.stringify({ corrected: null, error: 'AI_UNAVAILABLE' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ corrected: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Don't bother AI for very short single-char or number-only input
    if (text.trim().length <= 1 || /^\d+$/.test(text.trim())) {
      return new Response(
        JSON.stringify({ corrected: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanKey = openrouterApiKey.trim().replace(/^<|>$/g, '');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://indianreels.app',
        'X-Title': 'INDIANREELS SpellCheck',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash:free',
        messages: [
          {
            role: 'system',
            content: `You are a spell checker for a chat app used by Indian youth. Users type in English, Hindi (Roman script/Hinglish), or a mix of both.

Your ONLY job: Fix spelling mistakes. Return ONLY the corrected text — nothing else.

Rules:
- Fix obvious typos (heelo→hello, teh→the, sorrey→sorry, plz→please, etc.)
- Fix Hinglish typos too (bhia→bhai, baht→bahut, thik→theek, nhi→nahi)
- Do NOT change intentional short-forms like "u", "r", "ur", "bc", "lol", "omg", "tbh", "idk", "lmk", "btw", "imo", "bro", "dude", "yaaar", "haha", "hehe"
- Do NOT change names or usernames
- Do NOT add punctuation that wasn't there
- Do NOT translate or rephrase — only fix spelling
- If nothing is wrong, return the text exactly as-is
- Return ONLY the corrected text, no explanation, no quotes`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('OpenRouter spell-check failed:', response.status);
      return new Response(
        JSON.stringify({ corrected: text }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim();

    return new Response(
      JSON.stringify({ corrected: corrected || text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('spell-check error:', err);
    return new Response(
      JSON.stringify({ corrected: null, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
