
const fs = require('fs');
const content = fs.readFileSync('c:/Users/Karr/Documents/Projects/Schro/src/features/studio/components/CanvasDashboard.tsx', 'utf8');

const lines = content.split('\n');
let stack = [];

function checkTags(tag) {
    console.log(`Checking ${tag}...`);
    stack = [];
    const openRegex = new RegExp(`<${tag}[\\s>]`, 'g');
    const closeRegex = new RegExp(`</${tag}\\s*>`, 'g');
    const selfCloseRegex = /<div[^>]*\/>/gs;

    lines.forEach((line, i) => {
        let openMatches = [...line.matchAll(openRegex)];
        let closeMatches = [...line.matchAll(closeRegex)];
        let selfCloseMatches = [...line.matchAll(selfCloseRegex)];
        
        openMatches.forEach(() => {
            // Check if this specific match is self-closing on the same line
            // This is a bit naive but works if it's on the same line
            let isSelf = selfCloseMatches.some(m => m.index === openMatches.find(om => om.index === m.index)?.index);
            if (!line.includes(`${tag}`) || !line.includes('/>')) { /* not perfect */ }
            
            stack.push(i + 1);
        });
        
        selfCloseMatches.forEach(() => {
            stack.pop();
        });

        closeMatches.forEach(() => {
            if (stack.length > 0) stack.pop();
            else console.log(`Extra closing ${tag} at line ${i + 1}: ${line.trim()}`);
        });
    });
    console.log(`Unclosed ${tag} count:`, stack.length);
    if (stack.length > 0) console.log(`Unclosed lines:`, stack);
}

checkTags('div');
checkTags('main');
checkTags('header');
checkTags('section');
checkTags('article');
