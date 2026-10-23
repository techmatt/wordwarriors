/**
 * Minigame debug mode (item 086, Matt): key 0 in a game room (the hub, the
 * warm-up, a side room) turns that room into a launcher, the Debug scene
 * (src/scenes/DebugRoom.ts): the room's own things gone, its door out open,
 * and one object per minigame in the pool. Green at an object plays that
 * game; finishing it brings her back with a check mark on it. Key 0 again
 * restores the room (restarted from its `sceneData`, as the grown-ups page
 * brings a room back).
 *
 * A game played from debug does not count. Its run is a sandbox: the store
 * is held (`ProgressStore.hold`: it records for the game's own sake, saves
 * nothing, and is put back as it was), and the episode and what the draws
 * remember are copied as the run starts and restored as it ends. So no
 * progress, word bag, rotation memory, recent words or recap changes, and the
 * grown-ups page shows none of it.
 *
 * This module is the state and the sandbox; no Phaser.
 */

import { MINIGAMES, SENTENCE_GAMES, type Minigame } from '../rules/minigames';
import { pick } from '../rules/random';
import { progress } from '../state/progress';
import { planRand, remembered } from './draws';
import { debugPlan } from './plans';
import { currentStep, episode, type Slot } from './state';

/** Where debug was turned on: the room to bring back, how it looks, and its door out. */
export interface DebugOrigin {
  /** The room's scene, and the start data that recreates it. */
  key: string;
  data: object;
  /** Its background, her art, and its floor (x, y, w, h). */
  bg: string;
  art: string;
  floor: [number, number, number, number];
  /** A side room's slot: its door out goes back to the hub. Null: the door out is the step's own (`advance`). */
  slot: Slot | null;
}

/** One object per minigame in the pool: the sentence game's frames are one game (`sentence`). */
export interface DebugGame {
  id: string;
  scene: string;
}

export const DEBUG_GAMES: DebugGame[] = [...new Map(MINIGAMES.map((g) => [g.scene, { id: g.kind === 'sentence' ? 'sentence' : g.id, scene: g.scene }])).values()];

/** The rooms key 0 works in: the hub, the entry hall and every minigame's scene, so a new minigame gets it too. */
export const DEBUG_ROOMS = ['Hub', 'Entry', ...new Set(MINIGAMES.map((g) => g.scene))];

interface DebugRun {
  game: string;
  episode: string;
  remembered: string;
}

export const debugMode = {
  on: false,
  origin: null as DebugOrigin | null,
  /** The games finished from this debug room (their objects carry a check mark). */
  done: [] as string[],
  /** The game being played from it, with the episode as it was. */
  run: null as DebugRun | null,
};

/** Told when debug turns on or off (the DEBUG tag, src/input/debugKey.ts). */
let onChange: (on: boolean) => void = () => {};

export function onDebugChange(f: (on: boolean) => void): void {
  onChange = f;
}

export function startDebug(origin: DebugOrigin): void {
  debugMode.on = true;
  debugMode.origin = origin;
  debugMode.done = [];
  debugMode.run = null;
  onChange(true);
}

/** Debug off: returns the room it was turned on in. */
export function stopDebug(): DebugOrigin | null {
  if (debugMode.run) endRun(false);
  const origin = debugMode.origin;
  debugMode.on = false;
  debugMode.origin = null;
  debugMode.done = [];
  onChange(false);
  return origin;
}

/** The attic, or the hub of house part 2: its sentence game is the counter sentence. */
function counterRoom(): boolean {
  const step = currentStep();
  return debugMode.origin?.slot === 'counter' || (step.kind === 'house' && step.part === 2);
}

/**
 * Start the sandbox for game `id` and plan it: returns the scene to start and
 * the slot it plays in. The sentence game draws a frame (a counter frame in
 * the attic); the rest play behind door a.
 */
export function beginRun(id: string, rand: () => number = planRand): { scene: string; slot: Slot } {
  if (debugMode.run) endRun(false);
  let game: Minigame;
  if (id === 'sentence') {
    const use = counterRoom() ? 'counter' : 'fetch';
    const frames = SENTENCE_GAMES.filter((g) => g.slots.includes(use));
    game = pick(frames, rand);
  } else game = MINIGAMES.find((g) => g.id === id)!;
  const slot: Slot = game.slots.includes('fetch') ? 'a' : 'counter';
  debugMode.run = { game: id, episode: JSON.stringify(episode), remembered: JSON.stringify(remembered) };
  progress.hold();
  const plan = debugPlan(game, slot);
  // The game actually planned gets the check mark (a machine with no family to build falls back to a sentence game).
  debugMode.run.game = plan.kind === 'sentence' ? 'sentence' : plan.game;
  // A fresh visit: nothing read, fetched, charged or missed yet, the room not done.
  episode.house.plan = episode.house.plan!.map((p) => (p.slot === slot ? plan : p));
  episode.house.done = [];
  episode.house.misses = {};
  episode.read = [];
  episode.fetched = [];
  episode.charged = null;
  return { scene: plan.scene, slot };
}

/** End the sandbox: the episode, the draws' memory and the store as they were. `finished` checks the game off. */
export function endRun(finished: boolean): void {
  const run = debugMode.run;
  if (!run) return;
  debugMode.run = null;
  const saved = JSON.parse(run.episode) as Record<string, unknown>;
  const ep = episode as unknown as Record<string, unknown>;
  for (const k of Object.keys(ep)) if (!(k in saved)) delete ep[k];
  Object.assign(ep, saved);
  Object.assign(remembered, JSON.parse(run.remembered));
  progress.release();
  if (finished && !debugMode.done.includes(run.game)) debugMode.done.push(run.game);
}
