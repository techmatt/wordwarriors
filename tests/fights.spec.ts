/**
 * Item 031: every fight style plays a battle through (item 083: one part each, alternating) with the episode's
 * shape kept: the part 1 ultimate still wins the round (heroes floored, then
 * they retreat), part 2's counter and finish still win, the move choices
 * still fire, and a contest takes about as long as the brawl. Screenshots
 * land in tests/screenshots/ (ignored) for a look. Hunt 10's clash rings in a move choice (item 161 moved it here).
 */

import { test, expect } from '@playwright/test';

import { FIGHTS } from '../content/battle/fights';
import { BATTLE_SPEED, SLOW, boot, collectErrors, expectFightLength, expectNoErrors, playBattle, shotIn, state, until } from './harness';
import { qaLayout } from './qa/probe';

/** Each style against a villain it was not written for, so nothing leans on one villain. */
const AGAINST: Record<string, string> = { brawl: 'tiamat', sky_race: 'smaug', sea_tug: 'jormungandr', spell_clash: 'bavmorda', cook_off: 'tiamat', frost_clash: 'elsa', space_race: 'ozymandias' };

/**
 * One battle part per style (item 083), the parts alternating across the styles: the race
 * plays part 2 (its finish line), the rope pull 1, the beam clash 2, the cook-off 1. Each
 * part keeps the shape checks; the brawl's both parts are every default episode's. Item
 * 115's contests each play their own villain: the frost clash 1, the space race 1.
 */
const PART: Record<string, 1 | 2> = { sky_race: 2, sea_tug: 1, spell_clash: 2, cook_off: 1, frost_clash: 1, space_race: 1 };

const shot = shotIn('fights');

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
// So is a brawl with its own id (item 115, Evil Moriarty's magic show): tests/villains.spec.ts
// plays his whole episode (booted straight into part 2, a brawl ran 44.5 s, under the 45 s floor then; the floor is 40 s since hunt 12).
// A story fight (item 107) is not a contest: tests/storyFight.spec.ts plays it.
for (const f of FIGHTS.filter((x) => x.kind !== 'brawl' && x.kind !== 'story')) {
  test(`${f.id}: battle ${PART[f.id] ?? 1} keeps the episode's shape`, SLOW, async ({ page }) => {
    test.setTimeout(600_000);
    // Page errors, art drawn before it loaded (on since item 090), and voice lines asked for that are not there.
    const problems = collectErrors(page, { voice: true });
    const villain = AGAINST[f.id] ?? 'tiamat';
    const part: 1 | 2 = PART[f.id] ?? 1;
    await boot(page, `?scene=battle&part=${part}&villain=${villain}&fight=${f.id}&nojourney=1`, BATTLE_SPEED);
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
    // The race's finish line is on the floor while the narrator names it (item 069: it came 3.5 s later).
    const flagged =
      f.id === 'sky_race' && part === 2
        ? until(page, (s) => s.scene !== 'Battle' || Boolean(s.voice.speaking?.endsWith('_fight_sky_race_finish')), 240_000, 'the finish line said').then(async (s) => {
            if (s.scene !== 'Battle') return true;
            // The battle's state is published once a frame and the voice's is live, so the line can
            // show a frame before the flag it raised (item 081: 1 run in 3 at clock speed 8-10); the
            // flag never comes down, and the line lasts well past a frame.
            await page.waitForTimeout(60);
            const now = await state(page);
            return now.scene !== 'Battle' || now.battle?.stage.flag === true;
          })
        : Promise.resolve(true);
    const end = await playBattle(page, part);
    await Promise.all(shots);
    expect(await flagged, 'the finish flag is up as the line names it').toBe(true);
    expect(end.battle?.ultimates).toBe(1);
    expect(end.battle?.movePicks).toBe(2);
    if (part === 1) expect(end.battle?.heroes.every((h) => h.status !== 'floored')).toBe(true);
    // About as long as the brawl (each part is ~70-80 s of simulation time there).
    expectFightLength(end);
    expect(problems).toEqual([]);
  });
}

// Moved from hunt10.spec.ts (item 161; hunt 10, fix 146).
test('a spell clash adds no rings at the clash point while a move choice is open (they pulsed over the pads)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&cast=default&fight=spell_clash&qa=1');
  await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle?.choice), 60_000, 'the first move choice');
  // At the clash point, not anywhere (hunt 11: the fight runs on at its slow clock through a choice, and a move's
  // ring at a fighter's feet, her ally's or the villain's, made this fail about one run in three).
  const clash = Number((await until(page, (s) => typeof s.battle?.stage.clash === 'number', 5_000, 'the clash point')).battle!.stage.clash);
  const atClash = async () =>
    (await qaLayout(page)).images.filter((im) => im.scene === 'Battle' && im.key === 'fx_ring' && Math.abs((im.b[0] + im.b[2]) / 2 - clash) < 120 && (im.b[1] + im.b[3]) / 2 < 560).length;
  // The rings from before it fade in under 2 s at the test clock, but on a busy lane one was still there
  // (item 161: "1 1 0 0 ..." in item 160's run): wait for them to go, then watch for new ones. After the
  // Before hunt 10's fix one came every 7.5 s of real time, so a fresh ring still shows in the samples.
  await expect.poll(atClash, { timeout: 10_000, intervals: [250] }).toBe(0);
  const counts: number[] = [];
  for (let i = 0; i < 12; i++) {
    counts.push(await atClash());
    await page.waitForTimeout(400);
  }
  expect((await until(page, () => true, 5_000, 'state')).battle?.choice, 'still choosing').toBeTruthy();
  expect(counts.filter((n) => n > 0), counts.join(' ')).toEqual([]);
  expectNoErrors(errors);
});
