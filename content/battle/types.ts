/**
 * The shapes the roster is written in. Pure data: no Phaser, no DOM, so the
 * voice composer (Node) and the game (browser) read the same file.
 *
 * A new character is one `CharacterSpec` in roster.ts, then
 * `npm run voice:lines && npm run voice:build && npm run art:placeholders`.
 * No engine change is needed unless it wants an ability `kind` that does not
 * exist yet, and the list of kinds below is the menu.
 */

import type { SpokenLine } from '../voice/ids.js';

/** How a fighter gets about the arena. Each is a steering routine in src/battle/movement.ts. */
export type MoveStyle =
  /** Floats at range, bobbing; casters. */
  | 'hover'
  /** Dashes through the crowd in spinning arcs; warriors. */
  | 'twirl'
  /** Barely moves; every step shakes the screen; giants. */
  | 'stomp'
  /** Quick sidesteps that leave afterimages. */
  | 'dodge'
  /** A sinuous S-curve; serpents. */
  | 'slither'
  /** Teleports from spot to spot with a puff. */
  | 'blink'
  /** Big swooping arcs through the air; dragons, carpets. */
  | 'fly'
  /** A steady walk at the nearest enemy; minions. */
  | 'march';

/**
 * What an ability does. Every kind is one function in src/battle/abilities.ts,
 * parameterised by the fields on AbilitySpec, so most new abilities are data.
 * The list is the kinds' one home: `AbilityKind` derives from it, the tests read it.
 */
export const ABILITY_KINDS = [
  'bolt', // projectiles at a target (count, spread, glyph, homing)
  'beam', // a sustained ray from caster to target
  'cone', // a breath of particles (fire, frost, sand)
  'lightning', // jagged strikes from the sky onto targets
  'slam', // ground pound around self, or leap onto the target and slam
  'spin', // twirl through several enemies in a row
  'dash', // a straight charge through the target
  'summon', // spawn minions
  'polymorph', // turn a target into a pig for a while
  'freeze', // encase a target in ice for a while
  'teleport', // blink beside the target and strike, leaving afterimages
  'clones', // decoy copies of the caster
  'trap', // lay traps (cards, runes) that burst when an enemy comes near
  'rain', // many things falling from the top of the screen
  'shield', // a bubble on self and friends
  'heal', // sparkles that top up friends
  'grow', // become huge for a while
  'coil', // a ring of serpent body squeezing the arena
  'eclipse', // the sky goes dark; the sun is swallowed
  'wave', // a wall sweeping across the arena
  'grid', // a lattice of lasers across the arena
  'orbit', // things (Ellie's swords) circle the caster, hitting what they pass, then fly at the enemy
] as const;
export type AbilityKind = (typeof ABILITY_KINDS)[number];

/** `bubble`: caught in a giant bubble that floats up and away, then pops and drops it. */
export type Status = 'freeze' | 'pig' | 'stun' | 'burn' | 'bubble';

export interface AbilitySpec {
  id: string;
  /** Shown in a banner when it fires: "GOLD AVALANCHE!" */
  name: string;
  kind: AbilityKind;
  /** Seconds between uses. Ultimates ignore it; the director fires them. */
  cooldown: number;
  /** Main and secondary particle colours, 0xRRGGBB. */
  color: number;
  color2?: number;
  /** 1 = a jab, 3 = a big one. Scales damage, particles, shake. */
  power: number;
  /** Projectiles, strikes, minions, clones... */
  count?: number;
  /** An emoji drawn as the projectile or falling thing ("🪙", "❄️"). */
  glyph?: string;
  /**
   * An art id drawn as the projectile, falling or orbiting thing instead of a
   * glyph (`prop_silver_sword`). Drawn point up; it falls point first. Built-in
   * fx textures count too: `fx_bubble` is a see-through bubble tinted `color`.
   */
  art?: string;
  /**
   * The art is a picture (`pic_cat`), not a blade: it stays the right way up,
   * neither spinning as a bolt nor falling point first.
   */
  upright?: boolean;
  status?: Status;
  /** For `summon`: which minion (MINIONS key). */
  minion?: string;
  /** Seconds a status, shield, growth or field lasts. */
  duration?: number;
  /** Bolts curve towards their target. */
  homing?: boolean;
  /**
   * The move words this move answers to (["zap", "zip"]), flavour since item
   * 037: a pad or gift word it answers to fires this move, styled
   * (`abilityWords`). Each is one of MOVE_WORDS, or POW / ICE, which are never
   * on a pad. Every character's good side has at least two moves with words
   * (rules.test.ts). One list since item 047 (it was `word` plus `words`).
   */
  words?: string[];
  /** Plays the "Ha!" interjection SFX when used. */
  shout?: boolean;
  /**
   * Called out (voiced and on the name banner) instead of `<name>!`, when the
   * name says a move word (item 034: Pig Curse says PIG, a pad word, so it was
   * never called out). Must say no move word itself.
   */
  callout?: string;
}

export interface Taunt extends SpokenLine {
  /** Short key, unique within the fighter; the line id is derived from it. */
  key: string;
}

