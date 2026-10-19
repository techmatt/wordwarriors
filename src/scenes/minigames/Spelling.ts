/**
 * Spell the Spell: the counter-item game. She types short words on the
 * keyboard; ghost letters in boxes show every letter, and each right key
 * fills its box with a pop and says the letter's SOUND. Two warm-up words and
 * the magic word forge the counter-item that beats the villain's ultimate.
 *
 * Spelling is encoding, not reading, so the word is spoken up front ("Spell
 * this one!" then the word). A wrong key is a soft boing and a wiggle of the
 * box she needs, no penalty; after two wrong keys the needed ghost letter
 * glows. Yellow sounds out the letters still to go, one at a time.
 *
 * The keyboard is A–Z only while this scene is open (TextEntry). Walking is
 * not needed here; her character stands by the anvil and hops on each letter.
 */

import Phaser from 'phaser';

import { WORD_BY_ID, pictureFor } from '../../../content/phonics/words';
import { LETTER_BY_CHAR } from '../../../content/phonics/letters';
import { letterSoundLine, narratorLine, wordLine } from '../../../content/voice/ids';
import { voiceBus } from '../../audio/VoiceBus';
import { sfxBoing, sfxKey } from '../../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../../config';
import { castFace, episode, narrator, villainSpec } from '../../episode/Episode';
import { burst, fitImage, popIn, shake, wiggle } from '../../fx/juice';
import { openTextEntry } from '../../input/TextEntry';
import type { Spot } from '../../world/RoomScene';
import { Minigame } from './Minigame';

interface Box {
  letter: string;
  rect: Phaser.GameObjects.Rectangle;
  ghost: Phaser.GameObjects.Text;
  filled: Phaser.GameObjects.Text | null;
}

export class Spelling extends Minigame {
  private words: string[] = [];
  private boxes: Box[] = [];
  private cursor = 0;
  private wrongKeys = 0;
  private closeEntry: (() => void) | null = null;
  private art_: Phaser.GameObjects.GameObject[] = [];
  private accepting = false;

  constructor() {
    super('Spelling');
  }

  protected background(): string {
    return 'room_forge';
  }

