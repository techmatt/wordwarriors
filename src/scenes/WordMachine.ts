/**
 * The word machine (item 026): a side room where she makes words by their
 * first sound. Word families, onset + rime: CAT HAT BAT RAT.
 *
 * Mode 1, make the picture. The machine shows a picture (a bat) in its window
 * and a fixed rime (AT) on its panel, with an empty slot before it. Two or
 * three letter tiles lie on the floor. Walking onto a tile says its letter
 * SOUND; green puts it in the slot, and the machine says the onset's sound,
 * then the rime, apart, never blended. When the word is the picture's, the
 * machine plays its payoff, the word is said for the first time, and the
 * picture flies into her bag (each word built is a battle item; not MOM or
 * DAD, NO_BAG_COPY, hunt 10, M45). A wrong tile
 * makes a silly word ("That makes... ZAT! A silly word!"): it pops back out
 * onto the floor and she tries again, no penalty. The visit is several rounds
 * through one family (the old tile pops out, a new picture: change the first
 * sound, a new word), then a switch to another family.
 *
 * Speech rule: the word she builds is never said before she has built it.
 * Nothing in the room says it: the letter sounds, the rime and the silly words
 * are their own lines (the rime is a part, never the whole), the narrator's
 * lines name no word, and yellow sounds the onset and the rime one at a time.
 *
 * Later modes (`flip`: change a built word's first sound to reach the next
 * picture; `real_or_silly`: is it a word?) plug in at `startRound`, from the
 * plan's `mode` (src/rules/wordMachine.ts); each tile already knows what it
 * makes and whether that is a real word.
 */

import Phaser from 'phaser';

import { FAMILY_BY_RIME } from '../../content/phonics/families';
import { LETTER_BY_CHAR } from '../../content/phonics/letters';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { letterSoundLine, narratorLine, rimeLine, sillyLine, wordLine } from '../../content/voice/ids';
import { readPraise, variant } from '../episode/lineVariants';
import { voiceBus, type Utterance } from '../voice/VoiceBus';
import { sfxBoing, sfxPoof, sfxRight, sfxSelect, sfxSummon } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_WIDTH, REACH } from '../config';
import { episode, narrator, type Slot, type Step } from '../episode/Episode';
import { bob, burst, fitImage, floatText, popIn, shockwave, squash } from '../fx/juice';
import type { MachineMode, MachinePlan, MachineRound, MachineTile } from '../rules/wordMachine';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import { tagPanel } from '../ui/banner';
import type { CaptionMode, KeepOut } from '../ui/Caption';
import { fontPx } from '../ui/fitText';
import { voiceBank } from '../voice/VoiceBank';
import { GIGGLE_BEAT_MS, type Spot } from '../world/RoomScene';
import { ARRIVE_MS, HouseSideRoom, INK, LIT, sidePlan } from '../world/SideRoom';

type Phase = 'intro' | 'pick' | 'check' | 'done';

/** The machine stands centre stage; its art is sized into this box, feet at MACHINE_Y. */
const MACHINE_X = GAME_WIDTH / 2;
const MACHINE_Y = 515;
const MACHINE_W = 420;
const MACHINE_H = 430;
/**
 * Where the art's blank window and panel are, as fractions of the image
 * (prop_word_machine, candidate 3 of item 026, Matt's pick in item 032). The game draws its own panel
 * over the art's, a little bigger, so other art only needs to be close.
 */
const WINDOW = { x: 0.42, y: 0.383, r: 0.22 };
const PANEL = { x: 0.422, y: 0.741, w: 0.6, h: 0.21 };
/** The tiles lie in a row on the floor in front of the machine. */
const TILE_Y = 640;
const TILE_GAP = 250;
/** The top of the y-sorted world band (DEPTH in config): above her wherever she stands. */
const TILE_DEPTH = 9_999;
/** The beat between the onset's sound and the rime's, so they never run together. */
const PART_GAP_MS = 450;
/** The machine's own giggle words on a silly word, in turn. */
const MACHINE_GIGGLES = ['SILLY!', 'HEE HEE!', 'BOING!'];

