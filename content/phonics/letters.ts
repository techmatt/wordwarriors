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
 * - voiced continuants are doubled into a hum ("Mmm", "Zzz"),
 * - stops and fricatives get a schwa ("Buh", "Suh"),
 * - short vowels are the nearest syllable edge-tts says as a sound.
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
  /** An example word with a picture, for the parent screen and future hints. */
  example: string;
  note?: string;
}

export const LETTERS: LetterSound[] = [
  { letter: 'a', say: 'Aah', cls: 'vowel', example: 'cat', note: 'short a as in cat; edge-tts gets close to /æ/ only with a drawn-out spelling' },
  { letter: 'b', say: 'Buh', cls: 'stop', example: 'bat' },
  { letter: 'c', say: 'Kuh', cls: 'stop', example: 'cat', note: 'hard c, same sound as k' },
  { letter: 'd', say: 'Duh', cls: 'stop', example: 'dog' },
  { letter: 'e', say: 'Eh', cls: 'vowel', example: 'bed' },
  { letter: 'f', say: 'Fuh', cls: 'fricative', example: 'fox' },
  { letter: 'g', say: 'Guh', cls: 'stop', example: 'gum' },
  { letter: 'h', say: 'Huh', cls: 'fricative', example: 'hat' },
  { letter: 'i', say: 'Ih', cls: 'vowel', example: 'pig' },
  { letter: 'j', say: 'Juh', cls: 'stop', example: 'jet' },
  { letter: 'k', say: 'Kuh', cls: 'stop', example: 'kit' },
  { letter: 'l', say: 'Lll', cls: 'continuant', example: 'log' },
  { letter: 'm', say: 'Mmm', cls: 'continuant', example: 'map', note: 'the one hum Seraphina measured: 0.36 s of clean /m/' },
  { letter: 'n', say: 'Nnn', cls: 'continuant', example: 'net' },
  { letter: 'o', say: 'Ah', cls: 'vowel', example: 'dog', note: 'short o in American English is /ɑ/' },
  { letter: 'p', say: 'Puh', cls: 'stop', example: 'pig' },
  { letter: 'q', say: 'Kwuh', cls: 'stop', example: 'queen' },
  { letter: 'r', say: 'Rrr', cls: 'continuant', example: 'rat' },
  { letter: 's', say: 'Suh', cls: 'fricative', example: 'sun', note: 'Seraphina spike: best stand-in for /s/ was "Suh"; "Sss" came back as "ess"' },
  { letter: 't', say: 'Tuh', cls: 'stop', example: 'ten' },
  { letter: 'u', say: 'Uh', cls: 'vowel', example: 'cup' },
  { letter: 'v', say: 'Vvv', cls: 'continuant', example: 'van' },
  { letter: 'w', say: 'Wuh', cls: 'glide', example: 'web' },
  { letter: 'x', say: 'Ks', cls: 'fricative', example: 'fox', note: 'final /ks/; untested spelling' },
  { letter: 'y', say: 'Yuh', cls: 'glide', example: 'yak' },
  { letter: 'z', say: 'Zzz', cls: 'continuant', example: 'zip', note: 'untested: may come back as letter names' },
];

export const LETTER_BY_CHAR: Record<string, LetterSound> = Object.fromEntries(
  LETTERS.map((l) => [l.letter, l]),
);
