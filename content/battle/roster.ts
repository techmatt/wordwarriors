/**
 * The roster: every character, good and evil, as data.
 *
 * Each character has a good version (a hero or ally) and an evil version (a
 * villain), and each version has its own fighting style, three or more
 * abilities, taunts and an ultimate. The evil version's ultimate is what floors
 * the heroes at the end of Part 1. What beats it in Part 2 is whatever the
 * attic's counter sentence draws from her word bag ("EVIL TIAMAT RUNS FROM THE
 * BUS", item 015): any pictured CVC word, flung at the villain as a swarm of
 * its pictures. The `counter` item here is flavour for when the draw lands on
 * its own word (HAT for Evil Tiamat: the Magic Hat swallows her storm).
 * The parked Spell the Spell game has its own words: content/phonics/spelling.ts.
 *
 * Because any CVC word can be a key word, the episode keeps out of the draw
 * every word its own hero, ally and villain say or show before the attic
 * (names, abilities, ultimates, taunts, minions, the threat):
 * `saidEarly` in src/rules/sentences.ts. Named counter words are still kept
 * out of everyone's names, abilities, ultimates and taunts (rules.test.ts), and
 * each is a whole word of its item's `name` (HAT → Magic Hat).
 *
 * `house` is how the villain colours the house: the threat in the wake-up
 * line ("Bad news, Evil Elsa is coming, and <threat>!"), a tint, decals and an
 * ambient effect. Threats are fun, not scary, and carry no CVC reading words.
 * Decal ids are unique across the roster (prefixed with the character id),
 * because each is its own art asset `decal_<id>`.
 *
 * Elsa, Anna and Jasmine are written as original archetypes (an ice
 * sorceress, her brave sister, a desert princess with a flying carpet), not as
 * lookalikes of anybody's films. The art prompts in docs/art.md say the same.
 *
 * Move words (an ability's `words`) are flavour (see MOVE_WORDS): a pad word one of
 * them answers to fires that ability, styled. Taunts are short, because a bubble over a moving fighter has to be
 * readable at a glance, and they never name the word she must read.
 */

import { ACTIONS } from '../phonics/bank.js';
import type { AbilitySpec, CharacterSpec, ComboSpec, MinionSpec } from './types.js';

/**
 * The words a move-choice pause can offer: the word bank's action words (role
 * `action` or `both`, content/phonics/bank.ts), each with a battle effect of
 * its own (content/phonics/effects.ts), a picture and a "Use X!" line per
 * narrator. Each episode draws which ones she meets from her move bag
 * (src/rules/moves.ts).
 *
 * Since item 037 an ability's `words` no longer limit what she reads:
 * they are flavour. When a pad's word is one a teammate's ability answers to,
 * that teammate fires the styled version (Ellie's Giant Bubbles for BIG);
 * otherwise her hero fires the word's own effect. POW and ICE are not bank
 * words: they stay on abilities as flavour and are never on a pad.
 */
export const MOVE_WORDS: string[] = ACTIONS.map((w) => w.word);

/** What a big move is called out as, voiced and on its banner: `callout`, else its name. */
export const abilityCallout = (a: AbilitySpec): string => a.callout ?? `${a.name}!`;

/** Every move word an ability answers to: its `words`. */
export function abilityWords(a: AbilitySpec): string[] {
  return a.words ?? [];
}

function ab(
  id: string,
  name: string,
  kind: AbilitySpec['kind'],
  cooldown: number,
  color: number,
  power: number,
  extra: Partial<AbilitySpec> = {},
): AbilitySpec {
  return { id, name, kind, cooldown, color, power, ...extra };
}

/** An ultimate: an ability with no cooldown (the director fires it). */
function ult(id: string, name: string, kind: AbilitySpec['kind'], color: number, power: number, extra: Partial<AbilitySpec> = {}): AbilitySpec {
  return ab(id, name, kind, 0, color, power, extra);
}

export const MINIONS: Record<string, MinionSpec> = {
  baby_dragon: {
    id: 'baby_dragon', name: 'Baby Dragon', glyph: '🐲', look: 'a chubby baby dragon with tiny wings, friendly',
    palette: [0x6ad66a, 0xfff07a], style: 'fly', speed: 150, size: 0.55, hp: 30,
    ability: ab('puff', 'Puff', 'bolt', 2.2, 0xff9a3c, 1, { glyph: '🔥' }),
  },
  // Seraphina's own pet (item 111, Matt): her little pink dragon, the one on
  // her shoulder, which flies down and fights beside her (her Dragon Call).
  pink_dragon: {
    id: 'pink_dragon', name: 'Little Pink Dragon', glyph: '🐉', look: 'a small round bubblegum-pink baby dragon with a pale yellow tummy, little lilac wings and stubby horns, big happy eyes, puffing a heart-shaped pink flame, friendly',
    palette: [0xff8ac8, 0xfff07a], style: 'fly', speed: 170, size: 0.55, hp: 40,
    ability: ab('pink_puff', 'Pink Puff', 'bolt', 1.8, 0xff5ab4, 1, { glyph: '💖' }),
  },
  snow_golem: {
    id: 'snow_golem', name: 'Snow Buddy', glyph: '⛄', look: 'a round friendly snowman with stick arms',
    palette: [0xe8f6ff, 0x7cc7ff], style: 'march', speed: 70, size: 0.6, hp: 40,
    ability: ab('snowball', 'Snowball', 'bolt', 2.0, 0xdff4ff, 1, { glyph: '❄️' }),
  },
  skeleton: {
    id: 'skeleton', name: 'Skeleton', glyph: '💀', look: 'a goofy cartoon skeleton with a wobbly jaw, more silly than scary',
    palette: [0xf2f0e6, 0x5a4a6a], style: 'march', speed: 85, size: 0.5, hp: 18,
    ability: ab('bonk', 'Bonk', 'dash', 2.4, 0xf2f0e6, 1),
  },
  gold_golem: {
    id: 'gold_golem', name: 'Coin Golem', glyph: '🟡', look: 'a lumpy golem made of gold coins',
    palette: [0xffcc33, 0x8a5a00], style: 'march', speed: 60, size: 0.6, hp: 30,
    ability: ab('coin_toss', 'Coin Toss', 'bolt', 2.2, 0xffd84a, 1, { glyph: '🟡' }),
  },
  // Ozymandias's crew (item 114): penguins from his Antarctic rocket ship.
  penguin: {
    id: 'penguin', name: 'Penguin', glyph: '🐧', look: 'a chubby cheerful penguin with a little red scarf and tiny silver goggles, flippers out, friendly',
    palette: [0x2a3a5a, 0xffffff], style: 'march', speed: 110, size: 0.45, hp: 20,
    ability: ab('belly_slide', 'Belly Slide', 'dash', 2.0, 0xbfe8ff, 1),
  },
  penguin_trooper: {
    id: 'penguin_trooper', name: 'Penguin Trooper', glyph: '🐧', look: 'a grumpy-silly penguin in a round silver space helmet and a tiny dark-blue cape, holding a little snowball blaster, more silly than scary',
    palette: [0x1a1a3a, 0x7ad8ff], style: 'march', speed: 115, size: 0.45, hp: 14,
    ability: ab('snow_blaster', 'Snow Blaster', 'bolt', 1.8, 0xe8f6ff, 1, { glyph: '❄️' }),
  },
  snow_bot: {
    id: 'snow_bot', name: 'Snow Bot', glyph: '⛄', look: 'a round robot snowman with a shiny metal top hat, one glowing blue eye and stubby rocket feet, slow',
    palette: [0xe8f6ff, 0x7ad8ff], style: 'stomp', speed: 35, size: 0.9, hp: 55,
    ability: ab('snow_stomp', 'Snow Stomp', 'slam', 3.5, 0x7ad8ff, 2),
  },
  drone: {
    id: 'drone', name: 'Drone', glyph: '🛸', look: 'a little round robot drone with one red eye',
    palette: [0x9aa6b8, 0xff3344], style: 'hover', speed: 120, size: 0.45, hp: 15,
    ability: ab('pew', 'Pew', 'bolt', 1.6, 0xff3344, 1, { count: 2 }),
  },
  card_soldier: {
    id: 'card_soldier', name: 'Card Soldier', glyph: '🃏', look: 'a walking playing card with a tiny spear',
    palette: [0xffffff, 0xd02040], style: 'march', speed: 95, size: 0.5, hp: 15,
    ability: ab('poke', 'Poke', 'dash', 2.0, 0xd02040, 1),
  },
  mini_serpent: {
    id: 'mini_serpent', name: 'Sea Snake', glyph: '🐍', look: 'a small green sea snake with a curly tail',
    palette: [0x2aa66a, 0x0a4a3a], style: 'slither', speed: 110, size: 0.45, hp: 15,
    ability: ab('hiss', 'Hiss', 'bolt', 2.2, 0x6aff9a, 1, { glyph: '💧' }),
  },
  teddy: {
    id: 'teddy', name: 'Teddy', glyph: '🧸', look: 'a brave teddy bear with a cape',
    palette: [0xc8884a, 0xff6aa0], style: 'march', speed: 100, size: 0.5, hp: 30,
    ability: ab('teddy_hug', 'Bear Hug', 'dash', 2.0, 0xff9ac8, 1),
  },
  dust_devil: {
    id: 'dust_devil', name: 'Dust Devil', glyph: '🌪️', look: 'a little spinning whirlwind of sand with a cheeky face',
    palette: [0xe8c890, 0x9a7a4a], style: 'dodge', speed: 160, size: 0.5, hp: 15,
    ability: ab('gust', 'Gust', 'cone', 2.0, 0xe8c890, 1),
  },
  joke_bot: {
    id: 'joke_bot', name: 'Pun Bot', glyph: '🤖', look: 'a tiny robot holding a joke book',
    palette: [0xb0b8c8, 0xffcc33], style: 'march', speed: 90, size: 0.45, hp: 18,
    ability: ab('groan', 'Groan', 'bolt', 2.0, 0xffcc33, 1, { glyph: '😆' }),
  },
  /** Warlock Dada Jason's helpers (item 025). */
  imp: {
    id: 'imp', name: 'Imp', glyph: '😈', look: 'a tiny cheeky purple imp with little horns, bat wings and a big grin, more silly than scary',
    palette: [0xb04aff, 0xff9ad5], style: 'fly', speed: 140, size: 0.45, hp: 15,
    ability: ab('imp_flick', 'Flick', 'bolt', 2.0, 0xb04aff, 1, { glyph: '✨' }),
  },
  /** Fetched in a sentence room ("We can use the HEN"), then summoned in the battle. */
  hen: {
    id: 'hen', name: 'Brave Hen', glyph: '🐔', look: 'a fluffy brave hen with a tiny red comb, puffed up and ready',
    palette: [0xffffff, 0xe63946], style: 'march', speed: 115, size: 0.45, hp: 15,
    ability: ab('peck', 'Peck', 'dash', 1.8, 0xffcc33, 1),
  },
  /** The family dog, fetched the same way. */
  dog: {
    id: 'dog', name: 'Family Dog', glyph: '🐶', look: 'a big floppy-eared family dog, wagging and bounding',
    palette: [0xc8884a, 0x5a3a1a], style: 'march', speed: 150, size: 0.6, hp: 35,
    ability: ab('bark', 'Bark', 'bolt', 2.0, 0xffd6a5, 1, { glyph: '🔊' }),
  },
  /** The helper Word to Picture summons for the heroes. Its look is set by the hero. */
  helper: {
    id: 'helper', name: 'Helper', glyph: '🦄', look: 'a sparkly unicorn helper with a rainbow mane',
    palette: [0xffffff, 0xff7ad9], style: 'fly', speed: 170, size: 0.7, hp: 60,
    ability: ab('rainbow', 'Rainbow Blast', 'beam', 3.0, 0xff7ad9, 2, { color2: 0x7ad9ff }),
  },
};

/** The dads as drawn in every form (Matt's photos, 2026-10-18): only the clothes and props change between forms. */
const MATT_FACE = 'a tall, beefy, broad-shouldered bodybuilder dad: fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile';
/** Weightlifter Dada Matt (Matt, item 032): a little less buff than the other forms, in a T-shirt with sleeves. */
const MATT_LIFTER = 'a tall, strong, broad-shouldered dad, fit but not bulky (not a bodybuilder): fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile';
const JASON_FACE = 'a big, sturdy, round-faced dad: warm light-brown skin, very short dark curly hair receding at the front, black browline glasses, a short dark goatee beard flecked with grey, a tiny hoop earring, a big laughing smile';

/**
 * Each dad's colour (item 046: Matt blue, Jason forest green), the one place it is
 * set. Every good form drawn in it takes its palette, trail and themed move colours
 * from here, so a new colour moves them all (item 078; rules.test.ts checks). `deep`
 * is the cloth, `bright` the same hue lifted to read as a trail or a glow on any arena.
 * Cyber Matt keeps his own cyan and magenta: he was never recoloured.
 */
export const DAD_COLOURS: Record<string, { deep: number; bright: number }> = {
  dada_matt: { deep: 0x2a4aa0, bright: 0x7ab8ff },
  dada_jason: { deep: 0x1f5a32, bright: 0x5ac878 },
};
const MATT = DAD_COLOURS.dada_matt!;
const JASON = DAD_COLOURS.dada_jason!;
/** The dads' good forms that keep colours of their own (see DAD_COLOURS). */
export const OWN_COLOURS = new Set(['dada_matt_cyber']);

