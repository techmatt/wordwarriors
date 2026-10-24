/**
 * The hub's story scene (item 037): how the helper gives her the word she
 * takes into the fight, as data.
 *
 * It replaced "I will teach you a magic spell". Each helper (every roster id
 * but Julia, each dad form apart) has a few scenes and each episode draws one
 * (src/rules/story.ts; `?cast=default` always plays the first). A scene is a
 * few short lines that fit the helper and their quest place: a spell from a
 * caster, something chef Dada Jason cooks up, a gadget builder Dada Matt
 * builds, an upgrade from Scar, a toy Ellie shares.
 *
 * The word itself is drawn from the bank (`drawGift` in src/rules/moves.ts, via
 * `giftWord` in src/episode/plans.ts) and can be any action word, so no line names it or hints at which: the last
 * line trails off ("...and it goes...") into the narrator's `gift_word_<word>`
 * line ("Zap!"). The gift word is a move pad, deliberately said, like "Use
 * zap!". Then `circle` sends her to the scene's spot, and `done` follows
 * once the word has flown into her.
 *
 * `spot` is what she stands at to take it (item 138): the magic circle for a
 * spell, else a pickup that fits the story, the scene's prop standing on it (a
 * dish on a plate, a gadget on a tool table, a charging pad). The `circle` line
 * names it, so each spot's line comes from its own builder below.
 *
 * `prop` is what pops up over the helper with the word written on it: an art
 * id (`prop_scroll`), or an emoji drawn on a card.
 *
 * Every line is said before the side rooms, so the episode keeps the chosen
 * scene's words out of the key-word draw, and no line holds a bank word
 * (rules.test.ts): not a thing she may read, and not an action, which could be
 * this very gift. No interjections; commas, not a mid-line "!" or "."
 * (edge-tts leaves dead air after one).
 *
 * Voiced as `hub_<owner>_<n>_<key>` (content/voice/ids.ts `hubLine`) in the
 * owner's person's voice, in that person's narrator group. A helper without
 * scenes gets `ANY_SCENES`, composed per narrator (`hub_any_<n>_<key>`).
 */

import { hubAnyKey, hubLine, narratorLine, type SpokenLine } from '../voice/ids.js';
import { variantIndex } from './quests.js';

/**
 * What she stands at to take the gift (item 138), drawn in code by
 * src/world/giftSpot.ts: `magic` the rune circle (a spell, a potion, a royal
 * word); the rest a pickup, the scene's prop on top: `plate` (a dish), `tools`
 * (a builder's gadget on his tool table), `charger` (a robot's charging pad, an
 * upload, a launch pad), `training` (a workout or a battle trick), `blanket` (a
 * toy shared), `nest` (a baby dragon's straw), `treasure` (gold, a jewel).
 */
export type GiftSpot = 'magic' | 'plate' | 'tools' | 'charger' | 'training' | 'blanket' | 'nest' | 'treasure';

export interface HubStory {
  /** What the word is written on: an art id (`prop_...`), or an emoji drawn on a card. */
  prop: string;
  /** Two to four lines; the last trails off into the gift word. */
  lines: SpokenLine[];
  /** What she stands at to take it. */
  spot: GiftSpot;
  /** Sends her to the spot, naming it. Yellow says it again. */
  circle: SpokenLine;
  /** Once the word has flown into her. */
  done: SpokenLine;
}

/** The line sending her to a spot, and that spot. A bare string is a magic circle's line. */
interface Go {
  spot: GiftSpot;
  text: string;
}

const S = (prop: string, lines: string[], go: Go | string, done: string): HubStory => {
  const { spot, text } = typeof go === 'string' ? { spot: 'magic' as const, text: go } : go;
  return { prop, lines: lines.map((text) => ({ text })), spot, circle: { text }, done: { text: done } };
};

// Each spot's line names the thing she can see (no bank word: MAT, RUG, NEST, BENCH and CHEST are).
const go = (spot: GiftSpot, where: string) => (what: string): Go => ({ spot, text: `${where}, and press green, ${what}!` });
const CIRCLE = (what: string) => `Stand in the glowing circle, and press green, ${what}!`;
const PLATE = go('plate', 'Stand by the plate');
const TOOLS = go('tools', 'Stand by the tool table');
const CHARGER = go('charger', 'Stand on the charging spot');
const UPLOAD = go('charger', 'Stand on the upload pad');
const LAUNCH = go('charger', 'Stand on the launch pad');
const TRAINING = go('training', 'Stand on the training spot');
const BLANKET = go('blanket', 'Stand on the blanket');
const NEST = go('nest', 'Stand by the straw');
const TREASURE = go('treasure', 'Stand by the treasure');

