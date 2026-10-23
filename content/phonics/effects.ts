/**
 * What every bank word does in the battle (item 037): one effect per word,
 * whoever fires it.
 *
 * - A pictured word (`thing`) is a fetched battle item: her bag pops, the
 *   picture flies out, and the hero fires `ability` with a THE NET! banner
 *   (BattleScene `useFetched`).
 * - An action word is a move pad: reading it casts it. Her hero fires the
 *   word's own `ability`, supercharged, with a SUPER JUMP! banner. When the
 *   word is also one of a teammate's own abilities (`words` in the
 *   roster, `abilityWords`), that styled version fires instead (src/rules/moves.ts).
 * - A `both` word (NET) uses the same effect either way.
 *
 * `look` says what it does, for docs and art prompts. The ability's `id` is
 * `item_<word>` for things and `word_<word>` for actions; its `name` is never
 * shown (the banner is the word).
 *
 * Pure data: no Phaser.
 */

import type { AbilitySpec } from '../battle/types.js';

export interface WordEffect {
  word: string;
  /** What it does, for docs and art prompts. */
  look: string;
  ability: AbilitySpec;
}

function use(word: string, kind: AbilitySpec['kind'], color: number, extra: Partial<AbilitySpec> = {}): AbilitySpec {
  return { id: `item_${word}`, name: `The ${word}`, kind, cooldown: 0, color, power: 2, ...extra };
}

/** An action word's effect: the same, with its own id. */
function act(word: string, kind: AbilitySpec['kind'], color: number, extra: Partial<AbilitySpec> = {}): AbilitySpec {
  return { ...use(word, kind, color, extra), id: `word_${word}`, name: word.toUpperCase() };
}

/** The word's own picture as the thing flung or dropped, the right way up. */
function pic(word: string): Partial<AbilitySpec> {
  return { art: `pic_${word}`, upright: true };
}

