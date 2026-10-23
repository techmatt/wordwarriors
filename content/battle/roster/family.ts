/** Roster characters, in ROSTER order (./index.ts): Julia, her sister Ellie, her friend Seraphina, and the dads as themselves (builder Dada Matt, chef Dada Jason). */

import type { CharacterSpec } from '../types.js';
import { ab, ult } from './abilities.js';
import { MATT, JASON } from './dads.js';

export const FAMILY: CharacterSpec[] = [
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
];
