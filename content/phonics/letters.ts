/**
 * The letter sounds, one per letter, each its own voice line.
 *
 * Julia knows letter NAMES and not letter SOUNDS, so the game only ever says
 * sounds. edge-tts cannot say a bare phoneme (Seraphina's spike, `git show
 * ca4eee9:scratch/voice_pipeline_spike_report.md` in that repo, 22 renderings of
 * /s/: unvoiced consonants come back as the letter name, "ess"; SSML phoneme
 * tags are impossible), so these are placeholders by sound class, as Matt ruled
 * on 2026-10-18:
 *
 * - voiced continuants are doubled into a hum ("Mmm"),
 * - stops and fricatives get a schwa ("Buh", "Suh").
 *
 * Measured 2026-10-18 (word-boundary span, GuyNeural at -20%): only "Mmm"
 * survives doubling. "Lll", "Nnn", "Rrr", "Vvv", "Zzz", "Sss" all span
 * 1.1–1.3 s against 0.5–0.7 s for a single syllable, i.e. edge-tts reads them
 * as letter names. So l, n, r, v, z take a schwa spelling too ("Luh", "Err"),
 * a deviation from the ruling forced by the voice, recorded in the report.
 * Short vowels are the nearest syllable edge-tts says as a sound.
 *
 * Every sound is a separate line id (`letterSoundLine`), so a real recorded
 * phoneme clip replaces one through the clip-override path without any game
 * change. `say` is the placeholder spelling handed to edge-tts.
 */

export type SoundClass = 'continuant' | 'stop' | 'fricative' | 'vowel' | 'glide';

export interface LetterSound {
  letter: string;
  /** What edge-tts is asked to say. A placeholder until Matt records the real phoneme. */
  say: string;
  cls: SoundClass;
  /** An example word with the sound in it: an authoring note for whoever records the sound; the game does not read it. */
  example: string;
  /** Why the placeholder is spelled as it is: an authoring note; the game does not read it. */
  note?: string;
  /**
   * Item 085: edge-tts says this sound right only inside a word, so it is asked
   * for the carrier word `say` (vowel first) and the build keeps the opening
   * vowel, up to where loudness falls `keepDb` under its peak
   * (tools/voice/carrier.ts). The line's text stays the placeholder spelling.
   */
  carrier?: { say: string; keepDb: number };
}

export const LETTERS: LetterSound[] = [
  {
    letter: 'a', say: 'Aah', cls: 'vowel', example: 'cat',
    note: 'short a as in cat; edge-tts says "Aah" as the O of HOT, so the vowel is cut from "Add" (item 085: F1 800 / F2 1,700 Hz)',
    carrier: { say: 'Add', keepDb: 6 },
  },
  { letter: 'b', say: 'Buh', cls: 'stop', example: 'bat' },
  { letter: 'c', say: 'Kuh', cls: 'stop', example: 'cat', note: 'hard c, same sound as k' },
  { letter: 'd', say: 'Duh', cls: 'stop', example: 'dog' },
  { letter: 'e', say: 'Eh', cls: 'vowel', example: 'bed' },
  { letter: 'f', say: 'Fuh', cls: 'fricative', example: 'fox' },
  { letter: 'g', say: 'Ghuh', cls: 'stop', example: 'gum', note: '"Guh" spans 1.23 s, i.e. read as letters; "Ghuh" 0.55 s' },
  { letter: 'h', say: 'Huh', cls: 'fricative', example: 'hat' },
  { letter: 'i', say: 'Ihh', cls: 'vowel', example: 'pig', note: '"Ih" spans 0.95 s (letters?); "Ihh" 0.52 s' },
  { letter: 'j', say: 'Juh', cls: 'stop', example: 'jet' },
  { letter: 'k', say: 'Kuh', cls: 'stop', example: 'kit' },
  { letter: 'l', say: 'Luh', cls: 'continuant', example: 'log', note: 'doubled "Lll" spans 1.26 s: read as letter names' },
  { letter: 'm', say: 'Mmm', cls: 'continuant', example: 'map', note: 'the one hum Seraphina measured: 0.36 s of clean /m/' },
  { letter: 'n', say: 'Nuh', cls: 'continuant', example: 'net', note: 'doubled "Nnn" spans 1.08 s: read as letter names' },
  { letter: 'o', say: 'Ah', cls: 'vowel', example: 'dog', note: 'short o in American English is /ɑ/' },
  { letter: 'p', say: 'Puh', cls: 'stop', example: 'pig' },
  { letter: 'q', say: 'Kwuh', cls: 'stop', example: 'queen' },
  { letter: 'r', say: 'Err', cls: 'continuant', example: 'rat', note: 'doubled "Rrr" spans 1.26 s: read as letter names; "Err" 0.70 s' },
  { letter: 's', say: 'Suh', cls: 'fricative', example: 'sun', note: 'Seraphina spike: best stand-in for /s/ was "Suh"; "Sss" came back as "ess"' },
  { letter: 't', say: 'Tuh', cls: 'stop', example: 'ten' },
  { letter: 'u', say: 'Uh', cls: 'vowel', example: 'cup' },
  { letter: 'v', say: 'Vuh', cls: 'continuant', example: 'van', note: 'doubled "Vvv" spans 1.26 s: read as letter names' },
  { letter: 'w', say: 'Wuh', cls: 'glide', example: 'web' },
  { letter: 'x', say: 'Kuhs', cls: 'fricative', example: 'fox', note: 'final /ks/; "Ks" spans 1.01 s (kay-ess); "Kuhs" 0.70 s' },
  { letter: 'y', say: 'Yuh', cls: 'glide', example: 'yak' },
  { letter: 'z', say: 'Zuh', cls: 'continuant', example: 'zip', note: 'doubled "Zzz" spans 1.25 s: read as letter names' },
];

