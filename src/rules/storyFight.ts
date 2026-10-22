/**
 * A story fight's move choices (item 107), planned once per episode like the
 * brawl's (src/rules/moves.ts) and handed out through the same `MovePlan`, so
 * the attic's counter word, the art needs and the misses record work as they
 * always have. Pure: story data, the word bank and the progress store.
 *
 * Each pad beat (`padBeats`: a `pad` or `dodgePads` input) is one choice, in
 * story order. Its right word makes sense against what the villain just did:
 * drawn from the beat's `answers` out of her move bag by the bank's weighting
 * (`drawMove`: shaky and fresh words first; with none of them left in the
 * bag, by the weighting alone, never refilling the bag mid-round), never a
 * word already right this episode; `gift` is the hub's gift word. Its wrong pads are any other move
 * words (`distractorsFor`), but never another of the beat's sensible answers,
 * so only one pad on the floor makes sense.
 */

import { MOVE_WORDS } from '../../content/battle/roster';
import { padBeats } from '../../content/battle/stories/index';
import type { StoryScript } from '../../content/battle/stories/types';
import type { ProgressStore } from '../state/ProgressStore';
import { distractorsFor, drawWords, isFirm } from './bank';
import { drawMove, ownerFor, padWeights, type MoveChoicePlan, type MoveInput, type MovePlan } from './moves';
import { shuffle, type Rand } from './random';

export function planStoryMoves(store: ProgressStore, story: StoryScript, input: MoveInput, rand: Rand = Math.random): MovePlan {
  const gift = input.gift;
  const avoid = new Set(input.avoid ?? []);
  const all = MOVE_WORDS.filter((w) => !avoid.has(w) || w === gift);
  const beats = [...padBeats(story, 1), ...padBeats(story, 2)];
  const padWeight = padWeights(store, all, beats.length * 2);
  const rights: string[] = [];
  const shown = new Set<string>();
  const choice = (answers: string[] | 'gift'): MoveChoicePlan | null => {
    let right: string;
    const sensible = answers === 'gift' ? (gift ? [gift] : []) : answers.filter((w) => all.includes(w));
    if (answers === 'gift' && gift) right = gift;
    else {
      // A sensible answer not yet right this episode; with none left, any of them; failing that, any move word.
      const fresh = sensible.filter((w) => !rights.includes(w));
      const eligible = fresh.length ? fresh : sensible.length ? sensible : all.filter((w) => !rights.includes(w));
      if (!eligible.length) return null;
      // From the bag when one of them is still in it; else by the bank's weighting alone, so a
      // beat's few answers being spent never refills her whole move bag mid-round.
      // (A bag with no round yet starts one, as the brawl's first draw does.)
      const bag = store.bag('moves');
      const inBag = new Set(bag.left);
      const bagged = eligible.filter((w) => inBag.has(w));
      if (bagged.length) right = drawMove(store, bagged, rand, rights);
      else if (!bag.round) right = drawMove(store, eligible, rand, rights);
      else right = drawWords(store, eligible, 1, rand)[0]!;
    }
    rights.push(right);
    const n = rand() < 0.5 ? 2 : 3;
    const pool = all.filter((w) => w === right || !sensible.includes(w));
    const firm = isFirm(store, right);
    const wrong = distractorsFor(store, right, pool, n - 1, rand, shown, firm, padWeight);
    if (wrong.length < n - 1) wrong.push(...distractorsFor(store, right, pool, n - 1 - wrong.length, rand, wrong, firm, padWeight));
    const words = shuffle([right, ...wrong], rand);
    for (const w of words) shown.add(w);
    return { words, right, owner: ownerFor(right, input, rand) };
  };
  const part = (p: 1 | 2): MoveChoicePlan[] =>
    padBeats(story, p)
      .map((b) => choice(b.input!.kind === 'pad' || b.input!.kind === 'dodgePads' ? b.input!.answers : []))
      .filter((c): c is MoveChoicePlan => !!c && c.words.length >= 2);
  return { part1: part(1), part2: part(2) };
}
