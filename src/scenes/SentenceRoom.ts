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
 * - `read`: her turn, nothing lit. Her one green reads the sentence aloud,
 *   word by word, each banner word lighting as its `word_<x>` line is said
 *   (item 085: no more one green per word). The read stops at the key word,
 *   which lights in silence and is then sounded out one sound at a time,
 *   never blended and never said whole. Yellow before that green says the
 *   instruction again. Then the pass becomes...
 * - `find`: the pedestals wake up and she walks to the answer; her next green
 *   takes the picture she stands at. Yellow sounds out the key word again
 *   (SH of SHIP is one sound; a non-decodable word like MICE gives only its
 *   first sound), and so does a miss.
 *
 * The key word is never spoken until she has answered: the prefix line stops
 * before it, and its own `word_<key>` line plays only as confirmation, after
 * the whole sentence is read back to her.
 */

import Phaser from 'phaser';

import { tokenWord } from '../../content/phonics/sentences';
import { WORD_BY_ID } from '../../content/phonics/words';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { narratorLine, villainKey, wordLine } from '../../content/voice/ids';
import { voiceBus, type Utterance } from '../voice/VoiceBus';
import { sfxRight, sfxStep, sfxSummon } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_WIDTH, REACH } from '../config';
import { counterArt, episode, namedCounter, narrator, villainSpec, type Slot, type Step } from '../episode/Episode';
import { isVariant, variant } from '../episode/lineVariants';
import { bob, burst, fitPicture, floatText, pictureSize, popIn, shockwave } from '../fx/juice';
import type { SentencePlan } from '../rules/rooms';
import { skipsListening } from '../rules/sentences';
import { soundOut } from '../rules/soundOut';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import { bannerArt, bannerPanelWidth, inkOf, tagPanel } from '../ui/banner';
import { makeButtonDot } from '../ui/ButtonDot';
import type { CaptionMode, KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, HouseSideRoom, INK, LIT, sidePlan } from '../world/SideRoom';
import type { SceneKey } from './keys';

type Pass = 'listen' | 'read' | 'find' | 'done';

/** Item 128: wider than the 1040 it was, so long sentences keep their size on the cream band. */
const BANNER_W = 1160;
/** The banner's word size once a sentence takes two rows (item 043, M4): two rows at this before one smaller row. */
const TWO_ROWS_PX = 56;
/** The banner's top edge: it hangs from the top of the screen (its pole is all that is up there). */
const BANNER_TOP = 6;
/** Clear air between the words (their ink, grown to their biggest) and the cream band's edges (item 128). */
const PANEL_MARGIN = 14;
/** The space between two rows of words, as a share of the word size. */
const ROW_GAP = 0.22;
/** The picture on its pedestal: how high above the spot its top is (pedestal 100 + picture 150), and its bob. */
const PIC_TOP = 250;
const PIC_BOB = 5;
/** The picture's square slot (a standing person's or a wide picture's box is its own shape, M48). */
const PIC_H = 150;
/** How much the thing she stands next to grows (RoomScene's near tween). */
const NEAR_SCALE = 1.1;
/** Clear air between the banner's bottom edge and the tallest picture's top. */
const BANNER_GAP = 10;
/** The silent beat on the key word at the end of the listening pass. */
const KEY_BEAT_MS = 1200;
/** How big the lit word grows (the layout leaves room for it). */
const LIT_SCALE = 1.08;
/** The biggest the key word grows: its pulse in the listening pass, its pop as her read reaches it, a lit letter (room left for it, item 128). */
const KEY_GROW = 1.3;
/** The pause after each letter sound, so the sounds never run together. */
const LETTER_GAP_MS = 450;
/** Her green's read: the breath between one word's line and the next. */
const WORD_GAP_MS = 120;
/** Her green's read: the key word lit in silence before its sounds. */
const KEY_LIT_MS = 600;

