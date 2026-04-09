const fs = require('fs');
const path = require('path');

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

const UNIVERSAL_DYNAMIC = "export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';\n";

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove ANY existing dynamic exports (force-static, force-dynamic, auto, etc.)
    const dynamicRegex = /export const dynamic = ['"][^'"]+['"];?\n?/g;
    const complexDynamicRegex = /export const dynamic = \(process\.env\.TAURI_PLATFORM[^\n]+\n?/g;
    
    let newContent = content.replace(dynamicRegex, '').replace(complexDynamicRegex, '');
    
    // Add the new universal one at the top
    newContent = UNIVERSAL_DYNAMIC + newContent;
    
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Smart Patched: ${path.relative(process.cwd(), file)}`);
});

console.log('All API routes have been updated with smart conditional logic.');
