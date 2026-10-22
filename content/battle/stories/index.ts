/** Every story fight (item 107), by id: a new villain's story is one more file listed here. */

import { SMAUG_STORY } from './smaug.js';
import type { StoryBeat, StoryLine, StoryScript } from './types.js';

export const STORIES: StoryScript[] = [SMAUG_STORY];
export const STORY_BY_ID: Record<string, StoryScript> = Object.fromEntries(STORIES.map((s) => [s.id, s]));

/** Every line a story says, before and after each beat, in order. */
export function storyLines(s: StoryScript): StoryLine[] {
  return [...s.part1, ...s.part2].flatMap((b: StoryBeat) => [...(b.lines ?? []), ...(b.after ?? [])]);
}

/** The beats of `part` that open a move choice, in order: one plan entry each (src/rules/storyFight.ts). */
export function padBeats(s: StoryScript, part: 1 | 2): StoryBeat[] {
  return (part === 1 ? s.part1 : s.part2).filter((b) => b.input?.kind === 'pad' || b.input?.kind === 'dodgePads');
}
