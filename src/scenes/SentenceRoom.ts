/**
 * The sentence game: a side room off the hub with one sentence on a banner
 * and three things standing on pedestals. She reads the sentence, then walks
 * to the thing its last word names and presses green; it flies into her bag.
 *
 *   RILLA IS SCARED OF MICE            (mice, a hen, a jet on pedestals)
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
 *   out the key word one sound at a time, never blended (SH of SHIP is one
 *   sound; a non-decodable word like MICE gives only its first sound).
 *
 * The key word is never spoken until she has answered: the prefix line stops
 * before it, and its own `word_<key>` line plays only as confirmation, after
 * the whole sentence is read back to her.
 */

import Phaser from 'phaser';

import { BANK_BY_WORD, unitsOf } from '../../content/phonics/bank';
import { tokenWord } from '../../content/phonics/sentences';
import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import { WORD_BY_ID, pictureFor } from '../../content/phonics/words';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { letterSoundLine, narratorLine, villainKey, wordLine } from '../../content/voice/ids';
import { voiceBus, type Utterance } from '../audio/VoiceBus';
import { sfxRight, sfxStep, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_WIDTH, REACH } from '../config';
import { backToHub, castFace, counterArt, episode, namedCounter, narrator, planFor, villainSpec, type Slot, type Step } from '../episode/Episode';
import { bob, burst, fitImage, floatText, popIn, shockwave } from '../fx/juice';
import { asSentence, skipsListening, type SentencePlan } from '../rules/sentences';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import { makeButtonDot } from '../ui/ButtonDot';
import type { CaptionMode, KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, INK, LIT, SideRoom } from '../world/SideRoom';

type Pass = 'listen' | 'read' | 'find' | 'done';

const BANNER_W = 1040;
/** The banner's word size once a sentence takes two rows (item 043, M4): two rows at this before one smaller row. */
const TWO_ROWS_PX = 56;
const BANNER_Y = 120;
/** A banner of two or more rows: its top edge, and how much of its height the rows fill. */
const TALL_BANNER_TOP = 6;
const MULTI_ROW_FILL = 0.56;
/** The picture on its pedestal: how high above the spot its top is (pedestal 100 + picture 150), and its bob. */
const PIC_TOP = 250;
const PIC_BOB = 5;
/** How much the thing she stands next to grows (RoomScene's near tween). */
const NEAR_SCALE = 1.1;
/** Clear air between the banner's bottom edge and the tallest picture's top. */
const BANNER_GAP = 10;
/** The silent beat on the key word at the end of the listening pass. */
const KEY_BEAT_MS = 1200;
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

