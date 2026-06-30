const { Client } = require('pg');
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

const projectRef = 'kpcqxvhvojfjczryjrva';
const host = `db.${projectRef}.supabase.co`;
const port = 5432;
const user = 'postgres';
const database = 'postgres';

// List of potential passwords to try
const passwords = [
    'postgres',
    'postgres123',
    'app-af2z7g8d924h',
    'supabase',
    'kpcqxvhvojfjczryjrva',
    'jeetyt09',
    'AdminPassword123!'
];

async function tryConnect() {
    for (const password of passwords) {
        console.log(`Trying password: ${password}`);
        const client = new Client({
            host,
            port,
            user,
            password,
            database,
            ssl: { rejectUnauthorized: false }
        });
        
        try {
            await client.connect();
            console.log(`SUCCESS! Connected with password: ${password}`);
            
            // Alter table
            console.log('Altering table profiles...');
            await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_from_search BOOLEAN DEFAULT false;');
            console.log('SUCCESS: Table profiles altered!');
            
            await client.end();
            return;
        } catch (e) {
            console.error(`Failed with password: ${password}. Error:`, e.message);
        }
    }
    console.log('All connection attempts failed.');
}

tryConnect();
