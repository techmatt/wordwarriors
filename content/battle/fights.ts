/**
 * Fight styles (item 031): not every showdown is a brawl. Each villain has
 * one (`fight` on the roster entry; absent is `brawl`), and an ally can make
 * another likelier (`fightNudge`: chef Dada Jason makes a cook-off likely).
 * src/rules/fights.ts draws it once per episode; `?fight=<id>` fixes it.
 *
 * Every style keeps the episode's shape, so nothing about reading changes:
 * part 1 ends with the villain's ultimate winning the round and the heroes
 * retreating; in part 2 the counter turns it and the heroes win; the move
 * choices still fire supercharged moves, and the bars are cosmetic and
 * steered. A style is staged by its `kind`'s code in src/battle/stages/
 * (its camera, particles, bars and win and lose beats); this file is the
 * data: what it is called, what is said and shown, and where it happens.
 *
 * Lines are said by the narrator (composed per narrator as
 * `<narrator>_fight_<id>_<beat>`): no move words, no CVC reading words.
 * New arenas are ARENAS keys in roster.ts (art `arena_<key>`).
 */

export type FightKind = 'brawl' | 'race' | 'tug' | 'clash' | 'cookoff';

export interface FightLine {
  text: string;
  /** Spoken form, when edge-tts needs help. Same word count. */
  say?: string;
}

/** A prop a style draws (art `prop_fight_<id>`). */
export interface FightProp {
  id: string;
  look: string;
  glyph: string;
  w: number;
  h: number;
}

export interface FightSpec {
  id: string;
  kind: FightKind;
  /** For the grown-ups page and the docs. */
  name: string;
  /** The ARENAS key it happens in, instead of the villain's own arena. */
  arena?: string;
  /** The big banner as each part starts: "READY, SET, GO!", then "ROUND TWO!" */
  banner: [string, string];
  /** Floated over the floored heroes at the end of part 1. */
  tooStrong: string;
  /** The banner on the last hit of part 2. */
  win: string;
  /** Narrator lines; absent beats use the brawl's own (battle_start, battle2_start, retreat_1, finish). */
  lines: Partial<Record<FightBeat, FightLine>>;
  props?: FightProp[];
}

export type FightBeat = 'start' | 'start2' | 'retreat' | 'finish';
export const FIGHT_BEATS: FightBeat[] = ['start', 'start2', 'retreat', 'finish'];

/** The brawl's own lines for each beat (script.ts NARRATOR_LINES keys). */
export const BRAWL_LINE: Record<FightBeat, string> = { start: 'battle_start', start2: 'battle2_start', retreat: 'retreat_1', finish: 'finish' };

export const FIGHTS: FightSpec[] = [
  {
    id: 'brawl',
    kind: 'brawl',
    name: 'Free-for-all',
    banner: ['FIGHT!', 'ROUND TWO!'],
    tooStrong: 'WHOA! TOO STRONG!',
    win: 'VICTORY!',
    lines: {},
  },
  {
    id: 'sky_race',
    kind: 'race',
    name: 'Sky race through the treasure cave',
    arena: 'sky_race',
    banner: ['READY, SET, GO!', 'RACE TWO!'],
    tooStrong: 'WHOA! TOO FAST!',
    win: 'WINNERS!',
    lines: {
      start: { text: 'A race! Ready, set, go!', say: 'A race, ready, set, go!' },
      start2: { text: 'The rematch! Fly faster this time!', say: 'The rematch, fly faster this time!' },
      retreat: { text: 'Too fast! Back to practise!', say: 'Too fast, back to practise!' },
      finish: { text: 'The finish line! All together, zoom!', say: 'The finish line, all together, zoom!' },
    },
    props: [
      { id: 'finish_flag', look: 'a big chequered black-and-white finish-line banner on two tall golden poles, with little gold coins and jewels on the tops of the poles', glyph: '🏁', w: 300, h: 420 },
      { id: 'trophy', look: 'a huge shiny golden trophy cup with two big handles, a red jewel on the front and sparkles', glyph: '🏆', w: 200, h: 220 },
    ],
  },
  {
    id: 'sea_tug',
    kind: 'tug',
    name: 'Rope pull against the coils (a tug-of-war)',
    banner: ['ROPE PULL!', 'PULL AGAIN!'],
    tooStrong: 'WHOA! TOO STRONG!',
    win: 'WE PULLED IT!',
    lines: {
      start: { text: 'A rope pull! Grab the rope and pull!', say: 'A rope pull, grab the rope and pull!' },
      start2: { text: 'Pull again! We are stronger now!', say: 'Pull again, we are stronger now!' },
      retreat: { text: 'Too strong! Let go, let go!', say: 'Too strong, let go, let go!' },
      finish: { text: 'All together now! Pull!', say: 'All together now, pull!' },
    },
  },
  {
    id: 'spell_clash',
    kind: 'clash',
    name: 'Spell-beam clash',
    arena: 'spell_tower',
    banner: ['SPELL CLASH!', 'CLASH TWO!'],
    tooStrong: 'WHOA! TOO STRONG!',
    win: 'SPELL BROKEN!',
    lines: {
      start: { text: 'Magic against magic! Push the beam!', say: 'Magic against magic, push the beam!' },
      start2: { text: 'Our magic is stronger now! Push!', say: 'Our magic is stronger now, push!' },
      retreat: { text: 'That spell is too strong! Retreat!', say: 'That spell is too strong, retreat!' },
      finish: { text: 'All our magic together! Push!', say: 'All our magic together, push!' },
    },
  },
  {
    id: 'cook_off',
    kind: 'cookoff',
    name: 'Cook-off',
    arena: 'cook_show',
    banner: ['COOK-OFF!', 'COOK-OFF TWO!'],
    tooStrong: 'WHOA! TEN OUT OF TEN!',
    win: 'BEST DISH EVER!',
    lines: {
      start: { text: 'A cook-off! The yummiest dish wins!', say: 'A cook-off, the yummiest dish wins!' },
      start2: { text: 'Round two! We know the recipe now!', say: 'Round two, we know the recipe now!' },
      retreat: { text: 'Their dish was too yummy! Back to practise!', say: 'Their dish was too yummy, back to practise!' },
      finish: { text: 'Now the topping! All together!', say: 'Now the topping, all together!' },
    },
    props: [
      { id: 'cook_station', look: 'a chunky cartoon cooking station: a little red stove with a big shiny pot on top, a wooden counter with a chopping board, a whisk and a rolling pin, seen from the front', glyph: '🍳', w: 300, h: 260 },
      { id: 'trophy', look: 'a huge shiny golden trophy cup with two big handles, a red jewel on the front and sparkles', glyph: '🏆', w: 200, h: 220 },
    ],
  },
];

export const FIGHT_BY_ID: Record<string, FightSpec> = Object.fromEntries(FIGHTS.map((f) => [f.id, f]));

/** The narrator line key for a style's beat: its own, else the brawl's. */
export function fightLineKey(fight: FightSpec, beat: FightBeat): string {
  return fight.lines[beat] ? `fight_${fight.id}_${beat}` : BRAWL_LINE[beat];
}

/** Art id of a style's prop. */
export const fightPropArt = (id: string) => `prop_fight_${id}`;
