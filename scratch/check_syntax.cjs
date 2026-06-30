const fs = require('fs');

try {
    const html = fs.readFileSync('public/ludo-snakes-game.html', 'utf8');
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        console.error('No script tag found!');
        process.exit(1);
    }
    const code = scriptMatch[1];
    
    // Evaluate in a separate process or capture syntax error line
    try {
        eval(code);
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error('Syntax error message:', e.message);
            console.error(e.stack);
            
            // Try to find the exact place
            // Let's split by line and see if we can find mismatched quotes or backslashes
            const lines = code.split('\n');
            console.error('Code has', lines.length, 'lines.');
        } else {
            // runtime errors are fine for this check since variables are not defined in node env
            console.log('Parsed OK (runtime error is expected in Node environment):', e.message);
        }
    }
} catch (e) {
    console.error('Error:', e);
}