export const HUB_SCENES: Record<string, HubStory[]> = {
  // Builder Dada Matt: gadgets from the treehouse workshop.
  dada_matt: [
    S('🛠️', [
      'I have been building something special for you, all night long!',
      'I put in some bolts, did a little hammering, and added one shiny button.',
      'When you press the button, it goes...',
    ], TOOLS('to charge it up'), 'It is all yours now, let\'s look around!'),
    S('🤖', [
      'Look what I built in my workshop, a little helper robot!',
      'It only knows one word, and it shouts it super loud.',
      'Wind it up, and it says...',
    ], TOOLS('to make it yours'), 'Your robot is ready, let\'s look around!'),
    S('🔨', [
      'Every builder needs a power tool, so I made you one!',
      'It is the size of a banana, and it makes a mighty noise.',
      'Switch it on, and it goes...',
    ], TOOLS('to power it up'), 'Careful, it is very strong, let\'s look around!'),
    // Item 121: Dad's sneaky orc-castle story.
    S('🏰', [
      'You know my story about the orc castle, where we sneaked in for the stolen treasure!',
      'So I built you a sneaky gadget, it tiptoes past the orcs without one squeak.',
      'When the orcs are snoring, it whispers...',
    ], TOOLS('to switch it on'), 'Now you are a sneaky hero too, let\'s look around!'),
  ],
  // Lifter Dada Matt: a workout move from the forest gym.
  dada_matt_lifter: [
    S('🏋️', [
      'It is time to warm up, so stretch up high, and touch your toes!',
      'Now I will show you my best workout move, it makes the squirrels cheer.',
      'Get ready, get set, and shout...',
    ], TRAINING('to power up'), 'Look at those muscles, let\'s look around!'),
    S('💪', [
      'Every champion has a secret move, and today you get mine!',
      'I practiced it on an old oak, and the oak said wow.',
      'Take a deep breath, and shout...',
    ], TRAINING('to get strong'), 'You are a champion now, let\'s look around!'),
    // Item 121: farm work, the Stardew way.
    S('🪓', [
      'Farmers get strong from hard work, so here is your very own axe!',
      'We split the wood, we cut the meadow down with a scythe, and carry it all to the barn.',
      'Then flex your muscles, and shout...',
    ], TRAINING('to get strong'), 'What a strong farmer you are, let\'s look around!'),
  ],
  // Cyber Dada Matt: a program for her powers (item 071: not her armour, she wears none).
  dada_matt_cyber: [
    S('💾', [
      'Your powers need a new program, so I wrote one just for you!',
      'The screens are blinking, and it is loading, it is nearly done.',
      'Start the program, and it goes...',
    ], UPLOAD('to upload it'), 'The upload is all done, let\'s look around!'),
    S('💻', [
      'I typed a secret code for your powers, a hundred lines long!',
      'It only needs one word to start it up.',
      'The secret code word is...',
    ], UPLOAD('to load the code'), 'Your powers know the code now, let\'s look around!'),
  ],
  // Spell-blade Dada Matt: a rune spell.
  dada_matt_blade: [
    S('prop_scroll', [
      'A sword is good, but a sword and a spell is even better!',
      'This rune glows when a hero is ready, and look, it is glowing for you.',
      'Say it with me, the rune says...',
    ], 'Stand in the rune circle, and press green, to learn it!', 'Now you have a sword and a spell, let\'s look around!'),
    S('prop_silver_sword', [
      'Every rune knight carves one magic word on their sword.',
      'I carved one on this little sword, just for you.',
      'Hold it up high, and say...',
    ], 'Stand in the rune circle, and press green, to take the sword!', 'You are a true rune knight now, let\'s look around!'),
  ],
  // Chef Dada Jason: something cooked up in the secret kitchen.
  dada_jason: [
    S('🍲', [
      'A hero needs a good snack, so I am cooking up something special!',
      'I add a pinch of this, a sprinkle of that, and give it a good stir.',
      'Take one bite, and it goes...',
    ], PLATE('to taste it'), 'That was delicious, and now you are full of power, let\'s look around!'),
    S('🧁', [
      'In my secret kitchen, I bake magic cupcakes.',
      'This one has rainbow sprinkles, and a surprise inside.',
      'One nibble, and you will shout...',
    ], PLATE('to eat it up'), 'Every crumb is gone, let\'s look around!'),
    S('🥣', [
      'My grandma taught me a magic soup, and now I will teach you!',
      'It bubbles and it sizzles, and it smells like winning.',
      'One spoonful, and the soup says...',
    ], PLATE('to have a spoonful'), 'That was yummy, and now you are mighty, let\'s look around!'),
    // Item 121: cooking the farm's crops, the Stardew way.
    S('🥕', [
      'I picked the best crops on the whole farm this morning, carrots, pumpkins and corn!',
      'I stirred them into a farm stew, and it smells like summer.',
      'One taste of farm stew, and it goes...',
    ], PLATE('to taste it'), 'Fresh from the farm, and full of power, let\'s look around!'),
  ],
  // Warrior Dada Jason: a knight's battle trick.
  dada_jason_warrior: [
    S('🛡️', [
      'Every knight learns a battle trick, and now it is your turn!',
      'Hold your shield up, get your feet ready, and keep your eyes on the bad guy.',
      'Then charge, and shout...',
    ], TRAINING('to learn the trick'), 'Well done, brave knight, let\'s look around!'),
    S('⚔️', [
      'Knights have a battle cry, so the bad guys know we are coming!',
      'Mine is so loud, it scares the crows off the castle.',
      'Here is yours, take a breath, and shout...',
    ], TRAINING('to learn the battle cry'), 'What a mighty knight you are, let\'s look around!'),
    // Item 121: the orc castle, the stolen treasure and the chase.
    S('💰', [
      'Last night the orcs took the magic treasure, and hid it in their castle!',
      'We sneaked in, we got it back, and then the orcs chased us all the way home.',
      'Now the treasure is yours, and when you hold it, it says...',
    ], TREASURE('to hold it'), 'We got away, brave knight, let\'s look around!'),
  ],
  // Warlock Dada Jason: a spooky spell, or a potion.
  dada_jason_warlock: [
    S('prop_scroll', [
      'In my moon tower, I keep a book of spooky spells.',
      'This one is not too spooky, just spooky enough.',
      'Wave your arms, and say...',
    ], 'Stand in the magic circle, and press green, to learn the spell!', 'You know a spooky spell now, let\'s look around!'),
    S('🧪', [
      'I brewed a purple potion, under the light of the moon.',
      'It fizzes, it bubbles, and it tickles your nose.',
      'Drink it up, and you will say...',
    ], 'Stand in the magic circle, and press green, to drink the potion!', 'Now you are spooky and strong, let\'s look around!'),
  ],
  // Ellie: a toy she shares.
  ellie: [
    // M55 (hunt 10): a drawn bubble, not 🔵 (DOT's own glyph; 🫧 does not draw on Windows 10).
    S('prop_bubble', [
      'I want to share my favorite bubble with you!',
      'It is the biggest, shiniest bubble in the whole castle.',
      'Blow on it, and it goes...',
    ], BLANKET('to catch it'), 'Now we both have bubble power, let\'s look around!'),
    S('🧸', [
      'This is my teddy, and he knows a secret word.',
      'I am going to share him with you, because sharing is nice.',
      'Squeeze him, and he says...',
    ], BLANKET('to give him a cuddle'), 'Thank you for taking care of teddy, let\'s look around!'),
    S('🎈', [
      'I have a magic balloon, and I am going to share it!',
      'It floats, it bounces, and it whispers.',
      'Listen, the balloon whispers...',
    ], BLANKET('to catch the balloon'), 'Now the balloon is yours, let\'s look around!'),
    // Item 121: school.
    S('✏️', [
      'Today at school, my teacher showed us a magic word, and I saved it for you!',
      'I wrote it down in my best writing, with a sparkly pencil.',
      'Open my folder, and the paper says...',
    ], BLANKET('to take the paper'), 'Now we both know it, let\'s look around!'),
  ],
  // Scar: an upgrade from the robot workshop.
  scar: [
    S('🔋', [
      'I have an upgrade for your powers, fresh from my workshop!',
      'Hold still while I install it, it will only tickle a little.',
      'The upgrade is ready, and it goes...',
    ], CHARGER('to install it'), 'The upgrade is all done, let\'s look around!'),
    S('🔩', [
      'My power core made a spare spark, and I saved it for you!',
      'It is warm and glowy, and it buzzes when it is happy.',
      'Switch it on, and it goes...',
    ], CHARGER('to power up'), 'Your spark is all set, let\'s look around!'),
    S('🛰️', [
      'Robots have special codes, and I am giving you mine!',
      "Don't tell the bad guys, it is super secret.",
      'Say it out loud, the code is...',
    ], CHARGER('to load the code'), 'The code is loaded, let\'s look around!'),
    // Item 121: a dragon, robot style.
    S('🐉', [
      'I built a little robot dragon, with copper scales and a glowing tummy!',
      'It flaps around my workshop, and it breathes sparks instead of fire.',
      'Pat its nose, and it roars...',
    ], CHARGER('to meet the dragon'), 'The robot dragon likes you, let\'s look around!'),
  ],
  // Seraphina (item 111, Matt): the secret hatchery of Seraphina's Secret,
  // baby dragons fed and hidden from the grown-ups, her little pink dragon.
  seraphina: [
    S('🍓', [
      'The baby dragons are hungry, so we have to feed them their favorite berries!',
      'Munch quietly, babies, or the grown-ups will hear, and our secret is out.',
      'The littlest one gave a happy burp, and it sounded like...',
    ], PLATE('to say thank you'), 'The babies are full and sleepy, let\'s look around!'),
    S('🥚', [
      'This speckled one in the straw has been wiggling all morning, I think it is hatching!',
      'Keep it warm, and keep it secret, nobody else knows it is here.',
      'Crack, crack, and the baby dragon\'s very first word is...',
    ], NEST('to meet the baby'), 'You are a secret dragon keeper now, let\'s look around!'),
    S('🐉', [
      'My little pink dragon goes everywhere with me, even to sleep!',
      'It learned a brand new trick, just for you.',
      'Watch it flutter, and it squeaks...',
    ], NEST('to learn the trick'), 'Now it will fight right beside us, let\'s look around!'),
  ],
  smaug: [
    S('💰', [
      'I am a dragon, so of course I have treasure!',
      'But this treasure is special, it is a word made of gold.',
      'It is so shiny, and it says...',
    ], TREASURE('to take it'), 'Keep it safe, treasure friend, let\'s look around!'),
    S('💎', [
      'I found a magic jewel in my pile of gold, and I want you to have it.',
      'Dragons do not usually share, but you are my friend.',
      'Rub the jewel, and it says...',
    ], TREASURE('to take the jewel'), 'Now you are shiny and strong, let\'s look around!'),
  ],
  tiamat: [
    S('👑', [
      'A royal dragon knows many royal words, and I will give you one!',
      'Use it well, little hero, and stand up tall.',
      'By royal order, the word is...',
    ], 'Stand in the royal circle, and press green, to receive it!', 'Wonderful, you are royal now, let\'s look around!'),
    S('prop_scroll', [
      'This scroll is older than the mountain, and it has one spell inside.',
      'I have kept it safe for a thousand years, just for you.',
      'Unroll it, and it says...',
    ], 'Stand in the royal circle, and press green, to take the scroll!', 'That is a royal spell for a royal friend, let\'s look around!'),
  ],
  elsa: [
    S('❄️', [
      'Every snowflake is different, and this one is magic!',
      'I made it just for you, it sparkles in every color.',
      'Catch it, and it whispers...',
    ], 'Stand in the frosty circle, and press green, to catch it!', 'That is a cool spell, let\'s look around!'),
    S('prop_scroll', [
      'In my ice castle, the walls keep frozen spells.',
      'This one came out of the ice this morning, for you.',
      'The frozen spell says...',
    ], 'Stand in the frosty circle, and press green, to learn the spell!', 'Now you are frosty and fierce, let\'s look around!'),
    S('🎵', [
      'I carved you a little music maker, out of shiny ice.',
      'It plays a frosty tune, and at the very end, it sings one magic word.',
      'Wind it up, and listen, it sings...',
    ], 'Stand in the frosty circle, and press green, to hear the song!', 'That is a frosty spell for a warm heart, let\'s look around!'),
  ],
  anna: [
    S('🛡️', [
      'My sister does the magic, but I know a brave trick!',
      'Keep your shield up, keep your chin up, and never give up.',
      'Then you shout...',
    ], TRAINING('to learn it'), 'You are as brave as anything now, let\'s look around!'),
    S('🍫', [
      'Being brave makes me hungry, so here is my lucky chocolate.',
      'One bite, and you feel strong all over.',
      'Take a bite, and you say...',
    ], PLATE('to have a bite'), 'Now you are brave and full, let\'s look around!'),
    S('🎀', [
      'This is my lucky ribbon, I wear it on every adventure!',
      // Hunt 10, M49: "and it still stayed on" (IT was the ribbon, two lines back).
      'I tripped over a snowman this morning, and my lucky ribbon stayed on.',
      'Tie it on, stand up tall, and give a brave shout...',
    ], BLANKET('to tie it on'), 'Now we are adventure buddies, let\'s look around!'),
  ],
  jasmine: [
    S('✨', [
      'My flying carpet knows a magic word, and it told me a secret.',
      'It wants you to have the word too.',
      'Whisper it to the wind, it is...',
    ], CIRCLE('to catch the word'), 'The wind will help you now, let\'s look around!'),
    S('💎', [
      'At the oasis, I found a treasure under a tall palm.',
      'It is a magic jewel, and it glows when you are brave.',
      'Rub it, and it says...',
    ], TREASURE('to take the jewel'), 'It is glowing for you, let\'s look around!'),
    S('🏺', [
      'I found a magic jar by the oasis pool, and it is humming a tune.',
      'Give it a little shake, but not too hard, it is very ticklish.',
      'Shake, shake, and out puffs a word...',
    ], TREASURE('to catch the puff'), 'The jar is giggling, let\'s look around!'),
  ],
  // Item 114 (Matt): from Antarctica, with a rocket ship, a penguin crew and a crown of ice.
  ozymandias: [
    S('🚀', [
      'My silver rocket has a secret, and only the captain knows it.',
      'Today, you are my co-captain, so I will tell you.',
      'Count down with me, and the rocket roars...',
    ], LAUNCH('to launch the rocket'), 'Now you are a real space explorer, let\'s look around!'),
    S('🐧', [
      'My penguin crew found something frozen in the ice this morning.',
      'They pecked and pecked, and out came a word.',
      'The littlest penguin squawks...',
    ], TREASURE('to take the word'), 'The penguins are cheering for you, let\'s look around!'),
    S('👑', [
      'My crown is made of ice, and every crystal holds a word.',
      'This one sparkles the brightest, so it is yours.',
      'Hold it up to the stars, and it says...',
    ], TREASURE('to take the crystal'), 'Now you shine like an ice crown, let\'s look around!'),
  ],
  jormungandr: [
    // Item 056: a sea horn, since SHELL is a bank word now (and its picture no prop).
    S('📯', [
      'Deep in my grotto, I found a magic horn.',
      'Hold it to your ear, and you will hear a word inside.',
      'Listen, the horn says...',
    ], TREASURE('to take the horn'), 'The sea is on your side now, let\'s look around!'),
    S('🦪', [
      'The sea gave me a pearl, and the pearl has a secret.',
      'I curled my tail around it for a hundred years, to keep it safe.',
      'Open it up, and it says...',
    ], TREASURE('to take the pearl'), 'Keep it close, let\'s look around!'),
  ],
  moriarty: [
    S('🃏', [
      'Pick a card, any card, no, not that one, this one!',
      'It is my best trick card, and now it belongs to you.',
      'Turn it over, and it says...',
    ], CIRCLE('to take the card'), 'You are a true magician now, let\'s look around!'),
    S('🎩', [
      'Every good magician has a magic word, and I will lend you mine.',
      "Don't tell anybody, it is my favorite.",
      'Wave your arms like a magician, and say...',
    ], CIRCLE('to learn it'), 'Now you know my best trick, let\'s look around!'),
    // Item 114: a puzzle from his library, playful, never sinister.
    S('🧩', [
      'I built you a little puzzle, with twelve clockwork locks.',
      'Turn the little handle, click, click, click, and it springs open.',
      'Out comes a word, and it says...',
    ], CIRCLE('to solve the puzzle'), 'You solved my puzzle, clever you, let\'s look around!'),
  ],
  bavmorda: [
    S('🧪', [
      'My cauldron has been bubbling all morning, for you!',
      'I put in flower petals, a bit of moonlight, and one giggle.',
      'Drink up, and the potion says...',
    ], 'Stand in the magic circle, and press green, to drink it!', 'That is a kind potion for a kind hero, let\'s look around!'),
    S('prop_scroll', [
      'I am a good witch now, and good witches share their spells.',
      'This one is my favorite, it smells like roses.',
      'Say it with me, the spell is...',
    ], 'Stand in the magic circle, and press green, to learn the spell!', 'That is a kind spell for a kind hero, let\'s look around!'),
  ],
  rilla: [
    S('🍌', [
      'Bluerilla is strong, and Bluerilla likes to share, so here is my power banana!',
      'Eat the banana, and you get a mighty power.',
      'Then thump your tummy, and shout...',
    ], PLATE('to get the power'), 'Now you are gorilla strong, let\'s look around!'),
    // Item 113: Bluerilla is a living plush gorilla, not a robot.
    S('💪', [
      'My long furry arms are very strong, but my best trick is a word.',
      'I am giving it to you, with a soft fluffy cuddle, because you are my friend.',
      'Put your fists up, and shout...',
    ], TRAINING('to get the trick'), 'Now you are strong like Bluerilla, let\'s look around!'),
    // Item 114: a gentle giant's shoulder ride.
    S('🦍', [
      'Climb up on my furry shoulders, and hold on tight!',
      'From way up here, we see the whole jungle.',
      'Now give a happy thump with me, and shout...',
    ], TRAINING('to climb up'), 'That was the best shoulder ride ever, let\'s look around!'),
  ],
};

