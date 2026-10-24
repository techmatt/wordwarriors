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
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { PERSONS } from '../../content/battle/roster';
import { coreLine, fighterId, nameLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxSelect, sfxSummon } from '../audio/sfx';
import { FONT_HEAVY, GAME_WIDTH } from '../config';
import { castEpisode, episode, randomVillain, type Step } from '../episode/Episode';
import { bob, burst, flash, shockwave } from '../fx/juice';
import { RoomScene, type Spot } from '../world/RoomScene';

const CARD_W = 100;
const CARD_H = 125;

export class PickScene extends RoomScene {
  private what: 'hero' | 'ally' | 'villain' = 'hero';
  private picked = false;

  constructor() {
    super('Pick');
  }

  override init(data: { step?: Step }): void {
    super.init(data);
    this.what = this.step.kind === 'pick' ? this.step.what : 'hero';
    this.picked = false;
    this.floor = new Phaser.Geom.Rectangle(60, 250, GAME_WIDTH - 120, 380);
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
    return charArt(this.playerCharacter(), false);
  }

  protected build(): void {
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
        children.push(this.art(charArt(id, evil), CARD_W, CARD_H));
      }
      const spot = this.addSpot(id, x, y, children, null, () => {
        if (id === 'nobody' || id === 'surprise') return;
        void voiceBus.say(nameLine(fighterId(id, evil)), 'bark', { x: spot.x, y: spot.y, bubbleOffset: CARD_H + 10, active: true });
      });
      bob(this, children[children.length - 1] as Phaser.GameObjects.Image, 4, 900 + i * 37);
    });
    this.player.place(GAME_WIDTH / 2, 445);

    const title = { hero: 'PICK YOUR HERO', ally: 'PICK A FRIEND', villain: 'PICK THE BAD GUY' }[this.what];
    this.add
      .text(GAME_WIDTH / 2, 50, title, { fontFamily: FONT_HEAVY, fontSize: '52px', color: evil ? '#ff5a6a' : '#ffd23f', stroke: '#000000', strokeThickness: 10 })
      .setOrigin(0.5);
    void this.speak(coreLine(`pick_${this.what}`));
  }

  protected override hint(): void {
    void this.speak(coreLine(`pick_${this.what}`));
  }

  /** Free play (item 060): closed, the whole scene is a choice. */
  protected override playOpen(): boolean {
    return false;
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
