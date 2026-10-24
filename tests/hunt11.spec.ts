/**
 * Hunt 11 (item 142, docs/qa-findings.md): F9 in a battle once its opening fade-in was done (fix 145's guard
 * read the camera's finished fade-in as the closing fade, so the grown-ups page never opened from a fight).
 */

import { test, expect } from '@playwright/test';

import { collectErrors, boot, expectNoErrors, press, until, walkTo } from './harness';

test('F9 in a battle opens the grown-ups page, and F9 there comes back to the battle', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&cast=default&battle=short&qa=1');
  await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'the first move choice');
  await page.keyboard.press('F9');
  await until(page, (st) => st.scene === 'Parent', 20_000, 'the grown-ups page');
  await page.keyboard.press('F9');
  const back = await until(page, (st) => st.scene === 'Battle' && Boolean(st.battle), 30_000, 'back in the battle');
  expect(back.battle!.fading).toBe(false);
  expectNoErrors(errors);
});

// Hunt 11: MASK's copies of her stood through the move choice, one on a pad's ring under its sign.
test('her clones poof as a move choice opens', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&cast=default&fetched=mask,mask,mask&battle=short&qa=1');
  const before = await until(page, (st) => (st.battle?.heroClones ?? 0) > 0 || Boolean(st.battle?.choice?.open), 90_000, 'clones, or the choice');
  expect(before.battle!.heroClones, 'MASK made clones before the choice').toBeGreaterThan(0);
  const s = await until(page, (st) => Boolean(st.battle?.choice?.open), 90_000, 'the first move choice');
  expect(s.battle!.heroClones).toBe(0);
  expectNoErrors(errors);
});

// Hunt 11: in the sea tug's choice the serpent slid on under a sign (the stage easing him, a late bolt's knockback): a
// contest holds everyone but her where the pads were placed off them.
for (const [fight, villain] of [['sea_tug', 'jormungandr'], ['sky_race', 'smaug'], ['space_race', 'ozymandias'], ['spell_clash', 'bavmorda'], ['cook_off', 'tiamat']] as const) {
  test(`${fight}: everyone but her holds still through a move choice`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=battle&part=1&battle=short&villain=${villain}&fight=${fight}&nojourney=1&qa=1`);
    const open = await until(page, (st) => Boolean(st.battle?.choice?.open && st.battle.choice.villain), 90_000, 'the first move choice');
    await page.waitForTimeout(3000);
    const later = await until(page, (st) => Boolean(st.battle?.choice?.open), 5_000, 'still choosing');
    // Each body's middle (a squash on the beat may change its width).
    const mid = (b: number[]) => Math.round((b[0]! + b[2]!) / 2);
    const [a, b] = [mid(open.battle!.choice!.villain!), mid(later.battle!.choice!.villain!)];
    expect(Math.abs(a - b), `the villain from ${a} to ${b}`).toBeLessThan(4);
    for (const m of open.battle!.choice!.team) {
      const n = later.battle!.choice!.team.find((t) => t.id === m.id);
      if (n) expect(Math.abs(mid(m.box) - mid(n.box)), `${m.id} from ${mid(m.box)} to ${mid(n.box)}`).toBeLessThan(4);
    }
    expectNoErrors(errors);
  });
}

// Hunt 11: out of debug mode by the debug room's door from the attic, house part 2's whole arrival played again
// ("That was close! We need a plan!", the secret door popping in) with her back at the front door.
test("out of debug mode from the attic: back at the secret door, part 2's arrival not played again", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=counter&nojourney=1&qa=1');
  await until(page, (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.player), 60_000, 'the attic');
  await page.keyboard.press('0');
  const s = await until(page, (st) => st.scene === 'Debug' && (st.room?.spots.length ?? 0) > 0, 30_000, 'debug room');
  const door = s.room!.spots.find((sp) => sp.id === 'debug:door')!;
  await walkTo(page, door.x, door.y + 12);
  await press(page, 'green');
  const hub = await until(page, (st) => st.scene === 'Hub' && Boolean(st.room?.spots.some((sp) => sp.id === 'door_counter')), 30_000, 'the hub');
  const said = hub.voice.history.length;
  await page.waitForTimeout(1500);
  const after = await until(page, () => true, 5_000, 'state');
  expect(after.voice.history.slice(said).filter((id) => /_retreat_2$|_secret_door/.test(id)), 'no arrival lines').toEqual([]);
  const p = after.room!.player;
  const d = after.room!.spots.find((sp) => sp.id === 'door_counter')!;
  expect(Math.hypot(p.x - d.x, p.y - d.y), 'at the secret door').toBeLessThan(220);
  expectNoErrors(errors);
});

// Hunt 11: before any scene's Controls exist (Boot, Wait), F1's help, F3's find bar and F7's caret browsing were
// the browser's; the game keeps those, the menu key and quick find (not its own dev keys, which Controls takes).
test("the browser's own keys are the game's from the first frame", async ({ page }) => {
  await boot(page, '?scene=house&nojourney=1');
  await until(page, (st) => st.scene === 'Hub' && Boolean(st.room?.player), 30_000, 'hub');
  const kept = await page.evaluate(() =>
    ['F1', 'F3', 'F7', 'F10', 'ContextMenu', '/', 'F5', 'F12'].map((key) => {
      const e = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
      window.dispatchEvent(e);
      return [key, e.defaultPrevented];
    }),
  );
  expect(Object.fromEntries(kept)).toEqual({ F1: true, F3: true, F7: true, F10: true, ContextMenu: true, '/': true, F5: false, F12: false });
  // F9 (a dev key) is still the game's: Phaser drops a key event whose default is already prevented.
  await page.keyboard.press('F9');
  await until(page, (st) => st.scene === 'Parent', 10_000, 'F9 opens the grown-ups page');
});

// Hunt 11: Tab is the keyboard's yellow, but the page's own Tab guard (Boot and Wait, item 069) prevented its
// default in the capture phase, and Phaser drops a key event whose default is already prevented: Tab did nothing.
test('Tab is yellow: it says the instruction again', async ({ page }) => {
  await boot(page, '?scene=room&slot=a&nojourney=1');
  const s = await until(page, (st) => st.scene === 'SentenceRoom' && st.room?.sentence?.pass === 'read' && !st.room.locked, 60_000, 'read pass');
  const n = s.voice.history.length;
  // Held a moment, as a finger does (an instant press can come and go between two frames).
  await page.keyboard.down('Tab');
  await page.waitForTimeout(120);
  await page.keyboard.up('Tab');
  const after = await until(page, (st) => st.voice.history.length > n, 2_500, 'a line after Tab');
  expect(after.voice.history.slice(n).some((id) => id.includes('room_your_turn') || id.includes('room_'))).toBe(true);
});
