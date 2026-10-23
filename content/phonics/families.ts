/**
 * Word families for the word machine (item 026): onset + rime, CAT HAT BAT RAT.
 *
 * Since item 037 a family comes from the word bank (content/phonics/bank.ts):
 * a rime with an entry in RIMES and at least two pictured bank words (THINGS)
 * whose onset is a single letter (item 040; a family no longer needs three
 * pictures); `all` also lists the action words with the rime (ZAP, NAP), which
 * do not count toward the two. The game teaches that changing the
 * first sound makes a new word, which needs a second word to change to.
 * `words` are its pictured words (make mode shows a picture, so only those
 * are built); `all` every single-onset word with the rime, for the later
 * modes and the silly-word checks. A blend or digraph onset (FROG, SHIP) is
 * not one tile, so it is not in a family.
 *
 * `silly` are the onsets whose word is nonsense: the wrong tiles of mode 1
 * ("that makes ZAT, a silly word!"). Each one is checked by hand: not an
 * English word (ZAP, YAP, ZEN, YEN are out), not a name (JAN, JEN, KEN, BEN),
 * not slang a grown-up would wince at, not a homophone of a real word (KAT
 * is CAT, NAT is GNAT, WAT is WHAT, NOX is KNOCKS), and nothing near a slur.
 * Never J or F before AP, never N before IG, never W before OP or OG.
 *
 * Voice: each rime is its own line (`rimeLine`, phonics speaker), said apart
 * from the onset's letter sound, never blended; each silly word is its own
 * line too (`sillyLine`). `say` is the placeholder spelling handed to edge-tts
 * (EN alone comes back as the letter name N, AM as "a.m."), until Matt
 * records them.
 *
 * Pure data: no Phaser, so the voice composer and the unit tests read it.
 */

import { BANK, BANK_BY_WORD, THINGS, type BankWord } from './bank.js';

export interface Family {
  /** Lower case: `at`. */
  rime: string;
  /** What edge-tts is asked to say for the rime alone. */
  say: string;
  /** The family's pictured words, lower case: what make mode builds. */
  words: string[];
  /** Every bank word in the family (pictured or action), lower case. */
  all: string[];
  /** Onsets that make a silly (nonsense) word with this rime. */
  silly: SillyOnset[];
}

export interface SillyOnset {
  letter: string;
  /** What edge-tts is asked to say for the whole silly word. */
  say: string;
}

