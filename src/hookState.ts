/**
 * What the scenes publish for the tests to steer by (`room`, `battle`...),
 * read by the test hooks (`window.__ww`, src/testHooks.ts) and the QA probe
 * (src/qa/probe.ts). Its own module so neither imports the other for it.
 */

export interface SpotInfo {
  id: string;
  x: number;
  y: number;
  /** Whether choosing it answers the current item correctly (null = not a question). */
  correct: boolean | null;
  /** Where she stood the first frame it was published (the bug-hunt checker's `spawn-in-reach`, hunt 9). */
  from?: { x: number; y: number };
}

export interface RoomInfo {
  scene: string;
  /** Changes every item: `<game>:<index>:<target>`. Wait for `=== expected`. */
  round: string;
  locked: boolean;
  /** Where she stands, and the image she walks as (her outfit: `char_julia_chef` in a chef episode). */
  player: { x: number; y: number; art: string };
  spots: SpotInfo[];
  /** Every spot drawn at all (enabled or not), by id: a door she cannot use yet is not drawn. */
  shown: string[];
  /** Minigame debug mode's room (item 086): the games on its pedestals, and those finished from it (checked). */
  debug?: { done: string[]; games: string[] };
  /** Ghost boxes in Spelling: the word and how many letters are in. */
  spelling?: { word: string; filled: number };
  /** The sentence game: its tokens (upper case), key word, frame, which pass, the token in play, and every token her green's read lit, in order. */
  sentence?: { tokens: string[]; key: string; frame: string; pass: 'listen' | 'read' | 'find' | 'done'; index: number; skipped: boolean; readLit: number[]; readDot?: { x: number; y: number } | null; bannerBottom?: number };
  /** The home warm-up (item 033): the word to grab, its level on the ramp (1 easiest), misses so far, the hall's pictures. */
  grab?: { word: string; level: number; misses: number; objects: string[]; phase: string };
  /** The word machine (item 026): the round in play (`index` of `rounds`), its tiles, and what is in the slot. */
  machine?: {
    mode: string;
    index: number;
    rounds: string[];
    word: string;
    rime: string;
    family: string[];
    tiles: { letter: string; makes: string; real: boolean }[];
    phase: 'intro' | 'pick' | 'check' | 'done';
    slotted: string | null;
    misses: number;
  };
  /**
   * Charge the Spell (item 053): the visit's runes, the one lit (`index`,
   * `sound`), the phase, whether Dad is being asked now, its
   * timeouts so far, and what is charged.
   */
  charge?: {
    /** The word the runes spell (item 058), and how its read went (Dad's yes or no, `modelled` when it went solo, item 106, or `helped`, his yes during that, M34; null before). */
    word: string;
    read: 'yes' | 'no' | 'modelled' | 'helped' | null;
    /** Solo mode (item 106): the helper says each sound with her and they read the word together. */
    solo: boolean;
    runes: string[];
    index: number;
    sound: string;
    phase: 'explain' | 'prompt' | 'sayback' | 'charging' | 'read' | 'reading' | 'done';
    asking: boolean;
    timeouts: number;
    charged: string[];
    /** Game time (scene clock) since the visit began, and when the read was first asked (0 before): the round's length (item 059). */
    elapsedMs: number;
    readAtMs: number;
  };
  /**
   * The Stretchy Bridge (item 054): the visit's words, the one on the bridge
   * (`index`, `word`, its stones' `units`, the far bank's `pictures`, its help
   * `level`), the phase, the stone she stands on (-1 none), whether the stones
   * sound now, any help so far, whether the pictures are up, Dad's replays and
   * timeouts, wrong picks, whether Dad is being asked, and the sound held now.
   */
  bridge?: {
    words: string[];
    index: number;
    word: string;
    units: string[];
    pictures: string[];
    level: number;
    phase: 'intro' | 'slide' | 'say' | 'replay' | 'pick' | 'check' | 'done';
    stone: number;
    voiced: boolean;
    aided: boolean;
    picturesUp: boolean;
    replays: number;
    timeouts: number;
    misses: number;
    asking: boolean;
    holding: string | null;
  };
  /**
   * The Shape-Shifter (item 096): the chain's first creature and the words
   * read, the link now (`index`; `from` the creature before, `word` the new
   * one, `pos` the letter changed), its beat, what stands in the room
   * (pictures or letter stones), the label on the creature, the help level
   * and whether the changed letter is lit, the phase, wrong picks and any help.
   */
  shifter?: {
    start: string;
    words: string[];
    index: number;
    from: string;
    word: string;
    pos: number;
    beat: 'read' | 'fix';
    options: string[];
    label: string;
    level: number;
    lit: boolean;
    phase: 'intro' | 'pick' | 'check' | 'done';
    misses: number;
    aided: boolean;
  };
}

