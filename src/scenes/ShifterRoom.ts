/**
 * The Shape-Shifter (item 096): a side room where she reads every letter of
 * a word, not just the first. Walking and green only, nothing for Dad's 1 / 2:
 * she can play it alone.
 *
 * The villain's polymorph spell walks a creature down a chain of pictured
 * words, one letter changed a link (CAT, BAT, BAG, BUG, MUG; the chain and
 * its beats: src/rules/shifter.ts). The creature stands at the back of the
 * room with its word on a label under it. Two beats, mixed through the chain:
 *
 *   - read it: the label changes to the new word, not voiced; three pictures
 *     stand in the room, differing only at the changed letter (BAT, HAT,
 *     RAT). She walks to the one she read and presses green; the creature
 *     morphs into it and the word is said as confirmation.
 *   - fix it: the creature morphs into the new picture, its label still the
 *     old word (a bat labelled CAT); three letter stones with different
 *     sounds stand in the room. She walks to the one that fixes the label; it
 *     flies in, and the word is said.
 *
 * Help fades per word (`shifterLevel`, ProgressStore `shifterLevels`): 1 the
 * changed letter lit and each stone sounding as she comes near it; 2 lit,
 * silent stones; 3 nothing lit. Yellow sounds the new letter (read it) or
 * the stone in reach (fix it), a letter whose name holds its sound with the
 * bridge from its name first (`nameToSound`). Right first time with no help
 * moves the word up a level; a hint or a miss, down one (recorded always;
 * DIFFICULTY caps what the room gives, so at base every word plays level 1).
 *
 * A wrong pick never penalises, but guessing is slower than reading: a wrong
 * picture is sounded out over itself, then the label's new letter; a wrong
 * stone's letter bounces off the label and its sound is said (never a word
 * made of it: a random letter can spell a word she reads later, or a rude
 * one). After two misses the answer sparkles.
 *
 * Read it is recorded as reading (`words`, her word bag); fix it, finding a
 * letter for a sound, under `spelling`, apart from reading.
 *
 * Every word read is a battle item, a copy flying into her bag; the last creature flies in itself and
 * goes to the fight. Speech rule: a new word is never said before she has
 * it; the first creature is said (it is shown, not read), and sounds are
 * letter_ lines, never captioned.
 */

import Phaser from 'phaser';

import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { readPraise, variant } from '../episode/lineVariants';
import { voiceBus } from '../audio/VoiceBus';
import { sfxPoof, sfxRight, sfxSelect, sfxStep, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_WIDTH, REACH, VARIETY } from '../config';
import { episode, narrator, type Slot, type Step } from '../episode/Episode';
import { burst, fitImage, floatText, popIn, shake, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { stepLevel } from '../rules/difficulty';
import { recordedShifterLevel, shifterLevel, soundAt, type Position, type ShifterLevel, type ShifterLink, type ShifterPlan } from '../rules/shifter';
import { nameToSound, soundOut } from '../rules/soundOut';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood, roomSeed } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, HouseSideRoom, INK, LIT, sidePlan } from '../world/SideRoom';

/** `intro`: the spell is at work, she waits. `pick`: the pictures or stones are up. `check`: a pick plays out. `done`: back to the hub. */
type Phase = 'intro' | 'pick' | 'check' | 'done';

/** The creature at the back of the room, and its label under it. */
const CREATURE = { x: GAME_WIDTH / 2, y: 255, size: 200 };
const LABEL = { x: GAME_WIDTH / 2, y: 400, gap: 84 };
const LABEL_PLATE_H = 100;
/** How far from the label's middle she stands when she steps up out of the options' reach: its plate's half width and hers, clear of it (hunt 9). */
const LABEL_CLEAR = (LABEL.gap * 3 + 40) / 2 + 50;
/** The pictures or stones standing in the room (feet positions), left to right. */
const OPTIONS: [number, number][] = [[400, 640], [640, 655], [880, 640]];
const PICTURE_SIZE = 116;
const STONE = { w: 120, h: 96 };
/** Where she walks in. */
const ENTRY = { x: 130, y: 610 };
/** The spell's colours. */
const MAGIC = [0xb04cff, 0xff4cd8, 0xffffff];
/** How long a read word's label stays lit before the next spell strikes, ms (its letters light 70 ms apart). */
const LABEL_LIT_MS = 450;
/** The lifted letter's bubble (hunt 9, M42), px square. */
const LIFT_SIZE = 84;

