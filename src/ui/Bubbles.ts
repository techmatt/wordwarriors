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

import { DEPTH, GAME_WIDTH } from '../config';
import { voiceBus, type Utterance } from '../audio/VoiceBus';

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

  constructor(private readonly scene: Phaser.Scene) {
    this.off = voiceBus.on((u) => this.onLine(u));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.off());
    scene.events.on(Phaser.Scenes.Events.UPDATE, () => this.follow());
  }

  private onLine(u: Utterance | null): void {
    if (!this.scene.sys.isActive()) return;
    this.bubble?.destroy();
    this.bubble = null;
    this.anchor = null;
    if (!u || !u.anchor || u.priority !== 'bark' || !u.text) return;
    this.anchor = u.anchor as BubbleAnchor;
    const text = this.scene.add
      .text(0, 0, u.text, { fontFamily: '"Arial Black", sans-serif', fontSize: '26px', color: '#1a1030', align: 'center', wordWrap: { width: 300 } })
      .setOrigin(0.5);
    const w = text.width + 34;
    const h = text.height + 24;
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 0.96);
    g.lineStyle(4, 0x1a1030, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.fillTriangle(-12, h / 2 - 2, 12, h / 2 - 2, 0, h / 2 + 18);
    g.lineBetween(-12, h / 2, 0, h / 2 + 18);
    g.lineBetween(12, h / 2, 0, h / 2 + 18);
    this.bubble = this.scene.add.container(0, 0, [g, text]).setDepth(DEPTH.speech);
    this.bubble.setData('h', h);
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
    b.x = Phaser.Math.Clamp(a.x, 170, GAME_WIDTH - 170);
    b.y = Math.max(h / 2 + 8, a.y - a.bubbleOffset - h / 2 - 20);
  }
}
