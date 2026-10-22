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
import { voiceBus } from './audio/VoiceBus';
import { episode, currentStep } from './episode/Episode';
import { debugMode } from './episode/debug';
import { progress } from './state/progress';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { installProbe } from './qa/probe';
import { hookState, walkObjects } from './hookState';

function hooksEnabled(): boolean {
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

/** What `__ww.state()` reports. */
function snapshot(): unknown {
  return {
    scene: hookState.scene,
    fps: hookState.fps,
    step: currentStep(),
    episode: JSON.parse(JSON.stringify(episode)) as unknown,
    room: hookState.room,
    battle: hookState.battle,
    recap: hookState.recap,
    recapDone: hookState.recapDone,
    ending: hookState.ending,
    theEnd: hookState.theEnd,
    voice: { speaking: voiceBus.speaking?.id ?? null, busy: voiceBus.busy, history: [...voiceBus.history] },
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
  (window as unknown as { __ww: unknown }).__ww = {
    state: () => {
      const s = snapshot();
      voiceBus.seen();
      return s;
    },
    /**
     * Teleport her (item 083): in a room, or her hero in an open move choice. Tests that are
     * not about walking land on the spot instead of steering. False when nothing can be placed.
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
      for (const s of game.scene.getScenes(true)) {
        walkObjects(s.children.list, (o) => {
          if ((o as unknown as { texture?: { key: string } }).texture?.key === '__MISSING') missing++;
        });
      }
      return { missing, late: artBank.late.map((l) => `${l.id} (${l.scene})`), pending: artBank.pending() };
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
    /** Minigame debug mode (item 086): on or off, the game played from it now, and those finished. */
    debug: () => ({ on: debugMode.on, run: debugMode.run?.game ?? null, done: [...debugMode.done], origin: debugMode.origin?.key ?? null }),
    resetProgress: () => progress.reset(),
    /** Tests can skip the 15+ s of speech in a long flow. */
    hush: () => voiceBus.hush(),
    texts: () => visibleText(game),
    /** Say any line; a bark needs somewhere to hang its bubble (`at`). */
    say: (id: string, priority: 'instruction' | 'bark' = 'instruction', at?: { x: number; y: number }) =>
      voiceBus.say(id, priority, at ? { ...at, bubbleOffset: 0, active: true } : undefined),
  };
}
