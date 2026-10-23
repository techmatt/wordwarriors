/** The roster's ability helpers and the move words (see ../roster.ts). */

import { ACTIONS } from '../../phonics/bank.js';
import type { AbilitySpec } from '../types.js';

/**
 * The words a move-choice pause can offer: the word bank's action words (role
 * `action` or `both`, content/phonics/bank.ts), each with a battle effect of
 * its own (content/phonics/effects.ts), a picture and a "Use X!" line per
 * narrator. Each episode draws which ones she meets from her move bag
 * (src/rules/moves.ts).
 *
 * Since item 037 an ability's `words` no longer limit what she reads:
 * they are flavour. When a pad's word is one a teammate's ability answers to,
 * that teammate fires the styled version (Ellie's Giant Bubbles for BIG);
 * otherwise her hero fires the word's own effect. POW and ICE are not bank
 * words: they stay on abilities as flavour and are never on a pad.
 */
export const MOVE_WORDS: string[] = ACTIONS.map((w) => w.word);

/** What a big move is called out as, voiced and on its banner: `callout`, else its name. */
export const abilityCallout = (a: AbilitySpec): string => a.callout ?? `${a.name}!`;

/** Every move word an ability answers to: its `words`. */
export function abilityWords(a: AbilitySpec): string[] {
  return a.words ?? [];
}

export function ab(
  id: string,
  name: string,
  kind: AbilitySpec['kind'],
  cooldown: number,
  color: number,
  power: number,
  extra: Partial<AbilitySpec> = {},
): AbilitySpec {
  return { id, name, kind, cooldown, color, power, ...extra };
}

/** An ultimate: an ability with no cooldown (the director fires it). */
export function ult(id: string, name: string, kind: AbilitySpec['kind'], color: number, power: number, extra: Partial<AbilitySpec> = {}): AbilitySpec {
  return ab(id, name, kind, 0, color, power, extra);
}
