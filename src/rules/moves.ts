/**
 * The battle's move choices for an episode, planned once (item 018). Pure:
 * roster data and the progress store, unit-tested.
 *
 * Each battle part opens two move choices. The first of each part is the
 * spell the helper taught her in the hub. The other right words come out of
 * her move bag (ProgressStore `moveBag`, the 015 bag logic): without
 * replacement across episodes, leaning to shaky words, so fight after fight
 * she meets new ones. A word leaves the bag only when she picks it right
 * first time (BattleScene). The wrong pads are other words her team's moves
 * answer to, fresh ones first. Every word belongs to a move of somebody on her
 * team (`abilityWords`), and that somebody fires it, so each character fires
 * something that suits them.
 *
 * Planned at the start, not at each pause, because the attic's counter word
 * must not be a word battle 1 shows on its pads (`battle1Words`).
 */

import { CHARACTER_BY_ID, MOVE_WORDS, abilityWords } from '../../content/battle/roster';
import { pickWeighted, type ProgressStore } from '../state/ProgressStore';
import type { Rand } from './sentences';

/** Who fires a move word: a hero on her team, and an ability of character `from`. */
export interface MoveOwner {
  fighter: string;
  ability: string;
  /** Whose ability it is: the fighter's own, or the helper's for the spell she was taught. */
  from: string;
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

/** Every move word her team's moves answer to, with every owner of each. */
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

/**
 * Who fires the spell: her hero, with the helper's move of that word (it is
 * what the helper taught her), else her own or a teammate's.
 */
export function spellOwner(spell: string, hero: string, helper: string, team: string[]): MoveOwner | null {
  for (const from of [helper, ...team]) {
    const ab = CHARACTER_BY_ID[from]?.good.abilities.find((a) => abilityWords(a).includes(spell));
    if (ab) return { fighter: hero, ability: ab.id, from };
  }
  return null;
}

function shuffle<T>(xs: T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Draw a right word from the move bag: an `eligible` word still in it, leaning
 * to shaky ones. When none is left the bag refills with every move word but
 * `keepOut` (this episode's so far); failing that, any eligible word.
 */
export function drawMove(store: ProgressStore, eligible: string[], rand: Rand = Math.random, keepOut: string[] = []): string {
  const ok = new Set(eligible);
  let pool = store.bag('moves').left.filter((w) => ok.has(w));
  if (!pool.length) {
    store.refillBag(MOVE_WORDS.filter((w) => !keepOut.includes(w)), 'moves');
    pool = store.bag('moves').left.filter((w) => ok.has(w));
  }
  if (!pool.length) pool = [...eligible];
  return pickWeighted(pool, (w) => store.shakiness('words', w), 1, rand)[0]!;
}

export interface MoveInput {
  hero: string;
  /** Her team in the battle: the hero and the ally. */
  team: string[];
  helper: string;
  spell: string | null;
}

/**
 * The episode's four move choices. Each offers 2 or 3 words (which, varies),
 * never the same word twice; no right word repeats in the episode except the
 * spell, which opens each part.
 */
export function planMoves(store: ProgressStore, input: MoveInput, rand: Rand = Math.random): MovePlan {
  const owners = teamMoveWords(input.team);
  const spell = input.spell;
  const spellBy = spell ? spellOwner(spell, input.hero, input.helper, input.team) : null;
  const all = [...new Set([...owners.keys(), ...(spellBy ? [spell!] : [])])];
  const ownerOf = (w: string): MoveOwner => (w === spell && spellBy ? spellBy : owners.get(w)![Math.floor(rand() * owners.get(w)!.length)]!);
  const rights: string[] = [];
  const shown = new Set<string>();
  const choice = (first: boolean): MoveChoicePlan | null => {
    let right: string;
    if (first && spellBy) right = spell!;
    else {
      const eligible = all.filter((w) => w !== spell && !rights.includes(w));
      if (!eligible.length) return null;
      right = drawMove(store, eligible, rand, rights);
    }
    rights.push(right);
    const n = Math.min(all.length, rand() < 0.5 ? 2 : 3);
    // Wrong pads: words not yet shown this episode first, then any.
    const others = all.filter((w) => w !== right);
    const fresh = shuffle(others.filter((w) => !shown.has(w)), rand);
    const seen = shuffle(others.filter((w) => shown.has(w)), rand);
    const words = shuffle([right, ...[...fresh, ...seen].slice(0, n - 1)], rand);
    for (const w of words) shown.add(w);
    return { words, right, owner: ownerOf(right) };
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
