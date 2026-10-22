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
 * Every word read is a battle item; the last creature flies into her bag and
 * goes to the fight. Speech rule: a new word is never said before she has
 * it; the first creature is said (it is shown, not read), and sounds are
 * letter_ lines, never captioned.
 */

import Phaser from 'phaser';

import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { variant } from '../episode/lineVariants';
import { voiceBus } from '../audio/VoiceBus';
import { sfxPoof, sfxRight, sfxSelect, sfxStep, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_WIDTH } from '../config';
import { episode, narrator, type Slot, type Step } from '../episode/Episode';
import { burst, fitImage, floatText, popIn, shake, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { nextShifterLevel, recordedShifterLevel, shifterLevel, soundAt, type ShifterLevel, type ShifterLink, type ShifterPlan } from '../rules/shifter';
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
/** The pictures or stones standing in the room (feet positions), left to right. */
const OPTIONS: [number, number][] = [[400, 640], [640, 655], [880, 640]];
const PICTURE_SIZE = 116;
const STONE = { w: 120, h: 96 };
/** Where she walks in. */
const ENTRY = { x: 130, y: 610 };
/** How near a stone she must be for yellow to sound it. */
const REACH = 120;
/** The spell's colours. */
const MAGIC = [0xb04cff, 0xff4cd8, 0xffffff];

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
  private narrations = 0;
  /** Yellow's hint is playing: input stays locked until it is done (its lines are one help). */
  private hinting = false;

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
    this.letters = [];
    this.label = '';
    this.lit = false;
  }

  private get current(): ShifterLink {
    return this.plan.links[Math.min(this.index, this.plan.links.length - 1)]!;
  }

  private get missKey(): string {
    return `${this.slot}:${this.current.to}`;
  }

  /** The creature, its label and the options are what she reads: the box keeps off them. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    out.push({ x: CREATURE.x - 170, y: CREATURE.y - CREATURE.size / 2 - 20, w: 340, h: LABEL.y - CREATURE.y + CREATURE.size / 2 + 70, weight: 8 });
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
    this.creatureImg = this.add.image(0, 0, `pic_${this.plan.start}`);
    this.creature = this.add.container(CREATURE.x, CREATURE.y, [halo, shadow, this.creatureImg]).setDepth(LABEL.y - 20);
    this.tweens.add({ targets: halo, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // It bobs, alive.
    this.tweens.add({ targets: this.creatureImg, y: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const plate = this.add.rectangle(0, 0, LABEL.gap * 3 + 40, 100, 0xfff6dc, 0.96).setStrokeStyle(5, 0x1a1030, 0.85);
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
      if (i === litPos) this.tweens.add({ targets: t, scale: 1.14, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  /**
   * The polymorph: magic swirls in, the creature swells, squashes, shrinks to
   * nothing, a poof of smoke and sparks, and it pops back as `word`.
   */
  private async morph(word: string): Promise<void> {
    const f = this.flow;
    const { x, y } = this.creature;
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
    this.tweens.add({ targets: this.creature, scale: 1.3, duration: 260, ease: 'Back.easeOut' });
    await this.wait(260);
    this.tweens.add({ targets: this.creature, scaleX: 1.5, scaleY: 1.05, duration: 110, yoyo: true, repeat: 2 });
    await this.wait(680);
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
    await this.wait(420);
    burst(this, x, y - 40, { count: 30, speed: 300, colors: [0xffd23f, 0xffffff] });
  }

  // ---- A link ---------------------------------------------------------------

  private async startLink(first = false): Promise<void> {
    const f = ++this.flow;
    const l = this.current;
    this.round = `shifter:${this.index}:${l.to}`;
    this.phase = 'intro';
    this.hinting = false;
    this.locked = true;
    this.level = shifterLevel(progress, l.to);
    this.lit = this.level <= 2;
    this.aided = Boolean(episode.house.misses?.[`${this.missKey}:aided`]);
    this.wrongTries = episode.house.misses?.[this.missKey] ?? 0;
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
    } else {
      await this.narrate('shifter_next');
      if (f !== this.flow) return;
    }
    // The spell strikes.
    if (l.beat === 'read') {
      sfxWhoosh();
      burst(this, LABEL.x + (l.pos - 1) * LABEL.gap, LABEL.y, { count: 40, speed: 320, colors: MAGIC });
      this.setLabel(l.to, this.lit ? l.pos : -1);
      popIn(this, this.letters[l.pos]!, 1);
    } else {
      await this.morph(l.to);
      if (f !== this.flow) return;
      // The old label stays; the letter that is now wrong is lit.
      this.setLabel(l.from, this.lit ? l.pos : -1);
    }
    this.makeOptions(l);
    await this.wait(300);
    if (f !== this.flow) return;
    await this.narrate(l.beat === 'read' ? 'shifter_read' : 'shifter_fix');
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
        const pic = fitImage(this.add.image(0, -PICTURE_SIZE / 2 - 4, `pic_${o}`), PICTURE_SIZE, PICTURE_SIZE);
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
  }

  /** A stone in reach sounds itself (level 1), when the room is quiet. */
  private soundNear(letter: string): void {
    if (this.phase !== 'pick' || this.locked || voiceBus.busy) return;
    void voiceBus.say(letterSoundLine(letter));
  }

  /** The stone or picture nearest her, if in reach. */
  private inReach(): Spot | undefined {
    let best: Spot | undefined;
    let d = REACH;
    for (const s of this.spots) {
      if (!s.enabled) continue;
      const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (dd < d) {
        d = dd;
        best = s;
      }
    }
    return best;
  }

  // ---- Picking --------------------------------------------------------------

  protected choose(spot: Spot): void {
    if (this.phase !== 'pick' || this.hinting) return;
    this.flow++;
    voiceBus.hush();
    if (spot.correct) void this.gotIt(spot);
    else void this.miss(spot);
  }

  private noteMiss(spot: Spot): void {
    this.wrongTries++;
    (episode.house.misses ??= {})[this.missKey] = this.wrongTries;
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
      // Then the label's new letter, flashing.
      await this.narrate('shifter_says');
      if (f !== this.flow) return;
      await this.flashLetter(l.pos, nameToSound(l.to[l.pos]!, soundAt(l.to, l.pos)));
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
      spot.obj.setScale(1.15);
      for (const id of nameToSound(letter)) {
        await this.say(id);
        if (f !== this.flow) return;
      }
      spot.obj.setScale(1);
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
    if (!episode.read.includes(word)) episode.read.push(word);
    if (!episode.fetched.includes(word)) episode.fetched.push(word);
    if (last && !episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);
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
    progress.setShifterLevel(l.to, nextShifterLevel(recordedShifterLevel(progress, l.to), unaided));
    if (episode.house.misses) {
      delete episode.house.misses[this.missKey];
      delete episode.house.misses[`${this.missKey}:aided`];
    }
    for (const s of this.spots) s.enabled = false;
    sfxRight();
    const top = { x: spot.x, y: spot.y - PICTURE_SIZE / 2 };
    burst(this, top.x, top.y, { count: 50, speed: 420 });
    floatText(this, top.x, top.y - 90, unaided ? 'WOW!' : 'YES!', '#ffd23f');
    if (l.beat === 'read') {
      spot.obj.setVisible(false);
      await this.morph(l.to);
    } else {
      spot.obj.setVisible(false);
      await this.flyLetter(spot, l.to[l.pos]!);
    }
    if (f !== this.flow) return;
    this.setLabel(l.to);
    this.letters.forEach((t, i) => this.time.delayedCall(i * 70, () => t.setColor(LIT)));
    shockwave(this, CREATURE.x, CREATURE.y, 0xffd23f, 200);
    // Only now is the word said.
    await this.say(wordLine(l.to));
    if (f !== this.flow) return;
    await this.say(narratorLine(narrator(), variant('right')));
    if (f !== this.flow) return;
    sfxSelect();
    this.clearSpots();
    if (!last) {
      this.index++;
      await this.startLink();
      return;
    }
    // The last creature goes to the fight.
    this.phase = 'done';
    this.creature.setVisible(false);
    await this.guard(this.bag.receive(this.wordArt(l.to), CREATURE.x, CREATURE.y));
    await this.say(narratorLine(narrator(), variant('shifter_done')));
    await this.wait(400);
    this.fadeToHub();
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
    if (idle) {
      void this.narrateAgain(l.beat === 'read' ? 'shifter_read' : 'shifter_fix').then(() => {
        if (f === this.flow && this.phase === 'pick') this.locked = false;
      });
      return;
    }
    const near = l.beat === 'fix' ? this.inReach() : undefined;
    if (l.beat === 'fix' && !near) {
      void this.narrateAgain('shifter_fix').then(() => {
        if (f === this.flow && this.phase === 'pick') this.locked = false;
      });
      return;
    }
    this.aided = true;
    (episode.house.misses ??= {})[`${this.missKey}:aided`] = 1;
    this.hinting = true;
    this.locked = true;
    void (async () => {
      if (l.beat === 'read') {
        await this.narrate('shifter_hint');
        if (f === this.flow) await this.flashLetter(l.pos, nameToSound(l.to[l.pos]!, soundAt(l.to, l.pos)));
      } else {
        const letter = near!.obj.getData('letter') as string;
        await this.narrate('shifter_stone');
        near!.obj.setScale(1.15);
        for (const id of nameToSound(letter)) {
          if (f !== this.flow) break;
          await this.say(id);
        }
        near!.obj.setScale(1);
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
