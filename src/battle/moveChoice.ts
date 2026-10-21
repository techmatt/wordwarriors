/**
 * The battle's move choice: the frozen-fight word pick. 2–3 move words stand
 * on the arena floor as glowing pads, each with its word on a sign; she walks
 * her hero (on real time, the fight nearly frozen) onto one and presses green.
 * Only the right word closes the choice; a wrong one wiggles, giggles and is
 * named, as often as it takes.
 *
 * BattleScene owns one and drives it: the director's `moveChoice()` freezes
 * the fight, `open()`s it and awaits her right pick, then `close()`s it and
 * fires the super. Every frame it calls `update()` (before the fighters) and
 * `holdHero()` (after them, so her hero stays where she walked).
 */

import Phaser from 'phaser';

import { moveKey, narratorLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxSelect, sfxWrong } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_HEIGHT, GAME_WIDTH, REACH, STICK_HINT_MS, WALK_SPEED } from '../config';
import { episode, narrator } from '../episode/Episode';
import { TEX } from '../fx/textures';
import type { BattleInfo } from '../hookState';
import type { Controls } from '../input/Controls';
import { dadLock } from '../input/dadLock';
import { makeButtonDot } from '../ui/ButtonDot';
import { fitText } from '../ui/fitText';
import { STICK_HINT_OFFSET, makeStickHint } from '../ui/stickHint';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter } from './Fighter';
import { ARENA_LEFT, ARENA_RIGHT } from './movement';

/** The move pads' glow. One colour for all: the word on the sign is the choice, never a colour. */
const PAD_GLOW = 0x7ad9ff;
/** How far a pad's word sign stands above its ring. */
const SIGN_RISE = 215;
/** Least distance between two pads' columns: a sign is 230 wide, so signs never touch. */
const PAD_GAP = 270;
/** How long her team takes to step off the pad row when a choice opens (wall-clock ms; the fight's clock is frozen). */
const STEP_BACK_MS = 450;

/** What the battle lends the move choice. */
export interface ChoiceHost {
  readonly stage: Phaser.Scene;
  readonly heroes: readonly Fighter[];
  readonly villain: Fighter;
  readonly fighters: readonly Fighter[];
  readonly controls: Controls;
  /** The fight style holds everyone in place (a contest's stage): pads stay on her side, nobody steps back. */
  readonly anchored: boolean;
  /** Say a narrator line, guarded by the scene's run. */
  say(key: string): Promise<boolean>;
  /** Drop `p` if this run of the scene ends first (SceneGen). */
  guard<T>(p: Promise<T>): Promise<T>;
  /** No free-play charge, jump or shot carries into the choice. */
  stopPlay(): void;
}

/** A move word standing in the arena as a place she walks to. */
interface MovePad {
  word: string;
  x: number;
  y: number;
  /** The floor ring and its glow, pulsed by hand on wall-clock time. */
  ring: Phaser.GameObjects.Container;
  /** The word on its sign, above the fighters. */
  sign: Phaser.GameObjects.Container;
  /** Wall-clock ms its pop-in starts. */
  bornAt: number;
  /** Wall-clock ms of its last "not that one" wiggle. */
  wiggleAt?: number;
}

