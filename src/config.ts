/**
 * Design resolution and the numbers every scene agrees on.
 *
 * Kept apart from main.ts because main.ts constructs the game as a side
 * effect, and scenes importing the entry point back would be a cycle.
 */
export { PORT } from './port';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Her walking speed in rooms, design pixels per second. */
export const WALK_SPEED = 330;

/**
 * Mirror her character to face the way she walks. Was off while the art was
 * placeholder cards, because a mirrored card mirrors its name; on since every
 * character got real art (art batch 1, 2026-10-18).
 */
export const FLIP_TO_FACE = true;

/** How close (px, centre to centre) she must be for a spot to light up its green dot. */
export const REACH = 95;

/** The two text faces: rounded (the dialogue box, the hub's gift word, the hall's letter board) and comic (the side rooms' banner and tiles). */
export const FONT_ROUNDED = '"Arial Rounded MT Bold", "Arial Black", sans-serif';
export const FONT_COMIC = '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif';

/**
 * Draw order. Rooms and the arena sort world objects by their own y between
 * `ground` and `fx`; the named bands sit above.
 */
export const DEPTH = {
  ground: -100,
  floor: -50,
  /** ...y-sorted world objects live between 0 and 10_000... */
  fx: 20_000,
  prompt: 90_000,
  sparkles: 95_000,
  speech: 100_000,
  hud: 100_100,
  overlay: 110_000,
} as const;

/**
 * Who is in an episode. Since item 025 the cast is drawn fresh every episode
 * (`randomCast`, src/rules/cast.ts): a villain from the whole roster, a random
 * ally, the dads in random forms and roles. The fixed cast below is the
 * "default episode": what `randomCast: false` plays, and what `?cast=default`
 * (the tests' default) plays.
 *
 * `pickScreens: true` brings back the parked hero → ally → villain picks,
 * which then choose those roles; the dads' forms are still drawn.
 * `randomVillain: true` (with `randomCast: false`) draws only the villain.
 *
 * The cast also picks the scenario (content/battle/forms.ts): with `ally:
 * 'dada_jason'` it is the chef episode, Julia as chef Julia from the moment
 * she wakes up.
 */
export const EPISODE_DEFAULTS = {
  pickScreens: false,
  randomCast: true,
  hero: 'julia',
  ally: 'ellie' as string | null,
  villain: 'tiamat',
  /** The default episode's waking dad (a person), in his own form; nobody else comes in. */
  primary: 'dada_matt',
  randomVillain: false,
};

/**
 * The active cast (Matt, item 028): who the random draw picks the ally and
 * the villain from, as persons (roster ids without a form). A dad here comes
 * in any of his forms (four Dada Matts, three Dada Jasons). Everybody else in
 * the roster is still defined, reachable by `?ally=` / `?villain=`, and joins
 * the draw by being added here. The dads wake her whatever this says.
 */
export const ACTIVE_CAST = {
  allies: ['dada_matt', 'dada_jason', 'scar', 'ellie'],
  villains: ['jormungandr', 'smaug', 'bavmorda', 'tiamat'],
};

/** The cast draw's odds (Matt, item 025). */
/**
 * A grown-up (a dad, in any form) stands at least this many times her height,
 * everywhere: rooms, battles, the victory scene and the podium (item 034:
 * at a dad's roster size, 1.2 to 1.25, lifter Dada Matt and warlock Dada Jason
 * read as only a little taller than her).
 */
export const ADULT_HEIGHT = 1.5;

export const CAST_ODDS = {
  /** The primary dad (the one who wakes her) is Dada Matt this often, else Dada Jason. */
  mattPrimary: 0.6,
  /** The other dad also comes into the bedroom this often. */
  secondary: 0.5,
};

/**
 * When a sentence frame counts as solid, so its sentences skip the listening
 * pass and start on her turn. Conservative: at least `tries` answers recorded
 * for the frame and the last `lastRight` of them right first time.
 */
export const SENTENCE_SOLID = { tries: 6, lastRight: 5 };

/**
 * The word machine (item 026): words built per visit, how many of them from
 * the first family before it switches to another, and letter tiles on the
 * floor per word (the right one and silly ones). `weight` is its weight in
 * the rooms' minigame pool (a sentence frame is 1; 2 gives it about every
 * other episode), times how shaky her word families are.
 */
export const WORD_MACHINE = { rounds: 4, perFamily: 3, tiles: 3, weight: 2 };

/**
 * Charge the Spell (item 053, src/scenes/ChargeRoom.ts): a visit spells one
 * word of `units` (fewest, most) sound units (item 058). The helper says each
 * rune's letter sound and she says it back in `sayBackMs` of quiet, with no
 * presses (item 059); then she reads the whole word aloud and Dad presses 2
 * (right) or 1 (they sound it out together); `readTimeoutMs` with no answer
 * counts as his 1. `startLevel` is a sound's help level before it has one
 * (the ramp of item 053 is kept in the store, unused by the room since
 * item 059). `tiers`: the quick sounds (stops, H W Y J...) join once `start` of
 * the continuous ones (M S F A L N R V Z, the short vowels) are solid, at
 * weight `min`, full at `full`; the digraphs (SH CH TH) the same off the
 * quick ones. `weight` is its weight in the rooms' pool (a frame is 1).
 */
