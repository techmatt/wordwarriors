/**
 * Who is in an episode (item 025), drawn fresh each time. Pure: roster data
 * and a random source, unit-tested.
 *
 *   - The dads' forms: each dad gets one of his forms (builder, weightlifter,
 *     cyberdecker or spell-blade Dada Matt; chef, warrior or warlock Dada
 *     Jason). Wherever a dad appears this episode, good or evil, it is in
 *     that form.
 *   - The villain: a person from the active cast's villains (`ACTIVE_CAST`
 *     in src/config.ts, item 028; each equally likely, so the dads' many
 *     forms do not crowd the pool), in their episode form for a dad. Never
 *     one of her last few villains while another is left.
 *   - The ally: a person from the active cast's allies who is neither the
 *     hero nor the villain; a dad sometimes, in his episode form. Her last
 *     allies sit out while two are left to choose from, and each dad's last
 *     forms while one is (items 067 and 121, src/rules/recent.ts `fresh`).
 *   - The primary dad wakes her (and narrates when there is no ally): Dada
 *     Matt 60% of the time, Dada Jason 40%. In half the episodes the other dad
 *     comes into the bedroom too, as the secondary. A dad already playing the
 *     ally or the villain (or the hero) takes no other role, so when both are
 *     busy there is no primary and the ally dad wakes her.
 *
 * Every part can be fixed by an override (`?ally=`, `?villain=`, `?form=`,
 * `?primary=`, `?secondary=`, src/scenes/BootScene.ts); what is left is drawn.
 */

import { DADS, PERSONS, formId, formsOf, personOf } from '../../content/battle/roster';
import { ACTIVE_CAST, CAST_ODDS } from '../config';
import { pick, type Rand } from './random';
import { fresh } from './recent';

/** The two dads (content/battle/roster/dads.ts): the only wakers (their wake-up lines are voiced). */
export { DADS };


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
  /** Her recent allies (persons), newest last (item 067): avoided the same way. */
  recentAllies?: string[];
  /** Each dad's recent forms (roster ids), newest last (item 067): avoided the same way. */
  recentForms?: Partial<Record<string, string[]>>;
  overrides?: CastOverrides;
}

export const isDad = (person: string) => (DADS as readonly string[]).includes(person);

/** The persons of `active` that are in the roster, or every person when it names none. */
function activePersons(active: readonly string[]): string[] {
  const all = PERSONS.map((c) => c.id);
  const on = all.filter((p) => active.includes(p));
  return on.length ? on : all;
}

/** Draw an episode's cast. */
export function drawCast(input: CastInput, rand: Rand = Math.random, active: { allies: readonly string[]; villains: readonly string[] } = ACTIVE_CAST): Cast {
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
    // Item 121: his last two forms sit out while one is left (Dada Jason's three went round; one came back two episodes on in three).
    forms[dad] = byRole ?? (fixed ? formId(dad, fixed) : undefined) ?? pick(fresh(formsOf(dad).map((f) => f.id), input.recentForms?.[dad] ?? [], 1), rand);
  }
  const inForm = (person: string) => (isDad(person) ? forms[person]! : person);

  // The villain. A dad may only be the villain while the other dad (or the
  // ally dad) can still wake her, so a random draw never leaves nobody to.
  let villain: string;
  if (o.villain) villain = o.villain;
  else {
    const allyPerson = o.ally ? personOf(o.ally) : null;
    // When no active villain can play (a fixed ally or hero who is the only
    // one, or a dad villain who would leave nobody to wake her), the whole
    // roster is drawn from instead.
    const wakerLeft = (p: string) => DADS.some((d) => d !== p && d !== heroPerson) || (allyPerson !== null && isDad(allyPerson));
    const can = (p: string) => p !== heroPerson && p !== allyPerson && wakerLeft(p);
    const actives = activePersons(active.villains).filter(can);
    const ok = actives.length ? actives : PERSONS.map((c) => c.id).filter(can);
    // Her last few villains sit out, but always leaving two to choose from, and
    // never last episode's while another is left; one who has left the pool
    // (switched off in ACTIVE_CAST) no longer counts (item 078).
    villain = inForm(pick(fresh(ok, input.recent ?? []), rand));
  }
  const villainPerson = personOf(villain);

  // The ally.
  let ally: string | null;
  if (o.ally !== undefined) ally = o.ally;
  else {
    const pool = activePersons(active.allies).filter((p) => p !== heroPerson && p !== villainPerson);
    // Her last allies sit out like her villains (item 067), leaving two to choose from.
    ally = pool.length ? inForm(pick(fresh(pool, input.recentAllies ?? []), rand)) : null;
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

/** The helper (and narrator): the ally, or with no ally the dad who woke her (`wakerOf`). */
export function helperOf(cast: Pick<Cast, 'hero' | 'ally' | 'primary' | 'villain'>): string {
  return cast.ally ?? wakerOf(cast);
}

/**
 * Whose face the `phonics` voice (word confirmations, letter sounds, sentence
 * prefixes: Dada Matt's voice) shows: Dada Matt's, only when he is in the
 * episode on her side (the dad who woke her, the other dad, the ally, or her
 * hero); otherwise none, so no one who is not there pops up mid-sentence
 * (item 043, M2). The banner or card the line is about is lit anyway.
 */
export function phonicsFace(cast: Pick<Cast, 'hero' | 'ally' | 'primary' | 'secondary'>): string | null {
  const here = [cast.primary, cast.secondary, cast.ally, cast.hero].some((c) => c && personOf(c) === 'dada_matt');
  return here ? 'dada_matt' : null;
}
