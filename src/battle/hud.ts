/**
 * The battle's HUD: the names in the corners, the health bars (or a contest's
 * own meter, drawn by its stage), the things she fetched in the house and
 * Charge the Spell's runes. BattleScene makes one in `create()` and draws it
 * every frame, after the fighters.
 */

import type Phaser from 'phaser';

import { RUNE_BY_SOUND } from '../../content/phonics/runes';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { DEPTH, FONT_COMIC, FONT_HEAVY, GAME_WIDTH } from '../config';
import { counterArt, episode } from '../episode/Episode';
import { fitImage, popIn } from '../fx/juice';
import type { Fighter } from './Fighter';
import type { FightStage } from './stages/stage';

/** The health bars: the heroes' down the left, a row each from `y`; the villain's along the top right. */
const BARS = { x: 30, y: 38, rowH: 44, heroW: 300, villainW: 420 };
/** The villain's bar's left edge; its dark backing starts 3 px further left (x 827). */
const VILLAIN_BAR_X = GAME_WIDTH - BARS.x - BARS.villainW;

/** The fetched things' row: right of the heroes' bars, clear of the villain's. */
const ITEM_ROW = { left: BARS.x + BARS.heroW + 15, right: VILLAIN_BAR_X - 13 };

export class BattleHud {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[] = [];

  /** The bars' graphics, at the HUD's depth. */
  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.hud);
  }

  /** The names, the fetched things and the runes, once the cast has spawned. */
  makeLabels(heroes: readonly Fighter[], villain: Fighter, part: 1 | 2): void {
    const scene = this.scene;
    const style = { fontFamily: FONT_HEAVY, fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 };
    heroes.forEach((h, i) => {
      this.labels.push(scene.add.text(BARS.x, BARS.y - 24 + i * BARS.rowH, h.init.name.toUpperCase(), style).setDepth(DEPTH.hud + 1));
    });
    this.labels.push(scene.add.text(GAME_WIDTH - BARS.x, BARS.y - 24, villain.init.name.toUpperCase(), style).setOrigin(1, 0).setDepth(DEPTH.hud + 1));

    // What she fetched in the house (and the counter-item, once made), in a
    // row beside the heroes' bars, so the link from reading to the fight
    // stays on screen the whole battle.
    const made: string[] = episode.fetched.filter((w) => FETCH_BY_WORD[w]).map((w) => `pic_${w}`);
    if (episode.made.item) made.push(counterArt());
    // Packed tighter as the row grows, so it keeps left of the villain's bar (from x 827): a bridge and a
    // Shape-Shifter fetch seven, and the counter-item made the ninth sit on it (hunt 6).
    const step = made.length > 1 ? Math.min(58, (ITEM_ROW.right - ITEM_ROW.left - 50) / (made.length - 1)) : 58;
    const size = Math.min(50, step - 4);
    made.forEach((key, i) => {
      const icon = fitImage(scene.add.image(ITEM_ROW.left + 25 + i * step, 40, key), size, size).setDepth(DEPTH.hud + 1);
      popIn(scene, icon, icon.scale, 300 + i * 120, 300);
    });
    // Charge the Spell's runes (item 053), for the part they fire in: a row under the
    // heroes' bars, left of x 300, where no fight style's meter or PICK A MOVE! goes.
    const runes = episode.charged?.part === part ? episode.charged.sounds.filter((s) => RUNE_BY_SOUND[s]) : [];
    // A gap where the next word's runes start (item 140's two words; hunt 11: CRIB and TEN read as one CRIBTEN).
    const charge = episode.house.plan?.find((p) => p.kind === 'charge');
    const wordOf = (s: string) => (charge?.kind === 'charge' ? charge.charge.rounds.findIndex((r) => r.runes.includes(s)) : 0);
    const breaks = runes.filter((s, i) => i > 0 && wordOf(s) !== wordOf(runes[i - 1]!)).length;
    // 34 px apart, 32 with a gap, so eight chips still end left of x 300.
    const runeStep = breaks ? 32 : 34;
    let x = 46 - runeStep;
    runes.forEach((sound, i) => {
      x += runeStep + (i > 0 && wordOf(sound) !== wordOf(runes[i - 1]!) ? 14 : 0);
      const y = BARS.y + heroes.length * BARS.rowH - 8;
      const chip = fitImage(scene.add.image(x, y, 'prop_rune_stone'), 30, 30).setDepth(DEPTH.hud + 1);
      const t = scene.add.text(x, y + 1, sound.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: sound.length > 1 ? '13px' : '18px', color: '#1a1030' }).setOrigin(0.5).setDepth(DEPTH.hud + 2);
      for (const o of [chip, t]) popIn(scene, o, o.scale, 600 + i * 100, 300);
    });
  }

  /** The villain's corner label, renamed (good again, item 039). */
  renameVillain(name: string): void {
    this.labels.at(-1)?.setText(name);
  }

  /** Every frame: the stage's own bars, else the health bars. */
  draw(heroes: readonly Fighter[], villain: Fighter, show: FightStage): void {
    const g = this.g;
    g.clear();
    if (show.drawHud(g)) return;
    const bar = (x: number, y: number, w: number, frac: number, color: number, alignRight: boolean) => {
      g.fillStyle(0x000000, 0.6).fillRoundedRect(x - 3, y - 3, w + 6, 20, 8);
      const fw = Math.max(0, w * frac);
      g.fillStyle(color, 1).fillRoundedRect(alignRight ? x + w - fw : x, y, fw, 14, 6);
      g.fillStyle(0xffffff, 0.35).fillRect(alignRight ? x + w - fw : x, y + 2, fw, 4);
    };
    heroes.forEach((h, i) => bar(BARS.x, BARS.y + i * BARS.rowH, BARS.heroW, h.hp / h.maxHp, 0x44d95a, false));
    bar(VILLAIN_BAR_X, BARS.y, BARS.villainW, villain.hp / villain.maxHp, 0xe8483f, true);
  }
}
