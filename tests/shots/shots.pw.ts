/**
 * Screenshots of every non-battle scene where words are on screen (item 024),
 * for judging the dialogue UI by eye. Not a test: run it with its own config,
 *   npx playwright test --config tests/shots/shots.config.ts
 * and it writes `scratch/ui_shots/<SHOTS_TAG>/<cast>_<scene>_<n>_<line>.png`
 * (`-g bedroom` and the like for one scene).
 * A recorder polls the voice bus beside the walking helpers and shoots each
 * new line shortly after it starts, so the karaoke and the speaker are live.
 */

import { mkdirSync } from 'node:fs';

import { test, type Page } from '@playwright/test';

import { boot, choose, hubGo, press, readToKeyWord, state, until } from '../harness';

const TAG = process.env.SHOTS_TAG ?? 'now';
const OUT = `scratch/ui_shots/${TAG}`;
mkdirSync(OUT, { recursive: true });

const CASTS: { name: string; query: string }[] = [
  { name: 'default', query: '' },
  { name: 'noally', query: 'ally=none&villain=rilla' },
  { name: 'jason', query: 'ally=dada_jason&villain=ozymandias' },
  { name: 'anna', query: 'ally=anna&villain=smaug' },
];

/** Shoot each new line `delay` ms after it starts, at most `max` shots, until stopped. */
function recorder(page: Page, prefix: string, max = 10, delay = 700): { stop(): Promise<void> } {
  let running = true;
  const seen = new Set<string>();
  let n = 0;
  const loop = (async () => {
    while (running && n < max) {
      const s = await state(page).catch(() => null);
      const id = s?.voice.speaking;
      if (id && !seen.has(id) && !id.startsWith('letter_')) {
        seen.add(id);
        await page.waitForTimeout(delay);
        if (!running) break;
        n++;
        await page.screenshot({ path: `${OUT}/${prefix}_${String(n).padStart(2, '0')}_${id}.png` }).catch(() => undefined);
      }
      await page.waitForTimeout(80);
    }
  })();
  return {
    async stop() {
      running = false;
      await loop;
    },
  };
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

for (const cast of CASTS) {
  const q = (s: string) => `?${s}${cast.query ? `&${cast.query}` : ''}`;

  test(`${cast.name}: bedroom`, async ({ page }) => {
    await boot(page, q('scene=bedroom'), 2);
    // A short delay: the far-off taunt is a quick line.
    const rec = recorder(page, `${cast.name}_bedroom`, 10, 300);
    await until(page, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door', 120_000, 'door open');
    await rec.stop();
    await shot(page, `${cast.name}_bedroom_door`);
  });

  test(`${cast.name}: hub and a side room`, async ({ page }) => {
    await boot(page, q('scene=house&nojourney=1'), 2);
    const rec = recorder(page, `${cast.name}_hub`);
    await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 90_000, 'circle');
    await hubGo(page, 'circle');
    await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors', 90_000, 'doors');
    await rec.stop();
    await shot(page, `${cast.name}_hub_doors`);
    await hubGo(page, 'door_a');
    const room = recorder(page, `${cast.name}_room`);
    await until(page, (s) => s.scene === 'SentenceRoom' && s.room?.sentence?.pass === 'read' && !s.room.locked, 90_000, 'her turn');
    await shot(page, `${cast.name}_room_read`);
    await press(page, 'yellow');
    await page.waitForTimeout(900);
    await shot(page, `${cast.name}_room_yellow`);
    await readToKeyWord(page);
    await page.waitForTimeout(600);
    await shot(page, `${cast.name}_room_find`);
    await choose(page);
    await until(page, (s) => s.scene !== 'SentenceRoom', 60_000, 'out');
    await room.stop();
  });

  test(`${cast.name}: victory`, async ({ page }) => {
    // A few words read, so the recap has cards.
    await boot(page, q('scene=victory&nojourney=1&read=bed,hat,ice,zap'), 2);
    const rec = recorder(page, `${cast.name}_victory`, 8, 900);
    await until(page, (s) => s.scene === 'Victory', 30_000, 'victory');
    await page.waitForTimeout(16_000);
    await rec.stop();
    await shot(page, `${cast.name}_victory_end`);
  });
}

test('battle: taunts up to the first move choice', async ({ page }) => {
  await boot(page, '?scene=battle', 2);
  const rec = recorder(page, 'default_battle', 8, 400);
  await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle?.choice?.open), 90_000, 'the move choice');
  await page.waitForTimeout(600);
  await rec.stop();
  await shot(page, 'default_battle_choice');
});
