/**
 * The Stretchy Bridge (item 054): a side room where she blends a whole word.
 * Nothing here can be won from the first letter alone.
 *
 * A gap crosses the room (lava in the house, a river or a chasm at a quest
 * place: `gapFor`, content/house/house.ts). The word's letters are stepping
 * stones over it, one stone per sound unit (SH is one stone). She pushes the
 * stick and slides across, slower than she walks (BRIDGE.slide). While she is
 * on a stone its sound plays **held** (`voiceBus.hold`, src/audio/holdSound.ts):
 * a vowel or a sound you can stretch (M S F L N R V Z SH TH) is one smooth
 * stretched sound (HELD_MS; cut short when she steps off), so a slow
 * slide is "mmm-aaa-t", and how slowly she slides is how slowly she stretches
 * the word; standing on, it sounds again after BRIDGE.resoundMs of quiet. A
 * stop sound plays once each step on, never with an "uh". It works from whatever clip is in place, so Matt's
 * recordings (`voice:clip`) drop in.
 *
 * On the far bank are 2–3 pictures that share the word's start and differ
 * later (MAP, MAT, MAN; src/rules/bridge.ts `bridgePictures`). She walks to
 * the one she read and presses green.
 *
 * Help fades per word (`bridgeLevel`, ProgressStore `bridgeLevels`):
 *   1. the stones sound themselves as she slides; the pictures show from the start;
 *   2. the stones are silent unless Dad presses 2 for a hint (then they sound);
 *   3. silent stones; on the far bank she says the whole word aloud and Dad
 *      presses 2, and only then do the pictures appear. Dad's 1 (or nothing
 *      for BRIDGE.dadWaitMs) replays the slide with sounds; after
 *      BRIDGE.replays the pictures come anyway.
 * Right first time with no help moves the word up a level; a hint, a replay
 * or a wrong picture moves it down one.
 *
 * A wrong pick never penalises, but guessing is slower than reading: the game
 * sounds out what she picked, unit by unit, its letters over its picture
 * ("You picked... M, A, P"), then where the bridge differs ("But the bridge
 * ends with... T", that stone flashing), and she slides again. A right pick:
 * the word is said for the first time, its picture flies into her bag (every
 * word read here is a battle item), and the next bridge comes.
 *
 * Speech rule: the word is never said before she has picked it; the stones
 * and the sound-out are letter sounds, each its own `letter_<x>_sound` line,
 * never captioned (the stones light instead).
 */

import Phaser from 'phaser';

