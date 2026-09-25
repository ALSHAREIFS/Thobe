const fs = require('fs');
let code = fs.readFileSync('src/utils/currencyFormatting.ts', 'utf8');

code = code.replace(
  "return `${numStr} ${getCurrencySymbol(currency)}`;",
  "// Using LRM (\\u200E) ensures the number and currency are displayed left-to-right visually\n  return `\\u200E${numStr} ${getCurrencySymbol(currency)}\\u200E`;"
);

fs.writeFileSync('src/utils/currencyFormatting.ts', code);
