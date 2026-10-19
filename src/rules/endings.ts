/**
 * The victory scene (item 027): which one plays, who is in it, and who says
 * what. Pure: roster and scene data and a random source, unit-tested.
 *
 *   - Everyone who took part is there: the hero, the ally, the dads (the
 *     waking dad, the other dad when he came, each in today's form) and the
 *     villain, good again, last.
 *   - A scene is drawn at random, never last episode's, and one that fits the
 *     cast (chef Dada Jason and the dessert table, Smaug and the campfire) is
 *     `FIT_WEIGHT` times likelier.
 *   - Its four lines, by role (content/house/endings.ts): the host opens, the
 *     villain says its own reformed line, the hero cheers, and someone else
 *     there closes (the fitting dad, with his own line, when he is there).
 */

import { CHARACTER_BY_ID, personOf } from '../../content/battle/roster';
import { ENDINGS, ENDING_BY_ID, type EndingSpec } from '../../content/house/endings';
import { endingLine, reformedLine } from '../../content/voice/ids';
import { wakerOf, type Cast } from './cast';
import type { Rand } from './sentences';

/** How much likelier a scene that fits the cast is. */
export const FIT_WEIGHT = 3;

export type EndingCast = Pick<Cast, 'hero' | 'ally' | 'villain' | 'primary' | 'secondary'>;

/** One line of the scene: who says it (a roster id, the sprite it hops on) and the line id. */
export interface EndingBeat {
  who: string;
  line: string;
}

/** The narrator's roster id: the ally, else the dad who woke her (src/episode/Episode.ts `helper`). */
function host(cast: EndingCast): string {
  return cast.ally ?? wakerOf(cast);
}

/**
 * Everyone in the scene, roster ids, one per person: the hero, the ally, the
 * dads there, and the villain last.
 */
export function endingPeople(cast: EndingCast): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [cast.hero, cast.ally, host(cast), cast.primary, cast.secondary]) {
    if (!id || id === cast.villain || seen.has(personOf(id)) || personOf(id) === personOf(cast.villain)) continue;
    seen.add(personOf(id));
    out.push(id);
  }
  return [...out, cast.villain];
}

/** True when the scene suits this cast: its fitting dad form is there (not as the villain), or its villain is. */
export function endingFits(e: EndingSpec, cast: EndingCast): boolean {
  const friends = endingPeople(cast).filter((id) => id !== cast.villain);
  return Boolean(e.fit && friends.includes(e.fit.form)) || e.villains.includes(cast.villain);
}

/** Draw a scene id: never `last` (while another is left), a fitting one `FIT_WEIGHT` times likelier. */
export function pickEnding(cast: EndingCast, last: string | null, rand: Rand = Math.random): string {
  const pool = ENDINGS.filter((e) => e.id !== last);
  const from = pool.length ? pool : ENDINGS;
  const weights = from.map((e) => (endingFits(e, cast) ? FIT_WEIGHT : 1));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (const [i, e] of from.entries()) {
    r -= weights[i]!;
    if (r < 0) return e.id;
  }
  return from[from.length - 1]!.id;
}

/** The scene's lines in order: open, the villain's own, cheer, close (or the fitting dad's). */
export function endingScript(cast: EndingCast, sceneId: string): EndingBeat[] {
  const e = ENDING_BY_ID[sceneId];
  if (!e) throw new Error(`no victory scene ${sceneId}`);
  const people = endingPeople(cast);
  const h = host(cast);
  const say = (who: string, key: string): EndingBeat => ({ who, line: endingLine(personOf(who), e.id, key) });
  const beats: EndingBeat[] = [say(h, 'open')];

  // The villain's own line: its second reformed line (battle 2 ends on its first, the sorry).
  const reformed = CHARACTER_BY_ID[cast.villain]?.reformed ?? [];
  const own = reformed[1] ?? reformed[0];
  if (own) beats.push({ who: cast.villain, line: reformedLine(cast.villain, own.key) });

  beats.push(say(cast.hero, 'cheer'));

  const fitter = e.fit && people.find((id) => id !== cast.villain && id === e.fit!.form);
  if (fitter) beats.push(say(fitter, 'fit'));
  else {
    const taken = new Set([personOf(h), personOf(cast.hero), personOf(cast.villain)]);
    const other = people.find((id) => !taken.has(personOf(id)));
    beats.push(say(other ?? h, 'close'));
  }
  return beats;
}
