/**
 * One episode, start to finish: who is fighting, what has been made, and which
 * step comes next.
 *
 *   title → hero → ally → villain → alarm → prep 1 → prep 2 → battle part 1
 *   → retreat → spell the spell → battle part 2 → victory → title
 *
 * Scenes never decide where to go next: they call `advance(scene)` when they
 * are done and this module starts the next step's scene. That keeps the flow
 * in one readable list and lets `?scene=` jump straight into any step with a
 * plausible episode around it (`fastEpisode`).
 */

import Phaser from 'phaser';

import { CHARACTER_BY_ID, ROSTER } from '../../content/battle/roster';
import type { CharacterSpec } from '../../content/battle/types';
import { DEFAULT_NARRATOR, group } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { progress } from '../state/progress';
import { voiceBank } from '../voice/VoiceBank';

export type PrepGame = 'sound' | 'blend' | 'picture';

/** What each prep game makes, which the battle then uses. */
export const PREP_MAKES: Record<PrepGame, 'gem' | 'ammo' | 'helper'> = {
  sound: 'gem',
  blend: 'ammo',
  picture: 'helper',
};

export type Step =
  | { kind: 'title' }
  | { kind: 'pick'; what: 'hero' | 'ally' | 'villain' }
  | { kind: 'alarm' }
  | { kind: 'prep'; game: PrepGame; index: number }
  | { kind: 'battle'; part: 1 | 2 }
  | { kind: 'retreat' }
  | { kind: 'spell' }
  | { kind: 'victory' };

export interface EpisodeState {
  hero: string;
  ally: string | null;
  villain: string;
  villainWasRandom: boolean;
  prep: PrepGame[];
  made: { gem: boolean; ammo: boolean; helper: boolean; item: boolean };
  /** Words she read (or spelled) right this episode, in order, for the victory recap. */
  read: string[];
  stepIndex: number;
}

const SCENE_FOR: Record<Step['kind'], string> = {
  title: 'Title',
  pick: 'Pick',
  alarm: 'Alarm',
  prep: 'Prep',
  battle: 'Battle',
  retreat: 'Retreat',
  spell: 'Spelling',
  victory: 'Victory',
};

export function prepScene(game: PrepGame): string {
  return game === 'sound' ? 'SoundToLetter' : game === 'blend' ? 'BlendPath' : 'WordToPicture';
}

let episodeCount = 0;

function choosePrep(): PrepGame[] {
  // Rotate which two of the three prep games an episode gets.
  const all: PrepGame[][] = [
    ['sound', 'picture'],
    ['blend', 'sound'],
    ['picture', 'blend'],
  ];
  return all[episodeCount % all.length]!;
}

export const episode: EpisodeState = {
  hero: 'julia',
  ally: null,
  villain: 'smaug',
  villainWasRandom: false,
  prep: choosePrep(),
  made: { gem: false, ammo: false, helper: false, item: false },
  read: [],
  stepIndex: 0,
};

export function steps(state: EpisodeState = episode): Step[] {
  return [
    { kind: 'title' },
    { kind: 'pick', what: 'hero' },
    { kind: 'pick', what: 'ally' },
    { kind: 'pick', what: 'villain' },
    { kind: 'alarm' },
    { kind: 'prep', game: state.prep[0]!, index: 0 },
    { kind: 'prep', game: state.prep[1]!, index: 1 },
    { kind: 'battle', part: 1 },
    { kind: 'retreat' },
    { kind: 'spell' },
    { kind: 'battle', part: 2 },
    { kind: 'victory' },
  ];
}

export function currentStep(): Step {
  return steps()[episode.stepIndex] ?? { kind: 'title' };
}

/**
 * Who gives instructions: the ally, or Dada Matt with no ally. When Dada Matt
 * is himself the hero and there is no ally, Dada Jason narrates instead, so
 * nobody says "Bad news, Dada Matt!" in Dada Matt's own voice.
 */
export function narrator(state: EpisodeState = episode): string {
  if (state.ally) return state.ally;
  return state.hero === DEFAULT_NARRATOR ? 'dada_jason' : DEFAULT_NARRATOR;
}

export function heroSpec(): CharacterSpec {
  return CHARACTER_BY_ID[episode.hero]!;
}
export function villainSpec(): CharacterSpec {
  return CHARACTER_BY_ID[episode.villain]!;
}

export function resetEpisode(): void {
  episode.ally = null;
  episode.villainWasRandom = false;
  episode.prep = choosePrep();
  episode.made = { gem: false, ammo: false, helper: false, item: false };
  episode.read = [];
  episode.stepIndex = 0;
}

/** Pick a random villain that is not the hero's or ally's own character. */
export function randomVillain(rand = Math.random): string {
  const pool = ROSTER.filter((c) => c.id !== episode.hero && c.id !== episode.ally);
  return pool[Math.floor(rand() * pool.length)]!.id;
}

/** Voice groups the current episode will need from here on. */
export function episodeGroups(): string[] {
  const g = [group.core, group.phonics, group.narrator(narrator())];
  g.push(group.fighter(episode.hero), group.fighter(`${episode.villain}_evil`));
  if (episode.ally) g.push(group.fighter(episode.ally));
  return g;
}

/** Start the scene for the current step. */
export function startStep(scene: Phaser.Scene): void {
  const step = currentStep();
  voiceBus.hush();
  const key = step.kind === 'prep' ? prepScene(step.game) : SCENE_FOR[step.kind];
  void voiceBank.loadGroups(episodeGroups());
  scene.scene.start(key, { step });
}

/** The current step is done; go to the next one. */
export function advance(scene: Phaser.Scene): void {
  episode.stepIndex++;
  if (episode.stepIndex >= steps().length) {
    progress.episodeDone();
    episodeCount++;
    resetEpisode();
  }
  startStep(scene);
}

/** Jump into a step directly (dev F-keys, `?scene=`), with a plausible episode around it. */
export function jumpTo(scene: Phaser.Scene, kind: Step['kind'], extra: Partial<EpisodeState> = {}, part: 1 | 2 = 1): void {
  Object.assign(episode, extra);
  const list = steps();
  const i = list.findIndex((s) => s.kind === kind && (s.kind !== 'battle' || s.part === part));
  episode.stepIndex = Math.max(0, i);
  startStep(scene);
}
