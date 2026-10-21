/**
 * The short, friendly wait (item 065) while a scene's art finishes loading
 * (`src/art/gate.ts`): stars twinkling round her face, nothing to read and
 * nothing to press. It shows only when a load lags; it fades in after a beat
 * so a near-miss never flashes, then starts the scene it was holding.
 */

import Phaser from 'phaser';

import { artBank } from '../art/ArtBank';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { castFace, episode } from '../episode/Episode';
import { TEX } from '../fx/textures';
import { bob, fitImage } from '../fx/juice';
import { SceneGen } from '../fx/sceneGen';
import { hookState } from '../hookState';

/** How long the wait stays invisible: a load that lands within it shows nothing at all. */
const SHOW_AFTER_MS = 150;

export interface WaitData {
  key: string;
  data?: object;
  ids: string[];
}

export class WaitScene extends Phaser.Scene {
  private runs = new SceneGen(this);

  constructor() {
    super('Wait');
  }

  create(w: WaitData): void {
    const gone = this.runs.begin();
    hookState.scene = 'Wait';
    hookState.room = null;
    const layer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setAlpha(0);
    const face = castFace(episode.hero);
    if (artBank.has(face)) {
      const img = fitImage(this.add.image(0, 0, face), 150, 150);
      layer.add(img);
      bob(this, img, 10, 700);
    }
    // Stars wheeling round her: the waiting is part of the show.
    for (let i = 0; i < 8; i++) {
      const star = this.add.image(0, 0, TEX.star).setTint([0xffd23f, 0xff7ac8, 0x7ad7ff, 0xa8ff7a][i % 4]!).setScale(0.8);
      layer.add(star);
      const angle = (i / 8) * Math.PI * 2;
      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 2400,
        repeat: -1,
        onUpdate: (t) => {
          const a = angle + (t.getValue() ?? 0);
          star.setPosition(Math.cos(a) * 130, Math.sin(a) * 130);
        },
      });
      this.tweens.add({ targets: star, scale: 1.2, duration: 400 + i * 50, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.tweens.add({ targets: layer, alpha: 1, duration: 300, delay: SHOW_AFTER_MS });
    void artBank.ensure(w.ids).then(() => {
      if (!gone()) this.scene.start(w.key, w.data);
    });
  }
}
