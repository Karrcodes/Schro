
const fs = require('fs');
const content = fs.readFileSync('c:/Users/Karr/Documents/Projects/Schro/src/features/studio/components/CanvasDashboard.tsx', 'utf8');

const divOpens = [...content.matchAll(/<div[\s>]/g)].length;
const divCloses = [...content.matchAll(/<\/div\s*>/g)].length;
const divSelfCloses = [...content.matchAll(/<div[^>]*\/>/gs)].length;

console.log('Div Open:', divOpens);
console.log('Div Close:', divCloses);
console.log('Div Self-Close:', divSelfCloses);
console.log('Total Opens (needed close):', divOpens - divSelfCloses);
console.log('Gap:', (divOpens - divSelfCloses) - divCloses);
