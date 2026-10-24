/**
 * Voice line ids, derived. The one place an id is spelled.
 *
 * The composer (tools/voice/compose.ts) writes lines under these ids and the
 * game asks for them by the same functions, so a renamed id cannot drift.
 * `npm run voice:lines` only refuses duplicate ids; what guards a missing one is
 * tests/unit/rules.test.ts, which builds every derived id the game asks for with
 * these same functions and checks the composer writes it and the manifest has it.
 */

import { DADS } from '../battle/roster/dads.js';

/**
 * A voiced line's words, wherever content declares one (quests, scenes,
 * endings, fights, taunts, templates): `text` shown and captioned, `say` the
 * spoken form when edge-tts needs help (same word count).
 */
export interface SpokenLine {
  text: string;
  say?: string;
}

/** The fixed narrator before an ally exists, and whenever there is none. */
export const DEFAULT_NARRATOR = 'dada_matt';

/** Letter sound placeholders and word confirmations are said in Matt's voice; his recordings replace them. */
export const PHONICS_SPEAKER = 'phonics';

export const letterSoundLine = (letter: string) => `letter_${letter}_sound`;
export const wordLine = (word: string) => `word_${word}`;
/** The word machine (item 026): a rime said alone (`rime_at`), and a silly word a wrong tile makes (`silly_zat`). */
export const rimeLine = (rime: string) => `rime_${rime}`;
export const sillyLine = (word: string) => `silly_${word}`;
export const narratorLine = (narrator: string, key: string) => `nar_${narrator}_${key}`;

/** A line Dada Matt says before the ally is picked (`CORE_LINES` in script.ts): `core_title`. */
export const coreLine = (key: string) => `core_${key}`;
/**
 * Narrator keys composed per something (the template lists in script.ts):
 * per hero person (`alarm_hero_julia`), per villain roster id (`need_item_tiamat`),
 * per move word (`use_move_ice`, `gift_word_zap`). Wrap in `narratorLine`.
 */
export type HeroKind = 'alarm_hero';
export type VillainKind = 'alarm_villain' | 'need_item' | 'made_item' | 'need_counter' | 'got_counter';
export type MoveKind = 'use_move' | 'gift_word' | 'not_move' | 'was_move' | 'find_move';
export const heroKey = (kind: HeroKind, hero: string) => `${kind}_${hero}`;
export const villainKey = (kind: VillainKind, villain: string) => `${kind}_${villain}`;
export const moveKey = (kind: MoveKind, word: string) => `${kind}_${word}`;
/**
 * `moveKey` read back off a whole line id: the word in `nar_dada_matt_find_move_zap` is `zap`,
 * for the `kinds` given; undefined for any other line (the battle's caption hides that word).
 */
export function moveKeyWord(id: string, kinds: readonly MoveKind[]): string | undefined {
  return new RegExp(`_(?:${kinds.join('|')})_([a-z]+)$`).exec(id)?.[1];
}
/** A fight style's own beat line (item 031, content/battle/fights.ts): `fight_race_start`. */
export const fightKey = (fight: string, beat: string) => `fight_${fight}_${beat}`;
/**
 * A story fight's line (item 107, content/battle/stories/): the villain's
 * `story_smaug_boast`; Dad's or the ally's per person, `story_smaug_fire_dad_dada_matt`.
 * Groups `group.story(story)` and `group.story(story, person)`: loaded only for a story fight, only the people in it.
 */
export const storyLine = (story: string, key: string, person?: string) => (person ? `story_${story}_${key}_${person}` : `story_${story}_${key}`);
export const tauntLine = (fighter: string, key: string) => `taunt_${fighter}_${key}`;
export const ultimateLine = (fighter: string) => `ult_${fighter}`;
/** A fighter calling out one of its own moves: `move_smaug_evil_inferno`. */
export const moveLine = (fighter: string, ability: string) => `move_${fighter}_${ability}`;
export const nameLine = (fighter: string) => `name_${fighter}`;
/** A beaten villain, good again, in the good version's voice: `reformed_tiamat_sorry`. */
export const reformedLine = (character: string, key: string) => `reformed_${character}_${key}`;
/** A fighter id is `<character>` for the good version and `<character>_evil` for the evil one. */
export const fighterId = (character: string, evil: boolean) => (evil ? `${character}_evil` : character);
/**
 * A victory scene's line (item 027, content/house/endings.ts) in a person's own
 * voice: `end_julia_picnic_cheer`, `end_dada_jason_dessert_fit`. Group `end_<person>`.
 */
export const endingLine = (person: string, scene: string, key: string) => `end_${person}_${scene}_${key}`;

/**
 * A hub scene's line (item 037, content/house/scenes.ts), said by the helper
 * (a roster id: each dad form has its own scenes) in its person's voice:
 * `hub_dada_jason_2_line1`, `hub_ellie_1_circle`. Group: the narrator group
 * of the owner's person, who is the episode's narrator whenever it helps.
 */
export const hubLine = (owner: string, n: number, key: string) => `hub_${owner}_${n}_${key}`;
/** The fallback hub scene's key, for a helper with no scene of their own: `hub_any_1_circle`. Wrap in `narratorLine`. */
export const hubAnyKey = (n: number, key: string) => `hub_any_${n}_${key}`;

/** A quest's setup line (content/house/quests.ts), n from 1: `quest_<owner>_<n>`. */
export const questLine = (owner: string, n: number) => `quest_${owner}_${n}`;
/** The home quest's line `n` in a narrator's voice: `nar_<narrator>_quest_home_<n>`. */
export const homeQuestLine = (narrator: string, n: number) => narratorLine(narrator, `quest_home_${n}`);

/** A sentence frame's prefix line (content/phonics/sentences.ts): `sent_<frame>` or `sent_<frame>_<character>`. */
export const sentenceLine = (frame: string, name: string | null) => (name ? `sent_${frame}_${name}` : `sent_${frame}`);

/**
 * A line the caption box never shows (src/ui/Caption.ts): every `letter_` line
 * (`letterSoundLine`) and every `sentenceLine`.
 */
export const uncaptioned = (id: string) => id.startsWith('letter_') || id.startsWith('sent_');

/**
 * The bedroom wake-up, said by whichever dad comes in to wake the hero (the
 * episode's primary dad, src/rules/cast.ts), in his own voice whatever his
 * form. Keys: `up`, `good_<hero>`, `helper_<person>`, `bad_<villain>` (any
 * roster id: each villain form has its own threat), `door`, and `hi` for the
 * other dad when he comes in too. Group `core`. The wakers are the dads,
 * `DADS` in content/battle/roster/dads.ts.
 */
export const WAKERS = DADS;
export const wakeLine = (waker: string, key: string) => `wake_${waker}_${key}`;
/** A wake key composed per cast member (before any variant suffix): `good_julia`, `helper_ellie`, `bad_tiamat`. */
export const wakeCastKey = (kind: 'good' | 'helper' | 'bad', id: string) => `${kind}_${id}`;

/** Voice group names, so a scene can ask for exactly what it is about to say. */
export const group = {
  core: 'core',
  phonics: 'phonics',
  narrator: (n: string) => `nar_${n}`,
  fighter: (f: string) => `fighter_${f}`,
  /** A story fight's lines (item 107): the villain's (`story_<story>`), and one person's Dad and ally lines (`story_<story>_<person>`). */
  story: (story: string, person?: string) => (person ? `story_${story}_${person}` : `story_${story}`),
  /** A person's victory scene lines (item 027): loaded for everyone in the episode. */
  ending: (person: string) => `end_${person}`,
};
