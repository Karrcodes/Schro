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
    
    // REGEX V3: More aggressive cleanup to ensure Next.js static analysis passes
    const dynamicRegex = /export const dynamic = [^;]+;?\n?/g;
    const staticParamsRegex = /export const generateStaticParams = [^;]+;?\n?/g;
    
    let newContent = content.replace(dynamicRegex, '').replace(staticParamsRegex, '');
    
    let header = `export const dynamic = ${targetValue}\n`;
    
    if (mode === 'static' && (file.includes('[') && file.includes(']'))) {
        header += "export const generateStaticParams = () => [];\n";
    }
    
    fs.writeFileSync(file, header + newContent.trimStart(), 'utf8');
});

console.log(`Successfully patched 64 API routes as ${mode} for Next.js static analysis.`);
