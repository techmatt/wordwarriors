/**
 * The episode's cast lookups (split from Episode.ts, which re-exports them):
 * who the helper, narrator and waker are, how each character is drawn this
 * episode, and the cast's lines (the quest setup, the hub scene, the wake-up,
 * the villain's taunt and sorry). Pure reads of `episode` (`./state.ts`):
 * no Phaser and no import of Episode.ts (item 076).
 */

import { charArt } from '../../content/art/assets';
import { formFor } from '../../content/battle/forms';
import { CHARACTER_BY_ID, ROSTER, personOf } from '../../content/battle/roster';
import type { CharacterSpec, Taunt } from '../../content/battle/types';
import { HOME, PLACE_BY_ID } from '../../content/house/house';
import { questSetup, type Line } from '../../content/house/quests';
import { hubStory, storyTexts, type HubStory, type HubStoryIds } from '../../content/house/scenes';
import { wakeCastKey } from '../../content/voice/ids';
import { wakeVariant } from '../../content/voice/script';
import { ADULT_HEIGHT } from '../config';
import { helperOf, isGrownUp, wakerOf } from '../rules/cast';
import { pick } from '../rules/random';
import { wordsOf } from '../rules/sentences';
import { BEDROOM_TAUNTS } from '../rules/story';
import { episode, type EpisodeState } from './state';

/** The dad who wakes her (src/rules/cast.ts `wakerOf`), in his form. */
export function waker(state: EpisodeState = episode): string {
  return wakerOf(state);
}

/**
 * The helper (gives the gift word, fills `{helper}` in sentences, takes her on
 * the quest): the ally, or with no ally the dad who woke her. A roster id, so
 * a dad's form, whose abilities may style the gift word's move.
 */
export function helper(state: EpisodeState = episode): string {
  return helperOf(state);
}

/**
 * Who stands beside her at the end (the victory podium and THE END): her ally,
 * or with no ally the dad who woke her in his form, unless he is the villain's
 * own person; else nobody.
 */
export function podiumSecond(state: EpisodeState = episode): string | null {
  return state.ally ?? (personOf(waker(state)) !== personOf(state.villain) ? castId(waker(state), state) : null);
}

/**
 * Who gives instructions: the helper's person (narrator lines are voiced per
 * person: lifter Dada Matt narrates as `dada_matt`).
 */
export function narrator(state: EpisodeState = episode): string {
  return personOf(helper(state));
}

/**
 * The roster id `id` plays in this episode: a person's form when they are in
 * the cast (`dada_matt` → `dada_matt_cyber` when Dada Matt is the cyberdecker
 * today), else `id`. The voice speaks as the person; this is who to draw.
 */
export function castId(id: string, state: EpisodeState = episode): string {
  const person = personOf(id);
  const inCast = [state.ally, state.villain, state.primary, state.secondary, state.hero].find((c) => c && personOf(c) === person);
  return inCast ?? id;
}

/**
 * The image `id` appears as in this episode, once she is awake: its outfit
 * (content/battle/forms.ts: Julia the chef when Dada Jason is the ally), else
 * the roster image of the form it plays (`castId`). The title, the pick
 * screens and Julia asleep in bed use `charArt` directly: the default images.
 */
export function castArt(id: string, evil = false, state: EpisodeState = episode): string {
  const c = castId(id, state);
  if (evil) return charArt(c, true);
  return formFor(c, state)?.art ?? charArt(c, false);
}

/**
 * How tall `id` stands beside the hero outside battles (item 028): the size
 * of the form it plays over hers, kept between 0.7 and 1.3 so a dragon still
 * fits a room. A dad is grown-up height beside her, `ADULT_HEIGHT` (item
 * 034); Scar and Ellie a little shorter.
 */
export function castScale(id: string, state: EpisodeState = episode): number {
  const c = CHARACTER_BY_ID[castId(id, state)];
  const hero = CHARACTER_BY_ID[castId(state.hero, state)];
  if (!c || !hero) return 1;
  if (isGrownUp(c.id) && !isGrownUp(hero.id)) return ADULT_HEIGHT;
  return Math.min(1.3, Math.max(0.7, c.good.size / hero.good.size));
}

/** The name-free face card for `id` in this episode (names as sight words): its outfit's, else its form's `face_<id>`. */
export function castFace(id: string, state: EpisodeState = episode): string {
  const c = castId(id, state);
  return formFor(c, state)?.face ?? `face_${c}`;
}

/** The quest's setup line this episode (its id and words), said in the bedroom in the helper's voice: theirs, or the narrator's "right here at home". */
function questSetupOf(state: EpisodeState = episode): { id: string; line: Line } {
  return questSetup(helper(state), narrator(state), state.story.quest);
}

/** The quest's setup line id, for the bedroom. */
export function questSetupLine(state: EpisodeState = episode): string {
  return questSetupOf(state).id;
}

/** The hub scene this episode (item 037, content/house/scenes.ts): the helper's lines that give her the gift word. */
export function hubScene(state: EpisodeState = episode): { story: HubStory; ids: HubStoryIds } {
  return hubStory(helper(state), narrator(state), state.story.scene);
}

/**
 * Every word the helper's story says before the side rooms: the quest line
 * (the bedroom) and the hub scene. None may be a key word, a pad or the gift.
 */
export function storyWords(state: EpisodeState = episode): string[] {
  const q = questSetupOf(state).line;
  return [q.text, q.say ?? '', ...storyTexts(hubScene(state).story)].flatMap((s) => wordsOf(s));
}

/** True when the episode trains somewhere other than the house. */
export function away(state: EpisodeState = episode): boolean {
  return state.place !== HOME && Boolean(PLACE_BY_ID[state.place]);
}

/** The waker's wake line `key` (`up`, `good_<hero>`, `door`) in this episode's variant: `wake_<waker>_up_2`. */
export function wakeKey(key: 'up' | 'good' | 'door', state: EpisodeState = episode): string {
  const n = state.lines[key];
  return key === 'good' ? wakeVariant(wakeCastKey('good', personOf(state.hero)), n) : wakeVariant(key, n);
}

/** The villain's far-off bedroom taunt this episode: one of its first `BEDROOM_TAUNTS` (item 040). */
export function bedroomTaunt(state: EpisodeState = episode): Taunt | undefined {
  const t = CHARACTER_BY_ID[state.villain]?.evil.taunts ?? [];
  return t[Math.min(state.lines.taunt, BEDROOM_TAUNTS, t.length) - 1];
}

/** The villain's sorry after battle 2 and its line in the victory scene, this episode's variants (item 040). */
export function reformedOf(which: 'sorry' | 'ending', state: EpisodeState = episode): Taunt | undefined {
  const r = CHARACTER_BY_ID[state.villain]?.reformed[which] ?? [];
  return r[Math.min(state.lines[which], r.length) - 1];
}

export function villainSpec(): CharacterSpec {
  return CHARACTER_BY_ID[episode.villain]!;
}

/** Pick a random villain (any form) that is not the hero's or ally's own person: the pick screen's surprise. */
export function randomVillain(rand = Math.random): string {
  const pool = ROSTER.filter((c) => personOf(c.id) !== personOf(episode.hero) && (!episode.ally || personOf(c.id) !== personOf(episode.ally)));
  return pick(pool, rand).id;
}
