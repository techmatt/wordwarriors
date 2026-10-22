/**
 * The episode's cast draw and its remembering (split from Episode.ts in item
 * 076, which re-exports it): this session's cast options (`?seed=`, `?ally=`
 * and the rest), the cast, quest place, story and line draws, and which of
 * them she meets as her rotations (item 067). No Phaser: unit-tested in
 * tests/unit/episodeDraws.test.ts. The house plan's remembering is
 * `rememberPlan` in `./plans.ts`.
 */

import { FIGHT_BY_ID } from '../../content/battle/fights';
import { personOf } from '../../content/battle/roster';
import { HOME, PLACE_BY_ID } from '../../content/house/house';
import { questFor } from '../../content/house/quests';
import { EPISODE_DEFAULTS } from '../config';
import { DADS, drawCast, type CastOverrides } from '../rules/cast';
import type { Rand } from '../rules/random';
import { drawLines, drawStory, variantKeys, type LineVariants } from '../rules/story';
import { progress } from '../state/progress';
import { helper } from './cast';
import { tauntsSaid } from './lineVariants';
import { episode, freshProgress } from './state';

let castOverrides: CastOverrides = {};
/** The cast's draws (`?seed=`); the fight style draws with it too (`./plans.ts`). */
export let castRand: Rand = Math.random;
let castDefault = !EPISODE_DEFAULTS.randomCast;
let placeOverride: string | null = null;
/** `?fight=<id>`, read by the fight style's draw (`./plans.ts`). */
export let fightOverride: string | null = null;

/**
 * Fix parts of every episode's cast this session (`?ally=`, `?villain=`,
 * `?form=`, `?primary=`, `?secondary=`, `?seed=`, `?cast=default`,
 * `?place=`: BootScene), then recast the current episode.
 */
export function setCastOptions(o: { overrides?: CastOverrides; rand?: Rand; fixed?: boolean; place?: string | null; fight?: string | null }): void {
  if (o.overrides) castOverrides = o.overrides;
  if (o.fight !== undefined) fightOverride = o.fight;
  if (o.rand) castRand = o.rand;
  if (o.fixed !== undefined) castDefault = o.fixed;
  if (o.place !== undefined) placeOverride = o.place;
  castEpisode();
}

/**
 * Draw this episode's cast (src/rules/cast.ts) and its quest place. `picked`
 * fixes roles for this episode only: the parked pick screens' choices, after
 * which the dads' roles, forms and the quest are drawn around them.
 */
export function castEpisode(picked: CastOverrides = {}): void {
  const fixed: CastOverrides = castDefault
    ? {
        ally: EPISODE_DEFAULTS.ally,
        ...(EPISODE_DEFAULTS.randomVillain ? {} : { villain: EPISODE_DEFAULTS.villain }),
        primary: EPISODE_DEFAULTS.primary,
        secondary: false,
        forms: { dada_matt: 'builder', dada_jason: 'chef' },
      }
    : {};
  // A style written for one villain (a story fight, item 107) forces him: `?fight=smaug_story` is Evil Smaug.
  const forced = fightOverride ? FIGHT_BY_ID[fightOverride]?.villain : undefined;
  const overrides = { ...fixed, ...castOverrides, ...(forced ? { villain: forced } : {}), ...picked };
  // Item 067: her recent allies and each dad's recent forms sit out, as her villains do.
  const recentForms = Object.fromEntries(DADS.map((d) => [d, progress.recentOf(`form_${d}`)]));
  const c = drawCast({ hero: EPISODE_DEFAULTS.hero, recent: progress.recentOf('villain'), recentAllies: progress.recentOf('ally'), recentForms, overrides }, castRand);
  const byRole = (d: string) => [overrides.ally, overrides.villain, overrides.hero].some((id) => id && personOf(id) === d);
  drawnFreely = { ally: overrides.ally === undefined, forms: DADS.filter((d) => !overrides.forms?.[d] && !byRole(d)), variants: !castDefault };
  episode.hero = c.hero;
  episode.ally = c.ally;
  episode.villain = c.villain;
  episode.villainWasRandom = !overrides.villain;
  episode.primary = c.primary;
  episode.secondary = c.secondary;
  // The hero cannot also be the ally (she would give herself the gift word).
  if (episode.ally && personOf(episode.ally) === personOf(episode.hero)) episode.ally = null;
  episode.place = placeOverride && (placeOverride === HOME || PLACE_BY_ID[placeOverride]) ? placeOverride : questFor(helper()).place;
  episode.fight = null;
  // The helper's quest line and hub scene (item 037): after the cast, so a
  // seed draws the same cast as before; the default cast always plays the first.
  // Her recent variants of each sit out (item 067).
  const recentVariants = (key: string) => progress.recentOf(key).map(Number);
  episode.story = drawStory(helper(), castRand, castDefault, recentVariants);
  // The wake-up and the villain's lines (item 040): after the story, so a seed's story is unchanged.
  episode.lines = drawLines(episode.villain, castRand, castDefault, recentVariants);
}

/** What the last cast draw chose freely (item 067), so only that is remembered: an override or the default cast is not her rotation. */
let drawnFreely: { ally: boolean; forms: string[]; variants: boolean } = { ally: false, forms: [], variants: false };

/** Whether this episode's cast and its house plan have been remembered (item 067): once each per episode (the plan's in `./plans.ts`). */
export const remembered = { cast: false, plan: false };

/**
 * Remember this episode's cast and story picks across episodes (item 067),
 * as she walks into the bedroom: the cast is drawn more often than episodes
 * are played (at boot, at the title, after the parked pick screens). The villain as before (item
 * 025); the ally, each dad's form she meets, the quest line, hub scene and
 * line variants.
 */
export function rememberCast(): void {
  if (remembered.cast) return;
  remembered.cast = true;
  if (episode.villainWasRandom) progress.villainMet(personOf(episode.villain));
  if (drawnFreely.ally && episode.ally) progress.remember('ally', personOf(episode.ally));
  const roles = [episode.primary, episode.secondary, episode.ally, episode.villain];
  for (const dad of drawnFreely.forms) {
    const form = roles.find((id) => id && personOf(id) === dad);
    if (form) progress.remember(`form_${dad}`, form);
  }
  if (!drawnFreely.variants) return;
  const k = variantKeys(helper(), episode.villain);
  progress.remember(k.quest, String(episode.story.quest));
  progress.remember(k.scene, String(episode.story.scene));
  for (const key of Object.keys(episode.lines) as (keyof LineVariants)[]) progress.remember(k[key], String(episode.lines[key]));
}

/** A new episode: a fresh cast and start state, nothing remembered yet. */
export function resetEpisode(): void {
  castEpisode();
  Object.assign(episode, freshProgress());
  // Last episode's taunt counts go too (item 088): a jump or an F2 past the bedroom, which clears them as well, kept them.
  tauntsSaid.clear();
  remembered.cast = false;
  remembered.plan = false;
}