interface Choice {
  words: string[];
  right: string;
  /** Which choice this is (`move:<part>:<n>`), for the misses kept in `episode.house.misses`. */
  key: string;
  /** Everything the choice put on screen, destroyed when it closes. */
  objs: Phaser.GameObjects.GameObject[];
  /** The fight's effects faded back while it is frozen, and their alpha before. */
  veiled: { o: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.AlphaSingle; alpha: number }[];
  pads: MovePad[];
  /** The pad she is standing at (within REACH), or null. */
  near: MovePad | null;
  /** The green dot over the lit pad. */
  dot: Phaser.GameObjects.Container;
  /** The "I am here" ring at her hero's feet. */
  here: Phaser.GameObjects.Ellipse;
  open: boolean;
  /** Wall-clock time the word was last said. */
  promptedAt: number;
  /**
   * Quiet seconds since the word was last said, on the clamped frame clock her
   * walk uses, for the idle re-prompt (item 034): only while the pads are open,
   * nobody talks and she is not walking, so it never repeats the word while
   * she is on her way to a pad.
   */
  idle: number;
  /**
   * Where her hero is during the choice, and how high she floats. Written back
   * every frame, so a leap, dash or spin that was mid-flight when the choice
   * opened (its timer still ticking on the frozen clock) cannot pull her off it.
   */
  at: { x: number; y: number; lift: number };
  /** Wrong pads she has picked so far in this choice. */
  misses: number;
  /** Seconds she has stood still while the pads are open (not reset by the re-prompt): the stick hint's clock (item 043, M5). */
  still: number;
  /** The stick hint beside her hero, while she stands still. */
  stickHint: Phaser.GameObjects.Container | null;
  /** Her team stepping off the pad row (item 043, M6): each from where it stood to a spot no sign or ring covers, on wall-clock time from `stepAt`. */
  stepBack: { f: Fighter; from: { x: number; y: number }; to: { x: number; y: number } }[];
  stepAt: number;
  resolve: () => void;
}

export class MoveChoice {
  private current: Choice | null = null;

  constructor(private readonly host: ChoiceHost) {}

  /** A choice is open: her hero is hers to walk. */
  get active(): boolean {
    return this.current !== null;
  }

  /** A new run of the scene: no choice. */
  reset(): void {
    this.current = null;
  }

  /**
   * Put the pads up for `words` and wait for `right`: resolves with her misses
   * once she picks it. The fight is already frozen and `me` freed and placed at `at`.
   */
  open(words: string[], right: string, key: string, me: Fighter, at: { x: number; y: number; lift: number }): Promise<number> {
    const scene = this.host.stage;
    const objs: Phaser.GameObjects.GameObject[] = [];
    // A light dim behind the fighters (not over them), so the pads and signs read.
    objs.push(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0018, 0.3).setDepth(FLOOR_TOP - 3.5));
    objs.push(
      scene.add
        .text(GAME_WIDTH / 2, 110, 'PICK A MOVE!', { fontFamily: '"Arial Black", sans-serif', fontSize: '56px', color: '#ffd23f', stroke: '#000000', strokeThickness: 12 })
        .setOrigin(0.5)
        .setDepth(DEPTH.overlay),
    );
    const pads = this.padSpots(words.length, me).map((p, i) => this.makePad(words[i]!, p.x, p.y, performance.now() + 120 + i * 140));
    for (const p of pads) objs.push(p.ring, p.sign);
    const dot = makeButtonDot(scene, 0, 0, 'green', 22, false).setDepth(DEPTH.prompt).setVisible(false);
    objs.push(dot);
    // "I am here": a white ring at her hero's feet, so she finds herself among the signs.
    const here = scene.add.ellipse(me.x, me.y, 150, 52).setStrokeStyle(6, 0xffffff, 0.95).setDepth(DEPTH.prompt - 6);
    objs.push(here);
    // The fight's effects fade back while it is frozen (item 039: Jörmungandr's
    // coil, timed on the scene clock, circled over the pads for the whole choice).
    const veiled: Choice['veiled'] = [];
    // A dash's white afterimage fades in 350 ms of the frozen clock, about nine
    // real seconds: it stood over her ally as a white silhouette (item 039).
    for (const o of [...scene.children.list]) if (o.getData('afterimage')) o.destroy();
    for (const o of scene.children.list) {
      const d = (o as unknown as { depth: number }).depth;
      const a = o as unknown as Phaser.GameObjects.Components.AlphaSingle;
      if (d >= DEPTH.fx && d < DEPTH.prompt - 10 && typeof a.alpha === 'number' && !objs.includes(o) && o !== me.root) {
        veiled.push({ o: o as never, alpha: a.alpha });
        a.setAlpha(a.alpha * 0.2);
      }
    }