/** Rime placeholders and silly onsets, by rime. A rime with bank words but no entry here is not a family yet. */
const RIMES: Record<string, { say: string; silly: SillyOnset[] }> = {
  // Out: JAT (a people's name), GAT (slang), KAT/NAT/WAT (sound like CAT, GNAT, WHAT).
  at: { say: 'At', silly: [{ letter: 'z', say: 'Zat' }, { letter: 'y', say: 'Yat' }] },
  // Out: YAN, JAN, DAN, HAN, LAN (names; LAN is a word too, item 038), GAN (Scots "go"),
  // KAN (sounds like CAN), WAN, NAN; the rest are words. So -AN lays two tiles, with ZAN.
  an: { say: 'Ann', silly: [{ letter: 'z', say: 'Zan' }] },
  // Every other onset makes a word, a name or worse (ZAP, YAP, DAP, BAP, WAP; never J
  // or F), so -AP lays two tiles, the right one and VAP.
  ap: { say: 'App', silly: [{ letter: 'v', say: 'Vap' }] },
  // Out: ZEN, YEN, FEN, WEN (words), JEN, KEN, BEN, LEN, REN (names), SEN (a coin).
  en: { say: 'Ehn', silly: [{ letter: 'n', say: 'Nehn' }, { letter: 'v', say: 'Vehn' }] },
  // "Ett" spans 1.39 s (read as letters); a single syllable is 0.7 s. Out: FET, RET, HET,
  // DET (slang for a detective, item 038), KET (slang, and worse), TET (a holiday), CET
  // (sounds like SET); the rest are words. So -ET lays two tiles, with ZET.
  et: { say: 'Eht', silly: [{ letter: 'z', say: 'Zet' }] },
  // Out: ZOG (a storybook dragon, and worse), MOG (a cat, and a storybook one), WOG
  // (a slur), NOG, POG, TOG, GOG, VOG (words or names), KOG (sounds like COG).
  og: { say: 'Ogg', silly: [{ letter: 'y', say: 'Yog' }, { letter: 's', say: 'Sog' }] },
  // Item 035: BUG MUG RUG JUG. Out: DUG, LUG, PUG, VUG, FUG (words, FUG too near worse),
  // HUG, TUG (move words), NUG (slang), ZUG (a town), CUG (sounds like KUG), GUG (a monster).
  ug: { say: 'Ugg', silly: [{ letter: 'k', say: 'Kug' }, { letter: 'w', say: 'Wug' }] },
  // Item 037 from here: the bank's new rimes with two pictures or more.
  // PIG WIG FIG. Out: never N; BIG DIG JIG GIG RIG ZIG (words), CIG (slang), MIG (a jet),
  // TIG, LIG (British slang), SIG, VIG (abbreviations, slang), YIG (a storybook god).
  ig: { say: 'Ihg', silly: [{ letter: 'h', say: 'Hihg' }, { letter: 'k', say: 'Kig' }] },
  // PIN BIN (item 043: Matt says PIN is familiar; FIN is odd). Every other onset is a word, a name or a drink (BIN DIN GIN KIN SIN TIN WIN
  // YIN; JIN LIN RIN MIN VIN; ZIN slang; CIN sounds like SIN), so -IN lays two tiles, with HIN.
  in: { say: 'Inn', silly: [{ letter: 'h', say: 'Hin' }] },
  // LEG PEG. Out: BEG KEG (words), MEG GREG (names), REG VEG (slang), NEG (slang), FEG
  // (too near a slur), DEG (an abbreviation), GEG (Scouse slang).
  eg: { say: 'Egg', silly: [{ letter: 'z', say: 'Zeg' }, { letter: 'h', say: 'Heg' }] },
  // JAM RAM. Out: BAM (a move word), CAM DAM HAM LAM TAM YAM (words), PAM SAM (names),
  // GAM FAM (slang), NAM (slang), KAM (sounds like CAM).
  am: { say: 'Amm', silly: [{ letter: 'v', say: 'Vam' }, { letter: 'z', say: 'Zam' }] },
  // MOP TOP. Out: never W (a slur), nor V (too near it); BOP HOP POP (move words), COP LOP
  // SOP FOP (words), KOP (sounds like COP), GOP (politics), DOP (a film job, a drink).
  op: { say: 'Opp', silly: [{ letter: 'z', say: 'Zop' }, { letter: 'y', say: 'Yop' }] },
  // FOX BOX. Most -OX nonsense sounds like an -OCKS word: JOX NOX ROX MOX HOX DOX
  // (jocks, knocks, rocks...), KOX worse; LOX POX SOX VOX COX TOX are words or names.
  ox: { say: 'Ox', silly: [{ letter: 'z', say: 'Zox' }, { letter: 'y', say: 'Yox' }] },
  // ROD POD. Out: COD GOD HOD NOD SOD TOD (words, SOD rude), BOD MOD (slang), KOD
  // (sounds like COD), ZOD (a villain's name), YOD (a letter), LOD (a town), VOD WOD.
  od: { say: 'Odd', silly: [{ letter: 'f', say: 'Fod' }] },
  // SUN BUN. Out: RUN (a move word), DUN FUN GUN NUN PUN TUN (words), HUN (a slur),
  // JUN YUN (names), KUN (Japanese), MUN (slang), WUN (sounds like ONE), LUN.
  un: { say: 'Uhn', silly: [{ letter: 'v', say: 'Vun' }, { letter: 'z', say: 'Zun' }] },
  // NUT HUT. Out: BUT CUT GUT JUT PUT RUT TUT (words), MUT KUT (sound like MUTT, CUT),
  // WUT (slang), ZUT (French), YUT (a game), FUT, SUT (too near worse).
  ut: { say: 'Utt', silly: [{ letter: 'v', say: 'Vut' }, { letter: 'l', say: 'Lut' }] },
  // TUB SUB. Out: CUB DUB HUB NUB PUB RUB (words), BUB (slang), LUB (a heartbeat), YUB
  // (a film's word), GUB (Scots slang), WUB (slang).
  ub: { say: 'Ubb', silly: [{ letter: 'z', say: 'Zub' }, { letter: 'v', say: 'Vub' }] },
  // Item 056: the bank's NG and CK rimes (KING RING WING, ROCK SOCK LOCK), and -ELL
  // ready for a second picture beside BELL (WELL is said in hub scenes; SHELL's onset is SH).
  // -ING: out ZING DING PING SING TING LING BING (words), HING (a spice), MING (slang), VING
  // NING JING YING (names), FING (too near worse); GING alone is clean, a hard G ("Ghing").
  // "Ell" alone is the letter L.
  ing: { say: 'Ihng', silly: [{ letter: 'g', say: 'Ghing' }] },
  // -ELL: out H (never), FELL DELL CELL SELL TELL YELL JELL (words), NELL KELL (names),
  // GELL (sounds like GEL), MELL PELL (word-ish).
  ell: { say: 'Ehl', silly: [{ letter: 'z', say: 'Zell' }, { letter: 'v', say: 'Vell' }] },
  // -OCK: out F (never), MOCK DOCK HOCK NOCK POCK TOCK JOCK (words), BOCK (a beer),
  // YOCK (near a slur), WOK (sounds like it), COCK, KOCK (no).
  ock: { say: 'Ock', silly: [{ letter: 'z', say: 'Zock' }, { letter: 'v', say: 'Vock' }] },
};

