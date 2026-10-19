/**
 * Who is in an episode (item 025), drawn fresh each time. Pure: roster data
 * and a random source, unit-tested.
 *
 *   - The dads' forms: each dad gets one of his forms (builder, weightlifter,
 *     cyberdecker or spell-blade Dada Matt; chef, warrior or warlock Dada
 *     Jason). Wherever a dad appears this episode, good or evil, it is in
 *     that form.
 *   - The villain: a person from the whole roster (each equally likely, so the
 *     dads' many forms do not crowd the pool), in their episode form for a
 *     dad. Never one of her last few villains while another is left.
 *   - The ally: a good person who is neither the hero nor the villain; a dad
 *     sometimes, in his episode form.
 *   - The primary dad wakes her (and narrates when there is no ally): Dada
 *     Matt 60% of the time, Dada Jason 40%. In half the episodes the other dad
 *     comes into the bedroom too, as the secondary. A dad already playing the
 *     ally or the villain (or the hero) takes no other role, so when both are
 *     busy there is no primary and the ally dad wakes her.
 *
 * Every part can be fixed by an override (`?ally=`, `?villain=`, `?form=`,
 * `?primary=`, `?secondary=`, src/scenes/BootScene.ts); what is left is drawn.
 */

import { CHARACTER_BY_ID, PERSONS, formId, formsOf, personOf } from '../../content/battle/roster';
import { CAST_ODDS } from '../config';
import type { Rand } from './sentences';

/** The two dads: the only wakers (their wake-up lines are voiced). */
export const DADS = ['dada_matt', 'dada_jason'] as const;


export interface Cast {
  /** Roster ids throughout: a dad's id is his form's (`dada_matt_lifter`). */
  hero: string;
  ally: string | null;
  villain: string;
  /** The dad who wakes her, in his form; null when both dads are busy. */
  primary: string | null;
  /** The other dad in the bedroom, in his form, or null. */
  secondary: string | null;
}

export interface CastOverrides {
  hero?: string;
  /** A roster id, or null for no ally. */
  ally?: string | null;
  villain?: string;
  /** A dad's form by name, per dad: `{ dada_matt: 'lifter' }`. */
  forms?: Partial<Record<string, string>>;
  /** Which dad is primary (a person id), or null for none. */
  primary?: string | null;
  /** Whether the other dad comes in. */
  secondary?: boolean;
}

export interface CastInput {
  hero: string;
  /** Her recent villains (persons), newest last: avoided while any other is left. */
  recent?: string[];
  overrides?: CastOverrides;
}

function pick<T>(xs: readonly T[], rand: Rand): T {
  return xs[Math.floor(rand() * xs.length)]!;
}

const isDad = (person: string) => (DADS as readonly string[]).includes(person);

/** Draw an episode's cast. */
export function drawCast(input: CastInput, rand: Rand = Math.random): Cast {
  const o = input.overrides ?? {};
  const hero = o.hero ?? input.hero;
  const heroPerson = personOf(hero);

  // Each dad's form this episode. A fixed ally or villain who is one of a
  // dad's forms fixes his (`?ally=dada_jason` is chef Dada Jason, the person's
  // own form; `?ally=dada_jason_warlock` the warlock).
  const forms: Record<string, string> = {};
  for (const dad of DADS) {
    const fixed = o.forms?.[dad];
    const byRole = [o.ally, o.villain].find((id) => id && personOf(id) === dad);
    forms[dad] = byRole ?? (fixed ? formId(dad, fixed) : undefined) ?? pick(formsOf(dad), rand).id;
  }
  const inForm = (person: string) => (isDad(person) ? forms[person]! : person);

  // The villain. A dad may only be the villain while the other dad (or the
  // ally dad) can still wake her, so a random draw never leaves nobody to.
  let villain: string;
  if (o.villain) villain = o.villain;
  else {
    const allyPerson = o.ally ? personOf(o.ally) : null;
    const pool = PERSONS.map((c) => c.id).filter((p) => p !== heroPerson && p !== allyPerson);
    const wakerLeft = (p: string) => DADS.some((d) => d !== p && d !== heroPerson) || (allyPerson !== null && isDad(allyPerson));
    const ok = pool.filter(wakerLeft);
    const fresh = ok.filter((p) => !(input.recent ?? []).includes(p));
    const last = input.recent?.[input.recent.length - 1];
    const notLast = ok.filter((p) => p !== last);
    villain = inForm(pick(fresh.length ? fresh : notLast.length ? notLast : ok, rand));
  }
  const villainPerson = personOf(villain);

  // The ally.
  let ally: string | null;
  if (o.ally !== undefined) ally = o.ally;
  else {
    const pool = PERSONS.map((c) => c.id).filter((p) => p !== heroPerson && p !== villainPerson);
    ally = inForm(pick(pool, rand));
  }
  const allyPerson = ally ? personOf(ally) : null;

  // The dads' roles.
  const free = DADS.filter((d) => d !== heroPerson && d !== villainPerson && d !== allyPerson);
  let primaryDad: string | null;
  // A fixed primary who is busy (the default episode's Dada Matt drawn as the
  // villain) hands the role to the other dad, if he is free.
  if (o.primary !== undefined) primaryDad = o.primary === null ? null : free.includes(o.primary as (typeof DADS)[number]) ? o.primary : (free[0] ?? null);
  else if (free.length === 2) primaryDad = rand() < CAST_ODDS.mattPrimary ? 'dada_matt' : 'dada_jason';
  else primaryDad = free[0] ?? null;
  const other = free.find((d) => d !== primaryDad);
  const comes = o.secondary ?? rand() < CAST_ODDS.secondary;
  const secondaryDad = primaryDad && other && comes ? other : null;

  return {
    hero,
    ally,
    villain,
    primary: primaryDad ? forms[primaryDad]! : null,
    secondary: secondaryDad ? forms[secondaryDad]! : null,
  };
}

/**
 * Who wakes her: the primary dad, else the ally if he is a dad, else (only an
 * override can get here) a dad who is neither the hero nor the villain if
 * there is one.
 */
export function wakerOf(cast: Pick<Cast, 'hero' | 'ally' | 'primary' | 'villain'>): string {
  if (cast.primary) return cast.primary;
  if (cast.ally && isDad(personOf(cast.ally))) return cast.ally;
  const hero = personOf(cast.hero);
  return DADS.find((d) => d !== hero && d !== personOf(cast.villain)) ?? DADS.find((d) => d !== hero) ?? DADS[0];
}

/** A seeded random source (mulberry32), for `?seed=` and the tests. */
export function seededRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True for a roster id. */
export const isCharacter = (id: string) => Boolean(CHARACTER_BY_ID[id]);
