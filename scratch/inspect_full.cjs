const fs = require('fs');

const html = fs.readFileSync('public/ludo-snakes-game.html', 'utf8');
console.log('HTML file length:', html.length);

const idxLudo = html.indexOf('const ludoSrc =');
const idxSnake = html.indexOf('const snakeSrc =');
console.log('Index of ludoSrc:', idxLudo);
console.log('Index of snakeSrc:', idxSnake);

if (idxLudo !== -1) {
    console.log('ludoSrc declaration start:', html.slice(idxLudo, idxLudo + 100));
}
if (idxSnake !== -1) {
    console.log('snakeSrc declaration start:', html.slice(idxSnake, idxSnake + 100));
}

// Let's write a script to check if there are any unescaped single quotes inside the ludoSrc string
if (idxLudo !== -1 && idxSnake !== -1) {
    const ludoSrcText = html.slice(idxLudo, idxSnake);
    console.log('ludoSrcText length:', ludoSrcText.length);
    
    // Let's see if the JavaScript parser in Node can parse the script tag contents
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        const jsCode = scriptMatch[1];
        fs.writeFileSync('scratch/temp_extracted.js', jsCode, 'utf8');
        try {
            // Let's use acorn or standard require to check
            const esprima = require('esprima'); // might not be installed, so let's use eval in VM with syntax checking
        } catch (e) {}
    }
}
