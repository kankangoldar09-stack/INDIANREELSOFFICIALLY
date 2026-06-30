const fs = require('fs');

const html = fs.readFileSync('public/ludo-snakes-game.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
    console.error('No script tag found!');
    process.exit(1);
}
fs.writeFileSync('scratch/temp_game_script.js', scriptMatch[1], 'utf8');
console.log('Script extracted to scratch/temp_game_script.js');
