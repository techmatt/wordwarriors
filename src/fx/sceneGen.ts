/**
 * Scene generation: stop an async chain once its run of the scene is over.
 * Phaser reuses a Scene object, and a scene's flow is a chain of awaits; when
 * the scene shuts down (F9, F2, a fast advance) the chain must stop rather
 * than carry on in the next run. `begin()` in `create()` starts a run (the
 * generation moves on now and again at shutdown); a chain asks `gone()`
 * after each await, or awaits through `guard`.
 */

import Phaser from 'phaser';

export class SceneGen {
  private gen = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** A new run: the generation moves on, and again at shutdown (then `onShutdown`). Returns this run's `gone`. */
  begin(onShutdown?: () => void): () => boolean {
    this.gen++;
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gen++;
      onShutdown?.();
    });
    return this.watch();
  }

  /** True once the run now going is over. */
  watch(): () => boolean {
    const g = this.gen;
    return () => g !== this.gen;
  }

  /** `p`, but never resolving once the run it started in is over or the scene is not active. */
  guard<T>(p: Promise<T>): Promise<T> {
    const g = this.gen;
    return p.then((v) => new Promise<T>((resolve) => {
      if (this.gen === g && this.scene.sys.isActive()) resolve(v);
    }));
  }
}
