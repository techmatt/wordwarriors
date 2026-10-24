/**
 * The battle's big beats (item 141, out of BattleScene), which the directors
 * (`part1()` / `part2()`, the story fight's StoryDirector) place on the
 * simulation clock: the team combo, a super's fan of its word's pictures
 * (`wordFx`), the villain's ultimate (`ultimateWindUp`, then Part 1's
 * `ultimateFloors` or Part 2's `ultimateCountered`, with its scare, shield and
 * undo stagings) and Part 2's `finish`.
 */

import Phaser from 'phaser';

import { CHARACTER_BY_ID, abilityCallout, comboFor, comboPart } from '../../content/battle/roster';
import type { AbilitySpec, CounterItem } from '../../content/battle/types';
import { fightLineKey, type FightSpec } from '../../content/battle/fights';
import { nameLine, reformedLine, ultimateLine } from '../../content/voice/ids';
import { stopMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxFanfare, sfxPoof, sfxShield, sfxShout, sfxSummon, sfxUltimate, sfxWhoosh } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { castArt, castScale, counterArt, counterWord, episode, helper, namedCounter, reformedOf, villainSpec } from '../episode/Episode';
import { burst, fitImage, fitPicture, flash, floatText, fxQuality, hitstop, popIn, punch, shake, shockwave, slowmo, speedLines } from '../fx/juice';
import { TEX } from '../fx/textures';
import { cast, type BattleWorld } from './abilities';
import { FLOOR_BOTTOM, FLOOR_TOP, initFromSpec, type Fighter } from './Fighter';
import type { BattleHud } from './hud';
import { BRAWL, type BattleSim, type BattleStats } from './sim';
import type { FightStage, Phase } from './stages/stage';
import { revealSpot } from './volleys';

/** What Part 2's counter stagings share (`ultimateCountered`): her hero `h`, and the counter-item's picture, its glow and its scale before the pop-in. */
interface CounterBeat {
  v: Fighter;
  ult: AbilitySpec;
  giant: boolean;
  h: Fighter;
  item: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  s: number;
  name: string;
  how: CounterItem['how'];
}

/** What the beats use from the battle (BattleScene). */
export interface BeatsHost extends BattleWorld {
  readonly part: 1 | 2;
  phase: Phase;
  readonly heroes: readonly Fighter[];
  readonly villain: Fighter;
  readonly fighters: readonly Fighter[];
  readonly fight: FightSpec;
  readonly show: FightStage;
  /** Its health floors, which the beats lower, and `kill`. */
  readonly sim: BattleSim;
  readonly hud: BattleHud;
  readonly stats: BattleStats;
  /** A story fight is playing: its own beats say what the counter is. */
  readonly inStory: boolean;
  wait(s: number): Promise<void>;
  say(key: string): Promise<boolean>;
  guard<T>(p: Promise<T>): Promise<T>;
  team(): Fighter[];
  /** Her own drawn height, the outfit's extra taken off. */
  heroHeight(): number;
  textGivesAway(text: string): boolean;
  lineGivesAway(id: string): boolean;
}

export class BattleBeats {
  constructor(private readonly b: BeatsHost) {}

