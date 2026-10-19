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
  episode: {
    hero: string;
    ally: string | null;
    villain: string;
    made: Record<string, boolean>;
    read: string[];
    fetched: string[];
    spell: string | null;
    house: {
      plan: { slot: string; room: string; game: string; kind: 'sentence' | 'machine'; key: string; fetches: string[]; sentence?: { key: string; frame: string }; machine?: { mode: string; rounds: { word: string; rime: string }[] } }[] | null;
      done: string[];
      taught: boolean;
    };
    stepIndex: number;
  };
  /** The victory recap's cards so far (item 018: every one has a picture). */
  recap: { word: string; picture: string | null }[];
  room: {
    scene: string;
    round: string;
    locked: boolean;
    player: { x: number; y: number; art: string };
    spots: { id: string; x: number; y: number; correct: boolean | null }[];
    shown: string[];
    spelling?: { word: string; filled: number };
    sentence?: { tokens: string[]; key: string; frame: string; pass: 'listen' | 'read' | 'find' | 'done'; index: number; skipped: boolean };
    machine?: {
      mode: string;
      index: number;
      rounds: string[];
      word: string;
      rime: string;
      family: string[];
      tiles: { letter: string; makes: string; real: boolean }[];
      phase: 'intro' | 'pick' | 'check' | 'done';
      slotted: string | null;
      misses: number;
    };
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
    heroes: { id: string; hp: number; status: string | null; art: string }[];
    villains: { id: string; hp: number; status: string | null; art: string }[];
    /** The move words stand in the arena as pads (`spots`); she walks her hero onto one. */
    choice: { words: string[]; right: string; open: boolean; misses: number; spots: { word: string; x: number; y: number }[] } | null;
    /** Her hero's position. */
    me: { x: number; y: number } | null;
    itemsUsed: number;
  } | null;
  voice: { speaking: string | null; busy: boolean; history: string[] };
  fx: Record<string, number>;
  progress: { sounds: Record<string, { seen: number; recent: boolean[] }>; words: Record<string, { seen: number; recent: boolean[] }>; frames?: Record<string, { seen: number; recent: boolean[] }>; rimes?: Record<string, { seen: number; recent: boolean[] }>; onsets?: Record<string, { seen: number; recent: boolean[] }>; bag?: { left: string[]; round: number }; episodes: number };
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/**
 * How fast the page's clocks run (`WW_SPEED`, default 3). Every clock the game
 * reads is scaled together: `performance.now`, `Date.now`, timers, the
 * animation-frame timestamp (so Phaser's loop, timers and tweens), and voice
 * clips play `speed` times faster, so they end in step with the timers that
 * wait for them. The slow lane's full episode passes 1: real time.
 */
export const SPEED = Number(process.env.WW_SPEED ?? 3);

/** Install the clock warp before the page's scripts run (once per page; it survives reloads). */
function warpClocks(k: number): void {
  const w = window as unknown as { __wwSpeed?: number };
  if (w.__wwSpeed) return;
  w.__wwSpeed = k;
  if (k === 1) return;
  const pNow = performance.now.bind(performance);
  const p0 = pNow();
  const warp = (t: number) => p0 + (t - p0) * k;
  performance.now = () => warp(pNow());
  const dNow = Date.now;
  const d0 = dNow();
  Date.now = () => d0 + (dNow() - d0) * k;
  const setT = window.setTimeout.bind(window);
  const setI = window.setInterval.bind(window);
  (window as unknown as { setTimeout: unknown }).setTimeout = (fn: TimerHandler, ms = 0, ...a: unknown[]) => setT(fn, ms / k, ...a);
  (window as unknown as { setInterval: unknown }).setInterval = (fn: TimerHandler, ms = 0, ...a: unknown[]) => setI(fn, ms / k, ...a);
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => cb(warp(t)));
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...a: Parameters<AudioBufferSourceNode['start']>) {
    this.playbackRate.value *= k;
    return start.apply(this, a);
  };
}

/**
 * Load the game with test hooks on (`?hooks=1` works in a production build too), its clocks at `speed`.
 * The cast is the fixed default episode (`cast=default`) unless the query asks for a draw (`seed=`, `cast=random`).
 */
