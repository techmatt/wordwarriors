/**
 * The retreat: after the ultimate floors them, the heroes regroup at a hidden
 * campfire. Framed as "too strong, get ready", never as losing: everybody is
 * bouncy and fine, and the narrator names the counter-item that will win.
 *
 * She walks to the anvil-sparkle and presses green to go and make it, so the
 * transition into Spell the Spell is her choice.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { narratorLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxSelect } from '../audio/sfx';
import { GAME_WIDTH } from '../config';
import { episode, narrator, villainSpec } from '../episode/Episode';
import { bob, burst } from '../fx/juice';
import { TEX } from '../fx/textures';
import { RoomScene, type Spot } from '../world/RoomScene';

export class RetreatScene extends RoomScene {
  constructor() {
    super('Retreat');
  }

  protected background(): string {
    return 'room_camp';
  }

  protected build(): void {
    // The campfire: a column of flickering sparks.
    this.add.particles(GAME_WIDTH / 2, 470, TEX.spark, {
      speedY: { min: -160, max: -60 },
      speedX: { min: -30, max: 30 },
      scale: { start: 1.6, end: 0 },
      lifespan: 900,
      frequency: 30,
      tint: [0xff7b00, 0xffd23f, 0xff3d00],
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(470);
    this.art('prop_tent', 260, 200, 230, 430).setDepth(430);

    const friends = [episode.ally ?? narrator()];
    friends.forEach((id, i) => {
      const img = this.art(charArt(id, false), 110, 140, 860 + i * 130, 520);
      img.setDepth(520);
      bob(this, img, 6, 700);
    });

    const item = villainSpec().counter;
    const img = this.art(`item_${item.id}`, 120, 120);
    img.setAlpha(0.45);
    const glow = this.add.circle(0, -60, 70, 0xffd23f, 0.25);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
    const spot = this.addSpot('forge', 1100, 600, [glow, img], true);
    spot.enabled = false;
    this.player.place(520, 560);

    void (async () => {
      await this.narrate('retreat_1', 'retreat_2', `need_item_${episode.villain}`);
      spot.enabled = true;
      burst(this, spot.x, spot.y - 60, { count: 40 });
      void voiceBus.say(narratorLine(narrator(), 'forge_intro'));
    })();
  }

  protected override hint(): void {
    void this.narrate(`need_item_${episode.villain}`);
  }

  protected choose(_spot: Spot): void {
    sfxSelect();
    this.done();
  }
}
