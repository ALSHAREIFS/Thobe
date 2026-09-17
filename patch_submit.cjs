const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  "const handleSaveOrder = async () => {",
  "const handleSaveOrder = async () => {\n    const numUnitPrice = parseFloat(String(unitPrice)) || 0;\n    const numQuantity = Math.max(1, parseInt(String(quantity)) || 1);\n    const numPaidAmount = parseFloat(String(paidAmount)) || 0;"
);

// We need to replace quantity, unitPrice, paidAmount with numQuantity, numUnitPrice, numPaidAmount where they are used to build the object.
// We can just use a simple regex for object property shorthand (e.g. `unitPrice,` -> `unitPrice: numUnitPrice,`)
code = code.replace(/(\s+)unitPrice,/g, "$1unitPrice: numUnitPrice,");
code = code.replace(/(\s+)quantity,/g, "$1quantity: numQuantity,");
code = code.replace(/(\s+)paidAmount,/g, "$1paidAmount: numPaidAmount,");

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
