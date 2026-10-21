/**
 * Item 060: free play. Wherever she is free to move and no answer is open,
 * green jumps and blue / red / yellow cast (a tap one shot, a hold one big
 * charged shot), capped live shots; a button with a meaning in the scene (a
 * door in reach) keeps it; dad lock silences it all; an open answer (the
 * entry hall's find, a battle's move choice) closes it; in a battle the
 * shots are pure show and the fight carries on.
 *
 * Read through `state().play` (`src/fx/freePlay.ts`'s `playStats`, reset by
 * each scene's FreePlay): jumps, shots, big, live, maxLive.
 */

import { test, expect, type Page } from '@playwright/test';

import { FREE_PLAY, REACH } from '../src/config';
import { SLOW, boot, collectErrors, expectNoErrors, press, stick, until, walkTo, state, type WWState } from './harness';

interface Play {
  jumps: number;
  shots: number;
  big: number;
  live: number;
  maxLive: number;
}

const play = async (page: Page): Promise<Play> => ((await state(page)) as WWState & { play: Play }).play;

const input = (page: Page, fn: 'hold' | 'release', b?: string) =>
  page.evaluate(([f, btn]) => {
    const i = (window as unknown as { __ww: { input: { hold(b: string): void; release(): void } } }).__ww.input;
    if (f === 'hold') i.hold(btn!);
    else i.release();
  }, [fn, b] as const);

const setDadLock = (page: Page, on: boolean) => page.evaluate((v) => (window as unknown as { __ww: { dadLock(on?: boolean): boolean } }).__ww.dadLock(v), on);

/** Wait until play's counters satisfy `pred` (a few frames at most). */
async function untilPlay(page: Page, pred: (p: Play) => boolean, what: string, timeout = 5_000): Promise<Play> {
  const s = await until(page, (st) => pred((st as WWState & { play: Play }).play), timeout, what);
  return (s as WWState & { play: Play }).play;
}

/** Give the game a few frames to act on whatever was pressed. */
const frames = (page: Page) => page.waitForTimeout(400);

/** Nearest spot's distance from her. */
function nearest(s: WWState): { d: number; x: number; y: number } {
  const p = s.room!.player;
  let best = { d: Infinity, x: p.x, y: p.y };
  for (const sp of s.room!.spots) {
    const d = Math.hypot(sp.x - p.x, sp.y - p.y);
    if (d < best.d) best = { d, x: sp.x, y: sp.y };
  }
  return best;
}

/** Walk her clear of every spot, so green has nothing to choose. */
async function walkClear(page: Page): Promise<void> {
  const dirs = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < 40; i++) {
    const s = await state(page);
    const n = nearest(s);
    if (n.d > REACH + 40) break;
    const p = s.room!.player;
    // Away from the nearest spot; when stuck against a wall, try a side step.
    const [ox, oy] = dirs[Math.floor(i / 6) % dirs.length]!;
    let dx = p.x - n.x + ox * 200;
    let dy = p.y - n.y + oy * 200;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    await stick(page, dx, dy);
    await page.waitForTimeout(120);
  }
  await stick(page, 0, 0);
  await page.waitForTimeout(80);
  const end = await state(page);
  expect(nearest(end).d, 'walked clear of every spot').toBeGreaterThan(REACH);
}

/** The hub, part 2: one spot (the attic door), quiet, nothing asked. */
async function hub(page: Page, speed?: number): Promise<WWState> {
  await boot(page, '?scene=house&part=2&nojourney=1', speed);
  return until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:secret' && !s.room.locked, 60_000, 'hub part 2 open');
}

test('hub: blue taps a shot, a held red fires a big one, green away from spots jumps', async ({ page }) => {
  const errors = collectErrors(page);
  await hub(page);
  await walkClear(page);
  const p0 = await play(page);

  await press(page, 'blue');
  const p1 = await untilPlay(page, (p) => p.shots > p0.shots, 'blue fired');
  expect(p1.big).toBe(p0.big);

  // Hold red well past chargeMs (game time runs SPEED times fast), then let go.
  await input(page, 'hold', 'red');
  await page.waitForTimeout(FREE_PLAY.fullChargeMs);
  await input(page, 'release');
  const p2 = await untilPlay(page, (p) => p.big > p1.big, 'charged red fired big');
  expect(p2.shots).toBeGreaterThan(p1.shots);

  await press(page, 'green');
  const p3 = await untilPlay(page, (p) => p.jumps > p2.jumps, 'green jumped');
  // Still in the hub: green chose nothing.
  expect((await state(page)).scene).toBe('Hub');
  expect(p3.jumps).toBe(p2.jumps + 1);
  expectNoErrors(errors);
});

test('hub: thirty blue presses never put more than the cap of shots on screen', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  // Real time, so the shots stay up long enough to pile against the cap.
  await hub(page, 1);
  const p0 = await play(page);
  for (let i = 0; i < 30; i++) await press(page, 'blue');
  const p = await untilPlay(page, (q) => q.shots >= p0.shots + 10, 'the presses fired', 10_000);
  await frames(page);
  const end = await play(page);
  expect(end.maxLive).toBeGreaterThan(1);
  expect(end.maxLive).toBeLessThanOrEqual(FREE_PLAY.maxShots);
  expect(end.live).toBeLessThanOrEqual(FREE_PLAY.maxShots);
  expect(p.big).toBe(p0.big);
  expectNoErrors(errors);
});

