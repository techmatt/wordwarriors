/**
 * Driving the game from Playwright through `window.__ww` only.
 *
 * Input goes through the virtual pad (`press`, `stick`), never the keyboard:
 * the keyboard's letters belong to spelling. Walking steers her character by
 * reading its position back each hop, like a child with a stick; the room
 * decides what is "near", so landing beside a spot is the same as for her.
 *
 * Patterns kept from Seraphina's harness: collect page errors and end every
 * test asserting none; wait for a state value `=== expected`, not just for one
 * being present; headless runs at 15–30 fps, so assert on state and counters,
 * never on displacement.
 */

import { expect, type Page } from '@playwright/test';

export interface WWState {
  scene: string;
  fps: number;
  step: { kind: string; part?: number; game?: string; what?: string };
  episode: { hero: string; ally: string | null; villain: string; made: Record<string, boolean> };
  room: {
    scene: string;
    round: string;
    locked: boolean;
    player: { x: number; y: number };
    spots: { id: string; x: number; y: number; correct: boolean | null }[];
    spelling?: { word: string; filled: number };
  } | null;
  battle: {
    part: number;
    phase: string;
    t: number;
    abilitiesFired: number;
    ultimates: number;
    combos: number;
    movePicks: number;
    minions: number;
    heroes: { id: string; hp: number; status: string | null }[];
    villains: { id: string; hp: number; status: string | null }[];
    choice: { words: string[]; colors: string[]; right: string; open: boolean } | null;
  } | null;
  voice: { speaking: string | null; busy: boolean; history: string[] };
  fx: Record<string, number>;
  progress: { sounds: Record<string, { seen: number; recent: boolean[] }>; words: Record<string, { seen: number; recent: boolean[] }>; episodes: number };
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Load the game with test hooks on (`?hooks=1` works in a production build too). */
export async function boot(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query ? `${query}&` : '?'}hooks=1`);
  await page.waitForFunction(() => Boolean((window as unknown as { __ww?: unknown }).__ww));
  await page.mouse.click(20, 20);
}

export function state(page: Page): Promise<WWState> {
  return page.evaluate(() => (window as unknown as { __ww: { state(): WWState } }).__ww.state());
}

export async function press(page: Page, button: string): Promise<void> {
  await page.evaluate((b) => (window as unknown as { __ww: { input: { press(b: string): void } } }).__ww.input.press(b), button);
}

export async function stick(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([sx, sy]) => (window as unknown as { __ww: { input: { stick(x: number, y: number): void } } }).__ww.input.stick(sx!, sy!), [x, y]);
}

export async function typeLetter(page: Page, letter: string): Promise<void> {
  await page.evaluate((l) => (window as unknown as { __ww: { type(l: string): boolean } }).__ww.type(l), letter);
}

/** Poll until `pred(state)` holds. */
export async function until(page: Page, pred: (s: WWState) => boolean, timeout = 60_000, what = 'condition'): Promise<WWState> {
  const start = Date.now();
  for (;;) {
    const s = await state(page);
    if (pred(s)) return s;
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${what}; scene=${s.scene} room=${JSON.stringify(s.room?.round)} battle=${s.battle?.phase}`);
    await page.waitForTimeout(100);
  }
}

/** Walk her character to (x, y) with the stick, re-aiming every hop. */
export async function walkTo(page: Page, x: number, y: number, close = 22): Promise<void> {
  const start = Date.now();
  let last = { x: NaN, y: NaN, at: Date.now() };
  for (;;) {
    const s = await state(page);
    const p = s.room?.player;
    if (!p) throw new Error(`no room to walk in (scene ${s.scene})`);
    const dx = x - p.x;
    const dy = y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < close) break;
    // Pressed against the edge of the floor and near enough: that is arrival.
    if (Math.hypot(p.x - last.x, p.y - last.y) > 1) last = { x: p.x, y: p.y, at: Date.now() };
    else if (Date.now() - last.at > 800 && d < 70) break;
    if (Date.now() - start > 20_000) throw new Error(`could not reach ${x},${y} from ${p.x},${p.y}`);
    // Slow down when close so a low frame rate does not overshoot.
    const k = d < 80 ? 0.35 : 1;
    await stick(page, (dx / d) * k, (dy / d) * k);
    await page.waitForTimeout(40);
  }
  await stick(page, 0, 0);
  await page.waitForTimeout(80);
}

/** Walk to a spot by id (or the correct one) and press green once the room is listening. */
export async function choose(page: Page, id?: string): Promise<string> {
  const s = await until(page, (st) => Boolean(st.room && !st.room.locked && st.room.spots.some((sp) => (id ? sp.id === id : sp.correct === true))), 90_000, `spot ${id ?? 'correct'}`);
  const spot = s.room!.spots.find((sp) => (id ? sp.id === id : sp.correct === true))!;
  await walkTo(page, spot.x, spot.y + 12);
  await until(page, (st) => Boolean(st.room && !st.room.locked), 30_000, 'room unlocked');
  await press(page, 'green');
  return spot.id;
}

/** Answer every item of the current minigame correctly until the scene changes. */
export async function playMinigame(page: Page): Promise<void> {
  // Past the journey map (if any) and into the game itself.
  const scene = (await until(page, (st) => ['SoundToLetter', 'BlendPath', 'WordToPicture', 'Spelling'].includes(st.scene), 60_000, 'a minigame')).scene;
  for (let guard = 0; guard < 12; guard++) {
    // Blend Path's doors stay shut until the tiles are walked, so there a
    // round being up (and the room listening) is enough to start walking.
    const s = await until(
      page,
      (st) => st.scene !== scene || Boolean(st.room && !st.room.locked && (st.room.spots.some((sp) => sp.correct) || st.room.spelling || (scene === 'BlendPath' && st.room.round))),
      120_000,
      `${scene} item`,
    );
    if (s.scene !== scene) return;
    if (s.room?.spelling) {
      const { word, filled } = s.room.spelling;
      for (const ch of word.slice(filled)) {
        await typeLetter(page, ch);
        await page.waitForTimeout(120);
      }
      await until(page, (st) => st.scene !== scene || st.room?.spelling?.word !== word || st.room.spelling.filled === 0, 60_000, 'next spelling word');
      continue;
    }
    const round = s.room!.round;
    // Blend Path doors open only after every tile is stepped on.
    if (scene === 'BlendPath') {
      const tiles = round.split(':')[2]!.length;
      for (let i = 0; i < tiles; i++) await walkTo(page, 260 + i * 160, 470, 30);
    }
    await choose(page);
    await until(page, (st) => st.scene !== scene || st.room?.round !== round, 60_000, `${scene} round after ${round}`);
  }
}

/** Play a battle part, answering each move choice; `wrongFirst` picks a wrong dot the first time. */
export async function playBattle(page: Page, part: number, wrongFirst = false): Promise<WWState> {
  let first = true;
  for (;;) {
    const s = await until(page, (st) => st.scene !== 'Battle' || Boolean(st.battle?.choice), 180_000, `battle ${part} choice or end`);
    if (s.scene !== 'Battle') return s;
    const open = await until(page, (st) => st.scene !== 'Battle' || Boolean(st.battle?.choice?.open), 60_000, 'choice open');
    const c = open.battle!.choice!;
    const pick = wrongFirst && first ? c.words.findIndex((w) => w !== c.right) : c.words.indexOf(c.right);
    first = false;
    await press(page, c.colors[pick]!);
    await until(page, (st) => !st.battle?.choice, 30_000, 'choice closed');
  }
}

export function expectNoErrors(errors: string[]): void {
  expect(errors).toEqual([]);
}
