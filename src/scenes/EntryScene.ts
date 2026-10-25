/**
 * The entry hall: the home warm-up (item 033), between the bedroom and the
 * quest. "Before we head out, let's take the ..."
 *
 * Nine pictures stand on the floor, with no words on them (item 059: with
 * its word printed under each she matched letters instead of sounding out). The narrator asks for one and
 * gives the clue at the word's level on the ramp (src/rules/grab.ts), a
 * phonics task that never says the word (amendment 1549) nor a letter's name
 * (item 137): levels 1 and 2 the sounds with the letters (a multi-letter
 * unit, NG SH CK LL, one sound: item 085), level 3 the sounds over blank
 * boxes. A board over the hall shows
 * the letters as they are sounded and lights each in turn (a
 * digraph's two letters together, one sound: SH of SHIP).
 *
 * She walks to a picture and presses green. Right: a burst, the word (the
 * first time it is said), and it
 * flies into her bag as a battle item; then the front door appears. Wrong: a
 * giggle and "That's the CAT! We need the ..." and the clue again at the same
 * level; from GRAB.helpAfter misses the clue is the slow sound-out, the
 * letters shown, never blended. No penalty;
 * misses are recorded (ProgressStore `grabs`, exposure, never a read).
 * Yellow, or a long quiet spell, gives the clue again.
 */

import Phaser from 'phaser';

import { personOf } from '../../content/battle/roster';
import { ENTRY_HALL } from '../../content/house/house';
import { wordLine } from '../../content/voice/ids';
import { sfxRight, sfxSelect, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, FONT_ROUNDED, GAME_WIDTH, GRAB, SOUND_GAP_MS } from '../config';
import { episode, grabPlan, helper, waker, type Step } from '../episode/Episode';
import { bob, burst, fitPicture, floatText, popIn, shockwave, squash } from '../fx/juice';
import { stepLevel } from '../rules/difficulty';
import { clue, grabLevel, recordedGrabLevel, type GrabLevel } from '../rules/grab';
import { progress } from '../state/progress';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { applyHouseMood } from '../world/houseMood';
import { GIGGLE_BEAT_MS, RoomScene, type Spot } from '../world/RoomScene';

type Phase = 'intro' | 'find' | 'got' | 'door';

