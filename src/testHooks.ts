/**
 * The only surface Playwright may touch: `window.__ww`.
 *
 * Installed only in dev builds or with `?hooks=1` in the URL (Seraphina's
 * were installed unconditionally, cheats included). Scenes publish what a
 * test needs to steer by (`room`, `battle`); tests drive input through the
 * virtual pad and `type()`, never through the keyboard diamond.
 */

import Phaser from 'phaser';

import { musicPlaying } from './audio/music';
import { fxStats } from './fx/juice';
import { virtualPad, type Button } from './input/Controls';
import { dadLock, setDadLock } from './input/dadLock';
import { typeLetter } from './input/TextEntry';
import { voiceBus } from './audio/VoiceBus';
import { episode, currentStep } from './episode/Episode';
import { progress } from './state/progress';
import { GAME_HEIGHT, GAME_WIDTH } from './config';

export interface SpotInfo {
  id: string;
  x: number;
  y: number;
  /** Whether choosing it answers the current item correctly (null = not a question). */
  correct: boolean | null;
}

export interface RoomInfo {
  scene: string;
  /** Changes every item: `<game>:<index>:<target>`. Wait for `=== expected`. */
  round: string;
  locked: boolean;
  /** Where she stands, and the image she walks as (her form: `char_julia_chef` in a chef episode). */
  player: { x: number; y: number; art: string };
  spots: SpotInfo[];
  /** Every spot drawn at all (enabled or not), by id: a door she cannot use yet is not drawn. */
  shown: string[];
  /** Ghost boxes in Spelling: the word and how many letters are in. */
  spelling?: { word: string; filled: number };
  /** The sentence game: its tokens (upper case), key word, frame, which pass, and the token in play. */
  sentence?: { tokens: string[]; key: string; frame: string; pass: 'listen' | 'read' | 'find' | 'done'; index: number; skipped: boolean };
  /** The home warm-up (item 033): the word to grab, its level on the ramp (1 easiest), misses so far, the hall's pictures. */
  grab?: { word: string; level: number; misses: number; objects: string[]; phase: string };
  /** The word machine (item 026): the round in play (`index` of `rounds`), its tiles, and what is in the slot. */
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
}

export interface BattleInfo {
  part: number;
  /** The showdown's fight style (item 031) and what its staging reports (a race lead, the rope's knot...). */
  fight: string;
  stage: Record<string, unknown>;
  phase: string;
  t: number;
  /** `art`: the image each fights as (a form's, for a hero in one). */
  heroes: { id: string; hp: number; status: string | null; art: string }[];
  villains: { id: string; hp: number; status: string | null; art: string }[];
  minions: number;
  abilitiesFired: number;
  ultimates: number;
  combos: number;
  movePicks: number;
  /** The move choice: its words standing in the arena as pads (`spots`) she walks onto. */
  choice: { words: string[]; right: string; open: boolean; misses: number; spots: { word: string; x: number; y: number }[] } | null;
  /** Her hero's position on the arena floor. */
  me: { x: number; y: number } | null;
  /** Fetched items used this part. */
  itemsUsed: number;
}

/** The victory recap's cards so far: each word and the picture beside it. */
export interface RecapCard {
  word: string;
  picture: string | null;
}

/** The victory scene (item 027): which, who is in it (roster ids, villain last), its lines and what has been said. */
export interface EndingInfo {
  id: string;
  people: string[];
  art: string[];
  lines: string[];
  said: string[];
  done: boolean;
}

export const hookState: { room: RoomInfo | null; battle: BattleInfo | null; recap: RecapCard[]; ending: EndingInfo | null; scene: string; fps: number } = {
  room: null,
  battle: null,
  recap: [],
  ending: null,
  scene: '',
  fps: 0,
};

export function hooksEnabled(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('hooks');
}

interface TextInfo {
  scene: string;
  text: string;
  bounds: [number, number, number, number];
  offscreen: boolean;
}

/**
 * Every visible text in the running scenes, flagged when it pokes past the
 * screen edge (item 020: nothing is ever cut off). Containers are walked;
 * bounds are world bounds, so a bubble or ribbon's own transform counts.
 */
function visibleText(game: Phaser.Game): TextInfo[] {
  const out: TextInfo[] = [];
  const walk = (scene: Phaser.Scene, objs: Phaser.GameObjects.GameObject[], shown: boolean) => {
    for (const o of objs) {
      const vis = shown && (o as unknown as { visible?: boolean }).visible !== false && ((o as unknown as { alpha?: number }).alpha ?? 1) > 0;
      if (o instanceof Phaser.GameObjects.Container) walk(scene, o.list, vis);
      else if (o instanceof Phaser.GameObjects.Text && vis && o.text.trim()) {
        const b = o.getBounds();
        const slack = 2;
        const offscreen = b.left < -slack || b.top < -slack || b.right > GAME_WIDTH + slack || b.bottom > GAME_HEIGHT + slack;
        out.push({ scene: scene.scene.key, text: o.text, bounds: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], offscreen });
      }
    }
  };
  for (const scene of game.scene.getScenes(true)) walk(scene, scene.children.list, true);
  return out;
}

export function installTestHooks(game: Phaser.Game): void {
  if (!hooksEnabled()) return;
  (window as unknown as { __ww: unknown }).__ww = {
    state: () => ({
      scene: hookState.scene,
      fps: hookState.fps,
      step: currentStep(),
      episode: JSON.parse(JSON.stringify(episode)) as unknown,
      room: hookState.room,
      battle: hookState.battle,
      recap: hookState.recap,
      ending: hookState.ending,
      voice: { speaking: voiceBus.speaking?.id ?? null, busy: voiceBus.busy, history: [...voiceBus.history] },
      fx: { ...fxStats },
      music: musicPlaying(),
      progress: progress.snapshot(),
    }),
    input: {
      press: (b: Button) => virtualPad.press(b),
      stick: (x: number, y: number) => virtualPad.stick(x, y),
      hold: (b: Button) => virtualPad.held.add(b),
      release: () => virtualPad.release(),
    },
    type: (letter: string) => typeLetter(letter),
    /** Dad lock (item 038): set it, or read it with no argument. */
    dadLock: (on?: boolean) => {
      if (on !== undefined) setDadLock(on);
      return dadLock.locked;
    },
    resetProgress: () => progress.reset(),
    /** Tests can skip the 15+ s of speech in a long flow. */
    hush: () => voiceBus.hush(),
    texts: () => visibleText(game),
    /** Say any line; a bark needs somewhere to hang its bubble (`at`). */
    say: (id: string, priority: 'instruction' | 'bark' = 'instruction', at?: { x: number; y: number }) =>
      voiceBus.say(id, priority, at ? { ...at, bubbleOffset: 0, active: true } : undefined),
  };
}
