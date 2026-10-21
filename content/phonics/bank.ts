/**
 * The word bank (item 037): every word she reads, one list, each tagged with
 * what it teaches. Key words, the battle's move pads, the ally's gift word,
 * the counter, the warm-up's pictures and the word machine's families all
 * draw from here, through one weighting (src/rules/bank.ts).
 *
 * A word's phonics tags are derived from its spelling, never typed by hand:
 *
 * - `units`: its sound units, the letters with SH CH TH CK NG QU kept
 *   together, and a doubled letter (EGG, BELL) as one (the hint sounds a
 *   unit, never a lone letter of one);
 * - `level`: 1 = CVC (CAT), 2 = a consonant blend (FROG, JUMP), 3 = a digraph
 *   (SHIP, DUCK; a word with both is 3);
 * - `vowel`: its short vowel; `onset` the sound units before it (`fr`, `sh`,
 *   or `` for ANT); `rime` the rest (`og`).
 *
 * `role` is what the word can be (and `odd`, item 040, marks a picture a
 * four-year-old would not know: such a word is never a picture to match): a `thing` with a clear picture (a room's
 * object, a key word, the counter, a warm-up picture, a fetched battle item),
 * an `action` with a clear battle effect (a move pad, the ally's gift), or
 * `both` (NET flung, or fetched).
 *
 * Every word has a picture, `pic_<word>` (content/art/assets.ts; the prompt is
 * PICTURES in content/art/prompts.ts), a `word_<word>` line, and a battle
 * effect (content/phonics/effects.ts). An action also has its "Use X!" line per
 * narrator. `glyph` is the placeholder card's emoji until real art lands;
 * `draw` a canvas drawing where Windows 10's emoji font has none. `say` is a
 * respelling for edge-tts where it misreads the word.
 *
 * Coverage (item 056, `COVERAGE` below; README, "The word bank's coverage
 * rule"). Counting familiar pictured words only (THINGS), the bank keeps:
 *
 * - 3 per first sound, every letter sound and digraph (QU as Q), or the lower
 *   target COVERAGE.first gives with its reason: I O U X have 1 and A Z 2,
 *   through words with sounds she has not been taught (item 058: IGLOO,
 *   OCTOPUS, UMBRELLA, X-RAY, APPLE, ZOO, ZEBRA); E Q W Y TH have 1-2; voiced
 *   TH none;
 * - a last sound: 3 for B D G K L M N P S T X CK NG SH, fewer for F Z CH TH;
 * - 8 per short vowel; 2 pictures per word-machine family, the listed
 *   families staying families;
 * - the Stretchy Bridge: 3 early words (levels 1-2, short vowel) per first
 *   sound it lists (COVERAGE.bridgeStarts; R V J have 2), so its far bank can show two that start alike and differ later;
 * - long vowels: E 3, O A I 2 each, U none yet.
 *
 * tests/unit/coverage.test.ts fails on any row under target; `npm run
 * bank:audit` prints the table. Lower a target only with its reason.
 *
 * Pure data: no Phaser, so the voice composer and the unit tests read it.
 */

import { isUntaught } from './letters.js';

export type Role = 'thing' | 'action' | 'both';
export type Level = 1 | 2 | 3;
export type Vowel = 'a' | 'e' | 'i' | 'o' | 'u';