/**
 * The helpers who cast spells (item 038, Matt): their gift leans hard to a
 * word that sounds like a spell (the bank's `spell` words: ZAP, HEX, POP, not
 * MUD or NAP; `drawGift`), and only their scenes may call the gift a spell.
 * Moriarty's is a magician's magic word.
 */
export const CASTERS: ReadonlySet<string> = new Set(['elsa', 'bavmorda', 'tiamat', 'moriarty', 'dada_jason_warlock', 'dada_matt_blade']);

/** Anybody added without scenes: one scene, composed in every narrator's voice. */
export const ANY_SCENES: HubStory[] = [
  S('prop_scroll', [
    'I have something special for you, a word of power!',
    'Use it in the fight, and it goes...',
  ], CIRCLE('to take it'), 'It is yours now, let\'s look around!'),
];

/** The scene's line ids, in the order they are said. */
export interface HubStoryIds {
  lines: string[];
  circle: string;
  done: string;
}

/** A helper's scenes: their own, or the narrator-voiced fallback. */
export function scenesFor(helper: string): HubStory[] {
  return HUB_SCENES[helper] ?? ANY_SCENES;
}

/** Line ids of one scene: the owner's own, or `hub_any_<n>_<key>` in the narrator's voice. */
export function hubStoryIds(owner: string | null, narrator: string, n: number, story: HubStory): HubStoryIds {
  const id = (key: string) => (owner ? hubLine(owner, n, key) : narratorLine(narrator, hubAnyKey(n, key)));
  return { lines: story.lines.map((_, i) => id(`line${i + 1}`)), circle: id('circle'), done: id('done') };
}

/** The scene the helper plays, variant `n` (from 1, wrapped), with its line ids. `narrator` voices the fallback. */
export function hubStory(helper: string, narrator: string, n: number): { story: HubStory; ids: HubStoryIds } {
  const own = HUB_SCENES[helper];
  const list = own ?? ANY_SCENES;
  const i = variantIndex(n, list.length);
  const story = list[i]!;
  return { story, ids: hubStoryIds(own ? helper : null, narrator, i + 1, story) };
}

/** Every word a scene says, for the episode's said-before list. */
export function storyTexts(story: HubStory): string[] {
  return [...story.lines, story.circle, story.done].flatMap((l) => [l.text, l.say ?? '']);
}
