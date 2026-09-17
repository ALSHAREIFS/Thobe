const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  /\$\{getCurrencySymbol\(currentShop\?\.currency\)\}\)\` يرجى تصحيح السعر أو معالجة الاسترداد أولاً\.\`,/g,
  "${getCurrencySymbol(currentShop?.currency)}). يرجى تصحيح السعر أو معالجة الاسترداد أولاً.`,"
);

code = code.replace(
  /\$\{getCurrencySymbol\(currentShop\?\.currency\)\}\}\`\}/g,
  "${getCurrencySymbol(currentShop?.currency)})`}"
);

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
