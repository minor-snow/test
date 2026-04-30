const fs = require('fs');
const path = require('path');

const srcDir = 'src';
const allModules = [
  'src/alpha', 'src/agentFeedback','src/agentTrial','src/artifacts',
  'src/boundary','src/changeContract','src/changeContract/lite','src/cli',
  'src/cockpit','src/codegen','src/demo','src/diffWorkflow','src/github',
  'src/governance','src/governanceLog','src/handoff','src/i18n','src/metrics',
  'src/repair','src/repair/session','src/repoObservation','src/repoObservation/python',
  'src/review','src/scopeDiff','src/scopedHandoff','src/trial'
];

function getModuleForFile(filePath) {
  const dir = path.dirname(filePath);
  const matching = allModules.filter(function(m) { return dir.startsWith(m + '/') || dir === m; });
  matching.sort(function(a,b) { return b.length - a.length; });
  if (matching.length > 0) return matching[0];
  if (dir === 'src') return 'src';
  return 'unknown';
}

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

const fileLookup = {};
for (const f of files) {
  const normalized = f.replace(/\.ts$/g, '').replace(/\/g, '/');
  fileLookup[normalized] = f;
  if (normalized.endsWith('/index')) {
    const parentDir = normalized.replace('/index', '');
    fileLookup[parentDir] = f;
  }
}

const fileImports = {};
for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const importPattern = /import\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  const matches = [];
  let m;
  while ((m = importPattern.exec(content)) !== null) {
    matches.push(m[1]);
  }
  fileImports[f] = matches;
}

function resolveImport(fromFile, importPath) {
  const fromDir = path.dirname(fromFile).replace(/\/g, '/');
  let resolved;
  if (importPath.startsWith('.')) {
    resolved = path.resolve(fromDir, importPath).replace(/\/g, '/');
  } else if (importPath.startsWith('src/')) {
    resolved = path.resolve('.', importPath).replace(/\/g, '/');
  } else {
    return null;
  }
  if (fileLookup[resolved]) return fileLookup[resolved];
  const tsResolved = resolved + '.ts';
  if (fileLookup[tsResolved]) return fileLookup[tsResolved];
  const indexResolved = resolved + '/index';
  if (fileLookup[indexResolved]) return fileLookup[indexResolved];
  const indexTsResolved = resolved + '/index.ts';
  if (fileLookup[indexTsResolved]) return fileLookup[indexTsResolved];
  return null;
}

const fileToModules = {};
for (const f of files) {
  fileToModules[f] = new Set();
  const fromMod = getModuleForFile(f);
  for (const imp of fileImports[f]) {
    const resolvedFile = resolveImport(f, imp);
    if (resolvedFile) {
      const toMod = getModuleForFile(resolvedFile);
      if (toMod && toMod !== fromMod && toMod !== 'unknown') {
        fileToModules[f].add(toMod);
      }
    }
  }
}

const importsFrom = {};
const importedBy = {};
for (const mod of ['src', ...allModules]) {
  importsFrom[mod] = new Set();
  importedBy[mod] = new Set();
}

for (const f of files) {
  const fromMod = getModuleForFile(f);
  if (fromMod === 'unknown') continue;
  for (const toMod of fileToModules[f]) {
    importsFrom[fromMod].add(toMod);
    importedBy[toMod].add(fromMod);
  }
}

console.log('=== MODULE IMPORTED-BY COUNTS ===');
const sortedByImported = Object.entries(importedBy)
  .filter(function(e) { return allModules.includes(e[0]) || e[0] === 'src'; })
  .sort(function(a,b) { return b[1].size - a[1].size; });
for (const e of sortedByImported) {
  console.log(e[0] + ': ' + e[1].size + ' modules - [' + Array.from(e[1]).join(', ') + ']');
}

console.log('');
console.log('=== MODULE IMPORTS-FROM COUNTS ===');
const sortedByImport = Object.entries(importsFrom)
  .filter(function(e) { return allModules.includes(e[0]) || e[0] === 'src'; })
  .sort(function(a,b) { return b[1].size - a[1].size; });
for (const e of sortedByImport) {
  console.log(e[0] + ': ' + e[1].size + ' modules - [' + Array.from(e[1]).join(', ') + ']');
}

console.log('');
console.log('=== CIRCULAR DEPENDENCIES ===');
const allMods = ['src', ...allModules];
for (const a of allMods) {
  for (const b of allMods) {
    if (a < b) {
      if (importedBy[a].has(b) && importedBy[b].has(a)) {
        console.log('CIRCULAR: ' + a + ' <-> ' + b);
      }
    }
  }
}

console.log('');
console.log('=== DETAILED CROSS-MODULE IMPORTS (file level) ===');
for (const f of files) {
  const fromMod = getModuleForFile(f);
  if (fromMod === 'unknown') continue;
  if (fileToModules[f].size > 0) {
    console.log(f + ' (in ' + fromMod + ') -> [' + Array.from(fileToModules[f]).join(', ') + ']');
  }
}
