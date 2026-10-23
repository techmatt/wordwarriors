/**
 * A walk over a scene's display list, shared by the art loader (ArtBank's
 * `inUse`), the test hooks and the QA probe.
 */

import Phaser from 'phaser';

/**
 * Every object in `list`, containers' children after their container, all
 * of them (visible or not). Walks that prune hidden branches keep their own.
 */
export function walkObjects(list: Phaser.GameObjects.GameObject[], visit: (o: Phaser.GameObjects.GameObject) => void): void {
  for (const o of list) {
    visit(o);
    if (o instanceof Phaser.GameObjects.Container) walkObjects(o.list, visit);
  }
}
