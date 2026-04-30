const fs = require('fs');
const path = require('path');

// Check if anything in src/ still imports from hash.ts (the old module)
const files = [];
function walk(dir) {
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(p);
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) files.push(p);
  }
}
walk('src');

for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  if (content.includes('from "./hash.js"') || content.includes("from './hash.js'") ||
      content.includes('from "../hash.js"') || content.includes("from '../hash.js'") ||
      content.includes('from "../../hash.js"') || content.includes("from '../../hash.js'") ||
      content.includes('from "../../../hash.js"') || content.includes("from '../../../hash.js'") ||
      content.includes('from "./hash"') || content.includes("from './hash'") ||
      content.includes('from "../hash"') || content.includes("from '../hash'")) {
    console.log(f);
  }
}
