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

export interface Template {
  key: string;
  text: string;
  say?: string;
}

/** Said by Dada Matt only, before the ally is picked. */
export const CORE_LINES: Template[] = [
  { key: 'title', text: 'Welcome, Word Warrior! Press the green button to play!', say: 'Welcome, Word Warrior, press the green button to play!' },
  { key: 'pick_hero', text: 'Who will be our hero? Walk to one and press green!', say: 'Who will be our hero? Walk to one, and press green!' },
  { key: 'pick_ally', text: 'Who will help? Pick a friend, or nobody!', say: 'Who will help? Pick a friend, or nobody.' },
  { key: 'pick_villain', text: 'Who is the bad guy? Pick one, or the surprise!', say: 'Who is the bad guy? Pick one, or the surprise.' },
  { key: 'surprise', text: 'A surprise villain!' },
  { key: 'nobody', text: 'No helper? I will help you then!', say: 'No helper? I will help you, then!' },
];

/** Composed per narrator. */
export const NARRATOR_LINES: Template[] = [
  { key: 'alarm_ready', text: 'We need to get ready!' },
  { key: 'prep_gem', text: 'First, let us make a power gem!', say: 'First, let us make a power gem.' },
  { key: 'prep_ammo', text: 'Let us make magic star ammo!', say: 'Let us make magic star ammo.' },
  { key: 'prep_helper', text: 'Let us call a helper friend!', say: 'Let us call a helper friend.' },
  { key: 'inst_sound', text: 'Listen! Walk to the letter that makes this sound.', say: 'Listen, walk to the letter that makes this sound.' },
  { key: 'inst_blend', text: 'Walk on the letters, then pick the right door!' },
  { key: 'inst_picture', text: 'Read the word, then walk to its picture!' },
  { key: 'inst_spell', text: 'Type the letters to spell the magic word!' },
  { key: 'spell_this', text: 'Spell this one!' },
  { key: 'hint', text: 'Listen to the sounds!' },
  { key: 'right_1', text: 'Yes! You did it!', say: 'Yes, you did it!' },
  { key: 'right_2', text: 'Great reading!' },
  { key: 'right_3', text: 'Yes! That is it!', say: 'Yes, that is it!' },
  { key: 'right_4', text: 'Super duper!' },
  { key: 'wrong_1', text: 'Oopsie! Try another one!', say: 'Oopsie, try another one!' },
  { key: 'wrong_2', text: 'Not that one, silly!' },
  { key: 'wrong_3', text: 'That one is ticklish! Try again!', say: 'That one is ticklish, try again!' },
  { key: 'wrong_4', text: 'Silly me, wrong way! Try again!', say: 'Silly me, wrong way, try again!' },
  { key: 'made_gem', text: 'We made a power gem!' },
  { key: 'made_ammo', text: 'We made star ammo!' },
  { key: 'made_helper', text: 'A helper friend is here!' },
  { key: 'piece', text: 'One more piece!' },
  { key: 'battle_start', text: 'Let us go! Charge!', say: 'Let us go, charge!' },
  { key: 'battle2_start', text: 'Round two! We are ready now!', say: 'Round two, we are ready now!' },
  { key: 'move_pick', text: 'Quick! Pick a move!', say: 'Quick, pick a move!' },
  { key: 'move_great', text: 'Super power!' },
  { key: 'move_ok', text: 'Nice move!' },
  { key: 'use_gem', text: 'Power gem, shine!' },
  { key: 'use_ammo', text: 'Fire the star ammo!' },
  { key: 'use_helper', text: 'Go, helper friend!' },
  { key: 'use_item', text: 'Now! Use it!', say: 'Now, use it!' },
  { key: 'retreat_1', text: 'Too strong! Retreat, retreat!', say: 'Too strong, retreat, retreat!' },
  { key: 'retreat_2', text: 'That was close! We need a plan!', say: 'That was close, we need a plan!' },
  { key: 'forge_intro', text: 'Let us make it! Spell the magic words!', say: 'Let us make it, spell the magic words!' },
  { key: 'finish', text: 'Now, all together! Finish it!', say: 'Now, all together, finish it!' },
  { key: 'victory_1', text: 'We won! Hooray!', say: 'We won, hooray!' },
  { key: 'victory_2', text: 'You are a real Word Warrior!' },
  { key: 'again', text: 'Press green to play again!' },
  // The house (v0.2): the hub's doors and the sentence rooms. The hub's story
  // scene, which gives her the gift word, is the helper's own (item 037,
  // content/house/scenes.ts), composed in tools/voice/compose.ts.
  { key: 'house_doors', text: 'Two doors! Walk to one, and press green.', say: 'Two doors, walk to one, and press green.' },
  { key: 'house_more', text: 'One more door to go!' },
  { key: 'house_front', text: 'The front door is open! Let us go!', say: 'The front door is open, let us go!' },
  { key: 'secret_door', text: 'Look, a secret door! Let us go up!', say: 'Look, a secret door, let us go up!' },
  { key: 'house_ready', text: 'We are ready now! Out the front door!', say: 'We are ready now, out the front door!' },
  { key: 'room_listen', text: 'Listen!' },
  { key: 'room_your_turn', text: 'Your turn! Press green for each word.', say: 'Your turn, press green for each word.' },
  { key: 'room_find', text: 'Now find it, and press green!' },
  { key: 'got_item', text: 'We got it!' },
  // The attic's counter, whatever word the bag drew (item 015). A named item
  // ("We found the Magic Hat!") says got_counter_<villain> instead.
  { key: 'got_counter_any', text: 'That is just what we need!' },
  { key: 'use_bag', text: 'Look what we found!' },
  // The word machine (item 026). No line names a word it builds (or any CVC
  // word): the built word is said only by its word_ line, once it is built.
  // `machine_makes` trails off into the silly word's own line (silly_zat).
  { key: 'machine_intro', text: 'A word machine! It makes the word for the picture.', say: 'A word machine, it makes the word for the picture.' },
  { key: 'machine_go', text: 'Walk on a letter to hear it. Press green to put it in!', say: 'Walk on a letter to hear it, press green to put it in!' },
  { key: 'machine_change', text: 'Change the first sound to make a new word!' },
  { key: 'machine_switch', text: 'New sounds! Let us make one more.', say: 'New sounds, let us make one more.' },
  { key: 'machine_makes', text: 'That makes...' },
  { key: 'machine_silly_1', text: 'A silly word! Try another letter!', say: 'A silly word, try another letter!' },
  { key: 'machine_silly_2', text: 'That is not a word, you silly! Try again!', say: 'That is not a word, you silly, try again!' },
  { key: 'machine_silly_3', text: 'The machine is giggling! Try another one!', say: 'The machine is giggling, try another one!' },
  { key: 'machine_done', text: 'We made them all!' },
  // Quests (item 025): the hub's lines in a quest place, where there is no
  // front door and no stairs up. The home quest's setup lines, for a helper
  // with no place of their own, are `HOME_QUEST` in content/house/quests.ts.
  { key: 'away_secret', text: 'Look, a secret door! Let us go in!', say: 'Look, a secret door, let us go in!' },
  { key: 'away_front', text: 'The way out is open! Let us go!', say: 'The way out is open, let us go!' },
  { key: 'away_ready', text: 'We are ready now! Off to the fight!', say: 'We are ready now, off to the fight!' },
  // The home warm-up (item 033, src/scenes/EntryScene.ts). `grab_ask` and
  // `grab_need` trail off into the clue (letter names, letter sounds, and at
  // the easiest level the word's own word_ line); `grab_wrong` trails off into
  // the word she picked (word_cat): she has picked it, so it may be said.
  { key: 'grab_ask', text: "Before we head out, let's grab the..." },
  { key: 'grab_wrong', text: "That's the..." },
  { key: 'grab_need', text: 'We need the...' },
  { key: 'grab_door', text: 'Got it! Now, out the door!', say: 'Got it, now, out the door!' },
  // Each fight style's own beats (item 031, content/battle/fights.ts): `fight_<id>_<beat>`.
  ...FIGHTS.flatMap((f) => FIGHT_BEATS.flatMap((b) => (f.lines[b] ? [{ key: `fight_${f.id}_${b}`, ...f.lines[b] }] : []))),
];

