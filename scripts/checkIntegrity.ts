import { integrityCheck } from '../src/integrityCheck.js';

async function main() {
  const r = await integrityCheck({ dataDir: 'data/trial_p7a' });
  console.log(JSON.stringify(r.summary, null, 2));
}

main();
