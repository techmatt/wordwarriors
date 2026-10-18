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
export const narratorLine = (narrator: string, key: string) => `nar_${narrator}_${key}`;
export const tauntLine = (fighter: string, key: string) => `taunt_${fighter}_${key}`;
export const ultimateLine = (fighter: string) => `ult_${fighter}`;
/** A fighter calling out one of its own moves: `move_smaug_evil_inferno`. */
export const moveLine = (fighter: string, ability: string) => `move_${fighter}_${ability}`;
export const nameLine = (fighter: string) => `name_${fighter}`;
/** A fighter id is `<character>` for the good version and `<character>_evil` for the evil one. */
export const fighterId = (character: string, evil: boolean) => (evil ? `${character}_evil` : character);

/**
 * The bedroom wake-up, said by whoever comes in to wake the hero: Dada Matt,
 * or Dada Jason when Dada Matt is himself the hero. Keys: `up`, `good_<hero>`,
 * `helper_<character>`, `bad_<villain>`, `door`. Group `core`.
 */
export const WAKERS = ['dada_matt', 'dada_jason'] as const;
export const wakerFor = (hero: string) => (hero === 'dada_matt' ? 'dada_jason' : 'dada_matt');
export const wakeLine = (waker: string, key: string) => `wake_${waker}_${key}`;

/** Voice group names, so a scene can ask for exactly what it is about to say. */
export const group = {
  core: 'core',
  phonics: 'phonics',
  narrator: (n: string) => `nar_${n}`,
  fighter: (f: string) => `fighter_${f}`,
};
