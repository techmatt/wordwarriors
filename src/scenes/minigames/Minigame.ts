/**
 * What every minigame shares: a round of 3–5 items, a piece meter that
 * visibly builds the thing the battle will use, and the no-fail answer rules.
 *
 * - Right: coin chime, burst, a piece flies to the meter, praise, and the
 *   target (word or sound) spoken as confirmation.
 * - Wrong: a fizzle-and-giggle, a wiggle, a funny line, and the same item
 *   again. No penalty, no counting, nothing lost. Progress records whether
 *   the first try was right, for weighting future rounds and the parent page.
 *
 * Narrator lines rotate (right_1..4, wrong_1..4) so the jokes do not repeat
 * back to back.
 */

import Phaser from 'phaser';

import { narratorLine } from '../../../content/voice/ids';
import { voiceBus } from '../../audio/VoiceBus';
import { sfxRight, sfxSummon, sfxWrong } from '../../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../../config';
import { narrator } from '../../episode/Episode';
import { burst, fitImage, floatText, popIn, shockwave, wiggle } from '../../fx/juice';
import { progress } from '../../state/progress';
import type { ItemKind } from '../../state/ProgressStore';
import { RoomScene } from '../../world/RoomScene';

export abstract class Minigame extends RoomScene {
  protected itemIndex = 0;
  protected wrongTries = 0;
  private rightN = 0;
  private wrongN = 0;
  private meter: Phaser.GameObjects.Container | null = null;
  private meterSlots: Phaser.GameObjects.Arc[] = [];
  private filled = 0;

  /** Build the piece meter: `n` slots at the top, with the prize's icon at the end. */
  protected makeMeter(n: number, prizeArt: string): void {
    this.filled = 0;
    const gap = 70;
    const x0 = GAME_WIDTH / 2 - ((n - 1) * gap) / 2 - 40;
    this.meterSlots = [];
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < n; i++) {
      const slot = this.add.circle(x0 + i * gap, 0, 24, 0x000000, 0.45).setStrokeStyle(4, 0xffffff, 0.8);
      this.meterSlots.push(slot);
      parts.push(slot);
    }
    const prize = fitImage(this.add.image(x0 + n * gap + 30, 0, prizeArt), 80, 80).setAlpha(0.35);
    parts.push(prize);
    this.meter = this.add.container(0, 48, parts).setDepth(DEPTH.hud);
    this.meter.setData('prize', prize);
  }

  /** A piece flies from (x,y) into the next meter slot. */
  protected addPiece(x: number, y: number, color: number): void {
    const slot = this.meterSlots[this.filled];
    this.filled++;
    if (!slot || !this.meter) return;
    const piece = this.add.star(x, y, 5, 10, 22, color).setDepth(DEPTH.sparkles).setStrokeStyle(3, 0xffffff);
    this.tweens.add({
      targets: piece,
      x: slot.x,
      y: this.meter.y,
      angle: 360,
      duration: 650,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        piece.destroy();
        slot.setFillStyle(color, 1);
        popIn(this, slot, 1);
        burst(this, slot.x, this.meter!.y, { count: 16, speed: 200, colors: [color, 0xffffff] });
      },
    });
  }

  /** The prize assembles: everything flies together into the big icon. */
  protected async completePrize(prizeArt: string, madeLine: string): Promise<Phaser.GameObjects.Image> {
    await this.wait(700);
    sfxSummon();
    const big = fitImage(this.add.image(GAME_WIDTH / 2, 330, prizeArt), 220, 220).setDepth(DEPTH.sparkles);
    popIn(this, big, big.scale);
    shockwave(this, GAME_WIDTH / 2, 330, 0xffd23f, 300);
    burst(this, GAME_WIDTH / 2, 330, { count: 120, speed: 700, life: 1100 });
    const bs = big.scale;
    this.tweens.add({ targets: big, scaleX: bs * 1.12, scaleY: bs * 0.9, duration: 160, yoyo: true, repeat: 3, delay: 380 });
    for (const s of this.meterSlots) this.tweens.add({ targets: s, scale: 1.5, alpha: 0, duration: 500 });
    await voiceBus.say(narratorLine(narrator(), madeLine));
    await this.wait(400);
    return big;
  }

  /** A right answer. `confirmId` is the word/sound line spoken as confirmation. */
  protected async right(kind: ItemKind, id: string, x: number, y: number, color: number, confirmId: string | null): Promise<void> {
    this.locked = true;
    progress.record(kind, id, this.wrongTries === 0, this.wrongTries);
    sfxRight();
    burst(this, x, y, { count: 50, speed: 450 });
    shockwave(this, x, y, color, 140);
    floatText(this, x, y - 60, ['YES!', 'WOW!', 'YAY!', 'COOL!'][this.rightN % 4]!, '#ffd23f');
    this.addPiece(x, y, color);
    if (confirmId) await voiceBus.say(confirmId);
    this.rightN++;
    await voiceBus.say(narratorLine(narrator(), `right_${((this.rightN - 1) % 4) + 1}`));
    this.wrongTries = 0;
  }

  /** A wrong answer: funny, harmless, then try again. */
  protected async wrong(obj: Phaser.GameObjects.Container): Promise<void> {
    this.locked = true;
    this.wrongTries++;
    sfxWrong();
    wiggle(this, obj);
    this.player.wobble();
    floatText(this, obj.x, obj.y - 120, ['OOPS!', 'HEE HEE!', 'SILLY!', 'BOING!'][this.wrongN % 4]!, '#7ad9ff', 34);
    this.wrongN++;
    await voiceBus.say(narratorLine(narrator(), `wrong_${((this.wrongN - 1) % 4) + 1}`));
    this.locked = false;
  }

  protected override extraHooks() {
    return {};
  }
}
