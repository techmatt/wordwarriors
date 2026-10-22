/**
 * Everything the narrator says, as templates.
 *
 * The narrator is the episode's ally, or Dada Matt when there is no ally (Matt,
 * 2026-10-18). Every line below is composed once per possible narrator, so the
 * voice really is the ally's. The picks before an ally exists (`CORE_LINES`) are
 * always Dada Matt.
 *
 * Speech rule: voice everything EXCEPT the word she must read. No line here
 * contains a target word; the word is spoken only after she answers, by
 * `wordLine`. Hint lines sound out letters one by one and never blend them.
 *
 * No interjections ("Ha!", "Hmph") in lines: they are SFX (Matt, 2026-10-18).
 * No mid-line "!" or "." where a `say` with a comma would do, because edge-tts
 * leaves about 0.9 s of dead air after one.
 *
 * Placeholders: {hero} the hero's name, {villain} the villain's name,
 * {item} the counter item's name, {word} a move word, {helper} a helper's
 * name, {threat} the villain's house threat (wake lines only).
 */

import { FIGHTS, FIGHT_BEATS } from '../battle/fights.js';
import { RUNES } from '../phonics/runes.js';
import { chargeKey, fightKey, type HeroKind, type MoveKind, type SpokenLine, type VillainKind } from './ids.js';

export interface Template extends SpokenLine {
  key: string;
}

/** Said by Dada Matt only, before the ally is picked. */
export const CORE_LINES: Template[] = [
  { key: 'title', text: 'Welcome, Word Warrior! Press the green button to play!', say: 'Welcome, Word Warrior, press the green button to play!' },
  { key: 'pick_hero', text: 'Who will be our hero? Walk to one and press green!', say: 'Who will be our hero? Walk to one, and press green!' },
  { key: 'pick_ally', text: 'Who will help? Pick a friend, or nobody!', say: 'Who will help? Pick a friend, or nobody.' },
  { key: 'pick_villain', text: 'Who is the bad guy? Pick one, or the surprise!', say: 'Who is the bad guy? Pick one, or the surprise.' },
  { key: 'surprise', text: "It's a surprise villain!" },
  { key: 'nobody', text: "If nobody helps, I'll help you!" },
];

