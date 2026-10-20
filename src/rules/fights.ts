/**
 * Which fight style an episode's showdown is (item 031): the villain's own
 * (`fight` on its roster entry, `brawl` when it has none), unless the ally
 * nudges it to another (`fightNudge`: chef Dada Jason makes a cook-off
 * likely, whoever the villain is). Drawn once per episode, so both battles
 * are the same contest. Pure: roster data and a random source.
 */

import { FIGHT_BY_ID, type FightSpec } from '../../content/battle/fights';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import type { Rand } from './bank';

/** The villain's own style id, `brawl` when it has none (or names one that does not exist). */
export function ownFight(villain: string): string {
  const id = CHARACTER_BY_ID[villain]?.fight;
  return id && FIGHT_BY_ID[id] ? id : 'brawl';
}

/** Draw the showdown's style for a cast. */
export function pickFight(cast: { villain: string; ally: string | null }, rand: Rand = Math.random): string {
  const own = ownFight(cast.villain);
  const nudge = cast.ally ? CHARACTER_BY_ID[cast.ally]?.fightNudge : undefined;
  if (nudge && FIGHT_BY_ID[nudge.fight] && nudge.fight !== own && rand() < nudge.chance) return nudge.fight;
  return own;
}

export function fightSpec(id: string | null | undefined): FightSpec {
  return (id && FIGHT_BY_ID[id]) || FIGHT_BY_ID.brawl!;
}
