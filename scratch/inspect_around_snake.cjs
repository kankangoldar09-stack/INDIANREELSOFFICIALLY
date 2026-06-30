const fs = require('fs');

const html = fs.readFileSync('public/ludo-snakes-game.html', 'utf8');
const idxSnake = html.indexOf('const snakeSrc =');
if (idxSnake !== -1) {
    console.log('--- SURROUNDING TEXT ---');
    console.log(html.slice(idxSnake - 200, idxSnake + 300));
    console.log('------------------------');
} else {
    console.log('snakeSrc not found');
}
