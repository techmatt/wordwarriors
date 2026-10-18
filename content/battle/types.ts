/**
 * The shapes the roster is written in. Pure data: no Phaser, no DOM, so the
 * voice composer (Node) and the game (browser) read the same file.
 *
 * A new character is one `CharacterSpec` in roster.ts, then
 * `npm run voice:lines && npm run voice:build && npm run art:placeholders`.
 * No engine change is needed unless it wants an ability `kind` that does not
 * exist yet, and the list of kinds below is the menu.
 */

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
 */
export type AbilityKind =
  | 'bolt' // projectiles at a target (count, spread, glyph, homing)
  | 'beam' // a sustained ray from caster to target
  | 'cone' // a breath of particles (fire, frost, sand)
  | 'lightning' // jagged strikes from the sky onto targets
  | 'slam' // ground pound around self, or leap onto the target and slam
  | 'spin' // twirl through several enemies in a row
  | 'dash' // a straight charge through the target
  | 'summon' // spawn minions
  | 'polymorph' // turn a target into a pig for a while
  | 'freeze' // encase a target in ice for a while
  | 'teleport' // blink beside the target and strike, leaving afterimages
  | 'clones' // decoy copies of the caster
  | 'trap' // lay traps (cards, runes) that burst when an enemy comes near
  | 'rain' // many things falling from the top of the screen
  | 'shield' // a bubble on self and friends
  | 'heal' // sparkles that top up friends
  | 'grow' // become huge for a while
  | 'coil' // a ring of serpent body squeezing the arena
  | 'eclipse' // the sky goes dark; the sun is swallowed
  | 'wave' // a wall sweeping across the arena
  | 'grid'; // a lattice of lasers across the arena

export type Status = 'freeze' | 'pig' | 'stun' | 'burn';

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
  status?: Status;
  /** For `summon`: which minion (MINIONS key). */
  minion?: string;
  /** Seconds a status, shield, growth or field lasts. */
  duration?: number;
  /** Bolts curve towards their target. */
  homing?: boolean;
  /**
   * The readable word for the move-choice pause ("zap"). Must be one of
   * MOVE_WORDS, because each has a voiced "Use zap!" line per narrator.
   */
  word?: string;
  /** Plays the "Ha!" interjection SFX when used. */
  shout?: boolean;
}

export interface Taunt {
  /** Short key, unique within the fighter; the line id is derived from it. */
  key: string;
  text: string;
  /** Spoken form, when edge-tts needs help. Same word count as text. */
  say?: string;
}

export interface FighterSpec {
  /** "Seraphina" or "Evil Seraphina": shown and spoken. */
  displayName: string;
  /** For edge-tts, when the display name mispronounces. Same word count. */
  sayName?: string;
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
  /** Painted on the placeholder item card. */
  glyph: string;
  look: string;
  /** What it does to the ultimate in Part 2, as the battle shows it. */
  how: 'block' | 'reflect' | 'reveal' | 'restore' | 'shutdown' | 'calm';
  /**
   * The Spell the Spell words: two warm-ups and the magic word last. Short, and
   * the ghost boxes show every letter.
   */
  words: [string, string, string];
}

export interface CharacterSpec {
  id: string;
  /** Archetype, in one sentence. Original characters, not lookalikes. */
  description: string;
  /** edge-tts speaker ids are `<id>` and `<id>_evil`. */
  good: FighterSpec;
  evil: FighterSpec;
  /** What beats the evil version's ultimate. */
  counter: CounterItem;
  /** The arena the evil version fights in. ARENAS key. */
  arena: string;
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
}
