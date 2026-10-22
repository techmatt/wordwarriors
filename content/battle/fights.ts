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
 * `nar_<narrator>_fight_<id>_<beat>`): no move words, no CVC reading words.
 * New arenas are ARENAS keys in roster.ts (art `arena_<key>`).
 */

import { fightKey, type SpokenLine } from '../voice/ids.js';

/** `story` (item 107): a turn-based story fight, its beats a script in content/battle/stories/. */
export type FightKind = 'brawl' | 'race' | 'tug' | 'clash' | 'cookoff' | 'story';

export type FightLine = SpokenLine;

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
  /** A story fight's script (content/battle/stories/ id). */
  story?: string;
  /** The villain the style is written for: `?fight=<id>` forces him (a story fight). Never drawn at random unless it is a villain's own `fight`. */
  villain?: string;
}

export type FightBeat = 'start' | 'start2' | 'retreat' | 'finish';
export const FIGHT_BEATS: FightBeat[] = ['start', 'start2', 'retreat', 'finish'];

/** The brawl's own lines for each beat (script.ts NARRATOR_LINES keys). */
const BRAWL_LINE: Record<FightBeat, string> = { start: 'battle_start', start2: 'battle2_start', retreat: 'retreat_1', finish: 'finish' };

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
      start: { text: "It's a race! Ready, set, go!", say: "It's a race, ready, set, go!" },
      start2: { text: "It's the rematch! Let's fly faster this time!", say: "It's the rematch, let's fly faster this time!" },
      retreat: { text: "They're too fast for us! Let's go home and practice!", say: "They're too fast for us, let's go home and practice!" },
      finish: { text: "There's the finish line! Let's all zoom together!", say: "There's the finish line, let's all zoom together!" },
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
      start: { text: "It's a rope pull! Hold the rope and pull!", say: "It's a rope pull, hold the rope and pull!" },
      start2: { text: "Let's pull again! We're stronger now!", say: "Let's pull again, we're stronger now!" },
      retreat: { text: "They're too strong for us! Let's go home and get stronger!", say: "They're too strong for us, let's go home and get stronger!" },
      finish: { text: "Now let's all pull together!" },
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
      start: { text: "It's magic against magic! Let's push the beam!", say: "It's magic against magic, let's push the beam!" },
      start2: { text: "Our magic is stronger now! Let's push!", say: "Our magic is stronger now, let's push!" },
      retreat: { text: "That spell is too strong for us! Let's go home and get ready!", say: "That spell is too strong for us, let's go home and get ready!" },
      finish: { text: "Let's push with all our magic together!" },
    },
  },
  {
    id: 'cook_off',
    kind: 'cookoff',
    name: 'Cook-off',
    arena: 'cook_show',
    banner: ['COOK-OFF!', 'COOK-OFF TWO!'],
    tooStrong: 'WHOA! A PERFECT SCORE!',
    win: 'BEST DISH EVER!',
    lines: {
      start: { text: "It's a cook-off! The yummiest dish wins!", say: "It's a cook-off, the yummiest dish wins!" },
      start2: { text: "It's round two, and now we know the recipe!" },
      retreat: { text: "Their dish was too yummy! Let's go home and practice!", say: "Their dish was too yummy, let's go home and practice!" },
      finish: { text: "Let's add the topping, all together now!" },
    },
    props: [
      { id: 'cook_station', look: 'a chunky cartoon cooking station: a little red stove with a big shiny pot on top, a wooden counter with a chopping board, a whisk and a rolling pin, seen from the front', glyph: '🍳', w: 300, h: 260 },
      { id: 'trophy', look: 'a huge shiny golden trophy cup with two big handles, a red jewel on the front and sparkles', glyph: '🏆', w: 200, h: 220 },
    ],
  },
  {
    // Item 107: reached only by `?fight=smaug_story`, which forces Evil Smaug; no villain's own style.
    id: 'smaug_story',
    kind: 'story',
    name: 'Story fight against Evil Smaug (turn-based)',
    story: 'smaug',
    villain: 'smaug',
    banner: ['STORY FIGHT!', 'PART TWO!'],
    tooStrong: 'WHOA! TOO STRONG!',
    win: 'VICTORY!',
    lines: {},
    props: [
      { id: 'stone', look: 'a big round grey boulder with a flat front, big enough for a small child to hide behind, a few gold coins at its foot', glyph: '🌑', w: 220, h: 200 },
      { id: 'ledge', look: 'a rocky cave ledge seen from the front: a flat stone shelf on a short rocky pillar, wide enough for a child to stand on top', glyph: '⛰️', w: 240, h: 230 },
      { id: 'hoard', look: "a big glittering heap of gold coins, goblets and jewels, a dragon's treasure pile", glyph: '👑', w: 300, h: 190 },
    ],
  },
];

export const FIGHT_BY_ID: Record<string, FightSpec> = Object.fromEntries(FIGHTS.map((f) => [f.id, f]));

/** The narrator line key for a style's beat: its own, else the brawl's. */
export function fightLineKey(fight: FightSpec, beat: FightBeat): string {
  return fight.lines[beat] ? fightKey(fight.id, beat) : BRAWL_LINE[beat];
}

/** Art id of a style's prop. */
export const fightPropArt = (id: string) => `prop_fight_${id}`;
