const fs = require('fs');

try {
    const code = fs.readFileSync('scratch/temp_game_script.js', 'utf8');
    // We can use a simple parser or inspect line by line by trying to eval or construct a Function
    // Since it's a syntax error in the string, let's check lines
    const lines = code.split('\n');
    console.log('Script has', lines.length, 'lines.');
    
    // Let's find where the syntax error starts.
    // We will parse it chunk by chunk or using Function constructor.
    // If we evaluate line 1: const ludoSrc = '...
    // The syntax error is likely in the massive string.
    // Let's write a script that checks if single quotes are matched, or inspects backslashes.
    
    // Let's check if there are any unescaped single quotes in ludoSrc or snakeSrc.
    // Since ludoSrc starts on line 2 (inside the script), let's inspect where ludoSrc starts and ends.
    // Let's search for the end of ludoSrc.
    let inSingleQuote = false;
    let escape = false;
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === "'") {
            inSingleQuote = !inSingleQuote;
        }
        // If we hit a newline but we are inside single quote, is it allowed?
        // In JavaScript, a single-quoted string literal CANNOT contain a literal newline unless it's escaped (i.e. with a backslash \ at the end of the line)!
        // Wait! In ES6, we use backticks (`) for multiline strings!
        // But if the code uses single quotes (') and contains literal newlines, it is a SYNTAX ERROR!
        if (char === '\n' && inSingleQuote) {
            // Find line number
            const codeBefore = code.slice(0, i);
            const lineNum = codeBefore.split('\n').length;
            console.log(`ERROR: Literal newline found inside single-quoted string on line ${lineNum}!`);
            
            // Print surrounding code
            const line = lines[lineNum - 1];
            console.log('Line content:', line.slice(0, 100));
            break;
        }
    }
} catch (e) {
    console.error('Finder error:', e);
}