export interface BankEntry {
  word: string;
  role: Role;
  glyph?: string;
  draw?: 'fan' | 'log' | 'mop' | 'pot' | 'mug' | 'rug';
  say?: string;
  /** The item that added it: before 037 (`old`), 037, 040, 054, 056 or 058. */
  since?: '037' | '040' | '054' | '056' | '058' | '059';
  /** It sounds like a spell (ZAP, HEX, POP; not MUD or NAP): a caster's gift leans to it (item 038, `drawGift`). */
  spell?: true;
  /**
   * A typical four-year-old would not know it from its picture (YAK, VAT, COG;
   * item 040). It never fills a role where she matches the word to a picture
   * (a room's key word, the counter, the warm-up, the word machine): a `both`
   * word keeps its action role (pads, the gift), a `thing` drops out of play.
   */
  odd?: true;
  /**
   * A long-vowel word, spelled out by hand: each sound unit's letters and its
   * sound (a key of SOUND_BY_UNIT in content/phonics/letters.ts). The right
   * familiar picture for a first sound the bank had none of (item 043: KEY for
   * K, YOYO for Y). Item 048: it sounds out like any word, every unit (KEY is
   * K, long E on EY; YOYO is Y, long O, Y, long O). Level 1 (or 3 if `late`),
   * no short-vowel tag, never in a word family. Item 056: a spelled word with
   * one short vowel and nothing long or silent (THUMB: MB saying M) is tagged
   * like any word, vowel, level and family included.
   */
  spelled?: [letters: string, sound: string][];
  /**
   * Item 056: a long-vowel word that comes later, at level 3 with the
   * digraphs (QUEEN, GOAT, KITE), where KEY and YOYO are level 1. A silent
   * letter's sound is `` (the E of KITE): the hint lights it and says nothing.
   */
  late?: true;
}

export interface BankWord extends BankEntry {
  /** Its sound units' letters, in order: SHIP is SH I P, KEY is K EY. */
  units: string[];
  /** Each unit's sound, the SOUND_BY_UNIT key: the unit itself, except a hand-spelled word's (EY is `long_e`). */
  sounds: string[];
  level: Level;
  /** Its short vowel; null for a long-vowel word (KEY), which has none. */
  vowel: Vowel | null;
  onset: string;
  rime: string;
}

const T = (word: string, glyph?: string, extra: Partial<BankEntry> = {}): BankEntry => ({ word, role: 'thing', ...(glyph ? { glyph } : {}), ...extra });
const A = (word: string, glyph?: string, extra: Partial<BankEntry> = {}): BankEntry => ({ word, role: 'action', ...(glyph ? { glyph } : {}), ...extra });
const B = (word: string, glyph?: string, extra: Partial<BankEntry> = {}): BankEntry => ({ word, role: 'both', ...(glyph ? { glyph } : {}), ...extra });
const NEW = { since: '037' as const };
const SPELL = { spell: true as const };
const NEW_SPELL = { ...NEW, ...SPELL };
const ODD = { odd: true as const };
const NEW_ODD = { ...NEW, ...ODD };
const NEW_040 = { since: '040' as const };
const NEW_054 = { since: '054' as const };
const NEW_056 = { since: '056' as const };
/** Item 058: a familiar picture holding a sound she has not been taught (UNTAUGHT_SOUNDS): level 3, with the digraphs. */
const UNTAUGHT_058 = { since: '058' as const, late: true as const };

