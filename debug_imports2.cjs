const fs = require('fs');
const path = require('path');

const srcDir = 'src';

// Test: get files, try to resolve an import
const files = [];
function walk(dir) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(p);
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) files.push(p);
  }
}
walk(srcDir);

// Build file lookup
const fileLookup = {};
for (const f of files) {
  let normalized = f.replace(/\\/g, '/');
  normalized = normalized.replace(/\.(ts|js)$/g, '');
  fileLookup[normalized] = f;
  if (normalized.endsWith('/index')) {
    const parentDir = normalized.replace('/index', '');
    fileLookup[parentDir] = f;
  }
}

// Test with one known file
const testFile = 'src/agentFeedback/agentFeedbackRenderer.ts';
const content = fs.readFileSync(testFile, 'utf-8');
console.log('Testing: ' + testFile);

const importPattern = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
let m;
while ((m = importPattern.exec(content)) !== null) {
  const impPath = m[1];
  console.log('  Import found: "' + impPath + '"');
  
  if (!impPath.startsWith('.') && !impPath.startsWith('src/')) {
    console.log('    -> external, skipping');
    continue;
  }
  
  const fromDir = path.dirname(testFile).replace(/\\/g, '/');
  let imp = impPath;
  if (imp.endsWith('.js')) {
    imp = imp.slice(0, -3);
    console.log('    -> stripped .js to: "' + imp + '"');
  }
  
  let resolved;
  if (imp.startsWith('.')) {
    resolved = path.resolve(fromDir, imp).replace(/\\/g, '/');
    console.log('    -> resolve("' + fromDir + '", "' + imp + '") = "' + resolved + '"');
  } else if (imp.startsWith('src/')) {
    resolved = path.resolve('.', imp).replace(/\\/g, '/');
    console.log('    -> resolve(".", "' + imp + '") = "' + resolved + '"');
  }
  
  // Check in lookup
  const directMatch = fileLookup[resolved];
  console.log('    -> fileLookup["' + resolved + '"] = ' + (directMatch || 'undefined'));
  
  // List all keys that start similarly
  const similar = Object.keys(fileLookup).filter(function(k) { return k.includes('agentFeedback'); });
  console.log('    -> all keys with agentFeedback: ' + JSON.stringify(similar));
}
