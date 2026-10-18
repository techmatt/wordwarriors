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
 * Placeholders: {hero} the hero's name, {villain} the villain's display name,
 * {item} the counter item's name, {word} a move word.
 */

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
  { key: 'right_3', text: 'Woo hoo! That is it!', say: 'Woo hoo, that is it!' },
  { key: 'right_4', text: 'Super duper!' },
  { key: 'wrong_1', text: 'Oopsie! Try another one!', say: 'Oopsie, try another one!' },
  { key: 'wrong_2', text: 'Hee hee, not that one!' },
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
];

/** Composed per narrator × hero. */
export const HERO_LINES: Template[] = [{ key: 'alarm_hero', text: 'Bad news, {hero}!' }];

/** Composed per narrator × villain. */
export const VILLAIN_LINES: Template[] = [
  { key: 'alarm_villain', text: '{villain} is coming!' },
  { key: 'need_item', text: 'Only the {item} can stop {villain}!' },
  { key: 'made_item', text: 'We made the {item}!' },
];

/** Composed per narrator × move word. */
export const MOVE_LINES: Template[] = [{ key: 'use_move', text: 'Use {word}!' }];
