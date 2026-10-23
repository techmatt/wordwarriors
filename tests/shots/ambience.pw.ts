/**
 * Item 134's ambience picker: plays a battle in each candidate's arena
 * (`AMBIENCE_TRIALS`, `?ambience=<id>`), beside the arena's ambience now, and
 * records a few seconds of each as a looping WebP for conductor's picker page.
 * Not a test: run it with its own config,
 *   npm run shots -- ambience.pw
 * and it writes `scratch/arena_ambience_134/<arena>-<key>.webp` and the manifest
 * `scratch/arena_ambience_134.json` (one row per arena, `current` first).
 * Real time (clock 1), so the particles move at the game's speed.
 */

import { mkdirSync, writeFileSync } from 'node:fs';

import { test, type Page } from '@playwright/test';
import sharp from 'sharp';

import { AMBIENCE_TRIALS, ARENAS } from '../../content/battle/roster';
import { boot, until } from '../harness';

const NAME = 'arena_ambience_134';
const OUT = `scratch/${NAME}`;
/** Who fights where: the arena's own villain, and a friend from the other arena. */
const CAST: Record<string, string> = { nursery: 'villain=ellie&ally=rilla', street: 'villain=rilla&ally=ellie' };
/** Seconds of battle before recording, so the particles fill the screen and the VS splash is gone. */
const FILL = 13;
const FRAMES = 36;
const WIDTH = 960;

mkdirSync(OUT, { recursive: true });

const arenas = [...new Set(Object.values(AMBIENCE_TRIALS).map((t) => t.arena))];

/** `FRAMES` shots of the game, as one looping WebP, each frame shown as long as it took to take. */
async function record(page: Page, file: string): Promise<void> {
  const canvas = page.locator('canvas');
  const frames: Buffer[] = [];
  const delay: number[] = [];
  let last = Date.now();
  for (let i = 0; i < FRAMES; i++) {
    frames.push(await sharp(await canvas.screenshot({ type: 'jpeg', quality: 85 })).resize(WIDTH).png().toBuffer());
    const now = Date.now();
    delay.push(Math.max(40, now - last));
    last = now;
  }
  await sharp(frames, { join: { animated: true } }).webp({ quality: 70, loop: 0, delay }).toFile(file);
}

const rows: { id: string; label: string; note: string; options: { key: string; image: string; label?: string }[] }[] = [];

for (const arena of arenas) {
  const options: { key: string; trial?: string; label?: string }[] = [
    { key: 'current', label: "the game's now (the meadow's sparkles)" },
    ...Object.entries(AMBIENCE_TRIALS)
      .filter(([, t]) => t.arena === arena)
      .map(([id, t]) => ({ key: id.slice(arena.length + 1), trial: id, label: t.label })),
  ];
  for (const o of options) {
    test(`${arena} ${o.key}`, async ({ page }) => {
      test.setTimeout(90_000);
      await boot(page, `?scene=battle&part=1&fight=brawl&${CAST[arena]}${o.trial ? `&ambience=${o.trial}` : ''}`, 1);
      await until(page, (s) => s.scene === 'Battle', 30_000, 'the battle');
      await page.waitForTimeout(FILL * 1000);
      await record(page, `${OUT}/${arena}-${o.key}.webp`);
    });
  }
  rows.push({
    id: arena,
    label: `${ARENAS[arena]!.name} (${arena}): its battle ambience`,
    note: `Each tile is a few seconds of a real Part 1 brawl in this arena (${CAST[arena]}). \`current\` is what the game plays now, the meadow's sparkles; a number is AMBIENCE_TRIALS ${arena}_<number>, ?ambience=${arena}_<number> in any battle URL.`,
    options: options.map((o) => ({ key: o.key, image: `${NAME}/${arena}-${o.key}.webp`, ...(o.label ? { label: o.label } : {}) })),
  });
}

test.afterAll(() => {
  const manifest = {
    name: NAME,
    title: 'Arena ambience: Giant Playroom and Sunny Street',
    intro:
      "Item 134. Both arenas had the meadow's sparkles by fallback. One row per arena: `current` keeps them; a number makes that candidate the arena's ambience (a later prompt copies it into ARENAS). The tiles play: open one full size to watch it.",
    rows,
  };
  writeFileSync(`scratch/${NAME}.json`, `${JSON.stringify(manifest, null, 2)}\n`);
});
