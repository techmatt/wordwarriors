/**
 * The battle's move choices for an episode, planned once (items 018, 037).
 * Pure: the word bank, roster data and the progress store, unit-tested.
 *
 * Each battle part opens two move choices. The first of each part is the
 * gift word the helper gave her in the hub (`episode.gift`, `drawGift`). The
 * other right words come out of her move bag (ProgressStore `moveBag`, the 015
 * bag logic) by the bank's one weighting (src/rules/bank.ts: shakiness ×
 * coverage × recency; every level, item 067): without replacement across episodes, so fight after
 * fight she meets new ones. A word leaves the bag only when she picks it
 * right first time (BattleScene). The wrong pads are other action words,
 * chosen for reading (`distractorsFor`), fresh ones first: not yet shown this
 * episode, then still in her pad bag (ProgressStore `padBag`, item 038; a word
 * leaves it once a choice has shown it as a wrong pad), weighed by coverage.
 * Without the pad bag a few wrong pads came back episode after episode.
 *
 * Every pad word is a bank action word (MOVE_WORDS), and reading it casts it
 * (item 037, word magic). Who fires it: a teammate whose own ability answers
 * to the word fires that styled move (`abilityWords`); for the gift word it is
 * her hero with the helper's move, if the helper has one; for any other word
 * her hero fires the word's own effect (content/phonics/effects.ts).
 *
 * Planned at the start, not at each pause, because the attic's counter word
 * must not be a word battle 1 shows on its pads (`battle1Words`).
 */

import { CHARACTER_BY_ID, MOVE_WORDS, abilityWords } from '../../content/battle/roster';
import type { AbilitySpec } from '../../content/battle/types';
import { CASTERS } from '../../content/house/scenes';
import { BANK_BY_WORD } from '../../content/phonics/bank';
import { wordEffect } from '../../content/phonics/effects';
import type { ProgressStore } from '../state/ProgressStore';
import { coverage, distractorsFor, drawFromBag, drawWords, isFirm, met } from './bank';
import { pick, shuffle, type Rand } from './random';

/**
 * Who fires a move word: a hero on her team, with ability `ability` of
 * character `from`, or with the word's own effect when `from` is null.
 */
export interface MoveOwner {
  fighter: string;
  ability: string;
  /** Whose ability it is: the fighter's own, the helper's for the gift word, or null for the word's own effect (EFFECT_BY_WORD). */
  from: string | null;
}

export interface MoveChoicePlan {
  /** The words on the pads, left to right. */
  words: string[];
  right: string;
  /** Who fires the right word, and with what. */
  owner: MoveOwner;
}

/** Two choices per battle part. */
export interface MovePlan {
  part1: MoveChoicePlan[];
  part2: MoveChoicePlan[];
}

export const CHOICES_PER_PART = 2;

/** The id of a word's own effect: `word_<word>` for an action (effects.ts `wordEffect`). */
export function effectId(word: string): string {
  return wordEffect(word).id;
}

/** Every move word her team's own abilities answer to, with every owner of each. */
export function teamMoveWords(team: string[]): Map<string, MoveOwner[]> {
  const out = new Map<string, MoveOwner[]>();
  for (const id of team) {
    for (const ab of CHARACTER_BY_ID[id]?.good.abilities ?? []) {
      for (const w of abilityWords(ab)) {
        const list = out.get(w) ?? [];
        if (!list.some((o) => o.fighter === id)) list.push({ fighter: id, ability: ab.id, from: id });
        out.set(w, list);
      }
    }
  }
  return out;
}

/** The helper's own ability that answers to `word`, if any. */
export function helperAbilityFor(word: string, helper: string): AbilitySpec | undefined {
  return CHARACTER_BY_ID[helper]?.good.abilities.find((a) => abilityWords(a).includes(word));
}

/**
 * Who fires the gift word: her hero, with the helper's move of that word (it
 * is the helper's gift), or null when the helper has none (then the word's
 * own effect).
 */
export function giftOwner(gift: string, hero: string, helper: string): MoveOwner | null {
  const ab = helperAbilityFor(gift, helper);
  return ab ? { fighter: hero, ability: ab.id, from: helper } : null;
}

/** Who fires `word`: see the header. */
export function ownerFor(word: string, input: Pick<MoveInput, 'hero' | 'team' | 'helper' | 'gift'>, rand: Rand = Math.random): MoveOwner {
  const magic: MoveOwner = { fighter: input.hero, ability: effectId(word), from: null };
  if (word === input.gift) return giftOwner(word, input.hero, input.helper) ?? magic;
  const own = teamMoveWords(input.team).get(word);
  return own?.length ? pick(own, rand) : magic;
}

/**
 * Action words new to the game (item 037) join her move round already under
 * way. A word she has never read cannot have left the bag (only a right first
 * pick takes one out, and that records a read), so every unread move word
 * missing from a started round is new and goes in.
 */
function topUpMoves(store: ProgressStore): void {
  const bag = store.bag('moves');
  if (!bag.round) return;
  for (const w of MOVE_WORDS) if (!bag.left.includes(w) && store.stat('words', w).seen === 0) store.returnToBag(w, 'moves');
}

/**
 * Draw a right word from the move bag: an `eligible` word still in it, by the
 * bank's weighting. When none is left the bag refills with every move word
 * but `keepOut` (this episode's so far); failing that, any eligible word.
 */
export function drawMove(store: ProgressStore, eligible: string[], rand: Rand = Math.random, keepOut: string[] = []): string {
  topUpMoves(store);
  return drawFromBag(store, 'moves', MOVE_WORDS, eligible, rand, keepOut);
}

