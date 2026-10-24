/**
 * The rhyme room (item 139, designed with Matt): a side room where a rhyme
 * helps her read. Walking and green only, nothing for Dad's 1 / 2: she can
 * play it alone.
 *
 * A round (src/rules/rhyme.ts): two rhyming words of one family stand at the
 * back of the room as cards, each its picture and its printed word, and each
 * is said as it lights (BUG, HUG). The family's third word is printed on a
 * plate at the top, never said (RUG). Three unlabeled pictures stand in the
 * room: the printed word's, one sharing its first sound (ROCK), one its vowel
 * (SUN). She walks to the one the plate names and presses green: by reading
 * it, or by hearing the rhyme.
 *
 * Help fades per word (`rhymeLevel`, ProgressStore `rhymeLevels`): at level 1
 * the helper sounds the printed word out, unit by unit, each lit on the plate
 * (a digraph one sound, never blended), then asks which thing it is; at
 * levels 2 and 3 it is sounded out only on yellow. Yellow sounds it out at
 * any level (help: that word's ramp steps down). Right first time with no
 * yellow moves the word up a level; yellow or a miss, down one (recorded
 * always; DIFFICULTY caps what the room gives, so at base every word plays 1).
 *
 * A miss never penalises (the fizzle-and-giggle, a wiggle): the rhyme is said
 * again with her pick in it, then with the right word, "Bug, hug... sun?
 * Listen: bug, hug, rug!" (Matt's design: the miss line says the printed word,
 * a deliberate exception to the speech rule, as the move choice's is). After
 * two misses the answer sparkles.
 *
 * A right pick: the picture flies up into the row beside the two cards, the
 * plate lights, and the word is said; recorded as a read (`words`, her word
 * bag) and its family under `rimes`; a copy flies into her bag (every printed
 * word is a battle item; not MOM or DAD, NO_BAG_COPY). About three rounds a
 * visit, each a different family, then back to the hub.
 */

import Phaser from 'phaser';

import { narratorLine, wordLine } from '../../content/voice/ids';
import { readPraise, variant } from '../episode/lineVariants';
import { voiceBus } from '../audio/VoiceBus';
import { sfxRight, sfxSelect, sfxSummon } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_WIDTH } from '../config';
import { episode, narrator, type Slot, type Step } from '../episode/Episode';
import { burst, fitImage, floatText, pictureSize, popIn, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { stepLevel } from '../rules/difficulty';
import { recordedRhymeLevel, rhymeLevel, type RhymeLevel, type RhymePlan, type RhymeRound } from '../rules/rhyme';
import { soundOut } from '../rules/soundOut';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood, roomSeed } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, HouseSideRoom, INK, LIT, sidePlan } from '../world/SideRoom';

/** `intro`: a round is being set out and said, she waits. `pick`: the pictures are up. `check`: a pick plays out. `done`: back to the hub. */
type Phase = 'intro' | 'pick' | 'check' | 'done';

/** The printed word's plate, at the top. */
const PLATE = { x: GAME_WIDTH / 2, y: 120, gap: 78, h: 104 };
/** The two rhyme cards and the third place the right picture flies to, left to right (picture centres). */
const CARDS: [number, number][] = [[360, 300], [640, 300], [920, 300]];
const CARD = { w: 190, h: 220, pic: 120 };
/** The pictures standing in the room (feet positions), left to right. */
const OPTIONS: [number, number][] = [[400, 640], [640, 655], [880, 640]];
const PICTURE_SIZE = 116;
/** Where she walks in. */
const ENTRY = { x: 130, y: 610 };
/** The room's colours: a music-box sparkle. */
const TUNE = [0x4cc9ff, 0xffd23f, 0xffffff];

