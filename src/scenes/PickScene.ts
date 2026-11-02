/**
 * Picking the hero, the ally and the villain, by walking up to a card.
 *
 * Walking near a card says its name in that character's own voice (a bark,
 * with a bubble over the card), so she can browse by ear. Green picks it.
 * Ally adds a "nobody" card; villain adds a "surprise" card that picks at
 * random. Instructions here are always Dada Matt: no ally exists yet.
 *
 * Parked (CLAUDE.md): out of the episode, kept on purpose; reach it with ?scene=pick (BootScene)
 * or EPISODE_DEFAULTS.pickScreens.
 *
 * Live as choice mode (item 174, `startChoice`): a grown-up turns it on and she
 * picks the ally, then the villain, from big framed cards of the active cast,
 * with no nobody or surprise card. Each name is said as its card lights (a name
 * she walked past while a line played, as that line ends), so she needs no
 * reading; green chooses, red goes back a step.
 */

import Phaser from 'phaser';

import { cardArt, charArt } from '../../content/art/assets';
import { PERSONS } from '../../content/battle/roster';
import { coreLine, fighterId, nameLine } from '../../content/voice/ids';
import { choiceAllies, choiceVillains } from '../rules/cast';
import { voiceBus } from '../voice/VoiceBus';
import { sfxSelect, sfxSummon } from '../audio/sfx';
import { FONT_HEAVY, GAME_WIDTH } from '../config';
import { castEpisode, chooseAlly, chooseVillain, episode, pickBack, randomVillain, type Step } from '../episode/Episode';
import { bob, burst, flash, shockwave } from '../fx/juice';
import { isLeaving } from '../fx/sceneGen';
import type { KeepOut } from '../ui/Caption';
import { RoomScene, type Spot } from '../world/RoomScene';
import type { SceneKey } from './keys';

const CARD_W = 100;
const CARD_H = 125;

/** Choice mode's cards (item 174): two rows at most (12 allies), the feet of each row, its frame round the picture. */
const CHOICE = { w: 150, h: 190, frame: 10, rows: [305, 545], gap: 196 } as const;
const FRAME_LINE = 6;

export class PickScene extends RoomScene {
  private what: 'hero' | 'ally' | 'villain' = 'hero';
  private picked = false;
  /** Choice mode: the card lit, its frame by spot id, and the name still to say (a line was playing). */
  private lit: Spot | null = null;
  private readonly frames = new Map<string, Phaser.GameObjects.Rectangle>();
  private naming: Spot | null = null;
  private titleBox: KeepOut | null = null;

  constructor() {
    super('Pick' satisfies SceneKey);
  }

  override init(data: { step?: Step }): void {
    super.init(data);
    this.what = this.step.kind === 'pick' ? this.step.what : 'hero';
    this.picked = false;
    this.lit = null;
    this.naming = null;
    this.frames.clear();
    this.titleBox = null;
    this.floor = episode.choice ? new Phaser.Geom.Rectangle(60, 290, GAME_WIDTH - 120, 300) : new Phaser.Geom.Rectangle(60, 250, GAME_WIDTH - 120, 380);
  }

  protected background(): string {
    return 'room_pick';
  }

  protected override music(): 'title' {
    return 'title';
  }

  protected override playerCharacter(): string {
    return this.what === 'hero' ? 'julia' : episode.hero;
  }

  /** The picks come before she wakes: her default images, never a form. */
  protected override playerArt(): string {
    return cardArt(this.playerCharacter());
  }

  protected build(): void {
    if (episode.choice) this.buildChoice();
    else this.buildParked();
  }

