/**
 * What every side room's game shares (item 072: was `Minigame`, a name now kept
 * for the pool's entries, `src/rules/minigames.ts`), the parked v0.1 games
 * (src/scenes/minigames/) and the six live rooms alike: the miss count
 * (`wrongTries`), the no-fail `wrong()` (a fizzle-and-giggle, a wiggle, a
 * funny line, the same item again; no penalty, nothing lost), the sparkle on
 * the answer after two misses (`sparkleAnswer`), `ARRIVE_MS`, the words' INK
 * and LIT, and free play closed.
 *
 * The piece meter and `right()` belong to the parked games alone, in their own
 * base (`ParkedGame`, src/scenes/minigames/ParkedGame.ts). The six live rooms
 * (the sentence game, the word machine, Charge the Spell, the Stretchy Bridge,
 * the Shape-Shifter, the rhyme room) extend `HouseSideRoom` below: their slot,
 * the room's art and mood, the arrival and the way back to the hub, the read
 * recorded, and Dad's buttons.
 */

import Phaser from 'phaser';

import { OUTDOOR_ROOMS } from '../../content/house/house';
import { NO_BAG_COPY } from '../../content/phonics/sentences';
import { WORD_BY_ID, pictureFor } from '../../content/phonics/words';
import { narratorLine } from '../../content/voice/ids';
import { variant } from '../episode/lineVariants';
import { sfxWhoosh } from '../audio/sfx';
import { voiceBus } from '../audio/VoiceBus';
import { DAD_AWAY_MS, DEPTH, REACH } from '../config';
import { backToHub, castFace, episode, narrator, planFor, type Slot, type Step } from '../episode/Episode';
import { burst } from '../fx/juice';
import { TEX } from '../fx/textures';
import { openDadButtons, setDadAsking, type DadAnswer } from '../input/dadButtons';
import { dadLock } from '../input/dadLock';
import { isLeaving } from '../fx/sceneGen';
import type { RoomPlan } from '../rules/rooms';
import { progress } from '../state/progress';
import { Bag } from '../ui/Bag';
import { applyHouseMood, roomSeed } from './houseMood';
import { GIGGLE_BEAT_MS, RoomScene, type Spot } from './RoomScene';

/** The side rooms' words (the sentence banner, the machine's panel): ink, and lit while said. */
export const INK = '#1a1030';
export const LIT = '#ff3d7a';
/** A moment to look round a side room she has just walked into, before anyone talks. */
export const ARRIVE_MS = 800;

/** A side room's plan for `slot`, which must be a `kind` game: `scene` names the room in the error. */
export function sidePlan<K extends RoomPlan['kind']>(scene: string, slot: Slot, kind: K): Extract<RoomPlan, { kind: K }> {
  const p = planFor(slot);
  if (p.kind !== kind) throw new Error(`${scene}: room ${slot} plays ${p.game}`);
  return p as Extract<RoomPlan, { kind: K }>;
}

export abstract class SideRoom extends RoomScene {
  /**
   * Free play (item 060): closed. The parked v0.1 games are answer rooms
   * throughout; each live room opens it in its own phases where no answer waits.
   */
  protected override playOpen(): boolean {
    return false;
  }

  protected wrongTries = 0;
  private wrongN = 0;

  /** A wrong answer: funny, harmless, then try again. */
  protected async wrong(obj: Phaser.GameObjects.Container): Promise<void> {
    this.locked = true;
    this.wrongTries++;
    this.giggle(obj, obj.x, obj.y - 120, this.wrongN);
    // Cartoon dizzy stars circle the thing she picked, then pop away: funny, not wrong.
    for (let i = 0; i < 4; i++) {
      const star = this.add.image(obj.x, obj.y - 90, TEX.star).setTint(0xffd23f).setDepth(DEPTH.sparkles);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 900,
        onUpdate: (tw) => {
          const a = tw.getValue()! * Math.PI * 4 + (i * Math.PI) / 2;
          star.setPosition(obj.x + Math.cos(a) * 55, obj.y - 90 + Math.sin(a) * 16);
        },
        onComplete: () => star.destroy(),
      });
    }
    this.wrongN++;
    // A beat for the giggle before the line (hunt 11: the voice ducks the sfx to under half, and the giggle's
    // notes played under it; the bridge, the Shape-Shifter, the rhyme room and the entry hall wait it too).
    await this.wait(GIGGLE_BEAT_MS);
    await this.say(narratorLine(narrator(), variant('wrong')));
    this.locked = false;
    if (this.wrongTries >= 2) this.sparkleAnswer();
  }

  /**
   * After two misses on one item the right answer starts to sparkle, gently:
   * a scaffold so she always gets there, never a penalty or a "wrong" sound.
   */
  protected sparkleAnswer(): void {
    // Looked up directly: some games' correctSpot() is a dev cheat with side effects.
    const spot = this.spots.find((s) => s.correct === true && s.enabled);
    if (!spot || spot.obj.getData('sparkling')) return;
    spot.obj.setData('sparkling', true);
    const b = spot.obj.getBounds();
    const glow = this.sparkleSpot(spot, b.centerY, b.width, b.height, spot.obj.depth + 1);
    // A room that hides the picked spot before clearing it stops this too, `stopSparkle` (hunt 6: the
    // Shape-Shifter's stars kept rising from the empty floor through the morph and the praise).
    spot.obj.setData('sparkle', glow);
  }

  /** The answer's sparkle stops now: for a room that hides the picked spot before clearing it. */
  protected stopSparkle(spot: Spot): void {
    (spot.obj.getData('sparkle') as Phaser.GameObjects.Particles.ParticleEmitter | undefined)?.destroy();
  }
}

