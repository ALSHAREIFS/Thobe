const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove from App
code = code.replace(
  "if (!loading && typeof window !== 'undefined' && window.__MARK_TIMING__ && !window.__TIMINGS__['APP_INTERACTIVE']) { window.__MARK_TIMING__('APP_INTERACTIVE'); }",
  ""
);

// Add to AppContent at the end before returning MainLayout
code = code.replace(
  "  return (\n    <ShopProvider>\n      <MainLayout />",
  "  if (typeof window !== 'undefined' && window.__MARK_TIMING__ && window.__TIMINGS__ && !window.__TIMINGS__['APP_INTERACTIVE']) { window.__MARK_TIMING__('APP_INTERACTIVE'); }\n  return (\n    <ShopProvider>\n      <MainLayout />"
);

fs.writeFileSync('src/App.tsx', code);
