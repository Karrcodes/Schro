
const fs = require('fs');
const content = fs.readFileSync('c:/Users/Karr/Documents/Projects/Schro/src/features/studio/components/CanvasDashboard.tsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inString) {
        if (char === stringChar && content[i-1] !== '\\') inString = false;
    } else {
        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
        } else if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
    }
}

const lines = content.split('\n');
let divStack = [];

lines.forEach((line, i) => {
    let openMatches = [...line.matchAll(/<div[\s>]/g)];
    let closeMatches = [...line.matchAll(/<\/div\s*>/g)];
    
    openMatches.forEach(() => divStack.push(i + 1));
    closeMatches.forEach(() => {
        if (divStack.length > 0) divStack.pop();
        else console.log(`Extra closing div at line ${i + 1}: ${line.trim()}`);
    });
});

console.log('Unclosed div at lines:', divStack);
