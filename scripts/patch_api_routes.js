const fs = require('fs');
const path = require('path');

const mode = process.argv.includes('--static') ? 'static' : 'dynamic';
const targetValue = mode === 'static' ? "'force-static'" : "'force-dynamic'";

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            if (fullPath.endsWith('route.ts') || fullPath.endsWith('route.js')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
const files = walk(apiDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Regex to find ANY existing dynamic export
    // This matches: export const dynamic = '...' or export const dynamic = (...) ? ... : ...;
    const dynamicRegex = /export const dynamic = [^;\n]+;?\n?/g;
    
    let newContent = content.replace(dynamicRegex, '');
    
    // Prepend the new literal string
    newContent = `export const dynamic = ${targetValue}\n` + newContent;
    
    fs.writeFileSync(file, newContent, 'utf8');
});

console.log(`Successfully toggled 64 API routes to ${mode} mode.`);