export const ROSTER: CharacterSpec[] = [
  {
    id: 'julia',
    description: 'A fearless four-year-old adventurer in a rainbow twirl dress, with a star wand and a big laugh.',
    arena: 'meadow',
    good: {
      // Looks from Matt's photos (2026-10-18), cartoon-simplified.
      displayName: 'Julia', trail: { tint: [0xffd23f, 0xff9ad5], shape: 'star' }, look: 'a cheerful slim four-year-old girl with long straight pale-blonde hair and a straight fringe, round pink glasses, blue eyes, fair skin and rosy cheeks, a big cheeky grin, in a rainbow twirl dress with a full swishy skirt striped red, orange, yellow, blue, purple and pink (no green), holding a golden star wand',
      palette: [0x9b5de5, 0xffd23f], glyph: '⭐', style: 'dodge', speed: 210, size: 1, hp: 100,
      abilities: [
        ab('star_zap', 'Star Zap', 'bolt', 2.5, 0xffd23f, 1, { count: 3, glyph: '⭐', shout: true, words: ['zap', 'zip', 'pow'] }),
        ab('giggle_bubble', 'Giggle Bubble', 'shield', 9, 0xff9ad5, 1, { duration: 4, words: ['pop', 'wet'] }),
        ab('bounce_stomp', 'Super Bounce', 'slam', 6, 0x9b5de5, 2, { shout: true, words: ['hop', 'bam', 'big'] }),
        ab('teddy_army', 'Teddy Army', 'summon', 14, 0xc8884a, 2, { minion: 'teddy', count: 3, words: ['hug', 'run', 'tug'] }),
      ],
      ultimate: ult('super_nova', 'Super Star Nova', 'rain',0xffd23f, 3, { count: 30, glyph: '🌟', color2: 0xff5ab4 }),
      taunts: [
        { key: 'here', text: 'Here I come!' },
        { key: 'wand', text: 'My wand is sparkly!' },
        { key: 'brave', text: 'I am super brave!' },
        { key: 'boop', text: 'Got you!' },
        { key: 'giggle', text: "You can't catch me!" },
        { key: 'team', text: 'We are a super team!' },
      ],
    },
    evil: {
      displayName: 'Evil Julia', trail: { tint: [0xff3355, 0x3a1a5a], shape: 'square' }, look: "Julia's mischievous dark mirror: the same slim four-year-old girl with long straight pale-blonde hair and a straight fringe, round glasses with dark magenta frames, a sly cheeky smirk, in a black-and-dark-purple version of her twirl dress with a little black cape, holding a cracked dark star wand",
      palette: [0x3a1a5a, 0xff3355], glyph: '💢', style: 'dodge', speed: 210, size: 1, hp: 140,
      abilities: [
        ab('grump_zap', 'Grump Zap', 'bolt', 2.5, 0xff3355, 1, { count: 3, glyph: '💢' }),
        ab('stomp_stomp', 'Stompy Feet', 'slam', 5, 0x5a2a7a, 2),
        ab('no_nap', 'No Naps Ever', 'lightning', 7, 0xb04aff, 2, { count: 3 }),
      ],
      ultimate: ult('tantrum_quake', 'Mega Tantrum', 'wave',0xff3355, 3, { color2: 0x3a1a5a }),
      taunts: [
        { key: 'no', text: 'No, no, no!' },
        { key: 'mine', text: 'All the toys are mine!' },
        { key: 'bedtime', text: 'I never go to sleep!' },
        { key: 'grr', text: "It's grumpy time!" },
        { key: 'nap', text: 'Naps are for babies!' },
        { key: 'cookies', text: 'I ate all the cookies!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'share', text: 'Sorry, I will share all my toys now.' },
        { key: 'grumpy', text: 'Sorry, I was a grumpy girl.' },
        { key: 'play', text: "Sorry, let's all play together." },
      ],
      ending: [
        { key: 'next', text: 'Can I come on the next adventure?' },
        { key: 'best', text: 'This is the best day ever!' },
        { key: 'sit', text: 'Can I sit next to you?' },
      ],
    },
    counter: {
      id: 'cozy_bed', name: 'Cozy Bed', glyph: '🛏️', look: 'a child\'s bed with a puffy blue duvet and a white pillow, glowing softly, a sleepy moon and stars above it',
      how: 'calm', word: 'bed',
    },
    house: {
      threat: 'she wants to keep every toy for herself',
      tint: 0x5a2a7a,
      decals: [
        { id: 'julia_toys', glyph: '🧸', look: 'toys tossed all over the floor', count: 3 },
        { id: 'julia_crumbs', glyph: '🍪', look: 'half-eaten cookies', count: 2 },
      ],
      fx: 'sparkle',
    },
  },
  {
    id: 'ellie',
    description: "Julia's toddler sister: small, fast and full of giant bubbles, with one trick of spinning silver swords.",
    arena: 'nursery',
    good: {
      // Bubbles are the fx_bubble texture (src/fx/textures.ts), tinted; her one
      // sword move draws prop_silver_sword round her, so it shows with any Ellie image.
      displayName: 'Ellie', trail: { tint: [0x9ad8ff, 0xff9ad5], shape: 'spark' }, look: 'a cheerful chubby toddler girl of about two: a fine, wispy pale strawberry-blonde bob (very light blonde with a faint peach tint, not golden or orange) with a straight fringe, big blue eyes, chubby rosy cheeks, fair skin, in cosy cream footie pyjamas with rust-orange and brown stripes, waving a giant bubble wand with big shiny pink-and-blue bubbles floating around her',
      palette: [0xff9ad5, 0x9ad8ff], glyph: '🍼', style: 'dodge', speed: 230, size: 0.8, hp: 90,
      abilities: [
        // When the hub's gift word is one of Ellie's (BIG, POP, HOP...),
        // Julia fires Ellie's move for it (src/rules/moves.ts giftOwner).
        ab('giant_bubbles', 'Giant Bubbles', 'bolt', 2.4, 0x9ad8ff, 1, { count: 4, art: 'fx_bubble', upright: true, homing: true, color2: 0xff9ad5, words: ['big', 'wet'] }),
        ab('bubble_trap', 'Bubble Cage', 'bolt', 7, 0xff9ad5, 2, { count: 2, art: 'fx_bubble', upright: true, homing: true, status: 'bubble', duration: 2.5, color2: 0x9ad8ff, words: ['pop', 'fog'] }),
        ab('bubble_shield', 'Bubble Shield', 'shield', 10, 0x9ad8ff, 1, { duration: 4, words: ['hug'] }),
        ab('peekaboo', 'Peekaboo', 'teleport', 6, 0xffd23f, 2, { words: ['hop', 'fog'] }),
        // Her one sword move (item 014's swords): a ring round her, then flung.
        ab('spinny_swords', 'Spinny Swords', 'orbit', 7, 0xcfe8ff, 2, { count: 5, art: 'prop_silver_sword', duration: 1.6, color2: 0xff9ad5, shout: true, words: ['zip', 'top'] }),
      ],
      ultimate: ult('bubble_storm', 'Mega Bubble Storm', 'rain',0x9ad8ff, 3, { count: 30, art: 'fx_bubble', upright: true, color2: 0xff9ad5 }),
      taunts: [
        { key: 'me', text: 'Me do it!' },
        { key: 'again', text: 'Again, again!' },
        { key: 'strong', text: 'Ellie strong!' },
        { key: 'peekaboo', text: 'Peekaboo!' },
        { key: 'look', text: 'Julia, look at me!' },
        { key: 'bubbles', text: 'More bubbles!' },
      ],
    },
    evil: {
      displayName: 'Evil Ellie', trail: { tint: [0xff5ab4, 0x3a1a5a], shape: 'square' }, look: 'a cheeky little toddler menace: the same chubby two-year-old girl with a fine, wispy pale strawberry-blonde bob (very light blonde with a faint peach tint) sticking up, big blue eyes and rosy cheeks, a naughty grin with her tongue poking out, in dark purple footie pyjamas and a tiny black cape, holding a giant crayon like a sword. Funny and cute, never scary',
      palette: [0x3a1a5a, 0xff5ab4], glyph: '🖍️', style: 'dodge', speed: 230, size: 0.8, hp: 130,
      abilities: [
        ab('crayon_scribble', 'Crayon Scribble', 'beam', 6, 0xff5ab4, 2),
        ab('raspberry', 'Giant Raspberry', 'cone', 5, 0xff3a7a, 2),
        ab('toy_toss', 'Toy Toss', 'bolt', 2.4, 0xc8884a, 1, { count: 4, glyph: '🧸' }),
        ab('tantrum_shockwave', 'Tantrum Shockwave', 'slam', 6, 0xb04aff, 3),
      ],
      ultimate: ult('juice_tsunami', 'Juice Tsunami', 'wave',0x7ad9ff, 3, { color2: 0x3a1a5a }),
      taunts: [
        { key: 'mine', text: 'Everything is mine!' },
        { key: 'share', text: 'I will not share!' },
        { key: 'snacks', text: 'I want more snacks, right now!' },
        { key: 'scribble', text: "I'm scribbling on everything!" },
        { key: 'fast', text: "I'm way too fast for you!" },
        { key: 'raspberry', text: "Here's a raspberry for you!" },
      ],
    },
    reformed: {
      sorry: [
        { key: 'bubbles', text: 'Sorry, I made bubbles for everybody!' },
        { key: 'good', text: 'Sorry, Ellie is good now.' },
        { key: 'sorry', text: 'Sorry, sorry, sorry!' },
      ],
      ending: [
        { key: 'cuddle', text: 'I want a cuddle now!' },
        { key: 'happy', text: 'Ellie is so happy!' },
        { key: 'please', text: 'I want more bubbles, please!' },
      ],
    },
    counter: {
      id: 'bubble_bath', name: 'Bubble Tub', glyph: '🛁', look: 'a magic bathtub overflowing with rainbow bubbles, a little yellow rubber duck on top',
      how: 'calm', word: 'tub',
    },
    house: {
      threat: 'she wants to scribble crayon on every wall',
      tint: 0xff5ab4,
      decals: [
        { id: 'ellie_crayon', glyph: '🖍️', look: 'bright crayon scribbles', count: 3 },
        { id: 'ellie_snack', glyph: '🥣', look: 'a tipped-over bowl of snack puffs', count: 2 },
      ],
      fx: 'sparkle',
    },
  },
  {
    id: 'seraphina',
    // Item 111 (Matt): from his earlier game Seraphina's Secret, where she
    // secretly raises baby dragons in a hidden hatchery; her little pink pet
    // dragon goes everywhere with her and fights beside her.
    description: 'A little girl who keeps dragons: she secretly raises baby dragons, and her little pink pet dragon goes everywhere with her.',
    arena: 'volcano',
    good: {
      displayName: 'Seraphina', trail: { tint: [0x6ad66a, 0xff7b3a], shape: 'spark' }, look: 'a little girl with wild red hair in a green tunic, a tiny bubblegum-pink pet dragon with lilac wings on her shoulder',
      palette: [0x2ec27e, 0xff7b3a], glyph: '🐉', style: 'hover', speed: 170, size: 1, hp: 100,
      abilities: [
        // Her pet first (item 111): the little pink dragon flies down to fight beside her.
        ab('dragon_call', 'Dragon Call', 'summon', 9, 0xff8ac8, 2, { minion: 'pink_dragon', count: 1, words: ['pop', 'jet'] }),
        ab('ember_flick', 'Ember Flick', 'bolt', 2.2, 0xff7b3a, 1, { count: 2, glyph: '🔥', words: ['hot', 'zip'] }),
        ab('wing_gust', 'Dragon Wind', 'cone', 5, 0xbaffc9, 2, { words: ['fan', 'fog'] }),
        ab('scale_shield', 'Scale Shield', 'shield', 10, 0x2ec27e, 1, { duration: 4, words: ['hug'] }),
      ],
      ultimate: ult('dragon_parade', 'Dragon Parade', 'summon',0xff7b3a, 3, { minion: 'baby_dragon', count: 6 }),
      taunts: [
        { key: 'dragons', text: 'Dragons, to me!' },
        { key: 'roar', text: 'My dragons say hello!' },
        { key: 'fly', text: "Let's fly up high!" },
        { key: 'friends', text: 'Dragons are my friends!' },
        { key: 'wings', text: 'Spread your wings!' },
        { key: 'hot', text: 'Careful, my dragons breathe fire!' },
        // Item 111 (Matt): her pet fights beside her.
        { key: 'pet', text: 'Go get them, little pink dragon!' },
      ],
    },
    evil: {
      displayName: 'Evil Seraphina', trail: { tint: [0xff4a1a, 0x2a5a3a], shape: 'smoke' }, look: 'a girl in a dark hooded cloak riding a swarm of shadow dragons, glowing orange eyes',
      palette: [0x1a3a2a, 0xff4a1a], glyph: '🐲', style: 'fly', mount: '🐉', speed: 190, size: 1, hp: 140,
      abilities: [
        ab('shadow_dragons', 'Shadow Dragons', 'summon', 10, 0x2a5a3a, 2, { minion: 'baby_dragon', count: 3 }),
        ab('fire_rain', 'Fire Rain', 'rain', 7, 0xff4a1a, 2, { count: 12, glyph: '🔥' }),
        ab('tail_whip', 'Tail Whip', 'spin', 6, 0x2a5a3a, 2),
      ],
      ultimate: ult('dragon_swarm', 'Dragon Swarm', 'rain',0xff4a1a, 3, { count: 26, glyph: '🐉', color2: 0x2a5a3a }),
      taunts: [
        { key: 'mine', text: 'All the dragons obey me!' },
        { key: 'hungry', text: 'My dragons are hungry!' },
        { key: 'burn', text: 'Time to get toasty!' },
        { key: 'swarm', text: 'Swarm them, dragons!' },
        { key: 'shadow', text: 'Come out of the shadows, dragons!' },
        { key: 'scaly', text: 'My dragons are scaly and scary!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'nice', text: 'Sorry, I promise I will be nice again.' },
        { key: 'dragons', text: 'Sorry, my dragons will be good now.' },
        { key: 'fiery', text: 'Sorry I was so fiery!' },
      ],
      ending: [
        { key: 'fly', text: 'Can I fly with you next time?' },
        { key: 'play', text: 'My dragons want to play with you!' },
        { key: 'parties', text: 'My dragons love parties!' },
      ],
    },
    counter: {
      id: 'golden_nut', name: 'Golden Nut', glyph: '🥜', look: 'a giant shiny golden hazelnut in its shell, the snack every dragon loves best',
      how: 'calm', word: 'nut',
    },
    house: {
      threat: 'her dragons want to toast the whole house',
      tint: 0xff4a1a,
      decals: [
        { id: 'seraphina_scorch', glyph: '🔥', look: 'little scorch marks', count: 3 },
        { id: 'seraphina_egg', glyph: '🥚', look: 'dragon eggs left in odd places', count: 2 },
      ],
      fx: 'embers',
    },
  },
  {
    // Matt, 2026-10-18: Dada Matt took over the builder look and moves Dada
    // Jason had, and Dada Jason became a chef.
    id: 'dada_matt',
    form: 'builder',
    description: 'A big-hearted builder dad with a giant hammer who builds walls and towers in a blink.',
    arena: 'castle',
    good: {
      displayName: 'Dada Matt', trail: { tint: [MATT.bright, 0xc8d0dc], shape: 'square' }, look: 'a tall, beefy, broad-shouldered bodybuilder dad: fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile, in chunky deep-blue-and-steel builder armour (a rich royal-to-navy blue) with a tool belt, holding a huge friendly hammer. Bright, sturdy and friendly',
      palette: [MATT.deep, 0xc8d0dc], glyph: '🔨', style: 'twirl', speed: 200, size: 1.2, hp: 130,
      abilities: [
        ab('hammer_spin', 'Hammer Swing', 'spin', 5, MATT.bright, 2, { shout: true, words: ['pow', 'top'] }),
        ab('brick_wall', 'Brick Wall', 'shield', 10, 0xc8643a, 1, { duration: 4, words: ['big', 'fix'] }),
        ab('nail_storm', 'Nail Storm', 'bolt', 2.6, 0xc8c8d8, 1, { count: 5, glyph: '🔩', words: ['zip'] }),
        ab('ground_pound', 'Ground Pound', 'slam', 7, MATT.bright, 3, { shout: true, words: ['bam', 'dig', 'mud'] }),
      ],
      ultimate: ult('tower_drop', 'Tower Drop', 'rain',0xc8643a, 3, { count: 20, glyph: '🧱', color2: MATT.bright }),
      taunts: [
        { key: 'build', text: 'Let me build that!' },
        { key: 'strong', text: "I'm as strong as a castle!" },
        { key: 'hammer', text: 'Hammer time!' },
        { key: 'got', text: 'I got you, buddy!' },
        { key: 'tools', text: 'Hand me a hammer!' },
        { key: 'wall', text: 'I will build a wall!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Matt', trail: { tint: [0xb04aff, 0x2a2a3a], shape: 'square' }, look: 'the same beefy bodybuilder dad with short light-brown hair thinning on top and a full short reddish-brown beard, a mischievous grin, in spiky black builder armour, holding a hammer that crackles purple',
      palette: [0x2a2a3a, 0xb04aff], glyph: '⚒️', style: 'stomp', speed: 120, size: 1.4, hp: 170,
      abilities: [
        ab('wreck', 'Wrecking Ball', 'spin', 5, 0xb04aff, 2),
        ab('brick_rain', 'Brick Rain', 'rain', 7, 0xc8643a, 2, { count: 12, glyph: '🧱' }),
        ab('quake', 'Earthquake', 'slam', 6, 0xb04aff, 3),
      ],
      ultimate: ult('mega_hammer', 'Mega Hammer Smash', 'wave',0xb04aff, 3, { color2: 0x2a2a3a }),
      taunts: [
        { key: 'smash', text: "I'm going to smash it all!" },
        { key: 'mess', text: 'Look at the mess I made!' },
        { key: 'wall', text: 'No more walls for you!' },
        { key: 'boom', text: 'Boom goes the hammer!' },
        { key: 'crumble', text: 'Watch it all crumble!' },
        { key: 'stomp', text: 'Look out below!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'fort', text: 'Sorry, kiddo, want to build a fort?' },
        { key: 'walls', text: "Sorry, kiddo, I'll put every wall back up." },
        { key: 'silly', text: 'Sorry, Daddy got a bit silly.' },
      ],
      ending: [
        { key: 'fixing', text: 'No more smashing, I will only build things now!' },
        { key: 'piggyback', text: 'Who wants a piggyback ride?' },
        { key: 'build', text: "Let's build something together!" },
      ],
    },
    counter: {
      id: 'giant_log', name: 'Giant Log', glyph: '🌲', look: 'a huge cut wooden log lying down, rings showing on the end, so solid that any hammer just bonks off it',
      how: 'block', word: 'log',
    },
    house: {
      threat: 'he wants to knock down every wall',
      tint: 0x7a4ab0,
      decals: [
        { id: 'dada_matt_brick', glyph: '🧱', look: 'loose bricks', count: 3 },
        { id: 'dada_matt_hammer', glyph: '🔨', look: 'a crackling purple hammer left on the floor', count: 1 },
      ],
      fx: 'quake',
    },
  },
  {
    id: 'dada_jason',
    form: 'chef',
    description: 'A jolly chef dad with a giant whisk who flips pancakes higher than the roof.',
    arena: 'kitchen',
    fight: 'cook_off',
    fightNudge: { fight: 'cook_off', chance: 0.7 },
    good: {
      displayName: 'Dada Jason', trail: { tint: [JASON.bright, 0xffffff], shape: 'star' }, look: 'a big, sturdy, round-faced chef dad: warm light-brown skin, very short dark curly hair receding at the front, black browline glasses, a short dark goatee beard flecked with grey, a tiny hoop earring, a big laughing smile, in crisp white chef\'s whites trimmed in deep forest green (a dark, rich pine green, not lime or bright grass green): a forest-green collar, cuffs and buttons, a forest-green apron, a tall white chef\'s hat with a forest-green band and a forest-green neckerchief, holding a giant whisk. Bright, warm and friendly',
      palette: [JASON.deep, 0xfff1d6], glyph: '🍳', style: 'hover', speed: 170, size: 1.2, hp: 120,
      abilities: [
        ab('pancake_flip', 'Pancake Flip', 'bolt', 2.4, 0xffbe0b, 1, { count: 3, glyph: '🥞', words: ['pop', 'pan', 'hop'] }),
        ab('whisk_whirl', 'Whisk Whirl', 'spin', 5, 0xfff1d6, 2, { shout: true, words: ['zip', 'top'] }),
        ab('sauce_tornado', 'Sauce Tornado', 'cone', 6, 0xe63946, 2, { words: ['hot', 'wet'] }),
        ab('oven_mitt', 'Oven Mitt Shield', 'shield', 10, 0xff8c42, 1, { duration: 4, words: ['hug', 'big'] }),
      ],
      ultimate: ult('breakfast_storm', 'Raining Pancakes', 'rain',0xffbe0b, 3, { count: 30, glyph: '🥞', color2: 0xff6a3a }),
      taunts: [
        { key: 'order', text: 'Order up!' },
        { key: 'pancake', text: 'Pancakes for everyone!' },
        { key: 'chef', text: "Who's hungry?" },
        { key: 'whisk', text: 'Whisk it, whisk it!' },
        { key: 'sauce', text: 'A little more sauce!' },
        { key: 'flip', text: 'Look how high they fly!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Jason', trail: { tint: [0xc8ff3a, 0x2a1a3a], shape: 'smoke' }, look: 'a fun, mischievous villain chef for a children\'s game, NOT scary: the same big, sturdy, round-faced dad as the good chef, warm light-brown skin, very short dark curly hair receding at the front, his black browline glasses, his own short dark goatee beard flecked with grey, a tiny hoop earring and a sly, cheeky grin. NO moustache, NO whiskers, NO twirly or curled facial hair: his own face, just as in the photo. He wears a black chef\'s jacket with purple buttons and purple piping, a black apron and a floppy dark-purple chef\'s hat: a black-and-purple palette with glowing purple accents, no green anywhere. He holds up a giant ladle dripping with glowing purple sauce, a few purple drips splashing. A clear, simple silhouette that still reads at small sprite size',
      palette: [0x2a1a3a, 0xc8ff3a], glyph: '🥦', style: 'blink', speed: 180, size: 1.2, hp: 150,
      abilities: [
        ab('broccoli', 'Broccoli Barrage', 'bolt', 2.6, 0x4aa62a, 1, { count: 4, glyph: '🥦' }),
        ab('hot_sauce', 'Super Spicy Sauce', 'beam', 6, 0xff3a1a, 2),
        ab('sticky_syrup', 'Sticky Syrup', 'trap', 8, 0xc8781a, 2, { count: 3, glyph: '🍯' }),
      ],
      ultimate: ult('food_fight', 'Mega Food Fight', 'rain',0xc8ff3a, 3, { count: 28, glyph: '🍝', color2: 0x2a1a3a }),
      taunts: [
        { key: 'veggies', text: 'Eat your veggies!' },
        { key: 'broccoli', text: 'You get broccoli for breakfast!' },
        { key: 'soup', text: 'The soup of the day is slime!' },
        { key: 'table', text: 'Nobody leaves the table!' },
        { key: 'sprouts', text: 'Extra sprouts for you!' },
        { key: 'fight', text: "Let's have a food fight!" },
      ],
    },
    reformed: {
      sorry: [
        { key: 'pancakes', text: 'Sorry, does anybody want pancakes?' },
        { key: 'broccoli', text: 'Sorry, no more broccoli for breakfast.' },
        { key: 'dessert', text: 'Sorry, kiddo, today we will have dessert first.' },
      ],
      ending: [
        { key: 'yummy', text: 'I promise to cook yummy food, not yucky food!' },
        { key: 'seconds', text: 'There are seconds for everybody!' },
        { key: 'party', text: "Let's have a party every day!" },
      ],
    },
    counter: {
      id: 'cleanup_van', name: 'Clean-Up Van', glyph: '🚐', look: 'a little cartoon cleaning van with spinning brushes and a big hose that hoovers up every bit of food',
      how: 'restore', word: 'van',
    },
    house: {
      threat: 'he wants everybody to eat broccoli for breakfast',
      tint: 0x4aa62a,
      decals: [
        { id: 'dada_jason_broccoli', glyph: '🥦', look: 'broccoli on every plate', count: 3 },
        { id: 'dada_jason_flour', glyph: '🥄', look: 'spilled flour with floury footprints', count: 2 },
      ],
      fx: 'none',
    },
  },
  {
    id: 'elsa',
    description: 'An ice sorceress who grows crystal towers out of the ground and sculpts snow helpers.',
    arena: 'ice',
    // Item 115: as the villain, her frost beam against everybody's warm magic.
    fight: 'frost_clash',
    good: {
      displayName: 'Elsa', trail: { tint: [0xe8f6ff, 0x7cc7ff], shape: 'star' }, look: 'a cheerful winter queen of original design: rosy cheeks and freckles, long pale silver hair, a flowing white-and-gold gown embroidered with golden snowflakes, a little golden crown and a fluffy white fur-trimmed cape, conjuring golden-white sparkles',
      palette: [0x7cc7ff, 0xe8f6ff], glyph: '❄️', style: 'hover', speed: 160, size: 1, hp: 100,
      abilities: [
        ab('ice_shard', 'Ice Shards', 'bolt', 2.2, 0xaee6ff, 1, { count: 4, glyph: '❄️', words: ['ice', 'zap'] }),
        ab('deep_freeze', 'Deep Freeze', 'freeze', 8, 0x7cc7ff, 2, { status: 'freeze', duration: 3, words: ['zip', 'fog'] }),
        ab('snow_buddies', 'Snow Buddies', 'summon', 12, 0xe8f6ff, 2, { minion: 'snow_golem', count: 2, words: ['big', 'hug'] }),
        ab('crystal_spire', 'Crystal Tower', 'slam', 6, 0xaee6ff, 2, { words: ['bam'] }),
      ],
      ultimate: ult('blizzard', 'Sparkle Blizzard', 'rain',0xe8f6ff, 3, { count: 34, glyph: '❄️', color2: 0x7cc7ff }),
      taunts: [
        { key: 'cold', text: 'The cold is my friend!' },
        { key: 'freeze', text: 'Freeze right there!' },
        { key: 'snow', text: 'Let it snow!' },
        { key: 'sister', text: 'Ready, little sister?' },
        { key: 'sparkle', text: 'Sparkle and shine!' },
        { key: 'snowflake', text: 'Every snowflake is special!' },
      ],
    },
    evil: {
      displayName: 'Evil Elsa', trail: { tint: [0x5ad8ff, 0x1a2a5a], shape: 'star' }, look: 'a sulky frost witch of original design with a short spiky silver pixie cut and freckles, a tall jagged black-and-gold crown, a knee-length tunic of dark violet crystal plates over black leggings, black boots, a tattered gold-edged cape, holding a staff topped with a purple crystal',
      palette: [0x1a2a5a, 0x5ad8ff], glyph: '🧊', style: 'blink', speed: 170, size: 1.05, hp: 140,
      abilities: [
        ab('icicle_rain', 'Icicle Rain', 'rain', 6, 0x5ad8ff, 2, { count: 14, glyph: '🧊' }),
        ab('flash_freeze', 'Flash Freeze', 'freeze', 7, 0x5ad8ff, 2, { status: 'freeze', duration: 3 }),
        ab('frost_beam', 'Frost Beam', 'beam', 5, 0x9aeaff, 2),
      ],
      ultimate: ult('eternal_winter', 'Forever Winter', 'wave',0xbff0ff, 3, { color2: 0x1a2a5a, status: 'freeze' }),
      taunts: [
        { key: 'winter', text: 'It will be winter forever!' },
        { key: 'chill', text: 'Chill out!' },
        { key: 'cold', text: "It's so very cold in here!" },
        { key: 'ice', text: 'Everything turns to ice!' },
        { key: 'frozen', text: 'You are frozen solid!' },
        { key: 'icicles', text: "I'll hang icicles everywhere!" },
      ],
    },
    reformed: {
      sorry: [
        { key: 'chilly', text: 'Sorry I made it so chilly!' },
        { key: 'melt', text: "Sorry, I'll make all the ice go away." },
        { key: 'frosty', text: 'Sorry I was so frosty!' },
      ],
      ending: [
        { key: 'snowman', text: 'Can I make you a snowman?' },
        { key: 'cosy', text: 'It is so warm and cozy now!' },
        { key: 'snowflake', text: 'Can I give you a snowflake?' },
      ],
    },
    counter: {
      id: 'cocoa_cup', name: 'Cocoa Cup', glyph: '☕', look: 'a big red mug of steaming cocoa with a handle, so warm it melts any winter',
      how: 'restore', word: 'cup',
    },
    house: {
      threat: 'she wants to freeze the whole house',
      // Item 115: she freezes the house white (a strong white tint, and frost
      // creeping in from every edge), where Evil Ozymandias's frost is pale blue.
      tint: 0xf4fbff,
      tintAlpha: 0.42,
      decals: [{ id: 'elsa_icicle', glyph: '❄️', look: 'icicles and frost patches', count: 4 }],
      fx: 'freeze',
    },
  },
  {
    id: 'anna',
    description: 'The ice sorceress\'s brave little sister: a sword-and-shield adventurer who never gives up.',
    arena: 'ice',
    // Good Anna is Evil Anna's copper curls turned good (Matt's pick, item 112's
    // round, promoted by item 113): brief 112_good_anna_plum. Her face card
    // still shows item 009's dark ponytail until item 113's face round is picked.
    good: {
      displayName: 'Anna', trail: { tint: [0xffb703, 0xe63946], shape: 'spark' }, look: 'a freckled young adventurer of original design with a short, curly copper bob and a braid across the top of her head, tied with a big purple ribbon, bright blue eyes and warm peachy skin with rosy cheeks, a big brave happy grin, a plum-purple tunic with a brown belt, a short magenta cape, white leggings and tall brown boots, a round wooden shield with a golden sun painted on it and a wooden practice sword',
      palette: [0xe63946, 0x2a9d8f], glyph: '🛡️', style: 'twirl', speed: 230, size: 1, hp: 110,
      abilities: [
        ab('shield_bash', 'Shield Bash', 'dash', 4, 0xe63946, 2, { shout: true, words: ['bam', 'ram', 'run'] }),
        ab('sword_twirl', 'Sword Twirl', 'spin', 5, 0xffd6a5, 2, { shout: true, words: ['pow', 'top'] }),
        ab('brave_shout', 'Brave Shout', 'heal', 10, 0xffb703, 1, { words: ['hug', 'fix'] }),
        ab('leap', 'Giant Leap', 'slam', 6, 0x2a9d8f, 2, { words: ['hop', 'big'] }),
      ],
      ultimate: ult('never_give_up', 'Brave Heart Whirlwind', 'spin',0xffb703, 3, { count: 6, color2: 0xe63946 }),
      taunts: [
        { key: 'brave', text: 'I am not scared!' },
        { key: 'charge', text: 'Charge!' },
        { key: 'sister', text: 'Sisters forever!' },
        { key: 'again', text: 'Again, again!' },
        { key: 'shield', text: 'My shield is strong!' },
        { key: 'friends', text: 'I fight for my friends!' },
      ],
    },
    evil: {
      displayName: 'Evil Anna', trail: { tint: [0x9aeaff, 0x7cc7ff], shape: 'spark' }, look: 'a freckled young adventurer of original design under a frost curse, with a short curly copper bob: frosty pale-blue skin, icicles in her curly bob, a grey-blue tunic, a cracked ice shield, a cross scowl',
      palette: [0x3a1a2a, 0x7cc7ff], glyph: '⚔️', style: 'twirl', speed: 240, size: 1.05, hp: 140,
      abilities: [
        ab('frost_bash', 'Frost Bash', 'dash', 4, 0x7cc7ff, 2),
        ab('cold_twirl', 'Cold Twirl', 'spin', 5, 0x7cc7ff, 2),
        ab('ice_wall', 'Ice Wall', 'shield', 9, 0x7cc7ff, 1, { duration: 4 }),
      ],
      ultimate: ult('frozen_charge', 'Frozen Heart Charge', 'dash',0x9aeaff, 3, { count: 4, color2: 0x3a1a2a }),
      taunts: [
        { key: 'cold', text: 'My heart is ice!' },
        { key: 'alone', text: 'I fight alone!' },
        { key: 'charge', text: 'Out of my way!' },
        { key: 'sword', text: 'Try and stop me!' },
        { key: 'frost', text: 'Feel the frost!' },
        { key: 'blizzard', text: 'Get out of my blizzard!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'friends', text: 'Sorry, will you be my friend again?' },
        { key: 'team', text: "Sorry, I'm on your team now." },
        { key: 'blizzard', text: 'Sorry about the blizzard!' },
      ],
      ending: [
        { key: 'side', text: 'Next time, I fight on your side!' },
        { key: 'grouphug', text: 'Everybody, come in for a group hug!' },
        { key: 'love', text: 'I love my friends!' },
      ],
    },
    counter: {
      id: 'cuddly_cat', name: 'Cuddly Cat', glyph: '🐱', look: 'a warm, fluffy orange tabby cat with a curled tail, purring, who cuddles the frost away',
      how: 'calm', word: 'cat',
    },
    house: {
      threat: 'she wants to turn every room into a blizzard',
      tint: 0x7cc7ff,
      decals: [
        { id: 'anna_snowman', glyph: '⛄', look: 'grumpy little snowmen', count: 2 },
        { id: 'anna_shield', glyph: '🛡️', look: 'a cracked ice shield', count: 1 },
      ],
      fx: 'frost',
    },
  },
  {
    id: 'jasmine',
    description: 'A desert princess who rides a flying carpet and commands the wind and the sand.',
    arena: 'desert',
    good: {
      displayName: 'Jasmine', trail: { tint: [0xbaf2ff, 0xffc857], shape: 'smoke' }, look: 'a desert princess of original design with short bouncy black curls and a gold circlet, a coral-pink and saffron-orange tunic over baggy saffron trousers, sitting cross-legged on a red-and-gold patterned flying carpet',
      palette: [0x1fb5a8, 0xffc857], glyph: '🧞', style: 'fly', mount: 'carpet', speed: 220, size: 1, hp: 100,
      abilities: [
        ab('wind_fan', 'Desert Wind', 'cone', 4, 0xbaf2ff, 2, { words: ['fan', 'fog'] }),
        ab('carpet_swoop', 'Carpet Swoop', 'dash', 5, 0xffc857, 2, { words: ['zip', 'jet', 'run'] }),
        ab('dust_devils', 'Dust Devils', 'summon', 12, 0xe8c890, 2, { minion: 'dust_devil', count: 3, words: ['pop', 'top'] }),
        ab('star_jewels', 'Star Jewels', 'bolt', 2.4, 0xff5ab4, 1, { count: 3, glyph: '💎', words: ['zap'] }),
      ],
      ultimate: ult('jewel_storm', 'Jewel Storm', 'rain',0xff5ab4, 3, { count: 30, glyph: '💎', color2: 0x1fb5a8 }),
      taunts: [
        { key: 'fly', text: 'Hop on my carpet!' },
        { key: 'wind', text: 'Feel the wind!' },
        { key: 'whoosh', text: "You'll never catch my carpet!" },
        { key: 'jewels', text: 'Look at my jewels sparkle!' },
        { key: 'stars', text: "Let's fly to the stars!" },
        { key: 'sand', text: 'The sand is my friend!' },
      ],
    },
    evil: {
      displayName: 'Evil Jasmine', trail: { tint: [0xe8c890, 0x5a3a6a], shape: 'smoke' }, look: 'the same curly-haired desert princess in dark plum and black robes with a dented gold circlet, sitting on a carpet of black smoke, a little sandstorm swirling behind her',
      palette: [0x3a1a4a, 0xe8c890], glyph: '🌪️', style: 'fly', mount: 'carpet', speed: 230, size: 1.05, hp: 140,
      abilities: [
        ab('sand_blast', 'Sand Spray', 'cone', 4, 0xe8c890, 2),
        ab('quicksand', 'Quicksand', 'trap', 7, 0xe8c890, 2, { count: 3, glyph: '🌀' }),
        ab('sand_hail', 'Sand Hail', 'rain', 8, 0xe8c890, 2, { count: 12, glyph: '🟤' }),
        ab('whirlwinds', 'Whirlwinds', 'summon', 11, 0xe8c890, 2, { minion: 'dust_devil', count: 3 }),
      ],
      ultimate: ult('sandstorm', 'Giant Sandstorm', 'wave',0xe8c890, 3, { color2: 0x3a1a4a }),
      taunts: [
        { key: 'sand', text: "I'll put sand in your shoes!" },
        { key: 'storm', text: 'Here comes the storm!' },
        { key: 'catch', text: "You can't catch me!" },
        { key: 'dust', text: 'Everything is dusty now!' },
        { key: 'swirl', text: 'Watch me swirl and twirl!' },
        { key: 'gone', text: 'The wind will blow you away!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'sand', text: 'Sorry about all the sand!' },
        { key: 'sweep', text: "Sorry, I'll sweep it all up." },
        { key: 'stormy', text: 'Sorry I was so stormy!' },
      ],
      ending: [
        { key: 'ride', text: 'Want a ride on my carpet?' },
        { key: 'magic', text: 'What a magic day!' },
        { key: 'dance', text: "Let's dance and twirl!" },
      ],
    },
    counter: {
      id: 'flappy_bat', name: 'Flappy Bat', glyph: '🦇', look: 'a friendly purple bat (the animal) with huge wings spread wide, flapping hard enough to blow a sandstorm straight back',
      how: 'reflect', word: 'bat',
    },
    house: {
      threat: 'she wants to fill the house with sand',
      tint: 0xe8c890,
      decals: [
        { id: 'jasmine_swirl', glyph: '🌀', look: 'little swirls of sand', count: 3 },
        { id: 'jasmine_whirlwind', glyph: '🌪️', look: 'a tiny whirlwind spinning in a corner', count: 1 },
      ],
      fx: 'smoke',
    },
  },
  {
    // Item 114 (Matt): re-themed from a desert pharaoh. He is from Antarctica
    // and has a spaceship, both sides: a booming explorer-king whose silver
    // rocket sits on an iceberg, with a penguin crew and a crown of ice.
    id: 'ozymandias',
    description: 'A booming explorer-king from Antarctica with a silver rocket ship on an iceberg, a penguin crew and a shiny crown of ice.',
    arena: 'iceberg',
    // Item 115: as the villain, a race through the stars against his rocket.
    fight: 'space_race',
    good: {
      displayName: 'Ozymandias', trail: { tint: [0xbfe8ff, 0xc0c8d8], shape: 'spark' }, look: 'a grand, jolly old explorer-king with a big bushy white beard and rosy cheeks, a shiny crown of pale-blue ice crystals, a puffy silver-and-royal-blue space suit with a fluffy white fur-trimmed royal cape, chunky silver moon boots, one arm raised in a booming hello',
      palette: [0x2a5ab4, 0xc0c8d8], glyph: '🚀', style: 'stomp', speed: 90, size: 1.3, hp: 140,
      abilities: [
        ab('snowball_volley', 'Snowball Volley', 'bolt', 2.6, 0xe8f6ff, 1, { count: 3, glyph: '❄️', words: ['zip', 'pop'] }),
        ab('penguin_crew', 'Penguin Crew', 'summon', 12, 0x2a3a5a, 2, { minion: 'penguin', count: 3, words: ['run', 'hop'] }),
        ab('moon_boot_stomp', 'Moon Boot Stomp', 'slam', 6, 0xc0c8d8, 3, { shout: true, words: ['bam', 'big'] }),
        ab('starlight_beam', 'Starlight Beam', 'beam', 6, 0xbfe8ff, 2, { words: ['zap', 'blast'] }),
      ],
      ultimate: ult('blast_off', 'Rocket Blast Off', 'rain', 0xff8a3a, 3, { count: 24, glyph: '🚀', color2: 0xbfe8ff }),
      taunts: [
        { key: 'rocket', text: 'Come and see my silver rocket!' },
        { key: 'penguins', text: 'Penguins, march!' },
        { key: 'king', text: 'I rule the whole South Pole!' },
        { key: 'countdown', text: 'Countdown time, here we go!' },
        { key: 'crown', text: 'My crown is made of ice!' },
        { key: 'chilly', text: 'Snow and ice are my favorite!' },
      ],
    },
    evil: {
      displayName: 'Evil Ozymandias', trail: { tint: [0x7ad8ff, 0x1a1a3a], shape: 'smoke' }, look: 'a towering frosty space emperor in a dark chrome space suit with a long icy-blue cape, a big frosty white beard, a jagged crown of dark blue ice, glowing pale-blue eyes, a grumpy-silly scowl',
      palette: [0x1a1a3a, 0x7ad8ff], glyph: '🛸', style: 'stomp', speed: 60, size: 1.7, hp: 200,
      abilities: [
        ab('penguin_troopers', 'Penguin Troopers', 'summon', 10, 0x2a3a5a, 3, { minion: 'penguin_trooper', count: 4 }),
        ab('snow_bots', 'Snow Bots', 'summon', 11, 0xc0c8d8, 2, { minion: 'snow_bot', count: 2 }),
        ab('meteor_hail', 'Meteor Hail', 'lightning', 7, 0x7ad8ff, 2, { count: 5, color2: 0xff8a3a }),
        ab('ice_quake', 'Ice Quake', 'slam', 6, 0x7ad8ff, 3),
      ],
      ultimate: ult('comet_crash', 'Comet Crash', 'wave', 0x7ad8ff, 3, { color2: 0x1a1a3a }),
      taunts: [
        { key: 'tremble', text: 'Look at me and tremble!' },
        { key: 'kneel', text: 'Bow to the space emperor!', say: 'Bough to the space emperor!' },
        { key: 'freeze', text: 'Everything will freeze!' },
        { key: 'troopers', text: 'Penguin troopers, attack!' },
        { key: 'launch', text: 'Ready the rocket for launch!' },
        { key: 'snowball', text: "I'll roll you up like a snowball!" },
      ],
    },
    reformed: {
      sorry: [
        { key: 'kings', text: 'Sorry, even space kings say sorry.' },
        { key: 'kind', text: "Sorry, I'm a kind explorer now." },
        { key: 'rocket', text: 'Sorry about my noisy rocket!' },
      ],
      ending: [
        { key: 'visit', text: 'Please come and ride in my rocket!' },
        { key: 'mighty', text: 'This party is out of this world!' },
        { key: 'loves', text: 'Even my penguins love a party!' },
      ],
    },
    // His penguin crew waddle off to eat, so nobody is left to launch the comet.
    counter: {
      id: 'fish_bucket', name: 'Fish Bucket', glyph: '🐟', look: 'a big shiny silver bucket heaped with fresh silver fish, a splash of icy water and a few snowflakes',
      how: 'calm', word: 'fish',
    },
    house: {
      threat: 'he wants to fly our house all the way to the South Pole in his rocket',
      tint: 0x9ad8ff,
      decals: [
        { id: 'ozymandias_penguin', glyph: '🐧', look: 'a little penguin trooper in a tiny silver space helmet, waddling about', count: 3 },
        { id: 'ozymandias_snowpile', glyph: '🧊', look: 'a frosty heap of snow and icicles with a little rocket fin poking out', count: 1 },
      ],
      fx: 'frost',
    },
  },
  {
    id: 'jormungandr',
    description: 'The world serpent, so long it coils around the whole arena, hungry enough to swallow the sun.',
    arena: 'sea',
    fight: 'sea_tug',
    good: {
      displayName: 'Jormungandr', trail: { tint: [0x7ad9ff, 0xffffff], shape: 'spark' }, sayName: 'Yormungander', look: 'a huge friendly green sea serpent with kind yellow eyes, wearing a tiny crown',
      palette: [0x2aa66a, 0x7ad9ff], glyph: '🐍', style: 'slither', speed: 150, size: 1.4, hp: 150,
      abilities: [
        ab('tidal_spit', 'Tidal Spit', 'bolt', 2.4, 0x7ad9ff, 1, { count: 3, glyph: '💧', words: ['wet'] }),
        ab('snake_pals', 'Snake Pals', 'summon', 12, 0x2aa66a, 2, { minion: 'mini_serpent', count: 3, words: ['pop', 'run'] }),
        ab('tail_spin', 'Tail Swipe', 'spin', 5, 0x2aa66a, 2, { words: ['zip', 'top'] }),
        ab('hug_coil', 'Snake Snuggle', 'coil', 12, 0x2aa66a, 2, { duration: 3, words: ['hug', 'tug'] }),
      ],
      ultimate: ult('sea_wave', 'Tidal Wave', 'wave',0x7ad9ff, 3, { color2: 0x2aa66a }),
      taunts: [
        { key: 'long', text: 'I am very, very long!' },
        { key: 'sea', text: 'The sea is my home!' },
        { key: 'hiss', text: 'Ssso fun!' },
        { key: 'round', text: 'Round and round I go!' },
        { key: 'splash', text: 'Time for a splash!' },
        { key: 'tail', text: 'Watch my tail!' },
      ],
    },
    evil: {
      displayName: 'Evil Jormungandr', trail: { tint: [0xa0ff3a, 0x3a2a5a], shape: 'spark' }, sayName: 'Evil Yormungander', look: 'a colossal black and purple world serpent with glowing red eyes, coiled around everything',
      palette: [0x1a1a3a, 0xa0ff3a], glyph: '🐍', style: 'slither', speed: 140, size: 1.8, hp: 220,
      abilities: [
        ab('crushing_coil', 'Crushing Coil', 'coil', 9, 0x3a2a5a, 3, { duration: 3 }),
        ab('venom_rain', 'Venom Rain', 'rain', 7, 0xa0ff3a, 2, { count: 14, glyph: '💧' }),
        ab('serpent_spawn', 'Snake Swarm', 'summon', 10, 0x2aa66a, 2, { minion: 'mini_serpent', count: 4 }),
      ],
      ultimate: ult('swallow_sun', 'Swallow the Sun', 'eclipse',0x1a1a3a, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'world', text: 'I wrap around the world!' },
        { key: 'hungry', text: "I'm so hungry for the sun!" },
        { key: 'squeeze', text: "I'll squeeze you tight!" },
        { key: 'dark', text: 'Soon it will be dark!' },
        { key: 'coil', text: "I'll coil all around you!" },
        { key: 'sun', text: 'I will eat the sun!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'noodle', text: 'Sorry, I was a grumpy noodle.' },
        { key: 'letgo', text: "Sorry, I'll let go of the house." },
        { key: 'squeeze', text: 'Sorry I squeezed so hard!' },
      ],
      ending: [
        { key: 'join', text: 'Can I join your next adventure?' },
        { key: 'slide', text: 'I can be a slide for you!' },
        { key: 'green', text: 'I am a happy green noodle now!' },
      ],
    },
    counter: {
      id: 'tickle_fox', name: 'Tickle Fox', glyph: '🦊', look: 'a cheeky red-orange fox with a big bushy white-tipped tail, just right for tickling a serpent\'s nose until he sneezes',
      how: 'restore', word: 'fox',
    },
    house: {
      threat: 'he wants to wrap himself around the whole house',
      tint: 0x2a5a4a,
      decals: [
        { id: 'jormungandr_tail', glyph: '🐍', look: 'a long scaly tail poking through the wall', count: 1 },
        { id: 'jormungandr_puddle', glyph: '💧', look: 'salty sea puddles', count: 3 },
      ],
      fx: 'none',
    },
  },
  {
    id: 'smaug',
    description: 'A gold-hoarding dragon who breathes fire and buries enemies under avalanches of coins.',
    arena: 'cave',
    fight: 'sky_race',
    good: {
      displayName: 'Smaug', trail: { tint: [0xffcc33, 0xff7b00], shape: 'spark' }, look: 'a big red dragon with a gold tummy, sitting on coins, grinning and generous',
      palette: [0xd62828, 0xffcc33], glyph: '🐉', style: 'fly', speed: 160, size: 1.5, hp: 160,
      abilities: [
        ab('fire_breath', 'Fire Breath', 'cone', 4, 0xff7b00, 2, { color2: 0xffd23f, words: ['hot', 'fog'] }),
        ab('coin_shower', 'Coin Shower', 'rain', 8, 0xffcc33, 2, { count: 14, glyph: '🟡', words: ['pop', 'zip'] }),
        ab('wing_slam', 'Dragon Smash', 'slam', 6, 0xd62828, 3, { words: ['bam', 'big'] }),
        ab('coin_golems', 'Coin Golems', 'summon', 13, 0xffcc33, 2, { minion: 'gold_golem', count: 2, words: ['run'] }),
      ],
      ultimate: ult('rainbow_fire', 'Rainbow Fire', 'cone',0xff5ab4, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'gold', text: 'Want some gold?' },
        { key: 'fire', text: "I'll keep you warm and toasty!" },
        { key: 'roar', text: 'Just kidding, friend!' },
        { key: 'shiny', text: 'Look how shiny my gold is!' },
        { key: 'share', text: 'Sharing is caring!' },
        { key: 'wings', text: 'Flap, flap, whoosh!' },
      ],
    },
    evil: {
      displayName: 'Evil Smaug', trail: { tint: [0xff4a00, 0xffcc33], shape: 'smoke' }, look: 'a huge greedy dragon with dark red scales and gold-crusted armour, smoke curling from his nose',
      palette: [0x5a0a0a, 0xffcc33], glyph: '🐲', style: 'fly', speed: 150, size: 1.8, hp: 220,
      abilities: [
        ab('inferno', 'Dragon Fire', 'cone', 4, 0xff4a00, 3, { color2: 0xffd23f }),
        ab('gold_golems', 'Gold Guards', 'summon', 10, 0xffcc33, 2, { minion: 'gold_golem', count: 3 }),
        ab('molten_gold', 'Melted Gold', 'beam', 7, 0xffcc33, 2, { color2: 0xff4a00 }),
        ab('hot_coals', 'Burning Coals', 'trap', 9, 0xff4a00, 2, { count: 3, glyph: '🔥' }),
        ab('tail_quake', 'Tail Smash', 'slam', 6, 0x5a0a0a, 3),
      ],
      ultimate: ult('gold_avalanche', 'Gold Avalanche', 'rain',0xffcc33, 3, { count: 40, glyph: '🟡', color2: 0xff4a00 }),
      taunts: [
        { key: 'mine', text: 'The gold is all mine!' },
        { key: 'fire', text: "I'm made of fire and gold!" },
        { key: 'thief', text: 'Who touched my gold?' },
        { key: 'burn', text: 'Feel my flames!' },
        { key: 'roar', text: "Don't touch my treasure!" },
        { key: 'greedy', text: 'More gold for me!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'treasure', text: "Sorry, let's share my treasure." },
        { key: 'gold', text: "Sorry, I don't need all the gold." },
        { key: 'greedy', text: 'Sorry I was so greedy!' },
      ],
      ending: [
        { key: 'marshmallows', text: 'I will only toast marshmallows now!' },
        { key: 'coins', text: 'I have gold coins for everybody!' },
        { key: 'warm', text: 'I will keep you nice and warm!' },
      ],
    },
    counter: {
      id: 'gold_bag', name: 'Gold Bag', glyph: '👜', look: 'a magic pink handbag with a curved handle and a clasp, wide open, that gobbles up a whole avalanche of gold',
      how: 'block', word: 'bag',
    },
    house: {
      threat: 'he wants all the money in your piggy bank',
      tint: 0xffcc33,
      decals: [
        { id: 'smaug_gold', glyph: '💰', look: 'heaps of gold coins', count: 3 },
        { id: 'smaug_flame', glyph: '🔥', look: 'a little flame flickering', count: 1 },
      ],
      fx: 'embers',
    },
  },
  {
    // Matt, 2026-10-18 (item 013): a giant purple dragon, and she is female. An
    // original design, unlike Smaug (red and gold, sleek, flying) and Seraphina's
    // little green dragons: a plump upright giant in violet and silver who barely
    // moves and fills the arena.
    id: 'tiamat',
    description: 'A giant purple dragon queen, so big she fills the arena, who barely needs to move.',
    arena: 'castle',
    good: {
      displayName: 'Tiamat', trail: { tint: [0xc77dff, 0xe0e0ff], shape: 'star' }, look: 'a giant, regal, friendly female dragon queen of original design: a huge plump pear-shaped body sitting upright like a soft purple hill, deep violet scales with a pale lilac pearly belly, a short graceful neck, a round gentle face with big kind golden eyes and long lashes, a warm closed-mouth smile, three short rounded silver horns curving back like a tiara, a small silver crown with a single violet gem, broad wings spread open behind her shoulders with lilac membranes, her little clawed hands clasped together over her belly, a thick curled tail ending in a silver heart-shaped tip, a sprinkle of silver star freckles on her cheeks. Majestic, huggable and grandmotherly-kind, not sleek',
      palette: [0x7b2cbf, 0xd8d8f0], glyph: '🐉', style: 'stomp', speed: 40, size: 2.1, hp: 230,
      abilities: [
        ab('purple_flame', 'Purple Flame', 'cone', 4, 0xb15cff, 2, { color2: 0xffc8ff, words: ['hot', 'zap'] }),
        ab('wing_gust', 'Mighty Gust', 'wave', 8, 0xd8c8ff, 2, { color2: 0xffffff, words: ['fan', 'fog'] }),
        ab('gem_rain', 'Gem Rain', 'rain', 8, 0xc77dff, 2, { count: 14, glyph: '💎', words: ['pop', 'zip'] }),
        ab('wing_hug', 'Wing Hug', 'shield', 10, 0x9b5de5, 1, { duration: 4, words: ['hug', 'big'] }),
        ab('tail_thump', 'Tail Thump', 'slam', 6, 0x7b2cbf, 3, { shout: true, words: ['bam', 'dig'] }),
      ],
      ultimate: ult('royal_starfire', 'Royal Starfire', 'cone',0xe0aaff, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'hello', text: 'Hello, little friend!' },
        { key: 'queen', text: 'The kind queen is here!' },
        { key: 'wings', text: 'Hide under my wings!' },
        { key: 'sparkle', text: 'Here come purple sparkles!' },
        { key: 'tower', text: 'I am as tall as a tower!' },
        { key: 'together', text: 'Together we are strong!' },
      ],
    },
    evil: {
      displayName: 'Evil Tiamat', trail: { tint: [0xff3ad0, 0x2a0a3a], shape: 'smoke' }, look: 'a giant tyrant dragon queen, menacing but safe for small children: the same huge upright pear-shaped dragon in dark plum and black-violet scales with glowing magenta lines between them, wings spread wide behind her like a jagged royal cloak, a tall spiky black-and-gold crown above three swept-back horns, narrowed glowing pink eyes, a haughty bossy pout with her nose in the air (no teeth showing), a spiky gold collar with a magenta gem and gold cuffs on her wrists, one clawed hand on her hip and the other pointing down as if giving orders, a thick tail with a spiky dark-purple tip, wisps of purple smoke curling from her nostrils. Grand, bossy and a bit funny, never gory or truly frightening',
      palette: [0x2a0a3a, 0xff3ad0], glyph: '👑', style: 'stomp', speed: 35, size: 2.4, hp: 270,
      abilities: [
        ab('shadow_flame', 'Shadow Flame', 'cone', 4, 0x9b1aff, 3, { color2: 0xff3ad0 }),
        ab('dragon_babies', 'Baby Dragons', 'summon', 12, 0xc77dff, 2, { minion: 'baby_dragon', count: 3 }),
        ab('crown_beam', 'Crown Beam', 'beam', 7, 0xff3ad0, 2, { color2: 0xffd23f }),
        ab('purple_thunder', 'Purple Thunder', 'lightning', 7, 0xc77dff, 2, { count: 3 }),
        ab('throne_quake', 'Throne Quake', 'slam', 6, 0x5a1a7a, 3),
      ],
      ultimate: ult('royal_storm', 'Royal Purple Storm', 'rain',0xb15cff, 3, { count: 40, glyph: '🔥', color2: 0xff3ad0 }),
      taunts: [
        // edge-tts reads a bare "Bow" as the archer's bow; "Bough" rhymes with now.
        { key: 'bow', text: 'Bow to your queen!', say: 'Bough to your queen!' },
        { key: 'castle', text: 'This house is my castle!' },
        { key: 'throne', text: 'Bring me my throne!' },
        { key: 'tiny', text: 'You are so tiny!' },
        { key: 'roar', text: 'Hear me roar!' },
        { key: 'rules', text: 'My house, my rules!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'stormy', text: 'Sorry I was so stormy!' },
        { key: 'crowns', text: "Sorry, let's all be kings and queens." },
        { key: 'bossy', text: 'Sorry I was so bossy!' },
      ],
      ending: [
        { key: 'team', text: 'Can I be on your team next time?' },
        { key: 'crown', text: 'Everybody gets a crown!' },
        { key: 'hooray', text: 'Hip hip hooray for the team!' },
      ],
    },
    counter: {
      id: 'magic_hat', name: 'Magic Hat', glyph: '🎩', look: "a magician's tall black top hat with a red band, tipped upside down with a golden swirl glowing in its open top, sucking a whole storm of grey clouds, raindrops and lightning bolts down inside it like a magic trick",
      how: 'swallow', word: 'hat',
    },
    house: {
      threat: 'she wants to rule the whole house',
      tint: 0x9b5de5,
      decals: [
        { id: 'tiamat_scale', glyph: '💜', look: 'big shiny purple dragon scales', count: 3 },
        { id: 'tiamat_banner', glyph: '🚩', look: 'a royal purple banner with a dragon crown on it', count: 1 },
      ],
      fx: 'smoke',
    },
  },
  {
    // Redesigned by items 028 and 030 (Matt): a cool, tiny robot, a little
    // shorter than Julia (size 0.9, good and evil), gold and black with a cyan
    // visor and a glowing orange core; evil is the same little mech in red and
    // black, hunched and scowling. His kit is a small, plucky mech's: blaster,
    // rocket hop and punch, a shield, and a core-blast ultimate.
    id: 'scar',
    description: 'A tiny, plucky gold robot with an arm blaster, rocket hops, a gold shield and a big core blast.',
    arena: 'factory',
    good: {
      displayName: 'Scar', trail: { tint: [0xffc233, 0x3ae0ff], shape: 'square' }, look: 'a tiny, cool little robot, shorter than a four-year-old: a chunky mini mech in shiny gold armour with black joints, a big round gold helmet with two little fins, round gold shoulder pads, a wide glowing cyan visor showing happy curved eyes, with a little scratch across one corner, a round glowing orange power core in the middle of his chest, short sturdy legs with big gold boots, his right arm a small blaster cannon and little rocket jets on his back, standing tall and proud with a brave, cheerful look',
      palette: [0xffc233, 0x3ae0ff], glyph: '🤖', style: 'dodge', speed: 210, size: 0.9, hp: 110,
      abilities: [
        ab('arm_blaster', 'Arm Blaster', 'bolt', 2.2, 0x3ae0ff, 1, { count: 3, shout: true, words: ['zap', 'pop', 'hot'] }),
        ab('rocket_hop', 'Rocket Boost', 'slam', 6, 0xff9a3c, 2, { words: ['hop', 'jet', 'bam'] }),
        ab('rocket_punch', 'Rocket Punch', 'dash', 4, 0xff6a3a, 2, { words: ['pow', 'run'] }),
        ab('gold_shield', 'Gold Shield', 'shield', 10, 0xffc233, 1, { duration: 4, words: ['big', 'fix'] }),
      ],
      ultimate: ult('core_blast', 'Core Cannon', 'beam',0xff9a3c, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'mighty', text: 'Small but mighty!' },
        { key: 'rocket', text: 'Rocket boots, go!' },
        { key: 'shields', text: 'Shields up!' },
        { key: 'core', text: 'My core is charging up!' },
        { key: 'beep', text: 'Beep boop, hello, friend!' },
        { key: 'gold', text: 'Gold robot power!' },
      ],
    },
    evil: {
      displayName: 'Evil Scar', trail: { tint: [0xff0054, 0xffcc33], shape: 'square' }, look: 'the same tiny robot gone bad, shorter than a four-year-old: a chunky mini mech in black armour with crimson trim and red joints, a big round black helmet with two little exhaust stacks, a glowing red visor narrowed into a scowl, a hot red power core pulsing in his chest, hunched forward with his blaster arm thrust out and his other fist clenched, smoke puffing from his exhausts; small but cross',
      palette: [0x2b2d42, 0xff0054], glyph: '🦾', style: 'march', speed: 150, size: 0.9, hp: 150,
      abilities: [
        ab('red_blaster', 'Red Blaster', 'bolt', 2.2, 0xff0054, 1, { count: 3 }),
        ab('rocket_stomp', 'Rocket Smash', 'slam', 6, 0xff3355, 2),
        ab('drone_swarm', 'Drone Swarm', 'summon', 10, 0x9aa6b8, 2, { minion: 'drone', count: 4 }),
        ab('spike_shield', 'Spike Shield', 'shield', 10, 0xff0054, 1, { duration: 4 }),
      ],
      ultimate: ult('core_overload', 'Robot Rampage', 'wave',0xff0054, 3, { color2: 0xffcc33 }),
      taunts: [
        { key: 'tiny', text: 'Tiny but terrible!' },
        { key: 'target', text: 'Target locked!' },
        { key: 'resist', text: "You can't win!" },
        { key: 'core', text: 'My core is full of power!' },
        { key: 'stomp', text: 'Here come my rockets!' },
        { key: 'robot', text: 'Robots rule!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'mess', text: 'Beep boop, sorry about the mess!' },
        { key: 'good', text: 'Beep, sorry, Scar is good now.' },
        { key: 'lights', text: "Sorry, I'll switch the lights back on." },
      ],
      ending: [
        { key: 'friend', text: 'My robot friend mode is switched on!' },
        { key: 'parties', text: 'Beep boop, I love parties!' },
        { key: 'dance', text: "Let's do a happy robot dance!" },
      ],
    },
    counter: {
      id: 'glitch_bug', name: 'Glitch Bug', glyph: '🐞', look: 'a cute round red ladybird with black spots that crawls inside robots and switches them off',
      how: 'shutdown', word: 'bug',
    },
    house: {
      threat: 'his robots want to switch off every light',
      tint: 0xff0054,
      decals: [
        { id: 'scar_bolt', glyph: '🔩', look: 'scattered nuts and bolts', count: 3 },
        { id: 'scar_drone', glyph: '🛸', look: 'a little red-eyed drone hovering', count: 1 },
      ],
      fx: 'sparkle',
    },
  },
  {
    id: 'moriarty',
    description: 'A trickster who makes clones of himself, teleports, and leaves card traps everywhere.',
    arena: 'city',
    // Item 115: as the villain, a magic show: the free-for-all, so his copies and traps roam.
    fight: 'magic_show',
    good: {
      displayName: 'Moriarty', trail: { tint: [0xf4a261, 0x95d5b2], shape: 'square' }, look: 'a lanky magician in a green suit and top hat, shuffling glowing cards, winking',
      palette: [0x2d6a4f, 0xf4a261], glyph: '🎩', style: 'blink', speed: 200, size: 1, hp: 100,
      abilities: [
        ab('card_throw', 'Card Throw', 'bolt', 2.0, 0xf4a261, 1, { count: 4, glyph: '🃏', words: ['zip', 'top'] }),
        ab('decoys', 'Copycats', 'clones', 10, 0x2d6a4f, 2, { count: 3, words: ['pop', 'fog'] }),
        ab('trick_trap', 'Card Trick', 'trap', 8, 0xf4a261, 2, { count: 3, words: ['net', 'web'] }),
        ab('ta_da', 'Vanishing Trick', 'teleport', 5, 0x95d5b2, 2, { words: ['hop', 'run'] }),
      ],
      ultimate: ult('grand_finale', 'Grand Finale', 'rain',0xf4a261, 3, { count: 30, glyph: '🃏', color2: 0x95d5b2 }),
      taunts: [
        { key: 'trick', text: 'Pick a card!' },
        { key: 'where', text: 'Where did I go?' },
        { key: 'magic', text: 'Want to see a magic trick?' },
        { key: 'which', text: 'Which one is me?' },
        // Was "Look in my hat!": HAT is Evil Tiamat's counter word (item 013).
        { key: 'sleeve', text: 'What is up my sleeve?' },
        { key: 'cards', text: 'I have so many cards!' },
        // Item 114: as an ally a playful puzzle-loving gentleman.
        { key: 'riddle', text: 'Here is a riddle for you!' },
        { key: 'gadget', text: 'Tick, tock, my clockwork gadgets!' },
      ],
    },
    evil: {
      displayName: 'Evil Moriarty', trail: { tint: [0x9d4edd, 0xffffff], shape: 'square' }, look: 'a sly trickster in a black coat and top hat, a grin full of secrets, cards floating around him',
      palette: [0x1b1b2f, 0x9d4edd], glyph: '🃏', style: 'blink', speed: 220, size: 1, hp: 150,
      abilities: [
        ab('clone_army', 'Clone Army', 'clones', 8, 0x9d4edd, 2, { count: 4 }),
        ab('card_traps', 'Card Traps', 'trap', 7, 0x9d4edd, 2, { count: 4 }),
        ab('vanish', 'Vanish', 'teleport', 4, 0x9d4edd, 2),
        ab('cards', 'Card Soldiers', 'summon', 11, 0xd02040, 2, { minion: 'card_soldier', count: 4 }),
      ],
      ultimate: ult('hall_of_mirrors', 'Mirror Maze', 'clones',0x9d4edd, 3, { count: 8, color2: 0x1b1b2f }),
      taunts: [
        // Item 115: silly, not scary. Was "Catch me if you can!" (CAN is a reading
        // word) and "Watch your step!" (a little ominous).
        { key: 'fooled', text: 'Fooled you! That one was a copy!', say: 'Fooled you, that one was a copy!' },
        { key: 'which', text: 'Which one is the real me?' },
        { key: 'riddle', text: 'Riddle me this, riddle me that!' },
        { key: 'clever', text: "I'm too clever for you!" },
        { key: 'puzzle', text: 'Try to solve my puzzle!' },
        { key: 'smoke', text: "Now you see me, now you don't!" },
      ],
    },
    reformed: {
      sorry: [
        { key: 'tricks', text: 'Sorry for all the tricks!' },
        { key: 'sneaky', text: 'Sorry, no more sneaky tricks.' },
        { key: 'puzzle', text: 'Sorry I was such a puzzle!' },
      ],
      ending: [
        { key: 'mystery', text: "Next time, let's solve a mystery together!" },
        { key: 'idea', text: "I have a clever idea, let's play!" },
        { key: 'best', text: 'This is the best mystery ever!' },
      ],
    },
    counter: {
      id: 'truth_map', name: 'Truth Map', glyph: '🗺️', look: 'a glowing treasure map on old parchment with a dotted path and a red X that shows where every trick is hiding',
      how: 'reveal', word: 'map',
    },
    house: {
      // Item 115: tricks and riddles, and a foggy blue-grey (was 0x9d4edd, Evil Tiamat's purple).
      threat: 'he wants to fill the whole house with silly tricks and riddles',
      tint: 0x5a6a9a,
      decals: [
        { id: 'moriarty_card', glyph: '🃏', look: 'playing cards left as traps', count: 4 },
        { id: 'moriarty_question', glyph: '❓', look: 'a floating question mark', count: 1 },
      ],
      fx: 'smoke',
    },
  },
  {
    id: 'bavmorda',
    description: 'A witch queen who summons waves of skeletons and polymorphs heroes into pigs.',
    arena: 'castle',
    fight: 'spell_clash',
    good: {
      displayName: 'Bavmorda', trail: { tint: [0xff8fab, 0x80ffdb], shape: 'star' }, look: 'a kindly old witch with a crooked hat full of flowers, a staff with a glowing pink gem',
      palette: [0x7b2cbf, 0x80ffdb], glyph: '🧹', style: 'hover', mount: '🧹', speed: 150, size: 1.15, hp: 100,
      abilities: [
        ab('flower_bolt', 'Flower Bolts', 'bolt', 2.2, 0xff8fab, 1, { count: 3, glyph: '🌸', words: ['pop', 'zip'] }),
        ab('piggy_spell', 'Piggy Spell', 'polymorph', 9, 0xff9ad5, 2, { status: 'pig', duration: 3, words: ['zap', 'pig'] }),
        ab('broom_dash', 'Broom Dash', 'dash', 5, 0x80ffdb, 2, { words: ['zip', 'jet', 'run'] }),
        ab('potion', 'Healing Potion', 'heal', 10, 0x80ffdb, 1, { words: ['hug', 'fix'] }),
      ],
      ultimate: ult('garden', 'Magic Garden', 'rain',0xff8fab, 3, { count: 30, glyph: '🌸', color2: 0x80ffdb }),
      taunts: [
        { key: 'brew', text: 'Bubble, bubble, in my cauldron!' },
        { key: 'pig', text: 'Into a piggy you go!' },
        { key: 'broom', text: 'Zoom on my broom!' },
        { key: 'magic', text: "Here's a little magic!" },
        { key: 'flowers', text: 'I have flowers for you!' },
        { key: 'ride', text: 'Hop on my broom!' },
      ],
    },
    evil: {
      displayName: 'Evil Bavmorda', trail: { tint: [0x39ff14, 0x240046], shape: 'smoke' }, look: 'a tall dark witch queen with a horned crown, a black staff with a green flame, skeletons at her feet',
      palette: [0x240046, 0x39ff14], glyph: '🧙‍♀️', style: 'hover', mount: '🧹', speed: 140, size: 1.2, hp: 190,
      abilities: [
        ab('skeleton_wave', 'Skeleton Army', 'summon', 8, 0xf2f0e6, 2, { minion: 'skeleton', count: 5 }),
        ab('pig_curse', 'Pig Curse', 'polymorph', 7, 0x39ff14, 2, { status: 'pig', duration: 3.5, callout: 'Curly Tail Curse!' }),
        ab('dark_bolts', 'Dark Bolts', 'bolt', 2.4, 0x39ff14, 2, { count: 3, homing: true }),
      ],
      ultimate: ult('all_pigs', 'Piggy Polymorph', 'polymorph',0x39ff14, 3, { status: 'pig', duration: 6, count: 6 }),
      taunts: [
        { key: 'pigs', text: 'You will all be pigs!' },
        { key: 'rise', text: 'Rise, my skeletons!' },
        { key: 'kneel', text: 'Bow down to me!', say: 'Bough down to me!' },
        { key: 'cackle', text: 'You cannot stop my magic, little hero!' },
        { key: 'cauldron', text: 'Into my cauldron you go!' },
        { key: 'piglets', text: 'Off you go, little piglets!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'piggy', text: 'Sorry, no more piggy spells, I promise!' },
        { key: 'back', text: "Sorry, I'll turn everybody back." },
        { key: 'witchy', text: 'Sorry I was so witchy!' },
      ],
      ending: [
        { key: 'potion', text: 'Can I brew you a happy potion?' },
        { key: 'soup', text: 'I made cauldron soup for everybody, and it is yummy!' },
        { key: 'dance', text: "Let's dance around the cauldron!" },
      ],
    },
    counter: {
      id: 'bounce_cap', name: 'Bounce Cap', glyph: '🧢', look: 'a shiny blue baseball cap with a curved peak that bounces any spell straight back',
      how: 'reflect', word: 'cap',
    },
    house: {
      threat: 'she wants to turn everybody into piggies',
      tint: 0x39ff14,
      decals: [
        { id: 'bavmorda_bone', glyph: '🦴', look: 'skeleton bones', count: 3 },
        { id: 'bavmorda_potion', glyph: '🧪', look: 'a bubbling green potion', count: 1 },
      ],
      fx: 'smoke',
    },
  },
  {
    id: 'rilla',
    // Item 113 (Matt): the good side is Bluerilla, Julia's plush gorilla come
    // to life, a big kind living gorilla (Matt's pick from item 110's round,
    // brief 110_bluerilla_furry). The villain stays EvilRilla, the robot, and
    // is RILLA by his bare name (`bareName`).
    description: 'Bluerilla, Julia\'s big blue plush gorilla come to life: as a friend all bananas and big furry hugs. As a villain he is EvilRilla, a gorilla robot all rocket fists and an appetite for cars.',
    arena: 'street',
    good: {
      displayName: 'Bluerilla', trail: { tint: [0xffe14a, 0x2a4aa8], shape: 'square' }, look: 'a big, gentle cartoon gorilla modelled on a plush toy, a kind, huggable giant: shaggy deep navy-blue fur all over, a large pale-blue face with a big friendly rounded muzzle and a happy smile, small dark kind eyes, a big round pale-blue chest and belly patch, very long navy arms with big pale-blue hands, and pale-blue feet, round and chunky like the toy, all soft curves, NOT a robot: no armour, no metal, no glowing eyes, waving hello with one big hand',
      palette: [0x1f3a8a, 0xa8d0ff], glyph: '🦍', style: 'stomp', speed: 110, size: 1.4, hp: 160,
      abilities: [
        ab('banana_toss', 'Banana Toss', 'bolt', 2.4, 0xffe14a, 1, { count: 3, glyph: '🍌', words: ['pop', 'top'] }),
        ab('vine_swing', 'Vine Swing', 'dash', 4, 0x3a9a4a, 2, { shout: true, words: ['jump', 'run'] }),
        ab('chest_drum', 'Gorilla Thump', 'slam', 6, 0x8a6a4a, 3, { shout: true, words: ['bam', 'big'] }),
        ab('gorilla_hug', 'Gorilla Hug', 'heal', 10, 0xffe14a, 1, { words: ['hug', 'tug'] }),
      ],
      ultimate: ult('banana_bonanza', 'Banana Bonanza', 'rain',0xffe14a, 3, { count: 32, glyph: '🍌', color2: 0x2a4aa8 }),
      taunts: [
        { key: 'hugs', text: 'Hugs for everyone!' },
        { key: 'bananas', text: 'Here come the bananas!' },
        { key: 'gentle', text: 'I am a gentle giant!' },
        { key: 'power', text: 'Gorilla power!' },
        { key: 'fluffy', text: 'Soft and fluffy, and super strong!' },
        { key: 'snack', text: 'Who wants a banana?' },
        { key: 'stomp', text: 'Watch my giant feet!' },
      ],
    },
    evil: {
      displayName: 'EvilRilla', bareName: 'Rilla', trail: { tint: [0xff3a1a, 0x3a2a1a], shape: 'smoke' }, look: 'a giant, menacing-but-silly gorilla robot with chrome and red armour plates, huge rocket fists, glowing red eyes and a bandolier of banana peels across the chest',
      palette: [0x3a2a1a, 0xff3a1a], glyph: '🤖', style: 'stomp', speed: 70, size: 1.8, hp: 230,
      abilities: [
        ab('rocket_fists', 'Rocket Fists', 'bolt', 3, 0xff3a1a, 2, { count: 2, glyph: '🚀', homing: true }),
        ab('chest_shock', 'Thunder Thump', 'slam', 6, 0xff3a1a, 3),
        ab('peel_traps', 'Banana Peels', 'trap', 8, 0xffe14a, 2, { count: 3, glyph: '🍌' }),
        ab('car_crunch', 'Car Crunch', 'dash', 7, 0x3a2a1a, 3),
      ],
      ultimate: ult('mega_chest_drum', 'Gorilla Smash', 'wave',0xff3a1a, 3, { color2: 0x3a2a1a }),
      taunts: [
        { key: 'hungry', text: 'I am so hungry!' },
        { key: 'crunch', text: 'Crunch, crunch, crunch!' },
        { key: 'peels', text: 'Watch out for banana peels!' },
        { key: 'fists', text: 'Rocket fists, go!' },
        { key: 'drum', text: 'Hear me thump and roar!' },
        { key: 'cars', text: 'Cars are yummy!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'banana', text: 'Sorry, do you want a banana?' },
        { key: 'car', text: 'Sorry, Bluerilla will not eat the car.' },
        { key: 'hungry', text: 'Sorry, so sorry, I was hungry!' },
      ],
      ending: [
        { key: 'hugs', text: 'I have gorilla hugs for everybody!' },
        { key: 'bananas', text: 'Bananas for the whole team!' },
        { key: 'happy', text: 'Bluerilla is happy now!' },
      ],
    },
    counter: {
      id: 'mice', name: 'Wind-up Mice', sayName: 'Whined-up Mice', glyph: '🐭', look: 'a tin full of clockwork toy mice that scurry and squeak',
      how: 'scare', word: 'mice',
    },
    house: {
      threat: "he's going to eat Dada Jason's car",
      tint: 0x8a6a4a,
      decals: [
        { id: 'rilla_footprint', glyph: '👣', look: 'giant gorilla footprints', count: 4 },
        { id: 'rilla_crack', glyph: '💥', look: 'a cracked window', count: 1 },
        { id: 'rilla_banana', glyph: '🍌', look: 'banana peels', count: 3 },
      ],
      fx: 'quake',
    },
  },

  // The dads' other forms (item 025). Each is a whole character with its own
  // fighting, voice lines, villain version and quest, and `person` says whose
  // form it is: the voice, the narrator lines and the wake-up are the
  // person's, so a form is drawn in place of the dad wherever he appears in an
  // episode. Builder Dada Matt and chef Dada Jason are the persons themselves.
  {
    id: 'dada_matt_lifter',
    person: 'dada_matt',
    form: 'lifter',
    description: 'A huge-hearted weightlifter dad who lifts dumbbells, teddies and the whole team.',
    arena: 'meadow',
    good: {
      displayName: 'Dada Matt', trail: { tint: [MATT.bright, 0xffd23f], shape: 'star' }, look: `${MATT_LIFTER}, in a normal deep-blue short-sleeved gym T-shirt (a rich royal-to-navy blue) with a gold star on the chest (sleeves, not a singlet or a tank top), dark gym shorts, a black lifting belt, wristbands and blue sneakers, holding one blue-and-gold dumbbell of ordinary gym size low in one hand at his side. Bright, sporty and friendly`,
      palette: [MATT.deep, 0xffd23f], glyph: '💪', style: 'twirl', speed: 190, size: 1.25, hp: 140,
      abilities: [
        ab('dumbbell_spin', 'Dumbbell Whirl', 'spin', 5, 0xffd23f, 2, { shout: true, words: ['big', 'top'] }),
        ab('dumbbell_toss', 'Dumbbell Toss', 'bolt', 2.6, 0xc8c8d8, 1, { count: 3, glyph: '💪', words: ['pow', 'hop'] }),
        ab('muscle_flex', 'Muscle Flex', 'shield', 10, MATT.bright, 1, { duration: 4, words: ['hug', 'fix'] }),
        ab('mega_squat', 'Super Squat Smash', 'slam', 7, 0xffd23f, 3, { shout: true, words: ['bam', 'tug', 'dig'] }),
      ],
      ultimate: ult('trophy_shower', 'Trophy Shower', 'rain',0xffd23f, 3, { count: 24, glyph: '🏆', color2: MATT.bright }),
      taunts: [
        { key: 'power', text: 'Feel the power!' },
        { key: 'rep', text: 'One more rep!' },
        { key: 'legs', text: 'Use your legs, not your back!' },
        { key: 'muscles', text: 'Look at these muscles!' },
        { key: 'mountain', text: "I'm as strong as a mountain!" },
        { key: 'pump', text: 'Time to pump it up!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Matt', trail: { tint: [0xb04aff, 0x2a2a3a], shape: 'square' }, look: `${MATT_LIFTER}, with a smug show-off grin, the same build and outfit in his evil palette: a normal black short-sleeved gym T-shirt with a purple lightning bolt (sleeves, not a singlet or a tank top), dark purple gym shorts, a spiky black lifting belt, purple wristbands and sneakers, holding up one black dumbbell of ordinary gym size crackling with purple sparks`,
      palette: [0x2a2a3a, 0xb04aff], glyph: '🏋️', style: 'stomp', speed: 110, size: 1.45, hp: 180,
      abilities: [
        ab('kettlebell_crash', 'Kettlebell Crash', 'dash', 7, 0xb04aff, 3),
        ab('shake_splash', 'Protein Splash', 'cone', 6, 0xc8a0ff, 2),
        ab('flex_quake', 'Mega Flex', 'slam', 6, 0xb04aff, 3),
      ],
      ultimate: ult('mega_muscle_quake', 'Monster Muscles', 'wave',0xb04aff, 3, { color2: 0x2a2a3a }),
      taunts: [
        { key: 'lift', text: 'Do you even lift?' },
        { key: 'weak', text: "You're too weak!" },
        { key: 'flex', text: 'Watch me flex!' },
        { key: 'nobody', text: 'Nobody lifts like me!' },
        { key: 'sweaty', text: 'Sweaty hugs for everybody!' },
        { key: 'reps', text: 'Give me twenty more!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'teddies', text: 'Sorry, want to lift teddies with me?' },
        { key: 'jacks', text: 'Sorry, no more jumping jacks.' },
        { key: 'rest', text: "Sorry, kiddo, let's take a rest." },
      ],
      ending: [
        { key: 'fives', text: 'No more showing off, I only want high fives now!' },
        { key: 'high', text: 'Who wants to be lifted up high?' },
        { key: 'strong', text: 'We have strong hearts, and we are strong friends!' },
      ],
    },
    counter: {
      id: 'juice_box', name: 'Juice Box', glyph: '🥤', look: 'a big cold juice box with a bendy straw: one sip and even the strongest show-off needs a nap',
      how: 'calm', word: 'box',
    },
    house: {
      threat: 'he wants everybody to do a thousand jumping jacks',
      tint: 0x7a4ab0,
      decals: [{ id: 'dada_matt_lifter_dumbbell', glyph: '🏋️', look: 'heavy purple dumbbells dropped all over the floor', count: 3 }],
      fx: 'quake',
    },
  },
  {
    id: 'dada_matt_cyber',
    person: 'dada_matt',
    form: 'cyber',
    description: 'A programmer dad turned cyber engineer (item 043): a big glowing power gauntlet that throws hologram tools, a hologram shield and goggles.',
    arena: 'factory',
    good: {
      displayName: 'Dada Matt', trail: { tint: [0x3ae0ff, 0xff4ad8], shape: 'square' }, look: `${MATT_LIFTER}, as a friendly, fun cyber engineer for a children's game: one big chunky glowing cyan power gauntlet on his right hand and forearm, projecting floating hologram tools above it (a glowing wrench, a little round shield and two tiny screens), round cyber goggles with cyan lenses pushed up on his forehead, and a dark navy work jacket with glowing magenta circuit lines. Kid-friendly and playful, not edgy. A clear, simple silhouette that still reads at small sprite size. No green anywhere.`,
      palette: [0x1a1a3a, 0x3ae0ff], glyph: '💻', style: 'hover', speed: 180, size: 1.2, hp: 120,
      abilities: [
        ab('hologram_tools', 'Hologram Tools', 'bolt', 12, 0x3ae0ff, 2, { count: 3, glyph: '🔧', homing: true, words: ['zip', 'jet'] }),
        ab('hologram_grid', 'Hologram Grid', 'grid', 8, 0xff4ad8, 2, { duration: 2, words: ['zap', 'net'] }),
        ab('gauntlet_shield', 'Gauntlet Shield', 'shield', 10, 0x3ae0ff, 1, { duration: 4, words: ['fix', 'top'] }),
        ab('gauntlet_blast', 'Gauntlet Blast', 'bolt', 2.4, 0x3ae0ff, 1, { count: 4, glyph: '🔩', homing: true, words: ['run', 'pop'] }),
      ],
      ultimate: ult('data_storm', 'Pixel Storm', 'rain',0x3ae0ff, 3, { count: 28, glyph: '💾', color2: 0xff4ad8 }),
      taunts: [
        { key: 'hacking', text: "I'm hacking in!" },
        { key: 'beep', text: 'Beep boop, got you!' },
        { key: 'tools', text: 'Hologram tools, go!' },
        { key: 'upload', text: 'Upload complete!' },
        { key: 'access', text: 'Access granted!' },
        { key: 'code', text: 'Coding mode is on!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Matt', trail: { tint: [0xff2a4a, 0x1a1a2a], shape: 'square' }, look: `${MATT_LIFTER}, with a sly glitchy grin, as a villain cyber engineer for a children's game: the same build and the same big chunky power gauntlet on his right hand and forearm, now glowing red, projecting floating red hologram tools and a jumbled red screen above it, round cyber goggles with red lenses pushed up on his forehead, and a black work jacket with glowing red circuit lines. Cheeky, not scary. A clear, simple silhouette that still reads at small sprite size. No green anywhere.`,
      palette: [0x1a1a2a, 0xff2a4a], glyph: '🖥️', style: 'blink', speed: 170, size: 1.3, hp: 160,
      abilities: [
        ab('virus_blast', 'Computer Virus', 'bolt', 2.6, 0xff2a4a, 2, { count: 3, glyph: '👾', status: 'stun', duration: 1.5 }),
        ab('glitch_jump', 'Glitch Teleport', 'teleport', 6, 0xff2a4a, 2),
        ab('red_grid', 'Laser Grid', 'grid', 8, 0xff2a4a, 3, { duration: 2 }),
        ab('glitch_tools', 'Glitch Tools', 'bolt', 12, 0xff2a4a, 2, { count: 4, glyph: '🔧', homing: true }),
      ],
      ultimate: ult('system_crash', 'Mega Glitch', 'wave',0xff2a4a, 3, { color2: 0x1a1a2a }),
      taunts: [
        { key: 'deleting', text: "I'm deleting all your fun!" },
        { key: 'error', text: 'Error, error!' },
        { key: 'glitch', text: 'Everything is glitching!' },
        { key: 'lights', text: 'I hacked the lights!' },
        { key: 'bye', text: 'Beep boop, bye bye!' },
        { key: 'over', text: 'Game over, heroes!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'cartoons', text: "Sorry, I'll only hack cartoons now." },
        { key: 'lights', text: 'Sorry, I fixed all the lights.' },
        { key: 'friendly', text: 'Beep, sorry, my system is friendly now.' },
      ],
      ending: [
        { key: 'gauntlet', text: 'Want to try my power glove?' },
        { key: 'game', text: "Let's play a video game together!" },
        { key: 'party', text: 'My party mode is switched on!' },
      ],
    },
    counter: {
      id: 'magic_pen', name: 'Magic Pen', glyph: '🖊️', look: 'a glowing magic pen that scribbles over bad code and rewrites it into a lullaby',
      how: 'shutdown', word: 'pen',
    },
    house: {
      threat: 'he hacked every light to blink and beep',
      tint: 0x2a4a8a,
      decals: [{ id: 'dada_matt_cyber_cable', glyph: '🔌', look: 'tangled cables glowing red and blinking', count: 3 }],
      fx: 'sparkle',
    },
  },
  {
    id: 'dada_matt_blade',
    person: 'dada_matt',
    form: 'blade',
    description: 'A buff spell-blade dad: a runed sword in one hand and arcane bursts of blue magic in the other.',
    arena: 'castle',
    good: {
      displayName: 'Dada Matt', trail: { tint: [MATT.bright, 0xffffff], shape: 'star' }, look: `${MATT_FACE}, as a buff spell-blade hero: sleek blue-and-silver rune armour that shows his big arms, a flowing dark-blue cape, a glowing silver sword with blue runes along the blade in one hand and a swirl of blue arcane magic in the other`,
      palette: [MATT.deep, MATT.bright], glyph: '🗡️', style: 'twirl', speed: 210, size: 1.2, hp: 130,
      abilities: [
        ab('rune_slash', 'Rune Slash', 'dash', 5, MATT.bright, 2, { shout: true, words: ['pow', 'run'] }),
        ab('arcane_burst', 'Arcane Burst', 'bolt', 2.4, MATT.bright, 1, { count: 3, glyph: '✨', homing: true, words: ['zap', 'pop'] }),
        ab('frost_rune', 'Frost Rune', 'freeze', 9, 0xbfefff, 2, { status: 'freeze', duration: 2, words: ['ice', 'fog'] }),
        ab('blade_spin', 'Spinning Blade', 'spin', 6, 0xffffff, 2, { count: 4, words: ['top', 'zip'] }),
      ],
      ultimate: ult('rune_storm', 'Rune Storm', 'lightning',MATT.bright, 3, { count: 8, color2: 0xffffff }),
      taunts: [
        { key: 'sword', text: 'Sword and spell, together!' },
        { key: 'runes', text: 'By the runes!' },
        { key: 'shine', text: 'Shine bright, my sword!' },
        { key: 'muscles', text: "I've got magic and muscles!" },
        { key: 'rune', text: 'Feel the rune power!' },
        { key: 'guard', text: 'On guard!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Matt', trail: { tint: [0x8a2aff, 0x1a0a2a], shape: 'smoke' }, look: `${MATT_FACE}, with a smug dark-lord grin, in spiky black-and-purple rune armour and a tattered purple cape, a dark sword with glowing purple runes and purple magic smoking round his other hand`,
      palette: [0x1a0a2a, 0x8a2aff], glyph: '⚔️', style: 'twirl', speed: 190, size: 1.35, hp: 170,
      abilities: [
        ab('shadow_slash', 'Shadow Slash', 'dash', 6, 0x8a2aff, 3),
        ab('hex_bolts', 'Curse Bolts', 'bolt', 2.6, 0x8a2aff, 2, { count: 4, glyph: '🔮', homing: true }),
        ab('rune_traps', 'Rune Traps', 'trap', 8, 0xb04aff, 2, { count: 3, glyph: '🔮' }),
      ],
      ultimate: ult('doom_rune', 'Dark Rune Storm', 'wave',0x8a2aff, 3, { color2: 0x1a0a2a }),
      taunts: [
        { key: 'bow', text: 'Bow to my blade!', say: 'Bough to my blade!' },
        { key: 'rise', text: 'Dark runes, rise!' },
        { key: 'best', text: 'My spells are the best!' },
        { key: 'nobody', text: 'Nobody beats my blade!' },
        { key: 'hex', text: 'Here comes a curse!' },
        { key: 'shadow', text: 'Feel my shadow magic!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'sparkle', text: 'Sorry, want to learn a sparkle spell?' },
        { key: 'toys', text: "Sorry, I'll make all the toys happy again." },
        { key: 'grumpy', text: 'Sorry, kiddo, no more grumpy spells.' },
      ],
      ending: [
        { key: 'tickle', text: 'My sword is only for tickling now!' },
        { key: 'sparkles', text: 'I made sparkles for everybody!' },
        { key: 'wish', text: "Let's make a wish together!" },
      ],
    },
    counter: {
      id: 'shiny_pot', name: 'Shiny Pot', glyph: '🍲', look: 'a huge shiny silver cooking pot, polished like a mirror, that bounces magic straight back',
      how: 'reflect', word: 'pot',
    },
    house: {
      threat: 'he wants to put a grumpy spell on every toy',
      tint: 0x4a2a8a,
      decals: [{ id: 'dada_matt_blade_rune', glyph: '🔮', look: 'glowing purple runes scorched on the floor', count: 3 }],
      fx: 'sparkle',
    },
  },
  {
    id: 'dada_jason_warrior',
    person: 'dada_jason',
    form: 'warrior',
    description: 'A bold fantasy warrior dad in shining armour, with a round shield, a big friendly axe and the loudest battle cry in the land.',
    arena: 'castle',
    good: {
      displayName: 'Dada Jason', trail: { tint: [JASON.bright, 0xffd23f], shape: 'spark' }, look: `${JASON_FACE}, as a fantasy warrior: shining silver armour with gold trim and a deep forest-green tunic showing under it (a dark, rich pine green, not lime or bright grass green), a forest-green cape, a round silver shield with a golden sun on it on one arm and a big friendly double-headed battle axe with a forest-green wrapped handle in the other hand. Bright, heroic and friendly`,
      palette: [JASON.deep, 0xc8c8d8], glyph: '🛡️', style: 'twirl', speed: 190, size: 1.25, hp: 140,
      abilities: [
        ab('axe_spin', 'Spinning Axe', 'spin', 5, 0xc8c8d8, 2, { shout: true, words: ['top', 'zip'] }),
        ab('shield_bash', 'Shield Bash', 'dash', 6, JASON.bright, 2, { shout: true, words: ['ram', 'run'] }),
        ab('battle_cry', 'Battle Cry', 'shield', 10, 0xffd23f, 1, { duration: 4, words: ['big', 'hug'] }),
        ab('sword_leap', 'Sword Leap', 'slam', 7, 0xffd23f, 3, { shout: true, words: ['bam', 'hop', 'pow'] }),
      ],
      ultimate: ult('sword_rain', 'Sword Rain', 'rain',0xc8c8d8, 3, { count: 24, glyph: '⚔️', color2: 0xffd23f }),
      taunts: [
        { key: 'kingdom', text: 'For the kingdom!' },
        { key: 'shields', text: 'Shields up!' },
        { key: 'charge', text: 'Charge!' },
        { key: 'line', text: 'Hold the line!' },
        { key: 'bold', text: 'Be brave and bold!' },
        { key: 'quits', text: 'A warrior never quits!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Jason', trail: { tint: [0xff3a1a, 0x2a1a1a], shape: 'smoke' }, look: `${JASON_FACE}, with a cheeky open-mouthed villain grin, in spiky black armour with red trim, a horned crown helmet and a tattered red cape, a spiked black round shield and a huge jagged battle axe`,
      palette: [0x2a1a1a, 0xff3a1a], glyph: '🪓', style: 'stomp', speed: 120, size: 1.45, hp: 180,
      abilities: [
        ab('axe_throw', 'Axe Throw', 'bolt', 3, 0xff3a1a, 2, { count: 2, glyph: '⚔️', homing: true }),
        ab('shield_slam', 'Shield Smash', 'slam', 6, 0xff3a1a, 3),
        ab('whirlwind', 'Whirlwind', 'spin', 6, 0x8a8a9a, 2, { count: 4 }),
      ],
      ultimate: ult('war_cry', 'Mega War Cry', 'wave',0xff3a1a, 3, { color2: 0x2a1a1a }),
      taunts: [
        { key: 'kneel', text: 'Kneel before me!' },
        { key: 'axe', text: 'My axe is hungry!' },
        { key: 'charge', text: 'Charge, charge, charge!' },
        { key: 'past', text: 'Nobody gets past me!' },
        { key: 'never', text: 'I never give up!' },
        { key: 'cry', text: 'Hear my war cry!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'knight', text: 'Sorry, let me be your brave knight!' },
        { key: 'snacks', text: 'Sorry, the snacks are back!' },
        { key: 'axe', text: 'Sorry, kiddo, I put my axe away.' },
      ],
      ending: [
        { key: 'battles', text: 'No more battles, I only want hugs now!' },
        { key: 'cheers', text: 'Three cheers for the heroes!' },
        { key: 'feast', text: 'A feast for the whole castle!' },
      ],
    },
    counter: {
      id: 'slippy_mop', name: 'Slippy Mop', glyph: '💦', look: 'a soapy magic mop that makes the floor so slippery a big charging warrior slides right past',
      how: 'block', word: 'mop',
    },
    house: {
      threat: 'he wants to turn the house into a castle with no snacks',
      tint: 0x8a3a2a,
      decals: [{ id: 'dada_jason_warrior_shield', glyph: '🛡️', look: 'dented black shields and a broken axe handle', count: 2 }],
      fx: 'quake',
    },
  },
  {
    id: 'dada_jason_warlock',
    person: 'dada_jason',
    form: 'warlock',
    description: 'A dark-robed warlock dad with purple fire, silly curses and a gang of cheeky summoned imps: spooky on the outside, a big softie inside.',
    arena: 'city',
    fight: 'spell_clash',
    good: {
      displayName: 'Dada Jason', trail: { tint: [JASON.bright, 0xffb84a], shape: 'smoke' }, look: `${JASON_FACE}, as a friendly warlock: long deep forest-green robes (a dark, rich pine green, not lime or bright grass green) with golden stars, a pointed hood pushed back, a tall wooden staff topped with a glowing golden-amber crystal, little warm golden flames dancing round his free hand, and a tiny cheeky purple imp on his shoulder. Bright, magical and friendly`,
      palette: [JASON.deep, 0xffb84a], glyph: '🔮', style: 'blink', speed: 170, size: 1.2, hp: 120,
      abilities: [
        ab('imp_party', 'Imp Party', 'summon', 12, 0xb04aff, 2, { minion: 'imp', count: 3, words: ['pop', 'hop'] }),
        ab('purple_fire', 'Purple Fire', 'cone', 6, 0xb04aff, 2, { color2: 0xff9ad5, words: ['hot', 'fog'] }),
        ab('piggy_hex', 'Oink Spell', 'polymorph', 10, 0xff9ad5, 2, { status: 'pig', duration: 3, words: ['pig', 'mud'] }),
        ab('shadow_bolt', 'Shadow Bolt', 'bolt', 2.4, 0xb04aff, 1, { count: 3, glyph: '🔮', homing: true, words: ['zap', 'zip'] }),
      ],
      ultimate: ult('meteor_rain', 'Purple Meteor Rain', 'rain',0xb04aff, 3, { count: 24, glyph: '☄️', color2: 0xff9ad5 }),
      taunts: [
        { key: 'abracadabra', text: 'Abracadabra, purple fire!' },
        { key: 'imps', text: 'My imps are ready!' },
        { key: 'spell', text: 'I have a spell for you!' },
        { key: 'hocus', text: 'Hocus pocus!' },
        { key: 'purple', text: 'Purple power!' },
        { key: 'go', text: 'Little imps, go!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Jason', trail: { tint: [0x8a2aff, 0x0a0a1a], shape: 'smoke' }, look: `${JASON_FACE}, with a sly twirly villain moustache and a wicked grin, in black-and-violet robes with a spiky collar and a deep hood, a crooked staff crackling with violet fire, and two grinning purple imps`,
      palette: [0x0a0a1a, 0x8a2aff], glyph: '🕯️', style: 'blink', speed: 170, size: 1.3, hp: 160,
      abilities: [
        ab('curse_cloud', 'Curse Cloud', 'cone', 6, 0x8a2aff, 2),
        ab('hex_trap', 'Sneaky Curse', 'trap', 8, 0xb04aff, 2, { count: 3, glyph: '🔮' }),
        ab('imp_swarm', 'Imp Swarm', 'summon', 12, 0x8a2aff, 2, { minion: 'imp', count: 4 }),
      ],
      ultimate: ult('big_purple_doom', 'Lights Out', 'eclipse',0x2a0a4a, 3, { color2: 0xb04aff }),
      taunts: [
        { key: 'curses', text: 'Curses on you!' },
        { key: 'imps', text: 'My imps will catch you!' },
        { key: 'trouble', text: 'Bubble, bubble, purple trouble!' },
        { key: 'hex', text: 'Everybody gets a curse!' },
        { key: 'gotcha', text: 'Abracadabra, gotcha!' },
        { key: 'darkness', text: 'Let the darkness come!' },
      ],
    },
    reformed: {
      sorry: [
        { key: 'trick', text: 'Sorry, want to see a sparkly trick?' },
        { key: 'toads', text: 'Sorry, no more toads, I promise.' },
        { key: 'curses', text: "Sorry, kiddo, I'll undo my curses." },
      ],
      ending: [
        { key: 'happy', text: 'From now on, only happy spells!' },
        { key: 'giggles', text: 'I have sparkles and giggles for everybody!' },
        { key: 'magic', text: 'I have happy magic for everybody!' },
      ],
    },
    counter: {
      id: 'sunshine_bus', name: 'Sunshine Bus', glyph: '🚌', look: 'a bright yellow bus with headlights so sunny that every purple shadow melts away',
      how: 'reveal', word: 'bus',
    },
    house: {
      // Not a frog: FROG is a reading word since item 037.
      threat: 'he wants to turn everybody into a little purple toad',
      tint: 0x4a1a7a,
      decals: [{ id: 'dada_jason_warlock_flame', glyph: '🔥', look: 'a cheeky purple flame with a grinning face, little flames flickering round it', count: 3 }],
      fx: 'embers',
    },
  },
];

export const CHARACTER_BY_ID: Record<string, CharacterSpec> = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

/** The villain's bare name, once known (item 038): `evil.bareName` where set, else the good side's name. */
export function villainName(c: CharacterSpec): { displayName: string; sayName?: string } {
  return c.evil.bareName ? { displayName: c.evil.bareName } : c.good;
}

/** Whose form `id` is: the person for a form (`dada_matt_lifter` → `dada_matt`), else `id` itself. */
export function personOf(id: string): string {
  return CHARACTER_BY_ID[id]?.person ?? id;
}

/** The persons: every roster character that is not a form of another. Voices, narrators and pick screens are per person. */
export const PERSONS: CharacterSpec[] = ROSTER.filter((c) => !c.person);

/** Every form of a person, the person's own (default) form first: `dada_matt`, then `dada_matt_lifter`... */
export function formsOf(person: string): CharacterSpec[] {
  return ROSTER.filter((c) => c.id === person || c.person === person);
}

/** The roster id of `person`'s form named `form` (`dada_matt`, `lifter` → `dada_matt_lifter`), or undefined. */
export function formId(person: string, form: string): string | undefined {
  return formsOf(person).find((c) => c.form === form)?.id;
}

/** Team combos: when both are on the hero side, every so often they fire this together. */
export const COMBOS: ComboSpec[] = [
  { pair: ['elsa', 'anna'], ability: ab('sister_storm', 'Sister Storm', 'spin', 16, 0xaee6ff, 3, { count: 5, color2: 0xe63946 }) },
  { pair: ['seraphina', 'smaug'], ability: ab('dragon_duet', 'Dragon Duet', 'cone', 16, 0xff7b00, 3, { color2: 0x6ad66a }) },
  // Item 114: Ozymandias is from Antarctica now, so his duo is with Elsa, not Jasmine.
  { pair: ['elsa', 'ozymandias'], ability: ab('polar_duo', 'Polar Duo', 'wave', 16, 0xaee6ff, 3, { color2: 0xc0c8d8 }) },
  { pair: ['dada_matt', 'dada_jason'], ability: ab('dad_squad', 'Dad Squad', 'slam', 16, MATT.bright, 3, { color2: JASON.bright }) },
  { pair: ['julia', 'dada_matt'], ability: ab('high_five', 'Mega High Five', 'lightning', 16, 0xffd23f, 3, { count: 6, color2: MATT.bright }) },
  // Item 028: the active cast's allies each have one with her. Dada Jason
  // charges in with her on his back, whatever his form.
  { pair: ['julia', 'dada_jason'], ability: ab('piggyback_charge', 'Piggyback Charge', 'dash', 16, 0xffd23f, 3, { color2: JASON.bright }) },
  // Scar's rockets carry her stars up, and they all come down together.
  { pair: ['julia', 'scar'], ability: ab('star_rocket_rain', 'Star Rocket Rain', 'rain', 16, 0xffc233, 3, { count: 26, glyph: '🚀', color2: 0xffd23f }) },
  // Ellie rings them both in giant bubbles; Julia's stars fly out through the
  // ring, then the bubbles follow them in.
  {
    pair: ['julia', 'ellie'],
    ability: ab('star_bubble_spin', 'Star Bubble Spin', 'bolt', 16, 0xffd23f, 3, { count: 4, glyph: '⭐', homing: true, color2: 0x9ad8ff }),
    second: ab('star_bubble_ring', 'Star Bubble Spin', 'orbit', 16, 0x9ad8ff, 3, { count: 8, art: 'fx_bubble', upright: true, duration: 1.4, color2: 0xff9ad5 }),
  },
  { pair: ['seraphina', 'tiamat'], ability: ab('dragon_queen_ride', 'Dragon Queen Ride', 'dash', 16, 0xc77dff, 3, { color2: 0x6ad66a }) },
  { pair: ['julia', 'seraphina'], ability: ab('best_friends', 'Best Friend Blast', 'beam', 16, 0xff5ab4, 3, { color2: 0x2ec27e }) },
  // Item 111: the new allies each have one with her too. Elsa rings them in
  // snowflakes while Julia's stars fly out through the ring.
  {
    pair: ['julia', 'elsa'],
    ability: ab('frosty_star_swirl', 'Frosty Star Swirl', 'bolt', 16, 0xffd23f, 3, { count: 4, glyph: '⭐', homing: true, color2: 0xaee6ff }),
    second: ab('frosty_star_ring', 'Frosty Star Swirl', 'rain', 16, 0xe8f6ff, 3, { count: 22, glyph: '❄️', color2: 0x7cc7ff }),
  },
  // Anna lifts her up on her shield and they charge together.
  { pair: ['julia', 'anna'], ability: ab('brave_buddy_charge', 'Brave Buddy Charge', 'dash', 16, 0xffb703, 3, { shout: true, color2: 0xe63946 }) },
  // Julia hops on the flying carpet: a sweep of wind full of stars and jewels.
  { pair: ['julia', 'jasmine'], ability: ab('carpet_star_sweep', 'Carpet Star Sweep', 'wave', 16, 0xffc857, 3, { color2: 0xff5ab4 }) },
  // Item 114: the second wave. Julia and Ozymandias blast off in his rocket,
  // and down comes a shower of stars and snowflakes from space.
  {
    pair: ['julia', 'ozymandias'],
    ability: ab('rocket_launch', 'Rocket Launch', 'dash', 16, 0xffd23f, 3, { shout: true, color2: 0xc0c8d8 }),
    second: ab('rocket_launch_rain', 'Rocket Launch', 'rain', 16, 0xbfe8ff, 3, { count: 24, glyph: '⭐', color2: 0xffd23f }),
  },
  // Julia's stars fly out of Moriarty's puzzle box, and his copycats pop up to join in.
  {
    pair: ['julia', 'moriarty'],
    ability: ab('puzzle_box_stars', 'Puzzle Box Surprise', 'bolt', 16, 0xffd23f, 3, { count: 5, glyph: '⭐', homing: true, color2: 0xf4a261 }),
    second: ab('puzzle_box_copycats', 'Puzzle Box Surprise', 'clones', 16, 0xf4a261, 3, { count: 4, color2: 0x95d5b2 }),
  },
  // Julia rides on Bluerilla's shoulders and they land in one giant happy stomp.
  { pair: ['julia', 'rilla'], ability: ab('shoulder_ride_stomp', 'Shoulder Ride Stomp', 'slam', 16, 0x2a4aa8, 3, { shout: true, color2: 0xffd23f }) },
];

/** Any two heroes without a written combo still team up with this. */
export const DEFAULT_COMBO = ab('team_blast', 'Team Star Blast', 'beam', 18, 0xffd23f, 3, { color2: 0xff5ab4 });

/** A combo is written for persons, so every form of a dad keeps his (Julia and any Dada Matt high-five). */
function comboSpec(a: string, b: string): ComboSpec | undefined {
  const pa = personOf(a);
  const pb = personOf(b);
  return COMBOS.find((c) => (c.pair[0] === pa && c.pair[1] === pb) || (c.pair[0] === pb && c.pair[1] === pa));
}

export function comboFor(a: string, b: string): AbilitySpec {
  return comboSpec(a, b)?.ability ?? DEFAULT_COMBO;
}

/** What `who` fires in its combo with `partner`: the combo's `second` half if `who` is second of the pair. */
export function comboPart(who: string, partner: string): AbilitySpec {
  const c = comboSpec(who, partner);
  if (!c) return DEFAULT_COMBO;
  return c.second && c.pair[1] === personOf(who) ? c.second : c.ability;
}

/** Arenas: id → colours and a glyph strip for the placeholder painter, plus a look for art prompts. */
export const ARENAS: Record<string, { name: string; sky: [number, number]; ground: number; glyph: string; look: string }> = {
  meadow: { name: 'Sunny Meadow', sky: [0x8ad7ff, 0xe8f8ff], ground: 0x6ac46a, glyph: '🌼', look: 'a bright flower meadow with rolling hills' },
  volcano: { name: 'Dragon Volcano', sky: [0x3a0a1a, 0xff7b3a], ground: 0x4a2a2a, glyph: '🌋', look: 'a smoking volcano with lava rivers and dragon nests' },
  kitchen: { name: 'Giant Kitchen', sky: [0xfff1d6, 0xffd6a5], ground: 0xc8a07a, glyph: '🍳', look: 'a cartoon kitchen seen from a toy\'s height, giant pans and spoons' },
  castle: { name: 'Castle Courtyard', sky: [0x5a6aa0, 0xc8d0ff], ground: 0x8a8a9a, glyph: '🏰', look: 'a stone castle courtyard with banners and torches' },
  ice: { name: 'Crystal Ice Palace', sky: [0x9ad8ff, 0xf0faff], ground: 0xd8f0ff, glyph: '🏔️', look: 'an ice palace of glittering crystal spires and snow' },
  desert: { name: 'Golden Dunes', sky: [0xffb15a, 0xffe8b0], ground: 0xe8c890, glyph: '🐪', look: 'golden sand dunes with half-buried statues and a pyramid' },
  // Item 114: Ozymandias's, from Antarctica with a spaceship.
  iceberg: { name: 'Iceberg Launch Pad', sky: [0x0a1a4a, 0x5a8ad8], ground: 0xe8f6ff, glyph: '🚀', look: 'a wide flat snowy iceberg in a dark-blue polar sea at twilight, a starry sky with a soft pink-and-violet aurora, a tall silver rocket ship on a launch pad far off to one side, little ice cliffs and distant icebergs' },
  sea: { name: 'Serpent Sea', sky: [0x2a5aa0, 0x9ad8ff], ground: 0x2a7ab4, glyph: '🌊', look: 'a stormy sea with rocky islands and huge waves' },
  cave: { name: 'Treasure Cave', sky: [0x1a1a2a, 0x5a4a2a], ground: 0x8a6a2a, glyph: '💰', look: 'a cave piled high with gold coins and jewels, lit by lava cracks' },
  factory: { name: 'Robot Factory', sky: [0x2a2d42, 0x6a7a9a], ground: 0x4a4a5a, glyph: '⚙️', look: 'a neon robot factory with conveyor belts and sparks' },
  city: { name: 'Foggy City', sky: [0x3a4a5a, 0xa0b0c0], ground: 0x5a5a6a, glyph: '🎡', look: 'a foggy old city street at night with lamp posts and a fairground' },
  nursery: { name: 'Giant Playroom', sky: [0xffe0f0, 0xfff8e0], ground: 0xc8a07a, glyph: '🧸', look: "a toddler's playroom seen from a toy's height: towering stacks of building blocks, a huge crib, giant soft toys and a squashy play mat" },
  street: { name: 'Sunny Street', sky: [0x8ad7ff, 0xf0f8ff], ground: 0x8a8a92, glyph: '🚗', look: 'a sunny suburban street outside the house, Dada Jason\'s car parked at the kerb' },
  // Fight styles' own places (item 031, content/battle/fights.ts).
  sky_race: { name: 'Treasure Cave Sky Race', sky: [0x1a1a2a, 0x8a6a2a], ground: 0x6a4a1a, glyph: '🏁', look: 'a huge treasure cave seen side-on as a sky-race course: a wide open flying space in the middle, glittering gold coin piles and jewels along the floor, stalactites hanging from the top, glowing lava cracks, coloured lanterns strung across' },
  spell_tower: { name: 'Moonlit Spell Tower', sky: [0x1a0a3a, 0x5a3a8a], ground: 0x4a3a5a, glyph: '🌙', look: "the flat round top of a witch's stone tower at night: a big full moon, purple clouds, swirling stars, glowing rune stones around the edge of a wide flat stone floor" },
  cook_show: { name: 'Cook-Off Studio', sky: [0xfff1d6, 0xff9ad5], ground: 0xd8b088, glyph: '🍳', look: "a bright cartoon TV cooking-contest studio: coloured spotlights, bunting, a big shiny kitchen wall with shelves of pots, fruit and spices behind a wide wooden floor, an empty judges' table at the back" },
};
