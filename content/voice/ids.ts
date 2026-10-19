/**
 * Voice line ids, derived. The one place an id is spelled.
 *
 * The composer (tools/voice/compose.ts) writes lines under these ids and the
 * game asks for them by the same functions, so a renamed id cannot drift.
 * `npm run voice:lines` fails if a derived id the game uses is missing.
 */

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
 * The bedroom wake-up, said by whichever dad comes in to wake the hero (the
 * episode's primary dad, src/rules/cast.ts), in his own voice whatever his
 * form. Keys: `up`, `good_<hero>`, `helper_<person>`, `bad_<villain>` (any
 * roster id: each villain form has its own threat), `door`, and `hi` for the
 * other dad when he comes in too. Group `core`.
 */
export const WAKERS = ['dada_matt', 'dada_jason'] as const;
export const wakeLine = (waker: string, key: string) => `wake_${waker}_${key}`;

/** Voice group names, so a scene can ask for exactly what it is about to say. */
export const group = {
  core: 'core',
  phonics: 'phonics',
  narrator: (n: string) => `nar_${n}`,
  fighter: (f: string) => `fighter_${f}`,
  /** A person's victory scene lines (item 027): loaded for everyone in the episode. */
  ending: (person: string) => `end_${person}`,
};
