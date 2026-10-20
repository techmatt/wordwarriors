/**
 * The sentence rooms' plans, for tests about the sentence game: the episode's
 * plans drawn from the sentence game alone (no word machine), so every room
 * has a sentence.
 */

import { SENTENCE_GAMES } from '../../src/rules/minigames';
import type { Rand } from '../../src/rules/bank';
import { asSentence, episodePlans, type EpisodeInput, type SentencePlan } from '../../src/rules/sentences';
import type { ProgressStore } from '../../src/state/ProgressStore';

export function sentencePlans(store: ProgressStore, input: EpisodeInput, rand?: Rand): [SentencePlan, SentencePlan, SentencePlan] {
  return episodePlans(store, { pool: SENTENCE_GAMES, ...input }, rand).map(asSentence) as [SentencePlan, SentencePlan, SentencePlan];
}
