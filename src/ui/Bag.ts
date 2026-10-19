/**
 * The backpack, top left: what she has fetched this episode.
 *
 * A bag icon with the fetched things lined up small beside it: the picture of
 * each key word she found in a side room (`episode.fetched`), then the
 * counter once she has found it (`counterArt()`: its picture, or the
 * villain's named item). They are her battle items, so seeing them pile
 * up is the point of the house: every room she finishes puts something here.
 *
 * `receive()` is the moment of getting one: the thing flies from where it was
 * found into the bag with a sparkle trail, the bag gulps, and it appears in
 * the row. The caller updates the episode; the bag only draws.
 */

import Phaser from 'phaser';

import { sfxSelect, sfxWhoosh } from '../audio/sfx';
import { DEPTH } from '../config';
import { counterArt, episode } from '../episode/Episode';
import { burst, fitImage } from '../fx/juice';
import { TEX } from '../fx/textures';

const BAG_X = 62;
const BAG_Y = 62;
const BAG_SIZE = 86;
const ITEM_SIZE = 50;
const ITEM_GAP = 58;

export class Bag {
  private readonly bag: Phaser.GameObjects.Image;
  private readonly bagScale: number;
  private shown: string[] = [];
  private items: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    const plate = scene.add.circle(0, 0, BAG_SIZE * 0.6, 0x0e0b1a, 0.55).setStrokeStyle(3, 0xffffff, 0.6);
    this.bag = fitImage(scene.add.image(0, 0, 'prop_bag'), BAG_SIZE, BAG_SIZE);
    this.bagScale = this.bag.scale;
    scene.add.container(BAG_X, BAG_Y, [plate, this.bag]).setDepth(DEPTH.hud);
    this.refresh();
  }

  /** What the episode says she has, in order. */
  static contents(): string[] {
    const arts = episode.fetched.map((w) => `pic_${w}`);
    if (episode.made.item) arts.push(counterArt());
    return arts;
  }

  /** Redraw the row from the episode. */
  refresh(): void {
    for (const i of this.items) i.destroy();
    this.items = [];
    this.shown = [];
    for (const art of Bag.contents()) this.addItem(art, false);
  }

  /** Where the next item will sit, in scene coordinates. */
  private slotPos(i: number): { x: number; y: number } {
    return { x: BAG_X + BAG_SIZE * 0.6 + 16 + i * ITEM_GAP, y: BAG_Y };
  }

  private addItem(art: string, pop: boolean): void {
    const p = this.slotPos(this.shown.length);
    const img = fitImage(this.scene.add.image(p.x, p.y, art), ITEM_SIZE, ITEM_SIZE).setDepth(DEPTH.hud);
    this.items.push(img);
    this.shown.push(art);
    if (pop) {
      const s = img.scale;
      img.setScale(0);
      this.scene.tweens.add({ targets: img, scale: s, duration: 320, ease: 'Back.easeOut' });
    }
  }

  /**
   * Fly `art` from (x, y) into the bag. Resolves when it has landed. If the
   * row does not already show it (the caller may have updated the episode
   * first, or not), it is added.
   */
  receive(art: string, x: number, y: number): Promise<void> {
    const scene = this.scene;
    sfxWhoosh();
    const img = fitImage(scene.add.image(x, y, art), 120, 120).setDepth(DEPTH.sparkles);
    const end = Math.min(ITEM_SIZE / img.width, ITEM_SIZE / img.height);
    const trail = scene.add
      .particles(0, 0, TEX.star, {
        follow: img,
        speed: { min: 10, max: 60 },
        scale: { start: 0.6, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 500,
        frequency: 25,
        tint: [0xffd23f, 0xffffff, 0xff9ad5],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.sparkles - 1);
    // Up a little first, then an arc into the bag.
    const start = img.scale;
    return new Promise<void>((resolve) => {
      scene.tweens.add({
        targets: img,
        scale: start * 1.25,
        y: y - 50,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => {
          scene.tweens.add({
            targets: img,
            x: BAG_X,
            y: BAG_Y,
            scale: end * 0.8,
            duration: 650,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              img.destroy();
              trail.stop();
              scene.time.delayedCall(600, () => trail.destroy());
              this.gulp();
              const want = Math.max(1, Bag.contents().filter((a) => a === art).length);
              if (this.shown.filter((a) => a === art).length < want) this.addItem(art, true);
              scene.time.delayedCall(300, () => resolve());
            },
          });
        },
      });
    });
  }

  /** The bag swallows something: a squash and a pop of sparkles. */
  private gulp(): void {
    sfxSelect();
    const b = this.bagScale;
    this.scene.tweens.add({
      targets: this.bag,
      scaleX: b * 1.3,
      scaleY: b * 0.8,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.bag.setScale(b),
    });
    burst(this.scene, BAG_X, BAG_Y, { count: 26, speed: 260, depth: DEPTH.hud + 1, gravity: 200 });
  }
}
