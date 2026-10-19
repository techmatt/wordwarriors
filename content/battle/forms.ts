/**
 * Forms: which images a character appears as in an episode, as data.
 *
 * A character's default form is its roster images (`char_<id>_good`,
 * `face_<id>`): Julia's rainbow twirl dress. A form swaps them for an outfit
 * that suits the episode's scenario, picked by who else is in it: when the ally
 * is Dada Jason the chef, the episode is a chef scenario and Julia is a little
 * chef (`char_julia_chef`, item 012) wherever she appears after she wakes up.
 *
 * Adding a form is data only: draw its images (an outfit entry in
 * content/art/assets.ts, like `char_julia_chef`), then add a line here. The
 * first form whose `when` matches the cast wins, so put the narrower ones first.
 * A form for a villain's or ally's costume works the same way.
 */

export interface Form {
  /** Short name, for logs and the grown-ups page: 'chef'. */
  id: string;
  /** The full-body image used in place of `char_<character>_good`. */
  art: string;
  /** The name-free face card used in place of `face_<character>` (names as sight words). */
  face?: string;
  /** The scenario: every field given must match the episode's cast. */
  when: { ally?: string; villain?: string };
}

/** The cast a form is chosen for. */
export interface Cast {
  ally: string | null;
  villain: string;
}

export const FORMS: Record<string, Form[]> = {
  julia: [
    // The chef scenario: Dada Jason the chef is her ally (Matt, item 016).
    { id: 'chef', art: 'char_julia_chef', face: 'face_julia_chef', when: { ally: 'dada_jason' } },
  ],
};

/** The form `character` takes in an episode with this cast, or null for its default images. */
export function formFor(character: string, cast: Cast): Form | null {
  return (
    (FORMS[character] ?? []).find(
      (f) => (f.when.ally === undefined || f.when.ally === cast.ally) && (f.when.villain === undefined || f.when.villain === cast.villain),
    ) ?? null
  );
}
