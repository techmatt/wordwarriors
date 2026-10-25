/**
 * Blend Path. A path of letter tiles, left to right; each says its SOUND as
 * she steps on it. The path ends at 2–3 picture doors; she walks to the door
 * whose picture is the word and presses green. Each right door adds a crate of
 * star ammo (a prize only: the battle no longer uses it).
 *
 * The doors only open once every tile has been stepped on, so the sounds are
 * always heard in order before she chooses. The word itself is spoken only
 * after the right door, as confirmation. Yellow replays the sounds one by one
 * (never blended).
 *
 * Parked (CLAUDE.md): out of the episode, kept on purpose; reach it with ?scene=blend (BootScene).
 */

import Phaser from 'phaser';

import { letterSoundLine, wordLine } from '../../../content/voice/ids';
import { voiceBus } from '../../voice/VoiceBus';
import { sfxStep } from '../../audio/sfx';
import { DEPTH, FONT_COMIC } from '../../config';
import { planRand } from '../../episode/Episode';
import { burst, popIn } from '../../fx/juice';
import { blendRound, type WordItem } from '../../rules/rounds';
import { progress } from '../../state/progress';
import type { Spot } from '../../world/RoomScene';
import { ParkedGame } from './ParkedGame';

const ITEMS = 3;
const TILE_Y = 470;
const TILE_COLORS = [0xff7ad9, 0xffd23f, 0x7ad9ff, 0x8aff8a];