/** Composed per narrator. */
export const NARRATOR_LINES: Template[] = [
  { key: 'alarm_ready', text: 'We need to get ready!' },
  { key: 'prep_gem', text: "First, let's make a power gem!", say: "First, let's make a power gem." },
  { key: 'prep_ammo', text: "Let's make magic star ammo!", say: "Let's make magic star ammo." },
  { key: 'prep_helper', text: "Let's call a helper friend!", say: "Let's call a helper friend." },
  { key: 'inst_sound', text: 'Listen! Walk to the letter that makes this sound.', say: 'Listen, walk to the letter that makes this sound.' },
  { key: 'inst_blend', text: 'Walk on the letters, then pick the right door!' },
  { key: 'inst_picture', text: 'Read the word, then walk to its picture!' },
  { key: 'spell_this', text: 'Spell this one!' },
  // Item 087: a line she hears several times an episode has variants (`<key>_<n>`,
  // or the plain key then `<key>_2`...), said in turn across episodes
  // (src/episode/lineVariants.ts).
  { key: 'right_1', text: 'Yes! You did it!', say: 'Yes, you did it!' },
  { key: 'right_2', text: 'Great reading!' },
  { key: 'right_3', text: "That's the one!" },
  { key: 'right_4', text: 'Super duper!' },
  { key: 'right_5', text: 'Wow! You read that all by yourself!', say: 'Wow, you read that all by yourself!' },
  { key: 'right_6', text: "You're a reading star!" },
  { key: 'right_7', text: "That's right! Well done!", say: "That's right, well done!" },
  { key: 'right_8', text: 'You got it!' },
  { key: 'wrong_1', text: 'Oopsie! Try another one!', say: 'Oopsie, try another one!' },
  { key: 'wrong_2', text: "That's not the one! Try again!", say: "That's not the one, try again!" },
  { key: 'wrong_3', text: 'That one is ticklish! Try again!', say: 'That one is ticklish, try again!' },
  { key: 'wrong_4', text: "You were so close! Let's try another one!", say: "You were so close, let's try another one!" },
  { key: 'wrong_5', text: "Oops, that's a different one! Try again!", say: "Oops, that's a different one, try again!" },
  { key: 'wrong_6', text: "That's not it, but I know you'll find it!" },
  { key: 'made_gem', text: 'We made a power gem!' },
  { key: 'made_ammo', text: 'We made star ammo!' },
  { key: 'made_helper', text: 'A helper friend is here!' },
  { key: 'battle_start', text: "Let's go! Charge!", say: "Let's go, charge!" },
  { key: 'battle2_start', text: "It's round two, and this time we're ready!" },
  { key: 'move_pick', text: 'Quick, pick a move!' },
  { key: 'move_pick_2', text: "It's your move! Pick one!", say: "It's your move, pick one!" },
  { key: 'move_pick_3', text: 'Which move should we do?' },
  { key: 'move_pick_4', text: "Let's pick a move!" },
  // Item 059: said once she has picked the right move word and it fires,
  // supercharged ("Super power!" read oddly to Matt).
  { key: 'move_great', text: 'Great reading! Your word made it extra strong!', say: 'Great reading, your word made it extra strong!' },
  { key: 'move_great_2', text: 'Your reading made that move super strong!' },
  { key: 'move_great_3', text: 'You read it, and look how strong it is!' },
  { key: 'move_great_4', text: 'Your word powered it up! Way to go!', say: 'Your word powered it up, way to go!' },
  { key: 'move_great_5', text: 'Did you see that? Your reading did that!', say: 'Did you see that? Your reading did that!' },
  { key: 'move_great_6', text: 'Reading makes us stronger! Keep it up!', say: 'Reading makes us stronger, keep it up!' },
  { key: 'use_gem', text: "Let's make the power gem shine!" },
  { key: 'use_ammo', text: 'Fire the star ammo!' },
  { key: 'use_helper', text: "It's your turn, helper friend, go!" },
  { key: 'use_item', text: "Now's our chance! Let's use it!", say: "Now's our chance, let's use it!" },
  { key: 'retreat_1', text: "They're too strong for us! Let's go home and get ready!", say: "They're too strong for us, let's go home and get ready!" },
  { key: 'retreat_2', text: 'That was close! We need a plan!', say: 'That was close, we need a plan!' },
  { key: 'forge_intro', text: "Let's make it! Spell the magic words!", say: "Let's make it, spell the magic words!" },
  { key: 'finish', text: "Let's finish this together!" },
  { key: 'victory_1', text: 'We won! Hooray!', say: 'We won, hooray!' },
  { key: 'victory_1_2', text: 'We did it! We won!', say: 'We did it, we won!' },
  { key: 'victory_1_3', text: "Hooray, we won! Let's look at what you read!", say: "Hooray, we won, let's look at what you read!" },
  { key: 'victory_2', text: 'You are a real Word Warrior!' },
  { key: 'victory_2_2', text: "You're the best Word Warrior ever!" },
  { key: 'victory_2_3', text: 'Look at all that reading! You are a real Word Warrior!', say: 'Look at all that reading, you are a real Word Warrior!' },
  // The house (v0.2): the hub's doors and the sentence rooms. The hub's story
  // scene, which gives her the gift word, is the helper's own (item 037,
  // content/house/scenes.ts), composed in tools/voice/compose.ts.
  // Item 087: she finds the doors easily, so the door lines are short.
  { key: 'house_doors', text: 'Pick a door!' },
  { key: 'house_doors_2', text: "Let's pick a door!" },
  { key: 'house_doors_3', text: 'Which door do you want?' },
  { key: 'house_doors_4', text: 'Where should we go? Pick a door!', say: 'Where should we go? Pick a door!' },
  { key: 'house_more', text: 'One more door to go!' },
  { key: 'house_more_2', text: "Now let's try the other door!" },
  { key: 'house_more_3', text: 'We have one door left!' },
  { key: 'house_more_4', text: "Let's do the last door!" },
  { key: 'house_front', text: "The front door is open! Let's go!", say: "The front door is open, let's go!" },
  { key: 'secret_door', text: "Look, a secret door! Let's go up!", say: "Look, a secret door, let's go up!" },
  { key: 'house_ready', text: "We're ready! Let's go out the front door!", say: "We're ready, let's go out the front door!" },
  { key: 'room_listen', text: 'Listen!' },
  { key: 'room_listen_2', text: "Let's listen!" },
  { key: 'room_listen_3', text: "Here's a new one! Listen!", say: "Here's a new one, listen!" },
  { key: 'room_listen_4', text: 'Listen to this one!' },
  { key: 'room_your_turn', text: "Now it's your turn! Press green to read it.", say: "Now it's your turn, press green to read it." },
  { key: 'room_your_turn_2', text: 'Ready to read it? Press green!', say: 'Ready to read it? Press green!' },
  { key: 'room_your_turn_3', text: 'You read this one! Press green.', say: 'You read this one, press green.' },
  { key: 'room_your_turn_4', text: 'Your turn to read! Press green.', say: 'Your turn to read, press green.' },
  { key: 'room_find', text: 'Now find it, and press green!' },
  { key: 'room_find_2', text: 'Where is it? Walk to it, and press green!', say: 'Where is it? Walk to it, and press green!' },
  { key: 'room_find_3', text: 'Find the picture, and press green!' },
  { key: 'room_find_4', text: 'Walk to the picture, and press green!' },
  { key: 'got_item', text: 'We got it!' },
  { key: 'got_item_2', text: 'That will help us in the fight!' },
  { key: 'got_item_3', text: "Yes, that's one more for the fight!" },
  { key: 'got_item_4', text: "Great, let's keep that!" },
  // The attic's counter, whatever word the bag drew (item 015). A named item
  // ("We found the Magic Hat!") says got_counter_<villain> instead.
  { key: 'got_counter_any', text: 'That is just what we need!' },
  { key: 'use_bag', text: 'Look what we found!' },
  { key: 'use_bag_2', text: 'Look what we brought!' },
  { key: 'use_bag_3', text: "Here's what we found in the house!" },
  // The word machine (item 026). No line names a word it builds (or any CVC
  // word): the built word is said only by its word_ line, once it is built.
  // `machine_makes` trails off into the silly word's own line (silly_zat).
  { key: 'machine_intro', text: 'Look, a word machine! It makes the word for the picture.', say: 'Look, a word machine, it makes the word for the picture.' },
  { key: 'machine_go', text: 'Walk on a letter to hear it. Press green to put it in!', say: 'Walk on a letter to hear it, press green to put it in!' },
  { key: 'machine_change', text: 'Change the first sound to make a new word!' },
  { key: 'machine_change_2', text: "Let's change the first sound! What new word will it make?", say: "Let's change the first sound, what new word will it make?" },
  { key: 'machine_change_3', text: 'Now swap the first sound for a new one!' },
  { key: 'machine_switch', text: "Here are some new sounds! Let's make a new word!", say: "Here are some new sounds, let's make a new word!" },
  { key: 'machine_makes', text: 'That makes...' },
  { key: 'machine_silly_1', text: "That's a silly word! Try another letter!", say: "That's a silly word, try another letter!" },
  { key: 'machine_silly_2', text: 'That is not a word, you silly! Try again!', say: 'That is not a word, you silly, try again!' },
  { key: 'machine_silly_3', text: 'The machine is giggling! Try another one!', say: 'The machine is giggling, try another one!' },
  { key: 'machine_silly_4', text: "That's not a real word! Try another letter!", say: "That's not a real word, try another letter!" },
  { key: 'machine_done', text: 'We made them all!' },
  // Quests (item 025): the hub's lines in a quest place, where there is no
  // front door and no stairs up. The home quest's setup lines, for a helper
  // with no place of their own, are `HOME_QUEST` in content/house/quests.ts.
  { key: 'away_secret', text: "Look, a secret door! Let's go through it!", say: "Look, a secret door, let's go through it!" },
  { key: 'away_front', text: "The way out is open! Let's go!", say: "The way out is open, let's go!" },
  { key: 'away_ready', text: "We're ready! Let's go to the fight!", say: "We're ready, let's go to the fight!" },
  // The home warm-up (item 033, src/scenes/EntryScene.ts). `grab_ask` and
  // `grab_need` trail off into the clue (letter names and letter sounds, never
  // the word: amendment 1549; its word_ line confirms it once she has it); `grab_wrong` trails off into
  // the word she picked (word_cat): she has picked it, so it may be said.
  { key: 'grab_ask', text: "Before we head out, let's grab the..." },
  { key: 'grab_wrong', text: "That's the..." },
  { key: 'grab_need', text: 'We need the...' },
  { key: 'grab_door', text: "You got it! Now let's go out the door!", say: "You got it, now let's go out the door!" },
  // Charge the Spell (item 053, src/scenes/ChargeRoom.ts). No line names a
  // letter or spells a sound: each sound is its own letter_ line, and the
  // gestures (`CHARGE_GESTURES`) trail off into it. `use_runes` is the battle's.
  // Item 059: the helper says each rune's sound and she says it back, no presses;
  // then she reads the word and Dad's one press judges it.
  { key: 'charge_explain', text: 'Say each sound after me!' },
  { key: 'charge_read', text: 'Now read the whole spell!' },
  { key: 'charge_together', text: "Let's sound it out together!" },
  { key: 'charge_done', text: 'Our spell is all charged up!' },
  { key: 'charge_done_2', text: "The spell is ready! Let's take it to the fight!", say: "The spell is ready, let's take it to the fight!" },
  { key: 'use_runes', text: "Now let's cast our spell!" },
  // The Stretchy Bridge (item 054, src/scenes/BridgeRoom.ts). No line names a
  // letter, a sound or a word: the stones' sounds are letter_ lines, and the
  // word is said (word_) only once she has picked its picture. `bridge_start`,
  // `_middle` and `_end` trail off into the sound where her pick went wrong.
  { key: 'bridge_intro', text: 'Look, a bridge of magic stones! Slide across nice and slow, and stretch the sounds.', say: 'Look, a bridge of magic stones, slide across nice and slow, and stretch the sounds.' },
  { key: 'bridge_slide', text: 'Slide across the stones!' },
  { key: 'bridge_slide_2', text: 'Slide across, and stretch each sound!', say: 'Slide across, and stretch each sound!' },
  { key: 'bridge_slide_3', text: "Let's slide across the stones!" },
  { key: 'bridge_quiet', text: 'These stones are quiet. Read them yourself!', say: 'These stones are quiet, read them yourself!' },
  { key: 'bridge_say', text: 'Now say the whole word out loud!' },
  { key: 'bridge_say_2', text: 'What word did the stones make? Say it!', say: 'What word did the stones make? Say it!' },
  { key: 'bridge_say_3', text: 'Put the sounds together! What word is it?', say: 'Put the sounds together, what word is it?' },
  { key: 'bridge_listen', text: 'Listen to the stones!' },
  { key: 'bridge_your_turn', text: 'Now you say it!' },
  { key: 'bridge_hint', text: "Here's a hint! The stones will help.", say: "Here's a hint, the stones will help." },
  { key: 'bridge_find', text: 'Which picture did you read? Walk to it!', say: 'Which picture did you read? Walk to it.' },
  { key: 'bridge_find_2', text: 'Now find its picture!' },
  { key: 'bridge_find_3', text: 'Where is the picture of that word? Walk to it!', say: 'Where is the picture of that word? Walk to it.' },
  { key: 'bridge_picked', text: 'You picked...' },
  { key: 'bridge_start', text: 'But the bridge starts with...' },
  { key: 'bridge_middle', text: 'But in the middle, the bridge has...' },
  { key: 'bridge_end', text: 'But the bridge ends with...' },
  { key: 'bridge_again', text: "Let's slide across again!" },
  { key: 'bridge_next', text: 'Here comes a new bridge!' },
  { key: 'bridge_next_2', text: "Look, here's another bridge!", say: "Look, here's another bridge!" },
  { key: 'bridge_done', text: "We crossed every bridge! We're ready to fight!", say: "We crossed every bridge, we're ready to fight!" },
  { key: 'bridge_done_2', text: 'That was every bridge! Great job!', say: 'That was every bridge, great job!' },
  // Each fight style's own beats (item 031, content/battle/fights.ts): `fight_<id>_<beat>`.
  ...FIGHTS.flatMap((f) => FIGHT_BEATS.flatMap((b) => (f.lines[b] ? [{ key: fightKey(f.id, b), ...f.lines[b] }] : []))),
];

