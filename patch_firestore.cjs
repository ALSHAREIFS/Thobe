const fs = require('fs');
let code = fs.readFileSync('src/firebase/config.ts', 'utf8');
code = code.replace(
  "export const db = getFirestore(app, appletConfig.firestoreDatabaseId);// ",
  "export const db = initializeFirestore(app, { experimentalForceLongPolling: true }, appletConfig.firestoreDatabaseId);\n"
);
fs.writeFileSync('src/firebase/config.ts', code);
