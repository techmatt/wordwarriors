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
 * The word itself is drawn from the bank (`giftWord` in src/episode/Episode.ts)
 * and can be any action word, so no line names it or hints at which: the last
 * line trails off ("...and it goes...") into the narrator's `gift_word_<word>`
 * line ("Zap!"). The gift word is a move pad, deliberately said, like "Use
 * zap!". Then `circle` sends her to the glowing circle, and `done` follows
 * once the word has flown into her.
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

import { hubAnyKey, hubLine, narratorLine } from '../voice/ids.js';
import { variantIndex, type Line } from './quests.js';

export interface HubStory {
  /** What the word is written on: an art id (`prop_...`), or an emoji drawn on a card. */
  prop: string;
  /** Two to four lines; the last trails off into the gift word. */
  lines: Line[];
  /** Sends her to the glowing circle. Yellow says it again. */
  circle: Line;
  /** Once the word has flown into her. */
  done: Line;
}

const S = (prop: string, lines: string[], circle: string, done: string): HubStory => ({
  prop,
  lines: lines.map((text) => ({ text })),
  circle: { text: circle },
  done: { text: done },
});

const SPOT = (what: string) => `Stand on the glowing spot, and press green, ${what}!`;
const CIRCLE = (what: string) => `Stand in the glowing circle, and press green, ${what}!`;