export async function boot(page: Page, query = '', speed = SPEED): Promise<void> {
  await page.addInitScript(warpClocks, speed);
  const cast = /[?&](seed|cast)=/.test(query) ? '' : 'cast=default&';
  // The rooms play the sentence game unless the query asks for a game (`game=word_machine`) or the whole pool (`games=all`).
  const games = /[?&]games?=/.test(query) ? '' : 'games=sentence&';
  await page.goto(`/${query ? `${query}&` : '?'}${cast}${games}hooks=1`);
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

/**
 * Play a battle part, answering each move choice; `wrongFirst` picks a wrong
 * pad the first time, which holds the choice open until the right one.
 */
export async function playBattle(page: Page, part: number, wrongFirst = false): Promise<WWState> {
  let first = true;
  for (;;) {
    const s = await until(page, (st) => st.scene !== 'Battle' || Boolean(st.battle?.choice), 180_000, `battle ${part} choice or end`);
    if (s.scene !== 'Battle') return s;
    const open = await until(page, (st) => st.scene !== 'Battle' || Boolean(st.battle?.choice?.open), 60_000, 'choice open');
    if (open.scene !== 'Battle') return open;
    const c = open.battle!.choice!;
    if (wrongFirst && first) {
      await pickPad(page, c.words.find((w) => w !== c.right)!);
      // A miss keeps the choice: it closes for the partner's line, then opens again.
      await until(page, (st) => st.battle?.choice?.misses === 1, 10_000, 'the miss counted');
    }
    first = false;
    await pickPad(page, c.right);
    await until(page, (st) => !st.battle?.choice, 30_000, 'choice closed');
  }
}

/** In a move choice: walk onto a word's pad and press green until the pick is taken. */
async function pickPad(page: Page, word: string): Promise<void> {
  const pad = (await state(page)).battle!.choice!.spots.find((sp) => sp.word === word)!;
  await walkHeroTo(page, pad.x, pad.y);
  // Green is ignored while a line plays (the choice closes for it): wait for
  // it to open again, then press.
  for (let tries = 0; ; tries++) {
    const now = await until(page, (st) => !st.battle?.choice || st.battle.choice.open, 30_000, 'choice open again');
    if (!now.battle?.choice) return;
    const misses = now.battle.choice.misses;
    await press(page, 'green');
    // Taken: the choice closed (right) or counted a miss (wrong). Anything
    // else was the idle re-prompt closing it first: press again.
    const taken = await until(page, (st) => !st.battle?.choice || st.battle.choice.misses !== misses, 2_000, 'green taken').catch(() => null);
    if (taken) return;
    if (tries > 4) throw new Error('green on the pad never picked');
    await page.waitForTimeout(200);
  }
}

/** Walk her battle hero (on real time, in the move choice) onto (x, y), re-aiming every hop. */
async function walkHeroTo(page: Page, x: number, y: number, close = 20): Promise<void> {
  const start = Date.now();
  for (;;) {
    const s = await state(page);
    const p = s.battle?.me;
    if (!p || !s.battle?.choice) break;
    const dx = x - p.x;
    const dy = y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < close) break;
    if (Date.now() - start > 20_000) throw new Error(`hero could not reach ${x},${y} from ${p.x},${p.y}`);
    // Slow down when close so a low frame rate does not overshoot.
    const k = d < 80 ? 0.35 : 1;
    await stick(page, (dx / d) * k, (dy / d) * k);
    await page.waitForTimeout(40);
  }
  await stick(page, 0, 0);
  await page.waitForTimeout(80);
}

/**
 * Step the sentence room's read-along to the key word: wait for pass `read`
 * (or `find`, when it is already there), then one green per word, each press
 * only once the room is listening and the last one has landed.
 */
export async function readToKeyWord(page: Page): Promise<WWState> {
  for (let guard = 0; guard < 40; guard++) {
    const s = await until(
      page,
      (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence) && (st.room!.sentence!.pass === 'find' || (st.room!.sentence!.pass === 'read' && !st.room!.locked)),
      90_000,
      'sentence read pass',
    );
    const sent = s.room!.sentence!;
    if (sent.pass === 'find') return s;
    await press(page, 'green');
    await until(page, (st) => st.room?.sentence?.pass !== 'read' || st.room.sentence.index !== sent.index, 10_000, `read-along past word ${sent.index}`);
  }
  throw new Error('the read-along never reached the key word');
}

/**
 * Play one sentence room: read along to the key word, walk to the right
 * object, green, and wait until she is out of the room. Returns the key word.
 */
export async function playSentenceRoom(page: Page): Promise<string> {
  const s = await readToKeyWord(page);
  const key = s.room!.sentence!.key;
  await choose(page);
  await until(page, (st) => st.scene !== 'SentenceRoom', 60_000, `out of the ${key} room`);
  return key;
}

/**
 * Play the word machine: each round, walk to the tile that makes the
 * picture's word and press green; with `wrongFirst`, a silly tile first,
 * which holds the round until the right one. Returns the words built.
 */
