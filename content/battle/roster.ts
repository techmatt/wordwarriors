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
 * `counter.words` stays for the parked Spell the Spell game.
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
 * Move words (`word`) must come from MOVE_WORDS: each has a "Use zap!" line per
 * narrator. Taunts are short, because a bubble over a moving fighter has to be
 * readable at a glance, and they never name the word she must read.
 */

import type { AbilitySpec, CharacterSpec, ComboSpec, MinionSpec } from './types.js';

/** The words a move-choice pause can offer. Short and decodable where possible. */
export const MOVE_WORDS = ['zap', 'pow', 'bam', 'zip', 'hop', 'pop', 'sun', 'hug', 'fan', 'big', 'hot', 'ice'] as const;

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

export const MINIONS: Record<string, MinionSpec> = {
  baby_dragon: {
    id: 'baby_dragon', name: 'Baby Dragon', glyph: '🐲', look: 'a chubby baby dragon with tiny wings, friendly',
    palette: [0x6ad66a, 0xfff07a], style: 'fly', speed: 150, size: 0.55, hp: 30,
    ability: ab('puff', 'Puff', 'bolt', 2.2, 0xff9a3c, 1, { glyph: '🔥' }),
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
  colossus: {
    id: 'colossus', name: 'Colossus', glyph: '🗿', look: 'a towering sandstone statue of a pharaoh, cracked, slow',
    palette: [0xd9b26f, 0x7a5a2a], style: 'stomp', speed: 25, size: 1.2, hp: 70,
    ability: ab('statue_stomp', 'Stomp', 'slam', 3.5, 0xd9b26f, 2),
  },
  scarab: {
    id: 'scarab', name: 'Scarab', glyph: '🐞', look: 'a shiny blue-green scarab beetle',
    palette: [0x2ac7a0, 0x184a5a], style: 'march', speed: 120, size: 0.4, hp: 12,
    ability: ab('nip', 'Nip', 'dash', 1.8, 0x2ac7a0, 1),
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
        ab('star_zap', 'Star Zap', 'bolt', 2.5, 0xffd23f, 1, { count: 3, glyph: '⭐', word: 'zap', shout: true }),
        ab('giggle_bubble', 'Giggle Bubble', 'shield', 9, 0xff9ad5, 1, { duration: 4, word: 'pop' }),
        ab('bounce_stomp', 'Bounce Stomp', 'slam', 6, 0x9b5de5, 2, { word: 'hop', shout: true }),
        ab('teddy_army', 'Teddy Army', 'summon', 14, 0xc8884a, 2, { minion: 'teddy', count: 3, word: 'hug' }),
      ],
      ultimate: ab('super_nova', 'Super Star Nova', 'rain', 0, 0xffd23f, 3, { count: 30, glyph: '🌟', color2: 0xff5ab4 }),
      taunts: [
        { key: 'here', text: 'Here I come!' },
        { key: 'wand', text: 'My wand is sparkly!' },
        { key: 'brave', text: 'I am super brave!' },
        { key: 'boop', text: 'Got you!' },
        { key: 'giggle', text: 'You can not catch me!' },
        { key: 'team', text: 'We are a super team!' },
      ],
    },
    evil: {
      displayName: 'Evil Julia', trail: { tint: [0xff3355, 0x3a1a5a], shape: 'square' }, look: "Julia's mischievous dark mirror: the same slim four-year-old girl with long straight pale-blonde hair and a straight fringe, round glasses with dark magenta frames, a sly cheeky smirk, in a black-and-dark-purple version of her twirl dress with a little black cape, holding a cracked dark star wand",
      palette: [0x3a1a5a, 0xff3355], glyph: '💢', style: 'dodge', speed: 210, size: 1, hp: 140,
      abilities: [
        ab('grump_zap', 'Grump Zap', 'bolt', 2.5, 0xff3355, 1, { count: 3, glyph: '💢' }),
        ab('stomp_stomp', 'Stompy Feet', 'slam', 5, 0x5a2a7a, 2),
        ab('no_nap', 'No Nap Ever', 'lightning', 7, 0xb04aff, 2, { count: 3 }),
      ],
      ultimate: ab('tantrum_quake', 'Tantrum Quake', 'wave', 0, 0xff3355, 3, { color2: 0x3a1a5a }),
      taunts: [
        { key: 'no', text: 'No, no, no!' },
        { key: 'mine', text: 'All the toys are mine!' },
        { key: 'bedtime', text: 'I never go to sleep!' },
        { key: 'grr', text: 'Grumpy time!' },
        { key: 'nap', text: 'Naps are for babies!' },
        { key: 'cookies', text: 'I ate all the cookies!' },
      ],
    },
    counter: {
      id: 'cozy_bed', name: 'Cozy Bed', glyph: '🛏️', look: 'a child\'s bed with a puffy blue duvet and a white pillow, glowing softly, a sleepy moon and stars above it',
      how: 'calm', words: ['bed', 'hug', 'nap'], word: 'bed',
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
        // BIG first: it is the spell Ellie teaches Julia in the hub (spellFor
        // takes the first word Julia has not got; she already has POP and HOP).
        ab('giant_bubbles', 'Giant Bubbles', 'bolt', 2.4, 0x9ad8ff, 1, { count: 4, art: 'fx_bubble', upright: true, homing: true, color2: 0xff9ad5, word: 'big' }),
        ab('bubble_trap', 'Bubble Trap', 'bolt', 7, 0xff9ad5, 2, { count: 2, art: 'fx_bubble', upright: true, homing: true, status: 'bubble', duration: 2.5, color2: 0x9ad8ff, word: 'pop' }),
        ab('bubble_shield', 'Bubble Shield', 'shield', 10, 0x9ad8ff, 1, { duration: 4 }),
        ab('peekaboo', 'Peekaboo', 'teleport', 6, 0xffd23f, 2, { word: 'hop' }),
        // Her one sword move (item 014's swords): a ring round her, then flung.
        ab('spinny_swords', 'Spinny Swords', 'orbit', 7, 0xcfe8ff, 2, { count: 5, art: 'prop_silver_sword', duration: 1.6, color2: 0xff9ad5, word: 'zip', shout: true }),
      ],
      ultimate: ab('bubble_storm', 'Mega Bubble Storm', 'rain', 0, 0x9ad8ff, 3, { count: 30, art: 'fx_bubble', upright: true, color2: 0xff9ad5 }),
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
        ab('raspberry', 'Raspberry Blast', 'cone', 5, 0xff3a7a, 2),
        ab('toy_toss', 'Toy Toss', 'bolt', 2.4, 0xc8884a, 1, { count: 4, glyph: '🧸' }),
        ab('tantrum_shockwave', 'Tantrum Shockwave', 'slam', 6, 0xb04aff, 3),
      ],
      ultimate: ab('juice_tsunami', 'Juice Tsunami', 'wave', 0, 0x7ad9ff, 3, { color2: 0x3a1a5a }),
      taunts: [
        { key: 'mine', text: 'Everything is mine!' },
        { key: 'share', text: 'I will not share!' },
        { key: 'snacks', text: 'More snacks, now!' },
        { key: 'scribble', text: 'I scribble everywhere!' },
        { key: 'fast', text: 'Too fast for you!' },
        { key: 'raspberry', text: 'A raspberry for you!' },
      ],
    },
    counter: {
      id: 'bubble_bath', name: 'Bubble Tub', glyph: '🛁', look: 'a magic bathtub overflowing with rainbow bubbles, a little yellow rubber duck on top',
      how: 'calm', words: ['wet', 'dip', 'tub'], word: 'tub',
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
    description: 'A little girl who keeps dragons: she calls them, rides them and talks to them.',
    arena: 'volcano',
    good: {
      displayName: 'Seraphina', trail: { tint: [0x6ad66a, 0xff7b3a], shape: 'spark' }, look: 'a little girl with wild red hair in a green tunic, a tiny dragon on her shoulder',
      palette: [0x2ec27e, 0xff7b3a], glyph: '🐉', style: 'hover', speed: 170, size: 1, hp: 100,
      abilities: [
        ab('dragon_call', 'Dragon Call', 'summon', 12, 0x6ad66a, 2, { minion: 'baby_dragon', count: 2, word: 'pop' }),
        ab('ember_flick', 'Ember Flick', 'bolt', 2.2, 0xff7b3a, 1, { count: 2, glyph: '🔥', word: 'hot' }),
        ab('wing_gust', 'Wing Gust', 'cone', 5, 0xbaffc9, 2, { word: 'fan' }),
        ab('scale_shield', 'Scale Shield', 'shield', 10, 0x2ec27e, 1, { duration: 4 }),
      ],
      ultimate: ab('dragon_parade', 'Dragon Parade', 'summon', 0, 0xff7b3a, 3, { minion: 'baby_dragon', count: 6 }),
      taunts: [
        { key: 'dragons', text: 'Dragons, to me!' },
        { key: 'roar', text: 'My dragons say hello!' },
        { key: 'fly', text: 'Up we fly!' },
        { key: 'friends', text: 'Dragons are my friends!' },
        { key: 'wings', text: 'Spread your wings!' },
        { key: 'hot', text: 'Careful, they are hot!' },
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
      ultimate: ab('dragon_swarm', 'Dragon Swarm', 'rain', 0, 0xff4a1a, 3, { count: 26, glyph: '🐉', color2: 0x2a5a3a }),
      taunts: [
        { key: 'mine', text: 'All dragons obey me!' },
        { key: 'hungry', text: 'My dragons are hungry!' },
        { key: 'burn', text: 'Toasty time!' },
        { key: 'swarm', text: 'Swarm them, dragons!' },
        { key: 'shadow', text: 'From the shadows, dragons!' },
        { key: 'scaly', text: 'Scaly and scary!' },
      ],
    },
    counter: {
      id: 'golden_nut', name: 'Golden Nut', glyph: '🥜', look: 'a giant shiny golden hazelnut in its shell, the snack every dragon loves best',
      how: 'calm', words: ['cup', 'bun', 'yum'], word: 'nut',
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
    description: 'A big-hearted builder dad with a giant hammer who builds walls and towers in a blink.',
    arena: 'castle',
    good: {
      displayName: 'Dada Matt', trail: { tint: [0xc8643a, 0xff8c42], shape: 'square' }, look: 'a tall, beefy, broad-shouldered bodybuilder dad: fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile, in chunky orange-and-steel builder armour with a tool belt, holding a huge friendly hammer',
      palette: [0xff8c42, 0x4a4a5a], glyph: '🔨', style: 'twirl', speed: 200, size: 1.2, hp: 130,
      abilities: [
        ab('hammer_spin', 'Hammer Spin', 'spin', 5, 0xff8c42, 2, { word: 'pow', shout: true }),
        ab('brick_wall', 'Brick Wall', 'shield', 10, 0xc8643a, 1, { duration: 4, word: 'big' }),
        ab('nail_storm', 'Nail Storm', 'bolt', 2.6, 0xc8c8d8, 1, { count: 5, glyph: '🔩' }),
        ab('ground_pound', 'Ground Pound', 'slam', 7, 0xff8c42, 3, { word: 'bam', shout: true }),
      ],
      ultimate: ab('tower_drop', 'Tower Drop', 'rain', 0, 0xc8643a, 3, { count: 20, glyph: '🧱', color2: 0xff8c42 }),
      taunts: [
        { key: 'build', text: 'Let me build that!' },
        { key: 'strong', text: 'Strong like a castle!' },
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
        ab('wreck', 'Wrecking Spin', 'spin', 5, 0xb04aff, 2),
        ab('brick_rain', 'Brick Rain', 'rain', 7, 0xc8643a, 2, { count: 12, glyph: '🧱' }),
        ab('quake', 'Quake', 'slam', 6, 0xb04aff, 3),
      ],
      ultimate: ab('mega_hammer', 'Mega Hammer Quake', 'wave', 0, 0xb04aff, 3, { color2: 0x2a2a3a }),
      taunts: [
        { key: 'smash', text: 'Smash it all!' },
        { key: 'mess', text: 'What a big mess!' },
        { key: 'wall', text: 'No more walls for you!' },
        { key: 'boom', text: 'Boom goes the hammer!' },
        { key: 'crumble', text: 'Watch it crumble!' },
        { key: 'stomp', text: 'Stomp, stomp, stomp!' },
      ],
    },
    counter: {
      id: 'giant_log', name: 'Giant Log', glyph: '🌲', look: 'a huge cut wooden log lying down, rings showing on the end, so solid that any hammer just bonks off it',
      how: 'block', words: ['bed', 'box', 'pad'], word: 'log',
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
    description: 'A jolly chef dad with a giant whisk who flips pancakes higher than the roof.',
    arena: 'kitchen',
    good: {
      displayName: 'Dada Jason', trail: { tint: [0xffbe0b, 0xe63946], shape: 'star' }, look: 'a big, sturdy, round-faced chef dad: warm light-brown skin, very short dark curly hair receding at the front, black browline glasses, a short dark goatee beard flecked with grey, a tiny hoop earring, a big laughing smile, in crisp white chef\'s whites with a tall white chef\'s hat and a red neckerchief, holding a giant whisk',
      palette: [0xe63946, 0xffbe0b], glyph: '🍳', style: 'hover', speed: 170, size: 1.2, hp: 120,
      abilities: [
        ab('pancake_flip', 'Pancake Flip', 'bolt', 2.4, 0xffbe0b, 1, { count: 3, glyph: '🥞', word: 'pop' }),
        ab('whisk_whirl', 'Whisk Whirl', 'spin', 5, 0xfff1d6, 2, { word: 'zip', shout: true }),
        ab('sauce_tornado', 'Sauce Tornado', 'cone', 6, 0xe63946, 2, { word: 'hot' }),
        ab('oven_mitt', 'Oven Mitt Shield', 'shield', 10, 0xff8c42, 1, { duration: 4, word: 'hug' }),
      ],
      ultimate: ab('breakfast_storm', 'Breakfast Storm', 'rain', 0, 0xffbe0b, 3, { count: 30, glyph: '🥞', color2: 0xff6a3a }),
      taunts: [
        { key: 'order', text: 'Order up!' },
        { key: 'pancake', text: 'Pancakes for everyone!' },
        { key: 'chef', text: 'Chef power, go!' },
        { key: 'whisk', text: 'Whisk it, whisk it!' },
        { key: 'sauce', text: 'A little more sauce!' },
        { key: 'flip', text: 'Flip, flip, hooray!' },
      ],
    },
    evil: {
      displayName: 'Evil Dada Jason', trail: { tint: [0xc8ff3a, 0x2a1a3a], shape: 'smoke' }, look: 'a mischievous villain chef: the same big round-faced dad with warm light-brown skin, very short dark curly hair, black browline glasses and a short dark goatee, plus a twirly villain moustache and a sly grin, in a black chef\'s jacket and a floppy dark-purple chef\'s hat, waving a giant dripping spatula',
      palette: [0x2a1a3a, 0xc8ff3a], glyph: '🥦', style: 'blink', speed: 180, size: 1.2, hp: 150,
      abilities: [
        ab('broccoli', 'Broccoli Barrage', 'bolt', 2.6, 0x4aa62a, 1, { count: 4, glyph: '🥦' }),
        ab('hot_sauce', 'Hot Sauce Blast', 'beam', 6, 0xff3a1a, 2),
        ab('sticky_syrup', 'Sticky Syrup', 'trap', 8, 0xc8781a, 2, { count: 3, glyph: '🍯' }),
      ],
      ultimate: ab('food_fight', 'Food Fight Frenzy', 'rain', 0, 0xc8ff3a, 3, { count: 28, glyph: '🍝', color2: 0x2a1a3a }),
      taunts: [
        { key: 'veggies', text: 'Eat your veggies!' },
        { key: 'broccoli', text: 'Broccoli for breakfast!' },
        { key: 'soup', text: 'Soup of the day is slime!' },
        { key: 'table', text: 'Nobody leaves the table!' },
        { key: 'sprouts', text: 'Extra sprouts for you!' },
        { key: 'fight', text: 'Food fight!' },
      ],
    },
    counter: {
      id: 'cleanup_van', name: 'Clean-Up Van', glyph: '🚐', look: 'a little cartoon cleaning van with spinning brushes and a big hose that hoovers up every bit of food',
      how: 'restore', words: ['wet', 'rub', 'van'], word: 'van',
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
    good: {
      displayName: 'Elsa', trail: { tint: [0xe8f6ff, 0x7cc7ff], shape: 'star' }, look: 'a cheerful winter queen of original design: rosy cheeks and freckles, long pale silver hair, a flowing white-and-gold gown embroidered with golden snowflakes, a little golden crown and a fluffy white fur-trimmed cape, conjuring golden-white sparkles',
      palette: [0x7cc7ff, 0xe8f6ff], glyph: '❄️', style: 'hover', speed: 160, size: 1, hp: 100,
      abilities: [
        ab('ice_shard', 'Ice Shards', 'bolt', 2.2, 0xaee6ff, 1, { count: 4, glyph: '❄️', word: 'ice' }),
        ab('deep_freeze', 'Deep Freeze', 'freeze', 8, 0x7cc7ff, 2, { status: 'freeze', duration: 3, word: 'zip' }),
        ab('snow_buddies', 'Snow Buddies', 'summon', 12, 0xe8f6ff, 2, { minion: 'snow_golem', count: 2, word: 'big' }),
        ab('crystal_spire', 'Crystal Spire', 'slam', 6, 0xaee6ff, 2),
      ],
      ultimate: ab('blizzard', 'Blizzard Crown', 'rain', 0, 0xe8f6ff, 3, { count: 34, glyph: '❄️', color2: 0x7cc7ff }),
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
      ultimate: ab('eternal_winter', 'Eternal Winter', 'wave', 0, 0xbff0ff, 3, { color2: 0x1a2a5a, status: 'freeze' }),
      taunts: [
        { key: 'winter', text: 'Winter forever!' },
        { key: 'chill', text: 'Chill out!' },
        { key: 'cold', text: 'So very cold!' },
        { key: 'ice', text: 'Everything turns to ice!' },
        { key: 'frozen', text: 'You are frozen solid!' },
        { key: 'icicles', text: 'Icicles everywhere!' },
      ],
    },
    counter: {
      id: 'cocoa_cup', name: 'Cocoa Cup', glyph: '☕', look: 'a big red mug of steaming cocoa with a handle, so warm it melts any winter',
      how: 'restore', words: ['sun', 'hat', 'hot'], word: 'cup',
    },
    house: {
      threat: 'she wants to freeze the whole house',
      tint: 0x9ad8ff,
      decals: [{ id: 'elsa_icicle', glyph: '❄️', look: 'icicles and frost patches', count: 4 }],
      fx: 'frost',
    },
  },
  {
    id: 'anna',
    description: 'The ice sorceress\'s brave little sister: a sword-and-shield adventurer who never gives up.',
    arena: 'ice',
    // Split look (Matt's picks, item 011): good Anna and her face card are the
    // item 009 redesign (dark ponytail, plum and magenta); Evil Anna's art is
    // still the old copper-curls design, so her look describes that image.
    good: {
      displayName: 'Anna', trail: { tint: [0xffb703, 0xe63946], shape: 'spark' }, look: 'a tall, sporty young adventurer of original design with long straight dark-brown hair in one high swinging ponytail tied with a big purple ribbon, a few freckles, a plum-purple tunic with a short magenta cape, white leggings and tall brown boots, a round wooden shield with a golden sun painted on it and a wooden practice sword',
      palette: [0xe63946, 0x2a9d8f], glyph: '🛡️', style: 'twirl', speed: 230, size: 1, hp: 110,
      abilities: [
        ab('shield_bash', 'Shield Bash', 'dash', 4, 0xe63946, 2, { word: 'bam', shout: true }),
        ab('sword_twirl', 'Sword Twirl', 'spin', 5, 0xffd6a5, 2, { word: 'pow', shout: true }),
        ab('brave_shout', 'Brave Shout', 'heal', 10, 0xffb703, 1, { word: 'hug' }),
        ab('leap', 'Big Leap', 'slam', 6, 0x2a9d8f, 2, { word: 'hop' }),
      ],
      ultimate: ab('never_give_up', 'Never Give Up', 'spin', 0, 0xffb703, 3, { count: 6, color2: 0xe63946 }),
      taunts: [
        { key: 'brave', text: 'I am not scared!' },
        { key: 'charge', text: 'Charge!' },
        { key: 'sister', text: 'Sisters forever!' },
        { key: 'again', text: 'Again! Again!' },
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
      ultimate: ab('frozen_charge', 'Frozen Heart Charge', 'dash', 0, 0x9aeaff, 3, { count: 4, color2: 0x3a1a2a }),
      taunts: [
        { key: 'cold', text: 'My heart is ice!' },
        { key: 'alone', text: 'I fight alone!' },
        { key: 'charge', text: 'Out of my way!' },
        { key: 'sword', text: 'Try and stop me!' },
        { key: 'frost', text: 'Feel the frost!' },
        { key: 'blizzard', text: 'Out of my blizzard!' },
      ],
    },
    counter: {
      id: 'cuddly_cat', name: 'Cuddly Cat', glyph: '🐱', look: 'a warm, fluffy orange tabby cat with a curled tail, purring, who cuddles the frost away',
      how: 'calm', words: ['hug', 'pet', 'pal'], word: 'cat',
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
        ab('wind_fan', 'Wind Fan', 'cone', 4, 0xbaf2ff, 2, { word: 'fan' }),
        ab('carpet_swoop', 'Carpet Swoop', 'dash', 5, 0xffc857, 2, { word: 'zip' }),
        ab('dust_devils', 'Dust Devils', 'summon', 12, 0xe8c890, 2, { minion: 'dust_devil', count: 3, word: 'pop' }),
        ab('star_jewels', 'Star Jewels', 'bolt', 2.4, 0xff5ab4, 1, { count: 3, glyph: '💎' }),
      ],
      ultimate: ab('jewel_storm', 'Jewel Storm', 'rain', 0, 0xff5ab4, 3, { count: 30, glyph: '💎', color2: 0x1fb5a8 }),
      taunts: [
        { key: 'fly', text: 'Hop on my carpet!' },
        { key: 'wind', text: 'Feel the wind!' },
        { key: 'whoosh', text: 'Too fast for you!' },
        { key: 'jewels', text: 'Sparkle time!' },
        { key: 'stars', text: 'Fly to the stars!' },
        { key: 'sand', text: 'The sand is my friend!' },
      ],
    },
    evil: {
      displayName: 'Evil Jasmine', trail: { tint: [0xe8c890, 0x5a3a6a], shape: 'smoke' }, look: 'the same curly-haired desert princess in dark plum and black robes with a dented gold circlet, sitting on a carpet of black smoke, a little sandstorm swirling behind her',
      palette: [0x3a1a4a, 0xe8c890], glyph: '🌪️', style: 'fly', mount: 'carpet', speed: 230, size: 1.05, hp: 140,
      abilities: [
        ab('sand_blast', 'Sand Blast', 'cone', 4, 0xe8c890, 2),
        ab('quicksand', 'Quicksand Traps', 'trap', 7, 0xe8c890, 2, { count: 3, glyph: '🌀' }),
        ab('sand_hail', 'Sand Hail', 'rain', 8, 0xe8c890, 2, { count: 12, glyph: '🟤' }),
        ab('whirlwinds', 'Whirlwinds', 'summon', 11, 0xe8c890, 2, { minion: 'dust_devil', count: 3 }),
      ],
      ultimate: ab('sandstorm', 'Great Sandstorm', 'wave', 0, 0xe8c890, 3, { color2: 0x3a1a4a }),
      taunts: [
        { key: 'sand', text: 'Sand in your shoes!' },
        { key: 'storm', text: 'Here comes the storm!' },
        { key: 'catch', text: 'You can not catch me!' },
        { key: 'dust', text: 'Dusty, dusty!' },
        { key: 'swirl', text: 'Swirl and twirl!' },
        { key: 'gone', text: 'Gone with the wind!' },
      ],
    },
    counter: {
      id: 'flappy_bat', name: 'Flappy Bat', glyph: '🦇', look: 'a friendly purple bat (the animal) with huge wings spread wide, flapping hard enough to blow a sandstorm straight back',
      how: 'reflect', words: ['map', 'zip', 'fan'], word: 'bat',
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
    id: 'ozymandias',
    description: 'A sand-pharaoh who raises colossal statues of himself from the dunes.',
    arena: 'desert',
    good: {
      displayName: 'Ozymandias', trail: { tint: [0xe8c890, 0xffd23f], shape: 'square' }, look: 'a friendly old pharaoh with a golden mask pushed up on his head, a staff of sand',
      palette: [0xd9a441, 0x2a5ab4], glyph: '🏺', style: 'stomp', speed: 90, size: 1.3, hp: 140,
      abilities: [
        ab('sand_spear', 'Sand Spears', 'bolt', 2.6, 0xe8c890, 1, { count: 3, glyph: '🏺' }),
        ab('statue_friend', 'Statue Friend', 'summon', 13, 0xd9b26f, 2, { minion: 'colossus', count: 1, word: 'big' }),
        ab('dune_slam', 'Dune Slam', 'slam', 6, 0xd9a441, 3, { word: 'bam' }),
        ab('sun_disc', 'Sun Disc', 'beam', 6, 0xffd23f, 2, { word: 'sun' }),
      ],
      ultimate: ab('pyramid', 'Pyramid Power', 'lightning', 0, 0xffd23f, 3, { count: 8, color2: 0xd9a441 }),
      taunts: [
        { key: 'look', text: 'Look upon my statues!' },
        { key: 'sand', text: 'Rise, sand!' },
        { key: 'king', text: 'King of the desert!' },
        { key: 'old', text: 'I am very, very old!' },
        { key: 'pyramid', text: 'Bigger than a pyramid!' },
        { key: 'dust', text: 'Dust to dust!' },
      ],
    },
    evil: {
      displayName: 'Evil Ozymandias', trail: { tint: [0xd9b26f, 0x4a3a1a], shape: 'smoke' }, look: 'a towering pharaoh of cracked black sandstone with glowing gold eyes',
      palette: [0x4a3a1a, 0xffcc33], glyph: '🗿', style: 'stomp', speed: 60, size: 1.7, hp: 200,
      abilities: [
        ab('colossi', 'Rise, Colossi', 'summon', 11, 0xd9b26f, 3, { minion: 'colossus', count: 2 }),
        ab('scarab_swarm', 'Scarab Swarm', 'summon', 9, 0x2ac7a0, 2, { minion: 'scarab', count: 5 }),
        ab('sand_quake', 'Sand Quake', 'slam', 6, 0xd9b26f, 3),
      ],
      ultimate: ab('colossus_march', 'March of the Colossi', 'wave', 0, 0xd9b26f, 3, { color2: 0x4a3a1a }),
      taunts: [
        { key: 'despair', text: 'Look at me, and tremble!' },
        { key: 'kneel', text: 'Bow to the pharaoh!' },
        { key: 'statues', text: 'My statues are huge!' },
        { key: 'sand', text: 'Sand forever!' },
        { key: 'mighty', text: 'Behold my mighty works!' },
        { key: 'crush', text: 'I crush like sand!' },
      ],
    },
    counter: {
      id: 'brave_rat', name: 'Brave Rat', glyph: '🐀', look: 'a brave little grey rat with a long pink tail and a tiny red cape, leading a squeaking pack of his friends; giant statues are terrified of rats',
      how: 'scare', words: ['cup', 'tub', 'wet'], word: 'rat',
    },
    house: {
      threat: 'he wants a giant statue of himself in the garden',
      tint: 0xd9b26f,
      decals: [
        { id: 'ozymandias_statue', glyph: '🗿', look: 'a stone head poking out of the floor', count: 1 },
        { id: 'ozymandias_scarab', glyph: '🐞', look: 'shiny scarab beetles', count: 3 },
      ],
      fx: 'quake',
    },
  },
  {
    id: 'jormungandr',
    description: 'The world serpent, so long it coils around the whole arena, hungry enough to swallow the sun.',
    arena: 'sea',
    good: {
      displayName: 'Jormungandr', trail: { tint: [0x7ad9ff, 0xffffff], shape: 'spark' }, sayName: 'Yormungander', look: 'a huge friendly green sea serpent with kind yellow eyes, wearing a tiny crown',
      palette: [0x2aa66a, 0x7ad9ff], glyph: '🐍', style: 'slither', speed: 150, size: 1.4, hp: 150,
      abilities: [
        ab('tidal_spit', 'Tidal Spit', 'bolt', 2.4, 0x7ad9ff, 1, { count: 3, glyph: '💧' }),
        ab('snake_pals', 'Snake Pals', 'summon', 12, 0x2aa66a, 2, { minion: 'mini_serpent', count: 3, word: 'pop' }),
        ab('tail_spin', 'Tail Spin', 'spin', 5, 0x2aa66a, 2, { word: 'zip' }),
        ab('hug_coil', 'Big Hug', 'coil', 12, 0x2aa66a, 2, { duration: 3, word: 'hug' }),
      ],
      ultimate: ab('sea_wave', 'World Wave', 'wave', 0, 0x7ad9ff, 3, { color2: 0x2aa66a }),
      taunts: [
        { key: 'long', text: 'I am very, very long!' },
        { key: 'sea', text: 'The sea is my home!' },
        { key: 'hiss', text: 'Ssso fun!' },
        { key: 'round', text: 'Round and round I go!' },
        { key: 'splash', text: 'Splash time!' },
        { key: 'tail', text: 'Watch my tail!' },
      ],
    },
    evil: {
      displayName: 'Evil Jormungandr', trail: { tint: [0xa0ff3a, 0x3a2a5a], shape: 'spark' }, sayName: 'Evil Yormungander', look: 'a colossal black and purple world serpent with glowing red eyes, coiled around everything',
      palette: [0x1a1a3a, 0xa0ff3a], glyph: '🐍', style: 'slither', speed: 140, size: 1.8, hp: 220,
      abilities: [
        ab('crushing_coil', 'Crushing Coil', 'coil', 9, 0x3a2a5a, 3, { duration: 3 }),
        ab('venom_rain', 'Venom Rain', 'rain', 7, 0xa0ff3a, 2, { count: 14, glyph: '💧' }),
        ab('serpent_spawn', 'Serpent Spawn', 'summon', 10, 0x2aa66a, 2, { minion: 'mini_serpent', count: 4 }),
      ],
      ultimate: ab('swallow_sun', 'Swallow the Sun', 'eclipse', 0, 0x1a1a3a, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'world', text: 'I wrap around the world!' },
        { key: 'hungry', text: 'So hungry for the sun!' },
        { key: 'squeeze', text: 'Squeeze, squeeze!' },
        { key: 'dark', text: 'Soon it will be dark!' },
        { key: 'coil', text: 'Coil, coil, coil!' },
        { key: 'sun', text: 'I will eat the sun!' },
      ],
    },
    counter: {
      id: 'tickle_fox', name: 'Tickle Fox', glyph: '🦊', look: 'a cheeky red-orange fox with a big bushy white-tipped tail, just right for tickling a serpent\'s nose until he sneezes',
      how: 'restore', words: ['sun', 'pot', 'lit'], word: 'fox',
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
    good: {
      displayName: 'Smaug', trail: { tint: [0xffcc33, 0xff7b00], shape: 'spark' }, look: 'a big red dragon with a gold tummy, sitting on coins, grinning and generous',
      palette: [0xd62828, 0xffcc33], glyph: '🐉', style: 'fly', speed: 160, size: 1.5, hp: 160,
      abilities: [
        ab('fire_breath', 'Fire Breath', 'cone', 4, 0xff7b00, 2, { color2: 0xffd23f, word: 'hot' }),
        ab('coin_shower', 'Coin Shower', 'rain', 8, 0xffcc33, 2, { count: 14, glyph: '🟡', word: 'pop' }),
        ab('wing_slam', 'Wing Slam', 'slam', 6, 0xd62828, 3, { word: 'bam' }),
        ab('coin_golems', 'Coin Golems', 'summon', 13, 0xffcc33, 2, { minion: 'gold_golem', count: 2 }),
      ],
      ultimate: ab('rainbow_fire', 'Rainbow Fire', 'cone', 0, 0xff5ab4, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'gold', text: 'Want some gold?' },
        { key: 'fire', text: 'Warm and toasty!' },
        { key: 'roar', text: 'Just kidding, friend!' },
        { key: 'shiny', text: 'So shiny!' },
        { key: 'share', text: 'Sharing is caring!' },
        { key: 'wings', text: 'Flap, flap, whoosh!' },
      ],
    },
    evil: {
      displayName: 'Evil Smaug', trail: { tint: [0xff4a00, 0xffcc33], shape: 'smoke' }, look: 'a huge greedy dragon with dark red scales and gold-crusted armour, smoke curling from his nose',
      palette: [0x5a0a0a, 0xffcc33], glyph: '🐲', style: 'fly', speed: 150, size: 1.8, hp: 220,
      abilities: [
        ab('inferno', 'Inferno Breath', 'cone', 4, 0xff4a00, 3, { color2: 0xffd23f }),
        ab('gold_golems', 'Gold Guards', 'summon', 10, 0xffcc33, 2, { minion: 'gold_golem', count: 3 }),
        ab('molten_gold', 'Molten Gold Beam', 'beam', 7, 0xffcc33, 2, { color2: 0xff4a00 }),
        ab('hot_coals', 'Hot Coals', 'trap', 9, 0xff4a00, 2, { count: 3, glyph: '🔥' }),
        ab('tail_quake', 'Tail Quake', 'slam', 6, 0x5a0a0a, 3),
      ],
      ultimate: ab('gold_avalanche', 'Gold Avalanche', 'rain', 0, 0xffcc33, 3, { count: 40, glyph: '🟡', color2: 0xff4a00 }),
      taunts: [
        { key: 'mine', text: 'My gold! All mine!' },
        { key: 'fire', text: 'I am fire and gold!' },
        { key: 'thief', text: 'Who touched my gold?' },
        { key: 'burn', text: 'Feel my flames!' },
        { key: 'roar', text: 'My treasure!' },
        { key: 'greedy', text: 'More gold for me!' },
      ],
    },
    counter: {
      id: 'gold_bag', name: 'Gold Bag', glyph: '👜', look: 'a magic pink handbag with a curved handle and a clasp, wide open, that gobbles up a whole avalanche of gold',
      how: 'block', words: ['cup', 'net', 'fog'], word: 'bag',
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
        ab('purple_flame', 'Purple Flame', 'cone', 4, 0xb15cff, 2, { color2: 0xffc8ff, word: 'hot' }),
        ab('wing_gust', 'Wing Gust', 'wave', 8, 0xd8c8ff, 2, { color2: 0xffffff, word: 'fan' }),
        ab('gem_rain', 'Gem Rain', 'rain', 8, 0xc77dff, 2, { count: 14, glyph: '💎', word: 'pop' }),
        ab('wing_hug', 'Wing Hug', 'shield', 10, 0x9b5de5, 1, { duration: 4, word: 'hug' }),
        ab('tail_thump', 'Tail Thump', 'slam', 6, 0x7b2cbf, 3, { word: 'bam', shout: true }),
      ],
      ultimate: ab('royal_starfire', 'Royal Starfire', 'cone', 0, 0xe0aaff, 3, { color2: 0xffd23f }),
      taunts: [
        { key: 'hello', text: 'Hello, little friend!' },
        { key: 'queen', text: 'The kind queen is here!' },
        { key: 'wings', text: 'Hide under my wings!' },
        { key: 'sparkle', text: 'Purple sparkles!' },
        { key: 'tower', text: 'I am as tall as a tower!' },
        { key: 'together', text: 'Together we are strong!' },
      ],
    },
    evil: {
      displayName: 'Evil Tiamat', trail: { tint: [0xff3ad0, 0x2a0a3a], shape: 'smoke' }, look: 'a giant tyrant dragon queen, menacing but safe for small children: the same huge upright pear-shaped dragon in dark plum and black-violet scales with glowing magenta lines between them, wings spread wide behind her like a jagged royal cloak, a tall spiky black-and-gold crown above three swept-back horns, narrowed glowing pink eyes, a haughty bossy pout with her nose in the air (no teeth showing), a spiky gold collar with a magenta gem and gold cuffs on her wrists, one clawed hand on her hip and the other pointing down as if giving orders, a thick tail with a spiky dark-purple tip, wisps of purple smoke curling from her nostrils. Grand, bossy and a bit funny, never gory or truly frightening',
      palette: [0x2a0a3a, 0xff3ad0], glyph: '👑', style: 'stomp', speed: 35, size: 2.4, hp: 270,
      abilities: [
        ab('shadow_flame', 'Shadow Flame', 'cone', 4, 0x9b1aff, 3, { color2: 0xff3ad0 }),
        ab('dragon_babies', 'Dragon Babies', 'summon', 12, 0xc77dff, 2, { minion: 'baby_dragon', count: 3 }),
        ab('crown_beam', 'Crown Beam', 'beam', 7, 0xff3ad0, 2, { color2: 0xffd23f }),
        ab('purple_thunder', 'Purple Thunder', 'lightning', 7, 0xc77dff, 2, { count: 3 }),
        ab('throne_quake', 'Throne Quake', 'slam', 6, 0x5a1a7a, 3),
      ],
      ultimate: ab('royal_storm', 'Royal Purple Storm', 'rain', 0, 0xb15cff, 3, { count: 40, glyph: '🔥', color2: 0xff3ad0 }),
      taunts: [
        { key: 'bow', text: 'Bow to your queen!' },
        { key: 'castle', text: 'This house is my castle!' },
        { key: 'throne', text: 'Bring me my throne!' },
        { key: 'tiny', text: 'You are so tiny!' },
        { key: 'roar', text: 'Hear me roar!' },
        { key: 'rules', text: 'My rules, my house!' },
      ],
    },
    counter: {
      id: 'magic_hat', name: 'Magic Hat', glyph: '🎩', look: "a magician's tall black top hat with a red band, tipped upside down with a golden swirl glowing in its open top, sucking a whole storm of grey clouds, raindrops and lightning bolts down inside it like a magic trick",
      how: 'swallow', words: ['top', 'tip', 'hat'], word: 'hat',
    },
    house: {
      threat: 'she wants to be the queen of the whole house',
      tint: 0x9b5de5,
      decals: [
        { id: 'tiamat_scale', glyph: '💜', look: 'big shiny purple dragon scales', count: 3 },
        { id: 'tiamat_banner', glyph: '🚩', look: 'a royal purple banner with a dragon crown on it', count: 1 },
      ],
      fx: 'smoke',
    },
  },
  {
    id: 'scar',
    description: 'A robot with a laser grid, rocket fists, and a transformation into a giant battle mech.',
    arena: 'factory',
    good: {
      displayName: 'Scar', trail: { tint: [0x00f5d4, 0xffffff], shape: 'square' }, look: 'a friendly chunky robot with one scratched eye plate, big rocket fists and a smile screen',
      palette: [0x8d99ae, 0x00f5d4], glyph: '🤖', style: 'march', speed: 140, size: 1.2, hp: 140,
      abilities: [
        ab('rocket_fist', 'Rocket Fist', 'bolt', 3, 0xff6a3a, 2, { glyph: '🚀', homing: true, word: 'pow' }),
        ab('drone_pals', 'Drone Pals', 'summon', 12, 0x9aa6b8, 2, { minion: 'drone', count: 3, word: 'zip' }),
        ab('laser_eye', 'Laser Eye', 'beam', 5, 0x00f5d4, 2, { word: 'zap' }),
        ab('mega_mode', 'Mega Mode', 'grow', 14, 0x00f5d4, 2, { duration: 5, word: 'big' }),
      ],
      ultimate: ab('confetti_cannon', 'Confetti Cannon', 'rain', 0, 0x00f5d4, 3, { count: 34, glyph: '🎉', color2: 0xff5ab4 }),
      taunts: [
        { key: 'beep', text: 'Hello, friend!' },
        { key: 'rocket', text: 'Rocket fist, go!' },
        { key: 'scan', text: 'Scanning for fun!' },
        { key: 'power', text: 'Power level max!' },
        { key: 'boop', text: 'Robot hug, friend!' },
        { key: 'battery', text: 'Battery full!' },
      ],
    },
    evil: {
      displayName: 'Evil Scar', trail: { tint: [0xff0054, 0xffcc33], shape: 'square' }, look: 'a menacing black robot with a scarred red eye, rocket fists, and armour plates that unfold into a giant mech',
      palette: [0x2b2d42, 0xff0054], glyph: '🦾', style: 'march', speed: 120, size: 1.4, hp: 210,
      abilities: [
        ab('rocket_fists', 'Rocket Fists', 'bolt', 3, 0xff0054, 2, { count: 2, glyph: '🚀', homing: true }),
        ab('drone_swarm', 'Drone Swarm', 'summon', 10, 0x9aa6b8, 2, { minion: 'drone', count: 4 }),
        ab('transform', 'Transform', 'grow', 12, 0xff0054, 3, { duration: 6 }),
      ],
      ultimate: ab('laser_grid', 'Laser Grid', 'grid', 0, 0xff0054, 3, { color2: 0xffcc33 }),
      taunts: [
        { key: 'target', text: 'Target found!' },
        { key: 'resist', text: 'You can not win!' },
        { key: 'transform', text: 'Transform! Bigger!' },
        { key: 'lasers', text: 'Lasers, on!' },
        { key: 'compute', text: 'Computing your defeat!' },
        { key: 'robot', text: 'Robots rule!' },
      ],
    },
    counter: {
      id: 'glitch_bug', name: 'Glitch Bug', glyph: '🐞', look: 'a cute round red ladybird with black spots that crawls inside robots and switches them off',
      how: 'shutdown', words: ['box', 'pen', 'off'], word: 'bug',
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
    good: {
      displayName: 'Moriarty', trail: { tint: [0xf4a261, 0x95d5b2], shape: 'square' }, look: 'a lanky magician in a green suit and top hat, shuffling glowing cards, winking',
      palette: [0x2d6a4f, 0xf4a261], glyph: '🎩', style: 'blink', speed: 200, size: 1, hp: 100,
      abilities: [
        ab('card_throw', 'Card Throw', 'bolt', 2.0, 0xf4a261, 1, { count: 4, glyph: '🃏', word: 'zip' }),
        ab('decoys', 'Decoys', 'clones', 10, 0x2d6a4f, 2, { count: 3, word: 'pop' }),
        ab('trick_trap', 'Trick Trap', 'trap', 8, 0xf4a261, 2, { count: 3 }),
        ab('ta_da', 'Ta-da Blink', 'teleport', 5, 0x95d5b2, 2, { word: 'hop' }),
      ],
      ultimate: ab('grand_finale', 'Grand Finale', 'rain', 0, 0xf4a261, 3, { count: 30, glyph: '🃏', color2: 0x95d5b2 }),
      taunts: [
        { key: 'trick', text: 'Pick a card!' },
        { key: 'where', text: 'Where did I go?' },
        { key: 'magic', text: 'Magic trick!' },
        { key: 'which', text: 'Which one is me?' },
        // Was "Look in my hat!": HAT is Evil Tiamat's counter word (item 013).
        { key: 'sleeve', text: 'What is up my sleeve?' },
        { key: 'cards', text: 'So many cards!' },
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
      ultimate: ab('hall_of_mirrors', 'Hall of Clones', 'clones', 0, 0x9d4edd, 3, { count: 8, color2: 0x1b1b2f }),
      taunts: [
        { key: 'catch', text: 'Catch me if you can!' },
        { key: 'which', text: 'Which one is the real me?' },
        { key: 'trap', text: 'Watch your step!' },
        { key: 'clever', text: 'I am too clever!' },
        { key: 'puzzle', text: 'Solve my puzzle!' },
        { key: 'smoke', text: 'Now you see me!' },
      ],
    },
    counter: {
      id: 'truth_map', name: 'Truth Map', glyph: '🗺️', look: 'a glowing treasure map on old parchment with a dotted path and a red X that shows where every trick is hiding',
      how: 'reveal', words: ['map', 'pen', 'nab'], word: 'map',
    },
    house: {
      threat: 'he wants to play tricks in every room',
      tint: 0x9d4edd,
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
    good: {
      displayName: 'Bavmorda', trail: { tint: [0xff8fab, 0x80ffdb], shape: 'star' }, look: 'a kindly old witch with a crooked hat full of flowers, a staff with a glowing pink gem',
      palette: [0x7b2cbf, 0x80ffdb], glyph: '🧹', style: 'hover', mount: '🧹', speed: 150, size: 1, hp: 100,
      abilities: [
        ab('flower_bolt', 'Flower Bolts', 'bolt', 2.2, 0xff8fab, 1, { count: 3, glyph: '🌸', word: 'pop' }),
        ab('piggy_spell', 'Piggy Spell', 'polymorph', 9, 0xff9ad5, 2, { status: 'pig', duration: 3, word: 'zap' }),
        ab('broom_dash', 'Broom Dash', 'dash', 5, 0x80ffdb, 2, { word: 'zip' }),
        ab('potion', 'Healing Potion', 'heal', 10, 0x80ffdb, 1, { word: 'hug' }),
      ],
      ultimate: ab('garden', 'Magic Garden', 'rain', 0, 0xff8fab, 3, { count: 30, glyph: '🌸', color2: 0x80ffdb }),
      taunts: [
        { key: 'brew', text: 'Bubble, bubble!' },
        { key: 'pig', text: 'Into a piggy you go!' },
        { key: 'broom', text: 'Zoom on my broom!' },
        { key: 'magic', text: 'A little magic!' },
        { key: 'flowers', text: 'Flowers for you!' },
        { key: 'ride', text: 'Hop on my broom!' },
      ],
    },
    evil: {
      displayName: 'Evil Bavmorda', trail: { tint: [0x39ff14, 0x240046], shape: 'smoke' }, look: 'a tall dark witch queen with a horned crown, a black staff with a green flame, skeletons at her feet',
      palette: [0x240046, 0x39ff14], glyph: '🧙‍♀️', style: 'hover', mount: '🧹', speed: 140, size: 1.2, hp: 190,
      abilities: [
        ab('skeleton_wave', 'Skeleton Wave', 'summon', 8, 0xf2f0e6, 2, { minion: 'skeleton', count: 5 }),
        ab('pig_curse', 'Pig Curse', 'polymorph', 7, 0x39ff14, 2, { status: 'pig', duration: 3.5 }),
        ab('dark_bolts', 'Dark Bolts', 'bolt', 2.4, 0x39ff14, 2, { count: 3, homing: true }),
      ],
      ultimate: ab('all_pigs', 'Everybody Pigs!', 'polymorph', 0, 0x39ff14, 3, { status: 'pig', duration: 6, count: 6 }),
      taunts: [
        { key: 'pigs', text: 'You will all be pigs!' },
        { key: 'rise', text: 'Rise, my skeletons!' },
        { key: 'kneel', text: 'Bow to the queen!' },
        { key: 'cackle', text: 'Bow, little hero!' },
        { key: 'cauldron', text: 'Into my cauldron!' },
        { key: 'piglets', text: 'Bow, little piglets!' },
      ],
    },
    counter: {
      id: 'bounce_cap', name: 'Bounce Cap', glyph: '🧢', look: 'a shiny blue baseball cap with a curved peak that bounces any spell straight back',
      how: 'reflect', words: ['sun', 'pin', 'zap'], word: 'cap',
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
    description: 'A giant gorilla robot: as a friend all bananas and big hugs, as a villain all rocket fists and an appetite for cars.',
    arena: 'street',
    good: {
      displayName: 'Rilla', trail: { tint: [0xffe14a, 0x8a6a4a], shape: 'square' }, look: 'a friendly, gentle giant gorilla robot with pastel blue armour plates, soft glowing eyes and a big smile, arms open wide for a hug',
      palette: [0x8a6a4a, 0xffe14a], glyph: '🦍', style: 'stomp', speed: 110, size: 1.4, hp: 160,
      abilities: [
        ab('banana_toss', 'Banana Toss', 'bolt', 2.4, 0xffe14a, 1, { count: 3, glyph: '🍌', word: 'pop' }),
        ab('rocket_punch', 'Rocket Punch', 'bolt', 3, 0xff6a3a, 2, { glyph: '🚀', homing: true, word: 'pow', shout: true }),
        ab('chest_drum', 'Chest Drum', 'slam', 6, 0x8a6a4a, 3, { word: 'bam', shout: true }),
        ab('gorilla_hug', 'Gorilla Hug', 'heal', 10, 0xffe14a, 1, { word: 'hug' }),
      ],
      ultimate: ab('banana_bonanza', 'Banana Bonanza', 'rain', 0, 0xffe14a, 3, { count: 32, glyph: '🍌', color2: 0x8a6a4a }),
      taunts: [
        { key: 'hugs', text: 'Hugs for everyone!' },
        { key: 'bananas', text: 'Bananas, go!' },
        { key: 'gentle', text: 'I am a gentle giant!' },
        { key: 'power', text: 'Gorilla power!' },
        { key: 'snack', text: 'Who wants a banana?' },
        { key: 'stomp', text: 'Stomp, stomp, hooray!' },
      ],
    },
    evil: {
      displayName: 'EvilRilla', trail: { tint: [0xff3a1a, 0x3a2a1a], shape: 'smoke' }, look: 'a giant, menacing-but-silly gorilla robot with chrome and red armour plates, huge rocket fists, glowing red eyes and a bandolier of banana peels across the chest',
      palette: [0x3a2a1a, 0xff3a1a], glyph: '🤖', style: 'stomp', speed: 70, size: 1.8, hp: 230,
      abilities: [
        ab('rocket_fists', 'Rocket Fists', 'bolt', 3, 0xff3a1a, 2, { count: 2, glyph: '🚀', homing: true }),
        ab('chest_shock', 'Chest Drum Shockwave', 'slam', 6, 0xff3a1a, 3),
        ab('peel_traps', 'Banana Peel Traps', 'trap', 8, 0xffe14a, 2, { count: 3, glyph: '🍌' }),
        ab('car_crunch', 'Car Crunch', 'dash', 7, 0x3a2a1a, 3),
      ],
      ultimate: ab('mega_chest_drum', 'Mega Chest Drum', 'wave', 0, 0xff3a1a, 3, { color2: 0x3a2a1a }),
      taunts: [
        { key: 'hungry', text: 'I am so hungry!' },
        { key: 'crunch', text: 'Crunch, crunch, crunch!' },
        { key: 'peels', text: 'Watch out for peels!' },
        { key: 'fists', text: 'Rocket fists, go!' },
        { key: 'drum', text: 'Drum, drum, drum!' },
        { key: 'cars', text: 'Cars are yummy!' },
      ],
    },
    counter: {
      id: 'mice', name: 'Wind-up Mice', glyph: '🐭', look: 'a tin full of clockwork toy mice that scurry and squeak',
      how: 'scare', words: ['rat', 'bug', 'hen'], word: 'mice',
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
];

export const CHARACTER_BY_ID: Record<string, CharacterSpec> = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

/** Team combos: when both are on the hero side, every so often they fire this together. */
export const COMBOS: ComboSpec[] = [
  { pair: ['elsa', 'anna'], ability: ab('sister_storm', 'Sister Storm', 'spin', 16, 0xaee6ff, 3, { count: 5, color2: 0xe63946 }) },
  { pair: ['seraphina', 'smaug'], ability: ab('dragon_duet', 'Dragon Duet', 'cone', 16, 0xff7b00, 3, { color2: 0x6ad66a }) },
  { pair: ['jasmine', 'ozymandias'], ability: ab('desert_duo', 'Desert Duo', 'wave', 16, 0xffc857, 3, { color2: 0x1fb5a8 }) },
  { pair: ['dada_matt', 'dada_jason'], ability: ab('dad_squad', 'Dad Squad', 'slam', 16, 0xff8c42, 3, { color2: 0x3a86ff }) },
  { pair: ['julia', 'dada_matt'], ability: ab('high_five', 'Mega High Five', 'lightning', 16, 0xffd23f, 3, { count: 6, color2: 0x3a86ff }) },
  // Ellie rings them both in giant bubbles; Julia's stars fly out through the
  // ring, then the bubbles follow them in.
  {
    pair: ['julia', 'ellie'],
    ability: ab('star_bubble_spin', 'Star Bubble Spin', 'bolt', 16, 0xffd23f, 3, { count: 4, glyph: '⭐', homing: true, color2: 0x9ad8ff }),
    second: ab('star_bubble_ring', 'Star Bubble Spin', 'orbit', 16, 0x9ad8ff, 3, { count: 8, art: 'fx_bubble', upright: true, duration: 1.4, color2: 0xff9ad5 }),
  },
  { pair: ['seraphina', 'tiamat'], ability: ab('dragon_queen_ride', 'Dragon Queen Ride', 'dash', 16, 0xc77dff, 3, { color2: 0x6ad66a }) },
  { pair: ['julia', 'seraphina'], ability: ab('best_friends', 'Best Friend Blast', 'beam', 16, 0xff5ab4, 3, { color2: 0x2ec27e }) },
];

/** Any two heroes without a written combo still team up with this. */
export const DEFAULT_COMBO = ab('team_blast', 'Team Star Blast', 'beam', 18, 0xffd23f, 3, { color2: 0xff5ab4 });

function comboSpec(a: string, b: string): ComboSpec | undefined {
  return COMBOS.find((c) => (c.pair[0] === a && c.pair[1] === b) || (c.pair[0] === b && c.pair[1] === a));
}

export function comboFor(a: string, b: string): AbilitySpec {
  return comboSpec(a, b)?.ability ?? DEFAULT_COMBO;
}

/** What `who` fires in its combo with `partner`: the combo's `second` half if `who` is second of the pair. */
export function comboPart(who: string, partner: string): AbilitySpec {
  const c = comboSpec(who, partner);
  if (!c) return DEFAULT_COMBO;
  return c.second && c.pair[1] === who ? c.second : c.ability;
}

/** Arenas: id → colours and a glyph strip for the placeholder painter, plus a look for art prompts. */
export const ARENAS: Record<string, { name: string; sky: [number, number]; ground: number; glyph: string; look: string }> = {
  meadow: { name: 'Sunny Meadow', sky: [0x8ad7ff, 0xe8f8ff], ground: 0x6ac46a, glyph: '🌼', look: 'a bright flower meadow with rolling hills' },
  volcano: { name: 'Dragon Volcano', sky: [0x3a0a1a, 0xff7b3a], ground: 0x4a2a2a, glyph: '🌋', look: 'a smoking volcano with lava rivers and dragon nests' },
  kitchen: { name: 'Giant Kitchen', sky: [0xfff1d6, 0xffd6a5], ground: 0xc8a07a, glyph: '🍳', look: 'a cartoon kitchen seen from a toy\'s height, giant pans and spoons' },
  castle: { name: 'Castle Courtyard', sky: [0x5a6aa0, 0xc8d0ff], ground: 0x8a8a9a, glyph: '🏰', look: 'a stone castle courtyard with banners and torches' },
  ice: { name: 'Crystal Ice Palace', sky: [0x9ad8ff, 0xf0faff], ground: 0xd8f0ff, glyph: '🏔️', look: 'an ice palace of glittering crystal spires and snow' },
  desert: { name: 'Golden Dunes', sky: [0xffb15a, 0xffe8b0], ground: 0xe8c890, glyph: '🐪', look: 'golden sand dunes with half-buried statues and a pyramid' },
  sea: { name: 'Serpent Sea', sky: [0x2a5aa0, 0x9ad8ff], ground: 0x2a7ab4, glyph: '🌊', look: 'a stormy sea with rocky islands and huge waves' },
  cave: { name: 'Treasure Cave', sky: [0x1a1a2a, 0x5a4a2a], ground: 0x8a6a2a, glyph: '💰', look: 'a cave piled high with gold coins and jewels, lit by lava cracks' },
  factory: { name: 'Robot Factory', sky: [0x2a2d42, 0x6a7a9a], ground: 0x4a4a5a, glyph: '⚙️', look: 'a neon robot factory with conveyor belts and sparks' },
  city: { name: 'Foggy City', sky: [0x3a4a5a, 0xa0b0c0], ground: 0x5a5a6a, glyph: '🎡', look: 'a foggy old city street at night with lamp posts and a fairground' },
  nursery: { name: 'Giant Playroom', sky: [0xffe0f0, 0xfff8e0], ground: 0xc8a07a, glyph: '🧸', look: "a toddler's playroom seen from a toy's height: towering stacks of building blocks, a huge crib, giant soft toys and a squashy play mat" },
  street: { name: 'Sunny Street', sky: [0x8ad7ff, 0xf0f8ff], ground: 0x8a8a92, glyph: '🚗', look: 'a sunny suburban street outside the house, Dada Jason\'s car parked at the kerb' },
};
