const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  /unitPrice: numUnitPrice,/g,
  "unitPrice: parseFloat(String(unitPrice)) || 0,"
);
code = code.replace(
  /quantity: numQuantity,/g,
  "quantity: Math.max(1, parseInt(String(quantity)) || 1),"
);
code = code.replace(
  /paidAmount: numPaidAmount,/g,
  "paidAmount: parseFloat(String(paidAmount)) || 0,"
);

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
