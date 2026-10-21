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
 *
 * Two pages (item 037; the word bank outgrew one): green / Space flips
 * between them. Page 1 has the sounds, the warm-up, the frames, the bag and
 * the bank's coverage (by level, vowel and first sound: words · read · solid);
 * page 2 has every word, one row each. A letter sound she has charged in
 * Charge the Spell (item 053) carries its help level in its dot (1 the sound
 * and gesture first, 2 the gesture only, 3 the rune alone); a word she has
 * crossed on the Stretchy Bridge (item 054) its bridge level, on page 2.
 */

import Phaser from 'phaser';

import { FAMILIES } from '../../content/phonics/families';
import { DIGRAPH_SOUNDS, LETTERS } from '../../content/phonics/letters';
import { FRAMES } from '../../content/phonics/sentences';
import { WORDS } from '../../content/phonics/words';
import { startScene } from '../art/gate';
import { stopMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { BANK_DRAW, GAME_HEIGHT, GAME_WIDTH, GRAB, SENTENCE_SOLID } from '../config';
import { coverageTable, levelGate, type CoverageRow } from '../rules/bank';
import { GRAB_WORDS, grabLevel } from '../rules/grab';
import { chargeLevel } from '../rules/charge';
import { bridgeLevel } from '../rules/bridge';
import { fitText } from '../ui/fitText';
import type { Step } from '../episode/Episode';
import { Controls } from '../input/Controls';
import { BAG_WORDS } from '../rules/sentences';
import { progress } from '../state/progress';
import type { ItemKind } from '../state/ProgressStore';
import { hookState } from '../testHooks';

const LEVEL_NAMES = ['CVC (CAT)', 'blends (FROG)', 'digraphs (SHIP)'];

export class ParentScene extends Phaser.Scene {
  private controls!: Controls;
  private back = 'Title';
  private backData: object = {};
  private page = 0;

  constructor() {
    super('Parent');
  }

  init(data: { back?: string; data?: object; step?: Step; page?: number }): void {
    this.back = data.back ?? 'Title';
    this.backData = data.data ?? (data.step ? { step: data.step } : {});
    this.page = data.page ?? 0;
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
    fitText(this.add.text(30, 54, `tries · first-try right (recent) · today.  Red = shaky (comes up more often), green = solid. Green / Space: ${this.page ? 'back to page 1' : 'every word (page 2)'}. Red button / Esc / F9: back. F8 twice: erase. \` / ~ (below Esc), anywhere: dad lock.`, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: '#555',
    }), GAME_WIDTH - 60, 34);

    if (this.page) {
      // Every word in the content, plus any other word she has met (spelling, move words).
      const words = [...new Set([...WORDS.map((w) => w.word), ...Object.keys(snap.words)])];
      const perCol = 22;
      // The number in a word's dot is its Stretchy Bridge help level (item 054), once she has crossed it.
      const bridged = (id: string) => (snap.bridgeLevels?.[id] !== undefined ? String(bridgeLevel(progress, id)) : null);
      this.grid('Words', 'words', words, 30, 90, perCol, (GAME_WIDTH - 60) / Math.max(5, Math.ceil(words.length / perCol)), 26, bridged);
      fitText(this.add.text(200, 94, 'number in the dot: Stretchy Bridge help (1 stones sound + pictures shown, 2 silent stones, 3 says it to Dad first)', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#555' }), GAME_WIDTH - 200 - 30, 22);
      return;
    }

    // The digraphs' sounds (SH CH TH CK) sit with the letters': each is one sound unit.
    // Five full columns, narrow enough to stay left of the warm-up's levels.
    // The number in a sound's dot is its Charge the Spell help level (item 053), once she has charged it.
    const charged = (id: string) => (snap.chargeLevels?.[id] !== undefined ? String(chargeLevel(progress, id)) : null);
    // Item 056's NG and voiced TH are left out: no rune drills them alone, and a sixth column would run into the warm-up's levels.
    const drilled = DIGRAPH_SOUNDS.filter((l) => l.letter !== 'ng' && l.letter !== 'th_voiced');
    this.grid('Letter sounds', 'sounds', [...LETTERS, ...drilled].map((l) => l.letter), 30, 90, 6, 162, 30, charged);
    fitText(this.add.text(200, 94, 'number in the dot: Charge the Spell help (1 sound + gesture first, 2 gesture only, 3 rune alone)', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#555' }), 1030 - 200, 22);
    const spelled = Object.entries(snap.spelling ?? {}).map(([w, st]) => `${w} ×${st.seen}`);
    fitText(this.add.text(1040, 90, ['Spelled (typing, kept apart', 'from reading):', ...spelled.slice(0, 3)], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#444' }), GAME_WIDTH - 1040 - 20, 85);
    this.grabView(840, 182, GAME_WIDTH - 840 - 20, 112);
    this.coverageView(30, 300);
    // The sentence game keeps progress per frame ("WE CAN USE THE ..."), so
    // the little words recur until they are sight words.
    // Two columns: thirteen frames in one ran off the page (item 040's counter frames).
    const framesPerCol = Math.ceil(FRAMES.length / 2);
    this.grid('Sentence frames', 'frames', FRAMES.map((f) => f.id), 880, 300, framesPerCol, 190);
    const framesEnd = 300 + 30 + framesPerCol * 30 + 6;
    fitText(this.add.text(880, framesEnd, [
      `Solid frames skip the listening pass`,
      `(${SENTENCE_SOLID.tries}+ tries, last ${SENTENCE_SOLID.lastRight} right).`,
    ], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#555' }), GAME_WIDTH - 880 - 20, 40);
    this.bagView(880, framesEnd + 44);
  }

  /**
   * The home warm-up (item 033): each word's level on the ramp, with its grabs
   * (tries · first-try right, recent). Words she has never grabbed are at the start level.
   */
  private grabView(x: number, y: number, w: number, h: number): void {
    const rows = ([1, 2, 3] as const).map((l) => {
      const ws = GRAB_WORDS.filter((word) => progress.stat('grabs', word).seen > 0 && grabLevel(progress, word) === l);
      // The shakiest eight and a count: the full list grew past its box after ~20 episodes (item 039).
      const shown = [...ws].sort((a, b) => progress.shakiness('grabs', b) - progress.shakiness('grabs', a)).slice(0, 8);
      const list = shown.map((word) => {
        const s = progress.stat('grabs', word);
        return `${word} ${s.seen}·${Math.round((100 * s.recent.filter(Boolean).length) / Math.max(1, s.recent.length))}%`;
      });
      const more = ws.length > shown.length ? `  +${ws.length - shown.length} more` : '';
      return `${l} ${['names + sounds', 'sounds, letters shown', 'sounds only'][l - 1]}: ${list.join('  ') || '–'}${more}`;
    });
    this.add.text(x, y, 'Warm-up levels', { fontFamily: 'Segoe UI, sans-serif', fontSize: '17px', color: '#333', fontStyle: 'bold' });
    fitText(this.add.text(x, y + 24, [...rows, `New words start at ${GRAB.startLevel}; right first time: up one, a first-try miss: down one.`], { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#444' }), w, h - 24);
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
      // The word machine (item 026): per family, tries and first-try right (recent).
      `Word families: ${FAMILIES.map((f) => {
        const s = progress.stat('rimes', f.rime);
        return `-${f.rime} ${s.seen}·${s.recent.length ? `${Math.round((100 * s.recent.filter(Boolean).length) / s.recent.length)}%` : '–'}`;
      }).join('  ')}`,
    ], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#444' }), GAME_WIDTH - x - 20, GAME_HEIGHT - y - 10);
  }

  /**
   * The word bank's coverage (item 037, `coverageTable`): per level, vowel and
   * first sound, how many words the bank has, how many she has read, how many
   * are solid. The draws favour what she has met least, and open blends and
   * digraphs as the level below firms up (the gate, as a percentage).
   */
  private coverageView(x: number, y: number): void {
    const table = coverageTable(progress);
    const font = { fontFamily: 'Consolas, monospace', fontSize: '15px' };
    const head = { fontFamily: 'Segoe UI, sans-serif', fontSize: '16px', color: '#333', fontStyle: 'bold' };
    const row = (r: CoverageRow, label: string, tx: number, ty: number, w: number) => {
      const color = r.readWords === 0 ? '#999' : r.solid >= r.words / 2 ? '#2a8a3a' : '#222';
      fitText(this.add.text(tx, ty, `${label} ${r.words}·${r.readWords}·${r.solid}`, { ...font, color }), w, 24);
    };
    this.add.text(x, y, 'Word bank: words · read · solid', { fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#333', fontStyle: 'bold' });
    const top = y + 32;
    this.add.text(x, top, 'By level (open %)', head);
    table.level.forEach((r, i) => {
      const gate = Math.round(100 * levelGate(progress, Number(r.tag) as 1 | 2 | 3));
      row(r, `${r.tag} ${LEVEL_NAMES[i]} ${gate}%`, x, top + 24 + i * 24, 250);
    });
    const vy = top + 24 + 3 * 24 + 10;
    this.add.text(x, vy, 'By vowel', head);
    table.vowel.forEach((r, i) => row(r, `short ${r.tag.toUpperCase()}`, x, vy + 24 + i * 24, 250));
    // First sounds: a grid right of the levels and vowels, blends and digraphs after the single letters.
    const ox = x + 270;
    this.add.text(ox, top, 'By first sound (none = ANT)', head);
    const perCol = 13;
    const colW = (850 - ox) / Math.max(1, Math.ceil(table.onset.length / perCol));
    table.onset.forEach((r, i) => row(r, (r.tag || '–').toUpperCase().padEnd(3), ox + Math.floor(i / perCol) * colW, top + 24 + (i % perCol) * 24, colW - 6));
    fitText(this.add.text(x, vy + 24 + 5 * 24 + 6, `Solid: shakiness ≤ ${BANK_DRAW.solid}. Gray: not read yet; green: half or more solid.`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#555' }), 250, 40);
  }

  /** A column grid of items; `badge` puts a short mark (a help level) in an item's dot. */
  private grid(title: string, kind: ItemKind, ids: string[], x0: number, y0: number, perCol: number, colW: number, rowH = 30, badge?: (id: string) => string | null): void {
    this.add.text(x0, y0, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#333', fontStyle: 'bold' });
    ids.forEach((id, i) => {
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const x = x0 + col * colW;
      const y = y0 + 30 + row * rowH;
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
      const mark = badge?.(id);
      this.add.circle(x + 8, y + 11, mark ? 9 : 7, c);
      if (mark) this.add.text(x + 8, y + 11, mark, { fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      fitText(this.add.text(x + 22, y, `${id}  ${s.seen} · ${recent} · ${today.seen}`, { fontFamily: 'Consolas, monospace', fontSize: '16px', color: '#222' }), colW - 30, rowH - 2);
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
    if (this.controls.pressed('green')) {
      this.scene.restart({ back: this.back, data: this.backData, page: this.page ? 0 : 1 });
      return;
    }
    if (this.controls.pressed('red') || this.controls.dev('F9')) {
      // Through the art gate (item 065): after a `?scene=parent` boot nothing has loaded yet.
      if (this.back === 'Title') startScene(this, 'Title');
      else startScene(this, this.back, this.backData);
    }
    this.controls.endFrame();
  }
}
