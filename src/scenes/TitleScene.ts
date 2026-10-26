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
import { artBank } from '../art/ArtBank';
import { castSet } from '../art/needs';
import { PERSONS, ROSTER } from '../../content/battle/roster';
import { coreLine } from '../../content/voice/ids';
import { getAudioContext, unlockAudio } from '../audio/context';
import { voiceBus } from '../voice/VoiceBus';
import { startMusic } from '../audio/music';
import { sfxHit, sfxSelect } from '../audio/sfx';
import { DEPTH, FONT_HEAVY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, resetEpisode } from '../episode/Episode';
import { backdrop, bob, burst, fitImage } from '../fx/juice';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { dadLock } from '../input/dadLock';
import { hookState } from '../hookState';
import { makeButtonDot } from '../ui/ButtonDot';
import { Caption } from '../ui/Caption';
import type { SceneKey } from './keys';
import { openParent } from './ParentScene';

export class TitleScene extends Phaser.Scene {
  private controls!: Controls;
  private shoulderHeld = 0;
  private leaving = false;

  constructor() {
    super('Title' satisfies SceneKey);
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
    backdrop(this, 'room_title', 0);

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

    // The roster parades along the bottom, good and evil by turns (one of each
    // person: the dads' other forms turn up in the duel below).
    PERSONS.forEach((c, i) => {
      const x = 60 + i * ((GAME_WIDTH - 120) / (PERSONS.length - 1));
      const img = fitImage(this.add.image(x, GAME_HEIGHT - 20, charArt(c.id, i % 2 === 1)).setOrigin(0.5, 1), 100, 125);
      bob(this, img, 8, 600 + i * 40);
    });

    const logo = this.add
      .text(GAME_WIDTH / 2, 200, 'WORD WARRIORS', {
        fontFamily: FONT_HEAVY,
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

    // A looping mini-clash under the logo: a hero and a villain dash in,
    // collide in a burst, and bounce apart. A taste of what the reading buys.
    this.time.addEvent({ delay: 2600, loop: true, startAt: 1600, callback: () => this.clash() });

    const dot = makeButtonDot(this, GAME_WIDTH / 2, 380, 'green', 38).setDepth(DEPTH.hud);
    this.tweens.add({ targets: dot, y: 370, duration: 500, yoyo: true, repeat: -1 });

    // The welcome can only be heard once audio is unlocked, i.e. coming back
    // here after an episode; on a cold start the first press is the unlock.
    // Captioned like every instruction (item 039: it was the one line with no box).
    new Caption(this);
    // Its caption shows the narrator's face, and the cast was just drawn (item 065: wait for their art).
    // Its line is always Dada Matt's (`core_title`), whom a draw can leave out (hunt 7: `?seed=abc`
    // showed his face card before it loaded), so his face is waited for too.
    const castReady = artBank.ensure([...castSet(), 'face_dada_matt']);
    if (getAudioContext()?.state === 'running') this.time.delayedCall(700, () => void castReady.then(() => this.scene.isActive() && !this.leaving && voiceBus.say(coreLine('title'))));
    artBank.prefetch(castSet());

    // Whether a gamepad press counts as a user gesture for audio in Chrome is
    // unconfirmed (2026-10-18), so while audio is still locked a grown-up note
    // says one click or key turns it on. It disappears the moment it is live.
    const soundNote = this.add
      .text(10, 10, '🔈 GROWN-UPS: CLICK OR PRESS SPACE ONCE FOR SOUND', { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff' })
      .setAlpha(0.6)
      .setDepth(DEPTH.hud);
    const note = () => soundNote.setVisible(getAudioContext()?.state !== 'running');
    this.events.on(Phaser.Scenes.Events.UPDATE, note);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, note));

    this.add
      .text(GAME_WIDTH - 10, 10, 'GROWN-UPS: HOLD LB + RB, OR F9', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' })
      .setOrigin(1, 0)
      .setAlpha(0.35);
  }

  private clash(): void {
    if (this.leaving) return;
    // From whoever has loaded (item 065: the rest of the roster loads in the background); the parade's persons always have.
    const ready = (evil: boolean) => ROSTER.filter((c) => artBank.has(charArt(c.id, evil)));
    const goods = ready(false);
    const bads = ready(true);
    if (!goods.length || !bads.length) return;
    const good = goods[Math.floor(Math.random() * goods.length)]!;
    const bad = bads[Math.floor(Math.random() * bads.length)]!;
    const y = 545;
    const a = fitImage(this.add.image(-120, y, charArt(good.id, false)).setOrigin(0.5, 1), 110, 140).setDepth(5);
    const b = fitImage(this.add.image(GAME_WIDTH + 120, y, charArt(bad.id, true)).setOrigin(0.5, 1), 110, 140).setDepth(5);
    const meet = GAME_WIDTH / 2;
    this.tweens.add({ targets: a, x: meet - 60, duration: 420, ease: 'Quad.easeIn' });
    this.tweens.add({
      targets: b,
      x: meet + 60,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => {
        burst(this, meet, y - 70, { count: 50, speed: 520, colors: [good.good.palette[0], bad.evil.palette[1], 0xffffff] });
        this.cameras.main.shake(140, 0.006);
        sfxHit(2);
        for (const [img, dir] of [[a, -1], [b, 1]] as const) {
          const s = img.scale;
          this.tweens.add({ targets: img, scaleX: s * 1.25, scaleY: s * 0.8, duration: 90, yoyo: true });
          this.tweens.add({ targets: img, x: img.x + dir * 700, y: y - 40, duration: 700, delay: 120, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
        }
      },
    });
  }

  override update(_t: number, delta: number): void {
    this.controls.update();
    if (this.leaving) return;
    // Dad lock opens nothing, the grown-ups page included (item 039).
    if (!dadLock.locked && this.controls.held('lb') && this.controls.held('rb')) {
      this.shoulderHeld += delta;
      if (this.shoulderHeld > 2000) openParent(this, { back: 'Title' });
    } else this.shoulderHeld = 0;

    if (this.controls.dev('F9')) {
      openParent(this, { back: 'Title' });
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
