/**
 * The entry hall: the home warm-up (item 033), between the bedroom and the
 * quest. "Before we head out, let's grab the ..."
 *
 * Nine pictures stand on the floor, each with its word printed on it in upper
 * case (the one place a picture carries its word: here she finds a word by
 * its letters, so the label is the point). The narrator asks for one and
 * gives the clue at the word's level on the ramp (src/rules/grab.ts): the
 * word (easiest level only), its letter names, its letter sounds one at a
 * time. A board over the hall shows the word's letters as their names are
 * said and lights each as its sound is (a digraph's two letters together,
 * one sound: SH of SHIP); at the sounds-only level it shows
 * blank boxes, lit in turn, so the letters themselves are not given away.
 *
 * She walks to a picture and presses green. Right: a burst, the word, and it
 * flies into her bag as a battle item; then the front door appears. Wrong: a
 * giggle and "That's the CAT! We need the ..." and the clue again at the same
 * level; after GRAB.helpAfter misses the clue adds the whole word. No penalty;
 * misses are recorded (ProgressStore `grabs`, exposure, never a read).
 * Yellow, or a long quiet spell, gives the clue again.
 */

import Phaser from 'phaser';

import { personOf } from '../../content/battle/roster';
import { ENTRY_HALL } from '../../content/house/house';
import { wordLine } from '../../content/voice/ids';
import { sfxRight, sfxSelect, sfxSummon, sfxWhoosh, sfxWrong } from '../audio/sfx';
import { DEPTH, GAME_WIDTH, GRAB } from '../config';
import { episode, grabPlan, helper, waker, type Step } from '../episode/Episode';
import { bob, burst, fitImage, floatText, popIn, shockwave, squash, wiggle } from '../fx/juice';
import { TEX } from '../fx/textures';
import { clue, grabLevel, nextLevel, type GrabLevel } from '../rules/grab';
import { progress } from '../state/progress';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { applyHouseMood } from '../world/houseMood';
import { RoomScene, type Spot } from '../world/RoomScene';

type Phase = 'intro' | 'find' | 'got' | 'door';

const FONT = '"Arial Rounded MT Bold", "Arial Black", sans-serif';
const PIC = 96;
const BOARD_Y = 118;
const TILE = 76;
const TILE_GAP = 14;
/** A beat after each letter, so the names and sounds stay apart (the sentence room's is 450). */
const NAME_GAP_MS = 220;
const SOUND_GAP_MS = 400;

export class EntryScene extends RoomScene {
  private phase: Phase = 'intro';
  private word = '';
  private level: GrabLevel = GRAB.startLevel;
  private misses = 0;
  private bag: Bag | null = null;
  private doorSpot: Spot | null = null;
  private board: Phaser.GameObjects.Container | null = null;
  private tiles: { box: Phaser.GameObjects.Rectangle; letter: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('Entry');
  }

  override init(data: { step?: Step }): void {
    super.init(data);
    this.phase = 'intro';
    this.misses = 0;
    this.bag = null;
    this.doorSpot = null;
    this.board = null;
    this.tiles = [];
    this.floor = new Phaser.Geom.Rectangle(70, 380, GAME_WIDTH - 140, 320);
  }

  protected background(): string {
    return 'room_entry';
  }

