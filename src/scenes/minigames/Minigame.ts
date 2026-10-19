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
import { sfxRight, sfxSummon, sfxWrong } from '../../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../../config';
import { episode, narrator } from '../../episode/Episode';
import { burst, fitImage, floatText, popIn, shockwave, wiggle } from '../../fx/juice';
import { TEX } from '../../fx/textures';
import { progress } from '../../state/progress';
import type { ItemKind } from '../../state/ProgressStore';
import type { KeepOut } from '../../ui/Caption';
import type { Speaker } from '../../ui/Portrait';
import { RoomScene } from '../../world/RoomScene';

export abstract class Minigame extends RoomScene {
  /**
   * The parked v0.1 games put names and words up as reading targets the
   * dialogue box does not know about (Word to Picture reads ELLIE beside her
   * face card), so there the box stays along the bottom and prints no name.
   * A game that tells the box what to keep clear (the sentence room) opts in.
   */
  protected dialogueAware = false;

  protected override keepOut(): KeepOut[] {
    return this.dialogueAware ? super.keepOut() : [];
  }

  protected override showSpeakerName(s: Speaker): boolean {
    return this.dialogueAware && super.showSpeakerName(s);
  }

  protected itemIndex = 0;
  protected wrongTries = 0;
  private rightN = 0;
  private wrongN = 0;
  private meter: Phaser.GameObjects.Container | null = null;
  private meterSlots: Phaser.GameObjects.Arc[] = [];
  private filled = 0;
  private slotGlyphs: Phaser.GameObjects.Text[] = [];
  private slotsTotal = 0;
  /** The emoji each piece is drawn as: a gem shard, a star, a sparkle. */
  private pieceGlyph = '⭐';

  /**
   * Build the piece meter: `n` slots at the top, with the prize's icon at the
   * end. The prize starts as a faint ghost and fills in as pieces land, so she
   * watches the thing being made.
   */
  protected makeMeter(n: number, prizeArt: string, pieceGlyph = '⭐'): void {
    this.filled = 0;
    this.slotGlyphs = [];
    this.slotsTotal = n;
    this.pieceGlyph = pieceGlyph;
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
    const piece = this.add.text(x, y, this.pieceGlyph, { fontSize: '54px' }).setOrigin(0.5).setDepth(DEPTH.sparkles);
    const trailFx = this.add
      .particles(0, 0, TEX.spark, { speed: 30, scale: { start: 1, end: 0 }, lifespan: 400, frequency: 20, tint: [color, 0xffffff], blendMode: Phaser.BlendModes.ADD })
      .setDepth(DEPTH.sparkles - 1);
    trailFx.startFollow(piece);
    const filledNow = this.filled;
    this.tweens.add({
      targets: piece,
      x: slot.x,
      y: this.meter.y,
      scale: 0.6,
      duration: 650,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        trailFx.stop();
        this.time.delayedCall(450, () => trailFx.destroy());
        slot.setFillStyle(color, 1);
        piece.setPosition(slot.x, this.meter!.y).setDepth(DEPTH.hud + 1);
        popIn(this, piece, 0.6);
        popIn(this, slot, 1);
        this.slotGlyphs.push(piece);
        burst(this, slot.x, this.meter!.y, { count: 16, speed: 200, colors: [color, 0xffffff] });
        // The prize fills in, piece by piece.
        const prize = this.meter?.getData('prize') as Phaser.GameObjects.Image | undefined;
        if (prize) {
          const s = prize.scale;
          prize.setAlpha(0.35 + 0.65 * (filledNow / this.slotsTotal));
          this.tweens.add({ targets: prize, scale: s * 1.3, duration: 140, yoyo: true });
        }
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
    for (const s of [...this.meterSlots, ...this.slotGlyphs]) this.tweens.add({ targets: s, scale: 1.5, alpha: 0, duration: 500 });
    this.slotGlyphs = [];
    await this.say(narratorLine(narrator(), madeLine));
    await this.wait(400);
    return big;
  }

  /** A right answer. `confirmId` is the word/sound line spoken as confirmation. */
  protected async right(kind: ItemKind, id: string, x: number, y: number, color: number, confirmId: string | null): Promise<void> {
    this.locked = true;
    progress.record(kind, id, this.wrongTries === 0, this.wrongTries);
    if (kind !== 'sounds' && !episode.read.includes(id)) episode.read.push(id);
    sfxRight();
    burst(this, x, y, { count: 50, speed: 450 });
    shockwave(this, x, y, color, 140);
    floatText(this, x, y - 60, ['YES!', 'WOW!', 'YAY!', 'COOL!'][this.rightN % 4]!, '#ffd23f');
    this.addPiece(x, y, color);
    if (confirmId) await this.say(confirmId);
    this.rightN++;
    await this.say(narratorLine(narrator(), `right_${((this.rightN - 1) % 4) + 1}`));
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
    // Cartoon dizzy stars circle the thing she picked, then pop away: funny, not wrong.
    for (let i = 0; i < 4; i++) {
      const star = this.add.image(obj.x, obj.y - 90, TEX.star).setTint(0xffd23f).setDepth(DEPTH.sparkles);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 900,
        onUpdate: (tw) => {
          const a = tw.getValue()! * Math.PI * 4 + (i * Math.PI) / 2;
          star.setPosition(obj.x + Math.cos(a) * 55, obj.y - 90 + Math.sin(a) * 16);
        },
        onComplete: () => star.destroy(),
      });
    }
    this.wrongN++;
    await this.say(narratorLine(narrator(), `wrong_${((this.wrongN - 1) % 4) + 1}`));
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /**
   * After two misses on one item the right answer starts to sparkle, gently:
   * a scaffold so she always gets there, never a penalty or a "wrong" sound.
   */
  protected sparkleAnswer(): void {
    // Looked up directly: some games' correctSpot() is a dev cheat with side effects.
    const spot = this.spots.find((s) => s.correct === true && s.enabled);
    if (!spot || spot.obj.getData('sparkling')) return;
    spot.obj.setData('sparkling', true);
    const b = spot.obj.getBounds();
    const glow = this.add
      .particles(spot.x, b.centerY, TEX.star, {
        speed: { min: 20, max: 70 },
        scale: { start: 0.7, end: 0 },
        lifespan: 900,
        frequency: 90,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-b.width / 2, -b.height / 2, b.width, b.height) } as never,
        tint: [0xffd23f, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(spot.obj.depth + 1);
    spot.obj.once(Phaser.GameObjects.Events.DESTROY, () => glow.destroy());
  }

  protected override extraHooks() {
    return {};
  }
}
