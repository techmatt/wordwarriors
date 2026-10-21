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

/** A browser test over about 10 s: the slow lane (`--grep @slow` matches the tag). */
export const SLOW = { tag: '@slow' };

/**
 * One of the few browser tests `npm test` runs after every change (item 079): the
 * title, the hub and a room, a few seconds each. Everything not SLOW is `npm run test:browser`.
 */
export const SMOKE = { tag: '@smoke' };

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
    /** Charge the Spell (item 053): the sounds charged, and the battle part they fire in. */
    charged: { sounds: string[]; part: number } | null;
    gift: string | null;
    /** The home warm-up (item 033): the word grabbed in the entry hall and the hall's pictures. */
    grab: { word: string; objects: string[] } | null;
    house: {
      plan: { slot: string; room: string; game: string; kind: 'sentence' | 'machine' | 'charge' | 'bridge'; key: string; fetches: string[]; charge?: { runes: string[] }; bridge?: { rounds: { word: string; units: string[]; pictures: string[] }[] }; sentence?: { key: string; frame: string }; machine?: { mode: string; rounds: { word: string; rime: string }[] } }[] | null;
      done: string[];
      taught: boolean;
    };
    stepIndex: number;
  };
  /** The victory recap's cards so far (item 018: every one has a picture). */
  recap: { word: string; picture: string | null }[];
  /** The victory scene (item 027): which, who is in it (villain last), its lines, what has been said. */
  ending: { id: string; people: string[]; art: string[]; lines: string[]; said: string[]; done: boolean } | null;
  room: {
    scene: string;
    round: string;
    locked: boolean;
    player: { x: number; y: number; art: string };
    spots: { id: string; x: number; y: number; correct: boolean | null }[];
    shown: string[];
    spelling?: { word: string; filled: number };
    grab?: { word: string; level: number; misses: number; objects: string[]; phase: string };
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
    /** Charge the Spell (item 053). */
    charge?: {
      /** Item 058: the word the runes spell, and how its read went. */
      word: string;
      read: 'yes' | 'no' | 'timeout' | null;
      runes: string[];
      index: number;
      sound: string;
      phase: 'explain' | 'prompt' | 'sayback' | 'charging' | 'read' | 'reading' | 'done';
      asking: boolean;
      assists: number;
      timeouts: number;
      charged: string[];
      elapsedMs: number;
      readAtMs: number;
    };
    /** The Stretchy Bridge (item 054). */
    bridge?: {
      words: string[];
      index: number;
      word: string;
      units: string[];
      pictures: string[];
      level: number;
      phase: 'intro' | 'slide' | 'say' | 'replay' | 'pick' | 'check' | 'done';
      stone: number;
      voiced: boolean;
      aided: boolean;
      picturesUp: boolean;
      replays: number;
      timeouts: number;
      misses: number;
      asking: boolean;
      holding: string | null;
    };
  } | null;
  battle: {
    part: number;
    /** The showdown's fight style (item 031) and its staging's own numbers. */
    fight: string;
    stage: Record<string, unknown>;
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
    choice: { words: string[]; right: string; open: boolean; misses: number; spots: { word: string; x: number; y: number }[]; stickHint: boolean; signs: number[][]; team: { id: string; box: number[] }[]; villain: number[] | null } | null;
    /** Her hero's position. */
    me: { x: number; y: number } | null;
    itemsUsed: number;
    /** Charge the Spell's runes fired this part (item 053). */
    runesFired: number;
  } | null;
  voice: { speaking: string | null; busy: boolean; history: string[] };
  fx: Record<string, number>;
  progress: { sounds: Record<string, { seen: number; recent: boolean[] }>; words: Record<string, { seen: number; recent: boolean[] }>; frames?: Record<string, { seen: number; recent: boolean[] }>; rimes?: Record<string, { seen: number; recent: boolean[] }>; onsets?: Record<string, { seen: number; recent: boolean[] }>; bag?: { left: string[]; round: number }; episodes: number };
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Art drawn before it loaded (item 065, src/art/ArtBank.ts): a gap on screen, so an error.
  page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().startsWith('art: not ready')) errors.push(m.text());
  });
  return errors;
}

