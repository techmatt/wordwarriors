/**
 * One episode, start to finish: who is fighting, what has been fetched, and
 * which step comes next.
 *
 *   title → (hero → ally → villain picks, off by default) → bedroom
 *   → the entry hall's warm-up ("before we head out, let's grab the ...")
 *   → house part 1 (hub: the gift word, two side-room doors, a minigame each
 *     from the pool, one a phonics game while FORCE_PHONICS_ROOM; out the
 *     front door) → map → battle part 1 (the villain's ultimate wins)
 *   → map → house part 2 (the counter sentence in the attic) → map
 *   → battle part 2 (the counter wins) → map → victory (the victory scene,
 *     then the recap, then THE END, where Dad's 2 goes on) → title
 *
 * Scenes never decide where to go next: they call `advance(scene)` when they
 * are done and this module starts the next step's scene, by the journey map
 * (`Journey`) where the arrows say. Inside a house step the hub and its side
 * rooms pass control between themselves (`enterRoom`, `backToHub`); the
 * front door is the hub's `advance()`.
 *
 * The four v0.1 prep games (Sound → Letter, Blend Path, Word → Picture, Spell
 * the Spell) are parked: their scenes and `prep`/`spell` step kinds stay so
 * `?scene=sound` etc. still open them, but no episode includes them.
 *
 * This module is the flow. The state (`episode`, the step list) lives in
 * `./state.ts`, the cast draw and its remembering in `./draws.ts`, the cast
 * lookups in `./cast.ts`, the episode's other draws (house plan, warm-up,
 * gift, moves, counter, fight style, ending, the journey's stops) in
 * `./plans.ts`; all are re-exported here, so importers only ever name this
 * module. None of them imports this one, and none needs Phaser (item 076).
 * Two siblings are not re-exported and are imported directly: `./debug.ts`
 * (minigame debug mode's sandboxed runs, item 086) and `./lineVariants.ts`
 * (narrator line variants in turn and `tauntsSaid`, item 087).
 */

import type Phaser from 'phaser';

import { personOf } from '../../content/battle/roster';
import { group } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { endingPeople } from '../rules/endings';
import { voiceBank } from '../voice/VoiceBank';
import { startScene } from '../art/gate';
import { narrator } from './cast';
import { debugMode, endRun, stopDebug } from './debug';
import { rememberCast, resetEpisode } from './draws';
import { planFor, rememberPlan } from './plans';
import { countEpisode, currentStep, episode, sceneForStep, steps, type EpisodeState, type Slot, type Step } from './state';

export { currentStep, episode, isStepKind, sceneForStep, steps, type EpisodeState, type PrepGame, type Slot, type Step } from './state';
export { castEpisode, remembered, resetEpisode, setCastOptions } from './draws';

export {
  away,
  bedroomTaunt,
  castArt,
  castFace,
  castId,
  castScale,
  helper,
  hubScene,
  narrator,
  podiumSecond,
  questSetupLine,
  randomVillain,
  reformedOf,
  villainSpec,
  wakeKey,
  waker,
} from './cast';
export { counterArt, counterWord, drawEnding, fightStyle, giftWord, grabPlan, housePlan, journeyStops, movePlan, namedCounter, planFor } from './plans';

/** Steps that get the journey map first. */
const JOURNEY_BEFORE: Step['kind'][] = ['battle', 'victory'];

/** Tests may turn the map off to save time; the game never does. */
const skipJourney = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).has('nojourney');

/** Voice groups the current episode will need from here on. */
export function episodeGroups(): string[] {
  // In decode order (item 062: one queue). The letter sounds first: a bridge stone's held sound does not wait for its decode.
  const g = [group.core, group.phonics, group.narrator(narrator())];
  g.push(group.fighter(episode.hero), group.fighter(`${episode.villain}_evil`));
  if (episode.ally) g.push(group.fighter(episode.ally));
  // The victory scene (item 027): everyone in it says a line in their own voice.
  for (const id of endingPeople(episode)) g.push(group.ending(personOf(id)));
  return [...new Set(g)];
}

