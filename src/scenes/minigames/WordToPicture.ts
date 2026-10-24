/**
 * Word → picture. The word hangs on a banner; three pictures stand on
 * pedestals; she walks to the picture of the word and presses green. Each
 * right picture is a spark of summoning; four of them call the helper friend
 * (a prize only: it no longer joins the battle).
 *
 * The word is never spoken before she answers. Yellow sounds out its letters
 * one at a time, lighting each on the banner, and never blends them. Character
 * names appear as sight words, with the character's card as the picture.
 *
 * Parked (CLAUDE.md): out of the episode, kept on purpose; reach it with ?scene=picture (BootScene).
 */

import Phaser from 'phaser';

import { LETTER_BY_CHAR } from '../../../content/phonics/letters';
import { WORD_BY_ID, pictureFor } from '../../../content/phonics/words';
import { letterSoundLine, wordLine } from '../../../content/voice/ids';
import { DEPTH, FONT_COMIC, GAME_WIDTH } from '../../config';
import { castFace, planRand } from '../../episode/Episode';
import { bob, popIn } from '../../fx/juice';
import { pictureRound, type WordItem } from '../../rules/rounds';
import { progress } from '../../state/progress';
import { bannerArt, bannerPanelWidth, inkOf, tagPanel } from '../../ui/banner';
import type { Spot } from '../../world/RoomScene';
import { ParkedGame } from './ParkedGame';

const BANNER_W = 560;
/** Under the meter's slots, and a slim trim: it ends at about y 262 (a long word's smaller letters) to 275. */
const BANNER_TOP = 92;
const BANNER_TRIM = 0.3;
/** Clear air between the letters (their ink, popped to GROW) and the cream band's edges. */
const PANEL_MARGIN = 14;
/** How big a letter pops as the hint sounds it. */
const GROW = 1.3;
/**
 * The pictures' feet (each on its pedestal: 250 px tall, bobbing 5 up). Item 133 (W39): at
 * 520 a settled middle picture's top sat 3 to 10 px under the banner's foot, and its pop-in
 * (`popIn`, Back.easeOut, about 1.1 at the peak, grown from the feet) reached 25 px higher;
 * at 560 the peak stops at 285, clear of the deepest banner.
 */
const PICTURE_FEET = 560;
/** Where a new round steps her back to: out of every picture's reach (REACH 95), as before item 133 moved them. */
const STEP_BACK = PICTURE_FEET + 120;

const ITEMS = 4;

export class WordToPicture extends ParkedGame {
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
    this.items = pictureRound(progress, ITEMS, planRand);
    this.itemIndex = 0;
    this.makeMeter(ITEMS, 'minion_helper', '✨');
    this.floor.setTo(80, 420, GAME_WIDTH - 160, STEP_BACK + 10 - 420);
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
    // Item 128: on the art's cream band (src/ui/banner.ts), which grows to hold
    // the letters; each letter's hint pop (GROW, about its middle) stays on it too.
    this.letters = [];
    let size = item.target.length > 6 ? 64 : 76;
    const room = bannerPanelWidth(BANNER_W) - 2 * PANEL_MARGIN;
    for (;;) {
      for (const t of this.letters) t.destroy();
      const style = { fontFamily: FONT_COMIC, fontSize: `${size}px`, color: '#1a1030' };
      this.letters = [...item.target].map((ch) => this.add.text(0, 0, ch.toUpperCase(), style).setOrigin(0.5));
      const ends = ((GROW - 1) * (this.letters[0]!.width + this.letters.at(-1)!.width)) / 2;
      if (this.letters.reduce((n, t) => n + t.width, 0) + ends <= room || size <= 30) break;
      size -= 4;
    }
    const total = this.letters.reduce((n, t) => n + t.width, 0);
    const ink = this.letters.map(inkOf);
    const inkTop = Math.min(...ink.map((r) => r[1]));
    const inkBottom = Math.max(...ink.map((r) => r[3]));
    const art = bannerArt(this, BANNER_W, 2 * PANEL_MARGIN + (inkBottom - inkTop) * GROW, BANNER_TRIM);
    const y = art.panel[1] + PANEL_MARGIN - inkTop * GROW;
    let x = -total / 2;
    for (const t of this.letters) {
      t.setPosition(x + t.width / 2, y);
      x += t.width;
    }
    this.banner = this.add.container(GAME_WIDTH / 2, BANNER_TOP + art.height / 2, [...art.parts, ...this.letters]).setDepth(DEPTH.hud - 1);
    this.banner.setData('qaCover', 'banner');
    tagPanel(this.banner, 'banner', art.panel);
    popIn(this, this.banner, 1);

    const xs = item.choices.length === 2 ? [GAME_WIDTH / 2 - 240, GAME_WIDTH / 2 + 240] : [GAME_WIDTH / 2 - 360, GAME_WIDTH / 2, GAME_WIDTH / 2 + 360];
    item.choices.forEach((word, i) => {
      const w = WORD_BY_ID[word]!;
      const pedestal = this.art('prop_pedestal', 170, 100);
      const pic = this.art(pictureFor(w, castFace), 150, 150, 0, -100);
      const spot = this.addSpot(word, xs[i]!, PICTURE_FEET, [pedestal, pic], word === item.target);
      bob(this, pic, 5, 900 + i * 120);
      popIn(this, spot.obj, 1, 200 + i * 120);
    });
    if (this.player.y < STEP_BACK - 40) this.player.place(this.player.x, STEP_BACK);
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
          this.tweens.add({ targets: t, scale: GROW, duration: 140, yoyo: true });
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
        this.done();
      }
    })();
  }
}
