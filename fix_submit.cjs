const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  "const handleFinalSubmit = async () => {",
  "const handleFinalSubmit = async () => {\n    const numUnitPrice = parseFloat(String(unitPrice)) || 0;\n    const numQuantity = Math.max(1, parseInt(String(quantity)) || 1);\n    const numPaidAmount = parseFloat(String(paidAmount)) || 0;"
);

// We need to properly replace them. Let's do a safe string replace.
code = code.replace(/fabric: tailoringDetails\.fabric,\n(\s+)unitPrice,\n(\s+)quantity,\n(\s+)paidAmount/g, "fabric: tailoringDetails.fabric,\n$1unitPrice: numUnitPrice,\n$2quantity: numQuantity,\n$3paidAmount: numPaidAmount");
code = code.replace(/garmentType: tailoringDetails\.garmentType,\n(\s+)quantity,\n/g, "garmentType: tailoringDetails.garmentType,\n$1quantity: numQuantity,\n");
code = code.replace(/totalAmount,\n(\s+)unitPrice,\n(\s+)quantity,\n(\s+)paidAmount: existingPaid/g, "totalAmount,\n$1unitPrice: numUnitPrice,\n$2quantity: numQuantity,\n$3paidAmount: existingPaid");
code = code.replace(/totalAmount,\n(\s+)unitPrice,\n(\s+)quantity,\n(\s+)fabricCost: 0,\n(\s+)paidAmount,/g, "totalAmount,\n$1unitPrice: numUnitPrice,\n$2quantity: numQuantity,\n$3fabricCost: 0,\n$4paidAmount: numPaidAmount,");

// One more check in handleFinalSubmit:
code = code.replace(/deliveryDate,\n(\s+)unitPrice,\n(\s+)quantity,\n(\s+)paidAmount,/g, "deliveryDate,\n$1unitPrice: numUnitPrice,\n$2quantity: numQuantity,\n$3paidAmount: numPaidAmount,");

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