/** A word's first sound and rime: the bank's tags (FROG is FR + OG), or first letter + rest for a silly word. */
export const onsetOf = (word: string): string => BANK_BY_WORD[word]?.onset ?? word.charAt(0);
export const rimeOf = (word: string): string => BANK_BY_WORD[word]?.rime ?? word.slice(1);

/** The bank's words with a one-letter onset (not a blend, not a digraph): the ones a family's tile can make. A long-vowel word (KEY, YOYO) is in none. */
const SINGLE = BANK.filter((w) => w.onset.length === 1 && w.vowel);

/** The families `pictured` words make, in rime order: two pictures to build at least (item 040: an `odd` word like WIG is no picture). */
const familiesOf = (pictured: (w: BankWord) => boolean): Family[] =>
  Object.entries(RIMES)
    .map(([rime, r]) => {
      const ws = SINGLE.filter((w) => w.rime === rime);
      return { rime, say: r.say, words: ws.filter(pictured).map((w) => w.word), all: ws.map((w) => w.word), silly: r.silly };
    })
    .filter((f) => f.words.length >= 2);

/** Every family the bank makes, in rime order. */
export const FAMILIES: Family[] = familiesOf((w) => THINGS.includes(w));

/** Every family with the stored words back (item 127): the voice composer keeps their rime and silly lines, so bringing a word back needs no synthesis. */
export const ALL_FAMILIES: Family[] = familiesOf((w) => THINGS.includes(w) || (Boolean(w.stored) && w.role !== 'action' && !w.odd));

export const FAMILY_BY_RIME: Record<string, Family> = Object.fromEntries(FAMILIES.map((f) => [f.rime, f]));

/** Every word the machine can build (make mode: the pictured ones). */
export const FAMILY_WORDS: string[] = FAMILIES.flatMap((f) => f.words);

/** A silly word's id and display: `zat`, shown ZAT. */
export const sillyWord = (letter: string, rime: string): string => `${letter}${rime}`;
