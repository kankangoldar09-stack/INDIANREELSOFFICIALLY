import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mojvabjdgboyqtvuegtg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vanZhYmpkZ2JveXF0dnVlZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5Mjk2NTUsImV4cCI6MjA4MjUwNTY1NX0.jKV2Tdj1FWywgjTNCq8_WQw-pMmSXS2FicuVtMsRT-Y';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  const email = 'admin_indiantreels@miaoda.com';
  const password = 'AdminPassword123!';
  const username = 'admin_tester';

  console.log(`Attempting to sign up ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: 'Indianreels Admin'
      }
    }
  });

  if (error) {
    console.error('Signup error:', error.message);
    return;
  }

  if (data.user) {
    console.log(`User created successfully with ID: ${data.user.id}`);
    
    // Attempt to promote to admin in the profiles table
    // (Note: Supabase might have a trigger that auto-creates the profile)
    // We'll try to update it here if it exists, or insert if not.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', data.user.id);

    if (profileError) {
      console.log('Error updating profile role (it might not exist yet):', profileError.message);
      // Try to insert if update didn't work (though update returning nothing isn't an error necessarily)
      // We'll rely on the SQL tool later to be sure.
    } else {
      console.log('Profile promoted to admin successfully.');
    }
  } else {
    console.log('Signup successful but no user returned (might need email verification).');
  }
}

createAdmin();