/**
 * A narrator line's variants (item 087), in turn order: the plain key (if any),
 * then `<key>_1`, `<key>_2`... A key with no variants is a list of one.
 */
export function lineVariantKeys(base: string): string[] {
  const n = (k: string) => (k === base ? 0 : Number(k.slice(base.length + 1)));
  return NARRATOR_LINES.map((t) => t.key)
    .filter((k) => k === base || (k.startsWith(`${base}_`) && /^\d+$/.test(k.slice(base.length + 1))))
    .sort((a, b) => n(a) - n(b));
}

/**
 * Charge the Spell's gestures (item 053), composed per narrator × rune
 * (`chargeKey('charge_gesture', sound)`): the rune's action, trailing off
 * into its sound's own line. The texts live with the runes
 * (content/phonics/runes.ts). Since item 058 the room says none of them (a
 * cue per rune is a few words; the gesture is shown, not told); they stay
 * composed for a longer teaching mode, should Matt want one back.
 */
export const CHARGE_GESTURES: (Template & { sound: string })[] = RUNES.map((r) => ({ sound: r.sound, key: chargeKey('charge_gesture', r.sound), text: r.gesture.text, ...(r.gesture.say ? { say: r.gesture.say } : {}) }));

/** Composed per narrator × hero. */
export const HERO_LINES: (Template & { key: HeroKind })[] = [{ key: 'alarm_hero', text: 'Bad news, {hero}!' }];

