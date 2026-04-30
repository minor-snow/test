const fs = require('fs');
const path = require('path');

// Test getting directory for a few files
const srcDir = 'src';
const allModules = [
  'src/alpha', 'src/agentFeedback','src/agentTrial','src/artifacts',
  'src/boundary','src/changeContract','src/changeContract/lite','src/cli',
  'src/cockpit','src/codegen','src/demo','src/diffWorkflow','src/github',
  'src/governance','src/governanceLog','src/handoff','src/i18n','src/metrics',
  'src/repair','src/repair/session','src/repoObservation','src/repoObservation/python',
  'src/review','src/scopeDiff','src/scopedHandoff','src/trial'
];

// Test: get a file and see what module it maps to
const testFiles = [
  'src\\cli\\pantheon.ts',
  'src/cli/pantheon.ts',
  'src/handoff/types.ts',
  'src/repair/repairReportRenderer.ts'
];

for (const f of testFiles) {
  const dir = path.dirname(f);
  const dirFwd = dir.replace(/\\/g, '/');
  const matching = allModules.filter(function(m) {
    return dirFwd.startsWith(m + '/') || dirFwd === m;
  });
  matching.sort(function(a,b) { return b.length - a.length; });
  const result = matching.length > 0 ? matching[0] : (dirFwd === 'src' ? 'src' : 'unknown');
  console.log(f + ' -> dir=' + dirFwd + ' -> module=' + result);
}

// Test: walk and check a few files
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

console.log('\nFirst 5 files:');
for (let i = 0; i < 5 && i < files.length; i++) {
  const f = files[i];
  const dir = path.dirname(f);
  const dirFwd = dir.replace(/\\/g, '/');
  console.log('  ' + f + ' -> dir=' + dirFwd);
}

// Test: try to read imports from one file
const content = fs.readFileSync(files[0], 'utf-8');
const importPattern = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
let m;
let found = false;
while ((m = importPattern.exec(content)) !== null) {
  if (m[1].startsWith('.') || m[1].startsWith('src/')) {
    console.log('\nFile: ' + files[0]);
    console.log('Import: ' + m[1]);
    found = true;
  }
}
if (!found) {
  console.log('\nNo local imports in ' + files[0]);
}