export interface FighterSpec {
  /** "Seraphina" or "Evil Seraphina": shown and spoken. */
  displayName: string;
  /** For edge-tts, when the display name mispronounces. Same word count. */
  sayName?: string;
  /**
   * Evil side only: the villain's bare name (item 038's sentences and the
   * narrator's villain lines), where it is not the good side's name (item 113:
   * EvilRilla is RILLA, his good side Bluerilla). See `villainName`.
   */
  bareName?: string;
  /** One line for docs/art.md and the AI art prompt. */
  look: string;
  /** Card colours: main, accent. */
  palette: [number, number];
  /** An emoji painted on the placeholder card. */
  glyph: string;
  style: MoveStyle;
  /**
   * What it rides when airborne, drawn under the card: `carpet` (drawn), or an
   * emoji ('🧹', '🐉'). Placeholder until real art draws the mount in.
   */
  mount?: string;
  /**
   * A signature trail of particles that follows the fighter: its colours and
   * shape. Defaults to sparks in the palette colours.
   */
  trail?: { tint: number[]; shape: 'spark' | 'star' | 'smoke' | 'square' };
  /** Pixels per second at full stride. */
  speed: number;
  /** Sprite scale: 1 a person, 1.4 big, 1.8 a giant. */
  size: number;
  /** Cosmetic hit points; the battle director steers them anyway. */
  hp: number;
  abilities: AbilitySpec[];
  ultimate: AbilitySpec;
  taunts: Taunt[];
}

export interface CounterItem {
  id: string;
  name: string;
  /** For edge-tts, when the name mispronounces (WIND-up, not the weather). Same word count. */
  sayName?: string;
  /** Painted on the placeholder item card. */
  glyph: string;
  look: string;
  /** What it does to the ultimate in Part 2, as the battle shows it. */
  how: 'block' | 'reflect' | 'swallow' | 'reveal' | 'restore' | 'shutdown' | 'calm' | 'scare';
  /**
   * The word this item is named for. Since item 015 the attic's counter word
   * is drawn from her word bag each episode (any pictured CVC word can beat
   * any villain); when the draw lands on this word, battle 2 shows this item
   * and its `how` instead of the generic picture swarm. A flavour, not a rule.
   * MICE is not decodable, so it is never drawn: EvilRilla's Wind-up Mice
   * stay for the parked games only.
   */
  word: string;
}

export interface CharacterSpec {
  id: string;
  /**
   * For a form (item 025): the person it is a form of (`dada_matt` for
   * `dada_matt_lifter`). A form is a whole character, with its own fighting,
   * villain version, counter and house mood, but speaks in the person's voice,
   * narrates the person's lines and wakes her as the person. Absent on persons.
   */
  person?: string;
  /** The form's short name ('builder', 'lifter', 'chef'), on persons with forms and on forms: `?form=lifter`. */
  form?: string;
  /** Archetype, in one sentence. Original characters, not lookalikes. */
  description: string;
  /** edge-tts speaker ids are `<id>` and `<id>_evil`. */
  good: FighterSpec;
  evil: FighterSpec;
  /**
   * What the villain says, in the good version's voice, once beaten and good
   * again (item 018): short and kid-funny, an apology or wanting to come on the
   * next adventure. `sorry` at the battle's end, `ending` in the victory scene,
   * three of each, one drawn per episode (item 040; the first with `?cast=default`).
   */
  reformed: { sorry: Taunt[]; ending: Taunt[] };
  /** What beats the evil version's ultimate. */
  counter: CounterItem;
  /** The arena the evil version fights in. ARENAS key. */
  arena: string;
  /**
   * How the showdown against the evil version goes (item 031): a FIGHTS key
   * in content/battle/fights.ts (a sky race, a tug-of-war, a spell-beam
   * clash, a cook-off). Absent: `brawl`, the free-for-all.
   */
  fight?: string;
  /**
   * As the ally, this one makes a showdown of its own likelier, whoever the
   * villain is (chef Dada Jason makes a cook-off likely): `chance` of `fight`.
   */
  fightNudge?: { fight: string; chance: number };
  /** How the house looks and what the waking dad says when this one is the villain. */
  house: HouseMood;
}

/**
 * The villain's mood laid over the house (bedroom after the bad news, hub,
 * side rooms): a tint, a few decals scattered about, and an ambient effect.
 */
export interface HouseMood {
  /**
   * The threat in the wake-up line: "Bad news, EvilRilla is coming, and
   * <threat>!" Written as a clause; no reading words.
   */
  threat: string;
  /** Spoken form of the threat, when edge-tts needs help. Same word count. */
  threatSay?: string;
  /** Laid over every room at low alpha. */
  tint: number;
  /** How strong the tint lies (default 0.16): Evil Elsa's white is stronger, so the house reads frozen white (item 115). */
  tintAlpha?: number;
  /** Things the villain left lying about. Each is art `decal_<id>`. */
  decals: { id: string; glyph: string; look: string; count: number }[];
  /**
   * An ambient effect: falling frost, drifting embers, a thump that shakes the
   * room. `freeze` (item 115) is frost and more: thicker snow, and frost
   * creeping in from every edge of the screen like a frozen window.
   */
  fx: 'frost' | 'freeze' | 'embers' | 'quake' | 'sparkle' | 'smoke' | 'none';
}

export interface MinionSpec {
  id: string;
  name: string;
  glyph: string;
  look: string;
  palette: [number, number];
  style: MoveStyle;
  speed: number;
  size: number;
  hp: number;
  ability: AbilitySpec;
}

export interface ComboSpec {
  /** Character ids; both must be on the hero side. */
  pair: [string, string];
  ability: AbilitySpec;
  /** What the second of the pair fires, when the two do different halves of it. */
  second?: AbilitySpec;
}
