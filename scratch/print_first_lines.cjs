const fs = require('fs');

const code = fs.readFileSync('scratch/temp_game_script.js', 'utf8');
console.log('Total characters:', code.length);
console.log('First 1000 characters:');
console.log(code.slice(0, 1000));
console.log('---');
console.log('Last 200 characters:');
console.log(code.slice(-200));