  /** Choice mode's cards: every active ally or villain, the cast's list, so a new character needs no change here. */
  private buildChoice(): void {
    const evil = this.what === 'villain';
    const ids = evil ? choiceVillains(episode.hero, episode.ally) : choiceAllies(episode.hero);
    const perRow = Math.ceil(ids.length / 2);
    const { w, h, frame, rows, gap } = CHOICE;
    ids.forEach((id, i) => {
      const row = i < perRow ? 0 : 1;
      const n = row === 0 ? perRow : ids.length - perRow;
      const x = GAME_WIDTH / 2 + ((row === 0 ? i : i - perRow) - (n - 1) / 2) * gap;
      const card = this.add.rectangle(0, -h / 2, w + frame * 2, h + frame * 2, evil ? 0x3a0a1a : 0x1a2a5a, 0.92).setStrokeStyle(FRAME_LINE, this.frameColor(false));
      const picture = this.art(cardArt(id, evil), w, h);
      // Under her wherever she stands: she is the cursor, and the rows are close.
      this.addSpot(id, x, rows[row]!, [card, picture]).obj.setDepth(0);
      this.frames.set(id, card);
      bob(this, picture, 4, 900 + i * 37);
    });
    this.player.place(GAME_WIDTH / 2, 425);
    this.pickTitle();
    this.titleBox = { x: 0, y: 0, w: GAME_WIDTH, h: 90, weight: 3 };
    void this.speak(this.instruction());
  }

  /** A frame's line: the side's colour, white while it is lit. */
  private frameColor(lit: boolean): number {
    return lit ? 0xffffff : this.what === 'villain' ? 0xff5a6a : 0xffd23f;
  }

  private instruction(): string {
    return coreLine(episode.choice ? `choose_${this.what}` : `pick_${this.what}`);
  }

  private pickTitle(): void {
    const title = { hero: 'PICK YOUR HERO', ally: 'PICK A FRIEND', villain: 'PICK THE BAD GUY' }[this.what];
    this.add
      .text(GAME_WIDTH / 2, 50, title, { fontFamily: FONT_HEAVY, fontSize: '52px', color: this.what === 'villain' ? '#ff5a6a' : '#ffd23f', stroke: '#000000', strokeThickness: 10 })
      .setOrigin(0.5);
  }

  /** The dialogue box keeps off the heading too: the cards have the floor, the bottom band is the box's. */
  protected override keepOut(): KeepOut[] {
    return [...super.keepOut(), ...(this.titleBox ? [this.titleBox] : [])];
  }

  private buildParked(): void {
    const evil = this.what === 'villain';
    // Persons only: a dad picked here plays his own form (builder, chef); the
    // random cast still gives the other dad a form (item 025).
    const ids = PERSONS.map((c) => c.id).filter((id) => this.what !== 'ally' || id !== episode.hero);
    const extra = this.what === 'ally' ? 'nobody' : this.what === 'villain' ? 'surprise' : null;
    const all = extra ? [...ids, extra] : ids;
    const perRow = Math.ceil(all.length / 2);
    all.forEach((id, i) => {
      const row = i < perRow ? 0 : 1;
      const col = row === 0 ? i : i - perRow;
      const n = row === 0 ? perRow : all.length - perRow;
      const x = GAME_WIDTH / 2 + (col - (n - 1) / 2) * Math.min(180, (GAME_WIDTH - 160) / n);
      const y = row === 0 ? 330 : 560;
      const children: Phaser.GameObjects.GameObject[] = [this.add.ellipse(0, 0, CARD_W * 0.7, 18, 0x000000, 0.3)];
      if (id === 'nobody' || id === 'surprise') {
        const box = this.add.rectangle(0, -CARD_H / 2, CARD_W, CARD_H, id === 'nobody' ? 0x445566 : 0x5a1a7a, 0.9).setStrokeStyle(4, 0xffffff, 0.8);
        const glyph = this.add.text(0, -CARD_H / 2, id === 'nobody' ? '🚫' : '❓', { fontSize: '56px' }).setOrigin(0.5);
        children.push(box, glyph);
      } else {
        children.push(this.art(cardArt(id, evil), CARD_W, CARD_H));
      }
      const spot = this.addSpot(id, x, y, children, null, () => {
        if (id === 'nobody' || id === 'surprise') return;
        void voiceBus.say(nameLine(fighterId(id, evil)), 'bark', { x: spot.x, y: spot.y, bubbleOffset: CARD_H + 10, active: true });
      });
      bob(this, children[children.length - 1] as Phaser.GameObjects.Image, 4, 900 + i * 37);
    });
    this.player.place(GAME_WIDTH / 2, 445);

    this.pickTitle();
    void this.speak(this.instruction());
  }

