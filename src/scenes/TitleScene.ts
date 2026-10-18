/**
 * The title: a big flashy logo, the roster parading past, one green dot.
 *
 * One press of green (or Start, or Space/Enter) unlocks audio and starts the
 * episode, as in Seraphina: the button that wakes the pad also starts the game.
 * The grown-ups page is behind F9 or holding both shoulder buttons for two
 * seconds, which a four-year-old will not do by accident.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { ROSTER } from '../../content/battle/roster';
import { getAudioContext, unlockAudio } from '../audio/context';
import { voiceBus } from '../audio/VoiceBus';
import { startMusic } from '../audio/music';
import { sfxSelect } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, resetEpisode } from '../episode/Episode';
import { bob, burst, fitImage } from '../fx/juice';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { hookState } from '../testHooks';
import { makeButtonDot } from '../ui/ButtonDot';

export class TitleScene extends Phaser.Scene {
  private controls!: Controls;
  private shoulderHeld = 0;
  private leaving = false;

  constructor() {
    super('Title');
  }

  create(): void {
    hookState.scene = 'Title';
    hookState.room = null;
    hookState.battle = null;
    this.leaving = false;
    this.shoulderHeld = 0;
    resetEpisode();
    startMusic('title');
    this.controls = new Controls(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'room_title').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Sparkle rain behind the logo.
    this.add.particles(0, -10, TEX.star, {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 60, max: 160 },
      speedX: { min: -30, max: 30 },
      rotate: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0.2 },
      lifespan: 6000,
      frequency: 90,
      tint: [0xffd23f, 0xff5ab4, 0x7ad9ff, 0x9b5de5],
      blendMode: Phaser.BlendModes.ADD,
    });

    // The roster parades along the bottom, good on the left, evil on the right.
    ROSTER.forEach((c, i) => {
      const x = 60 + i * ((GAME_WIDTH - 120) / (ROSTER.length - 1));
      const img = fitImage(this.add.image(x, GAME_HEIGHT - 20, charArt(c.id, i % 2 === 1)).setOrigin(0.5, 1), 100, 125);
      bob(this, img, 8, 600 + i * 40);
    });

    const logo = this.add
      .text(GAME_WIDTH / 2, 200, 'WORD WARRIORS', {
        fontFamily: '"Arial Black", sans-serif',
        fontSize: '112px',
        color: '#ffd23f',
        stroke: '#2a0a4a',
        strokeThickness: 18,
        shadow: { offsetX: 0, offsetY: 10, color: '#000000', blur: 0, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    logo.setScale(0);
    this.tweens.add({ targets: logo, scale: 1, duration: 700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: logo, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const dot = makeButtonDot(this, GAME_WIDTH / 2, 380, 'green', 38).setDepth(DEPTH.hud);
    this.tweens.add({ targets: dot, y: 370, duration: 500, yoyo: true, repeat: -1 });

    // The welcome can only be heard once audio is unlocked, i.e. coming back
    // here after an episode; on a cold start the first press is the unlock.
    if (getAudioContext()?.state === 'running') this.time.delayedCall(700, () => void voiceBus.say('core_title'));

    // Whether a gamepad press counts as a user gesture for audio in Chrome is
    // unconfirmed (2026-10-18), so while audio is still locked a grown-up note
    // says one click or key turns it on. It disappears the moment it is live.
    const soundNote = this.add
      .text(10, 10, '🔈 grown-ups: click or press Space once for sound', { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff' })
      .setAlpha(0.6)
      .setDepth(DEPTH.hud);
    this.events.on(Phaser.Scenes.Events.UPDATE, () => soundNote.setVisible(getAudioContext()?.state !== 'running'));

    this.add
      .text(GAME_WIDTH - 10, 10, 'grown-ups: hold LB + RB, or F9', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' })
      .setOrigin(1, 0)
      .setAlpha(0.35);
  }

  override update(_t: number, delta: number): void {
    this.controls.update();
    if (this.leaving) return;
    if (this.controls.held('lb') && this.controls.held('rb')) {
      this.shoulderHeld += delta;
      if (this.shoulderHeld > 2000) this.scene.start('Parent', { back: 'Title' });
    } else this.shoulderHeld = 0;

    if (this.controls.dev('F9')) {
      this.scene.start('Parent', { back: 'Title' });
      return;
    }
    if (this.controls.pressed('green') || this.controls.pressed('start')) {
      this.leaving = true;
      unlockAudio();
      sfxSelect();
      burst(this, GAME_WIDTH / 2, 380, { count: 60, speed: 500 });
      this.cameras.main.fadeOut(400, 255, 255, 255);
      this.time.delayedCall(420, () => advance(this));
    }
    this.controls.endFrame();
  }
}
