/**
 * Round generation for the minigames. Phaser-free, so it is unit-tested.
 *
 * Targets come from the ProgressStore, weighted toward her shaky items
 * (`pickWeighted`). Distractors are drawn so each choice looks and sounds
 * different from the target: no two choices share a first letter in Word to
 * Picture, and Sound to Letter never offers b/d/p/q together.
 */

import { LETTERS } from '../../content/phonics/letters';
import { CVC_WORDS, SIGHT_WORDS, WORDS } from '../../content/phonics/words';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';

export type Rand = () => number;

export interface SoundItem {
  target: string;
  choices: string[];
}

export interface WordItem {
  target: string;
  choices: string[];
}

/** Letters whose placeholder sound is too unlike the real one to test on yet. */
const SOUND_SKIP = new Set(['q', 'x']);
const MIRROR_SETS = [new Set(['b', 'd', 'p', 'q']), new Set(['m', 'n']), new Set(['u', 'n'])];

function shuffle<T>(xs: T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function confusable(a: string, b: string): boolean {
  return MIRROR_SETS.some((s) => s.has(a) && s.has(b));
}

export function soundRound(store: ProgressStore, n: number, rand: Rand = Math.random, choices = 3): SoundItem[] {
  const letters = LETTERS.map((l) => l.letter).filter((l) => !SOUND_SKIP.has(l));
  const targets = pickWeighted(letters, (id) => store.shakiness('sounds', id), n, rand);
  return targets.map((target) => {
    const others = shuffle(
      letters.filter((l) => l !== target && !confusable(l, target)),
      rand,
    ).slice(0, choices - 1);
    return { target, choices: shuffle([target, ...others], rand) };
  });
}

/** Blend Path: decodable CVC words only, doors show pictures. */
export function blendRound(store: ProgressStore, n: number, rand: Rand = Math.random, choices = 3): WordItem[] {
  const words = CVC_WORDS.map((w) => w.word);
  const targets = pickWeighted(words, (id) => store.shakiness('words', id), n, rand);
  return targets.map((target) => wordItem(target, words, choices, rand));
}

/**
 * Word to Picture: CVC words plus character names as sight words. At most one
 * sight word per round, so the round stays mostly decoding.
 */
export function pictureRound(store: ProgressStore, n: number, rand: Rand = Math.random, choices = 3): WordItem[] {
  const cvc = CVC_WORDS.map((w) => w.word);
  const sight = SIGHT_WORDS.map((w) => w.word);
  const targets = pickWeighted(cvc, (id) => store.shakiness('words', id), n - 1, rand);
  const s = pickWeighted(sight, (id) => store.shakiness('words', id), 1, rand)[0];
  if (s) targets.splice(Math.floor(rand() * (targets.length + 1)), 0, s);
  return targets.map((target) => wordItem(target, SIGHT_WORDS.some((w) => w.word === target) ? sight : cvc, choices, rand));
}

function wordItem(target: string, pool: string[], choices: number, rand: Rand): WordItem {
  const used = new Set([target[0]]);
  const others: string[] = [];
  for (const w of shuffle(pool, rand)) {
    if (others.length >= choices - 1) break;
    if (w === target || used.has(w[0])) continue;
    used.add(w[0]);
    others.push(w);
  }
  return { target, choices: shuffle([target, ...others], rand) };
}

export function isWord(word: string): boolean {
  return WORDS.some((w) => w.word === word);
}
