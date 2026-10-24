/**
 * Outfits: which images a character appears as in an episode, as data.
 *
 * A character's default images are its roster ones (`char_<id>_good`,
 * `face_<id>`): Julia's rainbow twirl dress. An outfit swaps them for one that
 * suits the episode's scenario, picked by who else is in it: when the ally is
 * Dada Jason the chef, the episode is a chef scenario and Julia is a little
 * chef (`char_julia_chef`, item 012) wherever she appears after she wakes up.
 * (Not a dad's form: that is a whole roster character, `person` in the roster.)
 *
 * Each outfit is one record (item 122): when it is worn, its pictures' prompts
 * (content/art/assets.ts draws `char_<owner>_<id>` and the name-free face card
 * `face_<owner>_<id>` from them) and her height in the picture. Adding one is a
 * record here, then `art:alts` / `art:pick` for its art and a measured `fill`.
 * The first outfit whose `when` matches the cast wins, so put the narrower
 * ones first. Only Julia's outfits are drawn today: content/art/assets.ts
 * builds their art and prompts from OUTFITS.julia and her roster look, and
 * DRESS_FILL measures only her; another owner's costume needs both extended.
 */

export interface Outfit {
  /** Short name, for logs and the grown-ups page: 'chef'. */
  id: string;
  /** The full-body image used in place of `char_<owner>_good`: `char_<owner>_<id>`. */
  art: string;
  /** The name-free face card used in place of `face_<owner>` (names as sight words): `face_<owner>_<id>`. */
  face: string;
  /** The scenario: every field given must match the episode's cast (any one of its ids). */
  when: { ally?: string[]; villain?: string[] };
  /** Taunt keys that do not fit the outfit, never said in it (item 030: no wand in a chef's or a knight's hand). */
  skipTaunts?: string[];
  /**
   * How much of the picture's height is her, head to soles, as `ADULT_FILL`
   * (src/config.ts) is the dads' (hunt 6, M32: the chef's hat and the
   * knight's raised sword counted in her height). `tests/unit/heights.test.ts`
   * checks each against the art's alpha; src/rules/heights.ts `outfitTall`
   * draws the picture so she is as tall as in her dress (`DRESS_FILL`).
   */
  fill: number;
  /** The art prompts' parts: `Julia the little <who>: <her face>, <body>.` */
  who: string;
  body: string;
  /** The face card's clothes: `..., a friendly head-and-shoulders portrait of <her face>, <face>.` */
  faceLook: string;
  /** The face card opens "Julia the little <who>'s face" (items 016, 025), not "Julia's face". */
  namedFace?: boolean;
  /** The placeholder's glyph. */
  glyph: string;
}

/** The cast an outfit is chosen for. */
export interface OutfitCast {
  ally: string | null;
  villain: string;
}

/**
 * Head to soles, the share of each owner's dress picture (`char_<owner>_good`)
 * that is her: the picture her outfits are drawn to. The mean of three
 * measurements (hunt 6's, crops on a 1% grid scaled by the glasses' width,
 * pixel rows where the head shows).
 */
export const DRESS_FILL: Readonly<Record<string, number>> = { julia: 0.957 };

const outfit = (owner: string, o: Omit<Outfit, 'art' | 'face'>): Outfit => ({ ...o, art: `char_${owner}_${o.id}`, face: `face_${owner}_${o.id}` });