    return new Promise<number>((resolve) => {
      const c: Choice = { words, right, key, objs, veiled, pads, near: null, dot, here, open: false, promptedAt: 0, idle: 0, at, misses: episode.house.misses?.[key] ?? 0, still: 0, stickHint: null, stepBack: this.teamStepBack(me, pads), stepAt: performance.now(), resolve: () => resolve(c.misses) };
      this.current = c;
      // No charge, jump or shot in flight carries into the choice (holdHero zeroes the hop).
      this.host.stopPlay();
      void (async () => {
        await this.host.say('move_pick');
        await this.host.say(moveKey('use_move', right));
        if (this.current) {
          this.current.open = true;
          this.current.promptedAt = performance.now();
          this.current.idle = 0;
        }
      })();
    });
  }

  /** Take everything the choice put up down again, and give the fight's effects back their alpha. */
  close(): void {
    const c = this.current;
    if (!c) return;
    for (const o of c.objs) o.destroy();
    // Back as they were, unless something has set their alpha since (a fade-out finishing).
    for (const v of c.veiled) if (v.o.active && Math.abs(v.o.alpha - v.alpha * 0.2) < 0.01) v.o.setAlpha(v.alpha);
    this.current = null;
  }

  /** For the tests (`hookState.battle.choice`). */
  info(): BattleInfo['choice'] {
    const c = this.current;
    const heroes = this.host.heroes;
    return c
      ? {
          words: c.words,
          right: c.right,
          open: c.open,
          misses: c.misses,
          spots: c.pads.map((p) => ({ word: p.word, x: p.x, y: p.y })),
          stickHint: Boolean(c.stickHint?.active),
          // Item 043, M6: each sign's plate and each teammate's body, in screen coordinates.
          signs: c.pads.map((p) => [p.x - 115, p.y - SIGN_RISE - 50, p.x + 115, p.y - SIGN_RISE + 50]),
          team: heroes.filter((f) => f !== heroes[0] && f.active).map((f) => ({ id: f.init.id, box: [f.x - f.bodyHalf, f.top, f.x + f.bodyHalf, f.y] })),
        }
      : null;
  }

  /**
   * Where the pads go: one row across the floor, so every sign stands right
   * above its own ring and no two pads share a column (a stacked pair put the
   * lower pad's word over the upper ring). The row and the columns are picked
   * to keep rings and signs clear of her hero and of the villain (and the
   * other big fighters), so she never walks into a fighter's card to choose.
   */
  private padSpots(n: number, me: Fighter): { x: number; y: number }[] {
    // Minions too (item 039: a pad under a crowd of skeletons or dragon babies did not read as a place to stand).
    const avoid = [me, this.host.villain, ...this.host.fighters.filter((f) => f.active)].filter((f, i, a) => f?.active && a.indexOf(f) === i);
    /** How far a pad at (x, y) stays from every fighter: ring against feet, sign against body. */
    const clearance = (x: number, y: number): number => {
      let d = Infinity;
      for (const f of avoid) {
        // From the edge of the body, not its middle: a giant's pad stood inside her (item 034).
        d = Math.min(d, Math.hypot(Math.max(0, Math.abs(x - f.x) - f.bodyHalf), (y - f.y) * 1.5), Math.hypot(Math.max(0, Math.abs(x - f.cx) - f.bodyHalf), y - SIGN_RISE - f.cy));
      }
      return d;
    };
    let xs: number[] = [];
    for (let x = ARENA_LEFT + 110; x <= ARENA_RIGHT - 110; x += 40) xs.push(x);
    // A contest keeps its pads on her side of the villain (item 034): a pad
    // past him had her fire her super from inside his coils, off her rope.
    // When her side is too narrow for them all, anywhere but on him.
    if (this.host.anchored) {
      const v = this.host.villain;
      const fits = (c: number[]) => c.length > 0 && Math.abs(c[c.length - 1]! - c[0]!) >= (n - 1) * PAD_GAP;
      const mine = xs.filter((x) => (me.x < v.x ? x < v.x - v.bodyHalf - 100 : x > v.x + v.bodyHalf + 100));
      const offHim = xs.filter((x) => Math.abs(x - v.x) > v.bodyHalf + 90);
      if (fits(mine)) xs = mine;
      else if (fits(offHim)) xs = offHim;
    }
    let best: { x: number; y: number }[] = [];
    let bestScore = -Infinity;
    // Not 640: a pad there sits under the caption ribbon while its word is said.
    for (const y of [480, 560]) {
      // Every set of n columns at least PAD_GAP apart (n is 2 or 3, so this is small).
      const walk = (from: number, picked: number[]): void => {
        if (picked.length === n) {
          const clear = Math.min(...picked.map((x) => clearance(x, y)));
          let gap = Infinity;
          for (let i = 1; i < picked.length; i++) gap = Math.min(gap, picked[i]! - picked[i - 1]!);
          // Clear enough counts the same however far; then spread out, then a little luck.
          const score = Math.min(clear, 240) * 3 + Math.min(gap, 420) * 0.25 + Math.random() * 25;
          if (score > bestScore) {
            bestScore = score;
            best = picked.map((x) => ({ x, y }));
          }
          return;
        }
        for (let i = from; i < xs.length; i++) {
          const x = xs[i]!;
          if (picked.length && x - picked[picked.length - 1]! < PAD_GAP) continue;
          walk(i + 1, [...picked, x]);
        }
      };
      walk(0, []);
    }
    return best;
  }

  /** One move word as a place: a glowing rune ring on the floor and its word on a sign above. */
  private makePad(word: string, x: number, y: number, bornAt: number): MovePad {
    const add = this.host.stage.add;
    const glow = add.image(0, 0, TEX.glow).setTint(PAD_GLOW).setScale(3.2, 1.3).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
    const disc = add.ellipse(0, 0, 190, 70, PAD_GLOW, 0.3).setStrokeStyle(6, 0xffffff, 0.9);
    const inner = add.ellipse(0, 0, 140, 46).setStrokeStyle(3, PAD_GLOW, 1);
    const runes = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return add.circle(Math.cos(a) * 82, Math.sin(a) * 29, 5, 0xffffff, 0.9);
    });
    const ring = add.container(x, y, [glow, disc, inner, ...runes]).setDepth(FLOOR_TOP - 3);
    const sy = y - SIGN_RISE;
    const plate = add.rectangle(0, 0, 230, 100, 0xfff8e8, 0.97).setStrokeStyle(7, PAD_GLOW);
    const stake = add.rectangle(0, 62, 10, 26, 0xfff8e8, 0.9);
    // Shrunk to the plate if long (BLAST ran over its edges, item 039).
    const label = fitText(
      add.text(0, 0, word.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '76px', color: '#1a1030' }).setOrigin(0.5),
      210,
      92,
    );
    const sign = add.container(x, sy, [stake, plate, label]).setDepth(DEPTH.prompt - 10);
    // What she reads and walks to: the bug-hunt checker's probe checks nothing covers them (item 059).
    sign.setData('qaTarget', `sign_${word}`);
    // The disc, not the ring's container: its soft glow spreads twice as wide and is not what she walks onto.
    disc.setData('qaTarget', `pad_${word}`);
    // Popped in from nothing by update(), on wall-clock time.
    sign.setScale(0);
    ring.setScale(0);
    return { word, x, y, ring, sign, bornAt };
  }

  /**
   * Where her teammates stand while a choice is open (item 043, M6): a tall
   * ally behind a sign disappeared. Each one standing where a sign or a ring
   * would cover them (or they it) steps to the nearest spot that is clear of
   * every sign, every ring, her hero and each other. Not in a contest, whose
   * staging holds everyone in place (a rope, a race lane).
   */
  private teamStepBack(me: Fighter, pads: MovePad[]): Choice['stepBack'] {
    if (this.host.anchored) return [];
    // The plate (230 x 100) and its stake, with a margin.
    const signs = pads.map((p) => new Phaser.Geom.Rectangle(p.x - 125, p.y - SIGN_RISE - 60, 250, 150));
    const taken: { x: number; y: number }[] = [{ x: me.x, y: me.y }];
    const out: Choice['stepBack'] = [];
    for (const f of this.host.heroes) {
      if (f === me || !f.active) continue;
      const h = Math.max(60, f.y - f.top);
      const half = f.bodyHalf;
      /** How much of the body the signs would cover there, as a share of it; a ring underfoot or a crowded spot counts as covered. */
      const covered = (x: number, y: number): number => {
        const body = new Phaser.Geom.Rectangle(x - half, y - h, half * 2, h);
        let area = 0;
        for (const sg of signs) {
          const o = Phaser.Geom.Rectangle.Intersection(sg, body);
          area += Math.max(0, o.width) * Math.max(0, o.height);
        }
        const ring = pads.some((p) => Math.abs(x - p.x) < 95 + half * 0.5 && Math.abs(y - p.y) < 60);
        const crowd = taken.some((t) => Math.abs(x - t.x) < 110 && Math.abs(y - t.y) < 50);
        return area / (body.width * body.height) + (ring || crowd ? 1 : 0);
      };
      // The nearest clear spot; when the pads fill the row (three signs across it),
      // the least covered one, so as much of them shows as the floor allows.
      let to = { x: f.x, y: f.y };
      if (covered(f.x, f.y) > 0) {
        let best = Infinity;
        for (let x = ARENA_LEFT + 40; x <= ARENA_RIGHT - 40; x += 20) {
          for (let y = FLOOR_TOP + 20; y <= FLOOR_BOTTOM; y += 20) {
            const cost = covered(x, y) * 10_000 + Math.hypot(x - f.x, (y - f.y) * 1.5);
            if (cost < best) {
              best = cost;
              to = { x, y };
            }
          }
        }
      }
      taken.push(to);
      if (to.x !== f.x || to.y !== f.y) out.push({ f, from: { x: f.x, y: f.y }, to });
    }
    return out;
  }

  /** Pick a word: green on a lit pad, or F4. Only the right word closes the choice. */
  private pick(word: string): void {
    const c = this.current;
    if (!c || !c.open) return;
    c.open = false;
    if (word === c.right) {
      c.resolve();
      return;
    }
    void this.miss(c, word);
  }

  /**
   * A wrong pad: nothing fires and the fight stays frozen. A wiggle and a
   * giggle on the pad, then the partner says what it was and what to find
   * (her pick has been made, so its word may be said), and the pads open again.
   */
  private async miss(c: Choice, word: string): Promise<void> {
    c.misses++;
    (episode.house.misses ??= {})[c.key] = c.misses;
    sfxWrong();
    const pad = c.pads.find((p) => p.word === word);
    if (pad) pad.wiggleAt = performance.now();
    const n = narrator();
    await this.host.guard(voiceBus.sequence([narratorLine(n, moveKey('not_move', c.right)), narratorLine(n, moveKey('was_move', word)), narratorLine(n, moveKey('find_move', c.right))]));
    if (this.current !== c) return;
    c.open = true;
    c.promptedAt = performance.now();
    c.idle = 0;
  }

  /** Pin her hero to where she walked in the choice: no leftover move timer or hop moves her. */
  holdHero(): void {
    const c = this.current;
    const me = this.host.heroes[0];
    if (!c || !me?.active) return;
    me.x = c.at.x;
    me.y = c.at.y;
    me.lift = c.at.lift;
    me.hop = 0;
    me.spin = 0;
    // Over every fighter while she steers, but under the word signs: standing
    // below one, her head hid its last letter (TOP read TO, item 039). Her
    // white ring shows where she is. (updateVisual sets depth by y, so this runs after it.)
    me.root.setDepth(DEPTH.prompt - 12);
    c.here.setPosition(me.x, me.y).setScale(1 + 0.1 * Math.sin(performance.now() / 180));
  }

  /**
   * The choice, every frame, on real time (the scene clock is nearly frozen):
   * her hero walks with the stick, the pad she stands at lights up with a
   * green dot, green there picks it. Yellow or ten quiet seconds says it again.
   */
  update(realDt: number): void {
    const c = this.current!;
    const me = this.host.heroes[0]!;
    const controls = this.host.controls;
    const mv = controls.move;
    const walking = mv.lengthSq() > 0.04 && me.active;
    if (walking) {
      c.at.x = Phaser.Math.Clamp(c.at.x + mv.x * WALK_SPEED * realDt, ARENA_LEFT, ARENA_RIGHT);
      c.at.y = Phaser.Math.Clamp(c.at.y + mv.y * WALK_SPEED * 0.8 * realDt, FLOOR_TOP, FLOOR_BOTTOM);
      me.lean = Phaser.Math.Clamp(mv.x * 0.2, -0.25, 0.25);
    } else me.lean = 0;
    this.holdHero();
    // Her team steps off the pad row (item 043, M6), and stays there while the fight is frozen.
    const k = Phaser.Math.Easing.Sine.Out(Math.min(1, (performance.now() - c.stepAt) / STEP_BACK_MS));
    for (const s of c.stepBack) {
      if (!s.f.active) continue;
      s.f.x = Phaser.Math.Linear(s.from.x, s.to.x, k);
      s.f.y = Phaser.Math.Linear(s.from.y, s.to.y, k);
    }

    let near: MovePad | null = null;
    let best = REACH;
    for (const p of c.pads) {
      const d = Phaser.Math.Distance.Between(me.x, me.y, p.x, p.y);
      if (d < best) {
        near = p;
        best = d;
      }
    }
    if (near !== c.near) {
      c.near = near;
      if (near) sfxSelect();
    }
    const wall = performance.now();
    const pulse = 1 + 0.06 * Math.sin(wall / 160);
    for (const p of c.pads) {
      const k = Phaser.Math.Clamp((wall - p.bornAt) / 260, 0, 1);
      const pop = k <= 0 ? 0 : Phaser.Math.Easing.Back.Out(k);
      const lit = p === near;
      p.ring.setScale(pop * (lit ? 1.2 : 1) * (c.open ? pulse : 1));
      p.ring.setAlpha(lit ? 1 : 0.8);
      p.sign.setScale(pop * (lit ? 1.12 : 1));
      // A wrong pick wiggles its sign side to side for half a second.
      const w = p.wiggleAt === undefined ? 1 : (wall - p.wiggleAt) / 500;
      p.sign.setX(p.x + (w < 1 ? Math.sin(w * Math.PI * 8) * 14 * (1 - w) : 0));
    }
    c.dot.setVisible(Boolean(near && c.open));
    if (near) c.dot.setPosition(near.x, near.sign.y - 90).setScale(pulse);

    // Green with no pad lit does nothing: no hop in the choice.
    if (controls.pressed('green') && near && c.open) this.pick(near.word);
    if (controls.dev('F4') && this.current) {
      c.open = true;
      this.pick(c.right);
    }
    if (walking || dadLock.locked) c.idle = 0;
    else if (c.open && !voiceBus.busy) c.idle += realDt;
    // Standing still: the rooms' stick hint beside her hero, gone when she walks (item 043, M5).
    if (walking || !c.open) c.still = 0;
    else c.still += realDt;
    if (walking) {
      c.stickHint?.destroy();
      c.stickHint = null;
    } else if (c.still * 1000 > STICK_HINT_MS && !c.stickHint) {
      c.stickHint = makeStickHint(this.host.stage, c.at.x, c.at.y);
      c.objs.push(c.stickHint);
    }
    c.stickHint?.setPosition(c.at.x + STICK_HINT_OFFSET.x, c.at.y + STICK_HINT_OFFSET.y);
    if (c.open && (controls.pressed('yellow') || c.idle > 10)) {
      // Green is ignored while the instruction plays, as on the first prompt:
      // the pads close for the line and open again when it ends.
      c.open = false;
      c.promptedAt = wall;
      c.idle = 0;
      void voiceBus.say(narratorLine(narrator(), moveKey('use_move', c.right))).then(() => {
        if (this.current !== c) return;
        c.open = true;
        c.promptedAt = performance.now();
        c.idle = 0;
      });
    }
  }
}