export class WordMachine extends HouseSideRoom {
  private plan!: MachinePlan;
  private index = 0;
  private phase: Phase = 'intro';
  /** The tile in the slot now (being checked), or null. */
  private slotted: MachineTile | null = null;
  private bag!: Bag;
  private machine!: Phaser.GameObjects.Image;
  private machineSize = { w: MACHINE_W, h: MACHINE_H };
  private picture: Phaser.GameObjects.Image | null = null;
  private panel!: Phaser.GameObjects.Container;
  private slotBox!: Phaser.GameObjects.Graphics;
  private onsetText!: Phaser.GameObjects.Text;
  private rimeText!: Phaser.GameObjects.Text;
  /** Every word was built before this run of the room (back from F9 at the very end): straight back to the hub. */
  private finished = false;
  /** A tile she reached while it could not speak (a line playing, the round opening): it speaks when it can. */
  private pendingTile: Spot | null = null;

  constructor() {
    super('WordMachine');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    const p = sidePlan('WordMachine', this.slot, 'machine');
    this.plan = p.machine;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first word not yet built.
    // `read` too: MOM and DAD are read but never fetched (NO_BAG_COPY, hunt 10, M45).
    const built = this.plan.rounds.findIndex((r) => !episode.fetched.includes(r.word) && !episode.read.includes(r.word));
    this.index = built < 0 ? this.plan.rounds.length - 1 : built;
    this.finished = built < 0;
    this.phase = 'intro';
    this.slotted = null;
    this.picture = null;
    this.pendingTile = null;
    // Back from the parent page (F9) after a silly word: still a miss (item 039).
    this.wrongTries = this.keptMisses(this.missWord);
  }

  /** The word whose misses are kept on the episode (`keptMisses`). */
  private get missWord(): string {
    return this.plan.rounds[this.index]?.word ?? '';
  }

  /** Sounds, rimes, silly words and the built word: the machine shows them; the box shows only who says them. */
  protected override captionMode(u: Utterance): CaptionMode | undefined {
    return /^(letter_|rime_|silly_|word_)/.test(u.id) ? 'portrait' : undefined;
  }

  /** The machine is what she reads: the box keeps off it above all. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    if (this.machine?.active) {
      const b = this.machine.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 6 });
    }
    // Every line keeps off the letters (item 039: "Walk on a letter..." hid
    // every tile it was talking about; item 059: no box ever covers a thing she chooses).
    // Each tile's full footprint: they pop in from nothing as the line starts, so their bounds are still empty then.
    for (const s of this.spots) {
      if (!s.id.startsWith('tile_') || !s.obj.active) continue;
      out.push({ x: s.x - 70, y: s.y - 130, w: 140, h: 140, weight: 40 });
    }
    return out;
  }

  /** The round in play (`round`, the base's, is its hook id). */
  private get current(): MachineRound {
    return this.plan.rounds[this.index]!;
  }

  protected build(): void {
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 260);
    // Off the tiles' row and 150 px either side (hunt 11: Elsa's icicles stood between the tiles, fix 150's kind).
    const avoid = [new Phaser.Geom.Rectangle(MACHINE_X - TILE_GAP - 150, TILE_Y - 140, 2 * TILE_GAP + 300, 220)];
    this.bag = this.moodAndBag(avoid);
    const room = SIDE_ROOM_BY_ID[this.roomId];
    // In from the side, clear of the tiles (a tile in reach would speak at once).
    this.enter(170, Math.min(room?.entry.y ?? 600, this.floor.bottom - 10));
    this.walking = false;

