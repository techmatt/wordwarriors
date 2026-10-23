/** ROSTER, assembled from its group files, and the lookups over it. */

import type { CharacterSpec } from '../types.js';
import { DAD_FORMS } from './dadForms.js';
import { DRAGONS } from './dragons.js';
import { FAMILY } from './family.js';
import { ODDBALLS } from './oddballs.js';
import { ROYALS } from './royals.js';

/**
 * Every character, in a fixed order: seeded draws read it, so a reorder changes
 * every episode's draws (plansGolden.test.ts). A new character goes at the end
 * of its group file, or of the last group.
 */
export const ROSTER: CharacterSpec[] = [...FAMILY, ...ROYALS, ...DRAGONS, ...ODDBALLS, ...DAD_FORMS];

export const CHARACTER_BY_ID: Record<string, CharacterSpec> = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

/** The villain's bare name, once known (item 038): `evil.bareName` where set, else the good side's name. */
export function villainName(c: CharacterSpec): { displayName: string; sayName?: string } {
  return c.evil.bareName ? { displayName: c.evil.bareName } : c.good;
}

/** Whose form `id` is: the person for a form (`dada_matt_lifter` → `dada_matt`), else `id` itself. */
export function personOf(id: string): string {
  return CHARACTER_BY_ID[id]?.person ?? id;
}

/** The persons: every roster character that is not a form of another. Voices, narrators and pick screens are per person. */
export const PERSONS: CharacterSpec[] = ROSTER.filter((c) => !c.person);

/** Every form of a person, the person's own (default) form first: `dada_matt`, then `dada_matt_lifter`... */
export function formsOf(person: string): CharacterSpec[] {
  return ROSTER.filter((c) => c.id === person || c.person === person);
}

/** The roster id of `person`'s form named `form` (`dada_matt`, `lifter` → `dada_matt_lifter`), or undefined. */
export function formId(person: string, form: string): string | undefined {
  return formsOf(person).find((c) => c.form === form)?.id;
}
