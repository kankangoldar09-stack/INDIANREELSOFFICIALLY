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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Verify user with fetch
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseAnonKey
      }
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData.id) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        details: userData.msg || 'Auth session missing!',
        hint: 'Please try logging out and logging in again.' 
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = userData.id;

    // 2. Check admin status with fetch
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role,username`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceRole}`,
        'apikey': supabaseServiceRole
      }
    });

    const profiles = await profileRes.json();
    if (!profileRes.ok || !profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Forbidden', 
        details: 'Profile not found' 
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const profile = profiles[0];
    const username = profile.username?.toLowerCase() || '';
    const isSuperAdmin = username === 'jeetyt09' || userId === '61499879-283a-485e-a36e-b203424a86d0';
    const isAdmin = profile.role === 'admin' || isSuperAdmin;

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