export const OUTFITS: Record<string, Outfit[]> = {
  julia: [
    // The chef scenario: Dada Jason the chef is her ally (Matt, item 016).
    {
      id: 'chef', when: { ally: ['dada_jason'] }, skipTaunts: ['wand'], fill: 0.843, glyph: '🥄', who: 'chef', namedFace: true,
      body: "in a cheerful little chef's outfit: a white double-breasted chef's jacket with round buttons, a small red neckerchief, a white apron, a tall puffy white chef's hat, holding up a wooden spoon",
      faceLook: "in a white double-breasted chef's jacket with a small red neckerchief and a tall puffy white chef's hat",
    },
    // The knights' camp: warrior Dada Jason is her ally (item 025).
    {
      id: 'knight', when: { ally: ['dada_jason_warrior'] }, skipTaunts: ['wand'], fill: 0.868, glyph: '🛡️', who: 'knight', namedFace: true,
      body: "in a little shining silver knight's armour over a pink tunic, a short red cape, a small round red shield with a golden star on it and a little wooden toy sword held up high",
      faceLook: "in a little shining silver knight's armour with a short red cape, no helmet",
    },
    // Item 111: a little dragon keeper in Seraphina's secret hatchery (an egg
    // in her arms, no wand), snow gear at Elsa's and Anna's ice castle (the
    // wand kept), a desert explorer at Jasmine's oasis (a compass, no wand).
    // Their fills: eyes to soles against her dress picture's (she is drawn at
    // one scale in all three, the glasses 97 px wide in each), so the goggles,
    // the sun hat and the bobble hat are not her height.
    {
      id: 'keeper', when: { ally: ['seraphina'] }, skipTaunts: ['wand'], fill: 0.945, glyph: '🥚', who: 'dragon keeper',
      body: "in a little dragon keeper's outfit: a warm orange padded vest over a purple long-sleeved top, a brown satchel of dragon snacks on a strap, brown boots, round brass goggles pushed up on her head, hugging a big speckled pastel-pink dragon egg in both arms",
      faceLook: 'in a warm orange padded vest over a purple top, round brass goggles pushed up on her head',
    },
    {
      id: 'snow', when: { ally: ['elsa', 'anna'] }, fill: 0.9, glyph: '❄️', who: 'snow adventurer',
      body: 'in a cosy puffy pink-and-purple snowsuit with fluffy white trim at the hood, a knitted purple bobble hat with a big white pompom, striped mittens and little white snow boots, holding up her golden star wand',
      faceLook: 'in a cosy puffy pink-and-purple snowsuit with fluffy white trim, a knitted purple bobble hat with a big white pompom',
    },
    {
      id: 'explorer', when: { ally: ['jasmine'] }, skipTaunts: ['wand'], fill: 0.95, glyph: '🧭', who: 'desert explorer',
      body: 'in a little desert explorer outfit: a sunny-yellow tunic over loose coral-pink trousers, a wide straw sun hat with a pink ribbon, a light striped scarf, little sandals, holding up a small shiny brass compass',
      faceLook: 'in a sunny-yellow tunic and a light striped scarf, a wide straw sun hat with a pink ribbon',
    },
    // Item 114: a little polar astronaut on Ozymandias's iceberg (her helmet
    // under her arm), a puzzle master in Moriarty's library (a magnifying
    // glass), and Bluerilla's gorilla buddy in a gorilla onesie. No wand.
    // Their fills: her hair's top to soles, less the dress picture's 0.017 gap
    // between the two; the top hat and the gorilla hood's ears are not her height.
    {
      id: 'astronaut', when: { ally: ['ozymandias'] }, skipTaunts: ['wand'], fill: 0.945, glyph: '🚀', who: 'polar astronaut',
      body: 'in a little puffy white-and-pink space suit with a fluffy white fur-trimmed hood down on her back, chunky silver moon boots and pink mittens, a round space helmet with a clear visor held under one arm',
      faceLook: 'in a little puffy white-and-pink space suit with a fluffy white fur-trimmed collar',
    },
    {
      id: 'puzzler', when: { ally: ['moriarty'] }, skipTaunts: ['wand'], fill: 0.93, glyph: '🧩', who: 'puzzle master',
      body: 'in a little puzzle-master outfit: a small purple top hat with a golden band, a plum-purple waistcoat with shiny buttons over a white shirt, a big yellow bow tie, little black shoes, holding up a big round brass magnifying glass',
      faceLook: 'in a plum-purple waistcoat and a big yellow bow tie, a small purple top hat with a golden band',
    },
    {
      // Dressed as her plush gorilla.
      id: 'gorilla', when: { ally: ['rilla'] }, skipTaunts: ['wand'], fill: 0.89, glyph: '🦍', who: 'gorilla buddy',
      body: 'in a cosy fluffy navy-blue gorilla onesie with a big round pale-blue tummy patch, the hood up over her hair with little round gorilla ears and a pale-blue face patch around her face, little navy feet, both arms up in a happy cheer',
      faceLook: 'in a cosy fluffy navy-blue gorilla onesie, the hood up over her hair with little round gorilla ears',
    },
  ].map((o) => outfit('julia', o)),
};

/** The outfit `character` wears in an episode with this cast, or null for its default images. */
export function outfitFor(character: string, cast: OutfitCast): Outfit | null {
  return (
    (OUTFITS[character] ?? []).find(
      (o) => (!o.when.ally || (cast.ally !== null && o.when.ally.includes(cast.ally))) && (!o.when.villain || o.when.villain.includes(cast.villain)),
    ) ?? null
  );
}
