const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('src/components/reports/ReportsView.tsx', 'utf8');
console.log(code.split('\n').slice(1110, 1135).map((l, i) => `${i+1111}: ${l}`).join('\n'));