export class RhymeRoom extends HouseSideRoom {
  private plan!: RhymePlan;
  private index = 0;
  private phase: Phase = 'intro';
  private finished = false;
  private level: RhymeLevel = 1;
  /** Yellow on this word: kept on the episode like the misses. */
  private aided = false;
  /** Was this round's word sounded out unasked (level 1)? */
  private sounded = false;
  private bag!: Bag;
  /** The round's things at the back: the two cards (the third place fills on a right pick). */
  private cards: Phaser.GameObjects.Container[] = [];
  private cardWords: Phaser.GameObjects.Text[] = [];
  private plate: Phaser.GameObjects.Container | null = null;
  /** The plate's units, lit as they are sounded. */
  private units: Phaser.GameObjects.Text[] = [];
  /** The flow in charge: a chain stops at its next await once something newer has taken over. */
  private flow = 0;
  private narrations = 0;
  /** Yellow's hint is playing: input stays locked until it is done. */
  private hinting = false;
  /** Whether this visit's full instruction has been said: a later round gets the short one. */
  private told = false;

  constructor() {
    super('RhymeRoom');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    const p = sidePlan('RhymeRoom', this.slot, 'rhyme');
    this.plan = p.rhyme;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first round not yet read
    // (`read` too: MOM and DAD are read but never fetched, NO_BAG_COPY).
    const next = this.plan.rounds.findIndex((r) => !episode.fetched.includes(r.word) && !episode.read.includes(r.word));
    this.index = next < 0 ? this.plan.rounds.length : next;
    this.finished = next < 0;
    this.phase = 'intro';
    this.flow++;
    this.cards = [];
    this.cardWords = [];
    this.plate = null;
    this.units = [];
    this.told = false;
    this.hinting = false;
  }

  private get current(): RhymeRound {
    return this.plan.rounds[Math.min(this.index, this.plan.rounds.length - 1)]!;
  }