export class SentenceRoom extends HouseSideRoom {
  private plan!: SentencePlan;
  private pass: Pass = 'listen';
  private skipped = false;
  /** The highlighted token, or -1. */
  private index = -1;
  /** Her green's read is under way (pass `read`, from the press until the pedestals wake). */
  private reading = false;
  /** Every token her green's read lit, in order (the tests' hook). */
  private readLit: number[] = [];
  /** One container per token, centred on the word, so it can pulse in place. */
  private tokenBoxes: Phaser.GameObjects.Container[] = [];
  /** The banner's height: 140 for one row, taller when the sentence wraps. */
  private bannerH = 140;
  /** The cream band's bottom edge, around the banner's middle (item 128): the read dot sits just under it. */
  private panelBottom = 70;
  /** Each token's Text objects: one for a frame word, one per letter for the key word. */
  private tokenTexts: Phaser.GameObjects.Text[][] = [];
  /** While a line plays, the banner follows it: line id and how many tokens it covers. */
  private karaoke: { id: string; n: number } | null = null;
  private bag!: Bag;
  private banner!: Phaser.GameObjects.Container;
  /** In `read`, before her green, a green dot under the first word: the read is hers to start. */
  private readDot!: Phaser.GameObjects.Container;

  constructor() {
    super('SentenceRoom' satisfies SceneKey);
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    this.plan = sidePlan('SentenceRoom', this.slot, 'sentence');
    this.roomId = this.plan.room;
    this.pass = 'listen';
    this.skipped = false;
    this.index = -1;
    this.reading = false;
    this.readLit = [];
    this.karaoke = null;
    // Back from the parent page (F9) after a miss: still a miss.
    this.wrongTries = this.keptMisses(this.plan.sentence.key);
  }

  /** The attic's find line takes the narrow box (item 071, M13): its two-row banner holds the top, and the full-width box at the bottom covered her. */
  protected override narrowLine(u: Utterance): boolean {
    // Under a banner tall enough to push the pictures down, the attic's or a long fetch sentence's (hunt 10:
    // DADA MATT NEEDS A PLANT took two rows, and the wide box hid her from the waist down), M13's case.
    return (this.slot === 'counter' || this.tallBanner) && isVariant(u.id, narratorLine(narrator(), 'room_find'));
  }

  /** The banner pushed the pictures down the floor (`build`): the find line's box goes narrow, as the attic's. */
  private tallBanner = false;

  /**
   * The banner is the highlighter here: the words it lights (the prefix line,
   * each word on her turn, the key word's sounds) show only the reader's face,
   * never a second copy of the words in the box.
   */
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

  protected build(): void {
    const s = this.plan.sentence;
    this.round = `sentence:${this.slot}:${s.key}`;
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 240);
    // Each room its own stable mess; calm, because she is reading in here. Off the pictures' row and 250 px
    // either side (hunt 11, fix 150's kind: a bone pile by the MOM pedestal read as a thing to pick; at 150 the
    // attic's question mark and penguins still stood just past its end).
    const roomSpots = SIDE_ROOM_BY_ID[this.plan.room]!.spots;
    const xs = roomSpots.map(([x]) => x);
    const top = Math.min(...roomSpots.map(([, y]) => y)) - 230;
    // 250 only at the pictures' height: down to the floor's foot it left no floor spot at all, and an outdoor room
    // or a floor-only villain drew no mess (a review).
    const foot = Math.max(...roomSpots.map(([, y]) => y)) + 20;
    const avoid = [
      new Phaser.Geom.Rectangle(Math.min(...xs) - 150, top, Math.max(...xs) - Math.min(...xs) + 300, 400),
      new Phaser.Geom.Rectangle(Math.min(...xs) - 250, top, Math.max(...xs) - Math.min(...xs) + 500, foot - top),
    ];
    this.bag = this.moodAndBag(avoid);
    this.readDot = makeButtonDot(this, 0, 0, 'green', 16).setDepth(DEPTH.hud).setVisible(false);
    // Back from the parent page (F9) after she found it, mid-celebration: the
    // room is done, so straight back to the hub (item 039: it replayed, and a
    // second find fetched and recorded the word twice). No banner: the last
    // run's boxes are gone with it.
    if (episode.house.done.includes(this.slot)) {
      this.tokenBoxes = [];
      this.locked = true;
      this.backToHubSoon();
      return;
    }
    const room = SIDE_ROOM_BY_ID[this.plan.room]!;
    this.makeBanner();
    // The pictures stand clear of the banner (item 059): a tall banner (a long
    // sentence on two or three rows) moves them down the floor, never over them.
    const bannerBottom = this.banner.y + this.bannerH / 2;
    const highest = Math.min(...room.spots.slice(0, this.plan.objects.length).map(([, y]) => y));
    // A standing person's picture is taller than the square (M48, `pictureSize`): the tallest one counts.
    const picTop = PIC_TOP - PIC_H + Math.max(PIC_H, ...this.plan.objects.map((w) => pictureSize(this, this.wordArt(w), PIC_H, PIC_H).h));
    // The thing she is next to grows by NEAR_SCALE from its feet (RoomScene), so its top rises too.
    const drop = Math.max(0, Math.ceil(bannerBottom + BANNER_GAP - (highest - picTop * NEAR_SCALE - PIC_BOB)));
    this.tallBanner = drop > 0;
    // She comes in below them, out of reach, so she is not standing on one when they wake (item 069:
    // under a two-row banner she came in 70 px under the middle one and a mashed green chose it).
    const spots = room.spots.slice(0, this.plan.objects.length).map(([x, y]) => ({ x, y: y + drop }));
    // Not lower down instead: the bottom dialogue box ("Now find it") would cover her, the cursor.
    const y = Math.min(Math.max(room.entry.y, highest + drop + 70), this.floor.bottom - 10);
    const inReach = (x: number) => spots.some((sp) => Math.hypot(sp.x - x, sp.y - y) <= REACH);
    // In reach of the middle one: between the first two instead.
    const x = !inReach(room.entry.x) || spots.length < 2 ? room.entry.x : (spots[0]!.x + spots[1]!.x) / 2;
    this.enter(x, y);
    // Nothing to walk to until the pedestals wake: no stick hint before then.
    this.walking = false;
    // Decode the sentence's lines now, so the banner lights the moment they start.
    void voiceBank.ensure(s.prefixLine);
    void voiceBank.ensure(wordLine(s.key));