  protected build(): void {
    this.walking = false;
    this.accepting = false;
    this.boxes = [];
    this.art_ = [];
    this.cursor = 0;
    this.wrongKeys = 0;
    const counter = villainSpec().counter;
    this.words = [...counter.words];
    this.itemIndex = 0;
    this.makeMeter(this.words.length, `item_${counter.id}`, counter.glyph);
    this.player.place(300, 600);
    const anvil = this.art('prop_anvil', 220, 150, GAME_WIDTH - 170, 620);
    anvil.setDepth(600);
    this.makeKeyboard();
    this.closeEntry = openTextEntry((l) => this.onLetter(l));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.closeEntry?.());
    void (async () => {
      await this.narrate('forge_intro');
      this.showWord();
    })();
  }

  private showWord(): void {
    for (const o of this.art_) o.destroy();
    this.art_ = [];
    for (const b of this.boxes) {
      b.rect.destroy();
      b.ghost.destroy();
      b.filled?.destroy();
    }
    this.boxes = [];
    this.cursor = 0;
    this.wrongKeys = 0;
    this.wrongTries = 0;
    const word = this.words[this.itemIndex]!;
    this.round = `spell:${this.itemIndex}:${word}`;

    // A picture when the word has one; the magic word gets the item itself.
    const w = WORD_BY_ID[word];
    const last = this.itemIndex === this.words.length - 1;
    const picKey = last ? `item_${villainSpec().counter.id}` : w ? pictureFor(w, castFace) : null;
    if (picKey) {
      const pic = fitImage(this.add.image(GAME_WIDTH / 2, 190, picKey), 150, 150).setDepth(DEPTH.hud - 2);
      popIn(this, pic, pic.scale);
      this.art_.push(pic);
    }

    const size = 110;
    const gap = 18;
    const x0 = GAME_WIDTH / 2 - ((word.length - 1) * (size + gap)) / 2;
    [...word].forEach((letter, i) => {
      const x = x0 + i * (size + gap);
      const rect = this.add.rectangle(x, 370, size, size + 10, 0xffffff, 0.85).setStrokeStyle(6, 0x5a4a8a).setDepth(DEPTH.hud - 2);
      const ghost = this.add
        .text(x, 370, letter.toUpperCase(), { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: '86px', color: '#5a4a8a' })
        .setOrigin(0.5)
        .setAlpha(0.28)
        .setDepth(DEPTH.hud - 1);
      popIn(this, rect, 1, i * 90);
      this.boxes.push({ letter, rect, ghost, filled: null });
    });
    this.highlightCursor();

    void (async () => {
      this.accepting = false;
      this.locked = true;
      await this.guard(voiceBus.sequence([narratorLine(narrator(), 'spell_this'), wordLine(word)]));
      this.locked = false;
      this.accepting = true;
    })();
  }

  private highlightCursor(): void {
    this.boxes.forEach((b, i) => b.rect.setStrokeStyle(6, i === this.cursor ? 0xffd23f : 0x5a4a8a));
    this.glowKey(this.boxes[this.cursor]?.letter ?? null);
  }

  /**
   * A small picture of the keyboard (QWERTY, capitals as printed on the keys)
   * with the next letter's key glowing, so a hunt-and-peck four-year-old knows
   * where to look.
   */
  private keys = new Map<string, Phaser.GameObjects.Container>();

  private makeKeyboard(): void {
    this.keys = new Map();
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const size = 46;
    const gap = 6;
    rows.forEach((row, r) => {
      const x0 = GAME_WIDTH / 2 - ((row.length - 1) * (size + gap)) / 2 + r * 14;
      [...row].forEach((ch, i) => {
        const bg = this.add.rectangle(0, 0, size, size, 0xfaf6ee).setStrokeStyle(3, 0x5a4a8a);
        // Capital, as printed on the real keycap and as every text in the game.
        const cap = this.add.text(-2, 1, ch.toUpperCase(), { fontFamily: '"Arial Black", sans-serif', fontSize: '24px', color: '#3a2a5a' }).setOrigin(0.5);
        const key = this.add.container(x0 + i * (size + gap), 480 + r * (size + gap), [bg, cap]).setDepth(DEPTH.hud - 3);
        this.keys.set(ch, key);
      });
    });
  }

  private glowKey(letter: string | null): void {
    for (const [ch, key] of this.keys) {
      const bg = key.list[0] as Phaser.GameObjects.Rectangle;
      this.tweens.killTweensOf(key);
      key.setScale(1);
      const on = ch === letter;
      bg.setFillStyle(on ? 0xffd23f : 0xfaf6ee).setStrokeStyle(3, on ? 0xff7b00 : 0x5a4a8a);
      if (on) this.tweens.add({ targets: key, scale: 1.18, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private onLetter(letter: string): void {
    this.noteActivity();
    if (!this.accepting) return;
    const box = this.boxes[this.cursor];
    if (!box) return;
    if (letter !== box.letter) {
      this.wrongKeys++;
      this.wrongTries++;
      sfxBoing();
      wiggle(this, box.rect);
      if (this.wrongKeys >= 2) {
        box.ghost.setAlpha(0.8).setColor('#ff3d7a');
        this.tweens.add({ targets: box.ghost, scale: 1.25, duration: 180, yoyo: true, repeat: 1 });
      }
      return;
    }
    this.wrongKeys = 0;
    sfxKey();
    box.ghost.setAlpha(0);
    box.filled = this.add
      .text(box.rect.x, box.rect.y, letter.toUpperCase(), { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: '86px', color: '#1a1030' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    popIn(this, box.filled, 1);
    burst(this, box.rect.x, box.rect.y, { count: 22, speed: 260 });
    box.rect.setFillStyle(0xfff3c4, 1);
    this.player.hop();
    if (LETTER_BY_CHAR[letter]) void voiceBus.say(letterSoundLine(letter));
    this.cursor++;
    this.highlightCursor();
    if (this.cursor >= this.boxes.length) void this.wordDone();
  }

  private async wordDone(): Promise<void> {
    this.accepting = false;
    const word = this.words[this.itemIndex]!;
    await this.wait(500);
    shake(this, 3, 200);
    for (const b of this.boxes) this.tweens.add({ targets: [b.rect, b.filled], scale: 1.15, duration: 120, yoyo: true });
    await this.right('spelling', word, GAME_WIDTH / 2, 370, 0xffb703, wordLine(word));
    this.itemIndex++;
    if (this.itemIndex < this.words.length) {
      this.showWord();
      return;
    }
    for (const o of this.art_) o.destroy();
    for (const b of this.boxes) {
      b.rect.destroy();
      b.ghost.destroy();
      b.filled?.destroy();
    }
    this.boxes = [];
    const counter = villainSpec().counter;
    await this.completePrize(`item_${counter.id}`, `made_item_${episode.villain}`);
    episode.made.item = true;
    this.done();
  }

  protected override hint(): void {
    void (async () => {
      this.locked = true;
      for (const b of this.boxes.slice(this.cursor)) {
        this.tweens.add({ targets: b.ghost, alpha: 0.9, duration: 120, yoyo: true });
        if (LETTER_BY_CHAR[b.letter]) await this.say(letterSoundLine(b.letter));
        await this.wait(200);
      }
      this.locked = false;
    })();
  }

  /** Dev F4 and tests: type the next right letter. */
  protected override correctSpot(): Spot | undefined {
    const box = this.boxes[this.cursor];
    if (box) this.onLetter(box.letter);
    return undefined;
  }

  protected choose(): void {}

  protected override extraHooks() {
    const word = this.words[this.itemIndex] ?? '';
    return { spelling: { word, filled: this.cursor } };
  }
}
