/**
 * The narrator's ribbon: whatever the voice bus is saying as an instruction,
 * shown along the bottom with the spoken word lit up, and the speaker's card
 * beside it.
 *
 * Every text speaks, and the word being spoken is highlighted: that pairing is
 * the reading instruction (Seraphina's design law, kept). This is the
 * WordRibbon idea without its per-scene ownership: one ribbon per scene that
 * listens to the bus, so nothing can say a line without it showing.
 *
 * Barks (taunts) are not shown here; they go in follow-the-speaker bubbles.
 * Letter sounds and sentence prefix lines are not shown either (see show()).
 * Words show upper case, like every text she reads.
 */

import Phaser from 'phaser';

import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { fitImage } from '../fx/juice';
import { voiceBus, type Utterance } from '../audio/VoiceBus';
import { castArt } from '../episode/Episode';

const FONT = '"Arial Rounded MT Bold", "Arial Black", sans-serif';
const BG_H = 86;
/** The text area: right of the speaker's card, inside the ribbon (centre x, width). */
const TEXT_X = 50;
const TEXT_W = GAME_WIDTH - 160 - 200 - 40;
const MAX_ROWS = 3;

export class Caption {
  private readonly root: Phaser.GameObjects.Container;
  private readonly slab: Phaser.GameObjects.Rectangle;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private portrait: Phaser.GameObjects.Image | null = null;
  private words: Phaser.GameObjects.Text[] = [];
  private slabH = 54;
  private current: Utterance | null = null;
  private readonly off: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, GAME_WIDTH - 160, 86, 0x0e0b1a, 0.78).setStrokeStyle(4, 0xffffff, 0.6);
    this.slab = scene.add.rectangle(0, 0, 10, 54, 0xffd23f, 1).setVisible(false);
    this.root = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 58, [this.bg, this.slab]).setDepth(DEPTH.hud).setVisible(false);
    this.off = voiceBus.on((u) => this.show(u));
    // Phaser keeps a scene's event emitter across restarts, so the per-frame
    // listener must go when the scene shuts down: an old Caption ticking on
    // destroyed Text throws inside the game loop and freezes the game.
    const tick = () => this.tick();
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off();
      scene.events.off(Phaser.Scenes.Events.UPDATE, tick);
      this.current = null;
    });
    const now = voiceBus.speaking;
    if (now?.line) this.show(now);
  }

  private show(u: Utterance | null): void {
    if (!this.root.active) return;
    // Letter sounds are never captioned: their text is a placeholder spelling
    // ("Puh") that is not a thing to read, and captioning the letter instead
    // would hand her the answer in Sound to Letter. The letter on the stone,
    // tile or ghost box is what lights up.
    // Sentence prefix lines (`sent_`) are lit word by word on the sentence
    // banner itself, so the ribbon stays out of the way.
    if (u?.id.startsWith('letter_') || u?.id.startsWith('sent_')) {
      this.current = null;
      this.root.setVisible(false);
      return;
    }
    if (!u || u.priority !== 'instruction' || !u.line) {
      if (!u) {
        // Leave the last line up briefly, so a short line can still be read.
        this.scene.time.delayedCall(250, () => {
          if (!voiceBus.speaking && this.root.active) this.root.setVisible(false);
        });
      }
      if (u) this.current = null;
      return;
    }
    this.current = u;
    for (const w of this.words) w.destroy();
    this.words = [];
    this.portrait?.destroy();
    this.portrait = null;

    const speakerChar = u.speaker === 'phonics' ? 'dada_matt' : u.speaker.replace(/_evil$/, '');
    const key = castArt(speakerChar, u.speaker.endsWith('_evil'));
    if (this.scene.textures.exists(key)) {
      this.portrait = fitImage(this.scene.add.image(-GAME_WIDTH / 2 + 130, -20, key), 90, 112);
      this.root.add(this.portrait);
    }

    // All text in the game is upper case (Matt, 2026-10-18); only the display
    // changes, the line texts stay as written.
    const tokens = u.line.words.map((w) => w.word.toUpperCase());
    for (const token of tokens) {
      this.words.push(this.scene.add.text(0, 0, token, { fontFamily: FONT, fontSize: '40px', color: '#ffffff', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5, 0.5));
    }
    this.layout(tokens.length > 9 ? 34 : 40);
    this.root.add(this.words);
    this.root.setVisible(true);
  }

  /**
   * Words in rows inside the ribbon, right of the speaker's card: one row
   * when it fits, otherwise wrapped between words (up to three rows), the
   * font shrinking until every word fits. The ribbon grows upwards.
   */
  private layout(start: number): void {
    const maxW = TEXT_W;
    let size = start;
    let rows: Phaser.GameObjects.Text[][] = [];
    for (;;) {
      for (const t of this.words) t.setFontSize(size);
      const gap = size * 0.35;
      rows = [[]];
      let x = 0;
      for (const t of this.words) {
        const row = rows[rows.length - 1]!;
        if (row.length && x + gap + t.width > maxW) {
          rows.push([t]);
          x = t.width;
        } else {
          x += (row.length ? gap : 0) + t.width;
          row.push(t);
        }
      }
      const fits = this.words.every((t) => t.width <= maxW) && rows.length <= MAX_ROWS;
      if (fits || size <= 14) break;
      size -= 2;
    }
    const gap = size * 0.35;
    const lineH = size * 1.35;
    this.slabH = lineH;
    const h = Math.max(BG_H, rows.length * lineH + 32);
    // The bottom edge stays put; extra rows push the top up.
    this.bg.setSize(GAME_WIDTH - 160, h).setPosition(0, (BG_H - h) / 2);
    const top = this.bg.y - (rows.length * lineH) / 2 + lineH / 2;
    rows.forEach((row, r) => {
      const width = row.reduce((n, t) => n + t.width, 0) + gap * (row.length - 1);
      let x = TEXT_X - width / 2;
      for (const t of row) {
        t.setPosition(x + t.width / 2, top + r * lineH);
        x += t.width + gap;
      }
    });
  }

  private tick(): void {
    if (!this.root.active) return;
    const u = this.current;
    if (!u?.line || !this.root.visible) {
      this.slab.setVisible(false);
      return;
    }
    const t = u.time();
    let lit = -1;
    u.line.words.forEach((w, i) => {
      if (t >= w.start && t < Math.max(w.end, w.start + 0.12)) lit = i;
    });
    this.words.forEach((w, i) => w.setColor(i === lit ? '#2a1a00' : '#ffffff').setStroke(i === lit ? '#ffd23f' : '#000000', 6));
    const target = this.words[lit];
    if (target) {
      this.slab.setVisible(true);
      this.slab.setPosition(target.x, target.y);
      this.slab.setSize(target.width + 14, this.slabH);
    } else this.slab.setVisible(false);
  }
}
