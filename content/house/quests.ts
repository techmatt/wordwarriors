/**
 * Quests (item 025): where the ally takes her to train for the fight, as data.
 *
 * After the bad news in the bedroom the ally (or, with no ally, the dad who
 * woke her) says a setup line in their own voice ("To get strong enough to
 * fight them, we have to train in my secret gym in the forest!") and the door
 * leads to their quest place instead of the house: its hub, its two side rooms
 * and its secret room (content/house/house.ts, PLACES). The episode's
 * minigames are drawn apart from the quest (src/rules/minigames.ts), so any
 * game can be played in any place.
 *
 * Keyed by roster id: a dad's forms each have their own quest. Every character
 * has one today; anybody added without one takes the home quest
 * (`HOME_QUEST`): "we have to train right here at home", in the house as
 * before (`?place=home` shows it too). Several characters share a place; each
 * says their own lines.
 *
 * Item 037: each quest has a few setup lines, and each episode draws one
 * (src/rules/story.ts; `?cast=default` always says the first, so the tests
 * hear the same line). The first is the line from before 037.
 *
 * Setup lines are said before any room, so the episode keeps the chosen
 * line's words out of the key-word, pad and gift draws, and like every
 * narrator line they carry no word from the bank (rules.test.ts). Voiced as
 * `quest_<id>_<n>` in the owner's person's voice (group core: the bedroom
 * says them); the home quest as each narrator's `quest_home_<n>`.
 */

import { homeQuestLine, questLine, type SpokenLine } from '../voice/ids.js';
import { HOME } from './house.js';

/** A voiced line: what the caption shows, and the spoken form when edge-tts needs help (same word count). */
export type Line = SpokenLine;

export interface Quest {
  /** PLACES id, or HOME. */
  place: string;
  /** The setup lines, in the owner's voice: one is said per episode. */
  lines: Line[];
}

