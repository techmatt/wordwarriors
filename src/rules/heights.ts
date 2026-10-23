/**
 * How tall each character is drawn beside her (split from cast.ts, item 122).
 * Pure, unit-tested (tests/unit/heights.test.ts).
 *
 *   - A grown-up (a dad, in any form) stands his own height, head to soles
 *     (`adultHeight`: `ADULT_HEIGHTS`, `ADULT_FILL` in src/config.ts, item 093).
 *   - Her outfit pictures are drawn so she, head to soles, is as tall as in her
 *     dress (`outfitTall`: each outfit's `fill` and `DRESS_FILL` in
 *     content/battle/outfits.ts, hunt 6, M32).
 */

import { DRESS_FILL, OUTFITS } from '../../content/battle/outfits';
import { personOf } from '../../content/battle/roster';
import { ADULT_FILL, ADULT_HEIGHT, ADULT_HEIGHTS } from '../config';
import { isDad } from './cast';

/** Is `id` (a character, form or fighter id: `dada_jason_warlock_evil`) a grown-up, a dad in any form? */
export function isGrownUp(id: string): boolean {
  return isDad(personOf(id.replace(/_(good|evil)$/, '')));
}

/**
 * How tall grown-up `id` (any form, `_good` / `_evil` or not) shown as
 * picture `art` is drawn beside her (item 093): the picture sized so the
 * person in it, head to soles, is his own height.
 */
export function adultHeight(id: string, art: string): number {
  const person = ADULT_HEIGHTS[personOf(id.replace(/_(good|evil)$/, ''))] ?? ADULT_HEIGHT;
  return person / (ADULT_FILL[art] ?? 0.96);
}

/** Each outfit picture's owner and fill, and each owner's dress picture's (`char_<owner>_good`). */
const FILLS = new Map<string, { owner: string; fill: number }>([
  ...Object.entries(DRESS_FILL).map(([owner, fill]) => [`char_${owner}_good`, { owner, fill }] as const),
  ...Object.entries(OUTFITS).flatMap(([owner, list]) => list.map((o) => [o.art, { owner, fill: o.fill }] as const)),
]);

/** How much of dress or outfit picture `art` is her, head to soles; undefined for any other picture. */
export function outfitFill(art: string): number | undefined {
  return FILLS.get(art)?.fill;
}

/**
 * How many times her usual height outfit picture `art` (`char_julia_chef`) is
 * drawn (hunt 6, M32): sized so she, head to soles, is as tall as in her
 * dress. 1 for any picture with no fill.
 */
export function outfitTall(art: string): number {
  const f = FILLS.get(art);
  const dress = f && DRESS_FILL[f.owner];
  return f && dress ? dress / f.fill : 1;
}
