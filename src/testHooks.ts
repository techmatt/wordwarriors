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
import { playStats } from './fx/freePlay';
import { fxStats } from './fx/juice';
import { virtualPad, type Button } from './input/Controls';
import { dadButtonsOpen, dadPress, type DadAnswer } from './input/dadButtons';
import { dadLock, setDadLock } from './input/dadLock';
import { typeLetter } from './input/TextEntry';
import { artBank } from './art/ArtBank';
import { voiceBus, type VoiceWait } from './audio/VoiceBus';
import { episode, currentStep, type EpisodeState } from './episode/Episode';
import { progress } from './state/progress';
import type { ProgressData } from './state/ProgressStore';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { installProbe } from './qa/probe';
import { walkObjects } from './displayList';
import { hookState, type BattleInfo, type EndingInfo, type RecapCard, type RoomInfo, type TheEndInfo, type WaitShown } from './hookState';

function hooksEnabled(): boolean {
  return import.meta.env.DEV || new URLSearchParams(location.search).has('hooks');
}

/** A visible Text in a running scene, with its world bounds; `offscreen` when it leaves the 1280×720 frame. */
export interface TextInfo {
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

/**
 * What `__ww.state()` reports: `snapshot()`'s declared return type, so the
 * snapshot and the shape the specs read (tests/harness.ts re-exports it) cannot drift.
 */
export interface WWState {
  scene: string;
  fps: number;
  /** The music playing (src/audio/music.ts), or null. */
  music: string | null;
  step: { kind: string; part?: number; game?: string; what?: string };
  /** The episode, JSON round-tripped (src/episode/state.ts). */
  episode: EpisodeState;
  /** The victory recap's cards so far (item 018: every one has a picture). */
  recap: RecapCard[];
  /** The victory scene (item 027): which, who is in it (villain last), its lines, what has been said. */
  ending: EndingInfo | null;
  /** The recap is said and its green is live, on to THE END (item 085). */
  recapDone: boolean;
  /** THE END (item 085): its background, the heroes on it, its words, whether Dad's 2 is waiting. */
  theEnd: TheEndInfo | null;
  /** The room in play and the battle (src/hookState.ts, the scenes' own types: item 122). */
  room: RoomInfo | null;
  battle: BattleInfo | null;
  /** `waits`: lines that came up before their clip was decoded (item 150, VoiceBus `VoiceWait`). */
  voice: { speaking: string | null; busy: boolean; history: string[]; waits: VoiceWait[] };
  /** Every Wait screen so far (item 150, src/scenes/WaitScene.ts): the scene it held, the art it waited for, how long (wall clock). */
  waits: WaitShown[];
  fx: Record<string, number>;
  /** Free play (item 060, src/fx/freePlay.ts `playStats`): jumps, shots fired, big shots, shots live now and the most live at once. */
  play: { jumps: number; shots: number; big: number; live: number; maxLive: number };
  /** The progress store's snapshot (src/state/ProgressStore.ts). */
  progress: ProgressData;
}

/** What `__ww.state()` reports. */
function snapshot(): WWState {
  return {
    scene: hookState.scene,
    fps: hookState.fps,
    step: currentStep(),
    episode: JSON.parse(JSON.stringify(episode)) as EpisodeState,
    room: hookState.room,
    battle: hookState.battle,
    recap: hookState.recap,
    recapDone: hookState.recapDone,
    ending: hookState.ending,
    theEnd: hookState.theEnd,
    voice: { speaking: voiceBus.speaking?.id ?? null, busy: voiceBus.busy, history: [...voiceBus.history], waits: [...voiceBus.waits] },
    waits: [...hookState.waits],
    fx: { ...fxStats },
    play: { ...playStats },
    music: musicPlaying(),
    progress: progress.snapshot(),
  };
}

export function installTestHooks(game: Phaser.Game): void {
  if (!hooksEnabled()) return;
  // The bug-hunt checker's probe (item 039, tests/qa/): `?qa=1` only.
  if (new URLSearchParams(location.search).has('qa')) installProbe(game);
  // Test-only instant voice (item 083): a line ends once `state()` has reported it.
  voiceBus.instant = new URLSearchParams(location.search).get('voice') === 'instant';
  (window as unknown as { __ww: WWHooks }).__ww = makeHooks(game);
}

/** `window.__ww`'s shape: tests/harness.ts imports it as a type, so a renamed or retyped hook fails typecheck there. */
export type WWHooks = ReturnType<typeof makeHooks>;

function makeHooks(game: Phaser.Game) {
  return {
    state: (): WWState => {
      const s = snapshot();
      voiceBus.seen();
      return s;
    },
    /** The running scenes' keys (item 092: the harness names them when a teleport seems not to land). */
    scenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    /**
     * Teleport her (item 083): in a room, or her hero in an open move choice or a story walk. Tests that
     * are not about walking land on the spot instead of steering. False when nothing can be placed.
     */
    place: (x: number, y: number) => {
      for (const s of game.scene.getScenes(true)) {
        const p = (s as unknown as { placeHero?: (x: number, y: number) => boolean }).placeHero;
        if (p?.call(s, x, y)) return true;
      }
      return false;
    },
    /** Art on demand (item 065): images on screen drawn with Phaser's missing texture, art asked for before it loaded, loads in flight. */
    art: () => {
      let missing = 0;
      let magenta = 0;
      const failed = artBank.failedIds();
      for (const s of game.scene.getScenes(true)) {
        walkObjects(s.children.list, (o) => {
          const key = (o as unknown as { texture?: { key: string } }).texture?.key;
          if (key === '__MISSING') missing++;
          if (key && failed.includes(key)) magenta++;
        });
      }
      return { missing, late: artBank.late.map((l) => `${l.id} (${l.scene})`), pending: artBank.pending(), failed, magenta };
    },
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
    /** Dad buttons (item 053): press one (`'yes'` is key 2, `'no'` key 1); returns whether a game is asking. */
    dad: (a?: DadAnswer) => {
      if (a) dadPress(a);
      return dadButtonsOpen();
    },
    /** Tests can skip the 15+ s of speech in a long flow. */
    hush: () => voiceBus.hush(),
    texts: () => visibleText(game),
    /** Say any line; a bark needs somewhere to hang its bubble (`at`). */
    say: (id: string, priority: 'instruction' | 'bark' = 'instruction', at?: { x: number; y: number }) =>
      voiceBus.say(id, priority, at ? { ...at, bubbleOffset: 0, active: true } : undefined),
  };
}