const ENTRIES: BankEntry[] = [
  // Level 1: CVC. The pictured words from before 037.
  T('cat', '🐱'), T('dog', '🐶'), T('fox', '🦊'), T('bug', '🐛'), T('hat', '🎩'), T('bed', '🛏️'),
  T('cup', '☕'), T('map', '🗺️'), T('bus', '🚌'), T('hen', '🐔'), T('box', '📦'), T('pen', '🖊️'),
  T('van', '🚐'), T('bat', '🦇'), T('bag', '👜'), T('can', '🥫'), T('nut', '🥜'), T('tub', '🛁'),
  T('cap', '🧢'), T('pin', '📌'), T('log', undefined, { draw: 'log' }), T('mop', undefined, { draw: 'mop' }),
  T('pot', undefined, { draw: 'pot' }), T('rat', '🐀'), T('mug', undefined, { draw: 'mug' }),
  T('rug', undefined, { draw: 'rug' }), T('jug', '🏺'),
  // Pictured words that were move words too.
  B('sun', '☀️'), B('fan', undefined, { draw: 'fan' }), B('web', '🕸️'), B('net', '🥅'), B('jet', '✈️', ODD),
  B('pig', '🐷'), B('pan', '🍳'), B('ram', '🐏', ODD), B('top', '🌀', ODD),
  // The move words from before 037.
  A('zap', '⚡', SPELL), A('bam', '🔨'), A('zip', '☄️', SPELL), A('hop', '🐇'), A('pop', '🎈', SPELL), A('hug', '🧸'),
  A('big', '🐘'), A('hot', '🌶️'), A('dig', '⛏️'), A('run', '👟'), A('mud', '🟤'), A('wet', '💦'),
  A('fog', '🌫️'), A('tug', '➰'), A('fix', '🔧'),
  // Item 037, level 1: short i, short e and the rare first sounds (Y, V, K, L, J, G).
  T('jam', '🍓', NEW), T('yak', '🐂', NEW_ODD), T('vat', '🍯', NEW_ODD), T('leg', '🦵', NEW), T('peg', '📎', NEW_ODD),
  T('wig', '💇', NEW_ODD), T('bib', '👶', NEW), T('fig', '🟣', NEW_ODD), T('six', '6️⃣', NEW), B('fin', '🦈', NEW_ODD),
  T('kit', '🧰', NEW_ODD), T('lip', '👄', NEW), T('cog', '⚙️', NEW_ODD), T('rod', '🎣', NEW_ODD), T('pod', '🌱', NEW_ODD),
  T('gum', '🍬', NEW_ODD), T('bun', '🍞', NEW), T('hut', '🏠', NEW_ODD), T('sub', '🐳', NEW_ODD),
  A('nap', '😴', NEW), A('wag', '🐕', NEW), A('jab', '🥊', NEW), A('red', '🔴', NEW), A('hex', '🔮', NEW_SPELL),
  A('jig', '💃', NEW), A('mix', '🥣', NEW_SPELL), A('jog', '🏃', NEW), A('bop', '🔨', NEW), A('dot', '⚫', NEW),
  A('hum', '🎵', NEW), A('yum', '😋', NEW),
  // Item 037, level 2: blends.
  T('frog', '🐸', NEW), T('drum', '🥁', NEW), T('crab', '🦀', NEW), T('flag', '🚩', NEW), T('sled', '🛷', NEW_ODD),
  T('nest', '🥚', NEW), T('tent', '⛺', NEW), T('desk', '🗄️', NEW), T('belt', '🥋', NEW), T('vest', '🦺', NEW_ODD),
  T('plum', '🍑', NEW_ODD), T('gift', '🎁', NEW), T('lamp', '💡', NEW), T('hand', '✋', NEW), T('mask', '🎭', NEW),
  T('raft', '🛶', NEW_ODD), T('plug', '🔌', NEW_ODD), T('slug', '🐌', NEW_ODD), T('twig', '🌿', NEW_ODD), T('ant', '🐜', NEW),
  T('milk', '🥛', NEW),
  A('jump', '🦘', NEW), A('spin', '🌀', NEW_SPELL), A('swim', '🏊', NEW), A('flip', '🥞', NEW_SPELL), A('stomp', '🦖', NEW),
  A('slam', '💥', NEW), A('grab', '🦾', NEW), A('clap', '👏', NEW), A('bump', '🚗', NEW), A('snap', '🐊', NEW_SPELL),
  A('skip', '🎗️', NEW), A('twist', '🌪️', NEW_SPELL), A('melt', '🍦', NEW_SPELL), A('lift', '🏗️', NEW), A('plop', '💧', NEW),
  A('flop', '🤽', NEW), A('trap', '🧀', NEW), A('blast', '🚀', NEW_SPELL), A('drip', '🚰', NEW),
  // Item 037, level 3: digraphs, a small start.
  T('ship', '🚢', NEW), T('fish', '🐟', NEW), T('duck', '🦆', NEW), T('sock', '🧦', NEW), T('moth', '🦋', NEW_ODD),
  T('shed', '🏚️', NEW_ODD), T('chick', '🐤', NEW),
  A('chop', '🪓', NEW), A('kick', '🦶', NEW), A('rush', '💨', NEW),
  // Item 040: familiar pictured words where the odd ones left short e, i and o,
  // first sounds V and R, the blends and the digraphs thin.
  T('vet', '🩺', NEW_040), T('chest', '🧰', NEW_040), T('bin', '🗑️', NEW_040), T('rock', '🪨', NEW_040), T('clock', '🕰️', NEW_040),
  T('stick', '🥢', NEW_040), T('brush', '🪥', NEW_040), T('truck', '🚚', NEW_040), T('bath', '🧼', NEW_040),
  T('plant', '🪴', NEW_040), T('crib', '🛌', NEW_040),
  // Item 043: the only pictured K and Y words were odd (KIT, YAK), and no familiar
  // short-vowel picture starts with either, so these two are long-vowel words,
  // spelled out by sound (item 048).
  T('key', '🔑', { spelled: [['k', 'k'], ['ey', 'long_e']] }),
  T('yoyo', '🪀', { say: 'yo-yo', spelled: [['y', 'y'], ['o', 'long_o'], ['y', 'y'], ['o', 'long_o']] }),
  // Item 054: the Stretchy Bridge's far bank needs pictures that share a word's
  // start and differ later; the sounds you can hold had almost none (MAP had
  // only MASK). MAT and MAN beside MAP, LID beside LIP, LOCK beside LOG.
  T('mat', '🟫', NEW_054), T('man', '👨', NEW_054), T('lid', '🍲', NEW_054), T('lock', '🔒', NEW_054),
  // Item 056, the coverage audit: three familiar first-sound pictures for every
  // letter sound the language allows (COVERAGE above). Short-vowel words first:
  // doubled letters (EGG, BELL), NG (KING), the -ING and -OCK families, S and T
  // pictures for the bridge.
  // Item 059: number words are big decorated numerals (a die read as DICE, not SIX).
  T('ten', '🔟', { since: '059' }),
  T('egg', '🥚', NEW_056), T('bell', '🔔', NEW_056), T('doll', '🎎', NEW_056), T('tap', '🚰', NEW_056),
  T('elf', '🧝', NEW_056), T('grass', '🌾', NEW_056), T('glass', '🥤', NEW_056), T('sink', '🧽', NEW_056),
  T('king', '🤴', NEW_056), T('ring', '💍', NEW_056), T('wing', '🦅', NEW_056), T('shell', '🐚', NEW_056),
  T('chips', '🥔', NEW_056), T('bush', '🌳', NEW_056),
  T('thumb', '👍', { ...NEW_056, spelled: [['th', 'th'], ['u', 'u'], ['mb', 'm']] }),
  T('lamb', '🐑', { ...NEW_056, spelled: [['l', 'l'], ['a', 'a'], ['mb', 'm']] }),
  A('quest', '🧭', NEW_056),
  T('quilt', '🛏️', { ...NEW_056, odd: true }),
  // Long vowels: Q and K have no familiar short-vowel first-sound picture but
  // these; J G V SH TH CH get a third; CAKE KITE BIKE give long A and I a start.
  // Magic-E words have a silent E (the sound ''). Level 3,
  // `late` (Matt's default, 2026-10-20), so they come with the digraphs.
  T('queen', '👸', { ...NEW_056, late: true, spelled: [['qu', 'q'], ['ee', 'long_e'], ['n', 'n']] }),
  T('goat', '🐐', { ...NEW_056, late: true, spelled: [['g', 'g'], ['oa', 'long_o'], ['t', 't']] }),
  T('jeep', '🚙', { ...NEW_056, late: true, spelled: [['j', 'j'], ['ee', 'long_e'], ['p', 'p']] }),
  T('sheep', '🐏', { ...NEW_056, late: true, spelled: [['sh', 'sh'], ['ee', 'long_e'], ['p', 'p']] }),
  T('three', '3️⃣', { ...NEW_056, late: true, spelled: [['th', 'th'], ['r', 'r'], ['ee', 'long_e']] }),
  T('cheese', '🧀', { ...NEW_056, late: true, spelled: [['ch', 'ch'], ['ee', 'long_e'], ['s', 'z'], ['e', '']] }),
  T('kite', '🪁', { ...NEW_056, late: true, spelled: [['k', 'k'], ['i', 'long_i'], ['t', 't'], ['e', '']] }),
  T('bike', '🚲', { ...NEW_056, late: true, spelled: [['b', 'b'], ['i', 'long_i'], ['k', 'k'], ['e', '']] }),
  T('vase', '💐', { ...NEW_056, late: true, spelled: [['v', 'v'], ['a', 'long_a'], ['s', 's'], ['e', '']] }),
  T('cake', '🎂', { ...NEW_056, late: true, spelled: [['c', 'c'], ['a', 'long_a'], ['k', 'k'], ['e', '']] }),
  // Item 058, under the untaught-sounds ruling (Matt's): a familiar picture may
  // hold a sound she has not been taught (UNTAUGHT_SOUNDS in letters.ts: long
  // OO, the schwa, X said by its name), spelled by hand with each unit's sound.
  // The first sounds the bank had none or one of: Z, A, I, O, U, X. Level 3
  // (`late`), on the long path (no short-vowel tag, no family, no bridge).
  T('zoo', '🎪', { ...UNTAUGHT_058, spelled: [['z', 'z'], ['oo', 'long_oo']] }),
  T('zebra', '🦓', { ...UNTAUGHT_058, spelled: [['z', 'z'], ['e', 'long_e'], ['b', 'b'], ['r', 'r'], ['a', 'schwa']] }),
  // APPLE: A, P, L, its E silent as in KITE (the L carries the "ul").
  T('apple', '🍎', { ...UNTAUGHT_058, spelled: [['a', 'a'], ['pp', 'p'], ['l', 'l'], ['e', '']] }),
  T('igloo', '🧊', { ...UNTAUGHT_058, spelled: [['i', 'i'], ['g', 'g'], ['l', 'l'], ['oo', 'long_oo']] }),
  T('octopus', '🐙', { ...UNTAUGHT_058, spelled: [['o', 'o'], ['c', 'c'], ['t', 't'], ['o', 'schwa'], ['p', 'p'], ['u', 'schwa'], ['s', 's']] }),
  T('umbrella', '☂️', { ...UNTAUGHT_058, spelled: [['u', 'u'], ['m', 'm'], ['b', 'b'], ['r', 'r'], ['e', 'e'], ['ll', 'l'], ['a', 'schwa']] }),
  // X-RAY: no familiar picture starts with X's KS sound; X-RAY says the
  // letter's name (`x_name`), and the audit counts it as X's first sound.
  T('xray', '🦴', { ...UNTAUGHT_058, say: 'x-ray', spelled: [['x', 'x_name'], ['r', 'r'], ['ay', 'long_a']] }),
];

