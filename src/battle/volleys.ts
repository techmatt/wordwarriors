/**
 * The battle's volleys (item 141, out of BattleScene): the things she fetched
 * in the house flying out of her bag (`useAllFetched`, in beats by
 * `fetchBeats`, src/rules/volleys.ts: a room's earlier words as one volley,
 * each room's last word its own beat), and Charge the Spell's runes
 * (`useCharged`). Both parts' directors and the story fight call them; the
 * counter's reveal (beats.ts) finds its spot with `revealSpot` too.
 */

import Phaser from 'phaser';

import { RUNE_BY_SOUND, runeArt } from '../../content/phonics/runes';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { letterSoundLine } from '../../content/voice/ids';
import { voiceBus } from '../voice/VoiceBus';
import { sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, GAME_WIDTH, RUNE_SOUND_BEAT_MS } from '../config';
import { episode, housePlan } from '../episode/Episode';
import { burst, fitImage, fitPicture, popIn, slowmo, speedLines } from '../fx/juice';
import { TEX } from '../fx/textures';
import { fetchBeats } from '../rules/volleys';
import { cast, type BattleWorld } from './abilities';
import { FLOOR_TOP, type Fighter } from './Fighter';
import type { BattleStats } from './sim';

/** A volley of fetched things (hunt 6, M28): its pictures this far apart over the bag, px, and this far apart in time, s. */
const VOLLEY_SPREAD = 130;
const VOLLEY_GAP = 0.3;

/** What the volleys use from the battle (BattleScene). */
export interface VolleyHost extends BattleWorld {
  readonly part: 1 | 2;
  readonly heroes: readonly Fighter[];
  readonly villain: Fighter;
  readonly fighters: readonly Fighter[];
  readonly stats: BattleStats;
  /** A story fight is playing: its own beats say what she found. */
  readonly inStory: boolean;
  wait(s: number): Promise<void>;
  say(key: string): Promise<boolean>;
  guard<T>(p: Promise<T>): Promise<T>;
}

/**
 * Where a reveal `w` wide whose bottom edge sits `bottomGap` above her head
 * and reaches `ht` up can go, clear of every other fighter's body (item 034:
 * the bag over Julia's head hid a small ally standing just behind her). Over
 * her head when that is clear, else stepped sideways, away from the villain
 * first. Returns the reveal's bottom-centre.
 */
export function revealSpot(b: { readonly fighters: readonly Fighter[]; readonly villain: Fighter }, h: Fighter, w: number, ht: number, bottomGap: number): { x: number; y: number } {
  const others = b.fighters.filter((f) => f !== h && f.active && f.init.kind !== 'minion');
  const y = Math.max(ht + 12, h.top - bottomGap);
  const clear = (x: number) =>
    others.every((f) => f.x + f.bodyHalf < x - w / 2 || f.x - f.bodyHalf > x + w / 2 || f.y < y - ht || f.top > y);
  const away = h.x < b.villain.x ? -1 : 1;
  for (const dx of [0, 70, -70, 140, -140, 210, -210, 280, -280]) {
    const x = Phaser.Math.Clamp(h.cx + dx * away, w / 2 + 10, GAME_WIDTH - w / 2 - 10);
    if (clear(x)) return { x, y };
  }
  return { x: h.cx, y };
}

/** The last fetched beat's gap as a share of the others' (hunt 11, M62: 3.5 s to 1.4 s in battle 1). */
const LAST_VOLLEY_SHARE = 0.4;

export class BattleVolleys {
  /** "Look what we found!" is said once per part, at the first item out of the bag. */
  private bagSaid = false;

  constructor(private readonly b: VolleyHost) {}

