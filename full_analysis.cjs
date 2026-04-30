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

const modsFwd = allModules.map(function(m) { return m.replace(/\\/g, '/'); });

function getModuleForFile(filePath) {
  const dirFwd = path.dirname(filePath).replace(/\\/g, '/');
  // Strip any absolute path prefix to get relative
  const relDir = dirFwd.includes('/src/') ? dirFwd.substring(dirFwd.indexOf('/src/') + 1) : dirFwd;
  const matching = modsFwd.filter(function(m) {
    return relDir.startsWith(m + '/') || relDir === m;
  });
  matching.sort(function(a,b) { return b.length - a.length; });
  if (matching.length > 0) return matching[0];
  if (relDir === 'src') return 'src';
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

// Build file lookup with RELATIVE forward-slash keys
const fileLookup = {};
for (const f of files) {
  let normalized = f.replace(/\\/g, '/');
  // Make relative to cwd
  normalized = normalized.replace(/^.*?\/src\//, 'src/');
  normalized = normalized.replace(/\.(ts|js)$/g, '');
  fileLookup[normalized] = f;
  if (normalized.endsWith('/index')) {
    const parentDir = normalized.replace('/index', '');
    fileLookup[parentDir] = f;
  }
}

const cwd = process.cwd().replace(/\\/g, '/');

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
  const fromDir = path.dirname(fromFile).replace(/\\/g, '/');
  // Make fromDir relative to cwd
  const relFromDir = fromDir.replace(cwd + '/', '');
  
  let imp = importPath;
  if (imp.endsWith('.js')) {
    imp = imp.slice(0, -3);
  }
  let resolved;
  if (imp.startsWith('.')) {
    resolved = path.resolve(relFromDir, imp).replace(/\\/g, '/');
  } else if (imp.startsWith('src/')) {
    resolved = imp;
  } else {
    return null;
  }
  
  // Normalize to relative
  resolved = resolved.replace(/^.*?\/src\//, 'src/');
  
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
for (const mod of modsFwd) {
  importsFrom[mod] = new Set();
  importedBy[mod] = new Set();
}
importsFrom['src'] = new Set();
importedBy['src'] = new Set();

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
  .filter(function(e) { return e[1].size > 0; })
  .sort(function(a,b) { return b[1].size - a[1].size; });
for (const e of sortedByImported) {
  console.log(e[0] + ': ' + e[1].size + ' modules - [' + Array.from(e[1]).sort().join(', ') + ']');
}
// Also show all without filter to see any
console.log('\n(all modules)');
for (const e of Object.entries(importedBy)) {
  if (e[1].size > 0) console.log(e[0] + ': ' + e[1].size + ' - ' + Array.from(e[1]).join(', '));
}

console.log('\n=== MODULE IMPORTS-FROM COUNTS ===');
const sortedByImport = Object.entries(importsFrom)
  .filter(function(e) { return e[1].size > 0; })
  .sort(function(a,b) { return b[1].size - a[1].size; });
for (const e of sortedByImport) {
  console.log(e[0] + ': ' + e[1].size + ' modules - [' + Array.from(e[1]).sort().join(', ') + ']');
}

console.log('\n=== POTENTIAL CIRCULAR DEPENDENCIES ===');
const allMods = ['src'].concat(modsFwd);
for (let i = 0; i < allMods.length; i++) {
  for (let j = i+1; j < allMods.length; j++) {
    if (importedBy[allMods[i]] && importedBy[allMods[j]]) {
      if (importedBy[allMods[i]].has(allMods[j]) && importedBy[allMods[j]].has(allMods[i])) {
        console.log('CIRCULAR: ' + allMods[i] + ' <-> ' + allMods[j]);
      }
    }
  }
}

console.log('\n=== DETAILED CROSS-MODULE IMPORTS (file level) ===');
for (const f of files) {
  const fromMod = getModuleForFile(f);
  if (fileToModules[f].size > 0) {
    console.log(f + ' (in ' + fromMod + ') -> [' + Array.from(fileToModules[f]).sort().join(', ') + ']');
  }
}