const THING_EFFECTS: WordEffect[] = [
  { word: 'net', look: 'a big net flung over the villain: tangled and dizzy', ability: use('net', 'bolt', 0xffffff, { glyph: '🥅', count: 3, status: 'stun', duration: 2, homing: true }) },
  { word: 'fan', look: 'a giant fan that blows a gale across the arena', ability: use('fan', 'wave', 0xbfefff, { color2: 0xffffff }) },
  { word: 'mop', look: 'a mop that sweeps in and slams down, splash', ability: use('mop', 'slam', 0x7ad9ff, { power: 3 }) },
  { word: 'jet', look: 'a toy jet that zooms through the villain', ability: use('jet', 'dash', 0xff5a3c, { power: 3 }) },
  { word: 'hen', look: 'a flock of brave hens that peck at the villain', ability: use('hen', 'summon', 0xffffff, { minion: 'hen', count: 3 }) },
  { word: 'dog', look: 'the family dog, who bounds in barking', ability: use('dog', 'summon', 0xc8884a, { minion: 'dog', count: 1 }) },
  // Not CAN: it is a frame word (WE CAN USE THE), so the prefix line would say it.
  { word: 'pot', look: 'pots and pans clanging down one after another', ability: use('pot', 'rain', 0xc0c8d0, { count: 12 }) },
  { word: 'web', look: 'a sticky web laid on the ground: a trap', ability: use('web', 'trap', 0xe8e8ff, { glyph: '🕸️', count: 3 }) },
  { word: 'box', look: 'cardboard boxes raining down on the villain', ability: use('box', 'rain', 0xc8a070, { glyph: '📦', count: 14 }) },
  { word: 'pin', look: 'a volley of pins, ouch', ability: use('pin', 'bolt', 0xff3d7a, { glyph: '📌', count: 5, homing: true }) },
  { word: 'bus', look: 'a school bus that drives straight through the villain', ability: use('bus', 'dash', 0xffc83d, { power: 3 }) },
  { word: 'sun', look: 'a burst of sunshine beamed at the villain', ability: use('sun', 'beam', 0xffd23f, { color2: 0xffffff }) },
  // Item 015: the rest of the CVC words. Most fling or drop the word's own picture.
  { word: 'cat', look: 'a pounce of cats leaping at the villain', ability: use('cat', 'bolt', 0xffb347, { ...pic('cat'), count: 3, homing: true }) },
  { word: 'fox', look: 'a quick fox that dashes straight through the villain', ability: use('fox', 'dash', 0xff7b3a, { power: 3 }) },
  { word: 'bug', look: 'a cloud of bugs raining down, tickly', ability: use('bug', 'rain', 0x6ad66a, { ...pic('bug'), count: 10 }) },
  { word: 'pig', look: 'a magic pig that turns the villain into a pig for a moment', ability: use('pig', 'bolt', 0xff9ac8, { ...pic('pig'), count: 1, status: 'pig', duration: 2, homing: true }) },
  { word: 'hat', look: 'hats raining down and plopping onto the villain', ability: use('hat', 'rain', 0x9b5de5, { ...pic('hat'), count: 8 }) },
  { word: 'bed', look: 'a big comfy bed that flops down on the villain', ability: use('bed', 'slam', 0x7aa6ff, { power: 3 }) },
  { word: 'cup', look: 'cups tumbling down, splish', ability: use('cup', 'rain', 0xc8884a, { ...pic('cup'), count: 10 }) },
  { word: 'map', look: 'maps flapping at the villain, which way is up?', ability: use('map', 'bolt', 0xe8c890, { ...pic('map'), count: 3, homing: true }) },
  { word: 'pen', look: 'a volley of pens, scribble scribble', ability: use('pen', 'bolt', 0x3a86ff, { ...pic('pen'), count: 5, homing: true }) },
  { word: 'van', look: 'a van that drives straight through the villain', ability: use('van', 'dash', 0xffffff, { power: 3 }) },
  { word: 'bat', look: 'a flutter of bats swooping at the villain', ability: use('bat', 'bolt', 0x5a2a7a, { ...pic('bat'), count: 4, homing: true }) },
  { word: 'bag', look: 'bags dropping onto the villain, plop plop', ability: use('bag', 'rain', 0xff7ad9, { ...pic('bag'), count: 8 }) },
  { word: 'can', look: 'cans clattering down on the villain', ability: use('can', 'rain', 0xc0c8d0, { ...pic('can'), count: 12 }) },
  { word: 'nut', look: 'a hail of nuts, bonk bonk', ability: use('nut', 'rain', 0xc8884a, { ...pic('nut'), count: 14 }) },
  { word: 'tub', look: 'a bathtub that slams down, splash', ability: use('tub', 'slam', 0x7ad9ff, { power: 3 }) },
  { word: 'cap', look: 'caps flung like flying saucers', ability: use('cap', 'bolt', 0xe63946, { ...pic('cap'), count: 4, homing: true }) },
  { word: 'log', look: 'logs rolling down from the sky, thump', ability: use('log', 'rain', 0x8a5a2a, { ...pic('log'), count: 6, power: 3 }) },
  { word: 'rat', look: 'brave rats scurrying at the villain', ability: use('rat', 'bolt', 0xa0a0a0, { ...pic('rat'), count: 6, homing: true }) },
  // Item 035: the -UG family.
  { word: 'mug', look: 'mugs of cocoa tumbling down, warm and sloshy', ability: use('mug', 'rain', 0x3a86ff, { ...pic('mug'), count: 8 }) },
  { word: 'rug', look: 'a magic flying rug that swoops straight through the villain', ability: use('rug', 'dash', 0xe63946, { power: 3 }) },
  { word: 'jug', look: 'a giant jug that pours a wave of milk across the arena', ability: use('jug', 'wave', 0xffffff, { color2: 0xbfefff }) },
  // Item 037: the pictured words that were move words too (`both`), then the new things.
  { word: 'pan', look: 'frying pans that fly and BONG the villain, seeing stars', ability: use('pan', 'bolt', 0x5a5a6a, { ...pic('pan'), count: 2, power: 3, status: 'stun', duration: 1.5, homing: true }) },
  { word: 'ram', look: 'a big woolly ram that charges headfirst through the villain', ability: use('ram', 'dash', 0xf0e6d2, { power: 3 }) },
  { word: 'top', look: 'a giant spinning top that whirls through the baddies', ability: use('top', 'spin', 0xff5ab4, { count: 3, color2: 0xffd23f }) },
  { word: 'fin', look: 'shark fins circling in through the water, chomp', ability: use('fin', 'bolt', 0x5a8ab0, { ...pic('fin'), count: 3, homing: true }) },
  { word: 'jam', look: 'jars of sticky jam plopping down on the villain', ability: use('jam', 'rain', 0xe63946, { ...pic('jam'), count: 8 }) },
  { word: 'yak', look: 'a shaggy yak that stampedes straight through the villain', ability: use('yak', 'dash', 0x8a5a2a, { power: 3 }) },
  { word: 'vat', look: 'a huge vat tips over: a wave of bubbly green soup', ability: use('vat', 'wave', 0x6ad66a, { color2: 0xd8ffb0 }) },
  { word: 'leg', look: 'a giant leg that stomps down on the villain, thump', ability: use('leg', 'slam', 0xffc8a0, { power: 3 }) },
  { word: 'peg', look: 'clothes pegs that pinch the villain, ouch', ability: use('peg', 'bolt', 0x3ad0a0, { ...pic('peg'), count: 5, homing: true }) },
  { word: 'wig', look: 'a silly wig that lands on the villain\'s head: it cannot see!', ability: use('wig', 'bolt', 0xffd23f, { ...pic('wig'), count: 1, status: 'stun', duration: 2, homing: true }) },
  { word: 'bib', look: 'baby bibs flying at the villain, messy', ability: use('bib', 'bolt', 0x9ad8ff, { ...pic('bib'), count: 3, homing: true }) },
  { word: 'fig', look: 'figs plopping down, squish', ability: use('fig', 'rain', 0x7b2cbf, { ...pic('fig'), count: 10 }) },
  { word: 'six', look: 'six big number sixes tumbling down on the villain', ability: use('six', 'rain', 0xffffff, { ...pic('six'), count: 6, power: 3 }) },
  { word: 'kit', look: 'a toolkit that builds a wall round the team', ability: use('kit', 'shield', 0xe63946, { duration: 4 }) },
  { word: 'lip', look: 'big smoochy kisses flying at the villain, yuck!', ability: use('lip', 'bolt', 0xff3d7a, { ...pic('lip'), count: 4, homing: true }) },
  // Not upright: a cog spins as it flies.
  { word: 'cog', look: 'spinning cogs whizzing at the villain', ability: use('cog', 'bolt', 0xc0c8d0, { art: 'pic_cog', count: 4, homing: true }) },
  { word: 'rod', look: 'a fishing rod that hooks the villain: stuck on the line', ability: use('rod', 'bolt', 0x3a86ff, { ...pic('rod'), count: 1, status: 'stun', duration: 2, homing: true }) },
  { word: 'pod', look: 'peas pinging out of a pod, ping ping ping', ability: use('pod', 'bolt', 0x6ad66a, { ...pic('pod'), count: 5, homing: true }) },
  { word: 'gum', look: 'sticky pink gum on the ground: step in it, stuck!', ability: use('gum', 'trap', 0xff9ad5, { glyph: '🍬', count: 3 }) },
  { word: 'bun', look: 'soft buns raining down, boing', ability: use('bun', 'rain', 0xe8b070, { ...pic('bun'), count: 10 }) },
  { word: 'hut', look: 'a little hut that drops down on the villain, thump', ability: use('hut', 'slam', 0xc8a070, { power: 3 }) },
  { word: 'sub', look: 'a yellow submarine that zooms straight through the villain', ability: use('sub', 'dash', 0xffd23f, { power: 3 }) },
  { word: 'frog', look: 'frogs leaping at the villain, ribbit', ability: use('frog', 'bolt', 0x2ec27e, { ...pic('frog'), count: 4, homing: true }) },
  { word: 'drum', look: 'a giant drum, BOOM, that shakes the whole arena', ability: use('drum', 'slam', 0xe63946, { power: 3, color2: 0xffd23f }) },
  { word: 'crab', look: 'crabs scuttling at the villain, pinch pinch', ability: use('crab', 'bolt', 0xff5a3c, { ...pic('crab'), count: 4, homing: true }) },
  { word: 'flag', look: 'a big flag waved high: the team stands tall behind a shield', ability: use('flag', 'shield', 0xe63946, { duration: 4 }) },
  { word: 'sled', look: 'a sled that whooshes downhill through the villain', ability: use('sled', 'dash', 0xbfefff, { power: 3 }) },
  { word: 'nest', look: 'a big nest on the ground: the villain sits in it, stuck', ability: use('nest', 'trap', 0xc8884a, { glyph: '🥚', count: 2 }) },
  { word: 'tent', look: 'a tent that pops up over the team', ability: use('tent', 'shield', 0x2a9d8f, { duration: 4 }) },
  { word: 'desk', look: 'a heavy desk that drops on the villain, thud', ability: use('desk', 'slam', 0x8a5a2a, { power: 3 }) },
  { word: 'belt', look: 'a belt flung like a lasso: the villain is tied up', ability: use('belt', 'bolt', 0x5a3a2a, { ...pic('belt'), count: 1, status: 'stun', duration: 2, homing: true }) },
  { word: 'vest', look: 'a glowing safety vest for everyone: a shield', ability: use('vest', 'shield', 0xff8c42, { duration: 4 }) },
  { word: 'plum', look: 'plums plopping down, squish', ability: use('plum', 'rain', 0x9b5de5, { ...pic('plum'), count: 10 }) },
  { word: 'gift', look: 'surprise gifts raining down on the villain', ability: use('gift', 'rain', 0xff5ab4, { ...pic('gift'), count: 8 }) },
  { word: 'lamp', look: 'a lamp that beams bright light in the villain\'s eyes', ability: use('lamp', 'beam', 0xfff07a, { color2: 0xffffff }) },
  { word: 'hand', look: 'a giant hand that flicks the villain, flick!', ability: use('hand', 'bolt', 0xffc8a0, { ...pic('hand'), count: 1, power: 3, homing: true }) },
  { word: 'mask', look: 'masks on: three of her pop up, which one is real?', ability: use('mask', 'clones', 0x9b5de5, { count: 3 }) },
  { word: 'raft', look: 'a raft that surfs in on a big wave', ability: use('raft', 'wave', 0x7ad9ff, { color2: 0xc8a070 }) },
  { word: 'plug', look: 'a plug that sparks: zaps crackle down from the sky', ability: use('plug', 'lightning', 0x3ae0ff, { count: 3 }) },
  { word: 'slug', look: 'slimy slug trails on the ground: slip and slide', ability: use('slug', 'trap', 0xb0d060, { glyph: '🐌', count: 3 }) },
  { word: 'twig', look: 'twigs tumbling down, snap crackle', ability: use('twig', 'rain', 0x6a8a3a, { ...pic('twig'), count: 12 }) },
  { word: 'ant', look: 'an army of ants marching down on the villain', ability: use('ant', 'rain', 0x5a2a2a, { ...pic('ant'), count: 16 }) },
  { word: 'milk', look: 'a glass of milk for the whole team: strong again', ability: use('milk', 'heal', 0xffffff, { color2: 0xbfefff }) },
  { word: 'ship', look: 'a pirate ship that sails straight through the villain', ability: use('ship', 'dash', 0x8a5a2a, { power: 3 }) },
  { word: 'fish', look: 'fish flopping at the villain, slap slap', ability: use('fish', 'bolt', 0x3a86ff, { ...pic('fish'), count: 4, homing: true }) },
  { word: 'duck', look: 'rubber ducks bonking the villain, squeak', ability: use('duck', 'bolt', 0xffd23f, { ...pic('duck'), count: 5, homing: true }) },
  { word: 'sock', look: 'stinky socks raining down on the villain, pee-yew', ability: use('sock', 'rain', 0xffffff, { ...pic('sock'), count: 10 }) },
  { word: 'moth', look: 'moths that flutter round her, then fly at the villain', ability: use('moth', 'orbit', 0xe8d8b0, { ...pic('moth'), count: 5, duration: 1.6 }) },
  { word: 'shed', look: 'a garden shed that drops down on the villain, crash', ability: use('shed', 'slam', 0x8a6a4a, { power: 3 }) },
  { word: 'chick', look: 'a flurry of fluffy chicks flapping at the villain', ability: use('chick', 'bolt', 0xffe14a, { ...pic('chick'), count: 5, homing: true }) },
  // Item 040: familiar replacements.
  { word: 'vet', look: 'a kind vet who patches the whole team up: strong again', ability: use('vet', 'heal', 0x7ad9ff, { color2: 0xffffff }) },
  { word: 'chest', look: 'a treasure chest bursts open: gold coins rain on the villain', ability: use('chest', 'rain', 0xffd23f, { glyph: '💰', count: 14 }) },
  { word: 'bin', look: 'a wheelie bin that rolls straight through the villain', ability: use('bin', 'dash', 0x3ac060, { power: 3 }) },
  { word: 'rock', look: 'rocks tumbling down on the villain, thud', ability: use('rock', 'rain', 0x8a8a8a, { ...pic('rock'), count: 8, power: 3 }) },
  { word: 'clock', look: 'a giant clock that ticks: the villain freezes for a moment', ability: use('clock', 'freeze', 0xe8d8b0, { duration: 2 }) },
  { word: 'stick', look: 'sticks tumbling down on the villain, snap crackle', ability: use('stick', 'rain', 0x8a5a2a, { ...pic('stick'), count: 10 }) },
  { word: 'brush', look: 'a giant brush that sweeps through the villain, swish', ability: use('brush', 'dash', 0xffc83d, { power: 3 }) },
  { word: 'truck', look: 'a big truck that drives straight through the villain', ability: use('truck', 'dash', 0xe63946, { power: 3 }) },
  { word: 'plant', look: 'a magic plant that grows round the villain and holds it tight', ability: use('plant', 'trap', 0x3ac060, { glyph: '🌿', count: 3 }) },
  { word: 'crib', look: 'a cosy crib that drops on the villain: nap time, it nods off', ability: use('crib', 'slam', 0x9ad8ff, { power: 3, status: 'stun', duration: 1.5 }) },
  { word: 'bath', look: 'a bubbly bath that sloshes a wave of bubbles across the arena', ability: use('bath', 'wave', 0x9ad8ff, { color2: 0xffffff }) },
  // Item 043: the K and Y pictures.
  { word: 'key', look: 'a giant golden key that locks the villain still for a moment, click', ability: use('key', 'freeze', 0xffd23f, { duration: 2 }) },
  { word: 'yoyo', look: 'yo-yos that zip out and bonk the villain, then zip back', ability: use('yoyo', 'bolt', 0xe63946, { ...pic('yoyo'), count: 4, homing: true }) },
  // Item 054: the bridge's new pictures.
  { word: 'mat', look: 'a giant mat that rolls out and sweeps the villain off its feet, whoosh', ability: use('mat', 'wave', 0xc8553d, { color2: 0xffd23f }) },
  { word: 'man', look: 'a friendly strong man who shields the whole team with his arms wide', ability: use('man', 'shield', 0x7ad9ff, { duration: 3 }) },
  { word: 'lid', look: 'pot lids that clang down on the villain, bong bong', ability: use('lid', 'rain', 0xb8c4d0, { ...pic('lid'), count: 8 }) },
  { word: 'lock', look: 'a giant padlock that clicks shut on the villain: it cannot move for a moment', ability: use('lock', 'freeze', 0xffd23f, { duration: 2 }) },
  // Item 056: the coverage audit's pictures.
  { word: 'egg', look: 'eggs raining down on the villain, splat splat', ability: use('egg', 'rain', 0xfff4e0, { ...pic('egg'), count: 10 }) },
  { word: 'bell', look: 'a giant bell that rings DONG: the villain is dizzy', ability: use('bell', 'slam', 0xffd23f, { power: 3, status: 'stun', duration: 1.5 }) },
  { word: 'doll', look: 'toy dolls that march round her, then at the villain', ability: use('doll', 'orbit', 0xff9ad5, { ...pic('doll'), count: 4, duration: 1.6 }) },
  { word: 'tap', look: 'a giant tap that gushes a wave of water across the arena', ability: use('tap', 'wave', 0x7ad9ff, { color2: 0xbfefff }) },
  { word: 'elf', look: 'a helpful elf who patches the whole team up: strong again', ability: use('elf', 'heal', 0x3ac060, { color2: 0xffd23f }) },
  { word: 'grass', look: 'long grass that grows round the villain and holds it tight', ability: use('grass', 'trap', 0x6ad66a, { glyph: '🌾', count: 3 }) },
  { word: 'glass', look: 'a glass of water for the whole team: strong again', ability: use('glass', 'heal', 0xbfefff, { color2: 0xffffff }) },
  { word: 'sink', look: 'a kitchen sink that drops down on the villain, clang', ability: use('sink', 'slam', 0xc0c8d0, { power: 3 }) },
  { word: 'king', look: 'a kind king who holds up his hand: the villain stops for a moment', ability: use('king', 'freeze', 0xffd23f, { duration: 2 }) },
  { word: 'ring', look: 'a magic ring that glows round the team: a shield', ability: use('ring', 'shield', 0xffd23f, { duration: 4 }) },
  { word: 'wing', look: 'wings for the hero: she swoops straight through the villain', ability: use('wing', 'dash', 0xffffff, { power: 3 }) },
  { word: 'shell', look: 'seashells flying at the villain, clack clack', ability: use('shell', 'bolt', 0xffc8a0, { ...pic('shell'), count: 5, homing: true }) },
  { word: 'chips', look: 'chips raining down on the villain, crunch', ability: use('chips', 'rain', 0xffd23f, { ...pic('chips'), count: 12 }) },
  { word: 'bush', look: 'a bush that grows round the villain and holds it tight', ability: use('bush', 'trap', 0x3ac060, { glyph: '🌿', count: 3 }) },
  { word: 'thumb', look: 'a giant thumb that squishes down on the villain, squish', ability: use('thumb', 'slam', 0xffc8a0, { power: 3 }) },
  { word: 'lamb', look: 'fluffy lambs bouncing at the villain, baa', ability: use('lamb', 'bolt', 0xffffff, { ...pic('lamb'), count: 4, homing: true }) },
  { word: 'quilt', look: 'a giant quilt that drops over the villain: it cannot see!', ability: use('quilt', 'slam', 0xff9ad5, { power: 2, status: 'stun', duration: 2 }) },
  { word: 'queen', look: 'a kind queen who holds up her sceptre: a shield for the team', ability: use('queen', 'shield', 0xffd23f, { duration: 4 }) },
  { word: 'goat', look: 'a goat that charges headfirst through the villain, baa', ability: use('goat', 'dash', 0xf0e6d2, { power: 3 }) },
  { word: 'jeep', look: 'a jeep that drives straight through the villain, beep beep', ability: use('jeep', 'dash', 0x6a8a3a, { power: 3 }) },
  { word: 'sheep', look: 'a flock of woolly sheep bouncing at the villain', ability: use('sheep', 'bolt', 0xffffff, { ...pic('sheep'), count: 4, homing: true }) },
  { word: 'ten', look: 'ten bright stars raining down on the villain, ten, nine, eight...', ability: use('ten', 'rain', 0x7bd389, { glyph: '⭐', count: 10, power: 3 }) },
  { word: 'three', look: 'three big stars that drop down on the villain, one, two, three', ability: use('three', 'rain', 0xffd23f, { glyph: '⭐', count: 3, power: 3 }) },
  { word: 'cheese', look: 'cheese wedges raining down on the villain, smelly', ability: use('cheese', 'rain', 0xffd23f, { ...pic('cheese'), count: 10 }) },
  { word: 'kite', look: 'kites that swoop round her, then dive at the villain', ability: use('kite', 'orbit', 0xff5ab4, { ...pic('kite'), count: 4, duration: 1.6 }) },
  { word: 'bike', look: 'a bike that rides straight through the villain, ring ring', ability: use('bike', 'dash', 0xe63946, { power: 3 }) },
  { word: 'vase', look: 'vases of flowers dropping on the villain, crash', ability: use('vase', 'rain', 0x9b5de5, { ...pic('vase'), count: 6 }) },
  { word: 'cake', look: 'a big cake for the whole team: strong again, yum', ability: use('cake', 'heal', 0xff9ad5, { color2: 0xffffff }) },
  // Item 121: familiar things from the farm, home and school.
  { word: 'ham', look: 'a big juicy ham for the whole team: strong again, yum', ability: use('ham', 'heal', 0xff9a8a, { color2: 0xffd23f }) },
  { word: 'hay', look: 'bales of hay that tumble down on the villain, flump', ability: use('hay', 'rain', 0xe8c860, { ...pic('hay'), count: 6 }) },
  { word: 'tree', look: 'two leafy trees that topple down onto the villain, timber', ability: use('tree', 'rain', 0x3cb44b, { ...pic('tree'), count: 2 }) },
  { word: 'gate', look: 'a wooden farm gate that swings shut in front of the team: a shield', ability: use('gate', 'shield', 0xc8a070, { duration: 4 }) },
  { word: 'stump', look: 'a tree stump that pops up under the villain: trip, bonk', ability: use('stump', 'slam', 0x8a5a3a, { power: 3, status: 'stun', duration: 1.5 }) },
  { word: 'sack', look: 'a big cloth sack that drops over the villain: it cannot see!', ability: use('sack', 'slam', 0xd8c090, { power: 2, status: 'stun', duration: 2 }) },
  { word: 'dress', look: 'a sparkly twirl dress: she twirls, and the sparkles make the whole team strong again', ability: use('dress', 'heal', 0xff9ad5, { color2: 0xffd23f }) },
  { word: 'block', look: 'toy blocks raining down on the villain, clunk clunk', ability: use('block', 'rain', 0xe63946, { ...pic('block'), count: 8 }) },
  { word: 'bench', look: 'a big park bench that drops down on the villain, thump', ability: use('bench', 'slam', 0x8a5a3a, { power: 3 }) },
  { word: 'skunk', look: 'a skunk turns round and makes a big stinky cloud: the villain is dizzy, pee-yew', ability: use('skunk', 'cone', 0x9bd36a, { color2: 0x6a4a8a, status: 'stun', duration: 2 }) },
  // Item 126: a mom, a dad and a cow.
  { word: 'mom', look: 'a big mom hug for the whole team: everyone strong again', ability: use('mom', 'heal', 0xff8fb8, { color2: 0xffffff }) },
  { word: 'dad', look: 'a big strong dad who stands in front of the team, arms wide: a shield', ability: use('dad', 'shield', 0x5aa0ff, { duration: 4 }) },
  { word: 'cow', look: 'a big spotty cow that gallops straight through the villain, moo', ability: use('cow', 'dash', 0xffffff, { power: 3, color2: 0x333333 }) },
  // Item 058: the untaught-sounds words.
  { word: 'zoo', look: 'the whole zoo stampedes across the arena, a wave of animals', ability: use('zoo', 'wave', 0xffb347, { color2: 0x6ad66a }) },
  { word: 'zebra', look: 'a stripy zebra that gallops straight through the villain', ability: use('zebra', 'dash', 0xffffff, { power: 3 }) },
  { word: 'apple', look: 'apples raining down on the villain, bonk bonk', ability: use('apple', 'rain', 0xe63946, { ...pic('apple'), count: 10 }) },
  { word: 'igloo', look: 'an icy igloo that drops over the villain: frozen for a moment, brr', ability: use('igloo', 'freeze', 0xbfefff, { duration: 2 }) },
  { word: 'octopus', look: 'a friendly octopus whose eight arms wrap the villain up tight', ability: use('octopus', 'trap', 0xff6ad5, { glyph: '🐙', count: 3 }) },
  { word: 'umbrella', look: 'a giant umbrella that opens over the whole team: a shield', ability: use('umbrella', 'shield', 0x9b5de5, { duration: 4 }) },
  { word: 'xray', look: 'an x-ray beam that shines right through the villain, it can see its bones', ability: use('xray', 'beam', 0x7ad9ff, { color2: 0xffffff }) },
];