  /** The letter board is what she matches: the dialogue box keeps off it. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    if (this.board?.active) {
      const b = this.board.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 5 });
    }
    return out;
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.round = `entry:${phase}`;
  }

  protected build(): void {
    const plan = grabPlan();
    this.word = plan.word;
    // The level and the misses live on the episode, so a trip to the parent
    // page (F9) and back neither forgets a miss nor reads the level it moved.
    const g = episode.grab!;
    g.level ??= grabLevel(progress, this.word);
    this.level = g.level as GrabLevel;
    this.misses = g.misses;
    const got = episode.fetched.includes(this.word);
    this.setPhase('intro');

    const things = ENTRY_HALL.spots.map((p) => new Phaser.Geom.Rectangle(p.x - 70, p.y - 140, 140, 150));
    const grownUps = [ENTRY_HALL.helper, ENTRY_HALL.waker, ENTRY_HALL.door].map((p) => new Phaser.Geom.Rectangle(p.x - 80, p.y - 200, 160, 220));
    applyHouseMood(this, episode.villain, { seed: 33, floor: this.floor, avoid: [...things, ...grownUps] });
    this.bag = new Bag(this);

    this.player.place(ENTRY_HALL.start.x, ENTRY_HALL.start.y);

    // The grown-ups wait by the front door: the helper (who asks), and the dad who woke her.
    const h = helper();
    const friend = this.castSprite(h, ENTRY_HALL.helper.x, ENTRY_HALL.helper.y).setDepth(ENTRY_HALL.helper.y);
    bob(this, friend, 6, 750);
    this.caption.track(personOf(h), () => (friend.active ? { x: friend.x, y: friend.y } : null));
    const w = waker();
    if (personOf(w) !== personOf(h)) {
      const dad = this.castSprite(w, ENTRY_HALL.waker.x, ENTRY_HALL.waker.y).setDepth(ENTRY_HALL.waker.y);
      bob(this, dad, 5, 820);
      this.caption.track(personOf(w), () => (dad.active ? { x: dad.x, y: dad.y } : null));
    }

    // The nine pictures, each with its word on a plaque at its feet.
    plan.objects.forEach((word, i) => {
      const p = ENTRY_HALL.spots[i]!;
      const pic = fitImage(this.add.image(0, -34, `pic_${word}`).setOrigin(0.5, 1), PIC, PIC);
      const plate = this.add.rectangle(0, -16, 112, 36, 0xfff8e6, 1).setStrokeStyle(3, 0x5a3a22, 1);
      const label = this.add.text(0, -16, word.toUpperCase(), { fontFamily: FONT, fontSize: '28px', color: '#3a2412' }).setOrigin(0.5);
      const spot = this.addSpot(`grab_${word}`, p.x, p.y, [pic, plate, label], word === this.word);
      spot.obj.setData('word', word);
      if (got) {
        // Back from the parent page with it in her bag: the hall as she left it.
        spot.enabled = false;
        if (word === this.word) spot.obj.setVisible(false);
      }
    });

    // The front door: not there until she has the thing (a door she cannot use yet is not there at all).
    const door = this.art('prop_front_door', 150, 220);
    this.doorSpot = this.addSpot('door', ENTRY_HALL.door.x, ENTRY_HALL.door.y, [door], null);
    this.doorSpot.enabled = false;
    this.doorSpot.obj.setVisible(false);

    this.buildBoard();
    if (got) {
      this.showLetters();
      this.board?.setVisible(true);
      this.openDoor(false);
      return;
    }
    void this.run();
  }

  /** The board shows the whole word, green: she has it. */
  private showLetters(): void {
    for (const [i, t] of this.tiles.entries()) {
      t.letter.setText(this.word[i]!.toUpperCase());
      t.box.setFillStyle(0xb8f5a0, 1);
    }
  }

