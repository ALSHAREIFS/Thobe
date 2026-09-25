const fs = require('fs');

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Replace direct `{var} {getCurrencySymbol(currency)}` with `{formatCurrency(var, currency)}`
  // We use a regex that captures the variable name
  const regex = /\{([a-zA-Z0-9_?.()]+)\} (?:<[^>]+>)?\{getCurrencySymbol\(([^)]+)\)\}(?:<\/[^>]+>)?/g;
  code = code.replace(regex, "{formatCurrency($1, $2)}");
  
  // Also check without spaces
  const regex2 = /\{([a-zA-Z0-9_?.()]+)\}(?:<[^>]+>)?\{getCurrencySymbol\(([^)]+)\)\}(?:<\/[^>]+>)?/g;
  code = code.replace(regex2, "{formatCurrency($1, $2)}");

  fs.writeFileSync(filePath, code);
}

patchFile('src/components/dashboard/DashboardView.tsx');
patchFile('src/components/reports/ReportsView.tsx');
patchFile('src/components/print/PrintTailoringSheet.tsx');
patchFile('src/components/customers/CustomerDetailModal.tsx');