/**
 * The action words' effects (role `action`). The pre-037 move words keep the
 * flavour their roster abilities had (ZAP bolts, BAM a slam, HUG a shield);
 * a teammate with the word fires its own styled version instead.
 */
const ACTION_EFFECTS: WordEffect[] = [
  { word: 'zap', look: 'zaps of star power fired at the villain', ability: act('zap', 'bolt', 0xffd23f, { glyph: '⚡', count: 3, homing: true, shout: true }) },
  { word: 'bam', look: 'a ground pound, BAM, that knocks everyone flying', ability: act('bam', 'slam', 0xff8c42, { power: 3, shout: true }) },
  { word: 'zip', look: 'comets zipping round her, then at the villain', ability: act('zip', 'orbit', 0x3ae0ff, { glyph: '☄️', count: 5, duration: 1.4, color2: 0xffffff }) },
  { word: 'hop', look: 'a bunny hop: she pops up right beside the villain, boing', ability: act('hop', 'teleport', 0x9b5de5) },
  { word: 'pop', look: 'balloons raining down, pop pop pop', ability: act('pop', 'rain', 0xff5ab4, { glyph: '🎈', count: 12 }) },
  { word: 'hug', look: 'a big warm hug: a shield round the whole team', ability: act('hug', 'shield', 0xff9ad5, { duration: 4 }) },
  { word: 'big', look: 'she grows giant for a while, stomp stomp', ability: act('big', 'grow', 0x9b5de5, { duration: 5 }) },
  { word: 'hot', look: 'a breath of hot, hot fire', ability: act('hot', 'cone', 0xff7b00, { color2: 0xffd23f }) },
  { word: 'dig', look: 'holes dug in the ground: the villain falls in, whoops', ability: act('dig', 'trap', 0x8a5a2a, { glyph: '🕳️', count: 3 }) },
  { word: 'run', look: 'a running charge straight through the villain', ability: act('run', 'dash', 0xe63946) },
  { word: 'mud', look: 'mud pies raining down, splat', ability: act('mud', 'rain', 0x7a4a2a, { glyph: '🟤', count: 14 }) },
  { word: 'wet', look: 'splashes of water squirted at the villain', ability: act('wet', 'bolt', 0x7ad9ff, { glyph: '💧', count: 4, homing: true }) },
  { word: 'fog', look: 'a big grey fog blown over the villain: where did everyone go?', ability: act('fog', 'cone', 0xc0c8d0, { color2: 0xffffff }) },
  { word: 'tug', look: 'a rope that loops round the villain and tugs it tight', ability: act('tug', 'coil', 0xc8a070, { duration: 3 }) },
  { word: 'fix', look: 'a wrench of sparkles that fixes up the whole team', ability: act('fix', 'heal', 0x80ffdb) },
  // Item 037, level 1.
  { word: 'nap', look: 'sleepy Zs that put the villain to sleep', ability: act('nap', 'bolt', 0xaec8ff, { glyph: '💤', count: 3, status: 'stun', duration: 3, homing: true }) },
  { word: 'wag', look: 'happy dogs that bound in, tails wagging', ability: act('wag', 'summon', 0xc8884a, { minion: 'dog', count: 2 }) },
  { word: 'jab', look: 'boxing gloves that boing out, jab jab jab', ability: act('jab', 'bolt', 0xe63946, { glyph: '🥊', count: 3, homing: true, shout: true }) },
  { word: 'red', look: 'splats of red paint all over the villain', ability: act('red', 'bolt', 0xe63946, { glyph: '🔴', count: 6, color2: 0xff8a8a }) },
  { word: 'hex', look: 'a purple hex: glowing magic lines across the arena', ability: act('hex', 'grid', 0x9b5de5, { color2: 0xff9ad5, power: 3 }) },
  { word: 'jig', look: 'a twirly dance that spins through the baddies', ability: act('jig', 'spin', 0xff9ad5, { count: 3, color2: 0xffd23f }) },
  { word: 'mix', look: 'eggs and spoons tumbling down: a big mix-up', ability: act('mix', 'rain', 0xfff1d6, { glyph: '🥚', count: 12 }) },
  { word: 'jog', look: 'she jogs in circles round the baddies, bumping each one', ability: act('jog', 'spin', 0x2a9d8f, { count: 3 }) },
  { word: 'bop', look: 'a squeaky toy hammer bops the villain on the head: seeing stars', ability: act('bop', 'bolt', 0xff8c42, { glyph: '🔨', count: 1, power: 3, status: 'stun', duration: 1.5, homing: true }) },
  { word: 'dot', look: 'polka dots pelting the villain, dot dot dot', ability: act('dot', 'bolt', 0x3a86ff, { glyph: '🔵', count: 7 }) },
  { word: 'hum', look: 'music notes hummed at the villain, it sways', ability: act('hum', 'bolt', 0xb15cff, { glyph: '🎵', count: 4, homing: true }) },
  { word: 'yum', look: 'a yummy snack for the team: everyone feels better', ability: act('yum', 'heal', 0xffb3c6, { color2: 0xffd23f }) },
  // Item 037, level 2.
  { word: 'jump', look: 'a big jump and a slam down from above', ability: act('jump', 'slam', 0x3a86ff, { power: 3, shout: true }) },
  { word: 'spin', look: 'a spin so fast it whirls through every baddie', ability: act('spin', 'spin', 0x3ae0ff, { count: 4, color2: 0xffffff }) },
  { word: 'swim', look: 'she swims in on a big blue wave', ability: act('swim', 'wave', 0x3a86ff, { color2: 0xbfefff }) },
  { word: 'flip', look: 'pancakes flipped high, landing on the villain', ability: act('flip', 'bolt', 0xffbe0b, { glyph: '🥞', count: 3, homing: true }) },
  { word: 'stomp', look: 'a dino stomp that sends a shockwave across the arena', ability: act('stomp', 'wave', 0x6ad66a, { color2: 0xc8a070, power: 3, status: 'stun', duration: 1.5 }) },
  { word: 'slam', look: 'a leap and a SLAM that shakes the whole arena', ability: act('slam', 'slam', 0xff5a3c, { power: 3, color2: 0xffd23f }) },
  { word: 'grab', look: 'a grabber claw that shoots out and grabs the villain', ability: act('grab', 'bolt', 0xc0c8d0, { ...pic('grab'), count: 1, power: 3, status: 'stun', duration: 2, homing: true }) },
  { word: 'clap', look: 'a thunder clap: booms strike down from the sky', ability: act('clap', 'lightning', 0xffd23f, { count: 3, color2: 0xffffff }) },
  { word: 'bump', look: 'a bumper car that bumps right through the villain', ability: act('bump', 'dash', 0xff5ab4, { power: 3 }) },
  { word: 'snap', look: 'snappy crocodile jaws hidden on the ground: SNAP!', ability: act('snap', 'trap', 0x2ec27e, { glyph: '🐊', count: 3 }) },
  { word: 'skip', look: 'skipping stones that bounce, bounce, bonk', ability: act('skip', 'bolt', 0xa0a0a0, { glyph: '⚪', count: 4, homing: true }) },
  { word: 'twist', look: 'a twisty tornado that wraps round the villain', ability: act('twist', 'coil', 0xbfefff, { duration: 3, color2: 0xffffff }) },
  { word: 'melt', look: 'a wave of warm, gooey melt sweeping across', ability: act('melt', 'wave', 0xffb347, { color2: 0xfff1d6 }) },
  { word: 'lift', look: 'balloons lift the villain up, up and away, then pop!', ability: act('lift', 'polymorph', 0xff5ab4, { status: 'bubble', duration: 2.5, color2: 0x9ad8ff }) },
  { word: 'plop', look: 'big drops of water plopping down, splosh', ability: act('plop', 'rain', 0x3a86ff, { glyph: '💦', count: 8, power: 3 }) },
  { word: 'flop', look: 'a giant belly flop onto the villain', ability: act('flop', 'slam', 0xff9ad5, { power: 3 }) },
  { word: 'trap', look: 'mouse traps hidden on the ground: snap!', ability: act('trap', 'trap', 0xc8a070, { glyph: '🧀', count: 3 }) },
  { word: 'blast', look: 'a rocket blast beamed at the villain', ability: act('blast', 'beam', 0xff6a3a, { color2: 0xffd23f, power: 3 }) },
  { word: 'drip', look: 'big drips of water plopping down on the villain', ability: act('drip', 'rain', 0x7cc7ff, { glyph: '💧', count: 14 }) },
  // Item 037, level 3.
  { word: 'chop', look: 'she pops up beside the villain: karate chop!', ability: act('chop', 'teleport', 0xffd6a5, { power: 3, shout: true }) },
  { word: 'kick', look: 'balls kicked at the villain, goal!', ability: act('kick', 'bolt', 0xffffff, { glyph: '⚽', count: 3, homing: true, shout: true }) },
  { word: 'rush', look: 'a rush of wind that blows the villain back', ability: act('rush', 'cone', 0xbaf2ff, { color2: 0xffffff }) },
  // Item 121: the farm and the chase.
  { word: 'chomp', look: "a giant dragon's jaws that chomp down on the villain, CHOMP", ability: act('chomp', 'slam', 0xd62828, { power: 3, shout: true, color2: 0xffffff }) },
  { word: 'dash', look: 'she dashes straight through the villain, zoom', ability: act('dash', 'dash', 0x3ae0ff, { power: 3, color2: 0xffffff }) },
  { word: 'swish', look: 'a swish of a farm scythe sends a wave of cut grass flying at the villain', ability: act('swish', 'cone', 0x6ad66a, { color2: 0xffffff }) },
  { word: 'smash', look: 'a mighty hammer smash that cracks the ground under the villain', ability: act('smash', 'slam', 0xb04aff, { power: 3, shout: true }) },
  { word: 'crash', look: 'thunder crashes down from the sky on the villain, CRASH', ability: act('crash', 'lightning', 0xffd23f, { count: 3, color2: 0xbfefff }) },
  { word: 'splash', look: 'a big splash of water that soaks the villain: it shakes itself dry, dizzy', ability: act('splash', 'wave', 0x3a86ff, { color2: 0xffffff, status: 'stun', duration: 1.5 }) },
  // Item 056: Q's move word.
  { word: 'quest', look: 'a quest! a glowing map path leads her straight through the villain', ability: act('quest', 'dash', 0xffd23f, { power: 3, color2: 0xffffff }) },
];

export const EFFECTS: WordEffect[] = [...THING_EFFECTS, ...ACTION_EFFECTS];

export const EFFECT_BY_WORD: Record<string, WordEffect> = Object.fromEntries(EFFECTS.map((e) => [e.word, e]));
