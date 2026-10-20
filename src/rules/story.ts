/**
 * The episode's story variants (item 037): which of the helper's quest setup
 * lines (content/house/quests.ts) the bedroom says, and which hub scene
 * (content/house/scenes.ts) gives her the gift word. Pure: no Phaser.
 *
 * Drawn with the cast's rand, so `?seed=` replays them too; the fixed default
 * cast (`?cast=default`, what the tests play) always gets variant 1 of each,
 * so a test hears the same lines every run.
 */

import { questFor } from '../../content/house/quests';
import { scenesFor } from '../../content/house/scenes';

export type Rand = () => number;

/** Variant numbers, from 1. */
export interface Story {
  quest: number;
  scene: number;
}

export const DEFAULT_STORY: Story = { quest: 1, scene: 1 };

/** One of `count` variants, from 1; always 1 when `fixed`. */
export function pickVariant(count: number, rand: Rand, fixed: boolean): number {
  if (fixed || count <= 1) return 1;
  return 1 + Math.min(count - 1, Math.floor(rand() * count));
}

/** The helper's quest line and hub scene for one episode. */
export function drawStory(helper: string, rand: Rand, fixed: boolean): Story {
  return {
    quest: pickVariant(questFor(helper).lines.length, rand, fixed),
    scene: pickVariant(scenesFor(helper).length, rand, fixed),
  };
}
