/**
 * One fighter in the arena: a hero, the villain, a summoned minion or a clone.
 *
 * Holds its own sprite (card art, shadow, status overlays), cosmetic hit
 * points, ability cooldowns and status effects. It does not decide anything:
 * `movement.ts` steers it and `BattleScene` chooses when it casts. Motion on
 * the sprite is only bob and squash/stretch (a spin is a card flip in scaleX),
 * per the house rule;
 * no animation frames exist yet, and real art will drop in under the same ids.
 *
 * Arena space: x across, y = depth on the floor (420..670). `lift` is height
 * off the floor (flyers, leaps); the sprite draws at y - lift and the shadow
 * stays on the floor.
 */

import Phaser from 'phaser';

import type { AbilitySpec, FighterSpec, MinionSpec, MoveStyle, Status } from '../../content/battle/types';
import { TEX } from '../fx/textures';
import { fitImage } from '../fx/juice';

export type Team = 'hero' | 'villain';

export const FLOOR_TOP = 430;
export const FLOOR_BOTTOM = 670;

/** A person-sized fighter is this tall on screen at size 1. */
const BASE_HEIGHT = 150;

export interface FighterInit {
  id: string;
  name: string;
  art: string;
  team: Team;
  style: MoveStyle;
  speed: number;
  size: number;
  hp: number;
  abilities: AbilitySpec[];
  ultimate: AbilitySpec | null;
  palette: [number, number];
  kind: 'main' | 'minion' | 'clone' | 'helper';
  /** Voice speaker id for taunts (main fighters only). */
  voice?: string;
  taunts?: string[];
}

export function initFromSpec(spec: FighterSpec, id: string, art: string, team: Team): FighterInit {
  return {
    id,
    name: spec.displayName,
    art,
    team,
    style: spec.style,
    speed: spec.speed,
    size: spec.size,
    hp: spec.hp,
    abilities: spec.abilities,
    ultimate: spec.ultimate,
    palette: spec.palette,
    kind: 'main',
    voice: id,
    taunts: spec.taunts.map((t) => t.key),
  };
}

export function initFromMinion(m: MinionSpec, team: Team, kind: 'minion' | 'helper' = 'minion'): FighterInit {
  return {
    id: m.id,
    name: m.name,
    art: `minion_${m.id}`,
    team,
    style: m.style,
    speed: m.speed,
    size: m.size,
    hp: m.hp,
    abilities: [m.ability],
    ultimate: null,
    palette: m.palette,
    kind,
  };
}

let nextUid = 1;

export class Fighter {
  readonly uid = nextUid++;
  readonly init: FighterInit;
  readonly root: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Container;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Ellipse;
  private overlay: Phaser.GameObjects.GameObject | null = null;
  private shieldBubble: Phaser.GameObjects.Image | null = null;

  x: number;
  y: number;
  lift = 0;
  vx = 0;
  vy = 0;
  hp: number;
  maxHp: number;
  alive = true;
  /** Floored by the Part 1 ultimate: lies still, dizzy, unhurt. */
  floored = false;
  /** Busy with an ability animation; movement pauses. */
  busyUntil = 0;
  cooldowns = new Map<string, number>();
  status: { kind: Status; until: number } | null = null;
  shieldUntil = 0;
  growUntil = 0;
  /** Takes no damage (counter-item moments, cutscenes). */
  invulnerable = false;
  /** Damage multiplier from prep items (the power gem). */
  power = 1;
  /** Per-style steering memory. */
  mem: Record<string, number> = {};
  readonly baseScale: number;
  readonly height: number;
  spin = 0;
  lean = 0;
  /** Clone of which fighter, for Moriarty's tricks. */
  cloneOf: Fighter | null = null;
  lastHitAt = 0;
  private lastFlash = 0;
  /** The battle's simulation clock (ms), which slow-mo and hit-stop scale. */
  now = 0;
  bobPhase = Math.random() * Math.PI * 2;

