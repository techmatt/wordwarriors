/**
 * The journey map: a winding path of stops, one per step of the episode, with
 * her character hopping from the stop she just finished to the next one.
 *
 * Shown for about two seconds before each battle and the victory, so a
 * four-year-old can see where she is and what is coming: her bed, the house,
 * swords, the house again, swords, a trophy (icons from Episode's
 * journeyStops). Nothing to read and no input needed; green skips ahead.
 */

import Phaser from 'phaser';

import { sfxSelect, sfxStep } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { castArt, episode, journeyStops, startStep, villainSpec } from '../episode/Episode';
import { burst, fitImage, popIn } from '../fx/juice';
import { Controls } from '../input/Controls';
import { hookState } from '../hookState';

const HOLD_MS = 2200;

export class JourneyScene extends Phaser.Scene {
  private controls!: Controls;
  private leaving = false;

  constructor() {
    super('Journey');
  }

  create(): void {
    hookState.scene = 'Journey';
    hookState.room = null;
    this.leaving = false;
    this.controls = new Controls(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'room_title').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setTint(0x9a8ab8);
    this.cameras.main.fadeIn(200);

    const stops = journeyStops();
    const n = stops.length;
    // A gentle zig-zag across the screen.
    const pos = stops.map((_, i) => ({ x: 110 + (i * (GAME_WIDTH - 220)) / (n - 1), y: 380 + (i % 2 === 0 ? -60 : 60) }));

    const g = this.add.graphics();
    g.lineStyle(14, 0xfff3c4, 0.8);
    g.beginPath();
    pos.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.strokePath();

    const here = stops.findIndex((s) => s.index === episode.stepIndex);
    stops.forEach((s, i) => {
      const done = i < here;
      const disc = this.add.circle(pos[i]!.x, pos[i]!.y, 44, done ? 0x44d95a : i === here ? 0xffd23f : 0x3a2a6a).setStrokeStyle(6, 0xffffff);
      const icon = this.add.text(pos[i]!.x, pos[i]!.y, s.icon, { fontSize: '46px' }).setOrigin(0.5);
      if (!done && i !== here) icon.setAlpha(0.55);
      popIn(this, disc, 1, i * 40);
      popIn(this, icon, 1, i * 40);
    });

    // The villain waits at the battle she is heading for, small and grumpy:
    // this one, when this stop is a battle (item 039: it stood at the next one,
    // and before battle 2 it was gone).
    const vStop = stops.findIndex((s, i) => i >= here && s.icon === '⚔️');
    if (vStop >= 0) {
      // Beside the stop, clear of her when she lands on it.
      const dx = vStop === here ? 78 : 30;
      const v = fitImage(this.add.image(pos[vStop]!.x + dx, pos[vStop]!.y - 50, castArt(villainSpec().id, true)).setOrigin(0.5, 1), 60, 75);
      this.tweens.add({ targets: v, y: v.y - 6, duration: 400, yoyo: true, repeat: -1 });
    }

    // Her character hops from the last stop to this one.
    const from = pos[Math.max(0, here - 1)]!;
    const to = pos[Math.max(0, here)]!;
    const hero = fitImage(this.add.image(from.x, from.y - 40, castArt(episode.hero)).setOrigin(0.5, 1), 80, 100).setDepth(DEPTH.hud);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 700,
      delay: 450,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        hero.x = Phaser.Math.Linear(from.x, to.x, t);
        hero.y = Phaser.Math.Linear(from.y, to.y, t) - 40 - Math.sin(t * Math.PI) * 90;
      },
      onComplete: () => {
        sfxStep(4);
        burst(this, to.x, to.y, { count: 40, speed: 320 });
        const s = hero.scale;
        this.tweens.add({ targets: hero, scaleX: s * 1.2, scaleY: s * 0.8, duration: 100, yoyo: true });
      },
    });
    this.time.delayedCall(HOLD_MS, () => this.go());
  }

  private go(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(200);
    this.time.delayedCall(220, () => startStep(this));
  }

  override update(): void {
    this.controls.update();
    if (this.controls.pressed('green') || this.controls.dev('F2')) {
      sfxSelect();
      this.go();
    }
    if (this.controls.dev('F9') && !this.leaving) this.scene.start('Parent', { back: 'Journey' });
    this.controls.endFrame();
  }
}
