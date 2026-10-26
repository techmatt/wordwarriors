/**
 * The grown-ups page: progress per letter sound, per word and per sentence
 * frame, from the ProgressStore. Mixed case is fine here: it is not for her. Reached by F9 anywhere, or holding LB+RB on the title.
 *
 * Each item shows: tries ever, first-try-right rate over her recent tries, and
 * tries since the page opened (a reload starts it again, item 080), and `+n`
 * for times said along with the helper in solo mode (item 106: modelled, not
 * her reads; shakiness ignores them). Colour is the shakiness the game uses to pick targets: red
 * items come up more often. Red / Esc / F9 goes back to the scene it came
 * from, restarted with the data it was given (`{ back, data }`), so a side
 * room comes back as the same room. With no back, or back 'Title', it goes to the title.
 *
 * Three pages (item 037; the word bank outgrew one): green / Space steps
 * through them. Page 1 has the sounds, the warm-up, the frames, the bag and
 * the bank's coverage (by level, vowel and first sound: words · read · solid);
 * page 2 has every word in play, one row each. A word she has crossed on the
 * Stretchy Bridge (item 054) carries its bridge level in its dot, on page 2.
 * Page 3 (item 127) lists the stored words apart, each with its reason, and
 * the `odd` things out of play since item 040.
 */

import Phaser from 'phaser';

import { ACTIONS, DROPPED, STORED } from '../../content/phonics/bank';
import { FAMILIES } from '../../content/phonics/families';
import { DIGRAPH_SOUNDS, LETTERS } from '../../content/phonics/letters';
import { FRAMES } from '../../content/phonics/sentences';
import { WORDS } from '../../content/phonics/words';
import { startScene } from '../art/gate';
import { stopMusic } from '../audio/music';
import { voiceBus } from '../voice/VoiceBus';
import { BANK_DRAW, GAME_HEIGHT, GAME_WIDTH, GRAB, SENTENCE_SOLID } from '../config';
import { debugMode } from '../episode/debug';
import { BAG_WORDS, NEW_WORDS, coverageTable, type CoverageRow } from '../rules/bank';
import { GRAB_WORDS, recordedGrabLevel } from '../rules/grab';
import { recordedBridgeLevel } from '../rules/bridge';
import { SHIFT_WORDS, recordedShifterLevel } from '../rules/shifter';
import { RHYME_FAMILIES, recordedRhymeLevel } from '../rules/rhyme';
import { RUNE_BY_SOUND } from '../../content/phonics/runes';
import { difficulty } from '../rules/difficulty';
import { fitText } from '../ui/fitText';
import { Controls } from '../input/Controls';
import { progress } from '../state/progress';
import type { ItemKind } from '../state/ProgressStore';
import { hookState } from '../hookState';
import type { SceneKey } from './keys';

const LEVEL_NAMES = ['CVC (CAT)', 'blends (FROG)', 'digraphs (SHIP)'];

/** What green / Space turns to, from each page. */
const PAGE_NEXT = ['every word (page 2)', 'stored words (page 3)', 'back to page 1'];

/** First-try right over her recent tries, as a percentage; '–' with none. */
const recentPct = (s: { recent: boolean[] }): string =>
  s.recent.length ? `${Math.round((100 * s.recent.filter(Boolean).length) / s.recent.length)}%` : '–';

/** The grown-ups page's start data: the scene to go back to and its own start data. */
export interface ParentData {
  back?: SceneKey;
  data?: object;
  page?: number;
}

/** Open the grown-ups page from `from` (F9, the title's held shoulders): straight, no art gate, it draws none. */
export function openParent(from: Phaser.Scene, data: ParentData): void {
  from.scene.start('Parent' satisfies SceneKey, data);
}

export class ParentScene extends Phaser.Scene {
  private controls!: Controls;
  private back: SceneKey = 'Title';
  private backData: object = {};
  private page = 0;

  constructor() {
    super('Parent' satisfies SceneKey);
  }

