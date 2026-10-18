/**
 * Which spell the helper teaches her in the hub. Pure: roster data only.
 *
 * The point of the lesson is a new move, so it is the helper's first worded
 * ability that her hero does not already have. A helper whose words are all
 * the hero's still teaches its first one (a spell she knows is still a
 * spell), and a helper with no worded ability at all falls back to `zap`.
 */

import { CHARACTER_BY_ID } from '../../content/battle/roster';

export function spellFor(heroId: string, helperId: string): string {
  const words = (id: string): string[] =>
    (CHARACTER_BY_ID[id]?.good.abilities ?? []).map((a) => a.word).filter((w): w is string => !!w);
  const known = new Set(words(heroId));
  const offered = words(helperId);
  return offered.find((w) => !known.has(w)) ?? offered[0] ?? 'zap';
}
