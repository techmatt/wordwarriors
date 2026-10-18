/**
 * Word → picture. The word hangs on a banner; three pictures stand on
 * pedestals; she walks to the picture of the word and presses green. Each
 * right picture is a spark of summoning; four of them call the helper friend
 * who fights alongside the heroes.
 *
 * The word is never spoken before she answers. Yellow sounds out its letters
 * one at a time, lighting each on the banner, and never blends them. Character
 * names appear as sight words, with the character's card as the picture.
 */

import Phaser from 'phaser';

import { LETTER_BY_CHAR } from '../../../content/phonics/letters';
import { WORD_BY_ID, pictureFor } from '../../../content/phonics/words';
import { letterSoundLine, wordLine } from '../../../content/voice/ids';
import { DEPTH, GAME_WIDTH } from '../../config';
import { episode } from '../../episode/Episode';
import { bob, popIn } from '../../fx/juice';
import { choiceCount, pictureRound, type WordItem } from '../../rules/rounds';
import { progress } from '../../state/progress';
import type { Spot } from '../../world/RoomScene';
import { Minigame } from './Minigame';

const ITEMS = 4;

export class WordToPicture extends Minigame {
  private items: WordItem[] = [];
  private banner: Phaser.GameObjects.Container | null = null;
  private letters: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('WordToPicture');
  }

  protected background(): string {
    return 'room_gallery';
  }

  protected build(): void {
    this.items = pictureRound(progress, ITEMS, Math.random, choiceCount(progress, 'words'));
    this.itemIndex = 0;
    this.makeMeter(ITEMS, 'minion_helper', '✨');
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 230);
    void (async () => {
      await this.narrate('prep_helper', 'inst_picture');
      this.showItem();
    })();
  }

  private showItem(): void {
    this.clearSpots();
    this.banner?.destroy();
    const item = this.items[this.itemIndex]!;
    this.round = `picture:${this.itemIndex}:${item.target}`;
    this.wrongTries = 0;

    // The banner, with the word as separate letters so the hint can light each.
    const bg = this.add.image(0, 0, 'prop_banner').setDisplaySize(560, 130);
    this.letters = [];
    const size = item.target.length > 6 ? 70 : 92;
    const style = { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: `${size}px`, color: '#1a1030' };
    const widths = [...item.target].map((ch) => this.add.text(0, 0, ch, style).setVisible(false));
    const total = widths.reduce((n, t) => n + t.width, 0);
    let x = -total / 2;
    for (const [i, t] of widths.entries()) {
      t.setVisible(true).setOrigin(0, 0.5).setPosition(x, 0);
      x += t.width;
      this.letters.push(t);
      void i;
    }
    this.banner = this.add.container(GAME_WIDTH / 2, 160, [bg, ...this.letters]).setDepth(DEPTH.hud - 1);
    popIn(this, this.banner, 1);

    const xs = item.choices.length === 2 ? [GAME_WIDTH / 2 - 240, GAME_WIDTH / 2 + 240] : [GAME_WIDTH / 2 - 360, GAME_WIDTH / 2, GAME_WIDTH / 2 + 360];
    item.choices.forEach((word, i) => {
      const w = WORD_BY_ID[word]!;
      const pedestal = this.art('prop_pedestal', 170, 100);
      const pic = this.art(pictureFor(w), 150, 150, 0, -100);
      const spot = this.addSpot(word, xs[i]!, 520, [pedestal, pic], word === item.target);
      bob(this, pic, 5, 900 + i * 120);
      popIn(this, spot.obj, 1, 200 + i * 120);
    });
    if (this.player.y < 600) this.player.place(this.player.x, 640);
  }

  protected override hint(): void {
    const item = this.items[this.itemIndex];
    if (!item) return;
    void (async () => {
      this.locked = true;
      // A name does not sound out letter by letter; its hint is just the first sound.
      const letters = WORD_BY_ID[item.target]?.decodable === false ? [...item.target].slice(0, 1) : [...item.target];
      for (const [i, ch] of letters.entries()) {
        const t = this.letters[i];
        if (t) {
          t.setColor('#ff3d7a');
          this.tweens.add({ targets: t, scale: 1.3, duration: 140, yoyo: true });
        }
        if (LETTER_BY_CHAR[ch]) await this.say(letterSoundLine(ch));
        await this.wait(200);
        t?.setColor('#1a1030');
      }
      this.locked = false;
    })();
  }

  protected choose(spot: Spot): void {
    const item = this.items[this.itemIndex]!;
    if (!spot.correct) {
      void this.wrong(spot.obj);
      return;
    }
    void (async () => {
      await this.right('words', item.target, spot.x, spot.y - 120, 0xff7ad9, wordLine(item.target));
      this.itemIndex++;
      if (this.itemIndex < this.items.length) {
        this.locked = false;
        this.showItem();
      } else {
        this.clearSpots();
        this.banner?.destroy();
        await this.completePrize('minion_helper', 'made_helper');
        episode.made.helper = true;
        this.done();
      }
    })();
  }
}
