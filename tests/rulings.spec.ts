/**
 * Matt's rulings on the bug hunt's design calls (item 043; docs/qa-findings.md,
 * "Matt's calls"): M1, M3-M6 in the running game. M2, the phonics voice's face,
 * is a unit test (tests/unit/cast.test.ts).
 */

import { test, expect } from '@playwright/test';
import { SLOW, boot, collectErrors, expectNoErrors, state, stick, texts, until } from './harness';

const overlap = (a: number[], b: number[]) => a[0]! < b[2]! && b[0]! < a[2]! && a[1]! < b[3]! && b[1]! < a[3]!;

test('M1, M5, M6: the move choice hides its word in the caption, shows the stick hint, and the team stands clear of the signs', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  // A brawl: Jason's fightNudge makes most of his fights a cook-off, whose staging holds the
  // team in place (teamStepBack skips contests), so M6's step-back is checked where it runs.
  await boot(page, '?scene=battle&part=1&ally=dada_jason&fight=brawl&nojourney=1');
  const s = await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'choice open');
  const c = s.battle!.choice!;
  // M1: the prompt has been captioned by now; the box never printed the right word.
  const all = await texts(page);
  const battleTexts = all.filter((t) => t.scene === 'Battle').map((t) => t.text);
  expect(battleTexts.some((t) => t.includes('…')), 'USE …! is in the caption').toBe(true);
  // The word stands on its pad's sign, once; nowhere else.
  expect(battleTexts.filter((t) => t === c.right.toUpperCase()).length).toBe(1);
  // M6: no teammate hidden behind the signs: clear of them where the floor allows,
  // and with three signs across the row, most of the body still shows.
  for (const m of c.team) {
    const area = (b: number[]) => Math.max(0, b[2]! - b[0]!) * Math.max(0, b[3]! - b[1]!);
    const under = c.signs.filter((sg) => overlap(m.box, sg)).reduce((n, sg) => n + area([Math.max(m.box[0]!, sg[0]!), Math.max(m.box[1]!, sg[1]!), Math.min(m.box[2]!, sg[2]!), Math.min(m.box[3]!, sg[3]!)]), 0);
    expect(under / area(m.box), `${m.id}: share of the body behind signs`).toBeLessThanOrEqual(0.3);
  }
  // M5: standing still brings the stick hint; walking clears it.
  const hinted = await until(page, (st) => Boolean(st.battle?.choice?.stickHint), 15_000, 'stick hint');
  expect(hinted.battle!.choice!.stickHint).toBe(true);
  await stick(page, 1, 0);
  await until(page, (st) => st.battle?.choice?.stickHint === false, 5_000, 'stick hint gone');
  await stick(page, 0, 0);
  expectNoErrors(errors);
});

// Item 071 (hunt 2's M7, M17): in a contest the team holds its stations, so the pads keep off them,
// and off the villain, on her side of him (the cook-off's Dada Jason was a third covered; the
// rope pull's third pad went past the serpent).
for (const [name, query] of [
  ['the cook-off, Dada Jason behind her', '?scene=battle&part=1&ally=dada_jason&fight=cook_off&nojourney=1'],
  ['the rope pull, Jormungandr', '?scene=battle&part=1&villain=jormungandr&fight=sea_tug&nojourney=1'],
] as const) {
  test(`M7, M17: ${name}: no sign covers a teammate or the villain, and the pads stay on her side`, SLOW, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, query);
    const s = await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'choice open');
    const c = s.battle!.choice!;
    const area = (b: number[]) => Math.max(0, b[2]! - b[0]!) * Math.max(0, b[3]! - b[1]!);
    const under = (box: number[]) => c.signs.reduce((n, sg) => n + area([Math.max(box[0]!, sg[0]!), Math.max(box[1]!, sg[1]!), Math.min(box[2]!, sg[2]!), Math.min(box[3]!, sg[3]!)]), 0) / area(box);
    for (const m of c.team) expect(under(m.box), `${m.id} behind the signs`).toBe(0);
    expect(c.villain, 'the villain stands').toBeTruthy();
    expect(under(c.villain!), 'the villain behind the signs').toBe(0);
    const me = s.battle!.me!;
    const vx = (c.villain![0]! + c.villain![2]!) / 2;
    for (const p of c.spots) expect(Math.sign(p.x - vx), `${p.word} on her side`).toBe(Math.sign(me.x - vx));
    expectNoErrors(errors);
  });
}

test('M3: she can walk while the hall gives its clue (green still waits)', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=grab&nojourney=1');
  const s = await until(page, (st) => st.scene === 'Entry' && Boolean(st.room?.locked) && st.voice.busy, 60_000, 'the hall talking');
  const x0 = s.room!.player.x;
  await stick(page, x0 > 640 ? -1 : 1, 0);
  const moved = await until(page, (st) => Math.abs(st.room!.player.x - x0) > 40, 5_000, 'she walks');
  await stick(page, 0, 0);
  expect(moved.room!.locked, 'still mid-line: green waits').toBe(true);
  expectNoErrors(errors);
});

test('M4: a long counter sentence reads on two rows at 56 px, not one small row', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=counter&villain=jormungandr&nojourney=1');
  const s = await until(page, (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence), 30_000, 'sentence room');
  await page.waitForTimeout(800);
  const all = (await texts(page)).filter((t) => t.scene === 'SentenceRoom');
  const name = all.find((t) => t.text === 'JORMUNGANDR')!;
  expect(name, 'the name on the banner').toBeTruthy();
  // A 56 px line of FONT_COMIC is about 70 px tall; 40 px was about 50.
  expect(name.bounds[3]! - name.bounds[1]!).toBeGreaterThanOrEqual(62);
  const tokens = s.room!.sentence!.tokens.slice(0, -1);
  const rows = new Set(all.filter((t) => tokens.includes(t.text)).map((t) => Math.round((t.bounds[1]! + t.bounds[3]!) / 20)));
  expect(rows.size).toBeLessThanOrEqual(2);
  expect((await state(page)).room).toBeTruthy();
  expectNoErrors(errors);
});