export class ShifterRoom extends HouseSideRoom {
  private plan!: ShifterPlan;
  private index = 0;
  private phase: Phase = 'intro';
  private finished = false;
  private level: ShifterLevel = 1;
  /** Any help on this word (a hint): kept on the episode like the misses. */
  private aided = false;
  private bag!: Bag;
  private creature!: Phaser.GameObjects.Container;
  private creatureImg!: Phaser.GameObjects.Image;
  private labelBox!: Phaser.GameObjects.Container;
  private letters: Phaser.GameObjects.Text[] = [];
  /** The word the label shows now. */
  private label = '';
  /** Is the changed letter lit on the label (levels 1 and 2)? */
  private lit = false;
  /** The flow in charge: a chain stops at its next await once something newer has taken over. */
  private flow = 0;
  /** The last morph's pop back, which plays on after `morph` returns. */
  private popped: Promise<void> = Promise.resolve();
  private narrations = 0;
  /** Yellow's hint is playing: input stays locked until it is done (its lines are one help). */
  private hinting = false;
  /** A level-1 stone she reached while the room could not speak: it sounds once the room is quiet. */
  private pendingStone: string | null = null;
  /** The copy of a sounding stone's letter over her head (`liftLetter`), while it speaks. */
  private lifted: Phaser.GameObjects.Container | null = null;
  /** The beats whose full instruction this run has said (hunt 6, M26): a later link of one gets its short cue. */
  private told = new Set<ShifterLink['beat']>();

  constructor() {
    super('ShifterRoom');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    const p = sidePlan('ShifterRoom', this.slot, 'shifter');
    this.plan = p.shifter;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first link not yet read.
    const read = this.plan.links.findIndex((l) => !episode.fetched.includes(l.to));
    this.index = read < 0 ? this.plan.links.length : read;
    this.finished = read < 0;
    this.phase = 'intro';
    this.flow++;
    this.popped = Promise.resolve();
    this.pendingStone = null;
    this.lifted = null;
    this.told = new Set();
    this.letters = [];
    this.label = '';
    this.lit = false;
  }

  private get current(): ShifterLink {
    return this.plan.links[Math.min(this.index, this.plan.links.length - 1)]!;
  }

  /** The creature, its label and the options are what she reads: the box keeps off them. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    out.push({ x: CREATURE.x - 170, y: CREATURE.y - CREATURE.size / 2 - 20, w: 340, h: LABEL.y - CREATURE.y + CREATURE.size / 2 + 70, weight: 8 });
    // The pictures and stones above all, at their full footprint: they pop in from nothing as the
    // instruction starts, and "Find the letter that fixes it!" sat over all three (hunt 6).
    for (const s of this.spots) if (s.obj.active) out.push({ x: s.x - 70, y: s.y - PICTURE_SIZE - 30, w: 140, h: PICTURE_SIZE + 40, weight: 40 });
    return out;
  }

  protected build(): void {
    this.floor.setTo(70, 450, 1140, 250);
    const avoid = [new Phaser.Geom.Rectangle(CREATURE.x - 200, 0, 400, LABEL.y + 60), new Phaser.Geom.Rectangle(OPTIONS[0]![0] - 90, OPTIONS[0]![1] - 150, OPTIONS[2]![0] - OPTIONS[0]![0] + 180, 200)];
    applyHouseMood(this, episode.villain, { seed: roomSeed(this.roomId), floor: this.floor, calm: true, avoid });
    this.bag = new Bag(this);
    this.makeCreature();
    this.enter(ENTRY.x, ENTRY.y);
    for (const l of this.plan.links) void voiceBank.ensure(wordLine(l.to));
    void voiceBank.ensure(wordLine(this.plan.start));
    if (this.finished) {
      this.locked = true;
      this.phase = 'done';
      this.setCreature(this.plan.links.at(-1)?.to ?? this.plan.start);
      this.setLabel(this.plan.links.at(-1)?.to ?? this.plan.start);
      this.backToHubSoon();
      return;
    }
    // The creature as the spell left it: the first one, or the last she read before the parent page.
    const now = this.index === 0 ? this.plan.start : this.current.from;
    this.setCreature(now);
    this.setLabel(now);
    void this.startLink(true);
  }

  // ---- The creature ---------------------------------------------------------

  private makeCreature(): void {
    const halo = this.add.image(0, 0, TEX.glow).setScale(4.2).setAlpha(0.45).setTint(MAGIC[0]!).setBlendMode(Phaser.BlendModes.ADD);
    const shadow = this.add.ellipse(0, CREATURE.size / 2 + 6, CREATURE.size * 0.8, 26, 0x000000, 0.3);
    this.creatureImg = this.add.image(0, 0, this.wordArt(this.plan.start));
    this.creature = this.add.container(CREATURE.x, CREATURE.y, [halo, shadow, this.creatureImg]).setDepth(LABEL.y - 20);
    this.tweens.add({ targets: halo, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // It bobs, alive.
    this.tweens.add({ targets: this.creatureImg, y: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const plate = this.add.rectangle(0, 0, LABEL.gap * 3 + 40, LABEL_PLATE_H, 0xfff6dc, 0.96).setStrokeStyle(5, 0x1a1030, 0.85);
    this.labelBox = this.add.container(LABEL.x, LABEL.y, [plate]).setDepth(LABEL.y - 19);
    for (let i = 0; i < 3; i++) {
      const t = this.add.text((i - 1) * LABEL.gap, 0, '', { fontFamily: FONT_COMIC, fontSize: '78px', color: INK, stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5);
      this.labelBox.add(t);
      this.letters.push(t);
    }
  }

  /** The creature's picture, fitted (no fanfare: `morph` is the spectacle). */
  private setCreature(word: string): void {
    this.creatureImg.setTexture(this.wordArt(word));
    fitImage(this.creatureImg, CREATURE.size, CREATURE.size);
  }

