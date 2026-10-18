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
