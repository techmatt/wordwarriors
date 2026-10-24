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
 *   this, Space held on the victory screen started an episode and then
 *   skipped its title.
 *
 * Buttons are colours, never A/B: `pressed('green')`. Keyboard: arrows move,
 * Space/Enter green, Escape red, Tab yellow (its browser focus move is
 * stopped once for the whole game, in src/main.ts), 3 blue (the digit row or the
 * numpad; 1 and 2 are Dad's, `dadButtons.ts`). Letters are left alone
 * entirely, because the spelling game owns A–Z (see TextEntry). Dev keys are
 * F-keys only. Backquote is dad lock (`dadLock.ts`): while it is on, only the
 * directions report presses (except on the grown-ups page, item 080).
 *
 * Tests drive the same state through `virtualPad` (exposed on the hooks
 * object): `press('green')` lands as a press on the next frame, `stick(x, y)`
 * holds a direction until released.
 */

import Phaser from 'phaser';

import { unlockAudio } from '../audio/context';
import { dadLock } from './dadLock';
import type { PadColorName } from '../config';

export type Button = PadColorName | 'lb' | 'rb' | 'lt' | 'rt' | 'start' | 'back' | 'up' | 'down' | 'left' | 'right';

const BUTTONS: Button[] = ['green', 'red', 'blue', 'yellow', 'lb', 'rb', 'lt', 'rt', 'start', 'back', 'up', 'down', 'left', 'right'];

const DIRECTIONS = new Set<Button>(['up', 'down', 'left', 'right']);

/**
 * Keys physically held, by key code, whatever scene is running (item 039).
 * A scene's keys are made fresh and up; a key held across a scene change
 * goes down in the new scene on the OS's next auto-repeat, which looked like
 * a press: holding Space on the victory screen started an episode and then
 * skipped its title. A new Controls seeds its first frame from this, so a
 * key already held counts as held, never as pressed.
 */
const physicallyHeld = new Set<number>();
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => physicallyHeld.add(e.keyCode), true);
  window.addEventListener('keyup', (e) => physicallyHeld.delete(e.keyCode), true);
  window.addEventListener('blur', () => physicallyHeld.clear());
}

/** Buttons held on any connected pad, read straight from the browser (not Phaser's copy, a frame behind on a scene's first visit). */
function nativePadHeld(): Set<Button> {
  const out = new Set<Button>();
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p?.connected) continue;
    for (const b of BUTTONS) {
      const btn = p.buttons[PAD_INDEX[b]];
      if (btn && (btn.pressed || btn.value > 0.5)) out.add(b);
    }
  }
  return out;
}

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

const STICK_DEADZONE = 0.25;

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
function applyDeadzone(x: number, y: number, dz = STICK_DEADZONE): { x: number; y: number } {
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
  /** Key codes already held when this scene's controls started (see `physicallyHeld`). */
  private readonly carried = new Set<number>();
  /** Pad buttons held since before this scene, as the browser's own pads report them; held, never pressed, until let go. */
  private readonly carriedPad = new Set<Button>();
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
        // Not Shift: five Shift presses open Windows' Sticky Keys dialog (amendment 1579).
        blue: add(K.THREE, K.NUMPAD_THREE),
        up: add(K.UP),
        down: add(K.DOWN),
        left: add(K.LEFT),
        right: add(K.RIGHT),
      };
      kb.on('keydown', (e: KeyboardEvent) => {
        unlockAudio();
        if (/^F\d+$/.test(e.key)) {
          // A held F-key is one press (item 080): its auto-repeat erased everything on a long F8.
          if (!e.repeat) this.devKeys.add(e.key);
          if (e.key !== 'F11' && e.key !== 'F12' && e.key !== 'F5') e.preventDefault();
        }
      });
    }
    scene.input.on('pointerdown', unlockAudio);
    scene.input.gamepad?.on('connected', unlockAudio);
  }

  /** Call first thing in the scene's update(). */
  update(): void {
    // Keys held since before this scene stay held (never a press) until let go.
    if (!this.seeded) for (const c of physicallyHeld) this.carried.add(c);
    for (const c of this.carried) if (!physicallyHeld.has(c)) this.carried.delete(c);
    // Pad buttons too (item 069): on a scene's first visit Phaser's pad starts all up and syncs a
    // frame later, so a button held through the change (A on the victory screen) read as a press.
    if (!this.seeded || this.carriedPad.size) {
      const native = nativePadHeld();
      if (!this.seeded) for (const b of native) this.carriedPad.add(b);
      for (const b of this.carriedPad) if (!native.has(b)) this.carriedPad.delete(b);
    }
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
      for (const key of this.keys[b] ?? []) if (key.isDown || this.carried.has(key.keyCode)) now.add(b);
    }
    for (const b of virtualPad.held) now.add(b);
    for (const b of this.carriedPad) now.add(b);
    const queued = virtualPad.queued.shift();

    // The D-pad and the arrows win over the stick (hunt 11: they steered only while the stick read exactly 0, so
    // a stick resting past its deadzone turned them off), and the virtual stick over both.
    const dx = (now.has('right') ? 1 : 0) - (now.has('left') ? 1 : 0);
    const dy = (now.has('down') ? 1 : 0) - (now.has('up') ? 1 : 0);
    if (virtualPad.stickX || virtualPad.stickY) {
      sx = virtualPad.stickX;
      sy = virtualPad.stickY;
    } else if (dx || dy) {
      sx = dx;
      sy = dy;
    }
    this.move.set(sx, sy);
    if (this.move.length() > 1) this.move.normalize();

    this.edges.clear();
    if (this.seeded) {
      for (const b of now) if (!this.prev.has(b)) this.edges.add(b);
    }
    if (queued) this.edges.add(queued);
    // Dad lock: she can walk, but no press does anything. Held buttons still
    // seed `prev`, so one held through the unlock does not fire either.
    // The grown-ups page is Dad's own (item 080): its green, red and Esc work under the lock.
    if (dadLock.locked && this.scene.scene.key !== 'Parent') for (const b of this.edges) if (!DIRECTIONS.has(b)) this.edges.delete(b);
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

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    // Alive as the browser sees it now (hunt 11): Phaser's pad keeps the snapshot it was made from, connected
    // for good, so an unplugged pad (or a flat battery) kept its last stick and buttons, and she walked on.
    const live = (p: Phaser.Input.Gamepad.Gamepad) => {
      const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null;
      return pads ? Boolean(pads[p.index]?.connected) : p.connected;
    };
    const current = this.padIndex >= 0 ? gp.getPad(this.padIndex) : undefined;
    if (current && live(current)) return current;
    const first = gp.getAll().find((p) => live(p));
    this.padIndex = first ? first.index : -1;
    return first ?? null;
  }
}
