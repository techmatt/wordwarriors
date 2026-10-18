/**
 * Victory: fireworks, confetti, the heroes bouncing on a podium, the villain
 * turned good again and bouncing with them. Green plays again.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { narratorLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxSelect, sfxVictory } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, episode, narrator } from '../episode/Episode';
import { burst, fitImage, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { hookState } from '../testHooks';
import { makeButtonDot } from '../ui/ButtonDot';
import { Caption } from '../ui/Caption';

export class VictoryScene extends Phaser.Scene {
  private controls!: Controls;
  private ready = false;

  constructor() {
    super('Victory');
  }

  create(): void {
    hookState.scene = 'Victory';
    hookState.room = null;
    hookState.battle = null;
    this.ready = false;
    this.controls = new Controls(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'room_victory').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    new Caption(this);
    this.cameras.main.fadeIn(400, 255, 255, 255);

    this.add.particles(0, -20, TEX.square, {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 120, max: 260 },
      speedX: { min: -60, max: 60 },
      rotate: { min: 0, max: 360 },
      scale: { min: 0.6, max: 1.4 },
      lifespan: 5000,
      frequency: 25,
      tint: [0xff5ab4, 0xffd23f, 0x7ad9ff, 0x8aff8a, 0x9b5de5],
    }).setDepth(DEPTH.fx);

    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(150, GAME_WIDTH - 150);
        const y = Phaser.Math.Between(80, 300);
        burst(this, x, y, { count: 70, speed: 420, gravity: 120, life: 1200, colors: [Phaser.Display.Color.RandomRGB().color, 0xffffff] });
        shockwave(this, x, y, 0xffffff, 120, 500);
        sfxBoom(1);
      },
    });

    const cast = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    const all = [...cast.map((id) => charArt(id, false)), charArt(episode.villain, false)];
    all.forEach((key, i) => {
      const x = GAME_WIDTH / 2 + (i - (all.length - 1) / 2) * 220;
      const img = fitImage(this.add.image(x, 610, key).setOrigin(0.5, 1), 180, 230);
      this.tweens.add({ targets: img, y: 560, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: img, scaleY: img.scaleY * 0.9, scaleX: img.scaleX * 1.08, duration: 300 + i * 40, yoyo: true, repeat: -1, delay: 300 + i * 40 });
    });

    const title = this.add
      .text(GAME_WIDTH / 2, 140, 'VICTORY!', { fontFamily: '"Arial Black", sans-serif', fontSize: '120px', color: '#ffd23f', stroke: '#5a1a7a', strokeThickness: 16 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Elastic.easeOut' });

    sfxVictory();
    void (async () => {
      const n = narrator();
      await voiceBus.sequence([narratorLine(n, 'victory_1'), narratorLine(n, 'victory_2'), narratorLine(n, 'again')]);
      makeButtonDot(this, GAME_WIDTH / 2, 300, 'green', 34).setDepth(DEPTH.hud);
      this.ready = true;
    })();
  }

  override update(): void {
    this.controls.update();
    if ((this.ready && this.controls.pressed('green')) || this.controls.dev('F2')) {
      this.ready = false;
      sfxSelect();
      advance(this);
    }
    this.controls.endFrame();
  }
}
