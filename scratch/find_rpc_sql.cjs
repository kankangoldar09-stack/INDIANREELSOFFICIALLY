const fs = require('fs');

const sql = fs.readFileSync('supabase/schema.sql', 'utf8');

// Find all matches for "CREATE FUNCTION" or "create function" or "CREATE OR REPLACE FUNCTION"
const regex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([a-zA-Z0-9_\.]+)/gi;
let match;
const functions = [];
while ((match = regex.exec(sql)) !== null) {
    functions.push(match[1]);
}

console.log('Found', functions.length, 'functions in schema.sql.');
console.log('Sample functions:');
console.log(functions.filter(f => f.toLowerCase().includes('sql') || f.toLowerCase().includes('exec') || f.toLowerCase().includes('run') || f.toLowerCase().includes('query')));