export const QUESTS: Record<string, Quest> = {
  // The dads' forms.
  dada_matt: {
    place: 'treehouse',
    lines: [
      { text: 'To build a plan strong enough to beat them, we have to train in my secret treehouse workshop!' },
      { text: 'To get ready, we are going up to my treehouse workshop, watch out for the wobbly ladder!' },
      { text: 'My treehouse workshop has a hammer for everybody, even a tiny one for you, so up we go!' },
    ],
  },
  dada_matt_lifter: {
    place: 'forest_gym',
    lines: [
      { text: 'To get strong enough to fight them, we have to train in my secret gym in the forest!' },
      { text: 'It is time to get strong, and my secret forest gym has boulders for weights and squirrels for coaches!' },
      { text: 'To beat them we need muscles, so off to my gym in the forest, where even the trees do push ups!' },
    ],
  },
  dada_matt_cyber: {
    place: 'hacker_den',
    lines: [
      { text: 'To hack their tricks, we have to train in my secret hacker den in the neon city!' },
      { text: 'To beat them we need clever computers, so we are zooming to my hacker den in the neon city!' },
      { text: 'To get ready, we go to my hacker den in the neon city, it has a hundred blinking screens!' },
    ],
  },
  dada_matt_blade: {
    place: 'rune_dojo',
    lines: [
      { text: 'To learn sword and spell, we have to train in my rune dojo on the mountain!' },
      { text: 'To be a sword and spell hero, we have to climb up to my rune dojo, high on the mountain!' },
      { text: 'My rune dojo is way up the mountain, where the clouds come to practice too, so let\'s go!' },
    ],
  },
  dada_jason: {
    place: 'secret_kitchen',
    lines: [
      { text: 'To cook up a plan, we have to train in my secret kitchen under the city!' },
      { text: 'Every hero needs a good breakfast, so we are going to my secret kitchen under the city!' },
      { text: 'To get ready we have to cook, so down we go to my secret kitchen, under the whole city!' },
    ],
  },
  dada_jason_warrior: {
    place: 'knight_camp',
    lines: [
      { text: "To be brave enough to fight them, we have to train at my knights' camp by the castle!", say: 'To be brave enough to fight them, we have to train at my knights camp by the castle!' },
      { text: 'To fight like a knight, we have to practice at the camp where the knights train, by the castle!' },
      { text: 'Polish your shield, little knight, we are off to train at the camp by the castle!' },
    ],
  },
  dada_jason_warlock: {
    place: 'moon_tower',
    lines: [
      { text: 'To learn some spooky spells, we have to train in my purple moon tower!' },
      { text: 'To learn some magic, we have to climb my purple moon tower, all the way up to the stars!' },
      { text: 'My purple moon tower is full of spooky spell books and one very friendly ghost, so up we go!' },
    ],
  },
  // Ellie and the rest.
  ellie: {
    place: 'bubble_castle',
    lines: [
      { text: 'To get ready, we have to play in my bubble castle up in the clouds!' },
      { text: 'Come and play with me, my bubble castle is up in the clouds, and it bounces!' },
      { text: 'To get ready, we go to my bubble castle in the sky, the floor is made of bubbles!' },
    ],
  },
  seraphina: {
    place: 'dragon_mountain',
    lines: [
      { text: 'To fly fast enough, we have to train with the dragons on my mountain!' },
      { text: 'My dragons want to meet you, so we have to train on my mountain, hold on tight!' },
      { text: 'To be brave like a dragon rider, we fly to my mountain, where the dragons live!' },
    ],
  },
  smaug: {
    place: 'dragon_mountain',
    lines: [
      { text: 'To be fierce enough, we have to train on my dragon mountain!' },
      { text: 'To be fierce like a dragon, we have to train on my mountain, and you may count my gold!' },
      { text: 'Come to my dragon mountain, it is full of shiny gold, and very good for training!' },
    ],
  },
  tiamat: {
    place: 'dragon_mountain',
    lines: [
      { text: 'To be mighty enough, we have to train on the dragon mountain!' },
      { text: 'Climb on my back, little one, we are flying to the dragon mountain to train!' },
      { text: 'A dragon needs a strong friend, so we have to train together on the dragon mountain!' },
    ],
  },
  elsa: {
    place: 'ice_castle',
    lines: [
      { text: 'To be cool enough, we have to train in my ice castle!' },
      { text: 'To get ready, we have to train in my ice castle, bring your mittens!' },
      { text: 'My ice castle is full of snowflakes and slides, so that is where we train!' },
    ],
  },
  anna: {
    place: 'ice_castle',
    lines: [
      { text: "To be brave enough, we have to train at my sister's ice castle!", say: 'To be brave enough, we have to train at my sisters ice castle!' },
      { text: 'My sister has an ice castle with the best slides, so we have to train there!' },
      { text: 'To be brave and quick, we are off to the ice castle, race you there!' },
    ],
  },
  jasmine: {
    place: 'desert_oasis',
    lines: [
      { text: 'To be quick enough, we have to train at the desert oasis!' },
      { text: 'Climb on my flying carpet, we are going to train at the desert oasis!' },
      { text: 'To be quick like the wind, we have to train at the oasis, out in the sandy desert!' },
    ],
  },
  ozymandias: {
    place: 'desert_oasis',
    lines: [
      { text: 'To be as strong as stone, we have to train at my desert oasis!' },
      { text: 'To be mighty like a pharaoh, we have to train at my oasis, by the great pyramids!' },
      { text: 'Come and train at my desert oasis, where the palm trees are tall and the sand is warm!' },
    ],
  },
  jormungandr: {
    place: 'sea_grotto',
    lines: [
      { text: 'To be slippery enough, we have to train in my secret sea grotto!' },
      { text: 'To get ready, we have to dive down to my secret sea grotto, under the waves!' },
      { text: 'My sea grotto is full of glowing shells and wiggly friends, so that is where we train!' },
    ],
  },
  // Item 030: in the active cast, so his own place.
  scar: {
    place: 'robot_workshop',
    lines: [
      { text: 'To power up my core, we have to train in my robot workshop!' },
      { text: 'To get ready, we have to train in my robot workshop, it is full of shiny bolts!' },
      { text: 'My robot workshop has buttons and lights everywhere, so that is where we train!' },
    ],
  },
  // Guests in somebody else's place: no art budget was left for places of their own.
  julia: {
    place: 'treehouse',
    lines: [
      { text: "To get ready, we have to play in Dada's treehouse workshop!", say: 'To get ready, we have to play in Dadas treehouse workshop!' },
      { text: 'To get ready, we have to play in the treehouse workshop, up the ladder we go!' },
      { text: 'Let\'s go to the treehouse workshop, where Dada lets me use the little hammer!' },
    ],
  },
  moriarty: {
    place: 'moon_tower',
    lines: [
      { text: 'To learn the best tricks, we have to train in the purple moon tower!' },
      { text: 'To learn some clever tricks, we have to train in the purple moon tower, watch closely!' },
      { text: 'Every good magician practices, so we are going to the purple moon tower!' },
    ],
  },
  bavmorda: {
    place: 'moon_tower',
    lines: [
      { text: 'To brew the best spells, we have to train in the purple moon tower!' },
      { text: 'To learn some kind magic, we have to train in the purple moon tower, with my flowers!' },
      { text: 'My broomstick knows the way to the purple moon tower, so that is where we train!' },
    ],
  },
  rilla: {
    place: 'forest_gym',
    lines: [
      { text: 'To be gorilla strong, we have to train in the secret forest gym!' },
      { text: 'To be strong like me, we have to train in the secret forest gym, with the bananas!' },
      { text: 'The secret forest gym has swings made of vines, so that is where we train!' },
    ],
  },
};

/** Everybody else: the house, as before quests. Narrator lines, so they are composed in every narrator's voice. */
export const HOME_QUEST: Quest = {
  place: HOME,
  lines: [
    { text: 'To get ready, we have to train right here at home!' },
    { text: 'No need to go far, we will train right here at home!' },
    { text: 'Our house is the best place to train, so we will get ready right here!' },
  ],
};

/** The quest a character takes her on: their own, or the home quest. */
export function questFor(id: string): Quest {
  return QUESTS[id] ?? HOME_QUEST;
}

/** Variant `n` (from 1) of `count`, wrapped: a variant drawn for one helper still names a line for another. */
export const variantIndex = (n: number, count: number): number => (((Math.max(1, Math.floor(n)) - 1) % count) + count) % count;

/**
 * The setup line the helper says, variant `n`: its id and its words. `narrator`
 * voices the home quest (the helper's person).
 */
export function questSetup(helper: string, narrator: string, n: number): { id: string; line: Line } {
  const q = QUESTS[helper];
  const lines = q ? q.lines : HOME_QUEST.lines;
  const i = variantIndex(n, lines.length);
  return { id: q ? questLine(helper, i + 1) : homeQuestLine(narrator, i + 1), line: lines[i]! };
}
