/**
 * What every side room's game shares (item 072: was `Minigame`, a name now kept
 * for the pool's entries, `src/rules/minigames.ts`), the parked v0.1 games
 * (src/scenes/minigames/) and the five live rooms alike: the miss count
 * (`wrongTries`), the no-fail `wrong()` (a fizzle-and-giggle, a wiggle, a
 * funny line, the same item again; no penalty, nothing lost), the sparkle on
 * the answer after two misses (`sparkleAnswer`), `ARRIVE_MS`, the words' INK
 * and LIT, and free play closed.
 *
 * The piece meter (`makeMeter`, `addPiece`, `completePrize`) and `right()`
 * belong to the parked games alone. The five live rooms (the sentence game,
 * the word machine, Charge the Spell, the Stretchy Bridge, the Shape-Shifter) extend
 * `HouseSideRoom` below: their slot, the room's art, the arrival and the way
 * back to the hub, the read recorded, and Dad's buttons.
 */

import Phaser from 'phaser';

import { WORD_BY_ID, pictureFor } from '../../content/phonics/words';
import { narratorLine } from '../../content/voice/ids';
import { variant } from '../episode/lineVariants';
import { sfxRight, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { voiceBus } from '../audio/VoiceBus';
import { DAD_AWAY_MS, DEPTH, GAME_WIDTH } from '../config';
import { backToHub, castFace, episode, narrator, planFor, type Slot, type Step } from '../episode/Episode';
import { burst, fitImage, floatText, popIn, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { openDadButtons, setDadAsking, type DadAnswer } from '../input/dadButtons';
import { dadLock } from '../input/dadLock';
import { isLeaving } from '../fx/sceneGen';
import type { RoomPlan } from '../rules/sentences';
import { progress } from '../state/progress';
import type { ItemKind } from '../state/ProgressStore';
import type { KeepOut } from '../ui/Caption';
import type { Speaker } from '../ui/Portrait';
import { RoomScene } from './RoomScene';

/** The side rooms' words (the sentence banner, the machine's panel): ink, and lit while said. */
export const INK = '#1a1030';
export const LIT = '#ff3d7a';
/** A moment to look round a side room she has just walked into, before anyone talks. */
export const ARRIVE_MS = 800;

/** A side room's plan for `slot`, which must be a `kind` game: `scene` names the room in the error. */
export function sidePlan<K extends RoomPlan['kind']>(scene: string, slot: Slot, kind: K): Extract<RoomPlan, { kind: K }> {
  const p = planFor(slot);
  if (p.kind !== kind) throw new Error(`${scene}: room ${slot} plays ${p.game}`);
  return p as Extract<RoomPlan, { kind: K }>;
}

export abstract class SideRoom extends RoomScene {
  /**
   * The parked v0.1 games put names and words up as reading targets the
   * dialogue box does not know about (Word to Picture reads ELLIE beside her
   * face card), so there the box stays along the bottom and prints no name.
   * Every live room tells the box what to keep clear and opts in (`HouseSideRoom`).
   */
  protected dialogueAware = false;

  protected override keepOut(): KeepOut[] {
    return this.dialogueAware ? super.keepOut() : [];
  }

  protected override showSpeakerName(s: Speaker): boolean {
    return this.dialogueAware && super.showSpeakerName(s);
  }

  /**
   * Free play (item 060): closed. The parked v0.1 games are answer rooms
   * throughout; each live room opens it in its own phases where no answer waits.
   */
  protected override playOpen(): boolean {
    return false;
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
    await this.say(narratorLine(narrator(), variant('right')));
    this.wrongTries = 0;
  }

  /** A wrong answer: funny, harmless, then try again. */
  protected async wrong(obj: Phaser.GameObjects.Container): Promise<void> {
    this.locked = true;
    this.wrongTries++;
    this.giggle(obj, obj.x, obj.y - 120, this.wrongN);
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
    await this.say(narratorLine(narrator(), variant('wrong')));
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
    // A room that hides the picked spot before clearing it stops this too (hunt 6: the Shape-Shifter's
    // stars kept rising from the empty floor through the morph and the praise).
    spot.obj.setData('sparkle', glow);
  }
}

/**
 * The five live side rooms (the sentence game, the word machine, Charge the
 * Spell, the Stretchy Bridge, the Shape-Shifter): a room off the hub for one of the episode's
 * slots, whose answers it records and whose way out leads back to the hub.
 * The parked v0.1 games extend SideRoom alone.
 */
export abstract class HouseSideRoom extends SideRoom {
  /** Every live room keeps its reading targets in keepOut() and shows no names as targets: the box places itself and names its speaker. */
  protected override dialogueAware = true;
  /** The episode's slot this room plays (the attic is `counter`). */
  protected slot: Slot = 'a';
  /** The side room it plays in (content/house/house.ts): its art, entry and gap. Each room sets it from its plan in init. */
  protected roomId = '';
  private dadCloser: (() => void) | null = null;
  /** Time spent waiting for Dad's answer (scene clock, paused under dad lock and while a line plays). */
  private dadWaitMs = 0;
  /** Times this visit's wait for Dad ran out and the episode went solo (the hooks report it). */
  protected dadTimeouts = 0;

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    this.slot = data.slot ?? 'a';
    this.dadWaitMs = 0;
    this.dadTimeouts = 0;
  }

  override create(): void {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.closeDad());
  }

  /** F9 to the parent page and back reopens this same room. */
  protected override sceneData(): object {
    return { step: this.step, slot: this.slot };
  }

  protected background(): string {
    return `room_side_${this.roomId}`;
  }

  /** She walks in at (x, y): a hop and a puff where she comes in. */
  protected enter(x: number, y: number): void {
    this.player.place(x, y);
    this.player.hop();
    burst(this, this.player.x, this.player.y - 40, { count: 16, speed: 220 });
    sfxWhoosh();
  }

  /** The room was done before this run (back from the parent page at the end): straight back to the hub. */
  protected backToHubSoon(): void {
    this.time.delayedCall(600, () => backToHub(this, this.slot));
  }

  /** A word's picture: a character's word shows that character's face in this episode's form (`castFace`). */
  protected wordArt(word: string): string {
    const w = WORD_BY_ID[word];
    return w ? pictureFor(w, castFace) : `pic_${word}`;
  }

  /** The visit is over: fade out, back to the hub. */
  protected fadeToHub(): void {
    this.fadeOutThen(() => backToHub(this, this.slot));
  }

  /**
   * A word read: recorded under `words`, taken from her word bag when right
   * first time (else back in, so it comes round again soon), and learnt by the
   * episode now, so a skip mid-celebration loses nothing: read, fetched (a
   * battle item; not the attic's counter, `fetch: false`) and, on the visit's
   * `last` word, this slot done. Each room records its own extras.
   */
  protected recordRead(word: string, firstTry: boolean, wrongTries: number, { fetch = true, last = true } = {}): void {
    progress.record('words', word, firstTry, wrongTries);
    if (firstTry) progress.takeFromBag(word);
    else progress.returnToBag(word);
    this.recordDone(word, { fetch, last });
  }

  /** Read with the helper, no grown-up to judge (item 106): modelled in the store (no read, the bag untouched), and done for the episode like a read. */
  protected recordModelled(word: string, { fetch = true, last = true } = {}): void {
    progress.model('words', word);
    this.recordDone(word, { fetch, last });
  }

  /** The episode learns the word: read, fetched (unless `fetch` is false) and, on the visit's `last` word, this slot done. */
  protected recordDone(word: string, { fetch, last }: { fetch: boolean; last: boolean }): void {
    if (!episode.read.includes(word)) episode.read.push(word);
    if (fetch && !episode.fetched.includes(word)) episode.fetched.push(word);
    if (last && !episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);
  }

  /**
   * Dad's buttons open for this room (any set it had open closes first); they close at shutdown. A press
   * once the room is on its way out does nothing (hunt 6: they stay open until Phaser stops the room, a
   * frame after key 0 or F9, and a 2 in that frame recorded a debug run's Charge read in the real store).
   */
  protected openDad(onPress: (a: DadAnswer) => void): void {
    this.closeDad();
    this.dadCloser = openDadButtons((a) => {
      if (isLeaving(this) || this.fadingOut) return;
      // Any press ends solo mode (item 106): he is here after all.
      if (episode.solo) {
        episode.solo = false;
        this.noteActivity();
      }
      onPress(a);
    });
  }

  /** A question is put to Dad: his cue lights and the wait for him starts again. */
  protected askDad(): void {
    this.dadWaitMs = 0;
    setDadAsking(true);
  }

  /** The wait for Dad starts again (a line is about to play over it). */
  protected resetDadWait(): void {
    this.dadWaitMs = 0;
  }

  /**
   * Called each frame while Dad is asked: true once nothing has come from him
   * for DAD_AWAY_MS (paused under dad lock and while a line plays). Then the
   * episode goes solo (item 106) and his cue goes out; the room carries on
   * without him.
   */
  protected dadAway(deltaMs: number): boolean {
    if (dadLock.locked || voiceBus.busy) return false;
    this.dadWaitMs += deltaMs;
    if (this.dadWaitMs < DAD_AWAY_MS) return false;
    this.dadWaitMs = 0;
    this.dadTimeouts++;
    episode.solo = true;
    setDadAsking(false);
    return true;
  }

  protected closeDad(): void {
    this.dadCloser?.();
    this.dadCloser = null;
  }
}
