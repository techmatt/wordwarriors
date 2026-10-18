/**
 * The alarm: "Bad news, Julia! Evil Smaug is coming! We need to get ready!"
 *
 * Said by the ally, or by Dada Matt with no ally (`narrator()`). The heroes
 * stand on the left; the villain crashes in on the right with a dark flash, a
 * shake and a taunt, then the narrator finishes the line. No input needed.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { fighterId, narratorLine, tauntLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxUltimate } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { advance, episode, narrator, villainSpec } from '../episode/Episode';
import { bob, burst, fitImage, flash, shake } from '../fx/juice';
import { Controls } from '../input/Controls';
import { hookState } from '../testHooks';
import { Bubbles } from '../ui/Bubbles';
import { Caption } from '../ui/Caption';

export class AlarmScene extends Phaser.Scene {
  private controls!: Controls;

  constructor() {
    super('Alarm');
  }

  create(): void {
    hookState.scene = 'Alarm';
    hookState.room = null;
    this.controls = new Controls(this);
    const v = villainSpec();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `arena_${v.arena}`).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    new Caption(this);
    new Bubbles(this);
    this.cameras.main.fadeIn(300);

    const heroes = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    if (!episode.ally) heroes.push(narrator());
    heroes.forEach((id, i) => {
      const img = fitImage(this.add.image(220 + i * 170, 560, charArt(id, false)).setOrigin(0.5, 1), 150, 190);
      bob(this, img, 6, 700 + i * 90);
    });

    void this.run();
  }

  private async run(): Promise<void> {
    const n = narrator();
    const v = episode.villain;
    const vf = villainSpec().evil;
    await voiceBus.say(narratorLine(n, `alarm_hero_${episode.hero}`));

    // The villain arrives.
    sfxUltimate();
    flash(this, 0x220022, 500);
    this.cameras.main.setBackgroundColor(0x000000);
    const dark = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0022, 0).setDepth(DEPTH.fx - 1);
    this.tweens.add({ targets: dark, fillAlpha: 0.45, duration: 600 });
    const vill = fitImage(this.add.image(GAME_WIDTH + 200, 600, charArt(v, true)).setOrigin(0.5, 1), 260 * Math.min(1.3, vf.size), 330 * Math.min(1.3, vf.size)).setDepth(DEPTH.fx);
    await new Promise<void>((resolve) =>
      this.tweens.add({ targets: vill, x: 980, duration: 700, ease: 'Back.easeOut', onComplete: () => resolve() }),
    );
    sfxBoom(3);
    shake(this, 6, 500);
    burst(this, 980, 450, { count: 90, colors: [vf.palette[0], vf.palette[1], 0xffffff], speed: 600 });
    bob(this, vill, 8, 500);

    const taunt = vf.taunts[0];
    if (taunt) await voiceBus.say(tauntLine(fighterId(v, true), taunt.key), 'instruction', { x: vill.x, y: vill.y, bubbleOffset: vill.displayHeight, active: true });
    await voiceBus.say(narratorLine(n, `alarm_villain_${v}`));
    await voiceBus.say(narratorLine(n, 'alarm_ready'));
    this.time.delayedCall(400, () => advance(this));
  }

  override update(): void {
    this.controls.update();
    if (this.controls.dev('F2')) advance(this);
    this.controls.endFrame();
  }
}
