/** Roster characters, in ROSTER order (./index.ts): Jormungandr the world serpent, Smaug and Tiamat. */

import type { CharacterSpec } from '../types.js';
import { ab, ult } from './abilities.js';

export const DRAGONS: CharacterSpec[] = [
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
    storyFight: 'smaug_story',
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
];