  init(data: ParentData): void {
    this.back = data.back ?? 'Title';
    this.backData = data.data ?? {};
    this.page = data.page ?? 0;
  }

  create(): void {
    // During a game played from minigame debug mode (item 086) the page shows the store as it was before it.
    progress.outsideHold(() => this.draw());
  }

  private draw(): void {
    hookState.scene = 'Parent';
    this.resetArmed = false;
    this.controls = new Controls(this);
    stopMusic();
    voiceBus.hush();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xf6f2e8);
    const snap = progress.snapshot();
    // Every text here wraps or shrinks to its column (item 020): nothing runs off the page.
    // Clear of the DEBUG corner tag while debug mode is on (hunt 10: it covered the title's first word).
    const titleX = debugMode.on ? 110 : 30;
    fitText(this.add.text(titleX, 18, `Grown-ups: Julia's progress  ·  episodes finished: ${snap.episodes}  ·  difficulty ${difficulty()}${difficulty() === 1 ? ' (base: help stays at its start)' : ''}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#222' }), GAME_WIDTH - 30 - titleX, 34);
    this.help = fitText(this.add.text(30, 54, `tries · first-try right (recent) · since the page opened; +n: said with the helper, Dad not there (not counted as reads).  Red = shaky (comes up more often), green = solid. Green / Space: ${PAGE_NEXT[this.page]}. Red button / Esc / F9: back. F8 twice: erase. \` / ~ (below Esc), anywhere: dad lock.`, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: '#555',
    }), GAME_WIDTH - 60, 34);

    if (this.page === 2) {
      this.stored();
      return;
    }
    if (this.page) {
      // Every word in the content, the action (move and spell) words too, grey until met (item 144, M69: only those
      // she had read showed, so the grid grew across the week), plus any other word she has met; not a stored or
      // dropped word (page 3; hunt 11: an old read of YAK showed here as a word that comes up again).
      const words = [...new Set([...WORDS.map((w) => w.word), ...ACTIONS.map((w) => w.word), ...Object.keys(snap.words)])].filter((w) => ![...STORED, ...DROPPED].some((s) => s.word === w));
      // 24 rows of 24 px (item 144): with the action words, 22 rows made seven narrow columns.
      const perCol = 24;
      // The number in a word's dot is its Stretchy Bridge help level (item 054), once she has crossed it.
      const bridged = (id: string) => (snap.bridgeLevels?.[id] !== undefined ? String(recordedBridgeLevel(progress, id)) : null);
      // Item 121: the newest words carry NEW (`?words=new` puts them in play).
      this.grid('Words', 'words', words, 30, 90, perCol, (GAME_WIDTH - 60) / Math.max(5, Math.ceil(words.length / perCol)), 24, bridged, (id) => (NEW_WORDS.includes(id) ? ' NEW' : ''));
      fitText(this.add.text(200, 94, `NEW: just added (?words=new shows them in play). Number in the dot: Stretchy Bridge level reached (1 stones sound + pictures shown, 2 silent stones, 3 says it to Dad first)${difficulty() === 1 ? '; at difficulty 1 every word gets 1' : `; the room gives up to ${difficulty()}`}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#555' }), GAME_WIDTH - 200 - 30, 22);
      return;
    }

    // The digraphs' sounds (SH CH TH CK) sit with the letters': each is one sound unit.
    // Five full columns, narrow enough to stay left of the warm-up's levels.
    // Item 056's NG and voiced TH are left out: no rune drills them alone, and a sixth column would run into the warm-up's levels.
    const drilled = DIGRAPH_SOUNDS.filter((l) => l.letter !== 'ng' && l.letter !== 'th_voiced');
    // Only the sounds a rune drills (hunt 11: Q, X and CK, which none does, sat grey as "never tried" for good).
    this.grid('Letter sounds', 'sounds', [...LETTERS, ...drilled].map((l) => l.letter).filter((s) => RUNE_BY_SOUND[s]), 30, 90, 6, 162, 30);
    // Since item 096 the Shape-Shifter's fix-it links fill this (a letter found for a sound), Spell the Spell
    // being parked: the latest first, and how many more (hunt 6: it showed the first three ever, as typing).
    const spelled = Object.entries(snap.spelling ?? {})
      .sort(([, a], [, b]) => (b.last ?? 0) - (a.last ?? 0))
      .map(([w, st]) => `${w} ×${st.seen}`);
    const more = spelled.length > 3 ? [`+${spelled.length - 3} more`] : [];
    fitText(this.add.text(1040, 90, ['Letters found for sounds', '(kept apart from reading):', ...spelled.slice(0, 3), ...more], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#444' }), GAME_WIDTH - 1040 - 20, 85);
    this.grabView(840, 182, GAME_WIDTH - 840 - 20, 112);
    this.coverageView(30, 300);
    // The rhyme room's levels under the first-sound grid (hunt 11: in the bag's box at the bottom right, a full
    // store pushed it off the page).
    const rhyme = this.rhymeLines();
    if (rhyme.length) fitText(this.add.text(300, 672, rhyme, { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#444' }), 540, 44);
    // The sentence game keeps progress per frame ("WE CAN USE THE ..."), so
    // the little words recur until they are sight words.
    // Two columns: thirteen frames in one ran off the page (item 040's counter frames).
    const framesPerCol = Math.ceil(FRAMES.length / 2);
    this.grid('Sentence frames', 'frames', FRAMES.map((f) => f.id), 880, 300, framesPerCol, 190);
    const framesEnd = 300 + 30 + framesPerCol * 30 + 6;
    fitText(this.add.text(880, framesEnd, [
      `Solid (${SENTENCE_SOLID.tries}+ tries, last ${SENTENCE_SOLID.lastRight} right)`,
      difficulty() === 1 ? `frames skip the listening pass from difficulty 2.` : `frames skip the listening pass.`,
    ], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#555' }), GAME_WIDTH - 880 - 20, 40);
    this.bagView(880, framesEnd + 44);
  }

  /**
   * The home warm-up (item 033): each word's level on the ramp, with its grabs
   * (tries · first-try right, recent). Words she has never grabbed are at the start level.
   * The level is the one she has reached (item 067); DIFFICULTY caps what the hall gives.
   */
  private grabView(x: number, y: number, w: number, h: number): void {
    const rows = ([1, 2, 3] as const).map((l) => {
      const ws = GRAB_WORDS.filter((word) => progress.stat('grabs', word).seen > 0 && recordedGrabLevel(progress, word) === l);
      // The shakiest eight and a count: the full list grew past its box after ~20 episodes (item 039).
      const shown = [...ws].sort((a, b) => progress.shakiness('grabs', b) - progress.shakiness('grabs', a)).slice(0, 8);
      const list = shown.map((word) => {
        const s = progress.stat('grabs', word);
        // Only words she has grabbed are listed, so `recent` is never empty here.
        return `${word} ${s.seen}·${recentPct(s)}`;
      });
      const more = ws.length > shown.length ? `  +${ws.length - shown.length} more` : '';
      return `${l} ${['sounds, letters shown', 'sounds, letters shown', 'sounds only'][l - 1]}: ${list.join('  ') || '–'}${more}`;
    });
    this.add.text(x, y, 'Warm-up levels', { fontFamily: 'Segoe UI, sans-serif', fontSize: '17px', color: '#333', fontStyle: 'bold' });
    fitText(this.add.text(x, y + 24, [...rows, `Reached: new words start at ${GRAB.startLevel}; right first time: up one, a first-try miss: down one. ${difficulty() === 1 ? `Difficulty 1: the hall gives every word ${GRAB.startLevel}.` : `The hall gives up to ${difficulty()}.`}`], { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#444' }), w, h - 24);
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
      // The word machine's families and the rhyme room's, which share the record (hunt 11: -IG, -OP and -OT, the
      // rhyme room's own, never showed).
      `Word families: ${[...new Set([...FAMILIES.map((f) => f.rime), ...RHYME_FAMILIES.map((f) => f.rime)])].map((rime) => {
        const s = progress.stat('rimes', rime);
        return `-${rime} ${s.seen}·${recentPct(s)}`;
      }).join('  ')}`,
      ...this.shifterLines(),
    ], { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#444' }), GAME_WIDTH - x - 20, GAME_HEIGHT - y - 10);
  }

  /**
   * The Shape-Shifter's help level per word she has met there (item 103, ProgressStore
   * `shifterLevels`), by level: alphabetical (the store keeps no order), ten a level and a count.
   */
  private shifterLines(): string[] {
    // Live Shifter words only (hunt 11: an old store listed stored words, levels that can never change).
    const met = Object.keys(progress.snapshot().shifterLevels ?? {}).filter((w) => SHIFT_WORDS.includes(w)).sort();
    const rows = ([1, 2, 3] as const).map((l) => {
      const ws = met.filter((w) => recordedShifterLevel(progress, w) === l);
      const more = ws.length > 10 ? ` +${ws.length - 10} more` : '';
      return `${l}: ${ws.slice(0, 10).join(' ') || '–'}${more}`;
    });
    return [`Shape-Shifter levels (1 letter lit + stones sound, 2 lit, 3 nothing lit${difficulty() === 1 ? '; difficulty 1 gives 1' : ''}):  ${rows.join('   ')}`];
  }

  /** The rhyme room's help level per word she has met there (item 139, ProgressStore `rhymeLevels`), as the Shape-Shifter's. */
  private rhymeLines(): string[] {
    const met = Object.keys(progress.snapshot().rhymeLevels ?? {}).sort();
    if (!met.length) return [];
    const rows = ([1, 2, 3] as const).map((l) => {
      const ws = met.filter((w) => recordedRhymeLevel(progress, w) === l);
      const more = ws.length > 10 ? ` +${ws.length - 10} more` : '';
      return `${l}: ${ws.slice(0, 10).join(' ') || '–'}${more}`;
    });
    return [`Rhyme room levels (1 sounded out for her, 2-3 on yellow${difficulty() === 1 ? '; difficulty 1 gives 1' : ''}):  ${rows.join('   ')}`];
  }

  /**
   * The word bank's coverage (item 037, `coverageTable`): per level, vowel and
   * first sound, how many words the bank has, how many she has read, how many
   * are solid. The draws favour what she has met least; every level is in play
   * (item 067: no level gate).
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
    this.add.text(x, top, 'By level', head);
    table.level.forEach((r, i) => row(r, `${r.tag} ${LEVEL_NAMES[i]}`, x, top + 24 + i * 24, 250));
    const vy = top + 24 + 3 * 24 + 10;
    this.add.text(x, vy, 'By vowel', head);
    table.vowel.forEach((r, i) => row(r, `short ${r.tag.toUpperCase()}`, x, vy + 24 + i * 24, 250));
    // First sounds: a grid right of the levels and vowels, blends and digraphs after the single letters.
    const ox = x + 270;
    // One row for every word starting with a vowel, ANT and APPLE alike (item 144, M69: ANT sat under '–' and APPLE under A).
    this.add.text(ox, top, 'By first sound (VOWEL: ANT, APPLE)', head);
    const perCol = 13;
    const colW = (850 - ox) / Math.max(1, Math.ceil(table.onset.length / perCol));
    table.onset.forEach((r, i) => row(r, r.tag.toUpperCase().padEnd(3), ox + Math.floor(i / perCol) * colW, top + 24 + (i % perCol) * 24, colW - 6));
    fitText(this.add.text(x, vy + 24 + 5 * 24 + 6, `Solid: shakiness ≤ ${BANK_DRAW.solid}. Gray: not read yet; green: half or more solid.`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#555' }), 250, 40);
  }

  /**
   * Page 3 (item 127): the stored words, out of play at every difficulty and
   * kept with their pictures and voice, each with its reason and her tries
   * from before; then the `odd` things out of play since item 040.
   */
  private stored(): void {
    const font = { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#222' };
    this.add.text(30, 90, `Stored words (${STORED.length})`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#333', fontStyle: 'bold' });
    fitText(this.add.text(250, 94, 'Never drawn, at any difficulty; kept with their pictures and voice. To bring one back, ask for it by name (its line in STORED_WHY, content/phonics/bank.ts, goes).', { ...font, fontSize: '14px', color: '#555' }), GAME_WIDTH - 250 - 30, 22);
    const perCol = Math.ceil(STORED.length / 2);
    const colW = (GAME_WIDTH - 60) / 2;
    const ROW = 21;
    STORED.forEach((w, i) => {
      const x = 30 + Math.floor(i / perCol) * colW;
      const y = 122 + (i % perCol) * ROW;
      const s = progress.stat('words', w.word);
      fitText(this.add.text(x, y, `${w.word.toUpperCase()}${s.seen ? ` (${s.seen} tries)` : ''}: ${w.stored}`, font), colW - 16, ROW - 1);
    });
    const y = 122 + perCol * ROW + 10;
    // Ends above y 690, where F8's warning prints (hunt 10).
    fitText(this.add.text(30, y, `Out of play since item 040 (odd: a picture she would not know): ${DROPPED.map((w) => w.word.toUpperCase()).join(' ')}`, { ...font, color: '#555' }), GAME_WIDTH - 60, Math.max(22, 690 - y - 4));
  }

  /** A column grid of items; `badge` puts a short mark (a help level) in an item's dot, `tag` a word after its name. */
  private grid(title: string, kind: ItemKind, ids: string[], x0: number, y0: number, perCol: number, colW: number, rowH = 30, badge?: (id: string) => string | null, tag?: (id: string) => string): void {
    this.add.text(x0, y0, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#333', fontStyle: 'bold' });
    ids.forEach((id, i) => {
      const col = Math.floor(i / perCol);
      const row = i % perCol;
      const x = x0 + col * colW;
      const y = y0 + 30 + row * rowH;
      const s = progress.stat(kind, id);
      const today = progress.stat(kind, id, 'session');
      const shaky = progress.shakiness(kind, id);
      const recent = recentPct(s);
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
      // One row each, shrunk to fit (item 080): with the row's height, two wrapped rows fitted and a frame's last count fell under it.
      // At most 20 px tall, down to 8 px (hunt 10): 22 px held two 10 px lines, and item 121's CANNOT_GET_PAST_THE
      // wrapped its last count onto a second.
      fitText(this.add.text(x + 22, y, `${id}${tag?.(id) ?? ''}  ${s.seen} · ${recent} · ${today.seen}${s.modelled ? ` +${s.modelled}` : ''}`, { fontFamily: 'Consolas, monospace', fontSize: '16px', color: '#222' }), colW - 30, Math.min(rowH - 2, 20), 8);
    });
  }

  private resetArmed = false;
  /** The help line under the title, which F8's warning stands in for while armed. */
  private help: Phaser.GameObjects.Text | null = null;

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
      // Over the help line, which it stands for while armed (hunt 10: at the bottom it printed over page 3's stored
      // words; hunt 11: over page 1's rhyme levels, and under the dad-lock badge in the bottom corner).
      this.help?.setVisible(false);
      this.add.text(debugMode.on ? 110 : 30, 54, 'Press F8 again to erase all progress.', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#c0392b', backgroundColor: '#fff4f0', padding: { x: 8, y: 3 } }).setDepth(10);
    }
    if (this.controls.pressed('green')) {
      this.scene.restart({ back: this.back, data: this.backData, page: (this.page + 1) % PAGE_NEXT.length });
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
