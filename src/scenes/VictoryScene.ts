/**
 * Victory: fireworks, confetti, the heroes bouncing on a podium, the villain
 * turned good again and bouncing with them. Green plays again.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { WORD_BY_ID, pictureFor } from '../../content/phonics/words';
import { narratorLine, wordLine } from '../../content/voice/ids';
import { startMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxRight, sfxSelect, sfxVictory } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, episode, narrator, villainSpec } from '../episode/Episode';
import { burst, fitImage, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { hookState } from '../testHooks';
import { makeButtonDot } from '../ui/ButtonDot';
import { Caption } from '../ui/Caption';

export class VictoryScene extends Phaser.Scene {
  private controls!: Controls;
  private ready = false;
  private gen = 0;

  constructor() {
    super('Victory');
  }

  create(): void {
    this.gen++;
    const g = this.gen;
    const gone = () => g !== this.gen;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.gen++);
    hookState.scene = 'Victory';
    // The battle's last state stays readable here, for tests asking how it ended.
    hookState.room = null;
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
      const img = fitImage(this.add.image(x, 605, key).setOrigin(0.5, 1), 120, 150);
      this.tweens.add({ targets: img, y: 575, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: img, scaleY: img.scaleY * 0.9, scaleX: img.scaleX * 1.08, duration: 300 + i * 40, yoyo: true, repeat: -1, delay: 300 + i * 40 });
    });

    const title = this.add
      .text(GAME_WIDTH / 2, 105, 'VICTORY!', { fontFamily: '"Arial Black", sans-serif', fontSize: '104px', color: '#ffd23f', stroke: '#5a1a7a', strokeThickness: 16 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Elastic.easeOut' });

    sfxVictory();
    this.time.delayedCall(2200, () => startMusic('title'));
    void (async () => {
      const n = narrator();
      await voiceBus.say(narratorLine(n, 'victory_1'));
      if (gone()) return;
      await this.recap(gone);
      if (gone()) return;
      await voiceBus.sequence([narratorLine(n, 'victory_2'), narratorLine(n, 'again')]);
      if (gone()) return;
      makeButtonDot(this, GAME_WIDTH / 2, 215, 'green', 30).setDepth(DEPTH.hud);
      this.ready = true;
    })();
  }

  /**
   * The words she read this episode pop up one by one, each with its picture,
   * and each is said once more. Shown, never counted: nothing says "six words".
   */
  private async recap(gone: () => boolean): Promise<void> {
    const words = episode.read.slice(0, 7);
    const gap = 150;
    for (const [i, w] of words.entries()) {
      if (gone()) return;
      const x = GAME_WIDTH / 2 + (i - (words.length - 1) / 2) * gap;
      const card = this.add.rectangle(0, 0, 130, 170, 0xfffaf0).setStrokeStyle(6, 0x5a4a8a);
      const entry = WORD_BY_ID[w];
      const counter = villainSpec().counter;
      const pic = entry ? pictureFor(entry) : counter.words.includes(w) ? `item_${counter.id}` : null;
      const parts: Phaser.GameObjects.GameObject[] = [card];
      if (pic) parts.push(fitImage(this.add.image(0, -22, pic), 100, 100));
      parts.push(this.add.text(0, 58, w, { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: '38px', color: '#1a1030' }).setOrigin(0.5));
      const c = this.add.container(x, 345, parts).setDepth(DEPTH.hud);
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: c, y: 335, duration: 700, yoyo: true, repeat: -1, delay: 300 + i * 90, ease: 'Sine.easeInOut' });
      sfxRight();
      burst(this, x, 345, { count: 30, speed: 300 });
      await voiceBus.say(wordLine(w));
      if (gone()) return;
    }
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
