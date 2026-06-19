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

    if (!openrouterApiKey || openrouterApiKey.trim() === '') {
      console.error('OPENROUTER_API_KEY is not configured');
      // Return SSE-compatible error so frontend stream reader handles it
      return new Response(
        `data: ${JSON.stringify({ error: 'AI_UNAVAILABLE' })}\n\ndata: [DONE]\n\n`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }, status: 200 }
      );
    }

    const cleanApiKey = openrouterApiKey.trim().replace(/^<|>$/g, '');
    const body = await req.json();
    const { messages, language, autoReplyFor } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing messages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let systemPrompt: string;

    if (autoReplyFor) {
      // ── Friend AI Auto-Reply mode ──
      systemPrompt = `You are acting as "${autoReplyFor.name}" (@${autoReplyFor.username}), a real person on INDIANREELS social media platform.
Your job is to reply to incoming messages exactly as this person would — casual, friendly, Indian youth style.

Rules:
- Respond in Hinglish (mix of Hindi + English in Roman script) — short, natural, conversational
- Keep it brief: 1-3 sentences max, like a real chat reply
- Sound like a real person, not a bot — use casual words like "haan", "bhai", "yaar", "kya scene hai", "bilkul", "thik hai"
- Do NOT reveal you are an AI or a bot under any circumstances
- Match the energy and tone of the incoming message
- Use 1-2 emojis naturally
- NEVER use formal language or long paragraphs
- If someone asks if this is AI, deflect naturally like "haha nahi bhai, main hi hoon 😄"`;
    } else {
      // ── Normal INDIANREELS AI Assistant mode ──
      let languageInstructions = "Use a mix of English and Hindi (Hinglish) as it's common in India.";
      if (language === 'hindi') {
        languageInstructions = 'Respond ONLY in Hindi (हिंदी). Use Devanagari script.';
      } else if (language === 'hinglish') {
        languageInstructions = 'Use a mix of English and Hindi (Hinglish). Use Roman script for Hindi words.';
      } else if (language === 'english') {
        languageInstructions = 'Respond ONLY in English.';
      }

      systemPrompt = `You are the official INDIANREELS AI Assistant. INDIANREELS is a premium modern Indian social media platform. You have full knowledge of the platform's rules and features.

The owner of INDIANREELS is "jeet". If anyone asks about the owner, you must proudly state that "jeet" is the owner of this platform.

Today's date is ${new Date().toISOString()}.

INDIANREELS Official Rules & Features:
0. Platform Owner: The platform is owned and founded by "jeet".
1. Copyright Policy: If a user receives 2 copyright strikes, their account is PERMANENTLY BANNED. Only @INDIANREELS_OFFICIALLY can issue strikes.
2. Verification: Blue badges are exclusive and granted only by @INDIANREELS_OFFICIALLY (UID: 20bdb204-fe88-42c0-9787-728275517d07). The badge pulses every 5 seconds.
3. Multi-Account: Double-tap your profile icon to switch between accounts instantly.
4. Unique Animations:
   - Liking a post triggers an animated Indian flag wave and a large thumbs-up overlay.
   - Double-tapping any video triggers a high-speed black bike animation across the screen.
5. Dosti ki Doori: A proximity feature where mutual followers within 5 meters experience a synchronized color-blend and heartbeat animation.
6. Birthday Takeover: On your birthday, the app enters "Party Mode" with a golden sparkly theme and a special greeting.
7. AI Auto-Reply (Offline Bot): Your AI clone can auto-reply to messages in your style when you are offline or watching Reels. Enable it in Settings > Privacy & Visibility.
8. GIF Support: Powered by Giphy in both Chat and Comments.
9. Delete Policy: Content deletion is real and permanent. Users can delete their own posts. Super admins can delete any content.
10. Feedback: Users can report bugs via Settings. Reports go directly to the admin.

Guidelines:
- Be extremely friendly, helpful, and polite.
- ${languageInstructions}
- Keep responses concise but informative.
- Always use emojis naturally (🇮🇳, ✨, 🚀).
- Never use the same response twice. Always be dynamic.
- IMPORTANT: Respond in a concise, mobile-friendly "phone-size" format. Keep paragraphs short and use bullet points when helpful. Avoid long walls of text.
- If users ask about bans or rules, give them the exact facts from the list above.
- You are the "Real" assistant of INDIANREELS. Do not mention other platforms like Instagram unless comparing features.`;
    }

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    console.log('Calling OpenRouter API (owl-alpha streaming)...');

    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://indianreels.app',
        'X-Title': 'INDIANREELS AI',
      },
      body: JSON.stringify({
        model: 'openrouter/owl-alpha',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 600,
        stream: true,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.error(`OpenRouter API failed (${openrouterResponse.status}): ${errorText}`);
      // Return SSE error so frontend stream reader handles it gracefully
      return new Response(
        `data: ${JSON.stringify({ error: `API_ERROR_${openrouterResponse.status}` })}\n\ndata: [DONE]\n\n`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }, status: 200 }
      );
    }

    // Stream passthrough: pipe OpenRouter SSE → client SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    (async () => {
      try {
        const reader = openrouterResponse.body!.getReader();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === '') continue;

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              if (jsonStr === '[DONE]') {
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const chunk = JSON.parse(jsonStr);
                const content = chunk.choices?.[0]?.delta?.content;
                if (content) {
                  // Forward only the content token
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ token: content })}\n\n`));
                }
                // Forward usage info from final chunk
                if (chunk.usage) {
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ usage: chunk.usage })}\n\n`));
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        console.error('Stream error:', e);
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'STREAM_ERROR' })}\n\ndata: [DONE]\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error: any) {
    console.error('Error in ai-assistant:', error);
    return new Response(
      `data: ${JSON.stringify({ error: error.message || 'Internal server error' })}\n\ndata: [DONE]\n\n`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' }, status: 200 }
    );
  }
});

