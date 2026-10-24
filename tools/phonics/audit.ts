/**
 * `npm run bank:audit` (item 056): the word bank's coverage table, every row
 * with its familiar pictured words and target; `--gaps` prints only the rows
 * under target. The rule is COVERAGE in content/phonics/bank.ts.
 */

import { coverageGaps, coverageRows, trioGroups } from '../../src/rules/bankAudit.js';

const gapsOnly = process.argv.includes('--gaps');
// What counts as a gap is bankAudit's, the coverage unit test's too.
const gapRows = coverageGaps();
const rows = gapsOnly ? gapRows : coverageRows();
for (const r of rows) {
  const mark = r.words.length < r.target ? 'GAP' : 'ok ';
  console.log(`${mark} ${r.tag.padEnd(16)} ${String(r.words.length).padStart(2)}/${r.target}  ${r.words.join(' ').toUpperCase()}${r.why ? `  (${r.why})` : ''}`);
}
if (!gapsOnly) {
  const trios = Object.entries(trioGroups()).filter(([, ws]) => ws.length >= 3);
  console.log(`\ntwo-sound trios at levels 1-2 (the bridge's best far bank): ${trios.map(([, ws]) => ws.join(' ').toUpperCase()).join(', ')}`);
}
console.log(`\n${gapRows.length} gap(s)`);
