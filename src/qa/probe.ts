/**
 * The QA probe (item 039): what the bug-hunt checker (`tests/qa/`) reads
 * beside `window.__ww`. Installed only with `?qa=1` (and the test hooks on),
 * so normal play never runs it.
 *
 * It keeps logs the checker cannot get by polling: every line the voice bus
 * starts (and whether it had audio), frame-time spikes and long tasks per
 * scene, stretches where her input was locked (and how much of each was
 * silent), full-screen flashes, art that failed to load or was drawn before it
 * loaded (item 065), and console warnings. `layout()` lists
 * what is drawn right now (texts, images, the targets she can walk to) for
 * the overlap and placeholder checks; `counts()` the objects, tweens and
 * timers alive, for growth across episodes.
 */

import Phaser from 'phaser';

import { getAudioContext } from '../audio/context';
import { voiceBus } from '../audio/VoiceBus';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { fxStats } from '../fx/juice';
import { dadLock } from '../input/dadLock';
import { voiceBank } from '../voice/VoiceBank';
import { artBank } from '../art/ArtBank';
import { artFor } from '../art/needs';
import { hookState, walkObjects } from '../hookState';
import { worldInk } from '../ui/banner';

export interface QaVoice {
  /** Game-clock ms (the page's warped `performance.now`). */
  t: number;
  id: string;
  scene: string;
  priority: string;
  text: string;
  /** Not in the manifest at all. */
  noLine: boolean;
  /** In the manifest but not decoded, or the audio context not running: it played silent. */
  silent: boolean;
  /** Why a silent line had no clip (item 062): its decode still queued or under way, failed, never asked for, or the context not running. */
  why?: 'queued' | 'decoding' | 'failed' | 'none' | 'suspended';
}

export interface QaLock {
  scene: string;
  round: string;
  /** Game-clock ms. */
  start: number;
  ms: number;
  /** Of which nobody was talking. */
  silentMs: number;
}

export interface QaSpike {
  scene: string;
  t: number;
  /** Real (unwarped) ms. */
  ms: number;
  kind: 'frame' | 'longtask';
}

interface DrawnText {
  scene: string;
  text: string;
  /** Left, top, right, bottom. */
  b: [number, number, number, number];
  depth: number;
  /** Which container it sits in (0: none): words in one container are laid out together. */
  group: number;
  size: number;
  /** The panel it is printed on (an index into `panels`), if any, and its ink there (its letters, not its line-high box). */
  panel?: number;
  ink?: [number, number, number, number];
}

interface DrawnImage {
  scene: string;
  key: string;
  b: [number, number, number, number];
  depth: number;
}

type Rect = [number, number, number, number];

/**
 * A thing she has to look at or choose (a room's spot, a battle pad): tagged
 * `qaTarget` (its id) by the scene that draws it, with its bounds now.
 */
interface DrawnTarget {
  scene: string;
  id: string;
  b: Rect;
  depth: number;
}

/**
 * Something that may stand over the scene and hide it (the dialogue box and
 * its face card, a speech bubble, the sentence banner): tagged `qaCover`, a
 * kind name, by whatever draws it. Its `qaCoverRects` (a function), when set,
 * gives the boxes actually drawn (a Graphics box has no bounds of its own).
 */
interface DrawnCover {
  scene: string;
  kind: string;
  b: Rect;
  depth: number;
}

/**
 * Where words may sit on a panel they are printed on (the sentence banner's
 * cream, item 128): tagged `qaPanel`, a function giving that area in world
 * coordinates now, by whatever draws it. Every text inside it is checked
 * against it, not against the art's whole box (trim, pole and tassels).
 */
interface DrawnPanel {
  scene: string;
  kind: string;
  b: Rect;
}

/** Her figure (`qaHero` on the player's sprite, hunt 9): words she stands in front of. */
interface DrawnHero {
  scene: string;
  b: Rect;
  depth: number;
}

/** A game object's own data value, without creating a data manager on every object the probe walks. */
function tag(o: Phaser.GameObjects.GameObject, key: string): unknown {
  return (o as unknown as { data?: Phaser.Data.DataManager | null }).data?.get(key);
}

const log = {
  voice: [] as QaVoice[],
  locks: [] as QaLock[],
  spikes: [] as QaSpike[],
  missingArt: [] as string[],
  /** Art a scene asked for before it had loaded, and scenes that opened with their art still loading (item 065). */
  lateArt: [] as { scene: string; id: string }[],
  console: [] as { level: string; text: string; scene: string }[],
  frames: {} as Record<string, { n: number; over50: number; over100: number; max: number }>,
  /** Full-screen camera flashes (game-clock ms), for the flashes-per-second check. */
  flashes: [] as { scene: string; t: number }[],
};