/**
 * The six live side rooms (the sentence game, the word machine, Charge the
 * Spell, the Stretchy Bridge, the Shape-Shifter, the rhyme room): a room off the hub for one of the
 * episode's slots, whose answers it records and whose way out leads back to the hub.
 * The parked v0.1 games extend `ParkedGame` instead. Every live room keeps its reading targets in
 * keepOut() and shows no names as targets: the box places itself and names its speaker.
 */
export abstract class HouseSideRoom extends SideRoom {
  /** The episode's slot this room plays (the attic is `counter`). */
  protected slot: Slot = 'a';
  /** The side room it plays in (content/house/house.ts): its art, entry and gap. Each room sets it from its plan in init. */
  protected roomId = '';
  private dadCloser: (() => void) | null = null;
  /** Time spent waiting for Dad's answer (scene clock, paused under dad lock and while a line plays). */
  private dadWaitMs = 0;
  /** Times this visit's wait for Dad ran out and the episode went solo (the hooks report it). */
  protected dadTimeouts = 0;

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    this.slot = data.slot ?? 'a';
    this.dadWaitMs = 0;
    this.dadTimeouts = 0;
  }

  override create(): void {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.closeDad());
  }

  /** F9 to the parent page and back reopens this same room. */
  protected override sceneData(): object {
    return { step: this.step, slot: this.slot };
  }

  protected background(): string {
    return `room_side_${this.roomId}`;
  }

  /**
   * The villain's mood over this room: calm (nothing shakes the room's words or thumps over the voice),
   * every decal on the floor outdoors (item 030), seeded by the room so its scatter is stable, clear of
   * `avoid` and on `floor`. One call for every live room, so none can drop `calm` or `floorOnly`.
   */
  protected houseMood(avoid: Phaser.Geom.Rectangle[], floor = this.floor): void {
    applyHouseMood(this, episode.villain, { seed: roomSeed(this.roomId), floor, calm: true, floorOnly: OUTDOOR_ROOMS.has(this.roomId), avoid });
  }

  /** The room's mood (`houseMood`), then her bag of fetched things: every live room's build but Charge's, which makes its bag later. */
  protected moodAndBag(avoid: Phaser.Geom.Rectangle[], floor = this.floor): Bag {
    this.houseMood(avoid, floor);
    return new Bag(this);
  }

  /** She walks in at (x, y): a hop and a puff where she comes in. */
  protected enter(x: number, y: number): void {
    this.player.place(x, y);
    this.player.hop();
    burst(this, this.player.x, this.player.y - 40, { count: 16, speed: 220 });
    sfxWhoosh();
  }

  /** The room was done before this run (back from the parent page at the end): straight back to the hub. */
  protected backToHubSoon(): void {
    this.time.delayedCall(600, () => backToHub(this, this.slot));
  }

  /** Does a copy of this word's picture fly into her bag once read? Not MOM or DAD (NO_BAG_COPY, hunt 10, M45): never a battle item. */
  protected bagCopy(word: string): boolean {
    return !NO_BAG_COPY.has(word);
  }

  /** A word's picture: a character's word shows that character's face in this episode's form (`castFace`). */
  protected wordArt(word: string): string {
    const w = WORD_BY_ID[word];
    return w ? pictureFor(w, castFace) : `pic_${word}`;
  }

  /**
   * A round's misses, and whether Dad helped on it, kept on the episode by
   * `<slot>:<word>` (episode.house.misses), so F9 and back neither turns a
   * miss into a first try nor makes a helped word unaided (items 039, 069).
   */
  protected keptMisses(word: string): number {
    return episode.house.misses?.[`${this.slot}:${word}`] ?? 0;
  }

  protected keepMisses(word: string, n: number): void {
    (episode.house.misses ??= {})[`${this.slot}:${word}`] = n;
  }

  protected keptAided(word: string): boolean {
    return Boolean(episode.house.misses?.[`${this.slot}:${word}:aided`]);
  }

  protected keepAided(word: string): void {
    (episode.house.misses ??= {})[`${this.slot}:${word}:aided`] = 1;
  }

  /** The round is answered: its kept misses and help go. */
  protected forgetMisses(word: string): void {
    if (!episode.house.misses) return;
    delete episode.house.misses[`${this.slot}:${word}`];
    delete episode.house.misses[`${this.slot}:${word}:aided`];
  }

  /**
   * New options landed in her reach (a round's tiles or stones where the last ones were): she steps up to
   * `y`, out of it, or a green mashed through the instruction picked one she never walked to (item 092,
   * hunt 6). Within `halfWidth` of `cx` (the thing she reads behind them) she steps to its side too (hunt 9).
   */
  protected stepClearOf(cx: number, halfWidth: number, y: number): void {
    if (!this.spots.some((sp) => Phaser.Math.Distance.Between(this.player.x, this.player.y, sp.x, sp.y) < REACH)) return;
    const x = Math.abs(this.player.x - cx) < halfWidth ? cx + Math.sign(this.player.x - cx || -1) * halfWidth : this.player.x;
    this.player.place(x, y);
  }

  /** The visit is over: fade out, back to the hub. */
  protected fadeToHub(): void {
    this.fadeOutThen(() => backToHub(this, this.slot));
  }

  /**
   * A word read: recorded under `words`, taken from her word bag when right
   * first time (else back in, so it comes round again soon), and learnt by the
   * episode now, so a skip mid-celebration loses nothing: read, fetched (a
   * battle item; not the attic's counter, `fetch: false`) and, on the visit's
   * `last` word, this slot done. Each room records its own extras.
   */
  protected recordRead(word: string, firstTry: boolean, wrongTries: number, { fetch = true, last = true } = {}): void {
    progress.record('words', word, firstTry, wrongTries);
    if (firstTry) progress.takeFromBag(word);
    else progress.returnToBag(word);
    this.recordDone(word, { fetch, last });
  }

  /** Read with the helper, no grown-up to judge (item 106): modelled in the store (no read, the bag untouched), and done for the episode like a read. */
  protected recordModelled(word: string, { fetch = true, last = true } = {}): void {
    progress.model('words', word);
    this.recordDone(word, { fetch, last });
  }

  /**
   * The episode learns the word: read, fetched (unless `fetch` is false, or it is a NO_BAG_COPY word, MOM
   * or DAD: hunt 10, M45) and, on the visit's `last` word, this slot done. A room's resume reads `read`.
   */
  protected recordDone(word: string, { fetch, last }: { fetch: boolean; last: boolean }): void {
    if (!episode.read.includes(word)) episode.read.push(word);
    if (fetch && !NO_BAG_COPY.has(word) && !episode.fetched.includes(word)) episode.fetched.push(word);
    if (last && !episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);
  }

  /**
   * Dad's buttons open for this room (any set it had open closes first); they close at shutdown. A press
   * once the room is on its way out does nothing (hunt 6: they stay open until Phaser stops the room, a
   * frame after key 0 or F9, and a 2 in that frame recorded a debug run's Charge read in the real store).
   */
  protected openDad(onPress: (a: DadAnswer) => void): void {
    this.closeDad();
    this.dadCloser = openDadButtons((a) => {
      if (isLeaving(this) || this.fadingOut) return;
      // Any press ends solo mode (item 106): he is here after all.
      if (episode.solo) {
        episode.solo = false;
        this.noteActivity();
      }
      onPress(a);
    });
  }

  /** A question is put to Dad: his cue lights and the wait for him starts again. */
  protected askDad(): void {
    this.dadWaitMs = 0;
    setDadAsking(true);
  }

  /** The wait for Dad starts again (a line is about to play over it). */
  protected resetDadWait(): void {
    this.dadWaitMs = 0;
  }

  /**
   * Called each frame while Dad is asked: true once nothing has come from him
   * for DAD_AWAY_MS (paused under dad lock and while a line plays). Then the
   * episode goes solo (item 106) and his cue goes out; the room carries on
   * without him.
   */
  protected dadAway(deltaMs: number): boolean {
    if (dadLock.locked || voiceBus.busy) return false;
    this.dadWaitMs += deltaMs;
    if (this.dadWaitMs < DAD_AWAY_MS) return false;
    this.dadWaitMs = 0;
    this.dadTimeouts++;
    episode.solo = true;
    setDadAsking(false);
    return true;
  }

  protected closeDad(): void {
    this.dadCloser?.();
    this.dadCloser = null;
  }
}