  /** The front door pops out of the wall, glowing, and is the way on. */
  private openDoor(pop = true): void {
    const d = this.doorSpot;
    if (d) {
      d.obj.setVisible(true);
      if (pop) popIn(this, d.obj);
      const light = this.add.image(0, -100, TEX.glow).setTint(0xfff1a8).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.6);
      d.obj.addAt(light, 0);
      this.tweens.add({ targets: light, alpha: 0.95, scale: 2.6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (pop) burst(this, d.x, d.y - 100, { count: 30 });
      d.correct = true;
      d.enabled = true;
    }
    this.setPhase('door');
    this.locked = false;
  }

  /** The letter board: one box per letter, empty until the clue fills or lights it. */
  private buildBoard(): void {
    const n = this.word.length;
    const width = n * TILE + (n - 1) * TILE_GAP;
    const parts: Phaser.GameObjects.GameObject[] = [this.add.rectangle(0, 0, width + 40, TILE + 30, 0x1a1030, 0.55).setStrokeStyle(3, 0xffffff, 0.7)];
    this.tiles = [...this.word].map((_, i) => {
      const x = -width / 2 + TILE / 2 + i * (TILE + TILE_GAP);
      const box = this.add.rectangle(x, 0, TILE, TILE, 0xfff8e6, 1).setStrokeStyle(4, 0x5a3a22, 1);
      const letter = this.add.text(x, 2, '', { fontFamily: FONT, fontSize: '56px', color: '#3a2412' }).setOrigin(0.5);
      parts.push(box, letter);
      return { box, letter };
    });
    this.board = this.add.container(GAME_WIDTH / 2, BOARD_Y, parts).setDepth(DEPTH.hud);
    this.board.setVisible(false);
  }

  private async run(): Promise<void> {
    await this.wait(500);
    this.locked = true;
    await this.narrate('grab_ask');
    await this.giveClue();
    this.setPhase('find');
  }

  /**
   * The clue at the word's level (and the whole word too once she has missed
   * GRAB.helpAfter times): names fill the board's boxes, sounds light them.
   */
  private async giveClue(): Promise<void> {
    this.locked = true;
    if (this.board && !this.board.visible) {
      this.board.setVisible(true);
      popIn(this, this.board);
    }
    const help = this.misses >= GRAB.helpAfter;
    for (const step of clue(this.word, this.level, help)) {
      // A digraph's sound (SH) lights both its boxes at once.
      const lit = step.index === null ? [] : this.tiles.slice(step.index, step.index + step.span);
      if (lit.length) {
        for (const o of this.tiles) o.box.setFillStyle(0xfff8e6, 1);
        for (const t of lit) t.box.setFillStyle(step.kind === 'name' ? 0xffe066 : 0x9be7ff, 1);
        if (step.kind === 'name') lit[0]!.letter.setText(this.word[step.index!]!.toUpperCase());
        this.tweens.add({ targets: lit.flatMap((t) => [t.box, t.letter]), scale: 1.18, duration: 130, yoyo: true });
      } else {
        // The word itself: every box lights at once.
        for (const o of this.tiles) o.box.setFillStyle(0xffe066, 1);
      }
      await this.say(step.id);
      await this.wait(step.kind === 'name' ? NAME_GAP_MS : step.kind === 'sound' ? SOUND_GAP_MS : 250);
    }
    for (const o of this.tiles) o.box.setFillStyle(0xfff8e6, 1);
    if (this.phase === 'intro' || this.phase === 'find') this.locked = false;
  }

  protected override hint(): void {
    if (this.phase === 'find' && !this.locked) {
      this.locked = true;
      void this.narrate('grab_need').then(() => this.giveClue());
    } else if (this.phase === 'door' && !this.locked) void this.narrate('grab_door');
  }

  protected choose(spot: Spot): void {
    if (this.locked) return;
    if (spot.id === 'door') {
      if (this.phase !== 'door') return;
      this.phase = 'got';
      squash(this, spot.obj, 1, 1, 0.15, 140);
      sfxSelect();
      sfxWhoosh();
      burst(this, spot.x, spot.y - 100, { count: 50 });
      this.done();
      return;
    }
    if (this.phase !== 'find') return;
    if (spot.correct) void this.found(spot);
    else void this.wrong(spot);
  }

  /** A miss: a giggle, "That's the CAT! We need the ...", and the clue again. */
  private async wrong(spot: Spot): Promise<void> {
    this.locked = true;
    this.misses++;
    if (episode.grab) episode.grab.misses = this.misses;
    const picked = spot.obj.getData('word') as string;
    sfxWrong();
    wiggle(this, spot.obj);
    this.player.wobble();
    floatText(this, spot.x, spot.y - 150, ['OOPS!', 'HEE HEE!', 'SILLY!', 'BOING!'][(this.misses - 1) % 4]!, '#7ad9ff', 34);
    await this.narrate('grab_wrong');
    this.locked = true;
    await this.say(wordLine(picked));
    await this.wait(200);
    await this.narrate('grab_need');
    await this.giveClue();
  }

  /** The right thing: a burst, its word, and into the bag; the level moves; the door appears. */
  private async found(spot: Spot): Promise<void> {
    this.setPhase('got');
    this.locked = true;
    for (const s of this.spots) s.enabled = false;
    const firstTry = this.misses === 0;
    // Exposure, not a read: the warm-up's own record and the ramp, never `words` or the word bag.
    progress.record('grabs', this.word, firstTry, this.misses);
    progress.setGrabLevel(this.word, nextLevel(this.level, firstTry));
    if (!episode.fetched.includes(this.word)) episode.fetched.push(this.word);

    const y = spot.y - 80;
    sfxRight();
    burst(this, spot.x, y, { count: 50, speed: 450 });
    shockwave(this, spot.x, y, 0xffd23f, 140);
    floatText(this, spot.x, y - 90, firstTry ? 'WOW!' : 'YES!', '#ffd23f');
    this.showLetters();
    await this.say(wordLine(this.word));

    // Into the bag it goes.
    // Its picture and plaque leave the floor as it flies.
    this.tweens.add({ targets: spot.obj, alpha: 0, duration: 250 });
    sfxSummon();
    await this.guard(this.bag?.receive(`pic_${this.word}`, spot.x, y) ?? Promise.resolve());
    await this.narrate('grab_door');
    this.locked = true;

    this.openDoor();
  }

  protected override extraHooks() {
    return { grab: { word: this.word, level: this.level, misses: this.misses, objects: episode.grab?.objects ?? [], phase: this.phase } };
  }
}
