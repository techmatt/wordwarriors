/** The minions characters summon. */

import type { MinionSpec } from '../types.js';
import { ab } from './abilities.js';

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
