/**
 * Item 031: every fight style plays both battles through with the episode's
 * shape kept: the part 1 ultimate still wins the round (heroes floored, then
 * they retreat), part 2's counter and finish still win, the move choices
 * still fire, and a contest takes about as long as the brawl. Screenshots
 * land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { FIGHTS } from '../content/battle/fights';
import { SLOW, boot, playBattle, until } from './harness';

/** Each style against a villain it was not written for, so nothing leans on one villain. */
const AGAINST: Record<string, string> = { brawl: 'tiamat', sky_race: 'smaug', sea_tug: 'jormungandr', spell_clash: 'bavmorda', cook_off: 'tiamat' };

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/fights_${name}.png` });

/** Page errors and voice lines asked for that are not there. */
function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (/^voice: (no line|could not decode)/.test(m.text())) problems.push(m.text());
  });
  return problems;
}

test('the cast draw picks the villain\'s own style; ?fight= fixes another', async ({ page }) => {
  // The style and its staging are made with the scene, so the versus intro need not play out.
  await boot(page, '?scene=battle&part=1&villain=smaug&nojourney=1');
  const race = await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle), 30_000, 'the race set up');
  expect(race.battle?.fight).toBe('sky_race');
  expect(typeof race.battle?.stage.lead).toBe('number');
  await boot(page, '?scene=battle&part=1&villain=smaug&fight=cook_off&nojourney=1');
  const cook = await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle), 30_000, 'the cook-off set up');
  expect(cook.battle?.fight).toBe('cook_off');
});

// The brawl is the default episode's style (Evil Tiamat has none of her own), so every
// default whole episode and smoke's Battle part 2 already play it with these checks,
// the length too (`expectFightLength` in playEpisode): only the contests are swept here.
for (const f of FIGHTS.filter((x) => x.id !== 'brawl')) {
  test(`${f.id}: both battles keep the episode's shape`, SLOW, async ({ page }) => {
    test.setTimeout(600_000);
    const problems = collectProblems(page);
    const villain = AGAINST[f.id] ?? 'tiamat';
    const times: number[] = [];
    for (const part of [1, 2]) {
      await boot(page, `?scene=battle&part=${part}&villain=${villain}&fight=${f.id}&nojourney=1`);
      const going = await until(page, (s) => s.scene === 'Battle' && (s.battle?.abilitiesFired ?? 0) >= 4, 60_000, `${f.id} part ${part} under way`);
      expect(going.battle?.fight).toBe(f.id);
      await shot(page, `${f.id}_${part}_a`);
      // Shots of the big beats, taken alongside the play (a move choice holds until answered).
      const watch = (phase: string, delay: number, name: string) =>
        until(page, (s) => s.scene !== 'Battle' || s.battle?.phase === phase, 240_000, phase)
          .then(async (s) => {
            if (s.scene !== 'Battle') return;
            await page.waitForTimeout(delay);
            await shot(page, `${f.id}_${part}_${name}`);
          })
          .catch(() => undefined);
      const shots = part === 1 ? [watch('combo', 400, 'combo'), watch('ultimate', 1400, 'ultimate')] : [watch('counter', 900, 'counter'), watch('finish', 1500, 'finish')];
      const end = await playBattle(page, part);
      await Promise.all(shots);
      expect(end.battle?.ultimates).toBe(1);
      expect(end.battle?.movePicks).toBe(2);
      if (part === 1) expect(end.battle?.heroes.every((h) => h.status !== 'floored')).toBe(true);
      times.push(end.battle?.t ?? 0);
    }
    // About as long as the brawl (each part is ~70-80 s of simulation time there).
    for (const t of times) expect(t).toBeGreaterThan(45);
    for (const t of times) expect(t).toBeLessThan(120);
    expect(problems).toEqual([]);
  });
}