/** How much more a spell-sounding word weighs as a caster's gift (item 038). */
export const CASTER_SPELL_BOOST = 25;

/**
 * The hub's gift word (item 037): an action word from the move bag by the
 * bank's weighting, without spending it (it leaves the bag like any pad word,
 * when she picks it right first time). Never a word in `avoid`. Words the
 * helper's own moves answer to weigh double, so now and then the gift is the
 * helper's styled move (Ellie's bubbles for BIG). A caster's gift (CASTERS,
 * item 038) is a spell: words that sound like one (the bank's `spell`) weigh
 * CASTER_SPELL_BOOST times more.
 */
export function drawGift(store: ProgressStore, input: { helper: string; avoid?: string[] }, rand: Rand = Math.random): string {
  topUpMoves(store);
  const avoid = new Set(input.avoid ?? []);
  const all = MOVE_WORDS.filter((w) => !avoid.has(w));
  const inBag = new Set(store.bag('moves').left);
  const left = all.filter((w) => inBag.has(w));
  const helperWords = new Set((CHARACTER_BY_ID[input.helper]?.good.abilities ?? []).flatMap(abilityWords));
  // The bag's words; with none left, any (every level is open, item 067).
  const pool = left.length ? left : all.length ? all : MOVE_WORDS;
  const caster = CASTERS.has(input.helper);
  return drawWords(store, pool, 1, rand, (w) => (helperWords.has(w) ? 2 : 1) * (caster && BANK_BY_WORD[w]?.spell ? CASTER_SPELL_BOOST : 1))[0]!;
}

/** How much a wrong pad that has had its turn this round weighs against one still in the pad bag. */
export const PAD_SHOWN_WEIGHT = 0.05;

/**
 * The weight of a word as a wrong pad: still in the pad bag (refilled with
 * every pad word once fewer than `need` are left) × the bank's coverage term.
 * Shakiness is no reason to show a wrong pad, so the rest of `wordWeight`
 * is left out.
 */
export function padWeights(store: ProgressStore, pool: string[], need: number): (w: string) => number {
  const left = () => new Set(store.bag('pads').left);
  if (pool.filter((w) => left().has(w)).length < need) store.refillBag(MOVE_WORDS, 'pads');
  const inBag = left();
  const m = met(store);
  return (w) => (inBag.has(w) ? 1 : PAD_SHOWN_WEIGHT) * coverage(store, w, m);
}

/**
 * One move choice around its right word (the brawl's and the story fight's):
 * 2 or 3 pads, the wrong ones from `pool` by `distractorsFor`, words not yet
 * `shown` this episode first, then any; the pads join `shown`. The seeded
 * draws run in this order (plansGolden pins it): the pad count, the wrong
 * pads, the shuffle, the owner.
 */
export function padChoice(
  store: ProgressStore,
  right: string,
  pool: string[],
  shown: Set<string>,
  padWeight: (w: string) => number,
  input: Pick<MoveInput, 'hero' | 'team' | 'helper' | 'gift'>,
  rand: Rand,
): MoveChoicePlan {
  const n = rand() < 0.5 ? 2 : 3;
  const firm = isFirm(store, right);
  const wrong = distractorsFor(store, right, pool, n - 1, rand, shown, firm, padWeight);
  if (wrong.length < n - 1) wrong.push(...distractorsFor(store, right, pool, n - 1 - wrong.length, rand, wrong, firm, padWeight));
  const words = shuffle([right, ...wrong], rand);
  for (const w of words) shown.add(w);
  return { words, right, owner: ownerFor(right, input, rand) };
}

export interface MoveInput {
  hero: string;
  /** Her team in the battle: the hero and the ally. */
  team: string[];
  helper: string;
  /** The hub's gift word: it opens each part. */
  gift: string | null;
  /** Words no pad may show: said or shown before the battle (the wake-up threat, the quest's setup line). */
  avoid?: string[];
}

/**
 * The episode's four move choices. Each offers 2 or 3 words (which, varies),
 * never the same word twice; no right word repeats in the episode except the
 * gift word, which opens each part.
 */
export function planMoves(store: ProgressStore, input: MoveInput, rand: Rand = Math.random): MovePlan {
  const gift = input.gift;
  const avoid = new Set(input.avoid ?? []);
  const all = MOVE_WORDS.filter((w) => !avoid.has(w) || w === gift);
  // Wrong pads from every move word: a pad is a recognition role (item 067: no level gate).
  const wrongPool = all;
  // An episode shows at most 2 wrong pads per choice.
  const padWeight = padWeights(store, wrongPool, CHOICES_PER_PART * 2 * 2);
  const rights: string[] = [];
  const shown = new Set<string>();
  const choice = (first: boolean): MoveChoicePlan | null => {
    let right: string;
    if (first && gift) right = gift;
    else {
      const eligible = all.filter((w) => w !== gift && !rights.includes(w));
      if (!eligible.length) return null;
      right = drawMove(store, eligible, rand, rights);
    }
    rights.push(right);
    return padChoice(store, right, wrongPool, shown, padWeight, input, rand);
  };
  const part = (): MoveChoicePlan[] =>
    Array.from({ length: CHOICES_PER_PART }, (_, i) => choice(i === 0)).filter((c): c is MoveChoicePlan => !!c && c.words.length >= 2);
  const part1 = part();
  const part2 = part();
  return { part1, part2 };
}

/** Every word battle 1's pads show: none of them may be the attic's counter word. */
export function battle1Words(plan: MovePlan): string[] {
  return [...new Set(plan.part1.flatMap((c) => c.words))];
}
