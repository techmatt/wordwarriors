/** Roster characters, in ROSTER order (./index.ts): Scar the tiny robot, Moriarty, Bavmorda and Bluerilla. */

import type { CharacterSpec } from '../types.js';
import { ab, ult } from './abilities.js';

export const ODDBALLS: CharacterSpec[] = [
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
        // Hunt 9, M40: was "You can't win!" (CAN is a reading word).
        { key: 'resist', text: 'You will never win!' },
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
      // Hunt 7, M35 (Matt): 1.3, as Ozymandias: a grown-up magician beside Dad, not her height.
      palette: [0x2d6a4f, 0xf4a261], glyph: '🎩', style: 'blink', speed: 200, size: 1.3, hp: 100,
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
      // Item 138 (Matt): said "blue-rilla" (edge-tts read it wrong), in every line that says it (compose.ts `respell`).
      displayName: 'Bluerilla', sayName: 'Blue-rilla', trail: { tint: [0xffe14a, 0x2a4aa8], shape: 'square' }, look: 'a big, gentle cartoon gorilla modelled on a plush toy, a kind, huggable giant: shaggy deep navy-blue fur all over, a large pale-blue face with a big friendly rounded muzzle and a happy smile, small dark kind eyes, a big round pale-blue chest and belly patch, very long navy arms with big pale-blue hands, and pale-blue feet, round and chunky like the toy, all soft curves, NOT a robot: no armour, no metal, no glowing eyes, waving hello with one big hand',
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
];