export const HUB_SCENES: Record<string, HubStory[]> = {
  // Builder Dada Matt: gadgets from the treehouse workshop.
  dada_matt: [
    S('🛠️', [
      'I have been building something special for you, all night long!',
      'Bolts here, a little hammering there, and one shiny button.',
      'When you press the button, it goes...',
    ], SPOT('to charge it up'), 'It is all yours now, let us look around!'),
    S('🤖', [
      'Look what I built in my workshop, a little helper robot!',
      'It only knows one word, and it shouts it super loud.',
      'Wind it up, and it says...',
    ], SPOT('to make it yours'), 'Your robot is ready, let us look around!'),
    S('🔨', [
      'Every builder needs a power tool, so I made you one!',
      'It is the size of a banana, and it makes a mighty noise.',
      'Switch it on, and it goes...',
    ], SPOT('to power it up'), 'Careful, it is very strong, let us look around!'),
  ],
  // Lifter Dada Matt: a workout move from the forest gym.
  dada_matt_lifter: [
    S('🏋️', [
      'Warm up time, stretch up high, and touch your toes!',
      'Now I will show you my best workout move, it makes the squirrels cheer.',
      'Ready, steady, and shout...',
    ], SPOT('to power up'), 'Look at those muscles, let us look around!'),
    S('💪', [
      'Every champion has a secret move, and today you get mine!',
      'I practised it on a tree, and the tree said wow.',
      'Take a deep breath, and shout...',
    ], SPOT('to get strong'), 'You are a champion now, let us look around!'),
  ],
  // Cyber Dada Matt: a program for her armour.
  dada_matt_cyber: [
    S('💾', [
      'Your armour needs a new program, so I wrote one just for you!',
      'The screens are blinking, it is loading, nearly there.',
      'Start the program, and it goes...',
    ], SPOT('to upload it'), 'Upload complete, let us look around!'),
    S('💻', [
      'I typed a secret code for your armour, a hundred lines long!',
      'It only needs one word to start it up.',
      'The secret code word is...',
    ], SPOT('to load the code'), 'Your armour knows the code now, let us look around!'),
  ],
  // Spell-blade Dada Matt: a rune spell.
  dada_matt_blade: [
    S('prop_scroll', [
      'A sword is good, but a sword and a spell is even better!',
      'This rune glows when a hero is ready, and look, it is glowing for you.',
      'Say it with me, the rune says...',
    ], 'Stand in the rune circle, and press green, to learn it!', 'Sword and spell, you have both now, let us look around!'),
    S('prop_silver_sword', [
      'Every rune knight carves one magic word on their sword.',
      'I carved one on this little sword, just for you.',
      'Hold it up high, and say...',
    ], 'Stand in the rune circle, and press green, to take the sword!', 'A true rune knight, let us look around!'),
  ],
  // Chef Dada Jason: something cooked up in the secret kitchen.
  dada_jason: [
    S('🍲', [
      'A hero needs a good snack, so I am cooking up something special!',
      'A pinch of this, a sprinkle of that, and a good stir.',
      'Take one bite, and it goes...',
    ], SPOT('to taste it'), 'Delicious, now you are full of power, let us look around!'),
    S('🧁', [
      'In my secret kitchen, I bake magic cupcakes.',
      'This one has rainbow sprinkles, and a surprise inside.',
      'One nibble, and you will shout...',
    ], SPOT('to eat it up'), 'Every crumb is gone, let us look around!'),
    S('🥣', [
      'My grandma taught me a magic soup, and now I will teach you!',
      'It bubbles and it sizzles, and it smells like winning.',
      'One spoonful, and the soup says...',
    ], SPOT('to have a spoonful'), 'Yummy and mighty, let us look around!'),
  ],
  // Warrior Dada Jason: a knight's battle trick.
  dada_jason_warrior: [
    S('🛡️', [
      'Every knight learns a battle trick, and now it is your turn!',
      'Shield up, feet ready, eyes on the bad guy.',
      'Then charge, and shout...',
    ], SPOT('to learn the trick'), 'Well done, brave knight, let us look around!'),
    S('⚔️', [
      'Knights have a battle cry, so the bad guys know we are coming!',
      'Mine is so loud, it scares the crows off the castle.',
      'Here is yours, take a breath, and shout...',
    ], SPOT('to learn the battle cry'), 'What a mighty knight, let us look around!'),
  ],
  // Warlock Dada Jason: a spooky spell, or a potion.
  dada_jason_warlock: [
    S('prop_scroll', [
      'In my moon tower, I keep a book of spooky spells.',
      'This one is not too spooky, just spooky enough.',
      'Wave your arms, and say...',
    ], 'Stand in the magic circle, and press green, to learn the spell!', 'You know a spooky spell now, let us look around!'),
    S('🧪', [
      'I brewed a purple potion, under the light of the moon.',
      'It fizzes, it bubbles, and it tickles your nose.',
      'Drink it up, and you will say...',
    ], 'Stand in the magic circle, and press green, to drink the potion!', 'Spooky and strong, let us look around!'),
  ],
  // Ellie: a toy she shares.
  ellie: [
    S('🔵', [
      'I want to share my favourite bubble with you!',
      'It is the biggest, shiniest bubble in the whole castle.',
      'Blow on it, and it goes...',
    ], 'Stand in the bubble circle, and press green, to catch it!', 'Now we both have bubble power, let us look around!'),
    S('🧸', [
      'This is my teddy, and he knows a secret word.',
      'I am going to share him with you, because sharing is nice.',
      'Squeeze him, and he says...',
    ], CIRCLE('to give him a cuddle'), 'Thank you for looking after teddy, let us look around!'),
    S('🎈', [
      'I have a magic balloon, and I am going to share it!',
      'It floats, it bounces, and it whispers.',
      'Listen, the balloon whispers...',
    ], CIRCLE('to catch the balloon'), 'Now the balloon is yours, let us look around!'),
  ],
  // Scar: an upgrade from the robot workshop.
  scar: [
    S('🔋', [
      'I have an upgrade for your armour, fresh from my workshop!',
      'Hold still, installing, this will only tickle a little.',
      'Upgrade ready, it goes...',
    ], 'Stand on the charging spot, and press green, to install it!', 'Upgrade installed, let us look around!'),
    S('🔩', [
      'My power core made a spare spark, and I saved it for you!',
      'It is warm and glowy, and it buzzes when it is happy.',
      'Switch it on, and it goes...',
    ], 'Stand on the charging spot, and press green, to power up!', 'Spark installed, let us look around!'),
    S('🛰️', [
      'Robots have special codes, and I am giving you mine!',
      'Do not tell the bad guys, it is super secret.',
      'Say it out loud, the code is...',
    ], 'Stand on the charging spot, and press green, to load the code!', 'Code loaded, let us look around!'),
  ],
  seraphina: [
    S('🐉', [
      'My dragons taught me a trick, and now I will teach you!',
      'You call, they fly, and the bad guys hide.',
      'Just call out...',
    ], CIRCLE('to learn it'), 'The dragons will listen to you now, let us look around!'),
    S('prop_scroll', [
      'Here is an old dragon scroll, it was hidden in a cave.',
      'Only a dragon friend may read it, and that is you.',
      'The scroll says...',
    ], CIRCLE('to take the scroll'), 'Now you are a dragon friend, let us look around!'),
  ],
  smaug: [
    S('💰', [
      'I am a dragon, so of course I have treasure!',
      'But this treasure is special, it is a word made of gold.',
      'Shiny, shiny, and it says...',
    ], CIRCLE('to take it'), 'Keep it safe, treasure friend, let us look around!'),
    S('💎', [
      'I found a magic jewel in my pile of gold, and I want you to have it.',
      'Dragons do not usually share, but you are my friend.',
      'Rub the jewel, and it says...',
    ], CIRCLE('to take the jewel'), 'Shiny and strong, let us look around!'),
  ],
  tiamat: [
    S('👑', [
      'A dragon queen knows many royal words, and I will give you one!',
      'Use it well, little hero, and stand up tall.',
      'By royal order, the word is...',
    ], 'Stand in the royal circle, and press green, to receive it!', 'Wonderful, you are royal now, let us look around!'),
    S('prop_scroll', [
      'This scroll is older than the mountain, and it has one spell inside.',
      'I have kept it safe for a thousand years, just for you.',
      'Unroll it, and it says...',
    ], 'Stand in the royal circle, and press green, to take the scroll!', 'A royal spell for a royal friend, let us look around!'),
  ],
  elsa: [
    S('❄️', [
      'Every snowflake is different, and this one is magic!',
      'I made it just for you, it sparkles every colour.',
      'Catch it, and it whispers...',
    ], 'Stand in the frosty circle, and press green, to catch it!', 'That is a cool spell, let us look around!'),
    S('prop_scroll', [
      'In my ice castle, the walls keep frozen spells.',
      'This one came out of the ice this morning, for you.',
      'The frozen spell says...',
    ], 'Stand in the frosty circle, and press green, to learn the spell!', 'Frosty and fierce, let us look around!'),
  ],
  anna: [
    S('🛡️', [
      'My sister does the magic, but I know a brave trick!',
      'Shield up, chin up, and never give up.',
      'Then you shout...',
    ], SPOT('to learn it'), 'You are as brave as anything now, let us look around!'),
    S('🍫', [
      'Being brave makes me hungry, so here is my lucky chocolate.',
      'One bite, and you feel strong all over.',
      'Take a bite, and you say...',
    ], SPOT('to have a bite'), 'Brave and full, let us look around!'),
  ],
  jasmine: [
    S('✨', [
      'My flying carpet knows a magic word, and it told me a secret.',
      'It wants you to have the word too.',
      'Whisper it to the wind, it is...',
    ], CIRCLE('to catch the word'), 'The wind will help you now, let us look around!'),
    S('💎', [
      'At the oasis, I found a treasure under the palm tree.',
      'It is a magic jewel, and it glows when you are brave.',
      'Rub it, and it says...',
    ], CIRCLE('to take the jewel'), 'It is glowing for you, let us look around!'),
  ],
  ozymandias: [
    S('prop_scroll', [
      'I am a pharaoh, and pharaohs keep secrets in the pyramids.',
      'This secret is very old, and very powerful.',
      'Here it is, the secret word is...',
    ], 'Stand in the golden circle, and press green, to learn it!', 'Mighty, you know a pharaoh secret now, let us look around!'),
    S('prop_stone', [
      'This old stone has a magic word carved on it.',
      'Long ago, it helped me win every battle.',
      'Touch the stone, and it says...',
    ], 'Stand in the golden circle, and press green, to take the word!', 'Strong as stone, let us look around!'),
  ],
  jormungandr: [
    S('🐚', [
      'Deep in my grotto, I found a magic shell.',
      'Hold it to your ear, and you will hear a word inside.',
      'Listen, the shell says...',
    ], CIRCLE('to take the shell'), 'The sea is on your side now, let us look around!'),
    S('🦪', [
      'The sea gave me a pearl, and the pearl has a secret.',
      'I curled my tail around it for a hundred years, to keep it safe.',
      'Open it up, and it says...',
    ], CIRCLE('to take the pearl'), 'Keep it close, let us look around!'),
  ],
  moriarty: [
    S('🃏', [
      'Pick a card, any card, no, not that one, this one!',
      'It is my best trick card, and now it belongs to you.',
      'Turn it over, and it says...',
    ], CIRCLE('to take the card'), 'A true magician, let us look around!'),
    S('🎩', [
      'Every good magician has a magic word, and I will lend you mine.',
      'Do not tell anybody, it is my favourite.',
      'Wave your arms like a magician, and say...',
    ], CIRCLE('to learn it'), 'Now you know my best trick, let us look around!'),
  ],
  bavmorda: [
    S('🧪', [
      'My cauldron has been bubbling all morning, for you!',
      'Flower petals, a bit of moonlight, and one giggle.',
      'Drink up, and the potion says...',
    ], 'Stand in the magic circle, and press green, to drink it!', 'A kind potion for a kind hero, let us look around!'),
    S('prop_scroll', [
      'I am a good witch now, and good witches share their spells.',
      'This one is my favourite, it smells like roses.',
      'Say it with me, the spell is...',
    ], 'Stand in the magic circle, and press green, to learn the spell!', 'A kind spell for a kind hero, let us look around!'),
  ],
  rilla: [
    S('🍌', [
      'Rilla strong, and Rilla share, here is my power banana!',
      'Eat the banana, and you get a mighty power.',
      'Then thump your tummy, and shout...',
    ], SPOT('to get the power'), 'Now you are gorilla strong, let us look around!'),
    S('🦾', [
      'My robot arms are very strong, but my best trick is a word.',
      'I am giving it to you, because you are my friend.',
      'Fists up, and shout...',
    ], SPOT('to get the trick'), 'Strong like Rilla, let us look around!'),
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
  ], CIRCLE('to take it'), 'It is yours now, let us look around!'),
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
