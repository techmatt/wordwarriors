/**
 * Follow-the-speaker speech bubbles for barks (taunts, ultimate calls).
 *
 * Seraphina's SpeechBubble was placed once and never followed a moving
 * speaker, and each instance played its own audio. Here the voice bus decides
 * who talks and this layer only draws: when a bark starts whose anchor is a
 * game object, a bubble appears over it and tracks it every frame until the
 * line ends. One bubble at a time, because one voice at a time.
 */

import Phaser from 'phaser';

import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { voiceBus, type Utterance } from '../audio/VoiceBus';
import { fitText } from './fitText';
import { makePortrait, speakerOf } from './Portrait';

/** The face on a bubble: small, so a taunt never hides the fight. */
const CHIP_FACE = 54;

/** The bubble's text box: a sensible line length, and never taller than a third of the screen. */
const BUBBLE_TEXT_W = 300;
const BUBBLE_TEXT_H = 220;

export interface BubbleAnchor {
  x: number;
  y: number;
  /** Height above the anchor's y to float the bubble's tail. */
  bubbleOffset: number;
  active: boolean;
}

export class Bubbles {
  private bubble: Phaser.GameObjects.Container | null = null;
  private anchor: BubbleAnchor | null = null;
  private readonly off: () => void;

  /**
   * `avoid` (item 034) is a box the bubble must keep clear of, or null: the
   * battle's banner, so a banner never covers what someone is saying. The
   * bubble steps above it, or below it when there is no room above.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly avoid?: () => Phaser.Geom.Rectangle | null,
  ) {
    this.off = voiceBus.on((u) => this.onLine(u));
    const follow = () => this.follow();
    scene.events.on(Phaser.Scenes.Events.UPDATE, follow);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.off();
      scene.events.off(Phaser.Scenes.Events.UPDATE, follow);
      this.bubble = null;
      this.anchor = null;
    });
  }

  private onLine(u: Utterance | null): void {
    if (!this.scene.sys.isActive()) return;
    this.bubble?.destroy();
    this.bubble = null;
    this.anchor = null;
    if (!u || !u.anchor || u.priority !== 'bark' || !u.text) return;
    this.anchor = u.anchor as BubbleAnchor;
    const text = this.scene.add
      // All text in the game is upper case; the line keeps its case for the voice.
      .text(0, 0, u.text.toUpperCase(), { fontFamily: '"Arial Black", sans-serif', fontSize: '26px', color: '#1a1030', align: 'center' })
      .setOrigin(0.5);
    // Wrapped between words, and shrunk if it is still too big: never off screen.
    fitText(text, BUBBLE_TEXT_W, BUBBLE_TEXT_H);
    // Who is talking (item 024): a small face card with their name, left of the words.
    const who = speakerOf(u);
    const chip = who ? makePortrait(this.scene, who, CHIP_FACE, { name: true }) : null;
    const chipW = chip ? chip.width + 12 : 0;
    const w = text.width + 34 + chipW;
    const h = Math.max(text.height + 24, chip ? chip.height + 16 : 0);
    text.x = chipW / 2;
    chip?.root.setPosition(-w / 2 + 10 + chip.width / 2, 0);
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 0.96);
    g.lineStyle(4, 0x1a1030, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    // The tail is redrawn as it follows, so it points at the speaker even when the bubble is held in from an edge.
    const tail = this.scene.add.graphics();
    this.bubble = this.scene.add.container(0, 0, [g, tail, text, ...(chip ? [chip.root] : [])]).setDepth(DEPTH.speech);
    this.bubble.setData('h', h);
    this.bubble.setData('w', w);
    this.bubble.setData('tail', tail);
    this.bubble.setData('tailX', NaN);
    this.bubble.setScale(0.2);
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.follow();
  }

  private follow(): void {
    const b = this.bubble;
    const a = this.anchor;
    if (!b || !a) return;
    if (!a.active) {
      b.destroy();
      this.bubble = null;
      return;
    }
    const h = b.getData('h') as number;
    const w = b.getData('w') as number;
    b.x = Phaser.Math.Clamp(a.x, w / 2 + 8, GAME_WIDTH - w / 2 - 8);
    b.y = Phaser.Math.Clamp(a.y - a.bubbleOffset - h / 2 - 20, h / 2 + 8, GAME_HEIGHT - h / 2 - 28);
    const r = this.avoid?.();
    // The bubble's box, its tail included.
    if (r && Phaser.Geom.Rectangle.Overlaps(new Phaser.Geom.Rectangle(b.x - w / 2, b.y - h / 2, w, h + 18), r)) {
      const above = r.top - 22 - h / 2;
      b.y = above >= h / 2 + 8 ? above : Math.min(r.bottom + h / 2 + 8, GAME_HEIGHT - h / 2 - 28);
    }
    const tx = Math.round(Phaser.Math.Clamp(a.x - b.x, -w / 2 + 26, w / 2 - 26));
    if (tx !== b.getData('tailX')) {
      b.setData('tailX', tx);
      const tail = b.getData('tail') as Phaser.GameObjects.Graphics;
      tail.clear();
      tail.fillStyle(0xffffff, 0.96).fillTriangle(tx - 12, h / 2 - 2, tx + 12, h / 2 - 2, tx, h / 2 + 18);
      tail.lineStyle(4, 0x1a1030, 1).lineBetween(tx - 12, h / 2, tx, h / 2 + 18).lineBetween(tx + 12, h / 2, tx, h / 2 + 18);
    }
  }
}
