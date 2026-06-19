import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessagePayload {
  type: string;
  table: string;
  record: {
    id: string;
    sender_id?: string;
    receiver_id?: string;
    user_id?: string;
    post_id?: string;
    reel_id?: string;
    content: string;
    is_ai_reply: boolean;
    created_at: string;
  };
  owner_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (!groqApiKey) {
      console.error('GROQ_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: MessagePayload = await req.json();
    const { record, table, owner_id } = payload;

    // Skip if this is already an AI reply (prevent loops)
    if (record.is_ai_reply) {
      return new Response(JSON.stringify({ message: 'Skipped AI reply' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isComment = table === 'comments';
    const senderId = isComment ? record.user_id : record.sender_id;
    const receiverId = isComment ? owner_id : record.receiver_id;
    const incomingContent = record.content;

    if (!senderId || !receiverId || !incomingContent) {
      return new Response(JSON.stringify({ message: 'Missing IDs or content', payload }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if receiver has AI Auto-Pilot enabled
    const { data: receiverProfile, error: profileError } = await supabase
      .from('profiles')
      .select('ai_auto_pilot, username')
      .eq('id', receiverId)
      .single();

    if (profileError || !receiverProfile || !receiverProfile.ai_auto_pilot) {
      return new Response(JSON.stringify({ message: 'AI Auto-Reply not enabled for receiver' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check Presence and Activity
    const { data: presence } = await supabase.from('user_presence').select('is_online').eq('user_id', receiverId).maybeSingle();
    const isOnline = presence?.is_online ?? false;

    if (isOnline) {
      // If user is online, only reply if they haven't sent a message in the last 15 seconds to this friend
      const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();
      const { data: recentActivity } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_id', receiverId)
        .eq('receiver_id', senderId)
        .gte('created_at', fifteenSecondsAgo)
        .limit(1);

      if (recentActivity && recentActivity.length > 0) {
        return new Response(JSON.stringify({ message: 'User is active in this chat, skipping AI reply' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // If user is offline, we proceed to AI reply immediately (after typing delay)


    // Start Typing Animation
    if (!isComment) {
      await supabase.from('typing_indicators').upsert({
        user_id: receiverId,
        target_id: senderId,
        is_typing: true,
        updated_at: new Date().toISOString()
      });
    }

    // Fetch Persona (User's style)
    const { data: personaMessages } = await supabase
      .from('messages')
      .select('content')
      .eq('sender_id', receiverId)
      .not('content', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const personaText = personaMessages
      ?.map((m: any) => m.content)
      .filter((c: string) => c && c.trim().length > 0)
      .join('\n') || 'No style reference';

    // Fetch Context
    let contextText = 'No previous context';
    if (!isComment) {
      const { data: contextMessages } = await supabase
        .from('messages')
        .select('sender_id, content')
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .not('content', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      contextText = contextMessages
        ?.reverse()
        .map((m: any) => `${m.sender_id === senderId ? 'Friend' : receiverProfile.username}: ${m.content}`)
        .join('\n') || contextText;
    } else {
      contextText = `Commenting on a post. Comment: "${record.content}"`;
    }

    const { data: senderProfile } = await supabase.from('profiles').select('username').eq('id', senderId).single();
    const senderUsername = senderProfile?.username || 'Friend';

    const systemPrompt = `You are an AI clone of ${receiverProfile.username}. Your goal is to reply to a ${isComment ? 'comment' : 'message'} from their friend ${senderUsername}.

User Style Reference:
${personaText}

Conversation Context:
${contextText}

Now, ${senderUsername} just ${isComment ? 'commented' : 'sent'}: "${incomingContent}"

Reply in the same style, language, and tone as ${receiverProfile.username}. Keep it natural, short, and casual like a social media interaction. Use Hindi/Hinglish if that's their style. Stay in character.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: incomingContent }],
        temperature: 0.9, max_tokens: 150,
      }),
    });

    if (!groqResponse.ok) throw new Error(await groqResponse.text());

    const groqData = await groqResponse.json();
    const aiReply = groqData.choices?.[0]?.message?.content?.trim();

    if (!aiReply) throw new Error('No AI reply generated');

    // Simulate Typing Time (Fast: 1.5 seconds)
    if (!isComment) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Insert Reply and Stop Typing
    if (!isComment) {
      await Promise.all([
        supabase.from('messages').insert({
          sender_id: receiverId, receiver_id: senderId, content: aiReply, is_ai_reply: true
        }),
        supabase.from('typing_indicators').delete().match({ user_id: receiverId, target_id: senderId })
      ]);
    } else {
      await supabase.from('comments').insert({
        user_id: receiverId, 
        post_id: record.post_id, 
        reel_id: record.reel_id, 
        content: aiReply, 
        is_ai_reply: true
      });
    }

    return new Response(JSON.stringify({ success: true, reply: aiReply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in ai-auto-pilot:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});

