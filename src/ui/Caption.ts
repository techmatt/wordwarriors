/**
 * The dialogue box: whatever the voice bus is saying as an instruction, shown
 * with the spoken word lit up, beside the speaker's framed face and name.
 *
 * Every text speaks, and the word being spoken is highlighted: that pairing is
 * the reading instruction (Seraphina's design law, kept). One box per scene
 * that listens to the bus, so nothing can say a line without it showing.
 *
 * Who is talking (item 024): the speaker's face card stands beside the box on
 * the speaker's side (where they stand on screen, if they do; narrators on the
 * left, villains heard from afar on the right), with a tail from the box to
 * it, a talking bob while the voice plays, and their name under it. A speaker
 * standing in the scene (`track`) also gets a glow at their feet.
 *
 * Placement: the box goes along the top or the bottom, whichever covers less
 * of what the scene says to keep clear (`avoid`: the things she walks to, the
 * words she reads). In battle (`compact`) it is smaller and always at the
 * bottom, so the fight stays in view.
 *
 * Barks (taunts) go in follow-the-speaker bubbles; a bark with nobody on
 * screen to hang a bubble on (a taunt heard from afar) shows here instead.
 * Letter sounds and sentence prefix lines show no words (see show()).
 * Words show upper case, like every text she reads.
 */

import Phaser from 'phaser';

