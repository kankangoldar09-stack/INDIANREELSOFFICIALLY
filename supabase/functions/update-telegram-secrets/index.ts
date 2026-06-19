import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  const auth = req.headers.get('authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify Admin
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'Authorization': auth || '', 'apikey': supabaseAnonKey }
  });
  if (!userRes.ok) return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401, headers: corsHeaders });
  
  const userData = await userRes.json();
  const userId = userData.id;

  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role,username`, {
    headers: { 'Authorization': `Bearer ${supabaseServiceRole}`, 'apikey': supabaseServiceRole }
  });
  const profiles = await profileRes.json();
  const isAdmin = profiles?.[0]?.role === 'admin' || profiles?.[0]?.username?.toLowerCase() === 'jeetyt09' || userId === '61499879-283a-485e-a36e-b203424a86d0';

  if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

  const { secrets } = await req.json();
  
  // Update telegram_config table via REST API
  for (const s of (secrets || [])) {
    const key = s.name.replace('TELEGRAM_', '').toLowerCase();
    await fetch(`${supabaseUrl}/rest/v1/telegram_config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRole}`,
        'apikey': supabaseServiceRole,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ key, value: s.value, updated_at: new Date().toISOString() })
    });
  }

  return new Response(JSON.stringify({ success: true, message: 'Configuration saved to database' }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
});
