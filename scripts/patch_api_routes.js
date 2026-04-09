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
console.log('Scanning:', apiDir);
const files = walk(apiDir);

console.log(`Found ${files.length} API routes.`);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("export const dynamic = 'force-static'")) {
        console.log(`Patching: ${path.relative(process.cwd(), file)}`);
        // Add to top of file
        content = "export const dynamic = 'force-static'\n" + content;
        fs.writeFileSync(file, content, 'utf8');
    } else {
        console.log(`Already patched: ${path.relative(process.cwd(), file)}`);
    }
});

console.log('All API routes have been successfully marked for static build.');