    this.machine = this.art('prop_word_machine', MACHINE_W, MACHINE_H, MACHINE_X, MACHINE_Y).setDepth(MACHINE_Y);
    // Measured before it pops in from nothing: the panel and window are placed on its full size.
    this.machineSize = { w: this.machine.displayWidth, h: this.machine.displayHeight };
    popIn(this, this.machine, this.machine.scale);
    this.makePanel();
    for (const r of this.plan.rounds) {
      void voiceBank.ensure(wordLine(r.word));
      void voiceBank.ensure(rimeLine(r.rime));
    }
    if (this.finished) {
      this.locked = true;
      this.backToHubSoon();
      return;
    }
    void this.startRound();
  }

  /** A tile that could not speak when she reached it speaks once the room is quiet, if she is still on it. */
  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    const t = this.pendingTile;
    if (!t || this.phase !== 'pick' || this.locked || voiceBus.busy) return;
    this.pendingTile = null;
    if (t.enabled && Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) < REACH) this.sayTile(t);
  }

  /** A point on the machine art, from fractions of the image. */
  private onMachine(fx: number, fy: number): { x: number; y: number } {
    const { w, h } = this.machineSize;
    return { x: MACHINE_X + (fx - 0.5) * w, y: MACHINE_Y - (1 - fy) * h };
  }

  /** The panel: the onset's slot, then the rime, both upper case. */
  private makePanel(): void {
    const { x, y } = this.onMachine(PANEL.x, PANEL.y);
    const w = PANEL.w * this.machineSize.w;
    const h = PANEL.h * this.machineSize.h;
    const plate = this.add.graphics();
    plate.fillStyle(0xfff4d6, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    plate.lineStyle(5, 0xe0782a, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    const style = { fontFamily: FONT_COMIC, fontSize: `${Math.round(h * 0.72)}px`, color: INK };
    this.slotBox = this.add.graphics();
    this.onsetText = this.add.text(-w * 0.2, 0, '', style).setOrigin(0.5);
    this.rimeText = this.add.text(w * 0.14, 0, '', style).setOrigin(0.5);
    this.panel = this.add.container(x, y, [plate, this.slotBox, this.onsetText, this.rimeText]).setDepth(MACHINE_Y + 1);
    // Its letters stay on the plate (the bug-hunt checker's panel check, item 128).
    tagPanel(this.panel, 'machine plate', [-w / 2, -h / 2, w / 2, h / 2]);
    this.drawSlot(false);
  }

  /** The slot's side: a box round one capital, with a little room. */
  private slotSize(): number {
    return fontPx(this.onsetText) * 1.05;
  }

  /**
   * The slot, a gap, then the rime, centred on the plate as one row (item 138,
   * Matt): the slot sits clear before the rime's first letter, the I of ING
   * as well as the A of AT, and the letter she picks lands there. A digraph
   * onset wider than the box pushes the rime along rather than over it.
   */
  private layoutPanel(): void {
    const s = this.slotSize();
    const gap = s * 0.15;
    const on = Math.max(s, this.onsetText.width);
    const start = -(on + gap + this.rimeText.width) / 2;
    this.onsetText.x = start + on / 2;
    this.rimeText.x = start + on + gap + this.rimeText.width / 2;
  }

  /** The onset's slot: an empty box (lit while the hint says its sound), or nothing behind a letter. */
  private drawSlot(filled: boolean, lit = false): void {
    const s = this.slotSize();
    this.slotBox.clear();
    if (filled) return;
    this.slotBox.fillStyle(lit ? 0xffd6e5 : 0xffffff, 1).fillRoundedRect(this.onsetText.x - s / 2, -s / 2, s, s, 10);
    this.slotBox.lineStyle(lit ? 7 : 4, lit ? 0xff3d7a : 0x9b5de5, 1).strokeRoundedRect(this.onsetText.x - s / 2, -s / 2, s, s, 10);
  }

  /** Where the slot is, in scene coordinates. */
  private slotPos(): { x: number; y: number } {
    return { x: this.panel.x + this.onsetText.x, y: this.panel.y };
  }

  /** A new word: its picture, its rime, its tiles; the right instruction for where she is in the visit. */
  private async startRound(): Promise<void> {
    const r = this.current;
    const prev = this.index > 0 ? this.plan.rounds[this.index - 1] : undefined;
    this.round = `machine:${this.index}:${r.word}`;
    this.phase = 'intro';
    this.locked = true;
    this.wrongTries = this.keptMisses(this.missWord);
    this.pendingTile = null;
    this.slotted = null;
    this.clearSpots();
    this.onsetText.setText('');
    this.rimeText.setText(r.rime.toUpperCase()).setColor(INK);
    this.layoutPanel();
    this.drawSlot(false);
    if (!prev || prev.rime !== r.rime) {
      popIn(this, this.rimeText, 1);
      if (prev) {
        sfxPoof();
        burst(this, this.panel.x, this.panel.y, { count: 30, speed: 260 });
      }
    }
    this.showPicture(r.word);
    this.layTiles(r.tiles);
    // A family keeps its tile row, so a new tile can land where she stands: she steps up out of
    // reach, or a green mashed through the round's line slotted a tile she never walked to or
    // heard (item 092; the sentence room's fix 61, here). Stepped straight up, she stood in front of the
    // machine's plate, over the word's rime (hunt 9): in front of the machine she steps to its side too.
    this.stepClearOf(MACHINE_X, MACHINE_W / 2 + 10, TILE_Y - REACH - 15);
    const mode: MachineMode = this.plan.mode;
    // Only mode 1 is played today; `flip` and `real_or_silly` start here.
    if (mode !== 'make') throw new Error(`WordMachine: mode ${mode} is not built yet`);
    if (!prev) {
      await this.wait(ARRIVE_MS);
      await this.narrate('machine_intro', 'machine_go');
    } else if (prev.rime === r.rime) await this.narrate('machine_change');
    else await this.narrate('machine_switch');
    this.phase = 'pick';
    this.walking = true;
    this.locked = false;
    // Two misses kept across F9 keep their sparkle too (item 069).
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** The picture in the window: the last one shrinks away, the new one pops in, gently bobbing. */
  private showPicture(word: string): void {
    const old = this.picture;
    if (old) this.tweens.add({ targets: old, scale: 0, duration: 220, ease: 'Back.easeIn', onComplete: () => old.destroy() });
    const { x, y } = this.onMachine(WINDOW.x, WINDOW.y);
    const size = WINDOW.r * 2 * this.machineSize.w * 0.9;
    const pic = fitImage(this.add.image(x, y, this.wordArt(word)), size, size).setDepth(MACHINE_Y + 1);
    popIn(this, pic, pic.scale, old ? 200 : 300);
    bob(this, pic, 4, 1000);
    this.picture = pic;
  }

  /** The tiles in a row on the floor, each with its letter (upper case); stepping on one says its sound. */
  private layTiles(tiles: MachineTile[]): void {
    const x0 = MACHINE_X - ((tiles.length - 1) * TILE_GAP) / 2;
    tiles.forEach((t, i) => {
      const x = x0 + i * TILE_GAP;
      const block = this.art('prop_machine_tile', 130, 110);
      const letter = this.add.text(0, -62, t.letter.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '64px', color: INK }).setOrigin(0.5);
      const spot: Spot = this.addSpot(`tile_${t.letter}`, x, TILE_Y, [block, letter], t.makes === this.current.word, () => this.sayTile(spot));
      // Over her, not under: standing on a tile must not hide its letter.
      spot.obj.setData('tile', t).setData('letter', letter).setDepth(TILE_DEPTH);
      popIn(this, spot.obj, 1, 150 + i * 120);
    });
  }

  /** Walking onto a tile: its letter's sound (teaching audio); while something is being said, it waits its turn. */
  private sayTile(spot: Spot): void {
    const t = spot.obj.getData('tile') as MachineTile | undefined;
    if (!t || this.phase === 'done') return;
    if (this.phase !== 'pick' || this.locked || voiceBus.busy) {
      this.pendingTile = spot;
      return;
    }
    this.pendingTile = null;
    if (LETTER_BY_CHAR[t.letter]) void voiceBus.say(letterSoundLine(t.letter));
  }

  protected choose(spot: Spot): void {
    if (this.phase !== 'pick') return;
    const tile = spot.obj.getData('tile') as MachineTile | undefined;
    if (!tile) return;
    void this.slotIn(spot, tile);
  }

  /**
   * A tile into the slot: it flies up, then the machine says the two parts
   * apart (the onset lit, then the rime lit), then judges.
   */
  private async slotIn(spot: Spot, tile: MachineTile): Promise<void> {
    this.phase = 'check';
    this.locked = true;
    this.slotted = tile;
    voiceBus.hush();
    sfxSelect();
    spot.enabled = false;
    spot.obj.setAlpha(0.35);
    const to = this.slotPos();
    const flyer = this.add.text(spot.x, spot.y - 62, tile.letter.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '64px', color: INK }).setOrigin(0.5).setDepth(DEPTH.sparkles);
    await new Promise<void>((resolve) => this.tweens.add({ targets: flyer, x: to.x, y: to.y, duration: 420, ease: 'Cubic.easeInOut', onComplete: () => resolve() }));
    flyer.destroy();
    this.drawSlot(true);
    this.onsetText.setText(tile.letter.toUpperCase());
    this.layoutPanel();
    popIn(this, this.onsetText, 1);
    squash(this, this.machine, this.machine.scaleX, this.machine.scaleY, 0.08);
    sfxBoing();

    await this.sayParts(tile.letter, this.current.rime);
    if (tile.makes === this.current.word) await this.built(spot);
    else await this.silly(spot, tile);
  }

  /**
   * The onset's sound, a beat, the rime: each lit as it is said, never
   * blended. In the hint the slot is still empty, so the slot itself lights
   * (its letter is the answer, never printed before she finds it).
   */
  private async sayParts(letter: string, rime: string): Promise<void> {
    const empty = !this.onsetText.text;
    if (empty) this.drawSlot(false, true);
    else {
      this.onsetText.setColor(LIT);
      this.tweens.add({ targets: this.onsetText, scale: 1.3, duration: 140, yoyo: true });
    }
    if (LETTER_BY_CHAR[letter]) await this.say(letterSoundLine(letter));
    await this.wait(PART_GAP_MS);
    if (empty) this.drawSlot(false);
    this.onsetText.setColor(INK);
    this.rimeText.setColor(LIT);
    this.tweens.add({ targets: this.rimeText, scale: 1.2, duration: 140, yoyo: true });
    await this.say(rimeLine(rime));
    await this.wait(PART_GAP_MS);
    this.rimeText.setColor(INK);
  }

  /** A silly word: the machine giggles, the tile pops back onto the floor, try again. */
  private async silly(spot: Spot, tile: MachineTile): Promise<void> {
    this.wrongTries++;
    this.keepMisses(this.missWord, this.wrongTries);
    this.giggle(this.panel, this.panel.x, this.panel.y - 70, this.wrongTries - 1, MACHINE_GIGGLES);
    // The whole silly word, lit, said: it is not the word she is making.
    this.onsetText.setColor(LIT);
    this.rimeText.setColor(LIT);
    // A beat for the giggle before the line (hunt 11).
    await this.wait(GIGGLE_BEAT_MS);
    await this.speak(narratorLine(narrator(), 'machine_makes'), sillyLine(tile.makes), narratorLine(narrator(), variant('machine_silly')));
    // Out it pops, back to its place on the floor.
    this.onsetText.setText('').setColor(INK);
    this.rimeText.setColor(INK);
    this.layoutPanel();
    this.drawSlot(false);
    sfxPoof();
    burst(this, this.slotPos().x, this.slotPos().y, { count: 16, speed: 200 });
    spot.obj.setAlpha(1);
    spot.enabled = true;
    popIn(this, spot.obj, 1);
    this.slotted = null;
    this.phase = 'pick';
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /** The picture's word: payoff, the word said for the first time, into the bag. */
  private async built(spot: Spot): Promise<void> {
    const r = this.current;
    const last = this.index === this.plan.rounds.length - 1;
    const firstTry = this.wrongTries === 0;
    // The slot is done with the last word.
    this.recordRead(r.word, firstTry, this.wrongTries, { last });
    progress.record('rimes', r.rime, firstTry, this.wrongTries);
    progress.record('onsets', r.onset, firstTry, this.wrongTries);
    for (const s of this.spots) s.enabled = false;
    // Hunt 10: the answer's sparkle (after two silly tiles) stops once it is in, as the bridge's and the Shifter's do.
    this.stopSparkle(spot);
    this.phase = last ? 'done' : 'check';

    // The payoff: the machine bounces and puffs, the window bursts.
    const win = this.onMachine(WINDOW.x, WINDOW.y);
    sfxRight();
    sfxSummon();
    const top = this.onMachine(0.5, 0.05);
    burst(this, top.x, top.y, { count: 40, speed: 300, colors: [0xffffff, 0xffd23f, 0xff9ad5] });
    burst(this, win.x, win.y, { count: 60, speed: 480 });
    shockwave(this, win.x, win.y, 0xffd23f, 180);
    const sx = this.machine.scaleX;
    const sy = this.machine.scaleY;
    this.tweens.add({ targets: this.machine, scaleX: sx * 1.06, scaleY: sy * 0.94, duration: 120, yoyo: true, repeat: 2 });
    floatText(this, win.x, win.y - 120, firstTry ? 'WOW!' : 'YES!', '#ffd23f');
    this.onsetText.setColor(LIT);
    this.rimeText.setColor(LIT);
    await this.wait(300);
    // Only now is the word said.
    await this.say(wordLine(r.word));
    this.onsetText.setColor(INK);
    this.rimeText.setColor(INK);

    // Into the bag: each word she makes is a battle item (not MOM or DAD, hunt 10, M45: the picture just goes).
    const pic = this.picture;
    this.picture = null;
    pic?.destroy();
    await Promise.all([this.bagCopy(r.word) ? this.guard(this.bag.receive(this.wordArt(r.word), win.x, win.y)) : Promise.resolve(), this.say(narratorLine(narrator(), readPraise(firstTry)))]);
    spot.obj.setAlpha(1);
    if (!last) {
      this.index++;
      await this.startRound();
      return;
    }
    this.locked = true;
    await this.say(narratorLine(narrator(), 'machine_done'));
    await this.wait(400);
    this.fadeToHub();
  }

  /**
   * Free play (item 060): while a round is introduced (once she is walking)
   * and when the last word is built; never while a tile choice is open or
   * being checked.
   */
  protected override playOpen(): boolean {
    return (this.phase === 'intro' || this.phase === 'done') && this.walking;
  }

  /** Yellow says the word's parts again only while she picks. */
  protected override hasHint(): boolean {
    return this.phase === 'pick';
  }

  /** Yellow: the picture's word in parts, the onset's sound then the rime, never blended. Idle: the instruction first. */
  protected override hint(idle = false): void {
    if (this.phase !== 'pick') return;
    const r = this.current;
    void (async () => {
      this.locked = true;
      if (idle) await this.narrate('machine_go');
      this.locked = true;
      await this.sayParts(r.onset, r.rime);
      if (this.phase === 'pick') this.locked = false;
    })();
  }

  /**
   * An instruction unlocks input when it ends, but once the last word is
   * built the room stays locked (the F4 path's hushed lines end late).
   */
  protected override async narrate(...keys: string[]): Promise<void> {
    await super.narrate(...keys);
    if (this.phase === 'done' || this.phase === 'check') this.locked = true;
  }

  protected override async speak(...ids: string[]): Promise<void> {
    await super.speak(...ids);
    if (this.phase === 'done') this.locked = true;
  }

  protected override extraHooks(): Partial<RoomInfo> {
    const r = this.current;
    return {
      machine: {
        mode: this.plan.mode,
        index: this.index,
        rounds: this.plan.rounds.map((x) => x.word),
        word: r.word,
        rime: r.rime,
        family: FAMILY_BY_RIME[r.rime]?.words ?? [],
        tiles: r.tiles.map((t) => ({ ...t })),
        phase: this.phase,
        slotted: this.slotted?.letter ?? null,
        misses: this.wrongTries,
      },
    };
  }
}