  constructor(
    readonly scene: Phaser.Scene,
    init: FighterInit,
    x: number,
    y: number,
  ) {
    this.init = init;
    this.x = x;
    this.y = y;
    this.hp = init.hp;
    this.maxHp = init.hp;
    this.height = BASE_HEIGHT * init.size;
    this.shadow = scene.add.ellipse(0, 0, this.height * 0.55, this.height * 0.13, 0x000000, 0.32);
    this.sprite = fitImage(scene.add.image(0, 0, init.art).setOrigin(0.5, 1), this.height * 0.8, this.height);
    this.baseScale = this.sprite.scale;
    this.body = scene.add.container(0, 0, [this.sprite]);
    this.root = scene.add.container(x, y, [this.shadow, this.body]);
    // Stagger cooldowns so a whole team does not fire on the first frame.
    for (const a of init.abilities) this.cooldowns.set(a.id, 0.8 + Math.random() * a.cooldown);
  }

  get team(): Team {
    return this.init.team;
  }
  get isMain(): boolean {
    return this.init.kind === 'main';
  }
  /** Where hits land and bubbles anchor: the middle of the body. */
  get cx(): number {
    return this.x;
  }
  get cy(): number {
    return this.y - this.lift - this.height * 0.5 * this.scaleMul;
  }
  get top(): number {
    return this.y - this.lift - this.height * this.scaleMul;
  }
  get scaleMul(): number {
    return this.growUntil > this.now ? 1.6 : 1;
  }
  get active(): boolean {
    return this.alive && this.root.active;
  }
  /** For bubbles. */
  get bubbleOffset(): number {
    return this.height * this.scaleMul + this.lift;
  }

  /** Can it act (move, cast) right now? */
  canAct(now: number): boolean {
    if (!this.alive || this.floored) return false;
    if (this.status && this.status.until > now && this.status.kind !== 'burn') return false;
    return now >= this.busyUntil;
  }

  setStatus(kind: Status, seconds: number, now: number): void {
    this.status = { kind, until: now + seconds * 1000 };
    this.clearOverlay();
    if (kind === 'pig') {
      this.sprite.setVisible(false);
      this.overlay = fitImage(this.scene.add.image(0, 0, 'prop_pig').setOrigin(0.5, 1), 90, 90);
      this.body.add(this.overlay);
    } else if (kind === 'freeze') {
      this.sprite.setTint(0x9ad8ff);
      const ice = fitImage(this.scene.add.image(0, 6, 'prop_ice_block').setOrigin(0.5, 1), this.height * 0.95, this.height * 1.15).setAlpha(0.75);
      this.overlay = ice;
      this.body.add(ice);
    } else if (kind === 'stun') {
      const stars = this.scene.add.container(0, -this.height - 10);
      for (let i = 0; i < 3; i++) stars.add(this.scene.add.image(Math.cos((i * Math.PI * 2) / 3) * 30, 0, TEX.star).setTint(0xffd23f).setScale(0.8));
      this.scene.tweens.add({ targets: stars, angle: 360, duration: 900, repeat: -1 });
      this.overlay = stars;
      this.body.add(stars);
    }
  }

  clearOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.sprite.setVisible(true).clearTint();
  }

  setShield(seconds: number, color: number, now: number): void {
    this.shieldUntil = now + seconds * 1000;
    this.shieldBubble?.destroy();
    this.shieldBubble = this.scene.add
      .image(0, -this.height * 0.5, TEX.glow)
      .setTint(color)
      .setScale((this.height * 0.85) / 64)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.8);
    this.body.add(this.shieldBubble);
    this.scene.tweens.add({ targets: this.shieldBubble, alpha: 0.45, duration: 300, yoyo: true, repeat: -1 });
  }

  /** Per-frame: expire statuses, place the sprite, bob and lean. */
  updateVisual(now: number, dt: number): void {
    this.now = now;
    if (this.status && this.status.until <= now) {
      this.status = null;
      this.clearOverlay();
    }
    if (this.shieldBubble && this.shieldUntil <= now) {
      this.shieldBubble.destroy();
      this.shieldBubble = null;
    }
    this.root.setPosition(this.x, this.y);
    this.root.setDepth(this.y);
    this.bobPhase += dt * (this.floored ? 1.5 : 5);
    const bobAmt = this.floored ? 0 : Math.sin(this.bobPhase) * 4;
    this.body.y = -this.lift + bobAmt;
    const s = this.scaleMul;
    this.shadow.setScale(Math.max(0.4, 1 - this.lift / 400) * s);
    // Sprites move only by bob and squash/scale (Matt, 2026-10-18), so a "spin"
    // is a card flip: scaleX runs through cos(spin), which reads as twirling
    // without ever rotating the art. It settles to the nearest whole turn.
    const turn = Math.PI * 2;
    const rest = Math.round(this.spin / turn) * turn;
    this.spin += (rest - this.spin) * (1 - Math.pow(0.01, dt));
    if (Math.abs(this.spin - rest) < 0.01) this.spin = 0;
    this.body.rotation = 0;
    if (this.floored) {
      // Sat down, dizzy and wobbling: knocked over, never knocked out. A card
      // lying flat read as "dead", which is not a thing this game shows.
      const wob = Math.sin(this.bobPhase * 2) * 0.06;
      this.body.setScale(s * (1.1 + wob), s * (0.72 - wob));
    } else {
      // Moving fast stretches the card along its motion a little.
      const stretch = Math.min(0.12, Math.abs(this.lean) * 0.5);
      const flip = this.spin === 0 ? 1 : Math.cos(this.spin);
      this.body.setScale(s * (1 + stretch) * flip, s * (1 - stretch * 0.6));
    }
    this.body.x = 0;
  }

  /** Squash on landing or being hit. */
  squash(amount = 0.25): void {
    const sx = this.baseScale;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: sx * (1 + amount),
      scaleY: sx * (1 - amount),
      duration: 90,
      yoyo: true,
      onComplete: () => this.sprite.setScale(sx),
    });
  }

  /** White flash on a hit. */
  flashWhite(): void {
    // At most one flash per 280 ms: a villain hit by a whole team every frame
    // otherwise spends the fight as a white silhouette (seen 2026-10-18).
    const now = performance.now();
    if (now - this.lastFlash < 280) return;
    this.lastFlash = now;
    this.sprite.setTintFill(0xffffff);
    // Wall-clock, not the scene clock: under hit-stop the scene clock nearly
    // stops, and a flash timed on it would leave the card white for seconds.
    window.setTimeout(() => {
      if (!this.sprite.active) return;
      if (this.status?.kind === 'freeze') this.sprite.setTint(0x9ad8ff);
      else this.sprite.clearTint();
    }, 55);
  }

  /** A fading copy of the sprite where it stands: dodgers, dashers, blinkers. */
  afterimage(color = this.init.palette[1]): void {
    const ghost = this.scene.add
      .image(this.x, this.y - this.lift, this.init.art)
      .setOrigin(0.5, 1)
      .setScale(this.sprite.scale * this.scaleMul)
      .setTintFill(color)
      .setAlpha(0.5)
      .setDepth(this.y - 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 1.1, duration: 350, onComplete: () => ghost.destroy() });
  }

  ready(ability: AbilitySpec, now: number): boolean {
    return (this.cooldowns.get(ability.id) ?? 0) <= now / 1000;
  }

  use(ability: AbilitySpec, now: number): void {
    this.cooldowns.set(ability.id, now / 1000 + ability.cooldown * (0.85 + Math.random() * 0.3));
  }

  destroy(): void {
    this.alive = false;
    this.root.destroy();
  }
}
