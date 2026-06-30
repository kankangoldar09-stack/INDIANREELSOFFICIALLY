const fs = require('fs');

let html = fs.readFileSync('public/ludo-snakes-game.html', 'utf8');

// Replace all occurrences of </script> with <\/script>
// and then restore the very last one which is the closing tag of the file itself.
const token = '___CLOSING_SCRIPT_TAG___';
// Find the last index of </script>
const lastIdx = html.lastIndexOf('</script>');
if (lastIdx !== -1) {
    html = html.slice(0, lastIdx) + token + html.slice(lastIdx + 9);
}

// Now replace all other </script>
html = html.replace(/<\/script>/g, '<\\/script>');

// Restore the last one
html = html.replace(token, '</script>');

fs.writeFileSync('public/ludo-snakes-game.html', html, 'utf8');
console.log('Successfully escaped </script> tags in public/ludo-snakes-game.html!');
