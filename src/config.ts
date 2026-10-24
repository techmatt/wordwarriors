/**
 * Design resolution and the numbers every scene agrees on.
 *
 * Kept apart from main.ts because main.ts constructs the game as a side
 * effect, and scenes importing the entry point back would be a cycle.
 */
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
/** The heavy display face: titles, banners, the speech bubbles, the grown-ups' corner tags. */
export const FONT_HEAVY = '"Arial Black", sans-serif';

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
 * (`castEpisode`, src/episode/draws.ts, drawing with `drawCast` in
 * src/rules/cast.ts): a villain from the whole roster, a random
 * ally, the dads in random forms and roles. The fixed cast below is the
 * "default episode": what `randomCast: false` plays, and what `?cast=default`
 * (the tests' default) plays.
 *
 * `pickScreens: true` brings back the parked hero → ally → villain picks,
 * which then choose those roles; the dads' forms are still drawn.
 * `randomVillain: true` (with `randomCast: false`) draws only the villain.
 *
 * The cast also picks the scenario (content/battle/outfits.ts): with `ally:
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
  // Item 111: Seraphina, Elsa, Anna and Jasmine join (Matt, 2026-10-22);
  // item 114: Ozymandias, Moriarty and Bluerilla (`rilla`).
  allies: ['dada_matt', 'dada_jason', 'scar', 'ellie', 'seraphina', 'elsa', 'anna', 'jasmine', 'ozymandias', 'moriarty', 'rilla'],
  // Item 115: Evil Elsa, Evil Ozymandias and Evil Moriarty join the villains.
  villains: ['jormungandr', 'smaug', 'bavmorda', 'tiamat', 'elsa', 'ozymandias', 'moriarty'],
};

/**
 * A grown-up (a dad, in any form) stands this tall beside her, everywhere:
 * rooms, battles, VS cards, the victory scene and the podium (item 034: at a
 * dad's roster size, 1.2 to 1.25, lifter Dada Matt and warlock Dada Jason read
 * as only a little taller than her). Since item 093 it is the person's own
 * height, head to soles, in her heights (her picture is 1): his picture is
 * drawn `ADULT_HEIGHTS[person] / ADULT_FILL[art]` tall (`adultHeight`).
 */
export const ADULT_HEIGHT = 1.44;

/**
 * Each dad's own height, head to soles (Matt, item 093: Dada Matt 5-10%
 * shorter than Dada Jason beside him, in every form). Until item 093 every dad
 * picture was 1.5 tall, so the chef's hat, the warlock's hood and the
 * warrior's helmet came out of his height: Jason read up to 11% SHORTER than Matt.
 * Now Jason is what Matt was (1.44: builder Matt's head to soles in a 1.5
 * picture) and Matt 7.5% under him. So Matt shrinks a little beside her
 * (pictures 1.37-1.43, were 1.5) and Jason's hatted forms grow (the chef's
 * picture 1.65-1.67), still well under a giant's 2.
 */
export const ADULT_HEIGHTS: Readonly<Record<string, number>> = { dada_jason: ADULT_HEIGHT, dada_matt: 1.33 };

/**
 * How much of each grown-up picture's height is the person, the top of his
 * head (not a hat, hood, horns, goggles or a raised weapon) to his soles,
 * measured in item 093: the mean of three independent measurements (crops on
 * a 1% grid, facial proportions, pixel rows), which agreed within 1% and with
 * a fourth by eye within 2% (`tests/unit/heights.test.ts` checks each against
 * the art's own alpha). New dad art needs its line here;
 * a picture with none counts as 0.96, a bare head.
 */
export const ADULT_FILL: Readonly<Record<string, number>> = {
  char_dada_jason_good: 0.872,
  char_dada_jason_evil: 0.863,
  char_dada_jason_warlock_good: 0.942,
  char_dada_jason_warlock_evil: 0.904,
  char_dada_jason_warrior_good: 0.927,
  char_dada_jason_warrior_evil: 0.883,
  char_dada_matt_good: 0.966,
  char_dada_matt_evil: 0.933,
  char_dada_matt_lifter_good: 0.961,
  char_dada_matt_lifter_evil: 0.965,
  char_dada_matt_cyber_good: 0.963,
  char_dada_matt_cyber_evil: 0.96,
  char_dada_matt_blade_good: 0.973,
  char_dada_matt_blade_evil: 0.939,
};

/** The cast draw's odds (Matt, item 025). */
export const CAST_ODDS = {
  /** The primary dad (the one who wakes her) is Dada Matt this often, else Dada Jason. */
  mattPrimary: 0.6,
  /** The other dad also comes into the bedroom this often. */
  secondary: 0.5,
};

/**
 * How far the help ramps may go (item 067, Matt's ruling: no automatic
 * difficulty). Every per-word help ramp (the warm-up's clue
 * level, the Stretchy Bridge's) still records her level as
 * she plays, for the grown-ups page, but the game gives at most this level:
 *
 * - 1, base: every ramp stays at its most helpful start (`startLevel`); a
 *   solid sentence frame still plays its listening pass; distractors never
 *   start to share a firm word's first sound or rime;
 * - 2: the ramps may reach their level 2 (her recorded level, up to 2); solid
 *   frames skip the listening pass; firm words get sound-alike distractors;
 * - 3: the ramps go all the way, as before item 067.
 *
 * Matt raises it himself; the grown-ups page shows it. `?difficulty=` sets it
 * for a session (tests).
 */
export const DIFFICULTY: 1 | 2 | 3 = 1;

/**
 * Variety across episodes (item 067): how many past episodes each rotation
 * remembers and avoids while another choice is left (always leaving two to
 * choose from). `rotations`: the ally, each dad's form, the house's side
 * rooms, the side-room games, the helper's quest line and hub scene, the line
 * variants and the victory scene (the villain keeps its own 4, item 025).
 * `words`: how many of her latest right-first-time reads weigh `wordWeight`
 * in the bank's draws (src/rules/bank.ts `drawWords`), so last episode's
 * words rarely come straight back; a word she missed keeps its full weight.
 * `gameWeight`: a game of her last episodes weighs this much in the pool
 * (last episode's own sit out while another fits: item 137, `repeatsLast`).
 */
export const VARIETY = { rotations: 2, words: 24, wordWeight: 0.25, gameWeight: 0.35 };

/**
 * When a sentence frame counts as solid, so its sentences skip the listening
 * pass and start on her turn (only from DIFFICULTY 2, item 067). Conservative:
 * at least `tries` answers recorded for the frame and the last `lastRight` of
 * them right first time.
 */
export const SENTENCE_SOLID = { tries: 6, lastRight: 5 };

/**
 * The word machine (item 026): words built per visit, how many of them from
 * the first family before it switches to another, and letter tiles on the
 * floor per word (the right one and silly ones). `weight` is its weight in
 * the rooms' minigame pool (a sentence frame is 1; 2 gives it about every
 * other episode), times how shaky her word families are. `maxUnits`: the
 * longest word it builds, in sound units (item 067; SH is one).
 */
export const WORD_MACHINE = { rounds: 4, perFamily: 3, tiles: 3, weight: 2, maxUnits: 4 };

/**
 * Dad isn't here (item 106): a game that asks Dad (Charge the Spell's read,
 * the Stretchy Bridge's level 3) waits this long from her turn (scene time,
 * paused under dad lock and while a line plays), then the game goes solo:
 * the helper joins in where Dad would have judged, and stays that way for
 * the rest of the session (`episode.solo`; hunt 7, M34: the episodes after
 * it too). Any Dad 1 / 2 in a game that asks him switches back.
 */
export const DAD_AWAY_MS = 8000;

/**
 * Charge the Spell (item 053, src/scenes/ChargeRoom.ts): a visit spells one
 * word of `units` (fewest, most) sound units (item 058). The helper says each
 * rune's letter sound and she says it back in `sayBackMs` of quiet, with no
 * presses (item 059); then she reads the whole word aloud and Dad presses 2
 * (right) or 1 (they sound it out together); nothing from him for
 * DAD_AWAY_MS turns on the session's solo mode (item 106, M34). In solo mode the
 * helper says each sound with her ("Say it with me!") and charges the rune
 * after `soloBeatMs`, then they read the word together; those are recorded as
 * modelled, not as her reads. It has no help ramp (item 053's went in item 078: the
 * room says every sound since item 059). `units` is the game's word length limit;
 * every sound is in play from the start (item 067: no tiers). `weight` is its
 * weight in the rooms' pool (a frame is 1).
 */
export const CHARGE = {
  units: [3, 4] as [number, number],
  sayBackMs: 1200,
  soloBeatMs: 600,
  weight: 1,
};

/**
 * The Stretchy Bridge (item 054, src/scenes/BridgeRoom.ts): the word's
 * letters are stepping stones over a gap; while she stands on one its sound
 * is held, so how slowly she slides is how slowly she stretches the word.
 * `words` per visit, `pictures` on the far bank (the word's included).
 * `slide`: her speed on the stones, a share of her walking speed. A held
 * sound (a vowel, M N L R V Z, F S SH TH: `canHold`) is one short natural
 * stretch, `stretchMs` long in all, its 0.2 s fade-out included
 * (src/audio/holdSound.ts), then quiet for as long as she stays on its stone:
 * no repeat (item 085, Matt's call, to revisit once the phonics clips are
 * final; it was 1.3 s and sounded again every 2 s). A stop sound (P T K B D
 * G, and H W Y X CH) plays once, its burst only, each time she steps on.
 * Each word has its own help level: 1 = the
 * stones sound themselves and the pictures show from the start; 2 = silent
 * stones, Dad's 2 is a hint (they sound); 3 = she says the word aloud first,
 * Dad's 2 brings the pictures, his 1 replays the slide with sounds (each
 * stone `replayMs`). Nothing from Dad for DAD_AWAY_MS turns on solo mode
 * (item 106): the pictures come, no help counted, and while solo level 3
 * skips the say step; after `replays` the pictures come anyway. `startLevel` is a word she has never
 * crossed (DIFFICULTY caps the ramp). `maxUnits`: the longest word she
 * crosses, in sound units (item 067: every short word is in play from the
 * start, no tiers; a visit still plays words starting with a sound you can
 * hold first). The far bank's other pictures may be longer: she does not
 * read them. `weight` is its weight in the rooms' pool.
 */
export const BRIDGE = {
  words: 3,
  pictures: 3,
  startLevel: 1 as 1 | 2 | 3,
  maxUnits: 4,
  weight: 1,
  slide: 0.55,
  stretchMs: 600,
  replayMs: 700,
  replays: 2,
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
 * let's take the ..." in the entry hall. Each word has its own level on a
 * ramp, a phonics clue that never says the word (amendment 1549) nor a
 * letter's name (item 137): 1 and 2 = the sounds, unit by unit (NG SH CK LL
 * one sound each: item 085), the letters shown; 3 = the sounds, blank boxes. `startLevel` is where a word she has
 * never grabbed starts; right first time moves a word up a level, a miss on
 * its first try moves it down (recorded always; DIFFICULTY caps the level the
 * hall gives). From `helpAfter` misses the clue is the slow sound-out, letters
 * shown, never blended. `objects` pictures stand in the hall. `maxUnits`: the
 * longest word she is asked to grab, in sound units (item 067); the other
 * pictures may be longer.
 */
export const GRAB = { startLevel: 1 as 1 | 2 | 3, helpAfter: 3, objects: 9, maxUnits: 4 };

/**
 * The word bank's draws (item 037, src/rules/bank.ts). A word is `solid` at
 * or under this shakiness (about one miss in four recent first tries, after
 * three or more); `firm` is when a room's other pictures and the other move
 * pads start to share its first sound or rime (from DIFFICULTY 2). Every
 * familiar word is in play (item 067: no level gate); the decoding games keep
 * to short words by their own `maxUnits` / `units`.
 */
export const BANK_DRAW = {
  solid: 0.3,
  firm: 0.35,
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

/**
 * Free play (item 060): green jumps, blue / red / yellow cast, wherever she is
 * free to move and no answer is open (`src/fx/freePlay.ts`). Pure play: it
 * never touches a fight or an answer.
 *
 * - `maxShots`: live shots at once; one more pops the oldest early.
 * - `chargeMs`: a cast button held this long charges a big shot (shorter is a tap);
 *   `fullChargeMs` is fully charged.
 * - `jump`: launch speed and gravity (px/s, px/s²); holding green softens gravity
 *   (`holdGravity`, a share) for up to `holdMs`, so a hold goes higher and floats down.
 * - `shotSpeed`, `shotLifeMs`: how fast and how long a shot flies.
 */
export const FREE_PLAY = {
  maxShots: 10,
  chargeMs: 260,
  fullChargeMs: 900,
  jump: { speed: 560, gravity: 2600, holdGravity: 0.38, holdMs: 420 },
  shotSpeed: 760,
  shotLifeMs: 900,
};

/**
 * The victory scene's beats of quiet (ms, `src/scenes/EndingScene.ts`): time to
 * take the scene in before the first line, a breath between lines, a moment
 * after the last. With its four lines and the fades the scene runs 15–30 s
 * (asserted over drawn casts, tests/unit/endings.test.ts).
 */
export const ENDING_PAUSE = { intro: 3000, between: 1500, outro: 3000 };

/**
 * The Shape-Shifter (item 096, src/scenes/ShifterRoom.ts): the villain's
 * polymorph spell walks a creature down a chain of pictured CVC words, one
 * letter changed a link (CAT, BAT, BAG, BUG, MUG). `links` per visit (a
 * shorter chain where the bank has no longer one; `minLinks` at least, else
 * the room plays a sentence game). `options`: pictures (read it) or letter
 * stones (fix it) standing in the room, the answer's included. Each word has
 * its own help level: 1 = the changed letter lit and each stone sounds as she
 * comes near it; 2 = lit, silent stones; 3 = nothing lit. Yellow sounds the
 * changed letter (read it) or the stone in reach (fix it) at any level.
 * `startLevel` is a word she has never met there (DIFFICULTY caps the ramp).
 * `weight` is its weight in the rooms' pool. `recentChains`: the chains it
 * remembers across episodes (hunt 7, M36), a rotation of their own: a chain
 * sharing a link with one of them waits, where the pool allows. `wordChains`
 * (item 126, Matt's pick 2b): a chain holding a word of the last few chains
 * waits too, and to let one in "the most places changed" gives way (six was
 * nearly every word, so nothing waited).
 */
export const SHIFTER = {
  links: 4,
  minLinks: 2,
  options: 3,
  startLevel: 1 as 1 | 2 | 3,
  weight: 1,
  recentChains: 6,
  wordChains: 2,
};

/**
 * Beta (item 096; item 126, Matt's pick; item 137): 3 episodes in 7 have a
 * Shape-Shifter behind door b, never two running (beside FORCE_PHONICS_ROOM's game behind door
 * a); the others a fetch sentence frame or the word machine there. `afterOne`
 * is the chance in an episode after one that had it, `afterNone` after one
 * that did not. Item 137 (games rotate strictly): never twice running, so
 * `afterOne` is 0 and it is in 3 episodes of 7 in the long run (it was 0.25:
 * a half). 0 and 0 turn it off (door b from the pool); 1 and 1 force it
 * every episode. A test URL that picks its own games (`?games=sentence`,
 * `?game=`) is left alone; `?room=shifter` forces it anyway.
 */
export const SHIFTER_ROOM = { afterOne: 0, afterNone: 0.75 };

/**
 * The rhyme room (item 139, src/scenes/RhymeRoom.ts): `rounds` a visit, each
 * from a different word family (fewer where the episode leaves too few free;
 * `minRounds` at least, else the room plays a sentence game). Each round shows
 * two rhyming words, said, and prints a third, unsaid; three pictures stand in
 * the room, the printed word's and its two wrong ones (`wrongPictures`). Each word has its own help level:
 * 1 = the helper sounds the printed word out, then asks; 2 and 3 = sounded out
 * only on yellow (yellow sounds it out at any level). `startLevel` is a word she
 * has never met there (DIFFICULTY caps the ramp). `weight` is its weight in the
 * rooms' pool: drawn, it is behind door b in the episodes without the Shape-Shifter,
 * beside the fetch sentence frames and the word machine.
 */
export const RHYME = { rounds: 3, minRounds: 2, startLevel: 1 as 1 | 2 | 3, weight: 2 };

/**
 * A villain's story fight (item 126, Matt's pick: Evil Smaug's in half his
 * episodes; `storyFight` on the roster entry): its chance in an episode he is
 * drawn as the villain, after his last such episode played it (`afterOne`) or
 * his own style (`afterNone`), a half in the long run. Before an ally's nudge
 * (chef Dada Jason's cook-off), which it takes the place of.
 */
export const STORY_FIGHT = { afterOne: 0.25, afterNone: 0.75 };
