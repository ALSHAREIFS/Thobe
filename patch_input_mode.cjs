const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

// The inputs were changed to type="number". The user requested them to be string states that don't block dots.
// Actually type="number" natively supports dots but behaves weirdly across browsers.
// Using type="text" with inputMode="decimal" is much safer.
code = code.replace(/type="number"/g, 'type="text" inputMode="decimal"');

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