/** The digraphs that are one sound unit (item 056: NG, and QU, whose sound is Q's "kw"). */
export const DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ng', 'qu'] as const;
/** Doubled letters that are one sound (item 056): EGG is E GG, BELL is B E LL; the sound is the single letter's. Not a digraph: BELL stays level 1. */
export const DOUBLED = ['ff', 'll', 'ss', 'zz', 'gg'] as const;
const VOWELS = 'aeiou';

/** A word's sound units: SHIP is SH I P, DUCK is D U CK, FROG is F R O G, QUEST is QU E S T, BELL is B E LL. */
export function unitsOf(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const two = word.slice(i, i + 2);
    if ((DIGRAPHS as readonly string[]).includes(two) || (DOUBLED as readonly string[]).includes(two)) {
      out.push(two);
      i++;
    } else out.push(word[i]!);
  }
  return out;
}

/** A unit's sound key: QU is Q's, a doubled letter its single letter's, anything else itself. */
export function soundOf(unit: string): string {
  if (unit === 'qu') return 'q';
  if ((DOUBLED as readonly string[]).includes(unit)) return unit[0]!;
  return unit;
}

/** A short vowel's sound key, or a long one (`long_e`), or `` for a silent letter (the E of KITE). */
const isShort = (sound: string) => sound.length === 1 && VOWELS.includes(sound);

