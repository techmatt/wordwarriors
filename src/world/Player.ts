/**
 * Her character, walking: the cursor in every room.
 *
 * A card sprite with a soft shadow. Motion is only bob and squash/scale: a
 * walking bounce while moving, a squash when she stops, a little hop on a
 * green press. Movement is substepped one axis at a time against the room's
 * floor rectangle, so she slides along the edge rather than sticking.
 */

import Phaser from 'phaser';

import { FLIP_TO_FACE, WALK_SPEED } from '../config';
import { fitImage } from '../fx/juice';

const MAX_STEP = 6;

/** Her height in rooms, design pixels; everybody else in a room stands to it (`castScale`). */
export const PLAYER_HEIGHT = 130;

export class Player {
  readonly root: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private walkT = 0;
  private moving = false;
  private baseScale: number;
  facing = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    art: string,
    private readonly floor: Phaser.Geom.Rectangle,
    private readonly height = PLAYER_HEIGHT,
  ) {
    this.shadow = scene.add.ellipse(0, 0, height * 0.6, height * 0.16, 0x000000, 0.3);
    this.sprite = fitImage(scene.add.image(0, 0, art).setOrigin(0.5, 1), height * 0.8, height);
    this.baseScale = this.sprite.scale;
    this.root = scene.add.container(x, y, [this.shadow, this.sprite]);
  }

  /** Change what she looks like (her form, as she gets out of bed). */
  setArt(art: string): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setTexture(art);
    fitImage(this.sprite, this.height * 0.8, this.height);
    this.baseScale = this.sprite.scale;
    this.sprite.setScale(this.baseScale * this.facing, this.baseScale);
  }

  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }

  /** The image she is drawn with (test hooks). */
  get art(): string {
    return this.sprite.texture.key;
  }

  /** Teleport (tests and room setup). */
  place(x: number, y: number): void {
    this.root.setPosition(x, y);
  }

  update(move: Phaser.Math.Vector2, dt: number): void {
    const len = move.length();
    const was = this.moving;
    this.moving = len > 0.05;
    if (this.moving) {
      const distance = WALK_SPEED * len * dt;
      const steps = Math.max(1, Math.ceil(distance / MAX_STEP));
      const step = distance / steps;
      const dx = move.x / len;
      const dy = move.y / len;
      for (let i = 0; i < steps; i++) {
        this.root.x = Phaser.Math.Clamp(this.root.x + dx * step, this.floor.left, this.floor.right);
        this.root.y = Phaser.Math.Clamp(this.root.y + dy * step, this.floor.top, this.floor.bottom);
      }
      if (FLIP_TO_FACE && Math.abs(dx) > 0.2) this.facing = dx > 0 ? 1 : -1;
      this.walkT += dt * 11;
      // Walking bounce: hop and a slight squash at the bottom of each step.
      const hop = Math.abs(Math.sin(this.walkT));
      this.sprite.y = -hop * 10 + this.hopY;
      // A wobble (a wrong pick on the move) has the scale while it plays.
      if (!this.wobbling) this.sprite.setScale(this.baseScale * this.facing * (1 + (1 - hop) * 0.05), this.baseScale * (1 - (1 - hop) * 0.05));
    } else {
      if (was) this.land();
      this.walkT += dt * 2.5;
      this.sprite.y = -Math.abs(Math.sin(this.walkT)) * 3 + this.hopY;
    }
    // Draw order follows the feet.
    this.root.setDepth(this.root.y);
  }

  private land(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale * this.facing * 1.12,
      scaleY: this.baseScale * 0.88,
      duration: 90,
      yoyo: true,
      onComplete: () => this.sprite.setScale(this.baseScale * this.facing, this.baseScale),
    });
  }

  /** The press: a happy little hop. */
  hop(): void {
    // Its own offset: update() sets the sprite's y every frame (the walk and
    // idle bob), which wrote over a tween on y, so the hop never showed (item 039).
    this.scene.tweens.killTweensOf(this.hopper);
    this.hopper.y = 0;
    this.scene.tweens.add({ targets: this.hopper, y: -40, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }

  private readonly hopper = { y: 0 };
  private wobbling = false;

  /** Free play's jump height (item 060), set by the room each frame; her shadow stays on the floor. */
  lift = 0;

  private get hopY(): number {
    return this.hopper.y - this.lift;
  }

  /** A no-penalty bump: sheepish wobble. */
  wobble(): void {
    // A sheepish squash-wobble (no rotation: sprites only bob and squash).
    const b = this.baseScale;
    this.wobbling = true;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: { from: b * this.facing * 1.15, to: b * this.facing * 0.9 },
      scaleY: { from: b * 0.88, to: b * 1.1 },
      duration: 90,
      yoyo: true,
      repeat: 3,
      // She may turn while it plays: keep her facing the way she walks.
      onUpdate: () => this.sprite.setScale(Math.abs(this.sprite.scaleX) * this.facing, this.sprite.scaleY),
      onComplete: () => {
        this.wobbling = false;
        this.sprite.setScale(b * this.facing, b);
      },
    });
  }
}
