const fs = require('fs');
let code = fs.readFileSync('src/components/orders/OrderWizard.tsx', 'utf8');

const additionalValidation = `
    if (!isEditingMode && numPaidAmount > totalAmount) {
      showToast('لا يمكن أن يكون العربون المدفوع أكبر من الإجمالي', 'error');
      setStep(4);
      return;
    }
`;

code = code.replace(
  "    // Validate essential measurements before submitting",
  additionalValidation + "\n    // Validate essential measurements before submitting"
);

fs.writeFileSync('src/components/orders/OrderWizard.tsx', code);