/** Start the scene for the current step. */
export function startStep(scene: Phaser.Scene): void {
  const step = currentStep();
  voiceBus.hush();
  const key = sceneForStep(step);
  // Not for the title: it draws a fresh cast as it opens, and its one line is
  // core (item 039: it decoded the old cast's narrator, ~500 clips, for nothing).
  if (step.kind !== 'title') {
    // A new episode: let the last one's voices go first.
    if (step.kind === 'bedroom') voiceBank.retain(episodeGroups());
    void voiceBank.loadGroups(episodeGroups());
  }
  startScene(scene, key, { step });
}

/** From the hub into a side room: the scene of the minigame drawn for it (src/rules/minigames.ts). */
export function enterRoom(scene: Phaser.Scene, slot: Slot): void {
  voiceBus.hush();
  startScene(scene, planFor(slot).scene, { step: currentStep(), slot });
}

/** From a side room back to the hub, standing at that room's door. */
export function backToHub(scene: Phaser.Scene, from: Slot): void {
  voiceBus.hush();
  if (debugMode.run) return debugBack(scene, true);
  startScene(scene, 'Hub', { step: currentStep(), from });
}

/**
 * Out of a game played from minigame debug mode (item 086, ./debug.ts): the
 * sandbox ends (the episode and the store as they were) and the debug room
 * comes back, the game checked off when `finished`.
 */
export function debugBack(scene: Phaser.Scene, finished: boolean): void {
  voiceBus.hush();
  endRun(finished);
  startScene(scene, 'Debug');
}

/** The current step is done; go to the next one. */
export function advance(scene: Phaser.Scene): void {
  // A game played from debug mode (F2 in it) goes back to the debug room, unfinished.
  if (debugMode.run) return debugBack(scene, false);
  // F2 in the debug room: on, as its door would, with debug off.
  if (debugMode.on) stopDebug();
  episode.stepIndex++;
  // The cast is drawn more often than episodes are played (at boot, at the
  // title, and again after the parked pick screens): her villain (and since
  // item 067 the rest of her rotations) counts as met only as she walks into
  // the bedroom from the title or the last pick, the cast she really plays.
  if (currentStep().kind === 'bedroom') rememberCast();
  rememberPlan();
  if (episode.stepIndex >= steps().length) {
    // progress.episodeDone() ran as the victory scene opened (EndingScene).
    countEpisode();
    resetEpisode();
  }
  // The battles and the victory are reached by a short hop along the journey
  // map, so she can see where she is in the episode and what comes next. So is
  // the run home after the retreat (house part 2): "back home, he still waits".
  const next = currentStep();
  if ((JOURNEY_BEFORE.includes(next.kind) || (next.kind === 'house' && next.part === 2)) && !skipJourney) {
    voiceBus.hush();
    void voiceBank.loadGroups(episodeGroups());
    startScene(scene, 'Journey');
    return;
  }
  startStep(scene);
}

/**
 * Jump into a step directly (dev F-keys, `?scene=`), with a plausible episode
 * around it. Parked steps (alarm, prep, retreat, spell) are not in the list,
 * so they start on their own with the episode as it is. stepIndex is left
 * alone (0, the title, after a boot), so when a parked scene finishes its
 * advance() runs on into the bedroom, carrying whatever state it left behind.
 */
export function jumpTo(scene: Phaser.Scene, kind: Step['kind'], extra: Partial<EpisodeState> = {}, part: 1 | 2 = 1): void {
  Object.assign(episode, extra);
  const list = steps();
  const i = list.findIndex((s) => s.kind === kind && (!('part' in s) || s.part === part));
  if (i < 0) {
    // A parked pick (pickScreens off) is the hero pick: a pick with no `what`
    // would fall through to the villain branch.
    const parked: Step =
      kind === 'prep' ? { kind: 'prep', game: episode.prep[0]!, index: 0 }
        : kind === 'pick' ? { kind: 'pick', what: 'hero' }
          : ({ kind } as Step);
    voiceBus.hush();
    void voiceBank.loadGroups(episodeGroups());
    startScene(scene, sceneForStep(parked), { step: parked });
    return;
  }
  episode.stepIndex = i;
  startStep(scene);
}
