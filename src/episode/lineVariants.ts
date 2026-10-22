/**
 * Line variants (item 087): a narrator line she hears often has several
 * (`right_1`... `right_8`, `room_find`, `room_find_2`...; `variantKeys` in
 * content/voice/script.ts), and each saying takes the next, remembered in the
 * store's `recent` so a new episode carries on the round instead of starting
 * it again. A key with no variants is itself.
 */

import { variantKeys } from '../../content/voice/script';
import { nextVariant } from '../rules/recent';
import { progress } from '../state/progress';

export function variant(key: string): string {
  const keys = variantKeys(key);
  if (keys.length < 2) return keys[0] ?? key;
  const pick = nextVariant(keys, progress.recentOf(`line:${key}`));
  progress.remember(`line:${key}`, pick, keys.length - 1);
  return pick;
}

/** Whether line id `id` is `base` or one of its variants (`nar_ellie_room_find_2` of `nar_ellie_room_find`). */
export const isVariant = (id: string, base: string): boolean => id === base || (id.startsWith(`${base}_`) && /^\d+$/.test(id.slice(base.length + 1)));