/** Level from the units around the vowel: a digraph (SH, NG, QU, MB, TCH; not a doubled letter) is 3, a blend 2, else 1. */
function levelOf(units: string[], vi: number): Level {
  const digraph = units.some((u) => u.length >= 2 && !(DOUBLED as readonly string[]).includes(u));
  const blend = vi > 1 || units.length - vi - 1 > 1;
  return digraph ? 3 : blend ? 2 : 1;
}

/** Tags from the spelling. Throws for a word that is not one short vowel between consonants, unless `spelled` spells it out. */
export function tag(e: BankEntry): BankWord {
  if (e.spelled) {
    const units = e.spelled.map(([letters]) => letters);
    if (units.join('') !== e.word) throw new Error(`bank: ${e.word} is spelled ${units.join('')}`);
    const sounds = e.spelled.map(([, s]) => s);
    // Item 056: a hand-spelled word with one short vowel and nothing long,
    // silent or (item 058) untaught (THUMB is TH U MB, MB saying M) is tagged
    // like any word. ZEBRA, APPLE, UMBRELLA take the long path.
    const vi = sounds.findIndex(isShort);
    if (sounds.filter(isShort).length === 1 && !sounds.some((s) => !s || s.startsWith('long_') || isUntaught(s))) {
      return { ...e, units, sounds, level: levelOf(units, vi), vowel: sounds[vi] as Vowel, onset: units.slice(0, vi).join(''), rime: units.slice(vi).join('') };
    }
    // A long-vowel or untaught-sound word: level 1 (KEY, YOYO), or `late` (item 056) 3, with the digraphs.
    return { ...e, units, sounds, level: e.late ? 3 : 1, vowel: null, onset: units[0]!, rime: units.slice(1).join('') };
  }
  const units = unitsOf(e.word);
  const vi = units.findIndex((u) => VOWELS.includes(u));
  const vowels = units.filter((u) => VOWELS.includes(u));
  if (vi < 0 || vowels.length !== 1) throw new Error(`bank: ${e.word} is not a one-short-vowel word`);
  const onset = units.slice(0, vi);
  return { ...e, units, sounds: units.map(soundOf), level: levelOf(units, vi), vowel: units[vi] as Vowel, onset: onset.join(''), rime: units.slice(vi).join('') };
}

