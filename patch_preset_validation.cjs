const fs = require('fs');
let code = fs.readFileSync('src/utils/presets.ts', 'utf8');

code = code.replace(
  "if (!params.unitPrice || params.unitPrice <= 0 || isNaN(params.unitPrice)) {",
  "if (params.unitPrice === undefined || params.unitPrice === null || params.unitPrice < 0 || isNaN(params.unitPrice)) {"
);
code = code.replace(
  "missing.push('سعر الثوب / سعر الوحدة (يجب أن يكون أكبر من 0)');",
  "missing.push('سعر الثوب / سعر الوحدة (يجب أن يكون رقماً صحيحاً)');"
);

fs.writeFileSync('src/utils/presets.ts', code);
