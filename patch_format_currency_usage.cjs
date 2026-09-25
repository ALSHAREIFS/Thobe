const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  /\$\{actualNetPaid\} \$\{getCurrencySymbol\(currentShop\?\.currency\)\}/g,
  "${formatCurrency(actualNetPaid, currentShop?.currency)}"
);

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);

// Same for OrderDetailModal
let modalCode = fs.readFileSync('src/components/orders/OrderDetailModal.tsx', 'utf8');
modalCode = modalCode.replace(
  /\$\{activeRemaining\} \$\{getCurrencySymbol\(order\.currencySnapshot \|\| currentShop\?\.currency\)\}/g,
  "${formatCurrency(activeRemaining, order.currencySnapshot || currentShop?.currency)}"
);
modalCode = modalCode.replace(
  /\$\{maxRefundable\} \$\{getCurrencySymbol\(order\.currencySnapshot \|\| currentShop\?\.currency\)\}/g,
  "${formatCurrency(maxRefundable, order.currencySnapshot || currentShop?.currency)}"
);
modalCode = modalCode.replace(
  /\{maxRefundable\} \b(?:\{)?getCurrencySymbol\(order\.currencySnapshot \|\| currentShop\?\.currency\)(?:\})?/g,
  "{formatCurrency(maxRefundable, order.currencySnapshot || currentShop?.currency)}"
);
modalCode = modalCode.replace(
  /\{activeRemaining\} \b(?:\{)?getCurrencySymbol\(order\.currencySnapshot \|\| currentShop\?\.currency\)(?:\})?/g,
  "{formatCurrency(activeRemaining, order.currencySnapshot || currentShop?.currency)}"
);

fs.writeFileSync('src/components/orders/OrderDetailModal.tsx', modalCode);
