const fs = require('fs');

function fixFile(filePath) {
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Check if line contains {formatCurrency...} and doesn't end with a closing tag
    if (line.includes('{formatCurrency(')) {
      // Find the last opening tag on this line
      const openTagMatch = line.match(/<([a-zA-Z0-9]+)[^>]*>(?!.*<\/\1>)/);
      if (openTagMatch && !line.includes('</' + openTagMatch[1] + '>')) {
        const tagName = openTagMatch[1];
        // Only append if we really are missing it (i.e. it ends abruptly)
        // Let's just append `</tagName>` to the end of the line if there isn't one
        if (!line.trim().endsWith('>')) {
          lines[i] = line + `</${tagName}>`;
        } else if (line.trim().endsWith('}')) {
          lines[i] = line + `</${tagName}>`;
        } else if (line.trim().endsWith('"}')) {
           // not common
        } else {
           // if it ends with }</div> we don't need it, but we already checked !line.includes('</'+tagName+'>')
           lines[i] = line + `</${tagName}>`;
        }
      }
    }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'));
}

fixFile('src/components/dashboard/DashboardView.tsx');
fixFile('src/components/reports/ReportsView.tsx');
fixFile('src/components/print/PrintTailoringSheet.tsx');
fixFile('src/components/customers/CustomerDetailModal.tsx');

