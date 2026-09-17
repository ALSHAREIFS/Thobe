const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  "return calculateVatPricing({\n      enteredAmount: unitPrice,\n      quantity,\n",
  "const numUnitPrice = parseFloat(String(unitPrice)) || 0;\n    const numQuantity = Math.max(1, parseInt(String(quantity)) || 1);\n    return calculateVatPricing({\n      enteredAmount: numUnitPrice,\n      quantity: numQuantity,\n"
);

code = code.replace(
  "const remainingAmount = Math.max(0, roundMoney(totalAmount - paidAmount));",
  "const numPaidAmount = parseFloat(String(paidAmount)) || 0;\n  const remainingAmount = Math.max(0, roundMoney(totalAmount - numPaidAmount));"
);

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