  /** The label's word; `litPos` lit (the changed letter), -1 none. */
  private setLabel(word: string, litPos = -1): void {
    this.label = word;
    this.letters.forEach((t, i) => {
      t.setText((word[i] ?? '').toUpperCase());
      t.setColor(i === litPos ? LIT : INK);
      this.tweens.killTweensOf(t);
      t.setScale(1);
      // From 1 explicitly: a tween takes its start when it first runs, and the read-it beat's popIn has the letter at 0
      // by then, so it pulsed from nothing to full size, the lit letter blinking out every half second (hunt 6).
      if (i === litPos) this.tweens.add({ targets: t, scale: { from: 1, to: 1.14 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  /**
   * The polymorph: magic swirls in, the creature swells, squashes, shrinks to
   * nothing, a poof of smoke and sparks, and it pops back as `word`. `hold`: after its wobble it stays
   * swollen, the swirl still turning, until that is done too (the word it was, said), so it is never
   * gone before its word is.
   */
  private async morph(word: string, hold?: Promise<unknown>): Promise<void> {
    const f = this.flow;
    const { x, y } = this.creature;
    // The last one springs back in full first.
    await this.popped;
    sfxSummon();
    const swirl = this.add
      .particles(x, y, TEX.glow, {
        emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, CREATURE.size * 0.7), quantity: 24 } as never,
        speed: { min: 40, max: 120 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 700,
        frequency: 18,
        tint: MAGIC,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.sparkles);
    // Grow, wobble, shrink.
    // One chain and one wait: each wait ends on a frame, so waits in a row run long, most on a fast test clock.
    this.tweens.chain({
      targets: this.creature,
      tweens: [
        { scale: 1.3, duration: 260, ease: 'Back.easeOut' },
        { scaleX: 1.5, scaleY: 1.05, duration: 110, yoyo: true, repeat: 2 },
      ],
    });
    await this.wait(940);
    if (hold) await hold;
    this.tweens.add({ targets: this.creature, scale: 0, duration: 220, ease: 'Back.easeIn' });
    await this.wait(220);
    swirl.stop();
    this.time.delayedCall(800, () => swirl.destroy());
    if (f !== this.flow) return;
    // Poof.
    sfxPoof();
    shake(this, 0.006, 220);
    shockwave(this, x, y, MAGIC[0]!, 260);
    burst(this, x, y, { count: 90, speed: 560, colors: MAGIC, life: 900 });
    const smoke = this.add
      .particles(x, y, TEX.smoke, { speed: { min: 60, max: 220 }, scale: { start: 1.2, end: 2.6 }, alpha: { start: 0.7, end: 0 }, lifespan: 900, quantity: 26, emitting: false, tint: [0xe8d8ff, 0xffffff] })
      .setDepth(DEPTH.sparkles - 1);
    smoke.explode(26);
    this.time.delayedCall(1000, () => smoke.destroy());
    this.setCreature(word);
    this.tweens.add({ targets: this.creature, scale: 1, duration: 420, ease: 'Back.easeOut' });
    // Done as the new creature appears: its word is said as it springs back (item 108).
    this.popped = this.wait(420).then(() => void burst(this, x, y - 40, { count: 30, speed: 300, colors: [0xffd23f, 0xffffff] }));
  }

  // ---- A link ---------------------------------------------------------------

  /**
   * A link: the spell strikes, then its instruction. `praised`, a later link's: the last word's praise
   * and its trip to the bag, which the strike plays under (hunt 6, M26); the instruction waits for it.
   * `said`, the last word's own line: a read-it strike waits for it, a fix-it strike's morph starts under it.
   */
  private async startLink(first = false, praised: Promise<unknown> = Promise.resolve(), said: Promise<unknown> = Promise.resolve()): Promise<void> {
    const f = ++this.flow;
    const l = this.current;
    this.round = `shifter:${this.index}:${l.to}`;
    this.phase = 'intro';
    this.hinting = false;
    this.pendingStone = null;
    this.locked = true;
    this.level = shifterLevel(progress, l.to);
    this.lit = this.level <= 2;
    this.aided = this.keptAided(l.to);
    this.wrongTries = this.keptMisses(l.to);
    this.clearSpots();
    if (first) {
      await this.wait(ARRIVE_MS);
      if (f !== this.flow) return;
      await this.narrate('shifter_intro');
      if (f !== this.flow) return;
      // The first creature is shown and said: it is not one she reads.
      if (this.index === 0) {
        await this.narrate('shifter_starts');
        await this.say(wordLine(this.plan.start));
        if (f !== this.flow) return;
      }
    } else if (l.beat === 'read') {
      // Hunt 6, M26: no "Here comes the spell again!" (its strike says so); the read word's label stays lit a beat
      // before the strike rewrites it (a fix-it morph keeps the label).
      await said;
      if (f !== this.flow) return;
      await this.wait(LABEL_LIT_MS);
      if (f !== this.flow) return;
    }
    // The spell strikes.
    if (l.beat === 'read') {
      sfxWhoosh();
      burst(this, LABEL.x + (l.pos - 1) * LABEL.gap, LABEL.y, { count: 40, speed: 320, colors: MAGIC });
      this.setLabel(l.to, this.lit ? l.pos : -1);
      popIn(this, this.letters[l.pos]!, 1);
    } else {
      await this.morph(l.to, said);
      if (f !== this.flow) return;
      // The old label stays; the letter that is now wrong is lit.
      this.setLabel(l.from, this.lit ? l.pos : -1);
    }
    this.makeOptions(l);
    await Promise.all([praised, this.wait(300)]);
    if (f !== this.flow) return;
    // The full instruction the first time each beat comes this visit; later, its short cue (hunt 6, M26:
    // every link locked her out 12 to 15 s). Yellow and an idle re-prompt still give the full one.
    const told = this.told.has(l.beat);
    this.told.add(l.beat);
    if (told) await this.narrate(l.beat === 'read' ? 'shifter_cue_read' : 'shifter_cue_fix');
    else await this.narrate(l.beat === 'read' ? 'shifter_read' : 'shifter_fix');
    if (f !== this.flow) return;
    this.phase = 'pick';
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** Read it: pictures. Fix it: letter stones. */
  private makeOptions(l: ShifterLink): void {
    l.options.forEach((o, i) => {
      const [x, y] = OPTIONS[i] ?? OPTIONS[OPTIONS.length - 1]!;
      const shadow = this.add.ellipse(0, 0, 100, 22, 0x000000, 0.3);
      if (l.beat === 'read') {
        const pic = fitImage(this.add.image(0, -PICTURE_SIZE / 2 - 4, this.wordArt(o)), PICTURE_SIZE, PICTURE_SIZE);
        const spot = this.addSpot(o, x, y, [shadow, pic], o === l.to);
        popIn(this, spot.obj, 1, i * 110);
      } else {
        const body = this.add.ellipse(0, -STONE.h / 2 + 6, STONE.w, STONE.h * 0.86, 0x7a7088).setStrokeStyle(4, 0x2a2430, 0.8);
        const top = this.add.ellipse(0, -STONE.h / 2 - 2, STONE.w * 0.86, STONE.h * 0.62, 0xb0a6c0);
        const text = this.add.text(0, -STONE.h / 2 - 4, o.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '70px', color: INK, stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5);
        // Level 1: a stone sounds as she comes near it (its plain sound: the bridge from its name is yellow's).
        const near = this.level === 1 ? () => this.soundNear(o) : undefined;
        const spot = this.addSpot(`stone_${o}`, x, y, [shadow, body, top, text], o === l.to[l.pos], near);
        spot.obj.setData('letter', o);
        popIn(this, spot.obj, 1, i * 110);
        this.time.delayedCall(i * 110, () => sfxStep(i));
      }
    });
    sfxSummon();
    for (const [x, y] of OPTIONS) burst(this, x, y - 50, { count: 16, speed: 200, colors: MAGIC });
    // Every link stands its options where the last link's were, so one can land where she stands: she steps
    // up out of reach, or a green mashed through the instruction picked one she never walked to (hunt 6; the
    // word machine's fix 98, here). Stepped up, she stood in front of the label, over the letter that had just
    // changed (hunt 9): under the label she steps to its side too.
    this.stepClearOf(LABEL.x, LABEL_CLEAR, Math.min(...OPTIONS.map(([, y]) => y)) - REACH - 15);
  }

  /**
   * A stone in reach sounds itself (level 1), when the room is quiet; reached while it could not
   * speak (a line playing, the link opening, a miss playing out), it speaks once the room is quiet,
   * if she is still on it (hunt 6: it stayed silent until she walked off and back; the word machine's
   * tiles do the same).
   */
  private soundNear(letter: string): void {
    if (this.phase !== 'pick' || this.locked || voiceBus.busy) {
      this.pendingStone = letter;
      return;
    }
    this.pendingStone = null;
    this.liftLetter(letter);
  }

  /**
   * A level-1 stone sounds itself with a copy of its letter lifted over her head, in a bubble, while it
   * speaks (hunt 9, M42 (a)): standing at it to choose, her figure covers its letter (the B under her in
   * `wrong_seed102`), so she heard the sound with the letter hidden.
   */
  private liftLetter(letter: string): void {
    const lift = this.showLift(letter);
    void voiceBus.say(letterSoundLine(letter)).finally(() => this.dropLift(lift));
  }

  /** The lifted letter's bubble, up until `dropLift`; a newer one replaces it. */
  private showLift(letter: string): Phaser.GameObjects.Container {
    this.lifted?.destroy();
    // Beside her head, not over it: over it, it met the label's bottom and her green dot.
    const side = this.player.x > GAME_WIDTH - 2 * LIFT_SIZE ? -1 : 1;
    const h = LIFT_SIZE / 2;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.96).lineStyle(4, 0x2a2430, 0.8);
    g.fillRoundedRect(-h, -h, LIFT_SIZE, LIFT_SIZE, 18).strokeRoundedRect(-h, -h, LIFT_SIZE, LIFT_SIZE, 18);
    // Its tail points at her head.
    g.fillTriangle(-side * (h - 4), h - 26, -side * (h - 4), h - 6, -side * (h + 18), h + 10);
    const text = this.add.text(0, 0, letter.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '60px', color: INK }).setOrigin(0.5);
    const lift = this.add.container(0, 0, [g, text]).setDepth(DEPTH.speech).setData('side', side);
    this.lifted = lift;
    this.followLift();
    popIn(this, lift, 1);
    return lift;
  }

  private dropLift(lift: Phaser.GameObjects.Container): void {
    if (this.lifted !== lift || !lift.scene) return;
    this.lifted = null;
    this.tweens.add({ targets: lift, alpha: 0, duration: 200, onComplete: () => lift.destroy() });
  }

  /**
   * The lifted letter rides beside her head, never higher than just under the label's plate: come at the
   * middle stone from above (where the step-up leaves her) and beside her head was on the label, over its
   * middle or last letter (hunt 10). Held down there it can meet the green dot over the stone, so it
   * keeps to the dot's far side.
   */
  private followLift(): void {
    if (!this.lifted) return;
    const side = this.lifted.getData('side') as number;
    const h = LIFT_SIZE / 2;
    const y = Math.max(this.player.y - this.player.height - 24, LABEL.y + LABEL_PLATE_H / 2 + h + 8);
    let x = this.player.x + side * (h + 34);
    const near = this.nearestSpot();
    if (near) {
      // Where RoomScene draws the green dot (radius 18), and a little room.
      const dot = { x: near.x, y: near.obj.getBounds().top - 26, r: 18 + 6 };
      if (Math.abs(y - dot.y) < h + dot.r && Math.abs(x - dot.x) < h + dot.r) x = dot.x + side * (h + dot.r);
    }
    this.lifted.setPosition(x, y);
  }

  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    this.followLift();
    const p = this.pendingStone;
    if (!p || this.phase !== 'pick' || this.locked || voiceBus.busy) return;
    this.pendingStone = null;
    if (this.nearestSpot()?.obj.getData('letter') === p) this.liftLetter(p);
  }

  // ---- Picking --------------------------------------------------------------

  protected choose(spot: Spot): void {
    if (this.phase !== 'pick' || this.hinting) return;
    this.flow++;
    this.pendingStone = null;
    voiceBus.hush();
    if (spot.correct) void this.gotIt(spot);
    else void this.miss(spot);
  }

  private noteMiss(spot: Spot): void {
    this.wrongTries++;
    this.keepMisses(this.current.to, this.wrongTries);
    this.giggle(spot.obj, spot.x, spot.y - 150, this.wrongTries - 1);
  }

  /** A wrong pick: no penalty, but slower than reading. */
  private async miss(spot: Spot): Promise<void> {
    const f = this.flow;
    const l = this.current;
    this.phase = 'check';
    this.locked = true;
    this.noteMiss(spot);
    await this.wait(350);
    if (f !== this.flow) return;
    if (l.beat === 'read') {
      // Her picture's word sounded out over it, unit by unit, never blended.
      await this.narrate('shifter_picked');
      if (f !== this.flow) return;
      await this.soundOutOver(spot.id, spot.x, spot.y - PICTURE_SIZE - 50);
      if (f !== this.flow) return;
      // Then the label's new letter, flashing; beside a picture that has it (BUG for BIG, hunt 6, M29: a
      // read-it link at the last letter stands one sibling and another picture), the first letter hers is not.
      const at = (spot.id[l.pos] !== l.to[l.pos] ? l.pos : ([0, 1, 2] as const).find((i) => spot.id[i] !== l.to[i])) ?? l.pos;
      await this.narrate('shifter_says');
      if (f !== this.flow) return;
      await this.flashNewLetter(at);
      if (f !== this.flow) return;
      await this.narrate('shifter_again');
    } else {
      // Her stone's letter flies at the label and bounces off it (no word is ever made of it: a
      // random letter in a word can spell a word she reads later, or a rude one), then its sound.
      const letter = spot.obj.getData('letter') as string;
      await this.flyLetter(spot, letter, true);
      if (f !== this.flow) return;
      await this.narrate('shifter_stone');
      if (f !== this.flow) return;
      await this.soundStone(spot);
      if (f !== this.flow) return;
      await this.narrate('shifter_nope');
    }
    if (f !== this.flow) return;
    this.phase = 'pick';
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** A fix-it link done: recorded under `spelling`, then read and fetched by the episode like any word (`recordRead`). */
  private recordFixed(word: string, firstTry: boolean, last: boolean): void {
    progress.record('spelling', word, firstTry, this.wrongTries);
    // Kept apart from her reading, but the word draws still lean away from it next episode, as from a word
    // read right (hunt 6: three links in four are fix it, so the same chains came back episode after episode).
    if (firstTry) progress.remember('words', word, VARIETY.words);
    this.recordDone(word, { fetch: true, last });
  }

  /** A word's units over (x, y), each lit while its sound plays. */
  private async soundOutOver(word: string, x: number, y: number): Promise<void> {
    const f = this.flow;
    const steps = soundOut(word);
    const rowW = steps.length * 62 + 30;
    const row = this.add.container(Phaser.Math.Clamp(x, rowW / 2 + 12, GAME_WIDTH - rowW / 2 - 12), y).setDepth(DEPTH.sparkles);
    row.add(this.add.rectangle(0, 0, rowW, 78, 0xffffff, 0.9).setStrokeStyle(4, 0x1a1030, 0.8));
    const texts = steps.map((s, i) => {
      const t = this.add.text((i - (steps.length - 1) / 2) * 62, 0, s.unit.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: s.unit.length > 1 ? '40px' : '52px', color: INK }).setOrigin(0.5);
      row.add(t);
      return t;
    });
    popIn(this, row, 1);
    for (let i = 0; i < steps.length; i++) {
      texts[i]!.setColor(LIT);
      if (steps[i]!.id) await this.say(steps[i]!.id);
      texts[i]!.setColor(INK);
      if (f !== this.flow) break;
      await this.wait(160);
    }
    this.tweens.add({ targets: row, alpha: 0, duration: 300, onComplete: () => row.destroy() });
  }

  /** The label's letter at `pos` flashes while `ids` are said; it stops once a newer flow takes over. */
  private async flashLetter(pos: number, ids: string[]): Promise<void> {
    const f = this.flow;
    const t = this.letters[pos];
    if (t) {
      t.setColor(LIT);
      burst(this, LABEL.x + (pos - 1) * LABEL.gap, LABEL.y, { count: 24, speed: 240, colors: [0xffd23f, 0xffffff] });
    }
    for (const id of ids) {
      await this.say(id);
      if (f !== this.flow) return;
    }
    if (t && !(this.lit && pos === this.current.pos)) t.setColor(INK);
  }

  /** The new word's letter at `pos` flashes while its sound is said (the name first where it holds the sound). */
  private flashNewLetter(pos: Position): Promise<void> {
    const word = this.current.to;
    return this.flashLetter(pos, nameToSound(word[pos]!, soundAt(word, pos)));
  }

  /**
   * A stone swells while its letter is sounded (the name first where it holds the sound); it stops once a
   * newer flow takes over. It settles back to the size it shows in reach, or at rest once she has walked off.
   * Its letter is lifted beside her while it sounds, as at level 1 (hunt 10: a miss or a hint sounds the stone
   * she stands at, her figure over its letter; M42's case).
   */
  private async soundStone(spot: Spot): Promise<void> {
    const f = this.flow;
    const letter = spot.obj.getData('letter') as string;
    spot.obj.setScale(spot.baseScale * 1.15);
    const lift = this.showLift(letter);
    for (const id of nameToSound(letter)) {
      if (f !== this.flow) break;
      await this.say(id);
    }
    this.dropLift(lift);
    spot.obj.setScale(this.nearestSpot() === spot ? spot.baseScale * 1.1 : spot.baseScale);
  }

  /** A stone's letter flies from it into the label's changed place; `bounce`, it pops back off and away. */
  private async flyLetter(spot: Spot, letter: string, bounce = false): Promise<void> {
    const l = this.current;
    const to = { x: LABEL.x + (l.pos - 1) * LABEL.gap, y: LABEL.y };
    const t = this.add.text(spot.x, spot.y - STONE.h / 2, letter.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '70px', color: LIT, stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5).setDepth(DEPTH.sparkles);
    sfxWhoosh();
    this.tweens.add({ targets: t, x: to.x, y: to.y, scale: 1.1, duration: 420, ease: 'Cubic.easeIn' });
    await this.wait(420);
    burst(this, to.x, to.y, { count: 26, speed: 260, colors: MAGIC });
    if (!bounce) {
      t.destroy();
      return;
    }
    // It does not fit: a boing back to its stone.
    sfxPoof();
    this.tweens.add({ targets: t, x: spot.x, y: spot.y - STONE.h / 2, scale: 0.6, alpha: 0, duration: 380, ease: 'Back.easeIn', onComplete: () => t.destroy() });
    await this.wait(380);
  }

  /** The right pick: recorded first, then the creature becomes the word (or its label is fixed), and the word is said. */
  private async gotIt(spot: Spot): Promise<void> {
    const f = this.flow;
    const l = this.current;
    const last = this.index === this.plan.links.length - 1;
    const firstTry = this.wrongTries === 0;
    const unaided = firstTry && !this.aided;
    this.phase = 'check';
    this.locked = true;
    // Read it is reading; fix it is finding a letter for a sound, spelling's kind of slip, so it is
    // recorded apart from reading (as Spell the Spell's are) and leaves her word bag alone.
    if (l.beat === 'read') this.recordRead(l.to, firstTry, this.wrongTries, { last });
    else this.recordFixed(l.to, firstTry, last);
    // The ramp: right first time with no help is one level less help; a hint or a miss, one more.
    progress.setShifterLevel(l.to, stepLevel(recordedShifterLevel(progress, l.to), unaided));
    this.forgetMisses(l.to);
    for (const s of this.spots) s.enabled = false;
    sfxRight();
    const top = { x: spot.x, y: spot.y - PICTURE_SIZE / 2 };
    burst(this, top.x, top.y, { count: 50, speed: 420 });
    floatText(this, top.x, top.y - 90, unaided ? 'WOW!' : 'YES!', '#ffd23f');
    spot.obj.setVisible(false);
    this.stopSparkle(spot);
    if (l.beat === 'read') await this.morph(l.to);
    else await this.flyLetter(spot, l.to[l.pos]!);
    if (f !== this.flow) return;
    this.setLabel(l.to);
    this.letters.forEach((t, i) => this.time.delayedCall(i * 70, () => t.setColor(LIT)));
    shockwave(this, CREATURE.x, CREATURE.y, 0xffd23f, 200);
    // Only now is the word said.
    const said = this.say(wordLine(l.to));
    // Every word read is a battle item, so a copy of the creature goes into her bag with the praise, as the
    // other rooms' do (hunt 6: the row stood still here and three things turned up in it back in the hub).
    // The last one: the creature itself goes, below.
    const praise = () => Promise.all([last ? Promise.resolve() : this.guard(this.bag.receive(this.wordArt(l.to), CREATURE.x, CREATURE.y)), this.say(narratorLine(narrator(), this.praise(l.beat, unaided)))]);
    if (!last) {
      // The next spell strikes under the praise (hunt 6, M26: a link locked her out 12 to 15 s), and a
      // fix-it strike's swirl and swell start under the word (item 108: after a read-it link that was two
      // whole morphs back to back, 7 s a link); the creature is gone only once its word is said.
      const next = this.flow + 1;
      const praised = said.then(() => (next === this.flow ? praise() : undefined));
      sfxSelect();
      this.clearSpots();
      this.index++;
      await this.startLink(false, praised, said);
      return;
    }
    await said;
    if (f !== this.flow) return;
    await praise();
    if (f !== this.flow) return;
    sfxSelect();
    this.clearSpots();
    // The last creature goes to the fight: "This one comes to the fight with us!" while it still stands
    // there, then it flies into her bag (hunt 10: it was in the bag first, and the line pointed at nothing).
    this.phase = 'done';
    await this.say(narratorLine(narrator(), variant('shifter_done')));
    if (f !== this.flow) return;
    this.creature.setVisible(false);
    await this.guard(this.bag.receive(this.wordArt(l.to), CREATURE.x, CREATURE.y));
    await this.wait(400);
    this.fadeToHub();
  }

  /**
   * The praise for a link (hunt 6, M30): fix-it has its own ("You fixed it!"), and none says "by
   * yourself" after help, so a read-it link she had help or a miss on takes the next one in turn.
   */
  private praise(beat: ShifterLink['beat'], unaided: boolean): string {
    if (beat === 'fix') return variant('shifter_fixed');
    return readPraise(unaided);
  }

  // ---- Help -----------------------------------------------------------------

  /** Free play (item 060): only once the last creature is in her bag. */
  protected override playOpen(): boolean {
    return this.phase === 'done' && this.walking;
  }

  protected override hasHint(): boolean {
    return this.phase === 'pick' && !this.hinting;
  }

  /**
   * Yellow: read it, the new letter's sound; fix it, the stone in reach's
   * (else the instruction again). A letter whose name holds its sound gets
   * the bridge from its name first. Help, so this word's ramp steps down.
   * An idle re-prompt is the instruction again.
   */
  protected override hint(idle = false): void {
    if (this.phase !== 'pick' || this.hinting) return;
    const l = this.current;
    const f = ++this.flow;
    voiceBus.hush();
    // The stone green would pick: yellow's reach is green's (it was 120, so yellow sounded, and counted as
    // help, a stone 100 px off that showed no green dot; hunt 6).
    const near = l.beat === 'fix' ? this.nearestSpot() : undefined;
    if (idle || (l.beat === 'fix' && !near)) {
      void this.narrateAgain(l.beat === 'read' ? 'shifter_read' : 'shifter_fix').then(() => {
        if (f === this.flow && this.phase === 'pick') this.locked = false;
      });
      return;
    }
    this.aided = true;
    this.keepAided(l.to);
    this.hinting = true;
    this.locked = true;
    void (async () => {
      if (l.beat === 'read') {
        await this.narrate('shifter_hint');
        if (f === this.flow) await this.flashNewLetter(l.pos);
      } else {
        await this.narrate('shifter_stone');
        await this.soundStone(near!);
      }
      if (f !== this.flow) return;
      this.hinting = false;
      if (this.phase === 'pick') this.locked = false;
    })();
  }

  /** An instruction unlocks input when it ends, unless the room has moved on meanwhile. */
  protected override async narrate(...keys: string[]): Promise<void> {
    const n = ++this.narrations;
    const f = this.flow;
    await super.narrate(...keys);
    if (n !== this.narrations || f !== this.flow || this.phase !== 'pick' || this.hinting) this.locked = true;
  }

  protected override extraHooks(): Partial<RoomInfo> {
    const l = this.current;
    return {
      shifter: {
        start: this.plan.start,
        words: this.plan.links.map((x) => x.to),
        index: this.index,
        from: l.from,
        word: l.to,
        pos: l.pos,
        beat: l.beat,
        options: [...l.options],
        label: this.label,
        level: this.level,
        lit: this.lit,
        phase: this.phase,
        misses: this.wrongTries,
        aided: this.aided,
      },
    };
  }
}
