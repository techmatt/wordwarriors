/**
 * The sentence rooms' plans, for tests about the sentence game: the episode's
 * plans drawn from the sentence game alone (no word machine), so every room
 * has a sentence.
 */

import { SENTENCE_GAMES } from '../../src/rules/minigames';
import type { Rand } from '../../src/rules/random';
import { episodePlans, type EpisodeInput, type RoomPlan, type SentencePlan } from '../../src/rules/rooms';
import type { ProgressStore } from '../../src/state/ProgressStore';

/** A room's plan as the sentence game's (the live sentence room narrows its own with `sidePlan`). */
function asSentence(plan: RoomPlan): SentencePlan {
  if (plan.kind !== 'sentence') throw new Error(`room ${plan.slot} plays ${plan.game}, not the sentence game`);
  return plan;
}

export function sentencePlans(store: ProgressStore, input: EpisodeInput, rand?: Rand): [SentencePlan, SentencePlan, SentencePlan] {
  return episodePlans(store, { pool: SENTENCE_GAMES, ...input }, rand).map(asSentence) as [SentencePlan, SentencePlan, SentencePlan];
}
