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
import { sfxPoof } from '../audio/sfx';
import { TEX } from '../fx/textures';
import { ADULT_HEIGHT } from '../config';
import { isGrownUp } from '../rules/cast';
import { burst, fitImage } from '../fx/juice';

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
  mount?: string;
  trail?: FighterSpec['trail'];
  taunts?: string[];
  /** How tall it is drawn, when not its `size` (a grown-up, item 034); `size` still drives the fight. */
  tall?: number;
}

export function initFromSpec(spec: FighterSpec, id: string, art: string, team: Team): FighterInit {
  return {
    ...(isGrownUp(id) ? { tall: Math.max(spec.size, ADULT_HEIGHT) } : {}),
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
    ...(spec.mount ? { mount: spec.mount } : {}),
    ...(spec.trail ? { trail: spec.trail } : {}),
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
  /** Her green-button hop: a height of its own, so movement code never fights it. */
  hop = 0;
  vx = 0;
  vy = 0;
  hp: number;
  maxHp: number;
  alive = true;
  /** Floored by the Part 1 ultimate: lies still, dizzy, unhurt. */
  floored = false;
  /** Clamped fully on screen once the intro run-in is over. */
  onStage = false;
  /** Busy with an ability animation; movement pauses. */
  busyUntil = 0;
  cooldowns = new Map<string, number>();
  status: { kind: Status; until: number } | null = null;
  /** Height the `bubble` status has floated it up to; drops back to 0 when it pops. */
  private float = 0;
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
    this.height = BASE_HEIGHT * (init.tall ?? init.size);
    this.shadow = scene.add.ellipse(0, 0, this.height * 0.55, this.height * 0.13, 0x000000, 0.32);
    // A grown-up's wider art (the warlock's robe and staff) is not shrunk to fit: he keeps his height.
    this.sprite = fitImage(scene.add.image(0, 0, init.art).setOrigin(0.5, 1), this.height * (init.tall ? 1 : 0.8), this.height);
    this.baseScale = this.sprite.scale;
    this.body = scene.add.container(0, 0, [this.sprite]);
    if (init.mount) this.addMount(init.mount);
    this.root = scene.add.container(x, y, [this.shadow, this.body]);
    if (init.kind === 'main') this.addTrail();
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
    return this.y - this.lift - this.float - this.height * 0.5 * this.scaleMul;
  }
  get top(): number {
    return this.y - this.lift - this.float - this.height * this.scaleMul;
  }
  /** Half the drawn art's width: how far the body reaches either side of `x` (item 034). */
  get bodyHalf(): number {
    return this.sprite.width * this.baseScale * 0.5 * this.scaleMul * 0.9;
  }
  get scaleMul(): number {
    return this.growUntil > this.now ? 1.6 : 1;
  }
  get active(): boolean {
    return this.alive && this.root.active;
  }
  /** For bubbles. */
  get bubbleOffset(): number {
    return this.height * this.scaleMul + this.lift + this.float;
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
    } else if (kind === 'bubble') {
      // Ellie's Bubble Trap: a giant pink bubble round the whole card, which
      // floats it up and away (updateVisual) until it pops.
      const d = this.height * 1.15;
      const bubble = this.scene.add.image(0, -this.height * 0.5, TEX.bubble).setTint(0xffb8e6).setScale(d / 96);
      this.scene.tweens.add({ targets: bubble, scaleX: (d / 96) * 1.06, scaleY: (d / 96) * 0.95, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.overlay = bubble;
      this.body.add(bubble);
    }
  }

  clearOverlay(): void {
    if (this.overlay) this.scene.tweens.killTweensOf(this.overlay);
    if (this.overlay instanceof Phaser.GameObjects.Container) this.scene.tweens.killTweensOf(this.overlay.list);
    this.overlay?.destroy();
    this.overlay = null;
    this.sprite.setVisible(true);
    this.restoreTint();
  }

  setShield(seconds: number, color: number, now: number): void {
    this.shieldUntil = now + seconds * 1000;
    if (this.shieldBubble) this.scene.tweens.killTweensOf(this.shieldBubble);
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
      if (this.status.kind === 'bubble') {
        burst(this.scene, this.x, this.y - this.float - this.height * 0.5, { count: 24, speed: 260, colors: [0xffb8e6, 0x9ad8ff, 0xffffff] });
        sfxPoof();
      }
      this.status = null;
      this.clearOverlay();
    }
    // Bubbled: rise and drift away from the fight, wobbling; popped: drop back down.
    // A giant (Evil Tiamat) only bobs up a little and stays in her half, so her
    // head stays on screen and she does not snap back when it pops.
    if (this.status?.kind === 'bubble') {
      const giant = this.init.size >= 2;
      this.float += ((giant ? 45 : 110) - this.float) * (1 - Math.pow(0.15, dt));
      if (!giant) this.x += (this.team === 'villain' ? 1 : -1) * 45 * dt;
    } else if (this.float > 0) {
      this.float = Math.max(0, this.float - 900 * dt);
    }
    if (this.shieldBubble && this.shieldUntil <= now) {
      this.scene.tweens.killTweensOf(this.shieldBubble);
      this.shieldBubble.destroy();
      this.shieldBubble = null;
    }
    // Keep the whole card on screen, not just its centre.
    if (this.onStage || this.init.kind !== 'main') {
      const half = this.height * 0.4 * this.scaleMul + 10;
      this.x = Math.min(Math.max(this.x, half), 1280 - half);
    }
    this.root.setPosition(this.x, this.y);
    this.root.setDepth(this.y);
    if (this.trailFx) {
      this.trailFx.setPosition(this.x, this.y - this.lift - this.height * 0.5);
      // Just above its own card: an aura, not hidden behind the art.
      this.trailFx.setDepth(this.y + 1);
      this.trailFx.emitting = !this.floored && this.alive;
    }
    this.bobPhase += dt * (this.floored ? 1.5 : 5);
    const bobAmt = this.floored ? 0 : Math.sin(this.bobPhase) * 4;
    const drift = this.status?.kind === 'bubble' ? Math.sin(this.bobPhase * 0.6) * 8 : 0;
    this.body.y = -this.lift - this.hop - this.float - drift + bobAmt;
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

  /**
   * The thing it rides, under its feet, inside the body so it bobs and lifts
   * with it: a drawn flying carpet with tassels, or an emoji (broom, dragon).
   */
  private addMount(mount: string): void {
    const w = this.height * 0.95;
    if (mount === 'carpet') {
      const [main, accent] = this.init.palette;
      const g = this.scene.add.graphics();
      g.fillStyle(main, 1).fillRoundedRect(-w / 2, -8, w, 22, 8);
      g.lineStyle(4, accent, 1).strokeRoundedRect(-w / 2 + 6, -4, w - 12, 14, 5);
      g.fillStyle(accent, 1);
      for (let i = 0; i < 5; i++) g.fillCircle(-w / 2 + 14 + (i * (w - 28)) / 4, 3, 3);
      for (const x of [-w / 2, w / 2]) for (const dy of [-4, 6]) g.fillTriangle(x, dy, x + (x < 0 ? -12 : 12), dy + 4, x, dy + 8);
      this.body.addAt(g, 0);
      this.scene.tweens.add({ targets: g, scaleY: { from: 1, to: 0.8 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const t = this.scene.add.text(0, 6, mount, { fontSize: `${Math.round(w * 0.6)}px` }).setOrigin(0.5, 0.75);
      this.body.addAt(t, 0);
    }
  }

  /** A lasting tint (Scar powered off), restored after flashes and statuses. */
  baseTint: number | null = null;

  restoreTint(): void {
    if (this.baseTint !== null) this.sprite.setTint(this.baseTint);
    else this.sprite.clearTint();
  }

  /** The signature trail, following the fighter's middle. */
  private trailFx: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private addTrail(): void {
    const t = this.init.trail ?? { tint: [this.init.palette[0], this.init.palette[1]], shape: 'spark' as const };
    const tex = { spark: TEX.spark, star: TEX.star, smoke: TEX.smoke, square: TEX.square }[t.shape];
    this.trailFx = this.scene.add.particles(0, 0, tex, {
      speed: { min: 10, max: 50 },
      angle: { min: 0, max: 360 },
      rotate: t.shape === 'square' || t.shape === 'star' ? { min: 0, max: 360 } : 0,
      scale: { start: t.shape === 'smoke' ? 0.5 : 0.7, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 650,
      frequency: 55,
      tint: t.tint,
      blendMode: t.shape === 'smoke' ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-this.height * 0.5, -this.height * 0.55, this.height, this.height * 1.1) } as never,
    });
    this.root.once(Phaser.GameObjects.Events.DESTROY, () => this.trailFx?.destroy());
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
      else this.restoreTint();
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