export const LETTER_BY_CHAR: Record<string, LetterSound> = Object.fromEntries(
  LETTERS.map((l) => [l.letter, l]),
);

/**
 * The digraphs' sounds (item 037): SH CH TH CK are one sound each, so a hint
 * that sounds a word out says SHIP as SH, I, P, never S, H, I, P (`unitsOf` in
 * content/phonics/bank.ts). `letter` is the two letters; each is its own line
 * (`letterSoundLine('sh')` is `letter_sh_sound`), a placeholder by sound class
 * like the single letters, until Matt records them.
 */
export const DIGRAPH_SOUNDS: LetterSound[] = [
  { letter: 'sh', say: 'Shh', cls: 'fricative', example: 'ship', note: 'a hush; the one fricative edge-tts says as a sound, being a word' },
  { letter: 'ch', say: 'Chuh', cls: 'stop', example: 'chick', note: 'an affricate; a schwa like the stops' },
  { letter: 'th', say: 'Thuh', cls: 'fricative', example: 'moth', note: 'voiceless as in moth; "Thuh" may come back voiced, as in "the"' },
  { letter: 'ck', say: 'Kuh', cls: 'stop', example: 'duck', note: 'the same sound as c and k, its own line so a recording can differ' },
  // Item 056: NG (KING, RING, WING; never first) and voiced TH (THIS, THAT: no
  // familiar picture, so no bank word has it yet; a word marks it by hand with
  // `spelled`, as `th_voiced`, since TH alone is the voiceless MOTH sound).
  // QU is a unit too, sounding as Q ("Kwuh"), so it needs no line of its own.
  { letter: 'ng', say: 'Ngg', cls: 'continuant', example: 'king', note: 'the hum at the end of KING; a placeholder, edge-tts may read it as letters' },
  { letter: 'th_voiced', say: 'Thuh', cls: 'fricative', example: 'this', note: 'voiced as in THIS; the same placeholder as TH until Matt records the two apart' },
];

/**
 * Untaught sounds (item 058, Matt's ruling): a familiar picture word may hold
 * a sound she has not been taught, a long OO, a schwa, a letter said by its
 * name. The bank spells such a word by hand (`spelled`), each unit with its
 * sound, and each of these sounds is its own line (`letter_long_oo_sound`)
 * like the long vowels, a placeholder until Matt records it. A word holding
 * one is a long-path word: no short-vowel tag, level 3 (`late`), never in a
 * word family or on the bridge.
 *
 * - `long_oo`: ZOO, IGLOO;
 * - `schwa`: the lazy "uh" of ZEBRA's A, OCTOPUS's second O and U,
 *   UMBRELLA's A (the same placeholder as short U until recorded apart);
 * - `x_name`: X-RAY's X, which says the letter's name, "ecks": no familiar
 *   picture starts with X's own KS sound.
 */
