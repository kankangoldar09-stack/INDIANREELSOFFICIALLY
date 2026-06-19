
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User error:', userError);
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { userIdToDelete } = body;

    if (!userIdToDelete) {
      throw new Error('User ID to delete is required');
    }

    // Check if requester is admin OR deleting their own account
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    const isSelf = user.id === userIdToDelete;
    const isAdmin = profile?.role === 'admin';

    // Super Admin check
    const superAdminIds = [
      '61499879-283a-485e-a36e-b203424a86d0', // jeetyt09
      '20bdb204-fe88-42c0-9787-728275517d07'  // INDIANREELS_OFFICIALLY
    ];
    const isSuperAdmin = superAdminIds.includes(user.id);

    if (!isAdmin && !isSelf && !isSuperAdmin) {
      throw new Error('Unauthorized: Admin only or self only');
    }

    // Service role client to delete auth user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Deleting user: ${userIdToDelete} requested by ${user.id}`);

    // Delete profile first (this will cascade delete most other data)
    const { error: deleteProfileError } = await supabaseAdmin.from('profiles').delete().eq('id', userIdToDelete);
    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError);
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      throw deleteUserError;
    }

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Delete user error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
