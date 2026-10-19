/**
 * The grown-ups page: progress per letter sound, per word and per sentence
 * frame, from the ProgressStore. Mixed case is fine here: it is not for her. Reached by F9 anywhere, or holding LB+RB on the title.
 *
 * Each item shows: tries ever, first-try-right rate over her recent tries, and
 * today's tries. Colour is the shakiness the game uses to pick targets: red
 * items come up more often. Red / Esc / F9 goes back to the scene it came
 * from, restarted with the data it was given (`{ back, data }`; the older
 * `{ back, step }` means data `{ step }`), so a side room comes back as the
 * same room. With no back, or back 'Title', it goes to the title.
 */

import Phaser from 'phaser';

import { LETTERS } from '../../content/phonics/letters';
import { FRAMES } from '../../content/phonics/sentences';
import { WORDS } from '../../content/phonics/words';
import { stopMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { GAME_HEIGHT, GAME_WIDTH, SENTENCE_SOLID } from '../config';
import { fitText } from '../ui/fitText';
import type { Step } from '../episode/Episode';
import { Controls } from '../input/Controls';
import { BAG_WORDS } from '../rules/sentences';
import { progress } from '../state/progress';
import type { ItemKind } from '../state/ProgressStore';
import { hookState } from '../testHooks';

export class ParentScene extends Phaser.Scene {
  private controls!: Controls;
  private back = 'Title';
  private backData: object = {};

  constructor() {
    super('Parent');
  }

  init(data: { back?: string; data?: object; step?: Step }): void {
    this.back = data.back ?? 'Title';
    this.backData = data.data ?? (data.step ? { step: data.step } : {});
  }

  create(): void {
    hookState.scene = 'Parent';
    this.resetArmed = false;
    this.controls = new Controls(this);
    stopMusic();
    voiceBus.hush();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xf6f2e8);
    const snap = progress.snapshot();
    // Every text here wraps or shrinks to its column (item 020): nothing runs off the page.
    fitText(this.add.text(30, 18, `Grown-ups: Julia's progress  ·  episodes finished: ${snap.episodes}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#222' }), GAME_WIDTH - 60, 34);
    fitText(this.add.text(30, 54, 'tries · first-try right (recent) · today.  Red = shaky (comes up more often), green = solid. Red button / Esc / F9: back. F8 twice: erase.', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: '#555',
    }), GAME_WIDTH - 60, 34);

    this.grid('Letter sounds', 'sounds', LETTERS.map((l) => l.letter), 30, 90, 6, 200);
    const spelled = Object.entries(snap.spelling ?? {}).map(([w, st]) => `${w} ×${st.seen}`);
    fitText(this.add.text(1040, 90, ['Spelled (typing, kept apart', 'from reading):', ...spelled.slice(0, 7)], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#444' }), GAME_WIDTH - 1040 - 20, 200);
    // Every word in the content, plus any other word she has met (spelling, move words).
    const words = [...new Set([...WORDS.map((w) => w.word), ...Object.keys(snap.words)])];
    // Columns narrow to stay left of the frames column, however many words she has met.
    this.grid('Words', 'words', words, 30, 300, 12, Math.min(205, 840 / Math.ceil(words.length / 12)));
    // The sentence game keeps progress per frame ("WE CAN USE THE ..."), so
    // the little words recur until they are sight words.
    this.grid('Sentence frames', 'frames', FRAMES.map((f) => f.id), 880, 300, FRAMES.length, 300);
    const framesEnd = 300 + 30 + FRAMES.length * 30 + 6;
    fitText(this.add.text(880, framesEnd, [
      `Solid frames skip the listening pass`,
      `(${SENTENCE_SOLID.tries}+ tries, last ${SENTENCE_SOLID.lastRight} right).`,
    ], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#555' }), GAME_WIDTH - 880 - 20, 40);
    this.bagView(880, framesEnd + 44);
  }

  /** Her word bag: key words drawn without replacement, and the shaky ones that come back early. */
  private bagView(x: number, y: number): void {
    const bag = progress.bag();
    const left = BAG_WORDS.filter((w) => bag.left.includes(w));
    const shaky = BAG_WORDS.filter((w) => progress.stat('words', w).seen > 0 && progress.shakiness('words', w) >= 0.5)
      .sort((a, b) => progress.shakiness('words', b) - progress.shakiness('words', a));
    fitText(this.add.text(x, y, [
      `Word bag, round ${bag.round}: ${bag.round ? BAG_WORDS.length - left.length : 0} seen, ${bag.round ? left.length : BAG_WORDS.length} left`,
      `Shaky: ${shaky.slice(0, 8).join(' ') || 'none yet'}`,
    ], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#444' }), GAME_WIDTH - x - 20, GAME_HEIGHT - y - 10);
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
      fitText(this.add.text(x + 22, y, `${id}  ${s.seen} · ${recent} · ${today.seen}`, { fontFamily: 'Consolas, monospace', fontSize: '16px', color: '#222' }), colW - 30, 28);
    });
  }

  private resetArmed = false;

  override update(): void {
    this.controls.update();
    // F8 twice wipes progress (a grown-up's testing tool; never on the pad).
    if (this.controls.dev('F8')) {
      if (this.resetArmed) {
        progress.reset();
        this.scene.restart({ back: this.back, data: this.backData });
        return;
      }
      this.resetArmed = true;
      this.add.text(30, 690, 'Press F8 again to erase all progress.', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#c0392b' });
    }
    if (this.controls.pressed('red') || this.controls.dev('F9')) {
      if (this.back === 'Title') this.scene.start('Title');
      else this.scene.start(this.back, this.backData);
    }
    this.controls.endFrame();
  }
}
