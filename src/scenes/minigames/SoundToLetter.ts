/**
 * Sound → letter. Three letter stones; the voice says a SOUND (never a letter
 * name); she walks to the stone that makes it and presses green. Each right
 * stone gives a gem shard; four shards make the power gem the battle uses.
 *
 * Yellow repeats the sound. The confirmation after a right answer is the
 * sound again, so the letter and its sound arrive together.
 */

import { letterSoundLine } from '../../../content/voice/ids';
import { DEPTH, GAME_WIDTH } from '../../config';
import { episode } from '../../episode/Episode';
import { bob, popIn, shockwave } from '../../fx/juice';
import { soundRound, type SoundItem } from '../../rules/rounds';
import { progress } from '../../state/progress';
import type { Spot } from '../../world/RoomScene';
import { Minigame } from './Minigame';

const ITEMS = 4;
const STONE_COLORS = [0xff7ad9, 0x7ad9ff, 0xffd23f, 0x8aff8a];

export class SoundToLetter extends Minigame {
  private items: SoundItem[] = [];

  constructor() {
    super('SoundToLetter');
  }

  protected background(): string {
    return 'room_stones';
  }

  protected build(): void {
    this.items = soundRound(progress, ITEMS) // always three stones, as designed;
    this.itemIndex = 0;
    this.makeMeter(ITEMS, 'prop_gem', '💎');
    void (async () => {
      await this.narrate('prep_gem', 'inst_sound');
      this.showItem();
    })();
  }

  private showItem(): void {
    this.clearSpots();
    const item = this.items[this.itemIndex]!;
    this.round = `sound:${this.itemIndex}:${item.target}`;
    this.wrongTries = 0;
    const xs = item.choices.length === 2 ? [GAME_WIDTH / 2 - 220, GAME_WIDTH / 2 + 220] : [GAME_WIDTH / 2 - 330, GAME_WIDTH / 2, GAME_WIDTH / 2 + 330];
    item.choices.forEach((letter, i) => {
      const y = 400 + (i % 2) * 40;
      const stone = this.art('prop_stone', 150, 150);
      stone.setTint(STONE_COLORS[i % STONE_COLORS.length]!, 0xffffff, 0xffffff, STONE_COLORS[i % STONE_COLORS.length]!);
      const label = this.add
        // All game text is upper case (Matt, 2026-10-18); only the display changes, the round still compares lower case.
        .text(0, -75, letter.toUpperCase(), { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: '96px', color: '#1a1030', stroke: '#ffffff', strokeThickness: 8 })
        .setOrigin(0.5);
      const spot = this.addSpot(letter, xs[i]!, y, [this.add.ellipse(0, 0, 120, 26, 0x000000, 0.3), stone, label], letter === item.target);
      spot.obj.setScale(0);
      this.tweens.add({ targets: spot.obj, scale: 1, duration: 350, delay: i * 120, ease: 'Back.easeOut' });
      bob(this, label, 4, 800 + i * 100);
    });
    if (this.player.y < 470) this.player.place(this.player.x, 560);
    void this.playSound(item.target);
  }

  /**
   * Say the sound with a big speaker pulsing rings above the stones, so she
   * can see that this is the moment to listen.
   */
  private async playSound(letter: string, lock = true): Promise<void> {
    const speaker = this.add.text(GAME_WIDTH / 2, 170, '🔊', { fontSize: '72px' }).setOrigin(0.5).setDepth(DEPTH.hud);
    popIn(this, speaker, 1);
    const rings = this.time.addEvent({ delay: 260, loop: true, callback: () => shockwave(this, GAME_WIDTH / 2 + 30, 170, 0xffd23f, 90, 500) });
    if (lock) await this.speak(letterSoundLine(letter));
    else await this.say(letterSoundLine(letter));
    rings.remove();
    this.tweens.add({ targets: speaker, scale: 0, duration: 200, onComplete: () => speaker.destroy() });
  }

  protected override hint(): void {
    const item = this.items[this.itemIndex];
    if (item) void this.playSound(item.target);
  }

  protected choose(spot: Spot): void {
    const item = this.items[this.itemIndex]!;
    if (spot.correct) {
      void (async () => {
        await this.right('sounds', item.target, spot.x, spot.y - 80, STONE_COLORS[this.itemIndex % STONE_COLORS.length]!, letterSoundLine(item.target));
        this.tweens.add({ targets: spot.obj, y: spot.y - 400, alpha: 0, duration: 500, ease: 'Back.easeIn' });
        await this.wait(400);
        this.itemIndex++;
        if (this.itemIndex < this.items.length) {
          this.locked = false;
          this.showItem();
        } else {
          this.clearSpots();
          await this.completePrize('prop_gem', 'made_gem');
          episode.made.gem = true;
          this.done();
        }
      })();
    } else {
      void (async () => {
        await this.wrong(spot.obj);
        await this.playSound(item.target, false);
      })();
    }
  }
}