/**
 * Composed per narrator × villain. {item} is the counter item's name. {villain}
 * is the bare name ("Only the Magic Hat can stop Tiamat!", item 038), except in
 * `alarm_villain`, which announces the villain, as the bedroom's `bad` does.
 */
export const VILLAIN_LINES: (Template & { key: VillainKind })[] = [
  { key: 'alarm_villain', text: '{villain} is coming!' },
  { key: 'need_item', text: 'Only the {item} can stop {villain}!' },
  { key: 'made_item', text: 'We made the {item}!' },
  { key: 'need_counter', text: 'We need something that scares {villain}!' },
  // Said after she has read the counter sentence, so the item may be named;
  // only when the bag drew the villain's own named counter word.
  { key: 'got_counter', text: 'We found the {item}!' },
];

/** Composed per narrator × move word. The move word is the deliberate exception to the speech rule. */
export const MOVE_LINES: (Template & { key: MoveKind })[] = [
  { key: 'use_move', text: 'Use {word}!' },
  // The hub scene's last clip (item 037): its reveal line trails off ("...and
  // it goes...") into the gift word, said alone.
  { key: 'gift_word', text: '{word}!' },
  // A wrong move pick, said in order: "That wasn't ICE," + "that was HUG!" +
  // "Find ICE!". The picked word may be said: she has already picked it.
  { key: 'not_move', text: "That wasn't {word}," },
  { key: 'was_move', text: 'that was {word}!' },
  { key: 'find_move', text: 'Find {word}!' },
];

