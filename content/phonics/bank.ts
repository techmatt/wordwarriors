/**
 * The word bank (item 037): every word she reads, one list, each tagged with
 * what it teaches. Key words, the battle's move pads, the ally's gift word,
 * the counter, the warm-up's pictures and the word machine's families all
 * draw from here, through one weighting (src/rules/bank.ts).
 *
 * A word's phonics tags are derived from its spelling, never typed by hand:
 *
 * - `units`: its sound units, the letters with SH CH TH CK kept together
 *   (the hint sounds a unit, never a lone letter of one);
 * - `level`: 1 = CVC (CAT), 2 = a consonant blend (FROG, JUMP), 3 = a digraph
 *   (SHIP, DUCK; a word with both is 3);
 * - `vowel`: its short vowel; `onset` the sound units before it (`fr`, `sh`,
 *   or `` for ANT); `rime` the rest (`og`).
 *
 * `role` is what the word can be: a `thing` with a clear picture (a room's
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
 * Pure data: no Phaser, so the voice composer and the unit tests read it.
 */

export type Role = 'thing' | 'action' | 'both';
export type Level = 1 | 2 | 3;
export type Vowel = 'a' | 'e' | 'i' | 'o' | 'u';

export interface BankEntry {
  word: string;
  role: Role;
  glyph?: string;
  draw?: 'fan' | 'log' | 'mop' | 'pot' | 'mug' | 'rug';
  say?: string;
  /** The item that added it: before 037 (`old`) or 037. */
  since?: '037';
  /** It sounds like a spell (ZAP, HEX, POP; not MUD or NAP): a caster's gift leans to it (item 038, `drawGift`). */
  spell?: true;
}

export interface BankWord extends BankEntry {
  units: string[];
  level: Level;
  vowel: Vowel;
  onset: string;
  rime: string;
}

const T = (word: string, glyph?: string, extra: Partial<BankEntry> = {}): BankEntry => ({ word, role: 'thing', ...(glyph ? { glyph } : {}), ...extra });
const A = (word: string, glyph?: string, extra: Partial<BankEntry> = {}): BankEntry => ({ word, role: 'action', ...(glyph ? { glyph } : {}), ...extra });
const B = (word: string, glyph?: string, extra: Partial<BankEntry> = {}): BankEntry => ({ word, role: 'both', ...(glyph ? { glyph } : {}), ...extra });
const NEW = { since: '037' as const };
const SPELL = { spell: true as const };
const NEW_SPELL = { ...NEW, ...SPELL };

