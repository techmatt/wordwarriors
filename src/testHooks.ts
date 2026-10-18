/**
 * The only surface Playwright may touch: `window.__ww`.
 *
 * Installed only in dev builds or with `?hooks=1` in the URL (Seraphina's
 * were installed unconditionally, cheats included). Scenes publish what a
 * test needs to steer by (`room`, `battle`); tests drive input through the
 * virtual pad and `type()`, never through the keyboard diamond.
 */

import { musicPlaying } from './audio/music';
import { fxStats } from './fx/juice';
import { virtualPad, type Button } from './input/Controls';
import { typeLetter } from './input/TextEntry';
import { voiceBus } from './audio/VoiceBus';
import { episode, currentStep } from './episode/Episode';
import { progress } from './state/progress';

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
  player: { x: number; y: number };
  spots: SpotInfo[];
  /** Every spot drawn at all (enabled or not), by id: a door she cannot use yet is not drawn. */
  shown: string[];
  /** Ghost boxes in Spelling: the word and how many letters are in. */
  spelling?: { word: string; filled: number };
  /** The sentence game: its tokens (upper case), key word, frame, which pass, and the token in play. */
  sentence?: { tokens: string[]; key: string; frame: string; pass: 'listen' | 'read' | 'find' | 'done'; index: number; skipped: boolean };
}

export interface BattleInfo {
  part: number;
  phase: string;
  t: number;
  heroes: { id: string; hp: number; status: string | null }[];
  villains: { id: string; hp: number; status: string | null }[];
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

export const hookState: { room: RoomInfo | null; battle: BattleInfo | null; scene: string; fps: number } = {
  room: null,
  battle: null,
  scene: '',
  fps: 0,
};

export function hooksEnabled(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('hooks');
}

export function installTestHooks(): void {
  if (!hooksEnabled()) return;
  (window as unknown as { __ww: unknown }).__ww = {
    state: () => ({
      scene: hookState.scene,
      fps: hookState.fps,
      step: currentStep(),
      episode: JSON.parse(JSON.stringify(episode)) as unknown,
      room: hookState.room,
      battle: hookState.battle,
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
    resetProgress: () => progress.reset(),
    /** Tests can skip the 15+ s of speech in a long flow. */
    hush: () => voiceBus.hush(),
  };
}