/**
 * The bedroom wake-up, said by the waker (the episode's primary dad, `WAKERS` in ids.ts), not the
 * narrator: the ally has not arrived yet. Keys get a suffix as they are composed:
 * `good_<hero>`, `helper_<character>`, `bad_<villain>`; `up` and `door` do not.
 * {helper} is the helper's good name; {threat} the villain's `house.threat`.
 *
 * `up`, `good` and `door` have three variants each (item 040), one drawn per
 * episode (src/rules/story.ts `drawLines`): `up`, `up_2`, `up_3`, composed as
 * `wake_<waker>_up_2` and `wake_<waker>_good_<hero>_2`. They are said before
 * any reading, so the episode keeps their words out of her key words and pads.
 */
export const WAKE_LINES: Template[] = [
  { key: 'up', text: 'Wake up, wake up!' },
  { key: 'up_2', text: 'Rise and shine, sleepyhead!' },
  { key: 'up_3', text: "Good morning, it's time to get up!" },
  { key: 'good', text: 'Good news, {hero}!' },
  { key: 'good_2', text: 'Guess what, {hero}? Good news!' },
  { key: 'good_3', text: 'Hey {hero}, I have good news!', say: 'Hey {hero}, I have good news!' },
  { key: 'helper', text: '{helper} is here to play!' },
  { key: 'bad', text: 'Bad news, {villain} is coming, and {threat}!' },
  { key: 'door', text: "Come on, let's go! Find the door!", say: "Come on, let's go, find the door!" },
  { key: 'door_2', text: "Quick, let's go to the door!" },
  { key: 'door_3', text: 'Off we go! Walk to the door!', say: 'Off we go, walk to the door!' },
  // The other dad, when he comes into the bedroom too (item 025).
  { key: 'hi', text: 'Good morning, sleepyhead!' },
];

/** A wake line's template by key (`up_2`). */
export const wakeTemplate = (key: string): Template | undefined => WAKE_LINES.find((t) => t.key === key);

/** How many variants `up`, `good` and `door` have (item 040). */
export const WAKE_VARIANTS = 3;

/** A wake line's key for variant `n`: `up`, `up_2`, `up_3`. Variant 1 keeps the plain key (and its recording). */
export const wakeVariant = (key: string, n: number): string => (n > 1 ? `${key}_${n}` : key);