/** Composed per narrator × hero. */
export const HERO_LINES: Template[] = [{ key: 'alarm_hero', text: 'Bad news, {hero}!' }];

/**
 * Composed per narrator × villain. {item} is the counter item's name. {villain}
 * is the bare name ("Only the Magic Hat can stop Tiamat!", item 038), except in
 * `alarm_villain`, which announces the villain, as the bedroom's `bad` does.
 */
export const VILLAIN_LINES: Template[] = [
  { key: 'alarm_villain', text: '{villain} is coming!' },
  { key: 'need_item', text: 'Only the {item} can stop {villain}!' },
  { key: 'made_item', text: 'We made the {item}!' },
  { key: 'need_counter', text: 'We need something that scares {villain}!' },
  // Said after she has read the counter sentence, so the item may be named;
  // only when the bag drew the villain's own named counter word.
  { key: 'got_counter', text: 'We found the {item}!' },
];

/** Composed per narrator × move word. The move word is the deliberate exception to the speech rule. */
export const MOVE_LINES: Template[] = [
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
 */
export const WAKE_LINES: Template[] = [
  { key: 'up', text: 'Wake up, wake up!' },
  { key: 'good', text: 'Good news, {hero}!' },
  { key: 'helper', text: '{helper} is here to play!' },
  { key: 'bad', text: 'Bad news, {villain} is coming, and {threat}!' },
  { key: 'door', text: 'Come on, let us go! Find the door!', say: 'Come on, let us go, find the door!' },
  // The other dad, when he comes into the bedroom too (item 025).
  { key: 'hi', text: 'Good morning, sleepyhead!' },
];