const ENTRIES: BankEntry[] = [
  // Level 1: CVC. The pictured words from before 037.
  T('cat', '🐱'), T('dog', '🐶'), T('fox', '🦊'), T('bug', '🐛'), T('hat', '🎩'), T('bed', '🛏️'),
  T('cup', '☕'), T('map', '🗺️'), T('bus', '🚌'), T('hen', '🐔'), T('box', '📦'), T('pen', '🖊️'),
  T('van', '🚐'), T('bat', '🦇'), T('bag', '👜'), T('can', '🥫'), T('nut', '🥜'), T('tub', '🛁'),
  T('cap', '🧢'), T('pin', '📌'), T('log', undefined, { draw: 'log' }), T('mop', undefined, { draw: 'mop' }),
  T('pot', undefined, { draw: 'pot' }), T('rat', '🐀'), T('mug', undefined, { draw: 'mug' }),
  T('rug', undefined, { draw: 'rug' }), T('jug', '🏺'),
  // Pictured words that were move words too.
  B('sun', '☀️'), B('fan', undefined, { draw: 'fan' }), B('web', '🕸️'), B('net', '🥅'), B('jet', '✈️'),
  B('pig', '🐷'), B('pan', '🍳'), B('ram', '🐏'), B('top', '🌀'),
  // The move words from before 037.
  A('zap', '⚡', SPELL), A('bam', '🔨'), A('zip', '☄️', SPELL), A('hop', '🐇'), A('pop', '🎈', SPELL), A('hug', '🧸'),
  A('big', '🐘'), A('hot', '🌶️'), A('dig', '⛏️'), A('run', '👟'), A('mud', '🟤'), A('wet', '💦'),
  A('fog', '🌫️'), A('tug', '➰'), A('fix', '🔧'),
  // Item 037, level 1: short i, short e and the rare first sounds (Y, V, K, L, J, G).
  T('jam', '🍓', NEW), T('yak', '🐂', NEW), T('vat', '🍯', NEW), T('leg', '🦵', NEW), T('peg', '📎', NEW),
  T('wig', '💇', NEW), T('bib', '👶', NEW), T('fig', '🟣', NEW), T('six', '🎲', NEW), B('fin', '🦈', NEW),
  T('kit', '🧰', NEW), T('lip', '👄', NEW), T('cog', '⚙️', NEW), T('rod', '🎣', NEW), T('pod', '🌱', NEW),
  T('gum', '🍬', NEW), T('bun', '🍞', NEW), T('hut', '🏠', NEW), T('sub', '🐳', NEW),
  A('nap', '😴', NEW), A('wag', '🐕', NEW), A('jab', '🥊', NEW), A('red', '🔴', NEW), A('hex', '🔮', NEW_SPELL),
  A('jig', '💃', NEW), A('mix', '🥣', NEW_SPELL), A('jog', '🏃', NEW), A('bop', '🔨', NEW), A('dot', '⚫', NEW),
  A('hum', '🎵', NEW), A('yum', '😋', NEW),
  // Item 037, level 2: blends.
  T('frog', '🐸', NEW), T('drum', '🥁', NEW), T('crab', '🦀', NEW), T('flag', '🚩', NEW), T('sled', '🛷', NEW),
  T('nest', '🥚', NEW), T('tent', '⛺', NEW), T('desk', '🗄️', NEW), T('belt', '🥋', NEW), T('vest', '🦺', NEW),
  T('plum', '🍑', NEW), T('gift', '🎁', NEW), T('lamp', '💡', NEW), T('hand', '✋', NEW), T('mask', '🎭', NEW),
  T('raft', '🛶', NEW), T('plug', '🔌', NEW), T('slug', '🐌', NEW), T('twig', '🌿', NEW), T('ant', '🐜', NEW),
  T('milk', '🥛', NEW),
  A('jump', '🦘', NEW), A('spin', '🌀', NEW_SPELL), A('swim', '🏊', NEW), A('flip', '🥞', NEW_SPELL), A('stomp', '🦖', NEW),
  A('slam', '💥', NEW), A('grab', '🦾', NEW), A('clap', '👏', NEW), A('bump', '🚗', NEW), A('snap', '🐊', NEW_SPELL),
  A('skip', '🎗️', NEW), A('twist', '🌪️', NEW_SPELL), A('melt', '🍦', NEW_SPELL), A('lift', '🏗️', NEW), A('plop', '💧', NEW),
  A('flop', '🤽', NEW), A('trap', '🧀', NEW), A('blast', '🚀', NEW_SPELL), A('drip', '🚰', NEW),
  // Item 037, level 3: digraphs, a small start.
  T('ship', '🚢', NEW), T('fish', '🐟', NEW), T('duck', '🦆', NEW), T('sock', '🧦', NEW), T('moth', '🦋', NEW),
  T('shed', '🏚️', NEW), T('chick', '🐤', NEW),
  A('chop', '🪓', NEW), A('kick', '🦶', NEW), A('rush', '💨', NEW),
];

/** The digraphs that are one sound unit. */
export const DIGRAPHS = ['sh', 'ch', 'th', 'ck'] as const;
const VOWELS = 'aeiou';

/** A word's sound units: SHIP is SH I P, DUCK is D U CK, FROG is F R O G. */
export function unitsOf(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const two = word.slice(i, i + 2);
    if ((DIGRAPHS as readonly string[]).includes(two)) {
      out.push(two);
      i++;
    } else out.push(word[i]!);
  }
  return out;
}

/** Tags from the spelling. Throws for a word that is not one short vowel between consonants. */
export function tag(e: BankEntry): BankWord {
  const units = unitsOf(e.word);
  const vi = units.findIndex((u) => VOWELS.includes(u));
  const vowels = units.filter((u) => VOWELS.includes(u));
  if (vi < 0 || vowels.length !== 1) throw new Error(`bank: ${e.word} is not a one-short-vowel word`);
  const onset = units.slice(0, vi);
  const coda = units.slice(vi + 1);
  const digraph = units.some((u) => u.length === 2);
  const blend = onset.length > 1 || coda.length > 1;
  const level: Level = digraph ? 3 : blend ? 2 : 1;
  return { ...e, units, level, vowel: units[vi] as Vowel, onset: onset.join(''), rime: units.slice(vi).join('') };
}

export const BANK: BankWord[] = ENTRIES.map(tag);
export const BANK_BY_WORD: Record<string, BankWord> = Object.fromEntries(BANK.map((w) => [w.word, w]));

/** Pictured words: rooms, key words, the counter, the warm-up, fetched items. */
export const THINGS: BankWord[] = BANK.filter((w) => w.role !== 'action');
/** Words with a battle effect of their own: move pads and the ally's gift. */
export const ACTIONS: BankWord[] = BANK.filter((w) => w.role !== 'thing');

export const VOWEL_LIST: Vowel[] = ['a', 'e', 'i', 'o', 'u'];
export const LEVELS: Level[] = [1, 2, 3];
