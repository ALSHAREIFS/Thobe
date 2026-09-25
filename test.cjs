const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('src/components/reports/ReportsView.tsx', 'utf8');
const sourceFile = ts.createSourceFile('ReportsView.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// Just let's check lines 610-630 and 1110-1140 directly.
console.log(code.split('\n').slice(605, 630).map((l, i) => `${i+606}: ${l}`).join('\n'));
