const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(
  '<head>',
  '<head>\n    <script>\n      window.__APP_START__ = performance.now();\n      window.__TIMINGS__ = {};\n      window.__MARK_TIMING__ = (name) => {\n        window.__TIMINGS__[name] = performance.now();\n        console.log(`[TIMING] ${name}: ${(performance.now() - window.__APP_START__).toFixed(2)}ms`);\n      };\n      window.__MARK_TIMING__("APP_START");\n    </script>'
);

fs.writeFileSync('index.html', code);
