/**
 * Contact sheets of a `polish.pw.ts` run (item 034), one per battle:
 *   npx tsx tests/shots/contact.ts <tag> [filter]
 * reads `polish_034/<tag>/<cast>_p<part>_<n>_<what>.png` in the scratch home (`tools/scratch.ts`) and writes
 * `polish_034/<tag>_sheets/<cast>_p<part>.png`, six shots a row at a
 * quarter size, each numbered so a frame can be opened full size.
 */

import { mkdirSync, readdirSync } from 'node:fs';

import { scratchPath } from '../../tools/scratch';
import { contactSheet } from '../sheets';

const [tag = 'before', filter = ''] = process.argv.slice(2);
const dir = scratchPath('polish_034', tag);
const out = scratchPath('polish_034', `${tag}_sheets`);
mkdirSync(out, { recursive: true });

const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f.includes(filter));
const groups = new Map<string, string[]>();
for (const f of files) {
  const m = /^(.*_p\d)_\d{3}_/.exec(f);
  if (!m) continue;
  groups.set(m[1]!, [...(groups.get(m[1]!) ?? []), f]);
}

for (const [name, list] of groups) {
  list.sort();
  await contactSheet(list, dir, `${out}/${name}.png`, (f) => f.slice(name.length + 1, -4), { x: 4, y: 14, size: 13 });
  console.log(`${out}/${name}.png (${list.length})`);
}
