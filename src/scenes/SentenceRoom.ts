/**
 * The sentence game: a side room off the hub with one sentence on a banner
 * and three things standing on pedestals. She reads the sentence, then walks
 * to the thing its last word names and presses green; it flies into her bag.
 *
 *   EVILRILLA IS SCARED OF MICE        (mice, a hen, a jet on pedestals)
 *
 * Three passes, all no-fail:
 *
 * - `listen` (skipped once the frame is solid): the sentence is read to her
 *   up to the key word, each banner word lighting as it is spoken. At the key
 *   word the voice stops and the word pulses in silence: that one is hers.
 * - `read`: her turn. Each green press lights the next word and says it (a
 *   grown-up reads along with her); the first press lights the first word.
 *   Yellow says the lit word. When the light reaches the key word (silent),
 *   the pass becomes...
 * - `find`: the pedestals wake up and she walks to the answer. Yellow sounds
 *   out the key word's letters one at a time, never blended (a non-decodable
 *   word like MICE gives only its first sound).
 *
 * The key word is never spoken until she has answered: the prefix line stops
 * before it, and its own `word_<key>` line plays only as confirmation, after
 * the whole sentence is read back to her.
 */

import Phaser from 'phaser';

import { tokenWord } from '../../content/phonics/sentences';
import { LETTER_BY_CHAR } from '../../content/phonics/letters';
import { WORD_BY_ID, pictureFor } from '../../content/phonics/words';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxRight, sfxStep, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../config';
import { backToHub, episode, narrator, planFor, villainSpec, type Slot, type Step } from '../episode/Episode';
import { bob, burst, fitImage, floatText, popIn, shockwave } from '../fx/juice';
import { frameIsSolid, type RoomPlan } from '../rules/sentences';
import { progress } from '../state/progress';
import type { RoomInfo } from '../testHooks';
import { Bag } from '../ui/Bag';
import { makeButtonDot } from '../ui/ButtonDot';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { Minigame } from './minigames/Minigame';

type Pass = 'listen' | 'read' | 'find' | 'done';

const FONT = '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif';
const INK = '#1a1030';
const LIT = '#ff3d7a';
const BANNER_W = 1040;
const BANNER_Y = 120;
/** The silent beat on the key word at the end of the listening pass. */
const KEY_BEAT_MS = 1200;
/** A moment to look round a room she has just walked into, before anyone talks. */
const ARRIVE_MS = 800;
/** How big the lit word grows (the layout leaves room for it). */
const LIT_SCALE = 1.08;
/** The pause after each letter sound, so the sounds never run together. */
const LETTER_GAP_MS = 450;

/** A stable scatter seed per side room (FNV-1a of its id). */
function roomSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

export class SentenceRoom extends Minigame {
  private slot: Slot = 'a';
  private plan!: RoomPlan;
  private pass: Pass = 'listen';
  private skipped = false;
  /** The highlighted token, or -1. */
  private index = -1;
  /** One container per token, centred on the word, so it can pulse in place. */
  private tokenBoxes: Phaser.GameObjects.Container[] = [];
  /** Each token's Text objects: one for a frame word, one per letter for the key word. */
  private tokenTexts: Phaser.GameObjects.Text[][] = [];
  /** While a line plays, the banner follows it: line id and how many tokens it covers. */
  private karaoke: { id: string; n: number } | null = null;
  private bag!: Bag;
  private banner!: Phaser.GameObjects.Container;
  /** In `read`, a green dot under the lit word: that light is hers to move. */
  private readDot!: Phaser.GameObjects.Container;

  constructor() {
    super('SentenceRoom');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    this.slot = data.slot ?? 'a';
    this.plan = planFor(this.slot);
    this.pass = 'listen';
    this.skipped = false;
    this.index = -1;
    this.karaoke = null;
    this.wrongTries = 0;
  }

  /** F9 to the parent page and back reopens this same room. */
  protected override sceneData(): object {
    return { step: this.step, slot: this.slot };
  }

  private get keyIndex(): number {
    return this.plan.sentence.tokens.length - 1;
  }

  protected background(): string {
    return `room_side_${this.plan.room}`;
  }

  protected build(): void {
    const s = this.plan.sentence;
    this.round = `sentence:${this.slot}:${s.key}`;
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 240);
    // Each room its own stable mess; calm, because she is reading in here.
    applyHouseMood(this, episode.villain, { seed: roomSeed(this.plan.room), floor: this.floor, calm: true });
    this.bag = new Bag(this);
    const room = SIDE_ROOM_BY_ID[this.plan.room]!;
    this.player.place(room.entry.x, Math.min(room.entry.y, this.floor.bottom - 10));
    // Arriving: a hop and a puff where she comes in.
    this.player.hop();
    burst(this, this.player.x, this.player.y - 40, { count: 16, speed: 220 });
    sfxWhoosh();
    // Nothing to walk to until the pedestals wake: no stick hint before then.
    this.walking = false;
    // Decode the sentence's lines now, so the banner lights the moment they start.
    void voiceBank.ensure(s.prefixLine);
    void voiceBank.ensure(wordLine(s.key));

