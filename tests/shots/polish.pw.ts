/**
 * Battle polish shots (item 034): plays both battles for a few casts in each
 * fight style and shoots the arena on a timer and at each new phase, so
 * overlaps, banners over bubbles and the bag reveal can be judged by eye.
 * Not a test: run it with its own config,
 *   SHOTS_TAG=<tag> npm run shots -- polish.pw
 * and it writes `polish_034/<SHOTS_TAG>/<cast>_p<part>_<n>_<what>.png` in the scratch home (`tools/scratch.ts`)
 * and each battle's voice history (`<cast>_p<part>_voice.json`), where a line
 * said twice in a row shows up as `twice`. `-g <cast>` for one cast; WW_SPEED
 * sets the clock (default 2).
 */

import { mkdirSync, writeFileSync } from 'node:fs';

import { test, type Page } from '@playwright/test';

import { scratchPath } from '../../tools/scratch';
import { boot, leaveBedroom, playBattle, state, until, VOICE } from '../harness';

// Item 083: real voice, so a shot catches the line and its caption.
VOICE.mode = 'real';

const TAG = process.env.SHOTS_TAG ?? 'now';
const OUT = scratchPath('polish_034', TAG);
const SPEED = Number(process.env.WW_SPEED ?? 2);
mkdirSync(OUT, { recursive: true });

const CASTS: { name: string; query: string }[] = [
  { name: 'brawl_tiamat_scar', query: 'villain=tiamat&ally=scar&fight=brawl' },
  { name: 'brawl_rilla_lifter', query: 'villain=rilla&ally=dada_matt_lifter&fight=brawl' },
  { name: 'race_smaug_lifter', query: 'villain=smaug&ally=dada_matt_lifter&fight=sky_race' },
  { name: 'tug_jormungandr_warlock', query: 'villain=jormungandr&ally=dada_jason_warlock&fight=sea_tug' },
  { name: 'clash_bavmorda_scar', query: 'villain=bavmorda&ally=scar&fight=spell_clash' },
  { name: 'clash_bavmorda_lifter', query: 'villain=bavmorda&ally=dada_matt_lifter&fight=spell_clash' },
  { name: 'cook_tiamat_chef', query: 'villain=tiamat&ally=dada_jason&fight=cook_off' },
  { name: 'cook_ozymandias_blade', query: 'villain=ozymandias&ally=dada_matt_blade&fight=cook_off' },
  // Hunt 7 (item 116): item 115's fights with item 111 and 114's allies, and the story fight.
  { name: 'frost_elsa_seraphina', query: 'villain=elsa&ally=seraphina&fight=frost_clash' },
  { name: 'space_ozymandias_anna', query: 'villain=ozymandias&ally=anna&fight=space_race' },
  { name: 'magic_moriarty_rilla', query: 'villain=moriarty&ally=rilla&fight=magic_show' },
  { name: 'story_smaug_jasmine', query: 'ally=jasmine&fight=smaug_story' },
  // Hunt 7, M35: Moriarty as ally, 1.3 tall beside her and Dad.
  { name: 'ally_moriarty_tiamat', query: 'villain=tiamat&ally=moriarty' },
];

/** Shoot every `every` ms and at each new phase until stopped. */
function sampler(page: Page, prefix: string, every = 1500): { stop(): Promise<string[]> } {
  let running = true;
  let n = 0;
  let phase = '';
  let last = 0;
  let history: string[] = [];
  const loop = (async () => {
    while (running) {
      const s = await state(page).catch(() => null);
      if (s?.voice.history) history = s.voice.history;
      const p = s?.battle?.phase ?? '';
      const now = Date.now();
      if (s?.scene === 'Battle' && (p !== phase || now - last > every)) {
        const what = p !== phase ? `phase_${p}` : p;
        phase = p;
        last = now;
        n++;
        await page.screenshot({ path: `${OUT}/${prefix}_${String(n).padStart(3, '0')}_${what}.png` }).catch(() => undefined);
      }
      await page.waitForTimeout(100);
    }
  })();
  return {
    async stop() {
      running = false;
      await loop;
      return history;
    },
  };
}

// The dads' height beside her outside battles: the victory scene, the hub, the entry hall.
for (const ally of ['dada_matt_lifter', 'dada_jason_warlock']) {
  test(`heights_${ally}`, async ({ page }) => {
    test.setTimeout(240_000);
    await boot(page, `?scene=victory&ally=${ally}&villain=smaug&nojourney=1&read=bed`, SPEED);
    await until(page, (s) => s.scene === 'Ending' && Boolean(s.ending), 60_000, 'the victory scene');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/heights_${ally}_ending.png` });
    await boot(page, `?scene=house&ally=${ally}&villain=smaug&nojourney=1`, SPEED);
    await until(page, (s) => s.scene === 'Hub', 60_000, 'the hub');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/heights_${ally}_hub.png` });
    await boot(page, `?scene=bedroom&ally=${ally}&villain=smaug&nojourney=1`, SPEED);
    await until(page, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door', 120_000, 'bedroom door open');
    await page.screenshot({ path: `${OUT}/heights_${ally}_bedroom.png` });
    await leaveBedroom(page, { grab: false });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/heights_${ally}_entry.png` });
  });
}

// Evil Bavmorda's Pig Curse with warlock Dada Jason (a PIG pad) as ally: called out without saying PIG.
test('pig_callout', async ({ page }) => {
  test.setTimeout(600_000);
  const said: string[] = [];
  for (const part of [1, 2]) {
    await boot(page, `?scene=battle&part=${part}&villain=bavmorda&ally=dada_jason_warlock&fight=spell_clash&nojourney=1`, SPEED);
    await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle), 60_000, 'the battle');
    const rec = sampler(page, `pig_p${part}`, 4000);
    await playBattle(page, part);
    for (const id of await rec.stop()) if (id.includes('pig')) said.push(`p${part} ${id}`);
  }
  writeFileSync(`${OUT}/pig_callout.json`, JSON.stringify({ said }, null, 1));
});

for (const cast of CASTS) {
  test(`${cast.name}`, async ({ page }) => {
    test.setTimeout(900_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const part of [1, 2]) {
      await boot(page, `?scene=battle&part=${part}&${cast.query}&nojourney=1`, SPEED);
      const prefix = `${cast.name}_p${part}`;
      await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle), 60_000, 'the battle');
      const rec = sampler(page, prefix);
      await playBattle(page, part);
      const history = await rec.stop();
      const twice = history.filter((id, i) => i > 0 && history[i - 1] === id);
      writeFileSync(`${OUT}/${prefix}_voice.json`, JSON.stringify({ twice, errors, history }, null, 1));
    }
  });
}
