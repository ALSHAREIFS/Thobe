const fs = require('fs');
let code = fs.readFileSync('src/utils/currencyFormatting.ts', 'utf8');

code = code.replace(
  "return `${safeAmount} ${getCurrencySymbol(currency)}`;",
  "const numStr = safeAmount.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2, maximumFractionDigits: 2 });\n  // Use LRM/RLM marks or just return formatted string. \n  // \u200F is Right-To-Left Mark, \u202A is Left-To-Right Embedding.\n  return `${numStr} ${getCurrencySymbol(currency)}`;"
);

fs.writeFileSync('src/utils/currencyFormatting.ts', code);