/**
 * How fast the page's clocks run (`WW_SPEED`, default 5; 3 until item 036). Every clock the game
 * reads is scaled together: `performance.now`, `Date.now`, timers, the
 * animation-frame timestamp (so Phaser's loop, timers and tweens), and voice
 * clips play `speed` times faster, so they end in step with the timers that
 * wait for them. The slow lane's full episode passes 1: real time.
 */
export const SPEED = Number(process.env.WW_SPEED ?? 5);

/**
 * Install the clock warp before the page's scripts run (once per page; it survives reloads).
 * `__wwSetSpeed(k)` changes the factor mid-run (`setSpeed`, item 081): each clock is
 * rebased where it stands, so no clock jumps; timers already set keep their old rate.
 */
function warpClocks(k0: number): void {
  const w = window as unknown as { __wwSpeed?: number; __wwSetSpeed?: (k: number) => void };
  if (w.__wwSpeed) return;
  let k = k0;
  w.__wwSpeed = k;
  const pNow = performance.now.bind(performance);
  const dNow = Date.now;
  // Each clock reads base + (real - real at the last change) × k.
  let pReal = pNow();
  let pBase = pReal;
  let dReal = dNow();
  let dBase = dReal;
  const warp = (t: number) => pBase + (t - pReal) * k;
  w.__wwSetSpeed = (n: number) => {
    const p = pNow();
    const d = dNow();
    pBase = warp(p);
    pReal = p;
    dBase = dBase + (d - dReal) * k;
    dReal = d;
    k = n;
    w.__wwSpeed = n;
  };
  performance.now = () => warp(pNow());
  Date.now = () => dBase + (dNow() - dReal) * k;
  const setT = window.setTimeout.bind(window);
  const setI = window.setInterval.bind(window);
  // Network waits stay on the wall clock (`src/realTime.ts`, item 069).
  (window as unknown as { __wwRealSetTimeout: unknown }).__wwRealSetTimeout = setT;
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

/** Change the page's clock speed mid-run (item 081): from now on, timers, tweens and new voice clips at `k`. */
export async function setSpeed(page: Page, k: number): Promise<void> {
  await page.evaluate((n) => (window as unknown as { __wwSetSpeed(k: number): void }).__wwSetSpeed(n), k);
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

/** A visible Text in a running scene, with its world bounds; `offscreen` when it leaves the 1280×720 frame. */
export interface TextInfo {
  scene: string;
  text: string;
  bounds: number[];
  offscreen: boolean;
}

/** Every visible Text in the running scenes. */
export function texts(page: Page): Promise<TextInfo[]> {
  return page.evaluate(() => (window as unknown as { __ww: { texts(): TextInfo[] } }).__ww.texts());
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
  await steer(page, x, y, close, (s) => {
    if (!s.room?.player) throw new Error(`no room to walk in (scene ${s.scene})`);
    return s.room.player;
  }, true, '');
}

/**
 * Steer whatever `at` reads back to (x, y) with the stick, re-aiming every hop;
 * `at` returning null stops. With `edge`, stuck near enough counts as arrival.
 */
async function steer(page: Page, x: number, y: number, close: number, at: (s: WWState) => { x: number; y: number } | null, edge: boolean, who: string): Promise<void> {
  const start = Date.now();
  let last = { x: NaN, y: NaN, at: Date.now() };
  for (;;) {
    const p = at(await state(page));
    if (!p) break;
    const dx = x - p.x;
    const dy = y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < close) break;
    // Pressed against the edge of the floor and near enough: that is arrival.
    if (edge) {
      if (Math.hypot(p.x - last.x, p.y - last.y) > 1) last = { x: p.x, y: p.y, at: Date.now() };
      else if (Date.now() - last.at > 800 && d < 70) break;
    }
    if (Date.now() - start > 20_000) throw new Error(`${who}could not reach ${x},${y} from ${p.x},${p.y}`);
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
  driver.busy++;
  try {
    await walkTo(page, spot.x, spot.y + 12);
    await until(page, (st) => Boolean(st.room && !st.room.locked), 30_000, 'room unlocked');
    await press(page, 'green');
    // One frame for the press to land before a busy child's yellow may lock the room again.
    await page.waitForTimeout(150);
  } finally {
    driver.busy--;
  }
  return spot.id;
}

/**
 * The driver is about to press green on an answer (`choose`, the read-along):
 * the bug-hunt checker's busy child (item 069) holds its yellow meanwhile, or
 * a replay it starts would lock the room just as green lands, a hop and no
 * answer, and the driver would wait for an answer that never comes.
 */
export const driver = { busy: 0 };

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
  await steer(page, x, y, close, (s) => (s.battle?.choice && s.battle.me) || null, false, 'hero ');
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
    driver.busy++;
    try {
      await press(page, 'green');
      await until(page, (st) => st.room?.sentence?.pass !== 'read' || st.room.sentence.index !== sent.index, 10_000, `read-along past word ${sent.index}`);
    } finally {
      driver.busy--;
    }
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
  // From the round it is on (back from F9 mid-visit, words already built stay built).
  for (let i = first.room!.machine!.index; i < rounds.length; i++) {
    const word = rounds[i]!;
    const s = await until(page, (st) => st.room?.machine?.index === i && st.room.machine.phase === 'pick' && !st.room.locked, 90_000, `round ${i} (${word}) open`);
    const tiles = s.room!.machine!.tiles;
    const right = tiles.find((t) => t.makes === word)!;
    if (wrongFirst && i === first.room!.machine!.index) {
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

/** Dad's buttons (item 053): `yes` is key 2, `no` key 1, through the hooks. */
export async function dad(page: Page, a: 'yes' | 'no'): Promise<void> {
  await page.evaluate((v) => (window as unknown as { __ww: { dad(a: string): boolean } }).__ww.dad(v), a);
}

/** Play Charge the Spell (item 053; no presses per rune since item 059): wait for the read, then Dad's `read`. Returns the sounds charged. */
export async function playChargeRoom(page: Page, read: 'yes' | 'no' = 'yes'): Promise<string[]> {
  const first = await until(page, (s) => s.scene === 'ChargeRoom' && Boolean(s.room?.charge), 30_000, 'charge room');
  const runes = first.room!.charge!.runes;
  // Item 059: the runes charge by themselves (the helper says each, she says it back); the word they spell is read aloud and Dad says `read` (yes by default).
  const at = await until(page, (st) => st.scene !== 'ChargeRoom' || st.room?.charge?.phase === 'read' || st.room?.charge?.phase === 'done', 90_000, 'the word to read');
  if (at.room?.charge?.phase === 'read') await dad(page, read);
  await until(page, (st) => st.scene !== 'ChargeRoom', 60_000, 'out of the charge room');
  return runes;
}

/** Slide her across the Stretchy Bridge (item 054): the stick held right until she is on the far bank. */
export async function slideAcross(page: Page, speed = 1): Promise<void> {
  const start = Date.now();
  for (;;) {
    const s = await state(page);
    const b = s.room?.bridge;
    if (!b || b.phase !== 'slide' || (s.room?.player.x ?? 0) > 935) break;
    if (Date.now() - start > 30_000) throw new Error(`could not cross the bridge from ${s.room?.player.x}`);
    await stick(page, speed, 0);
    await page.waitForTimeout(60);
  }
  await stick(page, 0, 0);
}

/**
 * Play the Stretchy Bridge (item 054): for each word, slide across, Dad's yes
 * where he is asked (level 3), then the right picture; with `wrongFirst`, a
 * wrong picture first on the first word (it is sounded out, she slides
 * again). Returns the words read (each a battle item).
 */
export async function playBridgeRoom(page: Page, wrongFirst = false): Promise<string[]> {
  const first = await until(page, (s) => s.scene === 'BridgeRoom' && Boolean(s.room?.bridge), 30_000, 'bridge room');
  const words = first.room!.bridge!.words;
  let wrong = wrongFirst;
  for (let i = first.room!.bridge!.index; i < words.length; i++) {
    for (;;) {
      const s = await until(page, (st) => st.scene !== 'BridgeRoom' || (st.room?.bridge?.index === i && st.room.bridge.phase === 'slide' && !st.room.locked), 90_000, `bridge ${i} (${words[i]}) ready`);
      if (s.scene !== 'BridgeRoom') return words;
      await slideAcross(page);
      const at = await until(page, (st) => (st.room?.bridge?.phase === 'say' || st.room?.bridge?.phase === 'pick') && !st.room.locked, 60_000, `far bank of ${words[i]}`);
      if (at.room!.bridge!.phase === 'say') {
        await dad(page, 'yes');
        await until(page, (st) => st.room?.bridge?.phase === 'pick' && !st.room.locked, 60_000, 'pictures up');
      }
      if (wrong) {
        wrong = false;
        const other = at.room!.bridge!.pictures.find((w) => w !== words[i])!;
        await choose(page, other);
        continue;
      }
      await choose(page, words[i]);
      await until(page, (st) => st.scene !== 'BridgeRoom' || (st.room?.bridge?.index ?? 0) > i || st.room?.bridge?.phase === 'done', 60_000, `${words[i]} read`);
      break;
    }
  }
  await until(page, (st) => st.scene !== 'BridgeRoom', 60_000, 'out of the bridge room');
  return words;
}

/**
 * Play whichever game the room has: a sentence room (its key word), the word
 * machine (every word built), Charge the Spell (nothing: it fetches no word),
 * or the Stretchy Bridge (every word read).
 */
export async function playRoom(page: Page): Promise<string[]> {
  const s = await until(
    page,
    (st) =>
      (st.scene === 'SentenceRoom' && Boolean(st.room?.sentence)) ||
      (st.scene === 'WordMachine' && Boolean(st.room?.machine)) ||
      (st.scene === 'ChargeRoom' && Boolean(st.room?.charge)) ||
      (st.scene === 'BridgeRoom' && Boolean(st.room?.bridge)),
    30_000,
    'a side room',
  );
  if (s.scene === 'ChargeRoom') {
    // Its word is a battle item (item 058), fetched like any room's.
    const word = s.room!.charge!.word;
    await playChargeRoom(page);
    return [word];
  }
  if (s.scene === 'BridgeRoom') return playBridgeRoom(page);
  return s.scene === 'WordMachine' ? playWordMachine(page) : [await playSentenceRoom(page)];
}

/**
 * The bedroom: wait for the news to be told and the door to open, then walk
 * out of it, and (unless `grab: false`) through the entry hall's warm-up too
 * (item 033), so the caller lands where the quest starts.
 */
export async function leaveBedroom(page: Page, opts: { grab?: boolean } = {}): Promise<void> {
  await until(page, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door', 90_000, 'bedroom door open');
  await choose(page, 'door');
  const s = await until(page, (st) => st.scene !== 'Bedroom', 30_000, 'out of the bedroom');
  if (s.scene === 'Entry' && opts.grab !== false) await playEntry(page);
}

/**
 * The entry hall's warm-up (item 033): wait for the clue, pick `wrong` wrong
 * pictures first (each waits for the clue again), then the right one, then
 * out of the front door. Returns the grabbed word.
 */
export async function playEntry(page: Page, wrong = 0): Promise<string> {
  const ask = await until(page, (st) => st.scene === 'Entry' && st.room?.round === 'entry:find' && !st.room.locked, 90_000, 'warm-up clue given');
  const g = ask.room!.grab!;
  for (let i = 0; i < wrong; i++) {
    const others = g.objects.filter((w) => w !== g.word);
    const other = others[i % others.length]!;
    await choose(page, `grab_${other}`);
    await until(page, (st) => (st.room?.grab?.misses ?? 0) === i + 1, 30_000, `miss ${i + 1}`);
    await until(page, (st) => st.room?.round === 'entry:find' && !st.room.locked, 90_000, `clue again after miss ${i + 1}`);
  }
  await choose(page, `grab_${g.word}`);
  await until(page, (st) => st.scene === 'Entry' && st.room?.round === 'entry:door' && !st.room.locked, 60_000, 'front door open');
  await choose(page, 'door');
  await until(page, (st) => st.scene !== 'Entry', 30_000, 'out of the entry hall');
  return g.word;
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

/** The parts of an episode `playEpisode` can run at a clock speed of their own (item 081). */
export type EpisodePart = 'bedroom' | 'entry' | 'hub1' | 'door_a' | 'door_b' | 'battle1' | 'hub2' | 'battle2' | 'victory';

/**
 * The clock speed whole episodes play their battles at (item 081): a fight's checks
 * are counts and simulation time, which hold at a faster clock than her walking does.
 * `WW_BATTLE_SPEED` sets it; a run that sets only `WW_SPEED` gets that for battles too.
 */
export const BATTLE_SPEED = Number(process.env.WW_BATTLE_SPEED ?? (process.env.WW_SPEED ? SPEED : 10));

/**
 * From the bedroom to the victory screen. Returns the victory state, the keys read and fetched,
 * the warm-up's word (fetched, not read), and the real seconds each part took. `speeds` sets
 * the clock as each part starts (`setSpeed`); unset, the battles run at `BATTLE_SPEED` and the
 * rest at the speed the page booted with.
 */
export async function playEpisode(
  page: Page,
  speeds: Partial<Record<EpisodePart, number>> = {},
): Promise<{ end: WWState; keys: string[]; grab: string; times: Partial<Record<EpisodePart, number>> }> {
  const booted = await page.evaluate(() => (window as unknown as { __wwSpeed: number }).__wwSpeed);
  const plan: Partial<Record<EpisodePart, number>> = { battle1: BATTLE_SPEED, hub2: booted, battle2: BATTLE_SPEED, victory: booted, ...speeds };
  const times: Partial<Record<EpisodePart, number>> = {};
  let current: { part: EpisodePart; at: number } | null = null;
  let speed = booted;
  const part = async (p: EpisodePart) => {
    if (current) times[current.part] = Math.round((Date.now() - current.at) / 100) / 10;
    current = { part: p, at: Date.now() };
    const k = plan[p];
    if (k !== undefined && k !== speed) {
      await setSpeed(page, k);
      speed = k;
    }
  };
  await part('bedroom');
  await until(page, (s) => s.scene === 'Bedroom', 30_000, 'bedroom');
  await leaveBedroom(page, { grab: false });
  // The entry hall's warm-up: its word is her first battle item.
  await part('entry');
  const grab = await playEntry(page);
  const keys: string[] = [];
  await part('hub1');

  // Hub part 1: the helper's scene and its gift word in the circle, then both side rooms, then out the front door.
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 90_000, 'circle offered');
  await hubGo(page, 'circle');
  for (const door of ['door_a', 'door_b'] as const) {
    await part(door);
    await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors', 90_000, `${door} offered`);
    await hubGo(page, door);
    keys.push(...(await playRoom(page)));
  }
  const front1 = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:front', 90_000, 'front door open');
  expect(front1.episode.fetched).toEqual([grab, ...keys]);
  await hubGo(page, 'door_front');

  // Battle 1: the fetched things are used, the ultimate still wins.
  await part('battle1');
  const b1 = await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 1');
  expect(b1.battle?.part).toBe(1);
  const afterB1 = await playBattle(page, 1);
  expect(afterB1.battle?.ultimates).toBe(1);
  expect(afterB1.battle?.movePicks).toBe(2);
  expect(afterB1.battle?.itemsUsed).toBeGreaterThan(0);
  // The ultimate floors them, then the retreat stands them back up to run off:
  // the part ends on a retreat, never on a floored team.
  expect(afterB1.battle?.heroes.every((h) => h.status !== 'floored')).toBe(true);
  expectFightLength(afterB1);

  // Hub part 2: the secret door, the attic's counter sentence, out again.
  await part('hub2');
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:secret', 90_000, 'secret door');
  await hubGo(page, 'door_counter');
  const counterKey = await playSentenceRoom(page);
  const ready = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:front', 90_000, 'front door again');
  expect(ready.episode.made.item).toBe(true);
  await hubGo(page, 'door_front');

  await part('battle2');
  await until(page, (s) => s.scene === 'Battle', 30_000, 'battle 2');
  await playBattle(page, 2);
  const end = await until(page, (s) => s.scene === 'Victory', 30_000, 'victory');
  expectFightLength(end);
  // The victory's own pacing (its recap, its green) runs at the room speed, until the caller is done.
  await part('victory');
  return { end, keys: [...keys, counterKey], grab, times };
}

/**
 * A battle part takes about as long as the brawl's (~70-80 s of simulation
 * time), whatever the fight style (item 031). Read from the state after the
 * part, where the battle's last numbers stay.
 */
export function expectFightLength(after: WWState): void {
  expect(after.battle?.t ?? 0).toBeGreaterThan(45);
  expect(after.battle?.t ?? 0).toBeLessThan(120);
}

export function expectNoErrors(errors: string[]): void {
  expect(errors).toEqual([]);
}
