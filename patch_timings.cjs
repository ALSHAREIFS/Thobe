const fs = require('fs');

function replaceFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  for (const [search, replace] of replacements) {
    code = code.replace(search, replace);
  }
  fs.writeFileSync(path, code);
}

// 1. Firebase init
replaceFile('src/firebase/config.ts', [
  [
    "export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);",
    "export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);\nif (typeof window !== 'undefined' && window.__MARK_TIMING__) window.__MARK_TIMING__('FIREBASE_INITIALIZED');"
  ]
]);

// 2. AuthContext
replaceFile('src/context/AuthContext.tsx', [
  [
    "setFirebaseUser(user);",
    "setFirebaseUser(user);\n      if (typeof window !== 'undefined' && window.__MARK_TIMING__) window.__MARK_TIMING__('AUTH_RESOLVED');"
  ],
  [
    "setCurrentUser(resolvedProfile);",
    "if (typeof window !== 'undefined' && window.__MARK_TIMING__) window.__MARK_TIMING__('USER_PROFILE_LOADED');\n        setCurrentUser(resolvedProfile);"
  ],
  [
    "setCurrentShop(resolvedShop);",
    "if (typeof window !== 'undefined' && window.__MARK_TIMING__) window.__MARK_TIMING__('SHOP_LOADED');\n        setCurrentShop(resolvedShop);"
  ],
  [
    "setCurrentShop(shop);",
    "if (typeof window !== 'undefined' && window.__MARK_TIMING__) window.__MARK_TIMING__('SHOP_LOADED');\n            setCurrentShop(shop);"
  ]
]);

// 3. ShopContext
replaceFile('src/context/ShopContext.tsx', [
  [
    "if (isSuperAdmin || isShop) {",
    "if (typeof window !== 'undefined' && window.__MARK_TIMING__) window.__MARK_TIMING__('SHOP_CONTEXT_READY');\n      if (isSuperAdmin || isShop) {"
  ]
]);

// 4. App
replaceFile('src/App.tsx', [
  [
    "return (",
    "if (!loading && typeof window !== 'undefined' && window.__MARK_TIMING__ && !window.__TIMINGS__['APP_INTERACTIVE']) { window.__MARK_TIMING__('APP_INTERACTIVE'); }\n    return ("
  ]
]);