export const CHARGE = {
  units: [3, 4] as [number, number],
  sayBackMs: 1500,
  readTimeoutMs: 10000,
  startLevel: 1 as 1 | 2 | 3,
  weight: 1,
  tiers: {
    2: { start: 0.3, full: 0.7, min: 0.25 },
    3: { start: 0.3, full: 0.7, min: 0.2 },
  } as Record<2 | 3, { start: number; full: number; min: number }>,
};

/**
 * The Stretchy Bridge (item 054, src/scenes/BridgeRoom.ts): the word's
 * letters are stepping stones over a gap; while she stands on one its sound
 * is held, so how slowly she slides is how slowly she stretches the word.
 * `words` per visit, `pictures` on the far bank (the word's included).
 * `slide`: her speed on the stones, a share of her walking speed. A held
 * sound is one smooth stretched sound (HELD_MS in src/audio/holdSound.ts,
 * 1.3 s), then quiet; while she stays on its stone it sounds again after
 * `resoundMs` of quiet (a stop sound plays once each time she steps on).
 * Each word has its own help level: 1 = the
 * stones sound themselves and the pictures show from the start; 2 = silent
 * stones, Dad's 2 is a hint (they sound); 3 = she says the word aloud first,
 * Dad's 2 brings the pictures, his 1 replays the slide with sounds (each
 * stone `replayMs`). Nothing from Dad for `dadWaitMs` counts as his 1; after
 * `replays` the pictures come anyway. `startLevel` is a word she has never
 * crossed. `tiers`: CVC words starting with a sound you can hold (M S F L N R
 * V Z) first; CVC words starting with a stop sound join once `start` of those
 * are at level 2 or more, at weight `min`, full at `full`; then the blends and
 * digraphs (also behind the bank's own level gates) off the stop-sound words.
 * `weight` is its weight in the rooms' pool.
 */
export const BRIDGE = {
  words: 3,
  pictures: 3,
  startLevel: 1 as 1 | 2 | 3,
  weight: 1,
  slide: 0.55,
  resoundMs: 2000,
  replayMs: 700,
  dadWaitMs: 12000,
  replays: 2,
  tiers: {
    2: { start: 0.3, full: 0.7, min: 0.25 },
    3: { start: 0.3, full: 0.7, min: 0.2 },
  } as Record<2 | 3, { start: number; full: number; min: number }>,
};

/**
 * Beta (item 053): every episode has one of the phonics games (Charge the
 * Spell or the Stretchy Bridge, item 054, drawn by weight) behind one of the
 * two side doors. Off, each is only its weight in the pool. A test URL that
 * picks its own games (`?games=sentence`, `?game=`) is left alone;
 * `?room=charge` or `?room=bridge` forces that one anyway.
 */
export const FORCE_PHONICS_ROOM = true;

/**
 * The home warm-up (item 033, src/scenes/EntryScene.ts): "Before we head out,
 * let's grab the ..." in the entry hall. Each word has its own level on a
 * ramp: 1 = the word, its letter names and its letter sounds; 2 = names and
 * sounds, no word; 3 = sounds only. `startLevel` is where a word she has never
 * grabbed starts; right first time moves a word up a level, a miss on its
 * first try moves it down. `helpAfter` misses add the whole word to the clue.
 * `objects` labelled pictures stand in the hall.
 */
export const GRAB = { startLevel: 2 as 1 | 2 | 3, helpAfter: 3, objects: 9 };

/**
 * The word bank's draws (item 037, src/rules/bank.ts). A word is `solid` at
 * or under this shakiness (about one miss in four recent first tries, after
 * three or more); `firm` is when a room's other pictures and the other move
 * pads start to share its first sound or rime. `levels`: level 2 (blends)
 * opens once `start` of the level-1 words are solid, at weight `min`, rising
 * to full weight at `full`; level 3 (digraphs) the same off level 2. Level 2
 * starts low on purpose, so she meets a few blends early.
 */
export const BANK_DRAW = {
  solid: 0.3,
  firm: 0.35,
  levels: {
    2: { start: 0.03, full: 0.4, min: 0.15 },
    3: { start: 0.2, full: 0.6, min: 0.1 },
  } as Record<2 | 3, { start: number; full: number; min: number }>,
};

/** How long in the bedroom (ms, after the news) before the door starts to sparkle. */
export const DOOR_SPARKLE_MS = 12_000;

/** Pad face colours, as a child sees them. Rules code talks in these names, never A/B. */
export const PAD_COLOR = {
  green: 0x44d95a,
  red: 0xe8483f,
  blue: 0x3d7fe0,
  yellow: 0xf2c43d,
} as const;

export type PadColorName = keyof typeof PAD_COLOR;

/** Standing still this long brings the stick hint beside her (the rooms before she first moves; the battle's move choice, item 043). */
export const STICK_HINT_MS = 4000;
