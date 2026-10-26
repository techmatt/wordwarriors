/**
 * The alarm: "Bad news, Julia! Evil Smaug is coming! We need to get ready!"
 *
 * Said by the ally, or by Dada Matt with no ally (`narrator()`). The heroes
 * stand on the left; the villain crashes in on the right with a dark flash, a
 * shake and a taunt, then the narrator finishes the line. No input needed.
 *
 * Parked (CLAUDE.md): out of the episode, kept on purpose; reach it with ?scene=alarm (BootScene).
 */

import Phaser from 'phaser';

import { personOf } from '../../content/battle/roster';
import { fighterId, heroKey, narratorLine, tauntLine, villainKey } from '../../content/voice/ids';
import { startMusic } from '../audio/music';
import { voiceBus } from '../voice/VoiceBus';
import { sfxBoom, sfxSiren, sfxUltimate } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, castArt, episode, narrator, villainSpec } from '../episode/Episode';
import { bob, burst, fitImage, flash, floatText, shake } from '../fx/juice';
import { SceneGen } from '../fx/sceneGen';
import { Controls } from '../input/Controls';
import { hookState } from '../hookState';
import { Bubbles } from '../ui/Bubbles';
import { Caption } from '../ui/Caption';
import type { SceneKey } from './keys';

export class AlarmScene extends Phaser.Scene {
  private controls!: Controls;
  private runs = new SceneGen(this);
  private heroImgs: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Alarm' satisfies SceneKey);
  }

  create(): void {
    this.runs.begin();
    hookState.scene = 'Alarm';
    hookState.room = null;
    this.heroImgs = [];
    this.controls = new Controls(this);
    const v = villainSpec();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `arena_${v.arena}`).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    new Caption(this);
    new Bubbles(this);
    this.cameras.main.fadeIn(300);

    const heroes = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    if (!episode.ally) heroes.push(narrator());
    heroes.forEach((id, i) => {
      const img = fitImage(this.add.image(220 + i * 170, 560, castArt(id)).setOrigin(0.5, 1), 150, 190).setDepth(DEPTH.fx + 1);
      bob(this, img, 6, 700 + i * 90);
      this.heroImgs.push(img);
    });

    void this.run();
  }

  private async run(): Promise<void> {
    // Stop if this run of the scene ends (F2) while a line is playing.
    const gone = this.runs.watch();
    // Siren and a red pulse first: something is happening.
    sfxSiren();
    const red = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff2040, 0).setDepth(DEPTH.hud - 1);
    this.tweens.add({ targets: red, fillAlpha: 0.25, duration: 250, yoyo: true, repeat: 2, onComplete: () => red.destroy() });
    await new Promise((r) => this.time.delayedCall(1300, r));
    if (gone()) return;
    const n = narrator();
    const v = episode.villain;
    const vf = villainSpec().evil;
    await voiceBus.say(narratorLine(n, heroKey('alarm_hero', personOf(episode.hero))));
    if (gone()) return;

    // The villain arrives, and the music turns.
    startMusic('battle');
    sfxUltimate();
    flash(this, 0x220022, 500);
    this.cameras.main.setBackgroundColor(0x000000);
    const dark = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0022, 0).setDepth(DEPTH.fx - 1);
    this.tweens.add({ targets: dark, fillAlpha: 0.45, duration: 600 });
    const vill = fitImage(this.add.image(GAME_WIDTH + 200, 600, castArt(v, true)).setOrigin(0.5, 1), 260 * Math.min(1.3, vf.size), 330 * Math.min(1.3, vf.size)).setDepth(DEPTH.fx);
    await new Promise<void>((resolve) =>
      this.tweens.add({ targets: vill, x: 980, duration: 700, ease: 'Back.easeOut', onComplete: () => resolve() }),
    );
    if (gone()) return;
    sfxBoom(3);
    shake(this, 6, 500);
    // The heroes jump with surprise: a squash, then a stretch upwards.
    for (const img of this.heroImgs) {
      const s = img.scale;
      this.tweens.add({ targets: img, scaleX: s * 0.85, scaleY: s * 1.25, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
      floatText(this, img.x, img.y - img.displayHeight - 10, '!', '#ffd23f', 64);
    }
    burst(this, 980, 450, { count: 90, colors: [vf.palette[0], vf.palette[1], 0xffffff], speed: 600 });
    bob(this, vill, 8, 500);

    const taunt = vf.taunts[0];
    if (taunt) await voiceBus.say(tauntLine(fighterId(v, true), taunt.key), 'instruction', { x: vill.x, y: vill.y, bubbleOffset: vill.displayHeight, active: true });
    if (gone()) return;
    await voiceBus.say(narratorLine(n, villainKey('alarm_villain', v)));
    if (gone()) return;
    await voiceBus.say(narratorLine(n, 'alarm_ready'));
    if (gone()) return;
    this.time.delayedCall(400, () => advance(this));
  }

  override update(): void {
    this.controls.update();
    if (this.controls.dev('F2')) advance(this);
    this.controls.endFrame();
  }
}