    this.makeBanner();
    this.readDot = makeButtonDot(this, 0, 0, 'green', 16).setDepth(DEPTH.hud).setVisible(false);

    // The three objects, asleep until the read-along reaches the key word.
    this.plan.objects.forEach((word, i) => {
      const [x, y] = room.spots[i]!;
      const w = WORD_BY_ID[word];
      const pedestal = this.art('prop_pedestal', 170, 100);
      const pic = this.art(w ? pictureFor(w) : `pic_${word}`, 150, 150, 0, -100);
      const spot = this.addSpot(word, x, y, [pedestal, pic], word === s.key);
      spot.obj.setData('pic', pic);
      spot.enabled = false;
      spot.obj.setAlpha(0.75);
      bob(this, pic, 5, 900 + i * 120);
      popIn(this, spot.obj, 1, 200 + i * 120);
    });

    void this.flow();
  }

  /** The banner: each token its own word, upper case, key word last and split into letters. */
  private makeBanner(): void {
    const tokens = this.plan.sentence.tokens;
    const bg = this.add.image(0, 0, 'prop_banner').setDisplaySize(BANNER_W, 140);
    let size = 76;
    const measure = (sz: number) => {
      const style = { fontFamily: FONT, fontSize: `${sz}px`, color: INK };
      const probe = this.add.text(0, 0, tokens.join(' '), style);
      const w = probe.width;
      probe.destroy();
      return w;
    };
    // Fit inside the cream panel (about 82% of the banner art), with room for the lit word to grow.
    while (size > 40 && measure(size) * 1.1 > BANNER_W * 0.82) size -= 4;
    const style = { fontFamily: FONT, fontSize: `${size}px`, color: INK };
    const gap = size * 0.4;

    this.tokenBoxes = [];
    this.tokenTexts = [];
    const widths: number[] = [];
    tokens.forEach((token, i) => {
      const texts: Phaser.GameObjects.Text[] = [];
      if (i === this.keyIndex) {
        // Letter by letter, so the hint can light each one.
        const letters = [...token].map((ch) => this.add.text(0, 0, ch, style).setOrigin(0.5));
        const total = letters.reduce((n, t) => n + t.width, 0);
        let x = -total / 2;
        for (const t of letters) {
          t.setX(x + t.width / 2);
          x += t.width;
          texts.push(t);
        }
        widths.push(total);
      } else {
        const t = this.add.text(0, 0, token, style).setOrigin(0.5);
        texts.push(t);
        widths.push(t.width);
      }
      this.tokenTexts.push(texts);
      this.tokenBoxes.push(this.add.container(0, 0, texts));
    });
    // Each gap leaves room for either neighbour to grow when lit, so words never touch.
    const gapAfter = (i: number) => gap + (LIT_SCALE - 1) * Math.max(widths[i]!, widths[i + 1]!);
    let total = widths.reduce((n, w) => n + w, 0);
    for (let i = 0; i < widths.length - 1; i++) total += gapAfter(i);
    let x = -total / 2;
    this.tokenBoxes.forEach((box, i) => {
      box.setX(x + widths[i]! / 2);
      x += widths[i]! + (i < widths.length - 1 ? gapAfter(i) : 0);
    });
    this.banner = this.add.container(GAME_WIDTH / 2, BANNER_Y, [bg, ...this.tokenBoxes]).setDepth(DEPTH.hud - 1);
    popIn(this, this.banner, 1);
  }

  /** Light one token (or none, with -1). */
  private light(i: number): void {
    if (i === this.index) return;
    this.index = i;
    this.tokenBoxes.forEach((box, k) => {
      const on = k === i;
      for (const t of this.tokenTexts[k]!) t.setColor(on ? LIT : INK);
      this.tweens.killTweensOf(box);
      this.tweens.add({ targets: box, scale: on ? LIT_SCALE : 1, duration: 120, ease: on ? 'Back.easeOut' : 'Sine.easeOut' });
    });
  }

  /** The green dot sits under the lit word while she reads (the first word before any is lit), bobbing; hidden otherwise. */
  private placeReadDot(time: number): void {
    const box = this.tokenBoxes[Math.max(0, this.index)];
    const show = this.pass === 'read' && !this.locked && !!box;
    this.readDot.setVisible(show);
    if (show) this.readDot.setPosition(this.banner.x + box.x, BANNER_Y + 82 + Math.sin(time / 180) * 4);
  }

  /** Say a line with the banner following it, word by word, over the first `n` tokens. */
  private async readAlong(id: string, n: number): Promise<void> {
    this.karaoke = { id, n };
    await this.say(id);
    this.karaoke = null;
  }

  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    this.followVoice();
    this.placeReadDot(time);
  }

  /**
   * Karaoke: which banner word the voice is on. The prefix line has one timed
   * word per token before the key word; if its timings do not line up with
   * the tokens (a recording, a name said as two words), spread them evenly.
   */
  private followVoice(): void {
    const k = this.karaoke;
    const u = voiceBus.speaking;
    // While a line is still decoding, VoiceBus holds a bare `{ id }` claim
    // with no clock yet: wait for the real utterance.
    if (!k || !u || u.id !== k.id || typeof u.time !== 'function') return;
    const words = u.line?.words ?? [];
    const t = u.time();
    let i = 0;
    if (words.length === k.n) {
      words.forEach((w, j) => {
        if (t >= w.start) i = j;
      });
    } else i = Math.min(k.n - 1, Math.floor(t / (Math.max(0.1, u.duration) / k.n)));
    this.light(i);
  }

  private async flow(): Promise<void> {
    const s = this.plan.sentence;
    this.skipped = frameIsSolid(progress, s.frame);
    // She has just walked in: let her see the room before the first instruction.
    await this.wait(ARRIVE_MS);
    if (this.pass !== 'listen') return; // F4 jumped ahead meanwhile
    if (!this.skipped) {
      this.pass = 'listen';
      await this.narrate('room_listen');
      if (this.pass !== 'listen') return;
      this.locked = true;
      await this.readAlong(s.prefixLine, this.keyIndex);
      if (this.pass !== 'listen') return;
      // The voice stops; the key word pulses in silence. That one is hers.
      this.light(this.keyIndex);
      const box = this.tokenBoxes[this.keyIndex]!;
      this.tweens.killTweensOf(box);
      this.tweens.add({ targets: box, scale: 1.3, duration: 200, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      await this.wait(KEY_BEAT_MS);
      if (this.pass !== 'listen') return;
    }
    this.pass = 'read';
    this.light(-1);
    await this.narrate('room_your_turn');
  }

  /** The light has reached the key word: wake the pedestals. */
  private async startFind(narrate = true): Promise<void> {
    this.pass = 'find';
    this.walking = true;
    this.light(this.keyIndex);
    for (const spot of this.spots) {
      spot.enabled = true;
      this.tweens.add({ targets: spot.obj, alpha: 1, duration: 250 });
    }
    if (narrate) await this.narrate('room_find');
  }

  /**
   * In `read`, green lights the next word and says it (input waits for the
   * word, so the voice and the light stay together); the key word lights in
   * silence and wakes the pedestals. Everywhere but `find` green is consumed.
   */
  protected override onGreen(): boolean {
    if (this.pass === 'find') return false;
    if (this.pass !== 'read') return true;
    const next = this.index + 1;
    sfxStep(next);
    if (next >= this.keyIndex) void this.startFind();
    else {
      this.light(next);
      const token = this.plan.sentence.tokens[next];
      if (token) void this.speak(wordLine(tokenWord(token)));
    }
    // Every press answered on the word itself: a little puff on the newly lit word.
    const box = this.tokenBoxes[Math.min(next, this.keyIndex)]!;
    burst(this, this.banner.x + box.x, BANNER_Y, { count: 12, speed: 200 });
    return true;
  }

  protected override hint(idle = false): void {
    if (this.pass === 'read') {
      if (idle) {
        void this.narrate('room_your_turn');
        return;
      }
      const token = this.plan.sentence.tokens[this.index];
      if (token) void this.speak(wordLine(tokenWord(token)));
      else void this.narrate('room_your_turn');
      return;
    }
    if (this.pass !== 'find') return;
    if (idle) {
      // Stuck: the instruction again, then help with the word itself.
      void this.narrate('room_find').then(() => this.soundOut());
      return;
    }
    void this.soundOut();
  }

  /** A miss: the usual giggle, then the key word's letters sounded out (the sparkle still comes on the second). */
  protected override async wrong(obj: Phaser.GameObjects.Container): Promise<void> {
    await super.wrong(obj);
    await this.soundOut();
  }

  /** The key word's letters, one sound at a time, never blended. Only while she is finding it. */
  private async soundOut(): Promise<void> {
    if (this.pass !== 'find') return;
    const key = this.plan.sentence.key;
    this.locked = true;
    const letters = this.tokenTexts[this.keyIndex]!;
    // A word that does not sound out (MICE) gets just its first sound.
    const n = WORD_BY_ID[key]?.decodable === false ? 1 : letters.length;
    for (let i = 0; i < n && this.pass === 'find'; i++) {
      const t = letters[i]!;
      const ch = key[i]!;
      for (const other of letters) other.setColor(INK);
      t.setColor(LIT);
      this.tweens.add({ targets: t, scale: 1.35, duration: 140, yoyo: true });
      if (LETTER_BY_CHAR[ch]) await this.say(letterSoundLine(ch));
      // A beat on each letter, still lit, so the sounds stay apart.
      await this.wait(LETTER_GAP_MS);
    }
    for (const t of letters) t.setColor(LIT);
    await this.wait(300);
    if (this.pass === 'find') this.locked = false;
  }

  /**
   * An instruction unlocks input when it ends, but once the answer is found
   * the room stays locked: on the F4 path the hushed narrate()/speak() ends
   * after found() has begun and would otherwise unlock mid-celebration.
   */
  protected override async narrate(...keys: string[]): Promise<void> {
    await super.narrate(...keys);
    if (this.pass === 'done') this.locked = true;
  }

  protected override async speak(...ids: string[]): Promise<void> {
    await super.speak(...ids);
    if (this.pass === 'done') this.locked = true;
  }

  /** Dev F4: jump straight to `find` (no lines) and hand back the right object. */
  protected override correctSpot(): Spot | undefined {
    if (this.pass === 'listen' || this.pass === 'read') {
      voiceBus.hush();
      this.karaoke = null;
      void this.startFind(false);
      this.locked = false;
    }
    return super.correctSpot();
  }

  protected choose(spot: Spot): void {
    if (this.pass !== 'find') return;
    if (!spot.correct) {
      void this.wrong(spot.obj);
      return;
    }
    void this.found(spot);
  }

  /** The right object: the sentence read back whole, then it flies into her bag. */
  private async found(spot: Spot): Promise<void> {
    const s = this.plan.sentence;
    this.pass = 'done';
    this.locked = true;
    for (const sp of this.spots) sp.enabled = false;
    const firstTry = this.wrongTries === 0;
    progress.record('words', s.key, firstTry, this.wrongTries);
    progress.record('frames', s.frame, firstTry, this.wrongTries);
    if (!episode.read.includes(s.key)) episode.read.push(s.key);
    // The episode learns the result now, so a skip mid-celebration loses nothing.
    const counter = this.slot === 'counter';
    if (counter) episode.made.item = true;
    else episode.fetched.push(s.key);
    if (!episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);

    const picY = spot.y - 175;
    sfxRight();
    burst(this, spot.x, picY, { count: 50, speed: 450 });
    shockwave(this, spot.x, picY, 0xff7ad9, 140);
    floatText(this, spot.x, picY - 90, firstTry ? 'WOW!' : 'YES!', '#ffd23f');

    // The whole sentence, read back to her, and only now the key word.
    await this.wait(300);
    this.light(-1);
    await this.readAlong(s.prefixLine, this.keyIndex);
    this.light(this.keyIndex);
    await this.say(wordLine(s.key));

    // Into the bag it goes.
    const pic = spot.obj.getData('pic') as Phaser.GameObjects.Image | undefined;
    if (counter) {
      // What she picked becomes the counter item: it swells and fades as the item pops out of it.
      const villain = villainSpec();
      const art = `item_${villain.counter.id}`;
      sfxSummon();
      if (pic) {
        this.tweens.killTweensOf(pic);
        this.tweens.add({ targets: pic, scale: pic.scale * 1.5, alpha: 0, duration: 380, ease: 'Quad.easeOut' });
      }
      const big = fitImage(this.add.image(spot.x, picY, art), 200, 200).setDepth(DEPTH.sparkles);
      popIn(this, big, big.scale);
      shockwave(this, spot.x, picY, 0xffd23f, 220);
      burst(this, spot.x, picY, { count: 80, speed: 600, life: 1000 });
      await this.wait(900);
      big.destroy();
      await Promise.all([this.guard(this.bag.receive(art, spot.x, picY)), this.say(narratorLine(narrator(), `got_counter_${villain.id}`))]);
    } else {
      pic?.setVisible(false);
      const w = WORD_BY_ID[s.key];
      const art = w ? pictureFor(w) : `pic_${s.key}`;
      await Promise.all([this.guard(this.bag.receive(art, spot.x, picY)), this.say(narratorLine(narrator(), 'got_item'))]);
    }
    await this.wait(400);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, () => backToHub(this, this.slot));
  }

  protected override extraHooks(): Partial<RoomInfo> {
    const s = this.plan.sentence;
    return { sentence: { tokens: [...s.tokens], key: s.key, frame: s.frame, pass: this.pass, index: this.index, skipped: this.skipped } };
  }
}