const speed = (): number => (window as unknown as { __wwSpeed?: number }).__wwSpeed ?? 1;

export function installProbe(game: Phaser.Game): void {
  voiceBus.on((u) => {
    if (!u) return;
    const ctx = getAudioContext();
    const state = voiceBank.state(u.id);
    const silent = Boolean(u.line) && (state !== 'ready' || ctx?.state !== 'running');
    log.voice.push({
      t: performance.now(),
      id: u.id,
      scene: hookState.scene,
      priority: u.priority,
      text: u.text,
      noLine: !u.line,
      silent,
      ...(silent ? { why: !ctx || state === 'ready' ? ('suspended' as const) : state } : {}),
    });
    if (log.voice.length > 4000) log.voice.splice(0, 1000);
  });

  for (const level of ['warn', 'error'] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const text = args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      log.console.push({ level, text: text.slice(0, 300), scene: hookState.scene });
      const m = /^art: missing (\S+)/.exec(text);
      if (m) log.missingArt.push(m[1]!);
      const late = /^art: not ready (\S+) \((\S+)\)/.exec(text);
      if (late) log.lateArt.push({ id: late[1]!, scene: late[2]! });
      orig(...args);
    };
  }

  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration >= 100) log.spikes.push({ scene: hookState.scene, t: performance.now(), ms: Math.round(e.duration), kind: 'longtask' });
      }
    }).observe({ type: 'longtask', buffered: false });
  } catch {
    // No long-task timing in this browser: the frame times still count.
  }

  // A scene that opens with its own art still loading (item 065): the gate (src/art/gate.ts) should never let one.
  // The scenes are only made once the game boots (installProbe runs before).
  const watchScenes = () => {
    for (const scene of game.scene.getScenes(false)) {
      scene.events.on(Phaser.Scenes.Events.CREATE, () => {
        const key = scene.scene.key;
        for (const id of artBank.missing(artFor(key, false))) log.lateArt.push({ id, scene: key });
      });
    }
  };
  if (game.isBooted) watchScenes();
  else game.events.once(Phaser.Core.Events.READY, watchScenes);

  // Frame times and lock stretches, once a frame.
  let open: QaLock | null = null;
  let last = performance.now();
  let flashes = fxStats.flashes;
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const now = performance.now();
    const real = (now - last) / speed();
    last = now;
    const scene = hookState.scene;
    const f = (log.frames[scene] ??= { n: 0, over50: 0, over100: 0, max: 0 });
    f.n++;
    if (real > 50) f.over50++;
    if (real > 100) f.over100++;
    // The first frame of a scene carries its create(): counted, but not a spike to report.
    if (real > f.max && f.n > 3) f.max = Math.round(real);
    if (real > 120 && f.n > 3) log.spikes.push({ scene, t: now, ms: Math.round(real), kind: 'frame' });
    if (log.spikes.length > 500) log.spikes.splice(0, 100);

    if (fxStats.flashes !== flashes) {
      for (let i = flashes; i < fxStats.flashes; i++) log.flashes.push({ scene, t: now });
      flashes = fxStats.flashes;
      if (log.flashes.length > 2000) log.flashes.splice(0, 500);
    }

    const room = hookState.room;
    const locked = Boolean(room && room.scene === scene && room.locked) && !dadLock.locked;
    if (locked && room) {
      if (!open || open.scene !== scene) open = { scene, round: room.round, start: now, ms: 0, silentMs: 0 };
      const dt = Math.min(now - (open.start + open.ms), 250 * speed());
      open.ms = now - open.start;
      if (!voiceBus.busy) open.silentMs += dt;
    } else if (open) {
      log.locks.push({ ...open, ms: Math.round(open.ms), silentMs: Math.round(open.silentMs) });
      if (log.locks.length > 2000) log.locks.splice(0, 500);
      open = null;
    }
  });

  (window as unknown as { __wwqa: unknown }).__wwqa = {
    log: () => log,
    /** Everything since game-clock `t` (the checker drains it as it goes). */
    since: (t: number) => ({
      voice: log.voice.filter((v) => v.t > t),
      locks: log.locks.filter((l) => l.start + l.ms > t),
      spikes: log.spikes.filter((s) => s.t > t),
      flashes: log.flashes.filter((f) => f.t > t),
      console: log.console.slice(),
      missingArt: log.missingArt.slice(),
      lateArt: log.lateArt.slice(),
      frames: log.frames,
      now: performance.now(),
    }),
    layout: () => layout(game),
    counts: () => counts(game),
  };
}