const PIC = 108;
// Below a one- or two-row dialogue box in the top band, above the top row of pictures (their tops
// at about 300): at 118 the board, drawn over the box, hid "WE NEED THE..." on every miss (item 069).
const BOARD_Y = 205;
const TILE = 76;
const TILE_GAP = 14;
/** The help's sound-out goes slower: each sound stands on its own, never run together. */
const HELP_GAP_MS = 700;

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

  /**
   * The letter board is what she matches: the dialogue box keeps off it. Only
   * once it is up: a hidden board kept the first line ("let's take the...")
   * off the empty top and down over the bottom row of pictures (item 039).
   */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    // While she looks for it, the pictures weigh more than the board: the
    // re-prompt ("We need the...") hid the very picture she was stuck on (item 039).
    if (this.phase === 'find') {
      for (const s of this.spots) if (s.id.startsWith('grab_') && s.enabled) out.push({ x: s.x - 75, y: s.y - 160, w: 150, h: 165, weight: 6 });
    }
    if (this.board?.active && this.board.visible) {
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
    // And the gaps between them (hunt 10): a bone pile between HAND and TRUCK read as a fourth thing in the row;
    // and 250 px past the rows' right end (hunt 11: a penguin trooper stood past KING, where a fourth picture would
    // go; past both ends no floor spot was left, a review).
    const xs = ENTRY_HALL.spots.map((p) => p.x);
    const ys = ENTRY_HALL.spots.map((p) => p.y);
    things.push(new Phaser.Geom.Rectangle(Math.min(...xs) - 70, Math.min(...ys) - 140, Math.max(...xs) - Math.min(...xs) + 320, Math.max(...ys) - Math.min(...ys) + 150));
    const grownUps = [ENTRY_HALL.helper, ENTRY_HALL.waker, ENTRY_HALL.door].map((p) => new Phaser.Geom.Rectangle(p.x - 80, p.y - 200, 160, 220));
    // And her start spot (hunt 10, M58: Moriarty's playing card drew over her head as the hall opened);
    // a decal with nowhere clear left is not drawn.
    const start = new Phaser.Geom.Rectangle(ENTRY_HALL.start.x - 70, ENTRY_HALL.start.y - 190, 140, 200);
    // Calm (hunt 11): a quake villain's stomp-and-shake landed between the clue's sounds and jolted the board.
    applyHouseMood(this, episode.villain, { seed: 33, floor: this.floor, calm: true, avoid: [...things, ...grownUps, start] });
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

    // The nine pictures, no words on them (item 059): with its word printed
    // she matched letters instead of sounding it out.
    plan.objects.forEach((word, i) => {
      const p = ENTRY_HALL.spots[i]!;
      // DAD, MOM, a standing person by their own shape, not shrunk to a square (M48).
      const pic = fitPicture(this.add.image(0, -4, `pic_${word}`).setOrigin(0.5, 1), PIC, PIC);
      const spot = this.addSpot(`grab_${word}`, p.x, p.y, [pic], word === this.word);
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
      this.doorGlow(d, -100);
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
      const letter = this.add.text(x, 2, '', { fontFamily: FONT_ROUNDED, fontSize: '56px', color: '#3a2412' }).setOrigin(0.5);
      parts.push(box, letter);
      return { box, letter };
    });
    // Over the dialogue box (DEPTH.hud + 5): the board is what she matches.
    this.board = this.add.container(GAME_WIDTH / 2, BOARD_Y, parts).setDepth(DEPTH.hud + 6);
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
   * The clue at the word's level, never the word itself (amendment 1549):
   * shown sounds write their letters into the board's boxes, every
   * step lights its own. From GRAB.helpAfter misses: the slow sound-out, the
   * letters shown.
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
      const lit = this.tiles.slice(step.index, step.index + step.span);
      for (const o of this.tiles) o.box.setFillStyle(0xfff8e6, 1);
      lit.forEach((t, j) => {
        t.box.setFillStyle(0x9be7ff, 1);
        if (step.show) t.letter.setText(this.word[step.index + j]!.toUpperCase());
      });
      this.tweens.add({ targets: lit.flatMap((t) => [t.box, t.letter]), scale: 1.18, duration: 130, yoyo: true });
      if (step.id) await this.say(step.id);
      await this.wait(help ? HELP_GAP_MS : SOUND_GAP_MS);
    }
    for (const o of this.tiles) o.box.setFillStyle(0xfff8e6, 1);
    if (this.phase === 'intro' || this.phase === 'find') this.locked = false;
  }

  /** Before and while she looks, an instruction leads into the clue (or a miss's next line): giveClue() unlocks. */
  protected override stayLocked(): boolean {
    return this.phase === 'intro' || this.phase === 'find';
  }

  protected override hint(): void {
    if (this.phase === 'find' && !this.locked) {
      this.locked = true;
      void this.narrateAgain('grab_need').then(() => this.giveClue());
    } else if (this.phase === 'door' && !this.locked) void this.narrateAgain('grab_door');
  }

  /**
   * Free play (item 060): closed while the warm-up's answer is open, from the
   * first clue (the board up) until she has found it; open in the hall
   * before the clue, once she has it, and at the door.
   */
  protected override playOpen(): boolean {
    if (this.phase === 'find') return false;
    if (this.phase === 'intro' && this.board?.visible) return false;
    return this.walking;
  }

  /** Yellow speaks only while she looks (the clue again) and at the door. */
  protected override hasHint(): boolean {
    return this.phase === 'find' || this.phase === 'door';
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
    this.giggle(spot.obj, spot.x, spot.y - 150, this.misses - 1);
    // A beat for the giggle before the line (hunt 11: under the voice it was ducked to under half).
    await this.wait(GIGGLE_BEAT_MS);
    await this.narrate('grab_wrong');
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
    // The ramp moves on her recorded level, whatever the hall gave (item 067: DIFFICULTY caps only what she gets):
    // right first time is one level harder, a first-try miss one easier.
    progress.setGrabLevel(this.word, stepLevel(recordedGrabLevel(progress, this.word), firstTry));
    if (!episode.fetched.includes(this.word)) episode.fetched.push(this.word);

    const y = spot.y - 80;
    sfxRight();
    burst(this, spot.x, y, { count: 50, speed: 450 });
    shockwave(this, spot.x, y, 0xffd23f, 140);
    floatText(this, spot.x, y - 90, firstTry ? 'WOW!' : 'YES!', '#ffd23f');
    this.showLetters();
    await this.say(wordLine(this.word));

    // Into the bag it goes.
    // Its picture leaves the floor as it flies.
    this.tweens.add({ targets: spot.obj, alpha: 0, duration: 250 });
    sfxSummon();
    await this.guard(this.bag?.receive(`pic_${this.word}`, spot.x, y) ?? Promise.resolve());
    // The door pops out as its line starts (item 039: "out the door" came before there was one).
    this.openDoor();
    await this.narrate('grab_door');
  }

  protected override extraHooks() {
    return { grab: { word: this.word, level: this.level, misses: this.misses, objects: episode.grab?.objects ?? [], phase: this.phase } };
  }
}