export interface BattleInfo {
  part: number;
  /** The showdown's fight style (item 031) and what its staging reports (a race lead, the rope's knot...). */
  fight: string;
  stage: Record<string, unknown>;
  phase: string;
  /** The closing fade has started (hunt 10: F9 waits it out). */
  fading?: boolean;
  t: number;
  /** `art`: the image each fights as (an outfit's, for a hero in one); `drawn`: its picture's height on screen standing still (no squash, bob or grow). */
  heroes: { id: string; hp: number; status: string | null; art: string; drawn: number }[];
  villains: { id: string; hp: number; status: string | null; art: string; drawn: number }[];
  minions: number;
  abilitiesFired: number;
  ultimates: number;
  combos: number;
  movePicks: number;
  /** The move choice: its words standing in the arena as pads (`spots`) she walks onto. */
  choice: {
    words: string[];
    right: string;
    open: boolean;
    misses: number;
    /** Where she stood as the pads went down (hunt 7). */
    from: { x: number; y: number };
    spots: { word: string; x: number; y: number }[];
    /** The idle stick hint is beside her hero (item 043, M5). */
    stickHint: boolean;
    /** Where the stick hint's nub has swayed to, px from its middle (item 092: it sways on the wall clock); null with no hint. */
    stickNub: number | null;
    /** Each sign's plate and each teammate's body, [left, top, right, bottom] (item 043, M6). */
    signs: number[][];
    team: { id: string; box: number[] }[];
    /** The villain's body, the same way (item 071, M8, M17), or null with no villain standing. */
    villain: number[] | null;
  } | null;
  /** Her hero's position on the arena floor. */
  me: { x: number; y: number } | null;
  /** Fetched items used this part. */
  itemsUsed: number;
  /** Charge the Spell's runes fired this part (item 053). */
  runesFired: number;
  /** A story fight (item 107): the beat playing, and her walk to a safe spot or the hoard while one is open. */
  story: { beat: string | null; walk: { kind: string; spot: { id: string; x: number; y: number }; reached: boolean } | null } | null;
}

/** The victory recap's cards so far: each word and the picture beside it. */
export interface RecapCard {
  word: string;
  picture: string | null;
}

/** The victory scene (item 027): which, who is in it (roster ids, villain last), its lines and what has been said. */
export interface EndingInfo {
  id: string;
  people: string[];
  art: string[];
  lines: string[];
  said: string[];
  done: boolean;
}

/** THE END (item 085): its background art, the heroes on it, its words, and whether Dad's 2 is waiting. */
export interface TheEndInfo {
  art: string;
  heroes: string[];
  text: string;
  dad: boolean;
}

export const hookState: {
  room: RoomInfo | null;
  battle: BattleInfo | null;
  recap: RecapCard[];
  /** The recap is said and its green is live (on to THE END, item 085). */
  recapDone: boolean;
  ending: EndingInfo | null;
  theEnd: TheEndInfo | null;
  scene: string;
  fps: number;
} = {
  room: null,
  battle: null,
  recap: [],
  recapDone: false,
  ending: null,
  theEnd: null,
  scene: '',
  fps: 0,
};
