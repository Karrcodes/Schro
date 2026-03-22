
const fs = require('fs');
const content = fs.readFileSync('c:/Users/Karr/Documents/Projects/Schro/src/features/studio/components/CanvasDashboard.tsx', 'utf8');

let pos = 0;
let stack = [];

while (pos < content.length) {
    const divCloseMatch = content.substring(pos).match(/^<\/div\s*>/i);
    if (content.startsWith('<div', pos) && !content.startsWith('</div>', pos)) {
        let end = content.indexOf('>', pos);
        let tagContent = content.substring(pos, end + 1);
        if (tagContent.endsWith('/>')) {
            // self close
        } else {
            stack.push({ line: content.substring(0, pos).split('\n').length, content: tagContent });
        }
        pos = end + 1;
    } else if (divCloseMatch) {
        const line = content.substring(0, pos).split('\n').length;
        if (stack.length > 0) {
            const popped = stack.pop();
            console.log(`Closing ${popped.line} ( ${popped.content} ) at line ${line}`);
        } else console.log(`Extra close at line ${line}: ${divCloseMatch[0]}`);
        pos += divCloseMatch[0].length;
    } else {
        pos++;
    }
}

console.log('Unclosed tags:', stack);
