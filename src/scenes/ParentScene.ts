/**
 * The grown-ups page: progress per letter sound and per word, from the
 * ProgressStore. Reached by F9 anywhere, or holding LB+RB on the title.
 *
 * Each item shows: tries ever, first-try-right rate over her recent tries, and
 * today's tries. Colour is the shakiness the game uses to pick targets: red
 * items come up more often. Red / Esc / F9 goes back.
 */

import Phaser from 'phaser';

import { LETTERS } from '../../content/phonics/letters';
import { WORDS } from '../../content/phonics/words';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { startStep, type Step } from '../episode/Episode';
import { Controls } from '../input/Controls';
import { progress } from '../state/progress';
import type { ItemKind } from '../state/ProgressStore';
import { hookState } from '../testHooks';

export class ParentScene extends Phaser.Scene {
  private controls!: Controls;
  private back = 'Title';

  constructor() {
    super('Parent');
  }

  init(data: { back?: string; step?: Step }): void {
    this.back = data.back ?? 'Title';
  }

  create(): void {
    hookState.scene = 'Parent';
    this.controls = new Controls(this);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xf6f2e8);
    const snap = progress.snapshot();
    this.add.text(30, 18, `Grown-ups: Julia's progress  ·  episodes finished: ${snap.episodes}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#222' });
    this.add.text(30, 54, 'tries · first-try right (recent) · today.  Red = shaky (comes up more often), green = solid. Red button / Esc / F9: back.', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: '#555',
    });

    this.grid('Letter sounds', 'sounds', LETTERS.map((l) => l.letter), 30, 90, 6, 200);
    // Every word in the content, plus any other word she has met (spelling, move words).
    const words = [...new Set([...WORDS.map((w) => w.word), ...Object.keys(snap.words)])];
    this.grid('Words', 'words', words, 30, 300, 12, 205);
  }

  private grid(title: string, kind: ItemKind, ids: string[], x0: number, y0: number, perCol: number, colW: number): void {
    this.add.text(x0, y0, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#333', fontStyle: 'bold' });
    ids.forEach((id, i) => {
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const x = x0 + col * colW;
      const y = y0 + 30 + row * 30;
      const s = progress.stat(kind, id);
      const today = progress.stat(kind, id, 'session');
      const shaky = progress.shakiness(kind, id);
      const recent = s.recent.length ? `${Math.round((100 * s.recent.filter(Boolean).length) / s.recent.length)}%` : '–';
      const color = s.seen === 0 ? 0xcccccc : Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x3cb44b),
        Phaser.Display.Color.ValueToColor(0xe6194b),
        100,
        Math.round(shaky * 100),
      );
      const c = typeof color === 'number' ? color : Phaser.Display.Color.GetColor(color.r, color.g, color.b);
      this.add.circle(x + 8, y + 11, 7, c);
      this.add.text(x + 22, y, `${id}  ${s.seen} · ${recent} · ${today.seen}`, { fontFamily: 'Consolas, monospace', fontSize: '16px', color: '#222' });
    });
  }

  override update(): void {
    this.controls.update();
    if (this.controls.pressed('red') || this.controls.dev('F9')) {
      if (this.back === 'Title') this.scene.start('Title');
      else startStep(this);
    }
    this.controls.endFrame();
  }
}