/** What is drawn now: visible texts and images with world bounds, and the room's targets. */
function layout(game: Phaser.Game): {
  texts: DrawnText[];
  images: DrawnImage[];
  spots: { id: string; x: number; y: number }[];
  targets: DrawnTarget[];
  covers: DrawnCover[];
  panels: DrawnPanel[];
  heroes: DrawnHero[];
  hudDepth: number;
} {
  const texts: DrawnText[] = [];
  const images: DrawnImage[] = [];
  const targets: DrawnTarget[] = [];
  const covers: DrawnCover[] = [];
  const panels: DrawnPanel[] = [];
  const heroes: DrawnHero[] = [];
  let groupId = 0;
  const box = (o: { getBounds(): Phaser.Geom.Rectangle }): [number, number, number, number] => {
    const b = o.getBounds();
    return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)];
  };
  const walk = (scene: Phaser.Scene, objs: Phaser.GameObjects.GameObject[], shown: boolean, depth: number, group: number, alpha: number, panel?: number) => {
    for (const o of objs) {
      const a = alpha * ((o as unknown as { alpha?: number }).alpha ?? 1);
      const vis = shown && (o as unknown as { visible?: boolean }).visible !== false && a > 0.05;
      if (!vis) continue;
      const d = (o as unknown as { depth?: number }).depth ?? 0;
      const own = group ? depth : d;
      const target = tag(o, 'qaTarget');
      if (typeof target === 'string' && 'getBounds' in o) targets.push({ scene: scene.scene.key, id: target, b: box(o as unknown as { getBounds(): Phaser.Geom.Rectangle }), depth: own });
      const cover = tag(o, 'qaCover');
      if (typeof cover === 'string') {
        const rects = tag(o, 'qaCoverRects');
        const list: Rect[] = typeof rects === 'function' ? (rects as () => Rect[])() : 'getBounds' in o ? [box(o as unknown as { getBounds(): Phaser.Geom.Rectangle })] : [];
        for (const r of list) covers.push({ scene: scene.scene.key, kind: cover, b: r.map(Math.round) as Rect, depth: own });
      }
      let inPanel = panel;
      const area = tag(o, 'qaPanel');
      if (typeof area === 'function') {
        const [kind, r] = (area as () => [string, Rect])();
        inPanel = panels.push({ scene: scene.scene.key, kind, b: r.map(Math.round) as Rect }) - 1;
      }
      if (o instanceof Phaser.GameObjects.Container) walk(scene, o.list, vis, own, ++groupId, a, inPanel);
      else if (o instanceof Phaser.GameObjects.Text && o.text.trim()) {
        texts.push({ scene: scene.scene.key, text: o.text, b: box(o), depth: own, group, size: Number.parseFloat(String(o.style.fontSize)) * Math.abs(o.scaleY), ...(inPanel === undefined ? {} : { panel: inPanel, ink: worldInk(o).map(Math.round) as Rect }) });
      } else if (o instanceof Phaser.GameObjects.Image && o.texture?.key && !o.texture.key.startsWith('__') && a > 0.3) {
        const b = box(o);
        if (tag(o, 'qaHero') === true) heroes.push({ scene: scene.scene.key, b, depth: own });
        if (b[2] > 0 && b[0] < GAME_WIDTH && b[3] > 0 && b[1] < GAME_HEIGHT && b[2] - b[0] > 8) images.push({ scene: scene.scene.key, key: o.texture.key, b, depth: own });
      }
    }
  };
  for (const scene of game.scene.getScenes(true)) walk(scene, scene.children.list, true, 0, 0, 1);
  const spots = hookState.room?.spots.map((s) => ({ id: s.id, x: s.x, y: s.y })) ?? hookState.battle?.choice?.spots.map((s) => ({ id: s.word, x: s.x, y: s.y })) ?? [];
  return { texts, images, spots, targets, covers, panels, heroes, hudDepth: DEPTH.speech };
}

/** Objects, tweens and timers alive, for growth from one episode to the next. */
function counts(game: Phaser.Game): Record<string, number> {
  let objects = 0;
  let tweens = 0;
  let timers = 0;
  let listeners = 0;
  for (const s of game.scene.getScenes(false)) {
    walkObjects(s.children?.list ?? [], () => objects++);
    tweens += s.tweens?.getTweens().length ?? 0;
    timers += (s.time as unknown as { _active?: unknown[] })?._active?.length ?? 0;
    for (const n of s.events.eventNames()) listeners += s.events.listenerCount(n);
  }
  return {
    objects,
    tweens,
    timers,
    sceneListeners: listeners,
    gameListeners: game.events.eventNames().reduce((n, e) => n + game.events.listenerCount(e), 0),
    textures: game.textures.getTextureKeys().length,
    busListeners: (voiceBus as unknown as { listeners: Set<unknown> }).listeners.size,
  };
}