export class SentenceRoom extends SideRoom {
  /** The banner is in keepOut() below, and key words are never names: the box places itself and names its speaker. */
  protected override dialogueAware = true;
  private slot: Slot = 'a';
  private plan!: SentencePlan;
  private pass: Pass = 'listen';
  private skipped = false;
  /** The highlighted token, or -1. */
  private index = -1;
  /** One container per token, centred on the word, so it can pulse in place. */
  private tokenBoxes: Phaser.GameObjects.Container[] = [];
  /** The banner's height: 140 for one row, taller when the sentence wraps. */
  private bannerH = 140;
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
    this.plan = asSentence(planFor(this.slot));
    this.pass = 'listen';
    this.skipped = false;
    this.index = -1;
    this.karaoke = null;
    // Back from the parent page (F9) after a miss: still a miss.
    this.wrongTries = episode.house.misses?.[this.missKey] ?? 0;
  }

  private get missKey(): string {
    return `${this.slot}:${this.plan.sentence.key}`;
  }

  /** F9 to the parent page and back reopens this same room. */
  protected override sceneData(): object {
    return { step: this.step, slot: this.slot };
  }

  /**
   * The banner is the highlighter here: the words it lights (the prefix line,
   * each word on her turn, the key word's sounds) show only the reader's face,
   * never a second copy of the words in the box.
   */
  /** The attic's find line takes the narrow box (item 071, M13): its two-row banner holds the top, and the full-width box at the bottom covered her. */
  protected override narrowLine(u: Utterance): boolean {
    return this.slot === 'counter' && u.id === narratorLine(narrator(), 'room_find');
  }

  protected override captionMode(u: Utterance): CaptionMode | undefined {
    return u.id.startsWith('sent_') || u.id.startsWith('word_') || u.id.startsWith('letter_') ? 'portrait' : undefined;
  }

  /** The banner is what she reads: the box keeps off it above all. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    if (this.banner?.active) {
      const b = this.banner.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 6 });
    }
    return out;
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
    this.readDot = makeButtonDot(this, 0, 0, 'green', 16).setDepth(DEPTH.hud).setVisible(false);
    // Back from the parent page (F9) after she found it, mid-celebration: the
    // room is done, so straight back to the hub (item 039: it replayed, and a
    // second find fetched and recorded the word twice). No banner: the last
    // run's boxes are gone with it.
    if (episode.house.done.includes(this.slot)) {
      this.tokenBoxes = [];
      this.locked = true;
      this.time.delayedCall(600, () => backToHub(this, this.slot));
      return;
    }
    const room = SIDE_ROOM_BY_ID[this.plan.room]!;
    this.makeBanner();
    // The pictures stand clear of the banner (item 059): a tall banner (a long
    // sentence on two or three rows) moves them down the floor, never over them.
    const bannerBottom = this.banner.y + this.bannerH / 2;
    const highest = Math.min(...room.spots.slice(0, this.plan.objects.length).map(([, y]) => y));
    // The thing she is next to grows by NEAR_SCALE from its feet (RoomScene), so its top rises too.
    const drop = Math.max(0, Math.ceil(bannerBottom + BANNER_GAP - (highest - PIC_TOP * NEAR_SCALE - PIC_BOB)));
    // She comes in below them, out of reach, so she is not standing on one when they wake (item 069:
    // under a two-row banner she came in 70 px under the middle one and a mashed green chose it).
    const spots = room.spots.slice(0, this.plan.objects.length).map(([x, y]) => ({ x, y: y + drop }));
    // Not lower down instead: the bottom dialogue box ("Now find it") would cover her, the cursor.
    const y = Math.min(Math.max(room.entry.y, highest + drop + 70), this.floor.bottom - 10);
    const inReach = (x: number) => spots.some((sp) => Math.hypot(sp.x - x, sp.y - y) <= REACH);
    // In reach of the middle one: between the first two instead.
    const x = !inReach(room.entry.x) || spots.length < 2 ? room.entry.x : (spots[0]!.x + spots[1]!.x) / 2;
    this.player.place(x, y);
    // Arriving: a hop and a puff where she comes in.
    this.player.hop();
    burst(this, this.player.x, this.player.y - 40, { count: 16, speed: 220 });
    sfxWhoosh();
    // Nothing to walk to until the pedestals wake: no stick hint before then.
    this.walking = false;
    // Decode the sentence's lines now, so the banner lights the moment they start.
    void voiceBank.ensure(s.prefixLine);
    void voiceBank.ensure(wordLine(s.key));

    // The three objects, asleep until the read-along reaches the key word.
    this.plan.objects.forEach((word, i) => {
      const [x, y0] = room.spots[i]!;
      const y = y0 + drop;
      const w = WORD_BY_ID[word];
      const pedestal = this.art('prop_pedestal', 170, 100);
      const pic = this.art(w ? pictureFor(w, castFace) : `pic_${word}`, 150, 150, 0, -100);
      const spot = this.addSpot(word, x, y, [pedestal, pic], word === s.key);
      spot.obj.setData('pic', pic);
      // What must stay in view is the picture; the pedestal's foot may sit behind the dialogue box.
      spot.obj.data.remove('qaTarget');
      pic.setData('qaTarget', word);
      spot.enabled = false;
      spot.obj.setAlpha(0.75);
      bob(this, pic, 5, 900 + i * 120);
      popIn(this, spot.obj, 1, 200 + i * 120);
    });

    void this.flow();
  }

  /**
   * The banner: each token its own word, upper case, key word last and split
   * into letters. One row when it fits (shrinking to 40 px first); otherwise
   * the words wrap onto more rows, between words only, and the banner grows.
   */
  private makeBanner(): void {
    const tokens = this.plan.sentence.tokens;
    const room = BANNER_W * 0.82;
    let size = 76;
    let style = { fontFamily: FONT_COMIC, fontSize: `${size}px`, color: INK };
    let widths: number[] = [];
    this.tokenBoxes = [];
    const build = () => {
      for (const box of this.tokenBoxes) box.destroy();
      this.tokenBoxes = [];
      this.tokenTexts = [];
      widths = [];
      style = { fontFamily: FONT_COMIC, fontSize: `${size}px`, color: INK };
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
    };
    // Each gap leaves room for either neighbour to grow when lit, so words never touch.
    const gapBetween = (i: number, j: number) => size * 0.4 + (LIT_SCALE - 1) * Math.max(widths[i]!, widths[j]!);
    /** Token indices per row, greedy, every row within `room` if it can be. */
    const rowsOf = (): number[][] => {
      const rows: number[][] = [[]];
      let x = 0;
      widths.forEach((w, i) => {
        const row = rows[rows.length - 1]!;
        const prev = row[row.length - 1];
        const add = prev === undefined ? w : gapBetween(prev, i) + w;
        if (prev !== undefined && (x + add) * 1.1 > room) {
          rows.push([i]);
          x = w;
        } else {
          row.push(i);
          x += add;
        }
      });
      return rows;
    };
    const rowWidth = (row: number[]) => row.reduce((n, i, k) => n + widths[i]! + (k ? gapBetween(row[k - 1]!, i) : 0), 0);
    /**
     * Two rows split where they come out most even, not greedily (item 039:
     * greedy left the key word alone on the second row, SMAUG IS NO MATCH FOR
     * THE / BUN). Any other count stays greedy.
     */
    const balanced = (greedy: number[][]): number[][] => {
      if (greedy.length !== 2) return greedy;
      const all = widths.map((_, i) => i);
      let best = greedy;
      let bestW = Math.max(...greedy.map(rowWidth));
      for (let k = 1; k < all.length; k++) {
        const split = [all.slice(0, k), all.slice(k)];
        const w = Math.max(...split.map(rowWidth));
        if (w * 1.1 <= room && w < bestW) {
          best = split;
          bestW = w;
        }
      }
      return best;
    };
    let rows: number[][];
    for (;;) {
      build();
      rows = balanced(rowsOf());
      const fits = rows.every((r) => rowWidth(r) * 1.1 <= room);
      // One row while it fits at 60 px or more; then two rows at 56 px before
      // one smaller row (item 043, M4: the long counter sentences read at about
      // half size on one row); past 40 px, more rows are better than smaller words.
      if ((rows.length === 1 && fits) || (size <= TWO_ROWS_PX && fits && rows.length <= 2) || (size <= 40 && fits && rows.length <= 3) || size <= 20) break;
      size -= 4;
    }
    const lineH = size * 1.2;
    // The panel (cream and its red edges) is about the middle half of the
    // banner art, a little below its centre (the pole and cords are above): a
    // wrapped sentence gets a taller banner, with its rows centred on the
    // panel. No taller than that (item 059: at 0.44 a two-row banner was 305
    // px and hung over the tops of the pictures she chooses between).
    this.bannerH = rows.length > 1 ? Math.max(140, (rows.length * lineH) / MULTI_ROW_FILL) : 140;
    // The cream panel's middle sits about 0.077 of the height below the art's (item 059 review: at 0.03 the rows ran off it).
    const panelY = rows.length > 1 ? this.bannerH * 0.077 : 0;
    rows.forEach((row, r) => {
      let x = -rowWidth(row) / 2;
      const y = panelY + (r - (rows.length - 1) / 2) * lineH;
      row.forEach((i, k) => {
        if (k) x += gapBetween(row[k - 1]!, i);
        this.tokenBoxes[i]!.setPosition(x + widths[i]! / 2, y);
        x += widths[i]!;
      });
    });
    const bg = this.add.image(0, 0, 'prop_banner').setDisplaySize(BANNER_W, this.bannerH);
    // One row hangs at BANNER_Y; a taller banner goes up to the top of the screen (its pole is all that is up there).
    const y = rows.length > 1 ? TALL_BANNER_TOP + this.bannerH / 2 : BANNER_Y;
    this.banner = this.add.container(GAME_WIDTH / 2, y, [bg, ...this.tokenBoxes]).setDepth(DEPTH.hud - 1);
    // A cover for the bug-hunt checker's probe: it must never hang over a picture (item 059).
    this.banner.setData('qaCover', 'banner');
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
    if (show) this.readDot.setPosition(this.banner.x + box.x, this.banner.y + this.bannerH / 2 + 12 + Math.sin(time / 180) * 4);
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
    this.skipped = skipsListening(progress, s.frame);
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
    // Two misses kept across F9 keep their sparkle too (item 069: it came back only on a third miss).
    if (this.wrongTries >= 2) this.sparkleAnswer();
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
    burst(this, this.banner.x + box.x, this.banner.y + box.y, { count: 12, speed: 200 });
    return true;
  }

  /** Free play (item 060): only once the key word is found; listening, reading along and finding are all answers. */
  protected override playOpen(): boolean {
    return this.pass === 'done' && this.walking;
  }

  /** Yellow says something again only on her read-along and while she finds the key word. */
  protected override hasHint(): boolean {
    return this.pass === 'read' || this.pass === 'find';
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

  /**
   * The key word's sounds, one at a time, never blended. Only while she is
   * finding it. A digraph is one sound (SHIP is SH, I, P: `unitsOf`), both
   * its letters lit together.
   */
  private async soundOut(): Promise<void> {
    if (this.pass !== 'find') return;
    const key = this.plan.sentence.key;
    this.locked = true;
    const letters = this.tokenTexts[this.keyIndex]!;
    // A long-vowel word spells its sounds out (KEY is K, then long E on EY).
    const b = BANK_BY_WORD[key];
    const units = b?.units ?? unitsOf(key);
    // A word that does not sound out (MICE) gets just its first sound.
    const n = WORD_BY_ID[key]?.decodable === false ? 1 : units.length;
    let at = 0;
    for (let i = 0; i < n && this.pass === 'find'; i++) {
      const unit = units[i]!;
      const sound = b?.sounds[i] ?? unit;
      const lit = letters.slice(at, at + unit.length);
      at += unit.length;
      for (const other of letters) other.setColor(INK);
      for (const t of lit) t.setColor(LIT);
      this.tweens.add({ targets: lit, scale: 1.35, duration: 140, yoyo: true });
      if (SOUND_BY_UNIT[sound]) await this.say(letterSoundLine(sound));
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
      (episode.house.misses ??= {})[this.missKey] = this.wrongTries;
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
    // Her word bag: a word read right first time is done for this round; one
    // she missed stays in (or goes back in), so it comes round again soon.
    if (firstTry) progress.takeFromBag(s.key);
    else progress.returnToBag(s.key);
    if (!episode.read.includes(s.key)) episode.read.push(s.key);
    // The episode learns the result now, so a skip mid-celebration loses nothing.
    const counter = this.slot === 'counter';
    if (counter) episode.made.item = true;
    else if (!episode.fetched.includes(s.key)) episode.fetched.push(s.key);
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
      // What she picked becomes the counter: it swells and fades as the counter
      // (its picture again, or the villain's named item) pops out of it.
      const villain = villainSpec();
      const named = namedCounter();
      const art = counterArt();
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
      // The named item may be named ("We found the Magic Hat!"); anything else
      // gets a line that fits every word.
      const line = named ? villainKey('got_counter', villain.id) : 'got_counter_any';
      await Promise.all([this.guard(this.bag.receive(art, spot.x, picY)), this.say(narratorLine(narrator(), line))]);
    } else {
      pic?.setVisible(false);
      const w = WORD_BY_ID[s.key];
      const art = w ? pictureFor(w, castFace) : `pic_${s.key}`;
      await Promise.all([this.guard(this.bag.receive(art, spot.x, picY)), this.say(narratorLine(narrator(), 'got_item'))]);
    }
    await this.wait(400);
    this.fadeOutThen(() => backToHub(this, this.slot));
  }

  protected override extraHooks(): Partial<RoomInfo> {
    const s = this.plan.sentence;
    return { sentence: { tokens: [...s.tokens], key: s.key, frame: s.frame, pass: this.pass, index: this.index, skipped: this.skipped } };
  }
}
