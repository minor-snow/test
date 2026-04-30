const fs = require('fs');
const path = require('path');

// Just read one file and check its imports
const content = fs.readFileSync('src/cli/pantheon.ts', 'utf-8');
const importPattern = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
let m;
while ((m = importPattern.exec(content)) !== null) {
  const impPath = m[1];
  if (impPath.startsWith('.') || impPath.startsWith('src/')) {
    let resolved;
    if (impPath.startsWith('.')) {
      resolved = path.resolve('src/cli', impPath);
    } else {
      resolved = path.resolve('.', impPath);
    }
    console.log('import: ' + impPath);
    console.log('  resolved: ' + resolved);
    console.log('  exists? ' + fs.existsSync(resolved) + ' ts? ' + fs.existsSync(resolved + '.ts'));
  }
}
