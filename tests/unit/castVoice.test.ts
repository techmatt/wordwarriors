/**
 * Item 150: Matt heard Jasmine's lines fail to load. Every cast member's voice
 * groups, the ones an episode with them in it loads (`episodeGroups`: narrator,
 * fighter, villain form, victory scene), are in the manifest, each line of them
 * composed (`lines.json`) is there under its own group, and every clip is on
 * disk and not empty. Skipped with no manifest (a fresh checkout before `voice:build`).
 * `npx tsx --test tests/unit/castVoice.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

import { PERSONS, ROSTER, personOf } from '../../content/battle/roster';
import { group } from '../../content/voice/ids';
import { composeLines } from '../../tools/voice/compose';

const MANIFEST = 'public/voice-gen/manifest.json';

test('every cast member: their voice groups are built, every line in them has its clip', { skip: !existsSync(MANIFEST) && 'no voice manifest' }, () => {
  const built = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { lines: { id: string; group: string; audio: string }[] }).lines;
  const byId = new Map(built.map((l) => [l.id, l]));
  const composed = composeLines();
  const groups = new Set<string>([group.core, group.phonics]);
  // Every roster id can fight on either side; a person narrates and stands in the victory scene (a dad as himself, whatever his form).
  for (const c of ROSTER) groups.add(group.fighter(c.id)).add(group.fighter(`${c.id}_evil`));
  for (const p of PERSONS) groups.add(group.narrator(personOf(p.id))).add(group.ending(personOf(p.id)));
  const missing: string[] = [];
  for (const g of groups) {
    const want = composed.filter((l) => l.group === g);
    if (!want.length) {
      // A hero-only form has no evil lines, and no villain form exists for her own outfits: only a group someone composes counts.
      continue;
    }
    for (const l of want) {
      const b = byId.get(l.id);
      if (!b) missing.push(`${l.id} (${g}) not built`);
      else if (b.group !== g) missing.push(`${l.id} built under ${b.group}, not ${g}`);
      else {
        const file = `public/${b.audio}`;
        if (!existsSync(file)) missing.push(`${l.id}: ${file} missing`);
        else if (statSync(file).size === 0) missing.push(`${l.id}: ${file} empty`);
      }
    }
  }
  assert.deepEqual(missing.slice(0, 20), [], `${missing.length} problems; npm run voice:build`);
  // The narrator groups are all there, Jasmine's among them.
  for (const p of PERSONS) assert.ok(composed.some((l) => l.group === group.narrator(personOf(p.id))), `${p.id} narrates`);
});