  /**
   * Every key word she fetched in the house, `gap` seconds apart: a room's earlier words fly out of the
   * bag as one volley, each room's last word its own beat (hunt 6, M28: eight things took 34 s); Charge's
   * words all one volley (hunt 11, M62).
   */
  async useAllFetched(gap: number): Promise<void> {
    // Charge the Spell's words fly as one volley (hunt 11, M62).
    const rooms = housePlan().map((p) => (p.kind === 'charge' ? { words: p.fetches, whole: true as const } : p.fetches));
    const beats = fetchBeats(episode.fetched, rooms)
      .map((beat) => beat.filter((w) => FETCH_BY_WORD[w]))
      .filter((words) => words.length);
    for (const [i, words] of beats.entries()) {
      await this.useFetched(words);
      // The last beat's gap is short: the runes (or the move choice's own pause) come next (hunt 11, M62).
      await this.b.wait(i === beats.length - 1 ? gap * LAST_VOLLEY_SHARE : gap);
    }
  }

  /**
   * Charge the Spell's runes (item 053), if they were charged for this part:
   * a quick volley, each rune stone popping up over her hero with its picture letter (`runeArt`),
   * its sound said (never captioned), and her hero firing the rune's move
   * (content/phonics/runes.ts) at a little over normal power, so eight of them (two
   * words of up to four sounds) neither end the fight nor run it long (expectFightLength).
   */
  async useCharged(gap: number): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    const c = episode.charged;
    if (!c || c.part !== b.part) return;
    let said = false;
    for (const sound of c.sounds) {
      const rune = RUNE_BY_SOUND[sound];
      const h = b.heroes[0];
      if (!rune || !h?.active || h.floored) continue;
      if (!said) {
        said = true;
        // Said first, so each rune's sound comes with its own stone, not under the next (item 069).
        await b.say('use_runes');
        if (!h.active || h.floored) return;
      }
      const color = rune.move.color;
      const spot = revealSpot(b, h, 110, 110, 10);
      const at = { x: spot.x, y: spot.y - 55 };
      const stone = fitImage(scene.add.image(at.x, at.y, 'prop_rune_stone'), 100, 100).setDepth(DEPTH.fx + 6);
      // Its picture letter (item 103), as on the Charge room's stone.
      const letter = fitImage(scene.add.image(at.x, at.y, runeArt(sound)), 84, 84).setDepth(DEPTH.fx + 7);
      popIn(scene, stone, stone.scale, 0, 220);
      popIn(scene, letter, letter.scale, 60, 220);
      sfxSummon();
      burst(scene, at.x, at.y, { count: 40, speed: 340, texture: TEX.star, colors: [color, 0xffffff, 0xffd23f] });
      const heard = b.guard(voiceBus.say(letterSoundLine(sound)));
      // The gap runs from the stone's sound, so back to back is `gap` apart, not the 0.3 s below as well.
      const gapDone = b.wait(gap);
      await b.wait(0.3);
      b.banner(`${sound.toUpperCase()}!`, color === 0xffffff ? 0x7ad9ff : color, true);
      speedLines(scene, at.x, at.y, color, 400);
      h.castFrom = at;
      cast(b, h, rune.move, b.villain, 1.3);
      // Back to back, the next rune may already cast from its own stone: clear only this one's (item 144).
      b.after(700, () => h.castFrom === at && (h.castFrom = null));
      b.stats.abilitiesFired++;
      b.stats.runesFired++;
      scene.tweens.add({
        targets: [stone, letter],
        scale: 0,
        alpha: 0,
        delay: 350,
        duration: 260,
        ease: 'Back.easeIn',
        onComplete: () => {
          stone.destroy();
          letter.destroy();
        },
      });
      // The next stone waits for this one's sound and a beat after it (hunt 12, M83: back to back the word's
      // sounds ran together), as well as the gap (RUNE_GAP: hunt 11, M62).
      const beatDone = heard.then(() => b.wait(RUNE_SOUND_BEAT_MS / 1000));
      await Promise.all([beatDone, gapDone]);
    }
  }

  /**
   * Fetched things, one beat: her bag pops up over her hero, each item's picture jumps out of it with a
   * sparkle (a volley's fanned out, a moment apart), a big "THE NET!" banner each, and her hero fires each
   * item's own ability. Summon items (hens, the dog) fight on her side.
   */
  private async useFetched(words: string[]): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    const h = b.heroes[0];
    const items = words.filter((w) => FETCH_BY_WORD[w]);
    if (!items.length || !h?.active || h.floored) return;
    // The bag: pops in over her head, or beside it, where it hides nobody; the pictures then rise 110 above
    // it, a volley's spread across a fan as wide as theirs.
    const fan = VOLLEY_SPREAD * (items.length - 1);
    const spot = revealSpot(b, h, 150 + fan, 86 + 110 + 72, 7);
    const bag = fitImage(scene.add.image(spot.x, spot.y - 43, 'prop_bag'), 86, 86).setDepth(DEPTH.fx + 5);
    const bs = bag.scale;
    popIn(scene, bag, bs, 0, 260);
    sfxWhoosh();
    // Not in the story fight (hunt 10): its own beat has just said it ("Julia, show him what we found in the house!").
    if (!this.bagSaid && !b.inStory) {
      this.bagSaid = true;
      void b.say('use_bag');
    }
    await b.wait(0.35);
    for (let i = 0; i < items.length; i++) {
      if (i) await b.wait(VOLLEY_GAP);
      if (!h.active || h.floored) break;
      this.itemOut(items[i]!, h, bag, bag.x - fan / 2 + i * VOLLEY_SPREAD);
    }
    await b.wait(0.45);
    scene.tweens.add({ targets: bag, scale: 0, delay: 500, duration: 250, ease: 'Back.easeIn', onComplete: () => bag.destroy() });
  }

  /** One fetched thing out of the bag: its picture jumps out to `x`, and 0.45 s on, its name and its ability. */
  private itemOut(word: string, h: Fighter, bag: Phaser.GameObjects.Image, x: number): void {
    const b = this.b;
    const scene = b.stage;
    const item = FETCH_BY_WORD[word]!;
    const color = item.ability.color;
    const bs = bag.scale;
    const y = bag.y - 110;
    // The picture jumps out of the bag, a squash on the bag as it goes.
    scene.tweens.add({ targets: bag, scaleX: bs * 1.3, scaleY: bs * 0.7, duration: 90, yoyo: true });
    const pic = fitPicture(scene.add.image(bag.x, bag.y, `pic_${word}`), 120, 120).setDepth(DEPTH.fx + 6);
    const ps = pic.scale;
    pic.setScale(0.2 * ps);
    scene.tweens.add({ targets: pic, x, y, scale: ps * 1.2, duration: 380, ease: 'Back.easeOut' });
    // The glow behind the fighters, so it never washes one out.
    const halo = scene.add.image(x, y, TEX.glow).setTint(0xfff3a0).setScale(2.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(FLOOR_TOP - 4);
    scene.tweens.add({ targets: halo, scale: 3.4, alpha: 0.6, duration: 400, yoyo: true, repeat: 1 });
    sfxSummon();
    burst(scene, x, y, { count: 50, speed: 380, colors: [0xfff3a0, color, 0xffffff] });
    b.after(450, () => {
      if (!h.active || h.floored) {
        pic.destroy();
        halo.destroy();
        return;
      }
      // Its name, big, and then it is really used.
      b.banner(`THE ${word.toUpperCase()}!`, color === 0xffffff ? 0x7ad9ff : color, true);
      slowmo(scene, 0.4, 700);
      speedLines(scene, x, y, color, 600);
      // Its bolts fly out of the picture, not out of her: a volley of big caps hid her (item 034).
      // A volley's next picture takes over as the bolts' source; its own clears it.
      const from = { x, y };
      h.castFrom = from;
      cast(b, h, item.ability, b.villain, 1.8);
      b.after(900, () => h.castFrom === from && (h.castFrom = null));
      b.stats.abilitiesFired++;
      b.stats.itemsUsed++;
      // The picture flies off towards the villain and fades.
      scene.tweens.add({ targets: pic, x: b.villain.cx, y: b.villain.cy, scale: ps * 0.6, alpha: 0, delay: 300, duration: 500, ease: 'Quad.easeIn', onComplete: () => pic.destroy() });
      scene.tweens.add({ targets: halo, alpha: 0, delay: 300, duration: 400, onComplete: () => halo.destroy() });
    });
  }
}
