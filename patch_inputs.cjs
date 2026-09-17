const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

code = code.replace(
  "onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}",
  "onChange={(e) => setQuantity(e.target.value)}\n                    dir=\"ltr\"\n                    style={{ unicodeBidi: 'isolate' }}"
);

code = code.replace(
  "onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}",
  "onChange={(e) => setUnitPrice(e.target.value)}\n                    dir=\"ltr\"\n                    style={{ unicodeBidi: 'isolate' }}"
);

code = code.replace(
  "onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}",
  "onChange={(e) => setPaidAmount(e.target.value)}\n                      dir=\"ltr\"\n                      style={{ unicodeBidi: 'isolate' }}"
);

// fix vat info logic below unit price
code = code.replace(
  "{vatConfig.vatEnabled && unitPrice > 0 && (",
  "{vatConfig.vatEnabled && (parseFloat(String(unitPrice)) || 0) > 0 && ("
);

code = code.replace(
  "? `(قبل الضريبة: ${(unitPrice / (1 + vatConfig.vatRate / 100)).toFixed(2)}",
  "? `(قبل الضريبة: ${((parseFloat(String(unitPrice)) || 0) / (1 + vatConfig.vatRate / 100)).toFixed(2)}"
);

code = code.replace(
  ": `(شامل الضريبة: ${(unitPrice * (1 + vatConfig.vatRate / 100)).toFixed(2)}",
  ": `(شامل الضريبة: ${((parseFloat(String(unitPrice)) || 0) * (1 + vatConfig.vatRate / 100)).toFixed(2)}"
);

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