  protected override hint(): void {
    void this.speak(this.instruction());
  }

  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    if (!episode.choice || this.picked) return;
    if (this.controls.pressed('red') && !this.fadingOut && !isLeaving(this)) {
      this.picked = true;
      this.locked = true;
      sfxSelect();
      this.fadeOutThen(() => pickBack(this));
      return;
    }
    const near = this.nearestSpot();
    if (near !== this.lit) {
      if (this.lit) this.frames.get(this.lit.id)?.setStrokeStyle(FRAME_LINE, this.frameColor(false));
      if (near) this.frames.get(near.id)?.setStrokeStyle(FRAME_LINE + 4, this.frameColor(true));
      this.lit = near;
      this.naming = near;
    }
    if (this.naming && voiceBus.speaking?.priority !== 'instruction') {
      const { x, y, id } = this.naming;
      void voiceBus.barkOver(nameLine(fighterId(id, this.what === 'villain')), { x, y, bubbleOffset: CHOICE.h + 20, active: true });
      this.naming = null;
    }
  }

  /** Free play (item 060): closed, the whole scene is a choice. */
  protected override playOpen(): boolean {
    return false;
  }

  /** Choice mode: her pick, said back; the cast is drawn round it (`chooseAlly`, `chooseVillain`), then on. */
  private async chooseCard(spot: Spot): Promise<void> {
    const evil = this.what === 'villain';
    await this.speak(nameLine(fighterId(spot.id, evil)));
    if (evil) chooseVillain(spot.id);
    else chooseAlly(spot.id);
    await this.wait(300);
    this.done();
  }

  protected choose(spot: Spot): void {
    // One pick per visit: a second press during the name line must not pick
    // again (or re-roll the surprise villain after it was shown).
    if (this.picked) return;
    this.picked = true;
    this.locked = true;
    sfxSelect();
    burst(this, spot.x, spot.y - CARD_H / 2, { count: 50 });
    shockwave(this, spot.x, spot.y - CARD_H / 2, 0xffd23f, 160);
    this.tweens.add({ targets: spot.obj, scale: 1.6, duration: 300, ease: 'Back.easeOut' });

    if (episode.choice) {
      void this.chooseCard(spot);
      return;
    }

    const finish = async () => {
      if (this.what === 'hero') {
        episode.hero = spot.id;
        await this.speak(nameLine(spot.id));
      } else if (this.what === 'ally') {
        episode.ally = spot.id === 'nobody' ? null : spot.id;
        await this.speak(spot.id === 'nobody' ? coreLine('nobody') : nameLine(spot.id));
      } else {
        const random = spot.id === 'surprise';
        episode.villain = random ? randomVillain() : spot.id;
        episode.villainWasRandom = random;
        if (random) {
          await this.speak(coreLine('surprise'));
          flash(this, 0x5a1a7a, 300);
          sfxSummon();
          const v = this.art(charArt(episode.villain, true), CARD_W * 2, CARD_H * 2, spot.x, spot.y);
          v.setDepth(9999);
          burst(this, spot.x, spot.y - CARD_H, { count: 80, colors: [0xff2244, 0x5a1a7a, 0xffffff] });
        }
        await this.speak(nameLine(fighterId(episode.villain, true)));
        // The last pick: the dads' roles and the quest are drawn around the picks.
        castEpisode({ hero: episode.hero, ally: episode.ally, villain: episode.villain });
      }
      await this.wait(300);
      this.done();
    };
    void finish();
  }
}