export async function playWordMachine(page: Page, wrongFirst = false): Promise<string[]> {
  const first = await until(page, (s) => s.scene === 'WordMachine' && Boolean(s.room?.machine), 30_000, 'word machine');
  const rounds = first.room!.machine!.rounds;
  for (let i = 0; i < rounds.length; i++) {
    const word = rounds[i]!;
    const s = await until(page, (st) => st.room?.machine?.index === i && st.room.machine.phase === 'pick' && !st.room.locked, 90_000, `round ${i} (${word}) open`);
    const tiles = s.room!.machine!.tiles;
    const right = tiles.find((t) => t.makes === word)!;
    if (wrongFirst && i === 0) {
      const silly = tiles.find((t) => !t.real)!;
      await choose(page, `tile_${silly.letter}`);
      await until(page, (st) => (st.room?.machine?.misses ?? 0) > 0 && st.room!.machine!.phase === 'pick' && !st.room!.locked, 60_000, 'silly word said, round open again');
    }
    await choose(page, `tile_${right.letter}`);
    await until(page, (st) => st.scene !== 'WordMachine' || (st.room?.machine?.index ?? 0) > i || st.room?.machine?.phase === 'done', 60_000, `${word} built`);
  }
  await until(page, (st) => st.scene !== 'WordMachine', 60_000, 'out of the word machine');
  return rounds;
}

/** Play whichever game the room has: a sentence room (its key word) or the word machine (every word built). */
export async function playRoom(page: Page): Promise<string[]> {
  const s = await until(page, (st) => (st.scene === 'SentenceRoom' && Boolean(st.room?.sentence)) || (st.scene === 'WordMachine' && Boolean(st.room?.machine)), 30_000, 'a side room');
  return s.scene === 'WordMachine' ? playWordMachine(page) : [await playSentenceRoom(page)];
}

/** The bedroom: wait for the news to be told and the door to open, then walk out of it. */
export async function leaveBedroom(page: Page): Promise<void> {
  await until(page, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door', 90_000, 'bedroom door open');
  await choose(page, 'door');
  await until(page, (s) => s.scene !== 'Bedroom', 30_000, 'out of the bedroom');
}

/** In the hub: wait for a spot (a door, the circle) to be offered, then walk to it and press green. */
export async function hubGo(page: Page, id: string): Promise<void> {
  await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  await choose(page, id);
  await until(page, (s) => s.scene !== 'Hub' || !s.room?.spots.some((sp) => sp.id === id), 30_000, `${id} taken`);
}

/** Seed localStorage progress before the page's scripts run (call before `boot`). */
export async function seedProgress(page: Page, data: Record<string, unknown>): Promise<void> {
  await page.addInitScript((d) => {
    localStorage.setItem('wordwarriors.progress', JSON.stringify(d));
  }, data);
}

/** The fetch frames (`use: 'fetch'` in content/phonics/sentences.ts). */
export const FETCH_FRAMES = ['we_can_use_the', 'helper_needs_a', 'go_get_the', 'we_need_a', 'hero_needs_the'];

/** From the bedroom to the victory screen. Returns the victory state and the keys fetched. */
export async function playEpisode(page: Page): Promise<{ end: WWState; keys: string[] }> {
  await until(page, (s) => s.scene === 'Bedroom', 30_000, 'bedroom');
  await leaveBedroom(page);

  // Hub part 1: the spell, then both side rooms, then out the front door.
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 90_000, 'circle offered');
  await hubGo(page, 'circle');
  const keys: string[] = [];
  for (const door of ['door_a', 'door_b']) {
    await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors', 90_000, `${door} offered`);
    await hubGo(page, door);
    keys.push(...(await playRoom(page)));
  }
  const front1 = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:front', 90_000, 'front door open');
  expect(front1.episode.fetched).toEqual(keys);
  await hubGo(page, 'door_front');

  // Battle 1: the fetched things are used, the ultimate still wins.
  const b1 = await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 1');
  expect(b1.battle?.part).toBe(1);
  const afterB1 = await playBattle(page, 1);
  expect(afterB1.battle?.ultimates).toBe(1);
  expect(afterB1.battle?.movePicks).toBe(2);
  expect(afterB1.battle?.itemsUsed).toBeGreaterThan(0);
  // The ultimate floors them, then the retreat stands them back up to run off:
  // the part ends on a retreat, never on a floored team.
  expect(afterB1.battle?.heroes.every((h) => h.status !== 'floored')).toBe(true);

  // Hub part 2: the secret door, the attic's counter sentence, out again.
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:secret', 90_000, 'secret door');
  await hubGo(page, 'door_counter');
  const counterKey = await playSentenceRoom(page);
  const ready = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:front', 90_000, 'front door again');
  expect(ready.episode.made.item).toBe(true);
  await hubGo(page, 'door_front');

  await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 2');
  await playBattle(page, 2);
  const end = await until(page, (s) => s.scene === 'Victory', 30_000, 'victory');
  return { end, keys: [...keys, counterKey] };
}

export function expectNoErrors(errors: string[]): void {
  expect(errors).toEqual([]);
}
