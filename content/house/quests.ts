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
 * Keyed by roster id: a dad's forms each have their own quest. Anybody not
 * listed takes the home quest (`HOME_QUEST`): "we have to train right here at
 * home", in the house as before. Several characters may share a place; each
 * says their own line.
 *
 * Setup lines are said before any room, so `saidEarly` keeps their words out
 * of the key-word draw, and like every narrator line they carry no reading
 * word (rules.test.ts). Voiced as `quest_<id>` in the owner's person's voice
 * (group core: the bedroom says them).
 */

import { HOME } from './house.js';

export interface Quest {
  /** PLACES id, or HOME. */
  place: string;
  /** The setup line, in the owner's voice. */
  text: string;
  /** Spoken form, when edge-tts needs help. Same word count. */
  say?: string;
}

export const QUESTS: Record<string, Quest> = {
  // The dads' forms.
  dada_matt: { place: 'treehouse', text: 'To build a plan strong enough to beat them, we have to train in my secret treehouse workshop!' },
  dada_matt_lifter: { place: 'forest_gym', text: 'To get strong enough to fight them, we have to train in my secret gym in the forest!' },
  dada_matt_cyber: { place: 'hacker_den', text: 'To hack their tricks, we have to train in my secret hacker den in the neon city!' },
  dada_matt_blade: { place: 'rune_dojo', text: 'To learn sword and spell, we have to train in my rune dojo on the mountain!' },
  dada_jason: { place: 'secret_kitchen', text: 'To cook up a plan, we have to train in my secret kitchen under the city!' },
  dada_jason_warrior: { place: 'knight_camp', text: "To be brave enough to fight them, we have to train at my knights' camp by the castle!", say: 'To be brave enough to fight them, we have to train at my knights camp by the castle!' },
  dada_jason_warlock: { place: 'moon_tower', text: 'To learn some spooky spells, we have to train in my purple moon tower!' },
  // Ellie and the rest.
  ellie: { place: 'bubble_castle', text: 'To get ready, we have to play in my bubble castle up in the clouds!' },
  seraphina: { place: 'dragon_mountain', text: 'To fly fast enough, we have to train with the dragons on my mountain!' },
  smaug: { place: 'dragon_mountain', text: 'To be fierce enough, we have to train on my dragon mountain!' },
  tiamat: { place: 'dragon_mountain', text: 'To be mighty enough, we have to train on the dragon mountain!' },
  elsa: { place: 'ice_castle', text: 'To be cool enough, we have to train in my ice castle!' },
  anna: { place: 'ice_castle', text: "To be brave enough, we have to train at my sister's ice castle!", say: 'To be brave enough, we have to train at my sisters ice castle!' },
  jasmine: { place: 'desert_oasis', text: 'To be quick enough, we have to train at the desert oasis!' },
  ozymandias: { place: 'desert_oasis', text: 'To be as strong as stone, we have to train at my desert oasis!' },
  jormungandr: { place: 'sea_grotto', text: 'To be slippery enough, we have to train in my secret sea grotto!' },
};

/** Everybody else: the house, as before quests. A narrator line, so it is composed in every narrator's voice. */
export const HOME_QUEST: Quest = { place: HOME, text: 'To get ready, we have to train right here at home!' };

/** The quest a character takes her on: their own, or the home quest. */
export function questFor(id: string): Quest {
  return QUESTS[id] ?? HOME_QUEST;
}

/** The setup line's id: `quest_<owner>`, or the narrator's `quest_home` line. */
export const questLine = (owner: string) => `quest_${owner}`;
