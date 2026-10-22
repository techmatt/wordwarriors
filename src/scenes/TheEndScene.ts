/**
 * THE END (item 085): after the victory recap's green, the last screen of an
 * episode. One of this episode's own places fills the screen (the hub she
 * explored, home or the helper's quest place), her heroes bounce on it (her,
 * and her ally or the dad who woke her), and it reads THE END. Silent but for
 * a fanfare.
 *
 * Only Dad's 2 starts a new episode here (item 082's wait, moved from the
 * recap): her buttons do nothing, so a new episode never starts without a
 * grown-up there; the small DOM cue in the corner tells him.
 *
 * Part of the victory step, as the recap is (Ending → Victory → TheEnd):
 * `advance()` from here ends the episode and opens the title.
 */

import Phaser from 'phaser';

import { hubArt } from '../../content/house/house';
import { startMusic } from '../audio/music';
import { sfxFanfare, sfxSelect } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, castArt, castScale, episode, podiumSecond } from '../episode/Episode';
import { burst, fitImage } from '../fx/juice';
import { Controls } from '../input/Controls';
import { dadPress, openDadButtons, setDadAsking } from '../input/dadButtons';
import { hookState } from '../hookState';

const THE_END_TEXT = 'THE END';

/** The episode's heroes, as the recap's podium has them (`podiumSecond`): her, then her ally or the dad who woke her. */
function theEndHeroes(): string[] {
  const second = podiumSecond();
  return [episode.hero, ...(second ? [second] : [])];
}

/** The background: the hub of this episode (home, or the helper's quest place). */
const theEndArt = (): string => hubArt(episode.place);

/** THE END's figures bob this high; the title's letters (150 px, pulsing to 1.05 around y 170) reach down to here. */
const BOB = 34;
const TITLE_BOTTOM = 245;

export class TheEndScene extends Phaser.Scene {
  private controls!: Controls;
  private closeDad: (() => void) | null = null;

  constructor() {
    super('TheEnd');
  }

  create(): void {
    hookState.scene = 'TheEnd';
    hookState.room = null;
    this.closeDad = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeDad?.();
      this.closeDad = null;
      hookState.theEnd = null;
    });
    this.controls = new Controls(this);
    // The recap's track plays on; back from the grown-ups page (which stops it) it starts again (item 089).
    startMusic('title');
    const art = theEndArt();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, art).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    // A soft wash so the heroes and the words stand out from the room.
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1030, 0.28);
    this.cameras.main.fadeIn(500, 255, 255, 255);

    const heroes = theEndHeroes();
    const ground = GAME_HEIGHT - 70;
    const gap = 300;
    // All of them smaller together, never apart, when the tallest would bob up into the title (hunt 6: chef
    // Dada Jason, 1.65 of her since item 093, bobbed his hat and forehead under THE END).
    const fit = Math.min(1, (ground - BOB - TITLE_BOTTOM) / Math.max(...heroes.map((id) => 290 * castScale(id))));
    heroes.forEach((id, i) => {
      const x = GAME_WIDTH / 2 + (i - (heroes.length - 1) / 2) * gap;
      const h = 290 * castScale(id) * fit;
      this.add.ellipse(x, ground, h * 0.6, 26, 0x000000, 0.3).setDepth(ground - 1);
      const img = fitImage(this.add.image(x, ground, castArt(id)).setOrigin(0.5, 1), h * 0.95, h).setDepth(ground);
      // Bob and squash only (sprites move only by bob and squash/scale).
      const d = 340 + i * 50;
      this.tweens.add({ targets: img, y: ground - BOB, duration: d, yoyo: true, repeat: -1, ease: 'Quad.easeOut', delay: i * 120 });
      this.tweens.add({ targets: img, scaleY: img.scaleY * 0.92, scaleX: img.scaleX * 1.06, duration: d, yoyo: true, repeat: -1, delay: d + i * 120 });
    });

    const title = this.add
      .text(GAME_WIDTH / 2, 170, THE_END_TEXT, { fontFamily: '"Arial Black", sans-serif', fontSize: '150px', color: '#ffd23f', stroke: '#5a1a7a', strokeThickness: 20 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 800, ease: 'Elastic.easeOut', delay: 250 });
    this.tweens.add({ targets: title, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1100 });
    this.time.delayedCall(300, () => {
      sfxFanfare();
      burst(this, GAME_WIDTH / 2, 170, { count: 80, speed: 480, gravity: 140, life: 1300, colors: [0xffd23f, 0xff5ab4, 0x7ad9ff, 0xffffff] });
    });

    hookState.theEnd = { art, heroes, text: THE_END_TEXT, dad: true };
    // Her buttons stay dead; Dad's 2 (dad lock or not) starts the next episode. His 1 does nothing.
    this.closeDad = openDadButtons((a) => {
      if (a !== 'yes') return;
      this.closeDad?.();
      this.closeDad = null;
      if (hookState.theEnd) hookState.theEnd.dad = false;
      sfxSelect();
      advance(this);
    }, '<span>DAD:</span> PRESS <b>2</b> TO PLAY AGAIN');
    setDadAsking(true);
  }

  override update(): void {
    this.controls.update();
    if (this.controls.dev('F2')) {
      this.closeDad?.();
      this.closeDad = null;
      sfxSelect();
      advance(this);
    }
    // F4 auto-answers: Dad's yes where he is asked.
    if (this.controls.dev('F4')) dadPress('yes');
    if (this.controls.dev('F9')) this.scene.start('Parent', { back: 'TheEnd' });
    this.controls.endFrame();
  }
}
