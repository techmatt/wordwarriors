/** Roster characters, in ROSTER order (./index.ts): The dads' other forms. */

import type { CharacterSpec } from '../types.js';
import { ab, ult } from './abilities.js';
import { MATT_FACE, MATT_LIFTER, JASON_FACE, MATT, JASON } from './dads.js';

export const DAD_FORMS: CharacterSpec[] = [
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
