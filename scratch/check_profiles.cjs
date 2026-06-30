const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Parse .env manually
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Sample profile columns:');
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('No profiles found in the table.');
        }
    }
}

check();