  /** The plate, the cards and the pictures are what she reads and picks: the box keeps off them. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    out.push({ x: PLATE.x - 200, y: PLATE.y - PLATE.h / 2 - 10, w: 400, h: PLATE.h + 20, weight: 12 });
    for (const [x, y] of CARDS) out.push({ x: x - CARD.w / 2, y: y - CARD.h / 2, w: CARD.w, h: CARD.h, weight: 8 });
    for (const s of this.spots) if (s.obj.active) out.push({ x: s.x - 70, y: s.y - PICTURE_SIZE - 30, w: 140, h: PICTURE_SIZE + 40, weight: 40 });
    return out;
  }

  protected build(): void {
    this.floor.setTo(70, 450, 1140, 250);
    const avoid = [new Phaser.Geom.Rectangle(CARDS[0]![0] - CARD.w / 2 - 20, 0, CARDS[2]![0] - CARDS[0]![0] + CARD.w + 40, CARDS[0]![1] + CARD.h / 2 + 20), new Phaser.Geom.Rectangle(OPTIONS[0]![0] - 90, OPTIONS[0]![1] - 150, OPTIONS[2]![0] - OPTIONS[0]![0] + 180, 200)];
    applyHouseMood(this, episode.villain, { seed: roomSeed(this.roomId), floor: this.floor, calm: true, avoid });
    this.bag = new Bag(this);
    this.enter(ENTRY.x, ENTRY.y);
    for (const r of this.plan.rounds) for (const w of [...r.shown, r.word]) void voiceBank.ensure(wordLine(w));
    if (this.finished) {
      this.locked = true;
      this.phase = 'done';
      this.backToHubSoon();
      return;
    }
    void this.startRound(true);
  }

  // ---- A round --------------------------------------------------------------

  /** A round: its cards set out and said, the plate printed, then (level 1) the word sounded out, then its question. `praised`: the last round's praise, which this one waits for. */
  private async startRound(first = false, praised: Promise<unknown> = Promise.resolve()): Promise<void> {
    const f = ++this.flow;
    const r = this.current;
    this.round = `rhyme:${this.index}:${r.word}`;
    this.phase = 'intro';
    this.hinting = false;
    this.locked = true;
    this.level = rhymeLevel(progress, r.word);
    this.sounded = false;
    this.aided = this.keptAided(r.word);
    this.wrongTries = this.keptMisses(r.word);
    await praised;
    if (f !== this.flow) return;
    this.clearSpots();
    this.clearRound();
    if (first) {
      await this.wait(ARRIVE_MS);
      if (f !== this.flow) return;
      await this.narrate('rhyme_intro');
      if (f !== this.flow) return;
    }
    // The two rhyming words, each lit as it is said.
    for (let i = 0; i < 2; i++) {
      this.makeCard(i, r.shown[i]!);
      await this.wait(200);
      if (f !== this.flow) return;
      await this.sayCard(i);
      if (f !== this.flow) return;
    }
    // The third place in the row, waiting for its picture; and the third word, printed, never said.
    this.makeSlot();
    this.makePlate(r.word);
    this.makeOptions(r);
    await this.wait(300);
    if (f !== this.flow) return;
    if (this.level === 1) {
      // Level 1: the helper sounds it out for her, then asks which thing it is.
      await this.narrate(this.told ? 'rhyme_cue_sound' : 'rhyme_more');
      if (f !== this.flow) return;
      await this.soundOutPlate();
      if (f !== this.flow) return;
      this.sounded = true;
      await this.narrate('rhyme_which');
    } else {
      await this.narrate(this.told ? 'rhyme_cue' : 'rhyme_read');
    }
    this.told = true;
    if (f !== this.flow) return;
    this.phase = 'pick';
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** The last round's cards, plate and flown-up picture go. */
  private clearRound(): void {
    for (const c of this.cards) c.destroy();
    this.cards = [];
    this.cardWords = [];
    this.plate?.destroy();
    this.plate = null;
    this.units = [];
  }

  /** A rhyme card at the back: its picture and its word under it. */
  private makeCard(i: number, word: string): void {
    const [x, y] = CARDS[i]!;
    const back = this.add.rectangle(0, 0, CARD.w, CARD.h, 0xfff6dc, 0.96).setStrokeStyle(5, 0x1a1030, 0.85);
    const box = pictureSize(this, this.wordArt(word), CARD.pic, CARD.pic);
    const pic = fitImage(this.add.image(0, -30, this.wordArt(word)), box.w, box.h);
    const text = this.add.text(0, 72, word.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '54px', color: INK, stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5);
    const card = this.add.container(x, y, [back, pic, text]).setDepth(DEPTH.sparkles - 20);
    this.cards[i] = card;
    this.cardWords[i] = text;
    popIn(this, card, 1);
    sfxSummon();
    burst(this, x, y, { count: 18, speed: 220, colors: TUNE });
  }

  /** The row's third place: a faint card with a question mark, where the right picture flies on a right pick. */
  private makeSlot(): void {
    const [x, y] = CARDS[2]!;
    const back = this.add.rectangle(0, 0, CARD.w, CARD.h, 0xfff6dc, 0.45).setStrokeStyle(5, 0x1a1030, 0.5);
    const mark = this.add.text(0, -10, '?', { fontFamily: FONT_COMIC, fontSize: '110px', color: INK, stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0.6);
    const slot = this.add.container(x, y, [back, mark]).setDepth(DEPTH.sparkles - 21);
    this.cards[2] = slot;
    popIn(this, slot, 1);
    this.tweens.add({ targets: mark, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A card's word, lit while it is said. */
  private async sayCard(i: number, id = wordLine(this.current.shown[i]!)): Promise<void> {
    const t = this.cardWords[i];
    const card = this.cards[i];
    t?.setColor(LIT);
    if (card) this.tweens.add({ targets: card, scale: 1.08, duration: 160, yoyo: true });
    await this.say(id);
    t?.setColor(INK);
  }

  /** The printed word's plate at the top: its sound units, each its own text so it lights as it is sounded. */
  private makePlate(word: string): void {
    const steps = soundOut(word);
    const w = steps.length * PLATE.gap + 70;
    const back = this.add.rectangle(0, 0, w, PLATE.h, 0xffffff, 0.97).setStrokeStyle(6, 0x1a1030, 0.9);
    const glow = this.add.image(0, 0, TEX.glow).setScale(3.4, 1.6).setAlpha(0.35).setTint(TUNE[1]!).setBlendMode(Phaser.BlendModes.ADD);
    this.units = steps.map((s, i) => this.add.text((i - (steps.length - 1) / 2) * PLATE.gap, 0, s.unit.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: s.unit.length > 1 ? '64px' : '80px', color: INK, stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5));
    this.plate = this.add.container(PLATE.x, PLATE.y, [glow, back, ...this.units]).setDepth(DEPTH.sparkles - 19);
    this.tweens.add({ targets: glow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    popIn(this, this.plate, 1);
    burst(this, PLATE.x, PLATE.y, { count: 30, speed: 280, colors: TUNE });
  }

  /** The printed word sounded out, unit by unit, each lit on the plate as it plays; never blended. */
  private async soundOutPlate(): Promise<void> {
    const f = this.flow;
    const steps = soundOut(this.current.word);
    for (let i = 0; i < steps.length; i++) {
      const t = this.units[i];
      t?.setColor(LIT);
      if (t) this.tweens.add({ targets: t, scale: 1.18, duration: 140, yoyo: true });
      if (steps[i]!.id) await this.say(steps[i]!.id);
      t?.setColor(INK);
      if (f !== this.flow) return;
      await this.wait(160);
      if (f !== this.flow) return;
    }
  }

  /** The three unlabeled pictures standing in the room. */
  private makeOptions(r: RhymeRound): void {
    r.options.forEach((o, i) => {
      const [x, y] = OPTIONS[i] ?? OPTIONS[OPTIONS.length - 1]!;
      const shadow = this.add.ellipse(0, 0, 100, 22, 0x000000, 0.3);
      const box = pictureSize(this, this.wordArt(o), PICTURE_SIZE, PICTURE_SIZE);
      const pic = fitImage(this.add.image(0, -box.h / 2 - 4, this.wordArt(o)), box.w, box.h);
      const spot = this.addSpot(o, x, y, [shadow, pic], o === r.word);
      popIn(this, spot.obj, 1, i * 110);
    });
    for (const [x, y] of OPTIONS) burst(this, x, y - 50, { count: 14, speed: 180, colors: TUNE });
    // A round's pictures stand where the last round's were: she steps up out of their reach, or a
    // green mashed through the instruction would pick one she never walked to (the Shape-Shifter's hunt 6).
    this.stepClearOf(CARDS[1]![0], 0, Math.min(...OPTIONS.map(([, y]) => y)) - 150);
  }

  // ---- Picking --------------------------------------------------------------

  protected choose(spot: Spot): void {
    if (this.phase !== 'pick' || this.hinting) return;
    this.flow++;
    voiceBus.hush();
    if (spot.correct) void this.gotIt(spot);
    else void this.miss(spot);
  }

  /** A wrong pick: no penalty. The rhyme with her pick in it, then with the right word: "Bug, hug... sun? Listen: bug, hug, rug!" */
  private async miss(spot: Spot): Promise<void> {
    const f = this.flow;
    const r = this.current;
    this.phase = 'check';
    this.locked = true;
    this.wrongTries++;
    this.keepMisses(r.word, this.wrongTries);
    this.giggle(spot.obj, spot.x, spot.y - 150, this.wrongTries - 1);
    await this.wait(350);
    if (f !== this.flow) return;
    await this.sayCard(0);
    if (f !== this.flow) return;
    await this.sayCard(1);
    if (f !== this.flow) return;
    // Her pick, its picture swelling (saying the word she picked is fine: she has picked it).
    spot.obj.setScale(spot.baseScale * 1.15);
    await this.say(wordLine(spot.id));
    spot.obj.setScale(this.nearestSpot() === spot ? spot.baseScale * 1.1 : spot.baseScale);
    if (f !== this.flow) return;
    await this.narrate('rhyme_listen');
    if (f !== this.flow) return;
    await this.sayCard(0);
    if (f !== this.flow) return;
    await this.sayCard(1);
    if (f !== this.flow) return;
    await this.sayPlate();
    if (f !== this.flow) return;
    this.phase = 'pick';
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** The printed word said, the plate lit while it is. */
  private async sayPlate(): Promise<void> {
    for (const t of this.units) t.setColor(LIT);
    if (this.plate) this.tweens.add({ targets: this.plate, scale: 1.08, duration: 160, yoyo: true });
    await this.say(wordLine(this.current.word));
    for (const t of this.units) t.setColor(INK);
  }

  /** The right pick: recorded first, then its picture flies up beside the cards, and the word is said. */
  private async gotIt(spot: Spot): Promise<void> {
    const f = this.flow;
    const r = this.current;
    const last = this.index === this.plan.rounds.length - 1;
    const firstTry = this.wrongTries === 0;
    const unaided = firstTry && !this.aided;
    this.phase = 'check';
    this.locked = true;
    this.recordRead(r.word, firstTry, this.wrongTries, { last });
    progress.record('rimes', r.rime, firstTry, this.wrongTries);
    // The ramp: right first time with no yellow is one level less help; yellow or a miss, one more.
    progress.setRhymeLevel(r.word, stepLevel(recordedRhymeLevel(progress, r.word), unaided));
    this.forgetMisses(r.word);
    for (const s of this.spots) s.enabled = false;
    this.stopSparkle(spot);
    sfxRight();
    const top = { x: spot.x, y: spot.y - PICTURE_SIZE / 2 };
    burst(this, top.x, top.y, { count: 50, speed: 420 });
    floatText(this, top.x, top.y - 90, unaided ? 'WOW!' : 'YES!', '#ffd23f');
    // Its picture flies up into the third place of the row, over the cards, and the question mark goes: three
    // that rhyme. The other two pictures go too.
    const [cx, cy] = CARDS[2]!;
    for (const s of this.spots) if (s !== spot) this.tweens.add({ targets: s.obj, alpha: 0, duration: 260, onComplete: () => s.obj.setVisible(false) });
    spot.obj.setDepth(DEPTH.sparkles - 18);
    const slot = this.cards[2];
    if (slot) this.tweens.add({ targets: slot.list.at(-1), alpha: 0, duration: 300 });
    this.tweens.add({ targets: spot.obj, x: cx, y: cy + PICTURE_SIZE / 2 + 10, scale: 1.05, duration: 520, ease: 'Cubic.easeOut' });
    await this.wait(520);
    if (f !== this.flow) return;
    shockwave(this, cx, cy, 0xffd23f, 180);
    burst(this, cx, cy, { count: 40, speed: 320, colors: TUNE });
    // Only now is the word said.
    await this.sayPlate();
    if (f !== this.flow) return;
    const copy = this.bagCopy(r.word) ? this.guard(this.bag.receive(this.wordArt(r.word), cx, cy)) : Promise.resolve();
    const praise = Promise.all([copy, this.say(narratorLine(narrator(), readPraise(unaided)))]);
    if (!last) {
      sfxSelect();
      this.index++;
      await this.startRound(false, praise);
      return;
    }
    await praise;
    if (f !== this.flow) return;
    // The last row stays up, its third picture in place, while the visit ends.
    this.phase = 'done';
    await this.say(narratorLine(narrator(), variant('rhyme_done')));
    if (f !== this.flow) return;
    await this.wait(400);
    this.fadeToHub();
  }

  // ---- Help -----------------------------------------------------------------

  /** Free play (item 060): only once the last word is in her bag. */
  protected override playOpen(): boolean {
    return this.phase === 'done' && this.walking;
  }

  protected override hasHint(): boolean {
    return this.phase === 'pick' && !this.hinting;
  }

  /** Yellow: the printed word sounded out, at any level (help, so its ramp steps down). An idle re-prompt is the question again. */
  protected override hint(idle = false): void {
    if (this.phase !== 'pick' || this.hinting) return;
    const f = ++this.flow;
    voiceBus.hush();
    if (idle) {
      void this.narrateAgain(this.level === 1 ? 'rhyme_which' : 'rhyme_read').then(() => {
        if (f === this.flow && this.phase === 'pick') this.locked = false;
      });
      return;
    }
    const r = this.current;
    this.aided = true;
    this.keepAided(r.word);
    this.hinting = true;
    this.locked = true;
    void (async () => {
      await this.narrate('rhyme_listen');
      if (f === this.flow) await this.soundOutPlate();
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
    const r = this.current;
    return {
      rhyme: {
        words: this.plan.rounds.map((x) => x.word),
        index: this.index,
        rime: r.rime,
        shown: [...r.shown],
        word: r.word,
        options: [...r.options],
        level: this.level,
        sounded: this.sounded,
        phase: this.phase,
        misses: this.wrongTries,
        aided: this.aided,
      },
    };
  }
}