export const BANK: BankWord[] = ENTRIES.map(tag);
export const BANK_BY_WORD: Record<string, BankWord> = Object.fromEntries(BANK.map((w) => [w.word, w]));

/** Pictured words she knows on sight (not `odd`): rooms, key words, the counter, the warm-up, the word machine, fetched items. */
export const THINGS: BankWord[] = BANK.filter((w) => w.role !== 'action' && !w.odd);
/** Words with a battle effect of their own: move pads and the ally's gift. An `odd` `both` word stays one. */
export const ACTIONS: BankWord[] = BANK.filter((w) => w.role !== 'thing');
/** Every word she can be given to read: a thing or an action. Not an `odd` thing (YAK), which is out of play. */
export const LIVE: BankWord[] = BANK.filter((w) => THINGS.includes(w) || ACTIONS.includes(w));
/** The `odd` things out of play (item 040): kept with their pictures and lines, in case Matt overrules one. */
export const DROPPED: BankWord[] = BANK.filter((w) => !LIVE.includes(w));

export interface CoverageTarget {
  target: number;
  /** Why it is under the usual target. */
  why?: string;
}

/** The coverage rule (item 056): see the header. src/rules/bankAudit.ts measures it; tests/unit/coverage.test.ts fails on a gap. */
export const COVERAGE = {
  /** Familiar pictures per first sound, every letter sound and digraph, unless `first` says less and why. */
  firstTarget: 3,
  first: {
    a: { target: 2, why: 'ANT, APPLE; ALLIGATOR and ASTRONAUT she would not read for years' },
    e: { target: 2, why: 'EGG, ELF; ELK and EDGE are no picture she knows' },
    i: { target: 1, why: 'IGLOO (untaught OO); INSECT she would call a bug, INK and INCH no clear picture' },
    o: { target: 1, why: 'OCTOPUS (untaught schwas); OTTER she would not know, an OX she would call a cow' },
    u: { target: 1, why: 'UMBRELLA (an untaught schwa); UP is an idea, UNDER a place, not a picture' },
    q: { target: 1, why: 'QUEEN; QUILT she would call a blanket (odd); QUEST is an action word' },
    x: { target: 1, why: 'X-RAY, its X said by name (x_name); no word starts with the KS sound' },
    w: { target: 2, why: 'WEB, WING; WIG is odd, WELL and WITCH are said in hub scenes (WELL DONE, a good witch)' },
    y: { target: 1, why: 'YOYO; YAK is odd; YAWN, YARN and YOLK need sounds the bank has not got' },
    z: { target: 2, why: 'ZOO, ZEBRA (untaught OO, schwa); ZAP and ZIP are move words, ZIGZAG and ZERO no picture she knows' },
    th: { target: 2, why: 'THUMB, THREE; THORN and THIMBLE she would not know' },
    th_voiced: { target: 0, why: 'THIS, THAT, THE: no picture' },
    ck: { target: 0, why: 'never first' },
    ng: { target: 0, why: 'never first' },
  } as Record<string, CoverageTarget>,
  /** Familiar pictures per last sound, where English ends words on it. */
  last: {
    b: { target: 3 }, d: { target: 3 }, g: { target: 3 }, k: { target: 3 }, l: { target: 3 }, m: { target: 3 },
    n: { target: 3 }, p: { target: 3 }, s: { target: 3 }, t: { target: 3 }, x: { target: 3 },
    ck: { target: 3 }, ng: { target: 3 }, sh: { target: 3 },
    f: { target: 1, why: 'ELF; CLIFF and LEAF are no clear picture or need a long vowel' },
    z: { target: 1, why: 'CHEESE; QUIZ and FIZZ are no picture' },
    ch: { target: 0, why: 'WITCH is said in a hub scene; PEACH and BENCH want sounds to come' },
    th: { target: 1, why: 'BATH; MOTH is odd, TEETH to come' },
  } as Record<string, CoverageTarget>,
  /** Familiar pictures per short vowel. */
  vowelTarget: 8,
  /** Familiar pictures per word-machine family (it needs two to build), and the families that must stay families. */
  familyTarget: 2,
  families: ['at', 'an', 'ap', 'en', 'et', 'og', 'ug', 'in', 'ox', 'un', 'ing', 'ock'],
  /** The Stretchy Bridge (item 054): early words (levels 1-2, short vowel) per first sound, so its far bank shows two that start alike and differ later. */
  bridgeTarget: 3,
  bridgeStarts: ['m', 's', 'f', 'l', 'n', 'r', 'v', 'b', 'c', 'd', 'h', 'p', 't', 'g', 'j'],
  bridge: {
    r: { target: 2, why: 'RAT, RUG; ROCK and RING are level 3, RAFT and RAM odd' },
    v: { target: 2, why: 'VAN, VET; VEST is odd, VASE level 3' },
    j: { target: 2, why: 'JUG, JAM; JET is odd, JEEP level 3' },
  } as Record<string, CoverageTarget>,
  /** Familiar pictures per long vowel (each its own sound line). */
  long: {
    long_e: { target: 3 },
    long_o: { target: 2 },
    long_a: { target: 2 },
    long_i: { target: 2 },
    long_u: { target: 0, why: 'for later: CUBE and MULE are no picture she knows' },
  } as Record<string, CoverageTarget>,
};

export const VOWEL_LIST: Vowel[] = ['a', 'e', 'i', 'o', 'u'];
export const LEVELS: Level[] = [1, 2, 3];