import { personOf } from '../../content/battle/roster';
import { uncaptioned } from '../../content/voice/ids';
import { DEPTH, FONT_ROUNDED, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { voiceBus, type Utterance } from '../audio/VoiceBus';
import { TEX } from '../fx/textures';
import { makePortrait, sameSpeaker, speakerOf, type Portrait, type Speaker } from './Portrait';

const INK = '#24163a';
const BOX_FILL = 0xfffaf0;
const BOX_LINE = 0x3a2a5a;
const SLAB = 0xffd23f;
const MAX_ROWS = 3;
/** A narrow box's text width and rows (CaptionOptions.narrow). */
const NARROW_TEXT_W = 320;
const NARROW_ROWS = 4;

/** Something the box should not cover, in screen coordinates; heavier counts more. */
export interface KeepOut {
  x: number;
  y: number;
  w: number;
  h: number;
  weight?: number;
}

/** How a line shows: words and face, the face alone (the scene lights the words itself), or nothing. */
export type CaptionMode = 'show' | 'portrait' | 'hide';

export interface CaptionOptions {
  /** Battle: a smaller box, always at the bottom. */
  compact?: boolean;
  /** What to keep clear, asked each time a line starts. */
  avoid?: () => KeepOut[];
  /** Per-line override of how it shows; undefined falls back to the default rules. */
  mode?: (u: Utterance) => CaptionMode | undefined;
  /** Whether to print the speaker's name under their face (default yes). */
  showName?: (s: Speaker) => boolean;
  /**
   * A word the line says but the box must not print (lower case): shown as
   * "…" and never lit. The battle's move choice (item 043, M1): she hears the
   * word and finds it on the pads, not by matching the caption's letters.
   */
  hideWord?: (u: Utterance) => string | undefined;
  /**
   * A line that sends her walking (item 071, M13: the hub's door lines, the
   * attic's find line): a narrow box on whichever side and band covers least,
   * so the full-width one does not hide her, the cursor she is told to walk.
   */
  narrow?: (u: Utterance) => boolean;
}

interface Layout {
  face: number;
  fontSize: number;
  textW: number;
  padX: number;
  padY: number;
  gap: number;
  margin: number;
  minBoxW: number;
}

const FULL: Layout = { face: 140, fontSize: 40, textW: 700, padX: 30, padY: 16, gap: 26, margin: 26, minBoxW: 240 };
const COMPACT: Layout = { face: 70, fontSize: 32, textW: 620, padX: 22, padY: 10, gap: 18, margin: 8, minBoxW: 180 };
/** The HUD buttons in the top corners (the bag, the yellow ear): a top box keeps inside these. */
const TOP_INSET = 132;

type Where = { x: number; y: number } | null;

export class Caption {
  private readonly root: Phaser.GameObjects.Container;
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly slab: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Container;
  private portrait: (Portrait & { speaker: Speaker; baseY: number; name: boolean }) | null = null;
  private words: Phaser.GameObjects.Text[] = [];
  /** Indexes of `words` shown as "…" (`hideWord`): never lit. */
  private hidden = new Set<number>();
  private slabH = 54;
  private current: Utterance | null = null;
  private glow: Phaser.GameObjects.Image | null = null;
  private glowAt: (() => Where) | null = null;
  private readonly tracked = new Map<string, () => Where>();
  private readonly off: () => void;
  private readonly L: Layout;
  private band: 'top' | 'bottom' = 'bottom';
  /** The line on show takes the narrow box (CaptionOptions.narrow). */
  private narrow = false;
  /** The box and the face card as last laid out, [left, top, right, bottom] each: what the QA probe reports. */
  private coverRects: [number, number, number, number][] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: CaptionOptions = {},
  ) {
    this.L = opts.compact ? COMPACT : FULL;
    this.box = scene.add.graphics();
    this.slab = scene.add.graphics();
    this.text = scene.add.container(0, 0);
    // Over the rest of the HUD: a top box sat under the bag's row of items, which covered the face (item 039).
    this.root = scene.add.container(0, 0, [this.box, this.slab, this.text]).setDepth(DEPTH.hud + 5).setVisible(false);
    // For the bug-hunt checker's probe (item 059): the box and face card as laid out, which must not cover a target.
    this.root.setData('qaCover', 'dialogue');
    this.root.setData('qaCoverRects', () => this.coverRects);
    this.off = voiceBus.on((u) => this.show(u));
    // Phaser keeps a scene's event emitter across restarts, so the per-frame
    // listener must go when the scene shuts down: an old Caption ticking on
    // destroyed Text throws inside the game loop and freezes the game.
    const tick = () => this.tick();
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off();
      scene.events.off(Phaser.Scenes.Events.UPDATE, tick);
      this.current = null;
      this.tracked.clear();
    });
    const now = voiceBus.speaking;
    if (now?.line) this.show(now);
  }

  /**
   * A speaker standing in the scene: where their feet are, or null while
   * they are not there. Their lines put the face on their side, and a glow
   * under them while they talk.
   */
  track(id: string, where: () => Where, evil = false): void {
    // Lines are voiced per person: a dad's form is tracked as the dad (item 025).
    const p = personOf(id);
    this.tracked.set(evil ? `${p}_evil` : p, where);
  }

  private modeOf(u: Utterance): CaptionMode {
    const own = this.opts.mode?.(u);
    if (own) return own;
    // Letter sounds are never captioned: their text is a placeholder spelling
    // ("Puh") that is not a thing to read, and captioning the letter instead
    // would hand her the answer in Sound to Letter. The letter on the stone,
    // tile or ghost box is what lights up.
    // Sentence prefix lines (`sent_`) are lit word by word on the sentence
    // banner itself, so the box stays out of the way.
    if (uncaptioned(u.id)) return 'hide';
    if (u.priority === 'instruction') return u.line ? 'show' : 'hide';
    // A bark with no one on screen to hang its bubble on: here, with its face.
    return !this.opts.compact && !u.anchor && u.line ? 'show' : 'hide';
  }

  private show(u: Utterance | null): void {
    if (!this.root.active) return;
    if (!u) {
      // Leave the last line up briefly, so a short line can still be read.
      // Unless a new line has taken the box by then (a bark in a bubble has not).
      const ended = this.current;
      // Not the scene's clock: the battle's move choice runs it at 0.04x, and the box stayed up 10 s (item 092).
      window.setTimeout(() => {
        if (this.root.active && this.current === ended && voiceBus.speaking !== ended) this.hide();
      }, 250);
      return;
    }
    const mode = this.modeOf(u);
    if (mode === 'hide') {
      // A bark in a bubble leaves the instruction box alone; anything else clears it.
      if (u.priority === 'instruction' || uncaptioned(u.id)) this.hide(true);
      return;
    }
    this.current = u;
    this.tweens().killTweensOf(this.root);
    this.root.setAlpha(1);
    for (const w of this.words) w.destroy();
    this.words = [];
    this.hidden.clear();
    this.box.clear();
    this.slab.clear();

    const speaker = speakerOf(u);
    const where = this.whereIs(u);
    const side: 'left' | 'right' = where ? (where.x < GAME_WIDTH / 2 ? 'left' : 'right') : speaker?.evil ? 'right' : 'left';
    this.setPortrait(speaker);
    this.setGlow(u);
    this.narrow = !this.opts.compact && Boolean(this.opts.narrow?.(u));

    if (mode === 'show' && u.line) {
      // All text in the game is upper case (Matt, 2026-10-18); only the display
      // changes, the line texts stay as written.
      const hide = this.opts.hideWord?.(u);
      for (const w of u.line.words) {
        const masked = Boolean(hide) && w.word.toLowerCase().replace(/[^a-z]/g, '') === hide;
        if (masked) this.hidden.add(this.words.length);
        this.words.push(this.scene.add.text(0, 0, masked ? w.word.replace(/[a-z]+/gi, '…') : w.word.toUpperCase(), { fontFamily: FONT_ROUNDED,fontSize: `${this.L.fontSize}px`, color: INK }).setOrigin(0.5, 0.5));
      }
      this.text.add(this.words);
    }
    this.layout({ side, fixed: Boolean(where) });
    this.root.setVisible(true);
  }

  private tweens(): Phaser.Tweens.TweenManager {
    return this.scene.tweens;
  }

  /**
   * A short tween of the box at its own pace whatever the scene's clock (item 092): the
   * battle's move choice slows the scene's tweens to 0.04x, so a 160 ms fade took 4 s and a
   * face card popped in over 6 s. Only for tweens that end; a pulse would race once the clock is back.
   */
  private uiTween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const pace = () => 1 / Math.max(0.02, this.tweens().timeScale);
    // Every frame: the choice's first line comes up before the battle has slowed its clock.
    const t = this.tweens().add({ ...config, onUpdate: () => (t.timeScale = pace()) });
    t.timeScale = pace();
    return t;
  }

  /** Where the speaker stands: a tracked character, or the bark's anchor. */
  private whereIs(u: Utterance): Where {
    const p = this.trackerOf(u)?.();
    if (p) return p;
    const a = u.anchor as { x?: number; y?: number; active?: boolean } | undefined;
    if (a && a.active !== false && typeof a.x === 'number' && typeof a.y === 'number') return { x: a.x, y: a.y };
    return null;
  }

  /** The tracked position of the line's speaker (word confirmations count as the primary dad's). */
  private trackerOf(u: Utterance): (() => Where) | undefined {
    const s = speakerOf(u);
    return s ? this.tracked.get(s.evil ? `${s.id}_evil` : s.id) : undefined;
  }

  /** The face card: kept (no pop) while the same speaker goes on, else a new one pops in. */
  private setPortrait(s: Speaker | null): void {
    const name = s ? (this.opts.showName?.(s) ?? true) : false;
    if (this.portrait && sameSpeaker(this.portrait.speaker, s) && this.portrait.name === name && this.root.visible) return;
    if (this.portrait) this.tweens().killTweensOf(this.portrait.root);
    this.portrait?.root.destroy();
    this.portrait = null;
    if (!s) return;
    const p = makePortrait(this.scene, s, this.L.face, { name });
    this.portrait = { ...p, speaker: s, baseY: 0, name };
    this.root.add(p.root);
    p.root.setScale(0.4);
    this.uiTween({ targets: p.root, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  /** A soft light at the feet of a speaker who is standing in the scene. */
  private setGlow(u: Utterance): void {
    this.dropGlow();
    if (this.opts.compact) return;
    const t = this.trackerOf(u);
    if (!t || !t()) return;
    this.glowAt = t;
    const p = t()!;
    this.glow = this.scene.add.image(p.x, p.y, TEX.glow).setTint(0xfff1a8).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 0.5).setAlpha(0.8).setDepth(p.y - 1);
    this.tweens().add({ targets: this.glow, alpha: 0.4, scaleX: 1.9, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Its pulse is endless, and destroying an object does not stop its tweens. */
  private dropGlow(): void {
    if (this.glow) {
      this.tweens().killTweensOf(this.glow);
      this.glow.destroy();
    }
    this.glow = null;
    this.glowAt = null;
  }

  private hide(now = false): void {
    this.current = null;
    this.dropGlow();
    if (!this.root.visible) return;
    this.tweens().killTweensOf(this.root);
    if (now) {
      this.root.setVisible(false);
      return;
    }
    this.uiTween({
      targets: this.root,
      alpha: 0,
      duration: 160,
      onComplete: () => {
        if (this.root.active && !this.current) this.root.setVisible(false).setAlpha(1);
      },
    });
  }

  /** Words in rows (wrapped between words, up to three, shrinking until they fit), then the box, the face and the tail. */
  private layout(sideHint: { side: 'left' | 'right'; fixed: boolean }): void {
    const L = this.L;
    const textMax = this.narrow ? NARROW_TEXT_W : L.textW;
    const rowsMax = this.narrow ? NARROW_ROWS : MAX_ROWS;
    let size = L.fontSize;
    let rows: Phaser.GameObjects.Text[][] = [];
    for (;;) {
      for (const t of this.words) t.setFontSize(size);
      const gap = size * 0.4;
      rows = [[]];
      let x = 0;
      for (const t of this.words) {
        const row = rows[rows.length - 1]!;
        if (row.length && x + gap + t.width > textMax) {
          rows.push([t]);
          x = t.width;
        } else {
          x += (row.length ? gap : 0) + t.width;
          row.push(t);
        }
      }
      const fits = this.words.every((t) => t.width <= textMax) && rows.length <= rowsMax;
      if (fits || size <= 14) break;
      size -= 2;
    }
    const gap = size * 0.4;
    const lineH = size * 1.3;
    this.slabH = lineH;
    const rowW = (row: Phaser.GameObjects.Text[]) => row.reduce((n, t) => n + t.width, 0) + gap * Math.max(0, row.length - 1);
    const textW = this.words.length ? Math.max(...rows.map(rowW)) : 0;
    const textH = this.words.length ? rows.length * lineH : 0;
    const hasBox = this.words.length > 0;
    const boxW = hasBox ? Math.max(L.minBoxW, textW + L.padX * 2) : 0;
    const boxH = hasBox ? Math.max(size * 1.3 + L.padY * 2, textH + L.padY * 2) : 0;

    const p = this.portrait;
    const pw = p?.width ?? 0;
    const ph = p?.height ?? 0;
    const groupW = pw + (p && hasBox ? L.gap : 0) + boxW;
    const groupH = Math.max(ph, boxH);

    // Positions (the root's origin is the screen origin) for a band and side.
    // A box shorter than the face card hugs the screen edge, so it reaches no
    // further into the scene than it must; the tail climbs to the card.
    const place = (band: 'top' | 'bottom', side: 'left' | 'right') => {
      const inset = band === 'top' ? TOP_INSET : L.margin;
      const left = this.opts.compact ? (GAME_WIDTH - groupW) / 2 : side === 'left' ? inset : GAME_WIDTH - inset - groupW;
      const top = band === 'top' ? L.margin : GAME_HEIGHT - L.margin - groupH;
      const cy = top + groupH / 2;
      const faceX = side === 'left' ? left + pw / 2 : left + groupW - pw / 2;
      const boxX = side === 'left' ? left + pw + (p ? L.gap : 0) + boxW / 2 : left + boxW / 2;
      const boxY = band === 'top' ? top + boxH / 2 : top + groupH - boxH / 2;
      return { cy, faceX, boxX, boxY };
    };
    // Where it covers least of what must stay clear: top or bottom, and (for a
    // speaker who is not in the scene) left or right.
    const { band, side } = this.pickPlace(sideHint, (b, s) => {
      const q = place(b, s);
      return [
        ...(p ? [{ x: q.faceX - pw / 2, y: q.cy - ph / 2, w: pw, h: ph }] : []),
        ...(hasBox ? [{ x: q.boxX - boxW / 2, y: q.boxY - boxH / 2, w: boxW, h: boxH }] : []),
      ];
    });
    this.band = band;
    const { cy, faceX, boxX, boxY } = place(band, side);
    const cardMid = p ? cy + p.cardY : cy;
    this.coverRects = [
      ...(p ? [[faceX - pw / 2, cy - ph / 2, faceX + pw / 2, cy + ph / 2] as [number, number, number, number]] : []),
      ...(hasBox ? [[boxX - boxW / 2, boxY - boxH / 2, boxX + boxW / 2, boxY + boxH / 2] as [number, number, number, number]] : []),
    ];
    if (p) {
      p.root.setPosition(faceX, cy);
      p.baseY = cy;
    }

    this.box.clear();
    if (hasBox) {
      const r = Math.min(24, boxH / 2);
      const bx = boxX - boxW / 2;
      const by = boxY - boxH / 2;
      const lw = this.opts.compact ? 4 : 5;
      this.box.fillStyle(0x000000, 0.22).fillRoundedRect(bx + 4, by + 6, boxW, boxH, r);
      this.box.fillStyle(BOX_FILL, 1).fillRoundedRect(bx, by, boxW, boxH, r);
      this.box.lineStyle(lw, BOX_LINE, 1).strokeRoundedRect(bx, by, boxW, boxH, r);
      if (p) {
        // The tail: from the box's edge to the face card, so the words point at who says them.
        const edge = side === 'left' ? bx : bx + boxW;
        const tip = side === 'left' ? faceX + pw / 2 - 2 : faceX - pw / 2 + 2;
        const ty = Phaser.Math.Clamp(cardMid, by + r + 4, by + boxH - r - 4);
        const half = Math.min(16, boxH / 2 - r - 2);
        const inward = side === 'left' ? 3 : -3;
        this.box.fillStyle(BOX_FILL, 1).fillTriangle(edge + inward, ty - half, edge + inward, ty + half, tip, ty);
        this.box.lineStyle(lw, BOX_LINE, 1).lineBetween(edge, ty - half, tip, ty).lineBetween(edge, ty + half, tip, ty);
      }
    }

    const firstRow = boxY - textH / 2 + lineH / 2;
    rows.forEach((row, r) => {
      let x = boxX - rowW(row) / 2;
      for (const t of row) {
        t.setPosition(x + t.width / 2, firstRow + r * lineH);
        x += t.width + gap;
      }
    });
  }

  /**
   * The band and side that cover least of the scene's keep-outs. The side is
   * the speaker's when they stand in the scene (`fixed`); otherwise the
   * preferred one unless the other is clearly freer. A small difference is
   * not worth jumping for: the box stays in the band the last line used.
   * Battle (or a scene with nothing to keep clear) is always the bottom.
   */
  private pickPlace(
    hint: { side: 'left' | 'right'; fixed: boolean },
    rects: (band: 'top' | 'bottom', side: 'left' | 'right') => KeepOut[],
  ): { band: 'top' | 'bottom'; side: 'left' | 'right' } {
    if (this.opts.compact || !this.opts.avoid) return { band: 'bottom', side: hint.side };
    const keep = this.opts.avoid();
    const cost = (band: 'top' | 'bottom', side: 'left' | 'right') => {
      let c = 0;
      for (const r of rects(band, side)) {
        for (const k of keep) {
          const ox = Math.max(0, Math.min(r.x + r.w, k.x + k.w) - Math.max(r.x, k.x));
          const oy = Math.max(0, Math.min(r.y + r.h, k.y + k.h) - Math.max(r.y, k.y));
          c += ox * oy * (k.weight ?? 1);
        }
      }
      return c;
    };
    const other = hint.side === 'left' ? 'right' : 'left';
    // A narrow box goes wherever it covers least, its speaker's side or not:
    // it is there to keep off her (M13).
    if (this.narrow) {
      let best = { band: this.band, side: hint.side, c: Infinity };
      for (const side of [hint.side, other] as const) for (const band of [this.band, this.band === 'top' ? 'bottom' : 'top'] as const) {
        const c = cost(band, side);
        if (c < best.c) best = { band, side, c };
      }
      return { band: best.band, side: best.side };
    }
    const sides: ('left' | 'right')[] = hint.fixed ? [hint.side] : [hint.side, other];
    const stay = this.band;
    const flip: 'top' | 'bottom' = stay === 'top' ? 'bottom' : 'top';
    // In order of preference; a later choice must be clearly freer than the
    // best so far (a quarter less, and more than a small patch) to win.
    let best = { band: stay, side: hint.side, c: Infinity };
    for (const side of sides) {
      for (const band of [stay, flip]) {
        const c = cost(band, side);
        if (best.c === Infinity || c < best.c * 0.75 - 2000) best = { band, side, c };
      }
    }
    return { band: best.band, side: best.side };
  }

  private tick(): void {
    if (!this.root.active) return;
    const u = this.current;
    const talking = Boolean(u && voiceBus.speaking === u);
    // The talking bob: the face squashes and the card bounces while the voice plays.
    const p = this.portrait;
    if (p?.root.active) {
      const t = this.scene.time.now / 1000;
      const k = talking ? Math.abs(Math.sin(t * 9)) : 0;
      p.face.setScale(1 + 0.05 * k, 1 - 0.04 * k);
      p.root.y = p.baseY - (talking ? 5 * Math.abs(Math.sin(t * 4.5)) : 0);
    }
    if (this.glow && this.glowAt) {
      const at = this.glowAt();
      this.glow.setVisible(Boolean(at));
      if (at) this.glow.setPosition(at.x, at.y).setDepth(at.y - 1);
    }
    this.slab.clear();
    if (!u?.line || !this.root.visible || !this.words.length) return;
    const time = u.time();
    let lit = -1;
    u.line.words.forEach((w, i) => {
      if (time >= w.start && time < Math.max(w.end, w.start + 0.12)) lit = i;
    });
    const target = this.hidden.has(lit) ? undefined : this.words[lit];
    if (target) {
      const w = target.width + 12;
      this.slab.fillStyle(SLAB, 1).fillRoundedRect(target.x - w / 2, target.y - this.slabH / 2 + 2, w, this.slabH - 4, 10);
    }
  }
}