  /** Two heroes fire a combo together. */
  async combo(): Promise<void> {
    const host = this.b;
    const scene = host.stage;
    const a = host.heroes[0]!;
    let b = host.heroes[1];
    // With no ally, the narrator swoops in for the combo and
    // leaves again: nobody fights alone at the big moment.
    let cameo: Fighter | null = null;
    if (!b || !b.active) {
      // The helper's roster id: a dad in today's form (his lines are per form too).
      const id = helper();
      cameo = host.spawn(initFromSpec(CHARACTER_BY_ID[id]!.good, id, castArt(id), 'hero'), -160, a.y + 30);
      cameo.invulnerable = true;
      b = cameo;
      void voiceBus.say(nameLine(id), 'bark', cameo);
      await host.wait(0.45);
    }
    host.phase = 'combo';
    const ab = comboFor(a.init.id, b.init.id);
    // Both glow and fly together, then fire as one.
    for (const f of [a, b]) {
      f.setShield(1.5, ab.color, host.now);
      burst(scene, f.cx, f.cy, { count: 40, speed: 300, colors: [ab.color, ab.color2 ?? 0xffffff] });
    }
    // Side by side, not one inside the other (item 034).
    scene.tweens.add({ targets: b, x: a.x + Math.max(90, a.bodyHalf + b.bodyHalf), y: a.y + 10, duration: 400 });
    if (!host.textGivesAway(abilityCallout(ab))) host.banner(abilityCallout(ab).toUpperCase(), ab.color, true);
    slowmo(scene, 0.35, 900);
    flash(scene, ab.color, 160);
    speedLines(scene, (a.cx + b.cx) / 2, (a.cy + b.cy) / 2, ab.color, 800);
    await host.wait(0.4);
    punch(scene, 0.06, 180);
    cast(host, a, comboPart(a.init.id, b.init.id), host.villain, 2.2);
    cast(host, b, comboPart(b.init.id, a.init.id), host.villain, 1.4);
    host.show.combo(a, b);
    host.stats.combos++;
    host.stats.abilitiesFired += 2;
    await host.wait(1.5);
    if (cameo) {
      const c = cameo;
      c.busyUntil = host.now + 10_000;
      scene.tweens.add({ targets: c, x: -220, duration: 600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    }
    if (host.phase === 'combo') host.phase = 'fight';
  }

  /**
   * The move word's own effect on a super: a fan of its picture (`pic_zap`
   * bolts, `pic_ice` cubes) bursting from the hero at the villain, each
   * popping in, bobbing and popping out by scale.
   */
  wordFx(word: string, f: Fighter, color: number): void {
    const scene = this.b.stage;
    const key = `pic_${word}`;
    if (!scene.textures.exists(key)) return;
    const v = this.b.villain;
    const n = fxQuality.level < 1 ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const img = fitImage(scene.add.image(f.cx, f.cy, key), 90, 90).setDepth(DEPTH.fx);
      const tx = (v?.active ? v.cx : f.cx + 300) + Phaser.Math.Between(-170, 170);
      const ty = (v?.active ? v.cy : f.cy) + Phaser.Math.Between(-140, 110);
      const delay = i * 70;
      popIn(scene, img, img.scale, delay, 220);
      scene.tweens.add({ targets: img, x: tx, y: ty, duration: 650, delay, ease: 'Quad.easeOut' });
      scene.tweens.add({
        targets: img,
        scale: 0,
        duration: 260,
        delay: delay + 900,
        ease: 'Back.easeIn',
        onComplete: () => {
          burst(scene, img.x, img.y, { count: 14, speed: 260, colors: [color, 0xffffff] });
          img.destroy();
        },
      });
    }
  }

  /**
   * A giant's ultimate fills the whole screen, not just the heroes' corner: a
   * wall of its colours sweeps the arena while its fire pours from the top edge
   * all the way across. Part 2 leaves out the wall (it would shove the heroes
   * out from under the counter-item); a `swallow` stops the pour itself.
   */
  private giantSweep(v: Fighter, ult: AbilitySpec, wall = true, pourMs = 1600): Phaser.GameObjects.Particles.ParticleEmitter {
    const b = this.b;
    const scene = b.stage;
    if (wall) cast(b, v, { ...ult, id: `${ult.id}_sweep`, kind: 'wave', power: 2 }, b.heroes[0] ?? null, 2.2);
    const pour = scene.add
      .particles(0, 0, TEX.smoke, {
        x: { min: 0, max: GAME_WIDTH },
        y: -40,
        speedY: { min: 500, max: 900 },
        speedX: { min: -160, max: -40 },
        scale: { start: 1.2, end: 2.6 },
        alpha: { start: 0.75, end: 0 },
        lifespan: 1000,
        frequency: 10,
        quantity: 4,
        tint: [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.fx + 1);
    flash(scene, ult.color, 220);
    b.after(pourMs, () => pour.stop());
    b.after(pourMs + 1200, () => pour.destroy());
    return pour;
  }

  /** The villain's ultimate. Part 1: the heroes are floored. Part 2: the counter-item answers it. */
  async ultimate(): Promise<void> {
    const { v, ult, giant, aura } = await this.ultimateWindUp();
    if (this.b.part === 1) await this.ultimateFloors(v, ult, giant);
    else await this.ultimateCountered(v, ult, giant, aura);
  }

  /** Both parts: everyone to their own side, then the villain grows and roars its ultimate. */
  async ultimateWindUp(): Promise<{ v: Fighter; ult: AbilitySpec; giant: boolean; aura: Phaser.GameObjects.Particles.ParticleEmitter }> {
    const b = this.b;
    const scene = b.stage;
    b.phase = 'ultimate';
    const v = b.villain;
    const ult = v.init.ultimate!;
    // The villain winds up as itself, not as a pig or an ice block.
    v.status = null;
    v.clearOverlay();
    // A giant (Tiamat) steps to the front of her half, so growing for the
    // ultimate fills the screen from the floor to near the top, head still in view.
    const giant = v.giant;
    // A contest's stage keeps everybody where its contest has them.
    if (!b.show.anchored) scene.tweens.add({ targets: v, x: giant ? BRAWL.ult.giantX : BRAWL.ult.villain.x, y: giant ? FLOOR_BOTTOM : BRAWL.ult.villain.y, duration: 600 });
    // Everyone back to their own side, so the big moment reads left against right.
    b.heroes.forEach((h, i) => {
      h.status = null;
      h.clearOverlay();
      if (!b.show.anchored) scene.tweens.add({ targets: h, x: BRAWL.ult.x + i * BRAWL.ult.dx, y: BRAWL.ult.y + i * BRAWL.ult.dy, duration: 600, ease: 'Quad.easeOut' });
    });
    await b.wait(0.6);
    sfxUltimate();
    b.darken(0.55, 800);
    shake(scene, 3, 1400);
    v.growUntil = b.now + 4500;
    // A roaring aura: particles streaming up off the villain while it charges.
    const aura = scene.add
      .particles(0, 0, TEX.spark, {
        speedY: { min: -420, max: -160 },
        speedX: { min: -80, max: 80 },
        scale: { start: 1.8, end: 0 },
        lifespan: 700,
        frequency: 6,
        tint: [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]],
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, v.height * 0.9, v.height * 0.5) } as never,
      })
      .setDepth(DEPTH.fx + 2);
    aura.startFollow(v.root, 0, -v.height * 0.6);
    b.after(3200, () => aura.stop());
    b.after(4200, () => aura.destroy());
    // A soft edge, fading inward, from past the screen's edge (hunt 10: one 80 px stroke drew a hard frame 40 px
    // in from every side, and the shake slid it about).
    const bands = Array.from({ length: 10 }, (_, i) => {
      const inset = -40 + i * 12;
      const a = inset <= 0 ? 0.5 : 0.5 * Math.max(0, 1 - inset / 80) ** 1.5;
      return scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 2 * inset, GAME_HEIGHT - 2 * inset).setStrokeStyle(12, ult.color, a);
    });
    const vignette = scene.add.container(0, 0, bands).setDepth(DEPTH.hud - 1).setAlpha(0);
    scene.tweens.add({ targets: vignette, alpha: 1, duration: 300, yoyo: true, repeat: 4, onComplete: () => vignette.destroy() });
    burst(scene, v.cx, v.cy, { count: 120, speed: 700, colors: [v.init.palette[0], v.init.palette[1], ult.color], life: 1200 });
    shockwave(scene, v.x, v.y, ult.color, 400, 900);
    // Not when its name holds a pad word still to come (SWALLOW THE SUN!, item 039), like its line below.
    if (!b.textGivesAway(ult.name)) b.banner(`${ult.name.toUpperCase()}!`, ult.color, true);
    slowmo(scene, 0.4, 1200);
    speedLines(scene, v.cx, v.cy, ult.color, 1200);
    punch(scene, 0.08, 300);
    if (!b.lineGivesAway(ultimateLine(v.init.id))) void voiceBus.say(ultimateLine(v.init.id), 'instruction', v);
    b.stats.ultimates++;
    await b.wait(1.4);
    return { v, ult, giant, aura };
  }

  /** Part 1, too strong: the heroes are floored, dizzy and fine. */
  async ultimateFloors(v: Fighter, ult: AbilitySpec, giant: boolean): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    b.sim.floors.heroMain = 0.06;
    cast(b, v, ult, b.heroes[0] ?? null, 2.6);
    if (giant) this.giantSweep(v, ult);
    // The style stages the villain winning the round (the brawl just lets it land).
    await b.show.ultimate1(v, ult);
    flash(scene, 0xffffff, 300);
    hitstop(scene, 160);
    shake(scene, 8, 600);
    punch(scene, 0.1, 220);
    sfxBoom(3);
    for (const h of b.team()) {
      h.hp = Math.min(h.hp, h.maxHp * 0.08);
      h.floored = true;
      h.lift = 0;
      h.setStatus('stun', 99, b.now);
      burst(scene, h.cx, h.cy, { count: 40, speed: 400, colors: [ult.color, 0xffffff] });
    }
    floatText(scene, GAME_WIDTH / 2 - 200, 300, b.fight.tooStrong, '#ffd23f', 60);
    b.darken(0.35, 600);
    await b.wait(1.2);
  }

  /**
   * Part 2: the counter, whatever the attic's sentence drew from her word
   * bag. The villain's own named item (Evil Tiamat's Magic Hat) when the
   * draw lands on its word, with its own staging; otherwise the thing in the
   * picture, which scares the villain silly whatever it is (item 015).
   */
  async ultimateCountered(v: Fighter, ult: AbilitySpec, giant: boolean, aura: Phaser.GameObjects.Particles.ParticleEmitter): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    b.phase = 'counter';
    const named = namedCounter();
    const word = counterWord();
    const counter = { name: named?.name ?? `The ${word}`, how: named?.how ?? 'scare' };
    for (const f of b.team()) f.invulnerable = true;
    const h = b.heroes[0]!;
    if (!b.inStory) void b.say('use_item');
    const at = revealSpot(b, h, 190, 190, 0);
    // A standing person or a wide picture by its own shape (M48).
    const item = fitPicture(scene.add.image(at.x, at.y - 95, counterArt()), 130, 130).setDepth(DEPTH.fx + 5);
    const s = item.scale;
    popIn(scene, item, s * 1.4, 0, 400);
    const halo = scene.add.image(item.x, item.y, TEX.glow).setTint(0xfff3a0).setScale(3).setBlendMode(Phaser.BlendModes.ADD).setDepth(FLOOR_TOP - 4);
    scene.tweens.add({ targets: halo, scale: 5, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });
    sfxSummon();
    flash(scene, 0xfff3a0, 250);
    speedLines(scene, item.x, item.y, 0xfff3a0, 900);
    b.banner(`${counter.name.toUpperCase()}!`, 0xffb703, true);
    await b.wait(0.6);

    const beat: CounterBeat = { v, ult, giant, h, item, halo, s, name: counter.name, how: counter.how };
    if (counter.how === 'scare') await this.counterScare(beat, aura, word, !!named);
    else if (counter.how === 'block' || counter.how === 'reflect' || counter.how === 'swallow') await this.counterShield(beat);
    else await this.counterUndo(beat);
    scene.tweens.killTweensOf(halo);
    halo.destroy();
    scene.tweens.add({ targets: item, alpha: 0, scale: 0, duration: 400, onComplete: () => item.destroy() });
    b.darken(0, 600);
    // The contest turns the heroes' way.
    await b.show.counter2(v);
    v.growUntil = 0;
    v.setStatus('stun', 99, b.now);
    floatText(scene, v.cx, v.top - 20, 'DIZZY!', '#ffd23f', 56);
    await b.wait(0.8);
  }

  /**
   * A swarm of the thing (wind-up mice, brave rats, cats, buses, mops)
   * scurries along the floor at the villain, who leaps up in fright
   * mid-ultimate (a stretch and a lift, no spin), and the ultimate fizzles
   * out before it is ever fired. Its picture whenever there is one, named
   * counters too (Matt's 017 call); the item's glyph otherwise.
   */
  private async counterScare({ v, ult, giant, h }: CounterBeat, aura: Phaser.GameObjects.Particles.ParticleEmitter, word: string, named: boolean): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    for (let i = 0; i < 12; i++) b.after(i * 70, () => this.scurry(h, v, i, `pic_${word}`));
    await b.wait(0.75);
    aura.stop();
    v.growUntil = 0;
    sfxShout(1.6);
    floatText(scene, v.cx, v.top - 40, 'EEK!', '#ff9ad5', 84);
    // Not the mop! She has read the word by now, so the villain may wail it.
    if (!named) b.after(350, () => floatText(scene, v.cx - 40, v.top - 130, `NOT THE ${word.toUpperCase()}!`, '#ffd23f', 56));
    shake(scene, 3, 300);
    // A giant (Evil Tiamat, standing at the front) only hops and stretches a
    // little, so her head stays on screen (she now takes this branch whenever
    // the counter is not her Magic Hat).
    const leap = giant ? 50 : 190;
    const stretch = giant ? 1.12 : 1.45;
    // From the height it is at: a flyer leaps up from the air, not from the floor.
    const lift0 = v.lift;
    scene.tweens.addCounter({ from: 0, to: 1, duration: 750, ease: 'Sine.easeInOut', onUpdate: (tw) => (v.lift = lift0 + Math.sin((tw.getValue() ?? 0) * Math.PI) * leap), onComplete: () => (v.lift = lift0) });
    const bs = v.baseScale;
    scene.tweens.add({ targets: v.sprite, scaleX: bs * (giant ? 0.9 : 0.72), scaleY: bs * stretch, duration: 170, yoyo: true, repeat: 1, onComplete: () => v.sprite.setScale(bs) });
    await b.wait(0.8);
    // The fizzle: the charge goes out of it in a grey puff.
    sfxPoof();
    burst(scene, v.cx, v.cy, { count: 50, speed: 260, colors: [0x888888, 0xcccccc, ult.color], life: 900 });
    floatText(scene, v.cx + 60, v.cy, 'FIZZLE!', '#cccccc', 44);
    await b.wait(1.0);
  }

  /**
   * `block`, `reflect`, `swallow`: a dome over the heroes, all of them (the
   * ally can be well apart from her); the ultimate crashes into it. A
   * `swallow` item then sucks the storm inside; a `reflect` sends it back.
   */
  private async counterShield({ v, ult, giant, h, item, halo, s, how }: CounterBeat): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    const team = b.team();
    const xs = team.map((f) => f.x);
    const ys = team.map((f) => f.cy);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const dome = scene.add
      .ellipse((x0 + x1) / 2, (y0 + y1) / 2 - 20, Math.max(520, x1 - x0 + 300), Math.max(360, y1 - y0 + 280), 0x9ad8ff, 0.18)
      .setStrokeStyle(10, 0xffffff, 0.9)
      .setDepth(DEPTH.fx + 3);
    popIn(scene, dome, 1, 0, 300);
    sfxShield();
    cast(b, v, ult, h, 2.2);
    const pour = giant ? this.giantSweep(v, ult, false, how === 'swallow' ? 3000 : 1600) : null;
    if (how !== 'swallow') {
      await b.wait(1.8);
      // Not BLOCKED: BLOCK is a bank word (hunt 8, `tests/unit/shouts.test.ts`).
      floatText(scene, h.x + 60, h.y - 280, 'SHIELDED!', '#7ad9ff', 70);
    } else {
      // The item (the Magic Hat, drawn brim up) flies up between them while
      // the storm is still falling and sucks it all inside like a magic trick;
      // she shrinks back to size behind the GULP.
      await b.wait(0.6);
      scene.tweens.killTweensOf(halo);
      scene.tweens.add({ targets: [item, halo], x: GAME_WIDTH / 2, y: 260, duration: 500, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: item, scale: s * 2, duration: 500, ease: 'Back.easeOut' });
      await b.wait(0.5);
      pour?.stop();
      const vortex = scene.add
        .particles(0, 0, TEX.smoke, {
          x: { min: 0, max: GAME_WIDTH },
          y: { min: 0, max: GAME_HEIGHT },
          moveToX: item.x,
          moveToY: item.y + 30,
          scale: { start: 1.4, end: 0.1 },
          alpha: { start: 0.9, end: 0.2 },
          lifespan: 700,
          frequency: 6,
          quantity: 3,
          tint: [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(DEPTH.fx + 4);
      sfxWhoosh();
      b.after(400, () => sfxWhoosh());
      b.after(800, () => sfxWhoosh());
      scene.tweens.add({ targets: item, scaleX: item.scaleX * 1.25, scaleY: item.scaleY * 0.8, duration: 120, yoyo: true, repeat: 6 });
      b.darken(0.2, 1200);
      await b.wait(1.4);
      vortex.stop();
      floatText(scene, item.x, item.y - 110, 'GULP!', '#ffd23f', 84);
      sfxPoof();
      burst(scene, item.x, item.y, { count: 70, speed: 420, colors: [0xffd23f, 0xffffff, ult.color] });
      burst(scene, v.cx, v.cy, { count: 50, speed: 320, colors: [0xffffff, ult.color, v.init.palette[1]] });
      v.growUntil = 0;
      b.after(900, () => vortex.destroy());
      await b.wait(0.8);
    }
    if (how === 'reflect') {
      b.banner('BOUNCE BACK!', 0x7ad9ff, true);
      cast(b, h, ult, v, 2.4);
      await b.wait(1.6);
    }
    scene.tweens.add({ targets: dome, alpha: 0, duration: 400, onComplete: () => dome.destroy() });
  }

  /**
   * `restore`, `reveal`, `shutdown`, `calm`: the ultimate really happens first
   * (the sun is swallowed, the clones appear, the lasers fire), with the
   * heroes shielded by the item's glow; then the item visibly undoes it.
   */
  private async counterUndo({ v, ult, h, name, how }: CounterBeat): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    cast(b, v, ult, h, 2.0);
    await b.wait(1.6);
    // A beam of the item's own light straight into the villain.
    const light: AbilitySpec = { id: 'counter_light', name, kind: 'beam', cooldown: 0, color: 0xfff3a0, color2: 0xffb703, power: 3 };
    cast(b, h, light, v, 2.4);
    if (how === 'restore') {
      // The light comes back: the sun pops into the sky with rays.
      b.darken(0, 900);
      const sun = scene.add.image(GAME_WIDTH * 0.72, 120, 'prop_sun').setDisplaySize(160, 160).setDepth(FLOOR_TOP - 3);
      popIn(scene, sun, sun.scale, 0, 500);
      speedLines(scene, sun.x, sun.y, 0xffd23f, 900);
      burst(scene, sun.x, sun.y, { count: 90, speed: 500, colors: [0xffd23f, 0xffffff, 0xff9a3c] });
      sfxFanfare();
    }
    if (how === 'reveal') {
      for (const c of b.fighters.filter((f) => f.init.kind === 'clone')) b.hit(c, 1, 0xffffff, h);
    }
    if (how === 'shutdown') {
      await b.wait(0.6);
      v.baseTint = 0x777777;
      v.restoreTint();
      floatText(scene, v.cx, v.top, 'POWER OFF!', '#ff5a6a', 56);
    }
    if (how === 'calm') {
      await b.wait(0.4);
      for (let i = 0; i < 12; i++) b.after(i * 80, () => floatText(scene, v.cx + (Math.random() - 0.5) * 200, v.cy + (Math.random() - 0.5) * 120, '💖', '#ff5ab4', 40));
    }
    await b.wait(1.4);
  }

  /**
   * One of the swarm (`art`, the counter word's picture, or the villain's
   * counter glyph if that art is missing): low and fast along the floor from
   * her side to the villain, then off the edge.
   */
  private scurry(from: Fighter, to: Fighter, i: number, art: string): void {
    const scene = this.b.stage;
    const y0 = Phaser.Math.Clamp(from.y + (Math.random() - 0.5) * 60, FLOOR_TOP, FLOOR_BOTTOM);
    const m = scene.textures.exists(art)
      ? fitImage(scene.add.image(from.x + 30, y0, art), 58, 58).setOrigin(0.5, 1).setDepth(y0 + 2)
      : scene.add.text(from.x + 30, y0, villainSpec().counter.glyph, { fontSize: '42px' }).setOrigin(0.5, 1).setDepth(y0 + 2);
    const ty = Phaser.Math.Clamp(to.y + (Math.random() - 0.5) * 70, FLOOR_TOP, FLOOR_BOTTOM);
    // A scurry: quick little squashes, never a spin.
    scene.tweens.add({ targets: m, scaleY: m.scaleY * 0.78, scaleX: m.scaleX * 1.12, duration: 60, yoyo: true, repeat: -1 });
    const done = () => {
      scene.tweens.killTweensOf(m);
      m.destroy();
    };
    scene.tweens.add({
      targets: m,
      x: to.x + (Math.random() - 0.4) * 70,
      y: ty,
      duration: 480 + Math.random() * 160,
      onUpdate: () => m.setDepth(m.y + 2),
      onComplete: () => {
        burst(scene, m.x, m.y - 20, { count: 10, speed: 200, colors: [0xc8c8d0, 0xffffff] });
        if (i % 3 === 0 && to.active) this.b.hit(to, 0.4, 0xc8c8d0, from);
        scene.tweens.add({ targets: m, x: GAME_WIDTH + 80, alpha: 0.6, duration: 500, onComplete: done });
      },
    });
  }

  /** Part 2's finish: everyone's biggest move, then the villain is beaten and turns good. */
  async finish(): Promise<void> {
    const b = this.b;
    const scene = b.stage;
    b.phase = 'finish';
    const v = b.villain;
    b.show.finishLine();
    await b.say(fightLineKey(b.fight, 'finish'));
    // Low, but not zero: the last hit below is the one that wins.
    b.sim.floors.villainMain = 0.06;
    const team = b.team();
    for (const [i, h] of team.entries()) {
      b.after(i * 700, () => {
        const ab = h.init.ultimate ?? h.init.abilities[0]!;
        cast(b, h, ab, v, 2.0, true);
        b.stats.abilitiesFired++;
      });
    }
    await b.wait(team.length * 0.7 + 0.5);
    await b.wait(1.6);
    await b.show.finish(v);
    // The last hit.
    stopMusic();
    b.sim.floors.villainMain = 0;
    v.hp = 0;
    hitstop(scene, 220);
    slowmo(scene, 0.2, 1500);
    flash(scene, 0xffffff, 400);
    shake(scene, 9, 800);
    punch(scene, 0.12, 260);
    speedLines(scene, v.cx, v.cy, 0xffd23f, 1200);
    sfxBoom(3);
    shockwave(scene, v.cx, v.cy, 0xffd23f, 600, 900);
    burst(scene, v.cx, v.cy, { count: 200, speed: 900, life: 1500, colors: [0xffd23f, 0xff5ab4, 0x7ad9ff, 0xffffff] });
    b.banner(b.fight.win, 0xffd23f, true);
    for (const f of b.fighters) if (f.team === 'villain' && !f.isMain && f.active) b.sim.kill(f);
    // The villain stretches up and squashes into a puff, and comes back as the good version.
    // A stretch up, then a squash to nothing: scale only.
    v.alive = false;
    scene.tweens.add({ targets: v.body, scaleX: 0.4, scaleY: 1.6, duration: 350, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: v.body, scaleX: 1.8, scaleY: 0, duration: 500, delay: 350, ease: 'Back.easeIn' });
    await b.wait(1.0);
    sfxPoof();
    // As tall beside her hero as the villain's good size says (Scar just under her).
    const gh = b.heroHeight() * castScale(episode.villain);
    const good = fitImage(scene.add.image(v.x, v.y, castArt(episode.villain)).setOrigin(0.5, 1), gh * 0.95, gh).setDepth(v.y + 1);
    popIn(scene, good, good.scale, 0, 500);
    burst(scene, v.x, v.y - 90, { count: 60, speed: 400, colors: [0xff9ad5, 0xffffff] });
    v.root.setVisible(false);
    // Good again: the corner label drops its EVIL too (item 039).
    const goodName = CHARACTER_BY_ID[episode.villain]?.good.displayName;
    if (goodName) b.hud.renameVillain(goodName.toUpperCase());
    for (const h of b.heroes) h.invulnerable = false;
    // Good again, the villain says sorry (or asks to come next time) in its own
    // voice, in a bubble over its good self. The victory says another.
    // One of three, drawn with the cast (item 040).
    await b.wait(0.6);
    const sorry = reformedOf('sorry');
    if (sorry) await b.guard(voiceBus.say(reformedLine(episode.villain, sorry.key), 'bark', { x: good.x, y: good.y, bubbleOffset: good.displayHeight, active: true }));
  }
}