export class BlendPath extends ParkedGame {
  private items: WordItem[] = [];
  private tiles: { letter: string; x: number; img: Phaser.GameObjects.Container; stepped: boolean }[] = [];
  private onTile = -1;
  /** Letters lifted off the tiles as she steps on them; they slide together into the word. */
  private lifted: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('BlendPath');
  }

  protected background(): string {
    return 'room_path';
  }

  protected build(): void {
    this.items = blendRound(progress, ITEMS, planRand);
    this.itemIndex = 0;
    this.makeMeter(ITEMS, 'prop_ammo', '⭐');
    void (async () => {
      await this.narrate('prep_ammo', 'inst_blend');
      this.showItem();
    })();
  }

  private showItem(): void {
    this.clearSpots();
    for (const t of this.tiles) t.img.destroy();
    this.tiles = [];
    for (const l of this.lifted) l.destroy();
    this.lifted = [];
    this.onTile = -1;
    const item = this.items[this.itemIndex]!;
    this.round = `blend:${this.itemIndex}:${item.target}`;
    this.wrongTries = 0;

    [...item.target].forEach((letter, i) => {
      const x = 260 + i * 160;
      const tile = this.add.image(0, 0, 'prop_tile').setDisplaySize(120, 120).setTint(TILE_COLORS[i % 4]!);
      const label = this.add.text(0, -4, letter.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '80px', color: '#1a1030' }).setOrigin(0.5);
      const c = this.add.container(x, TILE_Y, [tile, label]).setDepth(TILE_Y - 60);
      popIn(this, c, 1, i * 120);
      this.tiles.push({ letter, x, img: c, stepped: false });
    });

    // Doors in a column at the end of the path. Disabled until every tile is stepped.
    const ys = item.choices.length === 2 ? [360, 600] : [300, 470, 640];
    item.choices.forEach((word, i) => {
      const door = this.art('prop_door', 120, 165);
      const pic = this.art(`pic_${word}`, 76, 76, 0, -165 + 30 + 76);
      const spot = this.addSpot(word, 1080, ys[i]!, [this.add.ellipse(0, 0, 100, 20, 0x000000, 0.3), door, pic], word === item.target);
      spot.enabled = false;
      spot.obj.setAlpha(0.6);
      popIn(this, spot.obj, 1, 300 + i * 120);
    });
    this.player.place(120, TILE_Y);
    this.time.delayedCall(500, () => this.glowNext());
  }

  override update(time: number, delta: number): void {
    super.update(time, delta);
    if (!this.tiles.length) return;
    // Stepping on a tile sounds it (only on arrival, and only in order of arrival).
    const i = this.tiles.findIndex((t) => Math.abs(this.player.x - t.x) < 60 && Math.abs(this.player.y - TILE_Y) < 70);
    if (i !== this.onTile) {
      this.onTile = i;
      const tile = this.tiles[i];
      if (tile) {
        // Left to right: a tile counts (lifts its letter) only when it is the
        // next one along. Any tile still says its sound when stepped on.
        const next = this.tiles.findIndex((t) => !t.stepped);
        if (i === next) {
          this.lift(tile.letter, tile.x, i);
          tile.stepped = true;
          this.glowNext();
        }
        sfxStep(i);
        this.tweens.add({ targets: tile.img, scale: 1.25, duration: 120, yoyo: true });
        burst(this, tile.x, TILE_Y, { count: 14, speed: 180, colors: [TILE_COLORS[i % 4]!, 0xffffff] });
        void voiceBus.say(letterSoundLine(tile.letter));
        if (this.tiles.every((t) => t.stepped)) this.openDoors();
      }
    }
  }

  /** The next tile to step on glows; the rest wait. */
  private glowNext(): void {
    const next = this.tiles.findIndex((t) => !t.stepped);
    this.tiles.forEach((t, i) => {
      const img = t.img.list[0] as Phaser.GameObjects.Image;
      img.setAlpha(i === next || t.stepped ? 1 : 0.55);
      this.tweens.killTweensOf(t.img);
      t.img.setScale(1);
      if (i === next) this.tweens.add({ targets: t.img, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  /** A copy of the letter floats up off the tile and waits in a row above the path. */
  private lift(letter: string, x: number, i: number): void {
    const t = this.add
      .text(x, TILE_Y - 10, letter.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '84px', color: '#ffffff', stroke: '#1a1030', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud - 1);
    t.setData('i', i);
    this.lifted.push(t);
    this.tweens.add({ targets: t, y: 300, duration: 380, ease: 'Back.easeOut' });
  }

  /**
   * The visual blend: once every sound has been heard, the lifted letters slide
   * together into one word. Nothing is spoken here; the word is still hers to read.
   */
  private slideTogether(): void {
    const n = this.lifted.length;
    const cx = 260 + ((n - 1) * 160) / 2;
    const sorted = [...this.lifted].sort((a, b) => (a.getData('i') as number) - (b.getData('i') as number));
    sorted.forEach((t, i) => {
      this.tweens.add({ targets: t, x: cx + (i - (n - 1) / 2) * 58, scale: 1.15, duration: 450, delay: 150, ease: 'Cubic.easeInOut' });
    });
    this.time.delayedCall(650, () => burst(this, cx, 300, { count: 30, speed: 260, colors: [0xffd23f, 0xffffff] }));
  }

  private openDoors(): void {
    if (this.spots.some((s) => !s.enabled) && this.lifted.length) this.slideTogether();
    for (const s of this.spots) {
      if (s.enabled) continue;
      s.enabled = true;
      s.obj.setAlpha(1);
      burst(this, s.x, s.y - 80, { count: 20, speed: 200 });
    }
  }

  protected override hint(): void {
    void (async () => {
      this.locked = true;
      for (const [i, t] of this.tiles.entries()) {
        this.tweens.add({ targets: t.img, scale: 1.25, duration: 120, yoyo: true });
        sfxStep(i);
        await this.say(letterSoundLine(t.letter));
        await this.wait(250);
      }
      this.locked = false;
    })();
  }

  protected override correctSpot(): Spot | undefined {
    this.openDoors();
    return super.correctSpot();
  }

  protected choose(spot: Spot): void {
    const item = this.items[this.itemIndex]!;
    if (!spot.correct) {
      void this.wrong(spot.obj);
      return;
    }
    void (async () => {
      await this.right('words', item.target, spot.x, spot.y - 90, 0xffd23f, wordLine(item.target));
      this.itemIndex++;
      if (this.itemIndex < this.items.length) {
        this.locked = false;
        this.showItem();
      } else {
        this.clearSpots();
        for (const t of this.tiles) t.img.destroy();
        this.tiles = [];
        for (const l of this.lifted) l.destroy();
        this.lifted = [];
        await this.completePrize('prop_ammo', 'made_ammo');
        this.done();
      }
    })();
  }
}