import { BANK_BY_WORD } from '../../content/phonics/bank';
import { canHold } from '../../content/phonics/letters';
import { SIDE_ROOM_BY_ID, gapFor, type BridgeGap } from '../../content/house/house';
import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { RIGHT_VARIANTS } from '../../content/voice/script';
import { HELD_MS } from '../audio/holdSound';
import { voiceBus, type HeldSound, type Utterance } from '../audio/VoiceBus';
import { sfxPoof, sfxRight, sfxSelect, sfxStep, sfxSummon, sfxWhoosh, sfxWrong } from '../audio/sfx';
import { BRIDGE, DEPTH, FONT_COMIC, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { backToHub, episode, narrator, planFor, type Slot, type Step } from '../episode/Episode';
import { burst, fitImage, floatText, popIn, shockwave, wiggle } from '../fx/juice';
import { TEX } from '../fx/textures';
import { dadPress, openDadButtons, setDadAsking, type DadAnswer } from '../input/dadButtons';
import { dadLock } from '../input/dadLock';
import { bridgeLevel, nextBridgeLevel, whereDiffers, type BridgeLevel, type BridgePlan, type BridgeRound } from '../rules/bridge';
import { progress } from '../state/progress';
import type { RoomInfo } from '../testHooks';
import { Bag } from '../ui/Bag';
import type { CaptionMode, KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, INK, LIT, Minigame } from './minigames/Minigame';

/**
 * `intro`: a new bridge appears and the helper talks; she waits on the near
 * bank. `slide`: she crosses. `say`: level 3, on the far bank, waiting for
 * Dad. `replay`: the stones sound themselves in turn (a hint, Dad's 1).
 * `pick`: the pictures are up; she walks to one. `check`: a pick is playing
 * out. `done`: back to the hub.
 */
type Phase = 'intro' | 'slide' | 'say' | 'replay' | 'pick' | 'check' | 'done';

/** The gap, left to right, from the floor's back edge down. */
const GAP = { left: 330, right: 900, top: 418 };
/** The gap runs off the bottom of the screen. */
const GAP_HEIGHT_END = GAME_HEIGHT + 10;
/** The stones' row; her feet sit just below their middle while she is on one. */
const STONE_Y = 585;
const FEET_ON_STONE = 4;
const STONE_H = 104;
/** Where she waits for a new bridge. */
const NEAR = { x: 175, y: 600 };
/** The far bank's pictures (feet positions), top to bottom; two use the first two. */
const PICTURES: [number, number][] = [[1075, 500], [1180, 600], [1075, 695]];
const PICTURE_SIZE = 112;
/** Past this she is on the far bank. */
const FAR_X = GAP.right + 30;
/** A stop sound's turn in a replay; a held sound's is BRIDGE.replayMs. */
const REPLAY_ONCE_MS = 420;

/** Each gap's colours: its rim (the bank's edge), its body, its glow. */
const GAP_LOOK: Record<BridgeGap, { rim: number; deep: number; mid: number; glow: number; stone: number; stoneTop: number }> = {
  lava: { rim: 0x4a2418, deep: 0xb8261a, mid: 0xff6a1f, glow: 0xffc23a, stone: 0x6f6a74, stoneTop: 0x9a95a0 },
  river: { rim: 0x5a7a3a, deep: 0x1d5fa8, mid: 0x3a8fe0, glow: 0xbfe8ff, stone: 0x7a7468, stoneTop: 0xa8a090 },
  chasm: { rim: 0x3a2c22, deep: 0x07040e, mid: 0x231936, glow: 0x7a6ab8, stone: 0x7a6e88, stoneTop: 0xa89cb8 },
};

interface Stone {
  obj: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Image;
  x: number;
  half: number;
  unit: string;
  sound: string;
}

export class BridgeRoom extends Minigame {
  protected override dialogueAware = true;
  private slot: Slot = 'a';
  private plan!: BridgePlan;
  private roomId = '';
  private index = 0;
  private phase: Phase = 'intro';
  private finished = false;
  /** This word's help level as its bridge appeared (the ramp moves from this). */
  private level: BridgeLevel = 1;
  /** Do the stones sound themselves now: level 1, or after Dad's hint. */
  private voiced = true;
  /** Any help this word: Dad's hint, a replay, the pictures coming without his yes. */
  private aided = false;
  private replays = 0;
  private picturesUp = false;
  /** The far-bank instruction is said once per word. */
  private toldFind = false;
  private stones: Stone[] = [];
  private onStone = -1;
  /** She stepped on a stone that has not sounded yet (a line was playing): it sounds when the room is quiet. */
  private pendingSound = false;
  private held: HeldSound | null = null;
  /** How long her stone's held sound has been quiet (it sounds again at BRIDGE.resoundMs). */
  private quietMs = 0;
  private lit = -1;
  private waitMs = 0;
  private timeouts = 0;
  private closeDad: (() => void) | null = null;
  private bag!: Bag;
  private gapLook = GAP_LOOK.lava;
  /** The flow in charge: a chain stops at its next await once something newer has taken over. */
  private flow = 0;
  /** Where to go back to after a replay: the phase it interrupted. */
  private resumePhase: Phase = 'slide';

  constructor() {
    super('BridgeRoom');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    this.slot = data.slot ?? 'a';
    const p = planFor(this.slot);
    if (p.kind !== 'bridge') throw new Error(`BridgeRoom: room ${this.slot} plays ${p.game}`);
    this.plan = p.bridge;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first word not yet read.
    const crossed = this.plan.rounds.findIndex((r) => !episode.fetched.includes(r.word));
    this.index = crossed < 0 ? this.plan.rounds.length : crossed;
    this.finished = crossed < 0;
    this.phase = 'intro';
    this.flow++;
    this.stones = [];
    this.onStone = -1;
    this.held = null;
    this.lit = -1;
    this.timeouts = 0;
  }

  private get current(): BridgeRound {
    return this.plan.rounds[Math.min(this.index, this.plan.rounds.length - 1)]!;
  }

  private get missKey(): string {
    return `${this.slot}:${this.current.word}`;
  }

  protected override sceneData(): object {
    return { step: this.step, slot: this.slot };
  }

  protected background(): string {
    return `room_side_${this.roomId}`;
  }

  /** Slower on the stones: how slowly she slides is how slowly she stretches the word. */
  protected override moveScale(): number {
    return this.onBridge() ? BRIDGE.slide : 1;
  }

  /** The stones are what she reads: the box keeps off them. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    if (this.stones.length) out.push({ x: GAP.left, y: STONE_Y - STONE_H / 2 - 10, w: GAP.right - GAP.left, h: STONE_H + 20, weight: 8 });
    return out;
  }

  /** Letter sounds are never captioned (Caption hides `letter_` lines); the stones light instead. */
  protected override captionMode(u: Utterance): CaptionMode | undefined {
    return u.id.startsWith('letter_') ? 'hide' : undefined;
  }

  protected build(): void {
    this.floor.setTo(70, 430, 1140, 270);
    // The villain's mess keeps out of the gap and off the far bank's pictures.
    const avoid = [new Phaser.Geom.Rectangle(GAP.left - 30, GAP.top - 20, GAP.right - GAP.left + 60, GAME_HEIGHT), new Phaser.Geom.Rectangle(FAR_X, PICTURES[0]![1] - PICTURE_SIZE - 30, GAME_WIDTH - FAR_X, GAME_HEIGHT)];
    applyHouseMood(this, episode.villain, { seed: 0x2054, floor: this.floor, calm: true, avoid });
    this.bag = new Bag(this);
    const gap = gapFor(this.roomId);
    this.gapLook = GAP_LOOK[gap];
    this.drawGap(gap);
    this.player.place(NEAR.x - 60, Math.min(SIDE_ROOM_BY_ID[this.roomId]?.entry.y ?? NEAR.y, NEAR.y));
    this.player.hop();
    burst(this, this.player.x, this.player.y - 40, { count: 16, speed: 220 });
    sfxWhoosh();
    for (const r of this.plan.rounds) void voiceBank.ensure(wordLine(r.word));
    // A stone's held sound plays only if decoded (VoiceBus.hold does not wait): its sounds go first (item 062).
    for (const s of new Set(this.plan.rounds.flatMap((r) => r.sounds))) if (s) void voiceBank.ensure(letterSoundLine(s));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseHeld();
      this.closeDad?.();
      this.closeDad = null;
    });
    if (this.finished) {
      this.locked = true;
      this.phase = 'done';
      this.time.delayedCall(600, () => backToHub(this, this.slot));
      return;
    }
    void this.startRound(true);
  }

  // ---- The gap -------------------------------------------------------------

  /** The gap across the floor, drawn by the game: its wavy banks, its body, and what moves in it. */
  private drawGap(kind: BridgeGap): void {
    const c = this.gapLook;
    const g = this.add.graphics().setDepth(DEPTH.floor + 1);
    const edge = (x: number, side: number, wobble: number) => {
      const pts: Phaser.Math.Vector2[] = [];
      for (let y = GAP.top; y <= GAP_HEIGHT_END; y += 20) pts.push(new Phaser.Math.Vector2(x + side * (Math.sin(y / 37 + x) * wobble + (y - GAP.top) * 0.05), y));
      return pts;
    };
    const band = (inset: number, color: number, alpha = 1) => {
      const left = edge(GAP.left + inset, -1, 9);
      const right = edge(GAP.right - inset, 1, 9).reverse();
      g.fillStyle(color, alpha);
      g.fillPoints([...left, ...right], true);
    };
    band(-14, c.rim);
    band(0, c.deep);
    band(34, c.mid);
    band(110, kind === 'chasm' ? c.deep : c.mid, kind === 'chasm' ? 1 : 0.6);
    // The far end of the gap fades into the room's back wall.
    const fade = this.add.graphics().setDepth(DEPTH.floor + 2);
    for (let i = 0; i < 6; i++) {
      fade.fillStyle(c.rim, 0.12);
      fade.fillRect(GAP.left - 20, GAP.top - 4, GAP.right - GAP.left + 40, 10 + i * 6);
    }

    if (kind === 'lava') {
      // Hot bubbles and rising glow.
      this.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => {
          const x = Phaser.Math.Between(GAP.left + 30, GAP.right - 30);
          const y = Phaser.Math.Between(GAP.top + 30, GAP_HEIGHT_END - 10);
          const b = this.add.circle(x, y, Phaser.Math.Between(6, 16), c.glow, 0.9).setDepth(DEPTH.floor + 3).setScale(0.2);
          this.tweens.add({ targets: b, scale: 1, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => b.destroy() });
        },
      });
      this.add
        .particles(0, 0, TEX.glow, {
          x: { min: GAP.left + 20, max: GAP.right - 20 },
          y: { min: GAP.top + 40, max: GAP_HEIGHT_END },
          speedY: { min: -60, max: -20 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.5, end: 0 },
          lifespan: 1400,
          frequency: 140,
          tint: [c.glow, c.mid],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(DEPTH.floor + 3);
    } else if (kind === 'river') {
      // Ripples drifting downstream.
      this.time.addEvent({
        delay: 180,
        loop: true,
        callback: () => {
          const x = Phaser.Math.Between(GAP.left + 40, GAP.right - 80);
          const y = Phaser.Math.Between(GAP.top + 20, GAP_HEIGHT_END - 20);
          const r = this.add.rectangle(x, y, Phaser.Math.Between(30, 70), 4, c.glow, 0.7).setDepth(DEPTH.floor + 3);
          this.tweens.add({ targets: r, x: x + 60, alpha: 0, duration: 1300, onComplete: () => r.destroy() });
        },
      });
    } else {
      // Mist rising out of the dark.
      this.add
        .particles(0, 0, TEX.smoke, {
          x: { min: GAP.left + 20, max: GAP.right - 20 },
          y: { min: GAP.top + 60, max: GAP_HEIGHT_END },
          speedY: { min: -30, max: -10 },
          speedX: { min: -10, max: 10 },
          scale: { start: 0.6, end: 1.4 },
          alpha: { start: 0.25, end: 0 },
          lifespan: 2600,
          frequency: 220,
          tint: [c.glow, 0xffffff],
        })
        .setDepth(DEPTH.floor + 3);
    }
  }

  private onBridge(): boolean {
    return this.player.x > GAP.left - 25 && this.player.x < GAP.right + 25;
  }

  // ---- A round ------------------------------------------------------------

  /** A new bridge: its stones pop up, the far bank's pictures (unless level 3 holds them back), and the helper's words. */
  private async startRound(first = false): Promise<void> {
    const f = ++this.flow;
    const r = this.current;
    this.round = `bridge:${this.index}:${r.word}`;
    this.phase = 'intro';
    this.locked = true;
    this.level = bridgeLevel(progress, r.word);
    this.voiced = this.level === 1;
    this.aided = false;
    this.replays = 0;
    this.toldFind = false;
    this.waitMs = 0;
    this.wrongTries = episode.house.misses?.[this.missKey] ?? 0;
    this.releaseHeld();
    this.clearStones();
    this.clearSpots();
    this.picturesUp = false;
    // Dad's buttons: a level-2 hint, or level 3's yes / no.
    this.closeDad?.();
    this.closeDad = this.level >= 2 ? openDadButtons((a) => this.answer(a)) : null;

    if (first) await this.wait(ARRIVE_MS);
    if (f !== this.flow) return;
    this.makeStones(r);
    this.makePictures(r, this.level < 3);
    await this.wait(250 + r.units.length * 90);
    if (f !== this.flow) return;
    const lines = [first ? 'bridge_intro' : 'bridge_next', ...(this.level >= 2 ? ['bridge_quiet'] : first ? [] : ['bridge_slide'])];
    await this.narrate(...lines);
    if (f !== this.flow || this.phase !== 'intro') return;
    this.phase = 'slide';
    this.locked = false;
  }

  private makeStones(r: BridgeRound): void {
    const n = r.units.length;
    const span = (GAP.right - GAP.left) / n;
    const w = Math.min(176, span - 10);
    const c = this.gapLook;
    r.units.forEach((unit, i) => {
      const x = GAP.left + span * (i + 0.5);
      const shadow = this.add.ellipse(0, STONE_H * 0.32, w * 0.96, STONE_H * 0.42, 0x000000, 0.35);
      const body = this.add.ellipse(0, 6, w, STONE_H * 0.86, c.stone).setStrokeStyle(4, 0x2a2430, 0.8);
      const top = this.add.ellipse(0, -2, w * 0.86, STONE_H * 0.62, c.stoneTop);
      const glow = this.add.image(0, 0, TEX.glow).setScale(w / 60).setAlpha(0).setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD);
      const text = this.add
        .text(0, -4, unit.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: unit.length > 1 ? '62px' : '74px', color: INK, stroke: '#ffffff', strokeThickness: 8 })
        .setOrigin(0.5);
      const obj = this.add.container(x, STONE_Y, [shadow, body, top, glow, text]).setDepth(STONE_Y - 40);
      popIn(this, obj, 1, 120 + i * 90);
      this.time.delayedCall(120 + i * 90, () => sfxStep(i));
      this.stones.push({ obj, text, glow, x, half: span / 2, unit, sound: r.sounds[i]! });
    });
  }

  private clearStones(): void {
    for (const s of this.stones) s.obj.destroy();
    this.stones = [];
    this.onStone = -1;
    this.lit = -1;
  }

  /** The far bank's pictures, as spots; `show` puts them up now (level 3 waits for Dad's yes). */
  private makePictures(r: BridgeRound, show: boolean): void {
    r.pictures.forEach((word, i) => {
      const [x, y] = PICTURES[i] ?? PICTURES[PICTURES.length - 1]!;
      const shadow = this.add.ellipse(0, 0, PICTURE_SIZE * 0.8, 22, 0x000000, 0.3);
      const pic = fitImage(this.add.image(0, -PICTURE_SIZE / 2 - 4, `pic_${word}`), PICTURE_SIZE, PICTURE_SIZE);
      const spot = this.addSpot(word, x, y, [shadow, pic], word === r.word);
      spot.obj.setDepth(y);
      spot.obj.setVisible(false);
      spot.enabled = false;
    });
    if (show) this.showPictures(false);
  }

  private showPictures(fresh = true): void {
    this.picturesUp = true;
    this.spots.forEach((s, i) => {
      s.obj.setVisible(true);
      s.enabled = true;
      popIn(this, s.obj, 1, i * 110);
    });
    if (fresh) {
      sfxSummon();
      for (const s of this.spots) burst(this, s.x, s.y - PICTURE_SIZE / 2, { count: 24, speed: 240 });
    }
  }

  // ---- Sliding ------------------------------------------------------------

  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    if (!this.stones.length) return;
    const p = this.player;
    // The bridge is closed until it is ready, and while a pick plays out (she is on the far bank then).
    if (this.phase === 'intro' && p.x > GAP.left - 40 && p.x < FAR_X) p.place(GAP.left - 40, p.y);
    else if (this.phase === 'check' && p.x > GAP.left - 40 && p.x < FAR_X) p.place(FAR_X, p.y);
    // On the stones she keeps to their row.
    if (this.onBridge()) p.place(p.x, STONE_Y + FEET_ON_STONE);
    else if (p.y < this.floor.top) p.place(p.x, this.floor.top);

    const i = this.onBridge() ? this.stones.findIndex((s) => Math.abs(p.x - s.x) <= s.half) : -1;
    if (i !== this.onStone) this.stepOn(i);
    else if (this.pendingSound && !voiceBus.busy) this.soundStone(i);
    else this.resound(i, deltaMs);

    if (this.phase === 'slide' && p.x >= FAR_X) void this.arrive();
    if (this.phase === 'say' && !dadLock.locked && !voiceBus.busy) {
      this.waitMs += deltaMs;
      if (this.waitMs >= BRIDGE.dadWaitMs) {
        this.waitMs = 0;
        this.timeouts++;
        this.answer('no');
      }
    }
  }

  /** She steps onto stone `i` (-1: off the stones): the last one's sound stops, this one lights and, if the stones are voiced, sounds. */
  private stepOn(i: number): void {
    this.onStone = i;
    this.releaseHeld();
    this.pendingSound = false;
    if (this.phase === 'replay') return;
    this.light(i);
    if (i < 0) return;
    this.noteActivity();
    if (this.stonesSound()) this.soundStone(i);
  }

  /** Do the stones sound now (voiced, and she is sliding or on the far bank). */
  private stonesSound(): boolean {
    return this.voiced && (this.phase === 'slide' || this.phase === 'say' || this.phase === 'pick');
  }

  /**
   * Still on stone `i` (item 058): a held sound, once it has played out and
   * BRIDGE.resoundMs of quiet has passed, sounds again. A stop sound plays
   * once each time she steps on.
   */
  private resound(i: number, deltaMs: number): void {
    const s = this.stones[i];
    if (!s || !this.held || this.held.playing || !canHold(s.sound) || !this.stonesSound()) {
      this.quietMs = 0;
      return;
    }
    this.quietMs += deltaMs;
    if (this.quietMs >= BRIDGE.resoundMs && !voiceBus.busy) this.soundStone(i);
  }

  /**
   * Stone `i`'s sound: a held one is one smooth stretched sound of
   * HELD_MS (src/audio/holdSound.ts), then quiet; a stop sound once.
   * Waits for the room to be quiet.
   */
  private soundStone(i: number): void {
    const s = this.stones[i];
    this.pendingSound = false;
    this.quietMs = 0;
    if (!s) return;
    const held = voiceBus.hold(letterSoundLine(s.sound), canHold(s.sound) ? 'hold' : 'once', HELD_MS);
    if (held) this.held = held;
    else this.pendingSound = true;
  }

  private releaseHeld(): void {
    this.held?.release();
    this.held = null;
  }

  /** Light stone `i` (and only it): it swells and glows; -1 lights none. */
  private light(i: number): void {
    if (i === this.lit) return;
    const was = this.stones[this.lit];
    if (was) {
      this.tweens.killTweensOf([was.obj, was.glow]);
      this.tweens.add({ targets: was.obj, scale: 1, duration: 140 });
      this.tweens.add({ targets: was.glow, alpha: 0, duration: 200 });
      was.text.setColor(INK);
    }
    this.lit = i;
    const s = this.stones[i];
    if (!s) return;
    this.tweens.killTweensOf([s.obj, s.glow]);
    this.tweens.add({ targets: s.obj, scale: 1.12, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: s.glow, alpha: 0.85, duration: 160 });
    s.text.setColor(LIT);
    burst(this, s.x, STONE_Y, { count: 10, speed: 160, colors: [this.gapLook.glow, 0xffffff], depth: STONE_Y - 39 });
  }

  /** On the far bank: the pictures are there (levels 1 and 2), or she says the word to Dad first (level 3). */
  private async arrive(): Promise<void> {
    const f = ++this.flow;
    this.releaseHeld();
    if (this.picturesUp) {
      this.phase = 'pick';
      if (this.toldFind) return;
      this.toldFind = true;
      await this.narrate('bridge_find');
      if (f === this.flow && this.phase === 'pick') this.locked = false;
      return;
    }
    this.phase = 'say';
    this.waitMs = 0;
    await this.narrate('bridge_say');
    if (f !== this.flow || this.phase !== 'say') return;
    this.waitMs = 0;
    this.locked = false;
    setDadAsking(true);
  }

  // ---- Dad ----------------------------------------------------------------

  /**
   * Dad's button (or the wait running out, or F4). Level 2: his 2 is a hint
   * (the stones sound, for this word). Level 3, on the far bank: his 2 brings
   * the pictures; his 1 replays the slide with sounds, then asks again.
   */
  private answer(a: DadAnswer): void {
    this.noteActivity();
    if (this.level === 2) {
      if (a !== 'yes' || this.voiced || !(this.phase === 'slide' || this.phase === 'pick')) return;
      this.aided = true;
      this.voiced = true;
      void this.replay('bridge_hint');
      return;
    }
    if (this.level !== 3 || this.phase !== 'say') return;
    setDadAsking(false);
    voiceBus.hush();
    if (a === 'yes') {
      void this.toPictures();
      return;
    }
    this.aided = true;
    this.replays++;
    if (this.replays > BRIDGE.replays) {
      // Enough listening: the pictures come anyway.
      void this.toPictures();
      return;
    }
    void this.replay('bridge_listen', 'bridge_your_turn');
  }

  private async toPictures(): Promise<void> {
    const f = ++this.flow;
    this.phase = 'pick';
    this.locked = true;
    this.showPictures();
    this.toldFind = true;
    await this.wait(400);
    if (f !== this.flow) return;
    await this.narrate('bridge_find');
    if (f === this.flow && this.phase === 'pick') this.locked = false;
  }

  /**
   * The stones sound themselves in turn, a glow sliding over them: each held
   * sound for BRIDGE.replayMs, a stop once. `before` is said first, `after`
   * after (then, at level 3, Dad is asked again).
   */
  private async replay(before: string, after?: string): Promise<void> {
    const f = ++this.flow;
    this.resumePhase = this.phase === 'say' ? 'say' : this.phase;
    this.phase = 'replay';
    this.locked = true;
    this.releaseHeld();
    voiceBus.hush();
    await this.narrate(before);
    if (f !== this.flow) return;
    const orb = this.add.image(this.stones[0]?.x ?? GAP.left, STONE_Y - 70, TEX.star).setDepth(DEPTH.sparkles).setScale(1.4).setTint(0xffd23f);
    for (let i = 0; i < this.stones.length; i++) {
      const s = this.stones[i]!;
      this.tweens.add({ targets: orb, x: s.x, duration: 160, ease: 'Sine.easeInOut' });
      this.light(i);
      const held = voiceBus.hold(letterSoundLine(s.sound), canHold(s.sound) ? 'hold' : 'once', HELD_MS);
      await this.wait(canHold(s.sound) ? BRIDGE.replayMs : REPLAY_ONCE_MS);
      held?.release();
      if (f !== this.flow) {
        orb.destroy();
        return;
      }
    }
    this.light(-1);
    this.tweens.add({ targets: orb, alpha: 0, scale: 0, duration: 250, onComplete: () => orb.destroy() });
    if (after) await this.narrate(after);
    if (f !== this.flow) return;
    // Back to where she was; her stone (if any) lights again.
    this.phase = this.resumePhase;
    this.onStone = -2;
    this.locked = false;
    if (this.phase === 'say') {
      this.waitMs = 0;
      setDadAsking(true);
    }
  }

  // ---- Picking ------------------------------------------------------------

  protected choose(spot: Spot): void {
    if (this.phase !== 'pick' || !this.picturesUp) return;
    this.flow++;
    this.releaseHeld();
    voiceBus.hush();
    if (spot.correct) void this.crossed(spot);
    else void this.miss(spot);
  }

  /**
   * A wrong picture: no penalty, but slower than reading. Its word is sounded
   * out, unit by unit, its letters over it (never blended); then where the
   * bridge differs, that stone flashing; then she slides again.
   */
  private async miss(spot: Spot): Promise<void> {
    const f = this.flow;
    const r = this.current;
    const picked = spot.id;
    this.phase = 'check';
    this.locked = true;
    this.wrongTries++;
    (episode.house.misses ??= {})[this.missKey] = this.wrongTries;
    sfxWrong();
    wiggle(this, spot.obj);
    this.player.wobble();
    floatText(this, spot.x, spot.y - PICTURE_SIZE - 40, ['OOPS!', 'HEE HEE!', 'SILLY!', 'BOING!'][(this.wrongTries - 1) % 4]!, '#7ad9ff', 34);
    await this.wait(350);
    if (f !== this.flow) return;
    await this.narrate('bridge_picked');
    if (f !== this.flow) return;
    // Her pick's letters over its picture, each lit while its sound plays.
    const units = BANK_BY_WORD[picked]?.units ?? [...picked];
    const sounds = BANK_BY_WORD[picked]?.sounds ?? [...picked];
    // Over its picture, kept on the screen (the rightmost picture's row would run off it).
    const rowW = units.length * 62 + 30;
    const row = this.add.container(Math.min(spot.x, GAME_WIDTH - rowW / 2 - 12), spot.y - PICTURE_SIZE - 50).setDepth(DEPTH.sparkles);
    const plate = this.add.rectangle(0, 0, rowW, 78, 0xffffff, 0.9).setStrokeStyle(4, 0x1a1030, 0.8);
    row.add(plate);
    const letters = units.map((u, i) => {
      const t = this.add.text((i - (units.length - 1) / 2) * 62, 0, u.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: u.length > 1 ? '40px' : '52px', color: INK }).setOrigin(0.5);
      row.add(t);
      return t;
    });
    popIn(this, row, 1);
    for (let i = 0; i < units.length; i++) {
      letters[i]!.setColor(LIT);
      await this.say(letterSoundLine(sounds[i]!));
      letters[i]!.setColor(INK);
      if (f !== this.flow) {
        row.destroy();
        return;
      }
      await this.wait(160);
    }
    // Where the bridge differs: that stone flashes while its sound plays.
    const d = whereDiffers(r.word, picked);
    await this.narrate(`bridge_${d.where}`);
    if (f !== this.flow) {
      row.destroy();
      return;
    }
    const stone = this.stones[d.index];
    this.light(d.index);
    if (stone) {
      this.tweens.add({ targets: stone.obj, scale: 1.25, duration: 180, yoyo: true, repeat: 1 });
      burst(this, stone.x, STONE_Y, { count: 30, speed: 260, colors: [0xffd23f, 0xffffff] });
    }
    await this.say(letterSoundLine(d.sound));
    this.light(-1);
    this.tweens.add({ targets: row, alpha: 0, duration: 300, onComplete: () => row.destroy() });
    if (f !== this.flow) return;
    await this.narrate('bridge_again');
    if (f !== this.flow) return;
    // Back to the near bank, to slide again.
    sfxPoof();
    burst(this, this.player.x, this.player.y - 40, { count: 20, speed: 220, colors: [0xffffff, 0x7ad9ff] });
    this.player.place(NEAR.x, NEAR.y);
    this.player.hop();
    this.onStone = -1;
    this.toldFind = false;
    this.phase = 'slide';
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** The right picture: recorded first, then the word said for the first time, into the bag, and the next bridge. */
  private async crossed(spot: Spot): Promise<void> {
    const f = this.flow;
    const r = this.current;
    const last = this.index === this.plan.rounds.length - 1;
    const firstTry = this.wrongTries === 0;
    const unaided = firstTry && !this.aided;
    this.phase = 'check';
    this.locked = true;
    setDadAsking(false);
    progress.record('words', r.word, firstTry, this.wrongTries);
    progress.setBridgeLevel(r.word, nextBridgeLevel(this.level, unaided));
    // Her word bag: read right first time, it is done for this round of the bag.
    if (firstTry) progress.takeFromBag(r.word);
    else progress.returnToBag(r.word);
    if (episode.house.misses) delete episode.house.misses[this.missKey];
    if (!episode.read.includes(r.word)) episode.read.push(r.word);
    if (!episode.fetched.includes(r.word)) episode.fetched.push(r.word);
    if (last && !episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);
    for (const s of this.spots) s.enabled = false;

    sfxRight();
    const top = { x: spot.x, y: spot.y - PICTURE_SIZE / 2 };
    burst(this, top.x, top.y, { count: 60, speed: 460 });
    shockwave(this, top.x, top.y, 0xffd23f, 180);
    floatText(this, top.x, top.y - 90, unaided ? 'WOW!' : 'YES!', '#ffd23f');
    // The whole bridge lights, stone by stone, as the word is said.
    this.stones.forEach((s, i) =>
      this.time.delayedCall(i * 70, () => {
        s.text.setColor(LIT);
        this.tweens.add({ targets: s.obj, scale: 1.1, duration: 120, yoyo: true });
      }),
    );
    await this.wait(250);
    if (f !== this.flow) return;
    // Only now is the word said.
    await this.say(wordLine(r.word));
    if (f !== this.flow) return;
    const pic = spot.obj;
    pic.setVisible(false);
    await Promise.all([this.guard(this.bag.receive(`pic_${r.word}`, top.x, top.y)), this.say(narratorLine(narrator(), `right_${(this.index % RIGHT_VARIANTS) + 1}`))]);
    if (f !== this.flow) return;
    sfxSelect();
    if (!last) {
      this.index++;
      sfxPoof();
      this.player.place(NEAR.x, NEAR.y);
      this.player.hop();
      await this.startRound();
      return;
    }
    this.phase = 'done';
    this.closeDad?.();
    this.closeDad = null;
    await this.say(narratorLine(narrator(), 'bridge_done'));
    await this.wait(400);
    this.fadeOutThen(() => backToHub(this, this.slot));
  }

  /**
   * Free play (item 060): while a bridge is introduced and when the last is
   * crossed. Closed while she slides, blends aloud for Dad, picks, or a pick
   * plays out.
   */
  protected override playOpen(): boolean {
    return (this.phase === 'intro' || this.phase === 'done') && this.walking;
  }

  /** Yellow says the instruction again only where hint() has one. */
  protected override hasHint(): boolean {
    return this.phase === 'slide' || this.phase === 'pick' || this.phase === 'say';
  }

  /** Yellow: the instruction again (never extra help: the stones' help is the level's, or Dad's). */
  protected override hint(idle = false): void {
    const key = this.phase === 'slide' ? (this.voiced ? 'bridge_slide' : 'bridge_quiet') : this.phase === 'pick' ? 'bridge_find' : this.phase === 'say' && !idle ? 'bridge_say' : null;
    if (!key) return;
    const phase = this.phase;
    this.releaseHeld();
    void this.narrate(key).then(() => {
      if (this.phase === phase) this.locked = false;
    });
  }

  /** F4: across the bridge in one go; on the far bank at level 3, Dad's yes; with the pictures up, the right one. */
  protected override autoAnswer(): boolean {
    if (this.phase === 'say') {
      dadPress('yes');
      return true;
    }
    if (this.phase === 'slide' && this.player.x < FAR_X) {
      this.player.place(FAR_X + 10, NEAR.y);
      return true;
    }
    return false;
  }

  /**
   * An instruction unlocks input when it ends, unless the room has moved on
   * meanwhile (a newer line or flow took over: that one unlocks when it is
   * done), or a pick or a replay is playing out.
   */
  protected override async narrate(...keys: string[]): Promise<void> {
    const n = ++this.narrations;
    const f = this.flow;
    await super.narrate(...keys);
    if (n !== this.narrations || f !== this.flow || this.phase === 'intro' || this.phase === 'check' || this.phase === 'replay' || this.phase === 'done') this.locked = true;
  }

  private narrations = 0;

  protected override extraHooks(): Partial<RoomInfo> {
    const r = this.current;
    return {
      bridge: {
        words: this.plan.rounds.map((x) => x.word),
        index: this.index,
        word: r.word,
        units: [...r.units],
        pictures: [...r.pictures],
        level: this.level,
        phase: this.phase,
        stone: this.onStone,
        voiced: this.voiced,
        aided: this.aided,
        picturesUp: this.picturesUp,
        replays: this.replays,
        timeouts: this.timeouts,
        misses: this.wrongTries,
        asking: this.phase === 'say' && !this.locked,
        holding: this.held?.playing ? this.held.id : null,
      },
    };
  }
}
