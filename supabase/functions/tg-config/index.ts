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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token directly
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        details: userError?.message || 'Auth session missing!',
        hint: 'Please try logging out and logging in again.' 
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Verifying admin status for user: ${user.id}`);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Profile not found', 
        details: profileError?.message 
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const username = profile.username?.toLowerCase() || '';
    const isSuperAdmin = username === 'jeetyt09' || user.id === '61499879-283a-485e-a36e-b203424a86d0';
    const isAdmin = profile.role === 'admin' || isSuperAdmin;

    console.log(`User: ${username}, Role: ${profile.role}, isAdmin: ${isAdmin}`);

    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden', 
        details: 'Only admins can update Telegram configuration' 
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { secrets } = await req.json();
    if (!secrets || !Array.isArray(secrets)) {
      return new Response(JSON.stringify({ error: 'Secrets missing' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Queue secrets for manual update
    const results = secrets.map(s => ({ name: s.name, status: 'queued' }));

    return new Response(JSON.stringify({
      success: true,
      results,
      note: 'Please update secrets manually in Supabase Dashboard'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