test('hub: with the door in reach, green chooses the door and does not jump', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  const s = await hub(page);
  const door = s.room!.spots.find((sp) => sp.id === 'door_counter')!;
  expect(door).toBeTruthy();
  await walkTo(page, door.x, door.y + 12);
  await until(page, (st) => Boolean(st.room && !st.room.locked), 30_000, 'room unlocked');
  const before = await play(page);
  await press(page, 'green');
  // The press lands within a frame or two: the door is taken (the room locks or the scene goes).
  const after = await until(page, (st) => st.scene !== 'Hub' || Boolean(st.room?.locked) || !st.room?.spots.some((sp) => sp.id === 'door_counter'), 10_000, 'door taken');
  if (after.scene === 'Hub') expect((after as WWState & { play: Play }).play.jumps).toBe(before.jumps);
  await until(page, (st) => st.scene !== 'Hub', 30_000, 'through the attic door');
  expectNoErrors(errors);
});

test('dad lock: blue, red and green do nothing in play until it is off again', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await hub(page);
  await walkClear(page);
  await setDadLock(page, true);
  const p0 = await play(page);
  for (const b of ['blue', 'green', 'red', 'yellow', 'blue', 'green']) await press(page, b);
  await input(page, 'hold', 'red');
  await page.waitForTimeout(FREE_PLAY.fullChargeMs);
  await input(page, 'release');
  await frames(page);
  const p1 = await play(page);
  expect(p1.shots).toBe(p0.shots);
  expect(p1.big).toBe(p0.big);
  expect(p1.jumps).toBe(p0.jumps);
  expect((await state(page)).scene).toBe('Hub');

  await setDadLock(page, false);
  await press(page, 'blue');
  await untilPlay(page, (p) => p.shots > p0.shots, 'blue fires once unlocked');
  expectNoErrors(errors);
});

test('an open answer closes play: blue fires nothing while the entry hall waits for her pick', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=grab&nojourney=1');
  const s = await until(page, (st) => st.scene === 'Entry' && st.room?.round === 'entry:find' && !st.room.locked, 60_000, 'clue given');
  const p0 = (s as WWState & { play: Play }).play;
  for (let i = 0; i < 4; i++) {
    await press(page, 'blue');
    await page.waitForTimeout(60);
  }
  await press(page, 'red');
  await frames(page);
  const now = await state(page);
  // Only meaningful while the find is still open.
  expect(now.room?.round).toBe('entry:find');
  const p1 = (now as WWState & { play: Play }).play;
  expect(p1.shots).toBe(p0.shots);
  expect(p1.big).toBe(p0.big);
  // Nothing was picked by it either.
  expect(now.room?.grab?.misses).toBe(0);
  expectNoErrors(errors);
});

test('battle: blue fires in the fight and the fight carries on; in a move choice blue fires nothing', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&nojourney=1');
  await until(page, (st) => st.battle?.phase === 'fight' && !st.battle.choice, 90_000, 'fight phase');

  // Cast in the fight: retry while the phase holds (a combo or choice may cut in).
  let fired: (WWState & { play: Play }) | null = null;
  for (let i = 0; i < 20 && !fired; i++) {
    const before = (await state(page)) as WWState & { play: Play };
    if (before.battle?.phase !== 'fight' || before.battle.choice) {
      await until(page, (st) => st.battle?.phase === 'fight' && !st.battle.choice, 60_000, 'back in the fight');
      continue;
    }
    await press(page, 'blue');
    fired = await until(page, (st) => (st as WWState & { play: Play }).play.shots > before.play.shots, 1_500, 'blue fired in the fight')
      .then((st) => st as WWState & { play: Play })
      .catch(() => null);
  }
  expect(fired, 'blue fired during the fight').not.toBeNull();
  const t0 = fired!.battle!.t;
  const picks0 = fired!.battle!.movePicks;
  const items0 = fired!.battle!.itemsUsed;
  // A big one too, then the fight runs on: clock moving, still the battle, no picks or items from a shot.
  await input(page, 'hold', 'yellow');
  await page.waitForTimeout(FREE_PLAY.fullChargeMs);
  await input(page, 'release');
  const later = await until(page, (st) => st.scene !== 'Battle' || (st.battle?.t ?? 0) > t0 + 1, 30_000, 'the fight carries on');
  expect(later.scene).toBe('Battle');
  expect(later.battle!.movePicks).toBe(picks0);
  expect(later.battle!.itemsUsed).toBeGreaterThanOrEqual(items0);
  for (const f of [...later.battle!.heroes, ...later.battle!.villains]) expect(Number.isFinite(f.hp)).toBe(true);

  // The move choice: blue fires nothing, the choice stays open and unanswered.
  const open = await until(page, (st) => Boolean(st.battle?.choice?.open), 120_000, 'move choice open');
  const c0 = open as WWState & { play: Play };
  for (let i = 0; i < 3; i++) {
    await press(page, 'blue');
    await page.waitForTimeout(80);
  }
  await frames(page);
  const during = (await state(page)) as WWState & { play: Play };
  expect(during.battle?.choice, 'still choosing').toBeTruthy();
  expect(during.play.shots).toBe(c0.play.shots);
  expect(during.battle!.choice!.misses).toBe(c0.battle!.choice!.misses);
  expect(during.battle!.movePicks).toBe(c0.battle!.movePicks);
  expectNoErrors(errors);
});
