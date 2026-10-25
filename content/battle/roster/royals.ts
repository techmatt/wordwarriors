/** Roster characters, in ROSTER order (./index.ts): Elsa, Anna, Jasmine and Ozymandias. */

import type { CharacterSpec } from '../types.js';
import { ab, ult } from './abilities.js';

export const ROYALS: CharacterSpec[] = [
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
        // Item 156 (Matt): a summon like every villain's, her snow helpers as good Elsa's are.
        ab('grumpy_snowmen', 'Grumpy Snowmen', 'summon', 11, 0x5ad8ff, 2, { minion: 'snow_golem', count: 3 }),
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
        // Hunt 9, M40: was "You can't catch me!" (CAN is a reading word).
        { key: 'catch', text: "You'll never catch me!" },
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
      // Item 156 (Matt): a comet's fire, not icy blue (Evil Elsa's Forever Winter is the icy wave);
      // fireballs ride it (☄️ is ZIP's picture, a move word; 🌠 draws a blue tail).
      ultimate: ult('comet_crash', 'Comet Crash', 'wave', 0xff7a2a, 3, { color2: 0xffd84a, glyph: '🔥' }),
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
        // Hunt 10, M49: was "Even my penguins love a party!" (said on the mountain: no party, no penguins).
        { key: 'view', text: 'Explorers love the view from way up high!' },
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
];
