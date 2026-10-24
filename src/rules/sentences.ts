/**
 * The sentence game's word rules: a room's other pictures (`distractors`),
 * every word the cast says or shows before the rooms (`saidEarly`), and when
 * a frame is solid. Pure: no Phaser, unit-tested. Planning the episode's
 * rooms and drawing their key words is src/rules/rooms.ts (item 141).
 */

import { CHARACTER_BY_ID, MINIONS, comboPart } from '../../content/battle/roster';
import type { FighterSpec } from '../../content/battle/types';
import { lookalikesOf } from '../../content/phonics/sentences';
import { SENTENCE_SOLID } from '../config';
import type { ProgressStore } from '../state/ProgressStore';
import { BAG_WORDS, distractorsFor } from './bank';
import type { Rand } from './random';
import { rampsAdvance } from './difficulty';

/**
 * Two picture words for the room's other objects: not the key word, not a
 * look-alike of it (LOOKALIKES), and nothing in `avoid` (the sentence's own
 * words, so no CAN picture under WE CAN USE THE; the gift word; the
 * episode's other key words). Chosen for reading (`distractorsFor`): while
 * the key word is new neither starts with its first letter, her strongest
 * clue and all the hint gives for a non-decodable word (no MAP beside the
 * MOP); once it is firm one shares its first sound or its rime (CAT beside
 * HAT), so the first letter is not enough. If a rule leaves too few, it gives way.
 */
export function distractors(store: ProgressStore, key: string, rand: Rand = Math.random, n = 2, avoid: string[] = []): string[] {
  return distractorsFor(store, key, BAG_WORDS, n, rand, [...lookalikesOf(key), ...avoid]);
}

export function wordsOf(s: string | undefined): string[] {
  return (s ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

/** Everything one fighter says or shows: names, ability and ultimate banners, taunts, minion names. */
function fighterWords(f: FighterSpec): string[] {
  const out = [f.displayName, f.sayName, f.ultimate.name, ...f.abilities.flatMap((a) => [a.name, a.callout])];
  for (const t of f.taunts) out.push(t.text, t.say);
  for (const a of [...f.abilities, f.ultimate]) if (a.minion) out.push(MINIONS[a.minion]?.name);
  return out.flatMap(wordsOf);
}

/**
 * Every word the episode's own characters say or show before the attic: the
 * hero's and ally's (good) and the villain's (evil) names, abilities,
 * ultimates, taunts and minions, the villain's wake-up threat, and the hero
 * and ally's combo. A key word is never one of these.
 */
export function saidEarly(cast: { hero: string; ally: string | null; villain: string; helper: string }): string[] {
  const out = new Set<string>();
  const add = (ws: string[]) => ws.forEach((w) => out.add(w));
  for (const id of new Set([cast.hero, cast.helper, ...(cast.ally ? [cast.ally] : [])])) {
    const c = CHARACTER_BY_ID[id];
    if (c) add(fighterWords(c.good));
  }
  const v = CHARACTER_BY_ID[cast.villain];
  if (v) {
    add(fighterWords(v.evil));
    add(wordsOf(v.house.threat));
    add(wordsOf(v.house.threatSay));
  }
  // The combo's name: with no ally the helper steps in for it (BattleBeats.combo, src/battle/beats.ts), so its name is said too (item 069).
  const partner = cast.ally ?? cast.helper;
  for (const [a, b] of [[cast.hero, partner], [partner, cast.hero]] as const) add(wordsOf(comboPart(a, b).name));
  return [...out];
}

/**
 * Does a frame's listening pass get skipped? Only above base difficulty
 * (item 067: no ramp steps up by itself), and only once it is solid.
 */
export function skipsListening(store: ProgressStore, frameId: string): boolean {
  return rampsAdvance() && frameIsSolid(store, frameId);
}

/** Is a frame solid (SENTENCE_SOLID in config)? Recorded for the grown-ups page; `skipsListening` is what the room asks. */
export function frameIsSolid(store: ProgressStore, frameId: string, rule = SENTENCE_SOLID): boolean {
  const s = store.stat('frames', frameId);
  if (s.seen < rule.tries) return false;
  const last = s.recent.slice(-rule.lastRight);
  return last.length === rule.lastRight && last.every(Boolean);
}