export const UNTAUGHT_SOUNDS: LetterSound[] = [
  { letter: 'long_oo', say: 'Oo', cls: 'vowel', example: 'zoo', note: 'long oo, the vowel of ZOO and the end of IGLOO' },
  { letter: 'schwa', say: 'Uh', cls: 'vowel', example: 'zebra', note: 'the schwa, the A of ZEBRA; the same placeholder as short u until Matt records the two apart' },
  { letter: 'x_name', say: 'Ecks', cls: 'fricative', example: 'xray', note: 'X said by its name, the X of X-RAY; not the KS sound at the end of FOX' },
];

/**
 * Long vowels (item 048), for the bank's hand-spelled words: KEY is K, long E
 * (on its EY), YOYO is Y, long O, twice. `letter` is the sound's key, not
 * letters (`letterSoundLine('long_e')` is `letter_long_e_sound`), each its own
 * line, a placeholder until Matt records them. A long vowel says its letter's
 * name, so edge-tts gets the name's spelling, as in LETTER_NAMES.
 *
 * Item 058: the list ends with UNTAUGHT_SOUNDS, so every hand-spelled sound
 * gets its `letter_<key>_sound` line from one list (the voice composer and
 * the line test read it); the coverage audit's long rows skip the untaught ones.
 */
export const LONG_VOWEL_SOUNDS: LetterSound[] = [
  { letter: 'long_e', say: 'Ee', cls: 'vowel', example: 'key', note: 'long e, the vowel of KEY (spelled EY there)' },
  { letter: 'long_o', say: 'Oh', cls: 'vowel', example: 'yoyo', note: 'long o, both vowels of YOYO' },
  // Item 056: the other three, for the magic-E words (KITE, CAKE) and later ones.
  { letter: 'long_a', say: 'Ay', cls: 'vowel', example: 'cake', note: 'long a, the vowel of CAKE (A and a silent E)' },
  { letter: 'long_i', say: 'Eye', cls: 'vowel', example: 'kite', note: 'long i, the vowel of KITE (I and a silent E)' },
  { letter: 'long_u', say: 'You', cls: 'vowel', example: 'cube', note: 'long u, the vowel of CUBE; no familiar bank word has it yet' },
  ...UNTAUGHT_SOUNDS,
];

/** Is this sound key one she has not been taught (item 058: `long_oo`, `schwa`, `x_name`)? */
export const isUntaught = (sound: string): boolean => UNTAUGHT_SOUNDS.some((l) => l.letter === sound);

/** Every sound unit's sound: a single letter's, a digraph's, a long vowel's or an untaught one's. */
export const SOUND_BY_UNIT: Record<string, LetterSound> = Object.fromEntries(
  [...LETTERS, ...DIGRAPH_SOUNDS, ...LONG_VOWEL_SOUNDS].map((l) => [l.letter, l]),
);

/**
 * The sounds you can hold (item 054, the Stretchy Bridge): the vowels, the
 * hums (M N L R V Z) and the hisses (F S SH TH). The bridge holds them while
 * she stands on their stone and plays every other sound (the stops, H W Y X)
 * once, never with an "uh" (src/audio/holdSound.ts).
 */
export function canHold(sound: string): boolean {
  const s = SOUND_BY_UNIT[sound];
  return Boolean(s) && (s!.cls === 'vowel' || s!.cls === 'continuant' || ['f', 's', 'sh', 'th', 'th_voiced'].includes(sound));
}

/**
 * Letter NAMES (item 033): the home warm-up spells its word with them before
 * it gives the sounds, because names are what she already knows. Each is its
 * own line (`letterNameLine`), in the phonics voice like the sounds, so a
 * recording can replace one the same way. `say` is what edge-tts is asked to
 * say: a bare "A." or "W." is read as a word ("uh") or mumbled.
 */
export const LETTER_NAMES: Record<string, string> = {
  a: 'Ay', b: 'Bee', c: 'See', d: 'Dee', e: 'Ee', f: 'Eff', g: 'Jee', h: 'Aitch', i: 'Eye',
  j: 'Jay', k: 'Kay', l: 'Ell', m: 'Em', n: 'En', o: 'Oh', p: 'Pee', q: 'Cue', r: 'Ar',
  s: 'Ess', t: 'Tee', u: 'You', v: 'Vee', w: 'Dubbelyou', x: 'Ex', y: 'Why', z: 'Zee',
};
