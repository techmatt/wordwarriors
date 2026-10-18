/**
 * The shared input layer: the first connected pad, the keyboard, and a virtual
 * pad for tests, read once per frame into one state every scene uses.
 *
 * Ported from Seraphina's RoomScene input code (audit: "logic right, buried in
 * a 3,949-line scene") with every gap the audit found fixed:
 *
 * - **Any connected pad**, not just `getPad(0)`: the first pad that is
 *   connected, re-chosen when one disconnects.
 * - **D-pad, shoulders, triggers, Start/Back** as well as the face buttons.
 * - **Deadzone rescaled**: past the 0.25 deadzone the stick ramps from 0, so
 *   speed no longer jumps from 0 to a quarter.
 * - **Every button read every frame with no short-circuit**, and pad edges
 *   hand-detected from our own previous-frame state.
 * - **Re-seeded on scene enter**: `Controls` is created in each scene's
 *   `create()`, and its first frame records what is already held without
 *   reporting it as a press. Word Warriors changes scene constantly; without
 *   this, the green press that picked a hero would also pick an ally.
 *
 * Buttons are colours, never A/B: `pressed('green')`. Keyboard: arrows move,
 * Space/Enter green, Escape red, Tab yellow, Shift blue. Letters are left alone
 * entirely, because the spelling game owns A–Z (see TextEntry). Dev keys are
 * F-keys only.
 *
 * Tests drive the same state through `virtualPad` (exposed on the hooks
 * object): `press('green')` lands as a press on the next frame, `stick(x, y)`
 * holds a direction until released.
 */

import Phaser from 'phaser';

import { unlockAudio } from '../audio/context';
import type { PadColorName } from '../config';

export type Button = PadColorName | 'lb' | 'rb' | 'lt' | 'rt' | 'start' | 'back' | 'up' | 'down' | 'left' | 'right';

const BUTTONS: Button[] = ['green', 'red', 'blue', 'yellow', 'lb', 'rb', 'lt', 'rt', 'start', 'back', 'up', 'down', 'left', 'right'];

/** Standard-mapping indices (Xbox 360 pad in Chrome). */
const PAD_INDEX: Record<Button, number> = {
  green: 0,
  red: 1,
  blue: 2,
  yellow: 3,
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  back: 8,
  start: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
};

export const STICK_DEADZONE = 0.25;

/** The test-only input source. Shared by every Controls instance. */
export const virtualPad = {
  stickX: 0,
  stickY: 0,
  held: new Set<Button>(),
  /** Presses queued by tests, delivered one frame each. */
  queued: [] as Button[],
  press(b: Button) {
    this.queued.push(b);
  },
  stick(x: number, y: number) {
    this.stickX = x;
    this.stickY = y;
  },
  release() {
    this.stickX = 0;
    this.stickY = 0;
    this.held.clear();
  },
};

/** Rescale past the deadzone so output ramps from 0 at the edge to 1 at full tilt. */
export function applyDeadzone(x: number, y: number, dz = STICK_DEADZONE): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len <= dz) return { x: 0, y: 0 };
  const scaled = Math.min(1, (len - dz) / (1 - dz));
  return { x: (x / len) * scaled, y: (y / len) * scaled };
}

export class Controls {
  private readonly scene: Phaser.Scene;
  private keys: Partial<Record<Button, Phaser.Input.Keyboard.Key[]>> = {};
  private prev = new Set<Button>();
  private down = new Set<Button>();
  private edges = new Set<Button>();
  private seeded = false;
  private padIndex = -1;
  /** Movement vector this frame, length 0..1. */
  readonly move = new Phaser.Math.Vector2();
  /** F-key presses this frame (dev only), by key name. */
  readonly devKeys = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      const add = (...codes: number[]) => codes.map((c) => kb.addKey(c, false));
      this.keys = {
        green: add(K.SPACE, K.ENTER),
        red: add(K.ESC),
        yellow: add(K.TAB),
        blue: add(K.SHIFT),
        up: add(K.UP),
        down: add(K.DOWN),
        left: add(K.LEFT),
        right: add(K.RIGHT),
      };
      kb.on('keydown', (e: KeyboardEvent) => {
        unlockAudio();
        if (/^F\d+$/.test(e.key)) {
          this.devKeys.add(e.key);
          if (e.key !== 'F11' && e.key !== 'F12' && e.key !== 'F5') e.preventDefault();
        }
        if (e.key === 'Tab') e.preventDefault();
      });
    }
    scene.input.on('pointerdown', unlockAudio);
    scene.input.gamepad?.on('connected', unlockAudio);
  }

  /** Call first thing in the scene's update(). */
  update(): void {
    const pad = this.pad();
    const now = new Set<Button>();
    let sx = 0;
    let sy = 0;

    if (pad) {
      for (const b of BUTTONS) {
        const btn = pad.buttons[PAD_INDEX[b]];
        // Triggers are analogue; count half-pulled as held.
        if (btn && (btn.pressed || btn.value > 0.5)) now.add(b);
      }
      const s = applyDeadzone(pad.leftStick.x, pad.leftStick.y);
      sx = s.x;
      sy = s.y;
    }

    for (const b of BUTTONS) {
      for (const key of this.keys[b] ?? []) if (key.isDown) now.add(b);
    }
    for (const b of virtualPad.held) now.add(b);
    const queued = virtualPad.queued.shift();

    // D-pad and arrows steer when the stick is idle.
    if (sx === 0 && sy === 0) {
      sx = (now.has('right') ? 1 : 0) - (now.has('left') ? 1 : 0);
      sy = (now.has('down') ? 1 : 0) - (now.has('up') ? 1 : 0);
      if (virtualPad.stickX || virtualPad.stickY) {
        sx = virtualPad.stickX;
        sy = virtualPad.stickY;
      }
    }
    this.move.set(sx, sy);
    if (this.move.length() > 1) this.move.normalize();

    this.edges.clear();
    if (this.seeded) {
      for (const b of now) if (!this.prev.has(b)) this.edges.add(b);
    }
    if (queued) this.edges.add(queued);
    this.seeded = true;
    this.prev = now;
    this.down = now;
  }

  /** Became pressed this frame. */
  pressed(b: Button): boolean {
    return this.edges.has(b);
  }

  /** Held right now. */
  held(b: Button): boolean {
    return this.down.has(b);
  }

  /** Any face button pressed this frame. */
  anyFace(): boolean {
    return this.pressed('green') || this.pressed('red') || this.pressed('blue') || this.pressed('yellow') || this.pressed('start');
  }

  /** Consume a dev F-key press. */
  dev(key: string): boolean {
    const hit = this.devKeys.has(key);
    this.devKeys.delete(key);
    return hit;
  }

  /** Call at the end of update(), so dev keys never leak into the next frame. */
  endFrame(): void {
    this.devKeys.clear();
  }

  get padConnected(): boolean {
    return this.pad() !== null;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    const current = this.padIndex >= 0 ? gp.getPad(this.padIndex) : undefined;
    if (current?.connected) return current;
    const first = gp.getAll().find((p) => p.connected);
    this.padIndex = first ? first.index : -1;
    return first ?? null;
  }
}