    // The three objects, asleep until her read has sounded out the key word.
    this.plan.objects.forEach((word, i) => {
      const [x, y0] = room.spots[i]!;
      const y = y0 + drop;
      const pedestal = this.art('prop_pedestal', 170, 100);
      const pic = this.art(this.wordArt(word), PIC_H, PIC_H, 0, -100);
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

    void this.sentenceFlow();
  }

  /**
   * The banner: each token its own word, upper case, key word last and split
   * into letters. One row when it fits (shrinking to 40 px first); otherwise
   * the words wrap onto more rows, between words only, and the banner grows.
   */
  private makeBanner(): void {
    const tokens = this.plan.sentence.tokens;
    const room = bannerPanelWidth(BANNER_W) - 2 * PANEL_MARGIN;
    /** The biggest a token grows: lit, or the key word's pulse. */
    const grow = (i: number) => (i === this.keyIndex ? KEY_GROW : LIT_SCALE);
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
    // Each gap leaves room for either neighbour to grow (about its middle, one lit at a time), so words never touch.
    const gapBetween = (i: number, j: number) => size * 0.4 + Math.max((grow(i) - 1) * widths[i]!, (grow(j) - 1) * widths[j]!) / 2;
    const rowWidth = (row: number[]) => row.reduce((n, i, k) => n + widths[i]! + (k ? gapBetween(row[k - 1]!, i) : 0), 0);
    /** What a row's end words reach past it as they grow (each grows about its middle). */
    const overhang = (row: number[]): [number, number] => [((grow(row[0]!) - 1) * widths[row[0]!]!) / 2, ((grow(row.at(-1)!) - 1) * widths[row.at(-1)!]!) / 2];
    /** A row's whole reach, its end words grown: what must fit within `room`. */
    const span = (row: number[]) => rowWidth(row) + overhang(row)[0] + overhang(row)[1];
    /** Token indices per row, greedy, every row within `room` if it can be. */
    const rowsOf = (): number[][] => {
      const rows: number[][] = [[]];
      widths.forEach((_, i) => {
        const row = rows[rows.length - 1]!;
        if (row.length && span([...row, i]) > room) rows.push([i]);
        else row.push(i);
      });
      return rows;
    };
    /**
     * Two rows split where they come out most even, not greedily (item 039:
     * greedy left the key word alone on the second row, SMAUG IS NO MATCH FOR
     * THE / BUN). Any other count stays greedy.
     */
    const balanced = (greedy: number[][]): number[][] => {
      if (greedy.length !== 2) return greedy;
      const all = widths.map((_, i) => i);
      let best = greedy;
      let bestW = Math.max(...greedy.map(span));
      for (let k = 1; k < all.length; k++) {
        const split = [all.slice(0, k), all.slice(k)];
        const w = Math.max(...split.map(span));
        if (w <= room && w < bestW) {
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
      const fits = rows.every((r) => span(r) <= room);
      // One row while it fits at 60 px or more; then two rows at 56 px before
      // one smaller row (item 043, M4: the long counter sentences read at about
      // half size on one row); past 40 px, more rows are better than smaller words.
      if ((rows.length === 1 && fits) || (size <= TWO_ROWS_PX && fits && rows.length <= 2) || (size <= 40 && fits && rows.length <= 3) || size <= 20) break;
      size -= 4;
    }
    // Item 128: the rows stand on the art's cream band, which grows to hold
    // them; the trim, pole and tassels keep their size. Laid out by the words'
    // ink (an upper-case word fills under three quarters of its text's box),
    // each row's words grown to their biggest, with clear air all round.
    const ink = this.tokenTexts.flat().map(inkOf);
    const inkTop = Math.min(...ink.map((r) => r[1]));
    const inkBottom = Math.max(...ink.map((r) => r[3]));
    const pitch = inkBottom - inkTop + size * ROW_GAP;
    const panelH = 2 * PANEL_MARGIN + (rows.length - 1) * pitch + (inkBottom - inkTop) * KEY_GROW;
    const art = bannerArt(this, BANNER_W, panelH);
    this.bannerH = art.height;
    this.panelBottom = art.panel[3];
    rows.forEach((row, r) => {
      const [left, right] = overhang(row);
      let x = -rowWidth(row) / 2 + (left - right) / 2;
      // A grown word grows about its box's middle, so its ink reaches KEY_GROW times as far above and below.
      const y = art.panel[1] + PANEL_MARGIN - inkTop * KEY_GROW + r * pitch;
      row.forEach((i, k) => {
        if (k) x += gapBetween(row[k - 1]!, i);
        this.tokenBoxes[i]!.setPosition(x + widths[i]! / 2, y);
        x += widths[i]!;
      });
    });
    this.banner = this.add.container(GAME_WIDTH / 2, BANNER_TOP + this.bannerH / 2, [...art.parts, ...this.tokenBoxes]).setDepth(DEPTH.hud - 1);
    // A cover for the bug-hunt checker's probe: it must never hang over a picture (item 059); its words stay on the cream (item 128).
    this.banner.setData('qaCover', 'banner');
    tagPanel(this.banner, 'banner', art.panel);
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

  /**
   * The green dot sits under the lit word while she reads (the first word before any is lit), bobbing; hidden otherwise.
   * On the banner's bottom trim, just under the cream band (hunt 9: under the whole banner, item 128's taller art hung
   * it 115 px below the word, over the top of the left picture, where a green dot means "take this").
   */
  private placeReadDot(time: number): void {
    const box = this.tokenBoxes[Math.max(0, this.index)];
    const show = this.pass === 'read' && !this.locked && !!box;
    this.readDot.setVisible(show);
    if (show) this.readDot.setPosition(this.banner.x + box.x, this.banner.y + this.panelBottom + 14 + Math.sin(time / 180) * 4);
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

  private async sentenceFlow(): Promise<void> {
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
      this.tweens.add({ targets: box, scale: KEY_GROW, duration: 200, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      await this.wait(KEY_BEAT_MS);
      if (this.pass !== 'listen') return;
    }
    this.pass = 'read';
    this.light(-1);
    await this.narrate('room_your_turn');
  }

  /** Her green's read is over (or F4 skipped it): wake the pedestals. */
  private async startFind(narrate = true): Promise<void> {
    this.pass = 'find';
    this.reading = false;
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
   * In `read`, her one green reads the whole sentence (`readAloud`). In
   * `find` green takes the picture she stands at. Everywhere else it is
   * consumed (and input is locked while the read plays anyway).
   */
  protected override onGreen(): boolean {
    if (this.pass === 'find') return false;
    if (this.pass === 'read' && !this.reading) void this.readAloud();
    return true;
  }

  /** A little puff on a banner word as it lights. */
  private puff(i: number): void {
    const box = this.tokenBoxes[i];
    if (box) burst(this, this.banner.x + box.x, this.banner.y + box.y, { count: 12, speed: 200 });
  }

  /**
   * Her green's read (item 085): each frame word lit and said in turn, with
   * its own `word_<x>` line, so light and voice stay together; then the key
   * word lights in silence and is sounded out, unit by unit, never said
   * whole; then the pedestals wake. Locked throughout; F4 may cut it short.
   */
  private async readAloud(): Promise<void> {
    const s = this.plan.sentence;
    this.reading = true;
    this.locked = true;
    this.readLit = [];
    sfxStep(0);
    for (let i = 0; i < this.keyIndex; i++) {
      if (this.pass !== 'read') return;
      this.light(i);
      this.readLit.push(i);
      this.puff(i);
      await this.say(wordLine(tokenWord(s.tokens[i]!)));
      if (this.pass !== 'read') return;
      await this.wait(WORD_GAP_MS);
    }
    if (this.pass !== 'read') return;
    // The key word: lit, and silent. That one is hers.
    this.light(this.keyIndex);
    this.readLit.push(this.keyIndex);
    this.puff(this.keyIndex);
    const box = this.tokenBoxes[this.keyIndex]!;
    this.tweens.killTweensOf(box);
    this.tweens.add({ targets: box, scale: 1.25, duration: 180, yoyo: true, ease: 'Sine.easeInOut' });
    await this.wait(KEY_LIT_MS);
    if (this.pass !== 'read') return;
    await this.soundOut();
    if (this.pass !== 'read') return;
    await this.startFind();
  }

  /** Free play (item 060): only once the key word is found; listening, reading along and finding are all answers. */
  protected override playOpen(): boolean {
    return this.pass === 'done' && this.walking;
  }

  /** Yellow says something again only before her read (the instruction) and while she finds the key word. */
  protected override hasHint(): boolean {
    return (this.pass === 'read' && !this.reading) || this.pass === 'find';
  }

  protected override hint(idle = false): void {
    if (this.pass === 'read') {
      if (!this.reading) void this.narrateAgain('room_your_turn');
      return;
    }
    if (this.pass !== 'find') return;
    if (idle) {
      // Stuck: the instruction again, then help with the word itself.
      void this.narrateAgain('room_find').then(() => this.soundOut());
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
   * The key word's sounds, one at a time, never blended. At the end of her
   * green's read and while she is finding it. A digraph is one sound (SHIP is
   * SH, I, P: `unitsOf`), both its letters lit together.
   */
  private async soundOut(): Promise<void> {
    const live = () => this.pass === 'find' || (this.pass === 'read' && this.reading);
    if (!live()) return;
    const key = this.plan.sentence.key;
    this.locked = true;
    const letters = this.tokenTexts[this.keyIndex]!;
    // The shared rule (src/rules/soundOut.ts): a long-vowel word spells its sounds out (KEY is K, then long E on EY).
    const steps = soundOut(key);
    // A word that does not sound out (MICE) gets just its first sound.
    const n = WORD_BY_ID[key]?.decodable === false ? 1 : steps.length;
    for (const step of steps.slice(0, n)) {
      if (!live()) break;
      const lit = letters.slice(step.index, step.index + step.span);
      for (const other of letters) other.setColor(INK);
      for (const t of lit) t.setColor(LIT);
      // On the lit word (LIT_SCALE), so the letter peaks at KEY_GROW, the room the banner leaves it (item 128: 1.35 on top ran it off the cream).
      this.tweens.add({ targets: lit, scale: KEY_GROW / LIT_SCALE, duration: 140, yoyo: true });
      if (step.id) await this.say(step.id);
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
  protected override stayLocked(): boolean {
    return this.pass === 'done';
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
      this.keepMisses(this.plan.sentence.key, this.wrongTries);
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
    // The attic's word is not fetched: it makes the counter.
    const counter = this.slot === 'counter';
    this.recordRead(s.key, firstTry, this.wrongTries, { fetch: !counter });
    progress.record('frames', s.frame, firstTry, this.wrongTries);
    if (counter) episode.made.item = true;

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
      const big = fitPicture(this.add.image(spot.x, picY, art), 200, 200).setDepth(DEPTH.sparkles);
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
      const art = this.wordArt(s.key);
      await Promise.all([this.guard(this.bag.receive(art, spot.x, picY)), this.say(narratorLine(narrator(), variant('got_item')))]);
    }
    await this.wait(400);
    this.fadeToHub();
  }

  protected override extraHooks(): Partial<RoomInfo> {
    const s = this.plan.sentence;
    return { sentence: { tokens: [...s.tokens], key: s.key, frame: s.frame, pass: this.pass, index: this.index, skipped: this.skipped, readLit: [...this.readLit], readDot: this.readDot.visible ? { x: this.readDot.x, y: this.readDot.y } : null, bannerBottom: this.banner ? this.banner.y + this.bannerH / 2 : 0 } };
  }
}
