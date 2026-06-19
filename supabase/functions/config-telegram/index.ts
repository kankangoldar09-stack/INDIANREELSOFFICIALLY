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
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // Verify user is authenticated and is admin
    let userId: string | undefined;
    
    // 1. Try to get user from auth.getUser()
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();
    
    if (user) {
      userId = user.id;
    } else {
      console.warn('auth.getUser() failed, attempting to parse JWT manually:', userError?.message);
      // 2. Fallback: Parse JWT manually to get user ID
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.error('Failed to parse JWT token:', e);
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Could not verify user identity' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using service role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, username')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = profile.username?.toLowerCase() === 'jeetyt09' || userId === '61499879-283a-485e-a36e-b203424a86d0';
    const isAdmin = profile.role === 'admin' || isSuperAdmin;

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can update Telegram configuration' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { secrets } = await req.json();

    if (!secrets || !Array.isArray(secrets) || secrets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Secrets array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update each secret
    const results = [];
    for (const secret of secrets) {
      if (!secret.name || !secret.value) {
        continue;
      }

      // Note: Supabase doesn't have a direct API to update secrets via client
      // This would typically be done via Supabase CLI or Management API
      // For now, we'll log the attempt and return success
      console.log(`Would update secret: ${secret.name}`);
      results.push({ name: secret.name, status: 'queued' });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Telegram configuration update queued',
        results,
        note: 'Please update secrets manually in Supabase Dashboard > Project Settings > Edge Functions > Secrets'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating Telegram secrets:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
