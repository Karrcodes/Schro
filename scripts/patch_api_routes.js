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
    
    // 1. Remove ANY existing dynamic exports or dummy params
    const dynamicRegex = /export const dynamic = [^;\n]+;?\n?/g;
    const staticParamsRegex = /export const generateStaticParams = [^;\n]+;?\n?/g;
    
    let newContent = content.replace(dynamicRegex, '').replace(staticParamsRegex, '');
    
    // 2. Add the dynamic mode to the top
    let header = `export const dynamic = ${targetValue}\n`;
    
    // 3. Add dummy static params if needed (AT THE TOP)
    if (mode === 'static' && (file.includes('[') && file.includes(']'))) {
        console.log(`Adding dummy static params to dynamic route: ${path.relative(process.cwd(), file)}`);
        header += "export const generateStaticParams = () => [];\n";
    }
    
    fs.writeFileSync(file, header + newContent, 'utf8');
});

console.log(`Deep-Patched 64 API routes for ${mode} mode.`);
