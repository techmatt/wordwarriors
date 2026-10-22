/**
 * Line variants (item 087): a narrator line she hears often has several
 * (`right_1`... `right_8`, `room_find`, `room_find_2`...; `lineVariantKeys` in
 * content/voice/script.ts), and each saying takes the next, remembered in the
 * store's `recent` so a new episode carries on the round instead of starting
 * it again. A key with no variants is itself.
 */

import { lineVariantKeys } from '../../content/voice/script';
import { nextVariant } from '../rules/recent';
import { progress } from '../state/progress';

export function variant(key: string): string {
  const keys = lineVariantKeys(key);
  if (keys.length < 2) return keys[0] ?? key;
  const pick = nextVariant(keys, progress.recentOf(`line:${key}`));
  progress.remember(`line:${key}`, pick, keys.length - 1);
  return pick;
}

/** Whether line id `id` is `base` or one of its variants (`nar_ellie_room_find_2` of `nar_ellie_room_find`). */
export const isVariant = (id: string, base: string): boolean => id === base || (id.startsWith(`${base}_`) && /^\d+$/.test(id.slice(base.length + 1)));

/**
 * Each fighter's taunts said this episode (item 087), from the bedroom's
 * far-off taunt on: the battle says the least said, none more than twice
 * (`pickTaunt`). `resetEpisode` (./draws.ts) and the bedroom clear it for a new episode.
 */
export const tauntsSaid = new Map<string, string[]>();

/**
 * Fighter `id`'s next taunt of `keys` (item 087): one of the least said this
 * episode, and none said `max` times already (a fighter who has said them all
 * that often goes quiet: undefined). The pick is recorded as said.
 */
export function pickTaunt(id: string, keys: readonly string[], max: number, rand: () => number = Math.random): string | undefined {
  const said = tauntsSaid.get(id) ?? [];
  const times = (k: string) => said.filter((s) => s === k).length;
  const open = keys.filter((k) => times(k) < max);
  const least = Math.min(...open.map(times));
  const pool = open.filter((k) => times(k) === least);
  const key = pool[Math.floor(rand() * pool.length)];
  if (key) tauntsSaid.set(id, [...said, key]);
  return key;
}

/** A picked taunt that was never said (the voice bus dropped it): its last record goes, so it is not counted. */
export function unsayTaunt(id: string, key: string): void {
  const said = tauntsSaid.get(id) ?? [];
  const at = said.lastIndexOf(key);
  if (at >= 0) tauntsSaid.set(id, [...said.slice(0, at), ...said.slice(at + 1)]);
}
