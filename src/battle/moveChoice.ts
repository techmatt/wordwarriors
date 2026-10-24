/**
 * The battle's move choice: the frozen-fight word pick. 2–3 move words stand
 * on the arena floor as glowing pads, each with its word on a sign; she walks
 * her hero (on real time, the fight nearly frozen) onto one and presses green.
 * Only the right word closes the choice; a wrong one wiggles, giggles and is
 * named, as often as it takes.
 *
 * BattleScene owns one and drives it: the director's `moveChoice()` freezes
 * the fight, `open()`s it and awaits her right pick, then `close()`s it and
 * fires the super. Every frame it calls `update()` (before the fighters) and
 * `holdHero()` (after them, so her hero stays where she walked).
 */

import Phaser from 'phaser';

import { moveKey, narratorLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import { sfxSelect, sfxWrong } from '../audio/sfx';
import { CHOICE_REPROMPT, DEPTH, FONT_COMIC, FONT_HEAVY, GAME_HEIGHT, GAME_WIDTH, REACH, STICK_HINT_MS } from '../config';
import { episode, narrator } from '../episode/Episode';
import { TEX } from '../fx/textures';
import type { BattleInfo } from '../hookState';
import type { Controls } from '../input/Controls';
import { dadLock } from '../input/dadLock';
import { makeButtonDot } from '../ui/ButtonDot';
import { fitText } from '../ui/fitText';
import { makeStickHint, placeStickHint } from '../ui/stickHint';
import { FLOOR_BOTTOM, FLOOR_TOP, NO_AFTERIMAGES, type Fighter } from './Fighter';
import { ARENA_LEFT, ARENA_RIGHT, stickWalk } from './movement';
import { RING_H, RING_W, SIGN_H, SIGN_RISE, SIGN_W, clearSpot, dotBeside, dotSide, placeContestPads, placePads, standingWords, stepOutX, type Box, type PlaceBody, type PlaceInput } from './padPlace';

/** A fighter as pad placement sees it. */
const placeBody = (f: Fighter): PlaceBody => ({ x: f.x, y: f.y, cx: f.cx, cy: f.cy, half: f.bodyHalf, top: f.top });

/** The move pads' glow. One colour for all: the word on the sign is the choice, never a colour. */
const PAD_GLOW = 0x7ad9ff;
/** Where a fighter stepping off the pads may go. */
const FLOOR = { left: ARENA_LEFT, right: ARENA_RIGHT, top: FLOOR_TOP, bottom: FLOOR_BOTTOM };
/** How long her team takes to step off the pad row when a choice opens (wall-clock ms; the fight's clock is frozen). */
const STEP_BACK_MS = 450;
/** How far a contest's held fighter may rock either way while the choice is open (the rope pull's rock is up to 26 px, item 083). */
const CONTEST_SWAY = 40;

/** What the battle lends the move choice. */
export interface ChoiceHost {
  readonly stage: Phaser.Scene;
  readonly heroes: readonly Fighter[];
  readonly villain: Fighter;
  readonly fighters: readonly Fighter[];
  readonly controls: Controls;
  /** The fight style holds everyone in place (a contest's stage): pads stay on her side, nobody steps back. */
  readonly anchored: boolean;
  /**
   * A story fight's props (the stone, the ledge, the hoard) as floor boxes, null outside one
   * (hunt 10, M54): there her reach outranks every other placement rule, and the rings keep
   * off the props where they can.
   */
  storyProps(): Box[] | null;
  /** The fight style's own floor boxes the rings keep off where they can (hunt 11, M76: the clash point's flare). */
  choiceKeepOff(): Box[];
  /** Say a narrator line, guarded by the scene's run. */
  say(key: string): Promise<boolean>;
  /** Drop `p` if this run of the scene ends first (SceneGen). */
  guard<T>(p: Promise<T>): Promise<T>;
  /** No free-play charge, jump or shot carries into the choice. */
  stopPlay(): void;
  /** A fighter done with: it poofs away. */
  killFighter(f: Fighter): void;
}

/** A move word standing in the arena as a place she walks to. */
interface MovePad {
  word: string;
  x: number;
  y: number;
  /** The floor ring and its glow, pulsed by hand on wall-clock time. */
  ring: Phaser.GameObjects.Container;
  /** The word on its sign, above the fighters. */
  sign: Phaser.GameObjects.Container;
  /** Wall-clock ms its pop-in starts. */
  bornAt: number;
  /** Wall-clock ms of its last "not that one" wiggle. */
  wiggleAt?: number;
}

interface Choice {
  words: string[];
  right: string;
  /** Which choice this is (`move:<part>:<n>`), for the misses kept in `episode.house.misses`. */
  key: string;
  /** Everything the choice put on screen, destroyed when it closes. */
  objs: Phaser.GameObjects.GameObject[];
  /** The fight's effects faded back while it is frozen, and their alpha before. */
  veiled: { o: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.AlphaSingle; alpha: number }[];
  /** The veiled objects' tweens, paused while it is open (hunt 11: a trap card's alpha pulse undid its veil). */
  paused: Phaser.Tweens.Tween[];
  pads: MovePad[];
  /** The pad she is standing at (within REACH), or null. */
  near: MovePad | null;
  /** The green dot over the lit pad. */
  dot: Phaser.GameObjects.Container;
  /** The "I am here" ring at her hero's feet. */
  here: Phaser.GameObjects.Ellipse;
  open: boolean;
  /**
   * Quiet seconds since the word was last said, on the clamped frame clock her
   * walk uses, for the idle re-prompt (item 034): only while the pads are open,
   * nobody talks and she is not walking, so it never repeats the word while
   * she is on her way to a pad.
   */
  idle: number;
  /**
   * Where her hero is during the choice, and how high she floats. Written back
   * every frame, so a leap, dash or spin that was mid-flight when the choice
   * opened (its timer still ticking on the frozen clock) cannot pull her off it.
   */
  at: { x: number; y: number; lift: number };
  /** Where she stood as the pads went down (the bug-hunt checker's `pad-in-reach`, hunt 7). */
  from: { x: number; y: number };
  /** Her step out from behind the villain (M75): her x eases from `from` to `to` over STEP_BACK_MS from `at`, the stick ignored. */
  heroStep: { from: number; to: number; at: number } | null;
  /** Wrong pads she has picked so far in this choice. */
  misses: number;
  /** Seconds she has stood still while the pads are open (not reset by the re-prompt): the stick hint's clock (item 043, M5). */
  still: number;
  /** The stick hint beside her hero, while she stands still. */
  stickHint: Phaser.GameObjects.Container | null;
  /** Her team stepping off the pad row (item 043, M6), and the villain once settled (M8): each from where it stood to a spot no sign or ring covers, on wall-clock time from its `at` (else `stepAt`). */
  stepBack: { f: Fighter; from: { x: number; y: number }; to: { x: number; y: number }; at?: number }[];
  stepAt: number;
  /** Where the villain was last seen moving, and when (wall-clock ms): his step back waits until he settles. */
  villainSeen?: { x: number; y: number; lift: number; at: number };
  /** In a contest, where her team and the villain stood as the pads went down: held there (hunt 11). */
  pinned: { f: Fighter; x: number; y: number }[];
  resolve: () => void;
}

export class MoveChoice {
  private current: Choice | null = null;

  constructor(private readonly host: ChoiceHost) {}

  /** A choice is open: her hero is hers to walk. */
  get active(): boolean {
    return this.current !== null;
  }

  /** A new run of the scene: no choice. */
  reset(): void {
    this.current = null;
  }

  /**
   * Put the pads up for `words` and wait for `right`: resolves with her misses
   * once she picks it, and the words that stood (`shown`: two of three in a contest
   * whose held team three rings cannot keep off, M65). The fight is already frozen
   * and `me` freed and placed at `at`.
   */
  open(words: string[], right: string, key: string, me: Fighter, at: { x: number; y: number; lift: number }): Promise<{ misses: number; shown: string[] }> {
    const scene = this.host.stage;
    // Her team's clones (MASK's "three of her pop up") poof as the pads go down: copies of her stood on the
    // pads' rings and under the signs, and beside her, a choice of which one is her (hunt 11, the story fight).
    // At once: the pop-out squash runs on the frozen clock, seconds of real time.
    for (const f of this.host.fighters.filter((x) => x.init.kind === 'clone' && x.team === me.team)) {
      this.host.killFighter(f);
      f.root.setVisible(false);
    }
    const objs: Phaser.GameObjects.GameObject[] = [];
    // A light dim behind the fighters (not over them), so the pads and signs read.
    objs.push(scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0018, 0.3).setDepth(FLOOR_TOP - 3.5));
    objs.push(
      scene.add
        .text(GAME_WIDTH / 2, 110, 'PICK A MOVE!', { fontFamily: FONT_HEAVY, fontSize: '56px', color: '#ffd23f', stroke: '#000000', strokeThickness: 12 })
        .setOrigin(0.5)
        .setDepth(DEPTH.overlay),
    );
    // Behind the villain at the arena's end in a brawl, she steps out past him first (M75): the pads are placed
    // round where she will stand, and pop in once she is there.
    const v = this.host.villain;
    const outX = !this.host.anchored && v?.active ? stepOutX({ x: at.x, half: me.bodyHalf }, placeBody(v), ARENA_LEFT, ARENA_RIGHT) : null;
    const heroStep = outX === null ? null : { from: at.x, to: outX, at: performance.now() };
    const stand = { x: outX ?? at.x, y: at.y };
    const spots = this.padSpots(words.length, me, stand);
    const shown = standingWords(words, right, spots.length);
    const popAt = performance.now() + 120 + (heroStep ? STEP_BACK_MS : 0);
    const pads = spots.map((p, i) => this.makePad(shown[i]!, p.x, p.y, popAt + i * 140));
    for (const p of pads) objs.push(p.ring, p.sign);
    const dot = makeButtonDot(scene, 0, 0, 'green', 22, false).setDepth(DEPTH.prompt).setVisible(false);
    objs.push(dot);
    // "I am here": a white ring at her hero's feet, so she finds herself among the signs.
    const here = scene.add.ellipse(me.x, me.y, 150, 52).setStrokeStyle(6, 0xffffff, 0.95).setDepth(DEPTH.prompt - 6);
    objs.push(here);
    // The fight's effects fade back while it is frozen (item 039: Jörmungandr's
    // coil, timed on the scene clock, circled over the pads for the whole choice).
    const veiled: Choice['veiled'] = [];
    const paused: Phaser.Tweens.Tween[] = [];
    // A dash's white afterimage fades in 350 ms of the frozen clock, about nine
    // real seconds: it stood over her ally as a white silhouette (item 039).
    for (const o of [...scene.children.list]) if (o.getData('afterimage')) o.destroy();
    // ...and none made after: a dash's or slam's afterimage timer runs on the frozen clock too (item 069).
    scene.data.set(NO_AFTERIMAGES, true);
    for (const o of scene.children.list) {
      const d = (o as unknown as { depth: number }).depth;
      const a = o as unknown as Phaser.GameObjects.Components.AlphaSingle;
      if (d >= DEPTH.fx && d < DEPTH.prompt - 10 && typeof a.alpha === 'number' && !objs.includes(o) && o !== me.root) {
        veiled.push({ o: o as never, alpha: a.alpha });
        for (const t of scene.tweens.getTweensOf(o)) if (t.isPlaying()) {
          t.pause();
          paused.push(t);
        }
        a.setAlpha(a.alpha * 0.2);
      }
    }

    return new Promise<{ misses: number; shown: string[] }>((resolve) => {
      const c: Choice = { words: shown, right, key, objs, veiled, paused, pads, near: null, dot, here, open: false, idle: 0, at, from: { x: Math.round(stand.x), y: Math.round(stand.y) }, heroStep, misses: episode.house.misses?.[key] ?? 0, still: 0, stickHint: null, stepBack: this.teamStepBack(stand, pads), stepAt: performance.now(), pinned: this.pinContest(me), resolve: () => resolve({ misses: c.misses, shown }) };
      this.current = c;
      // No charge, jump or shot in flight carries into the choice (holdHero zeroes the hop).
      this.host.stopPlay();
      void (async () => {
        await this.host.say('move_pick');
        await this.host.say(moveKey('use_move', right));
        if (this.current) this.reopen(this.current);
      })();
    });
  }

  /** Take everything the choice put up down again, and give the fight's effects back their alpha. */
  close(): void {
    const c = this.current;
    if (!c) return;
    this.host.stage.data.set(NO_AFTERIMAGES, false);
    for (const o of c.objs) o.destroy();
    // Back as they were, unless something has set their alpha since (a fade-out finishing).
    for (const v of c.veiled) if (v.o.active && Math.abs(v.o.alpha - v.alpha * 0.2) < 0.01) v.o.setAlpha(v.alpha);
    for (const t of c.paused) if (t.isPaused()) t.resume();
    // The race's ally drawn over the villain for the choice (fix 227) goes back to his lane's depth now: a busy or
    // frozen ally is not steered, and kept it through the payoff, over her hero.
    for (const f of this.host.heroes) f.depthOver = null;
    this.current = null;
  }

  /** For the tests (`hookState.battle.choice`). */
  info(): BattleInfo['choice'] {
    const c = this.current;
    const heroes = this.host.heroes;
    return c
      ? {
          words: c.words,
          right: c.right,
          open: c.open,
          misses: c.misses,
          from: c.from,
          spots: c.pads.map((p) => ({ word: p.word, x: p.x, y: p.y })),
          stickHint: Boolean(c.stickHint?.active),
          stickNub: c.stickHint?.active ? (c.stickHint.list[1] as Phaser.GameObjects.Arc).x : null,
          // Item 043, M6: each sign's plate and each teammate's body, in screen coordinates.
          signs: c.pads.map((p) => [p.x - SIGN_W / 2, p.y - SIGN_RISE - SIGN_H / 2, p.x + SIGN_W / 2, p.y - SIGN_RISE + SIGN_H / 2]),
          team: heroes.filter((f) => f !== heroes[0] && f.active).map((f) => ({ id: f.init.id, box: [f.x - f.bodyHalf, f.top, f.x + f.bodyHalf, f.y] })),
          // Item 071, M8 and M17: the villain's body, which no sign may cover.
          villain: this.host.villain?.active ? [this.host.villain.x - this.host.villain.bodyHalf, this.host.villain.top, this.host.villain.x + this.host.villain.bodyHalf, this.host.villain.y] : null,
        }
      : null;
  }

  /** Where the pads go (padPlace.ts): clear of every fighter, no sign over the villain or a contest's held team. */
  private padSpots(n: number, me: Fighter, stand: { x: number; y: number }): { x: number; y: number }[] {
    // Her body where she will stand (M75: stepped out from behind the villain).
    const body = (f: Fighter): PlaceBody => (f === me ? { ...placeBody(f), x: stand.x, cx: f.cx + stand.x - f.x } : placeBody(f));
    const v = this.host.villain;
    // Minions too (item 039: a pad under a crowd of skeletons or dragon babies did not read as a place to stand).
    const avoid = [me, v, ...this.host.fighters.filter((f) => f.active)].filter((f, i, a) => f?.active && a.indexOf(f) === i);
    // The team steps back off the signs in a fight (M6), but holds its stations in a contest (M17).
    const team = this.host.anchored ? this.host.fighters.filter((f) => f !== me && f.active && this.host.heroes.includes(f)) : [];
    // A story fight (M54): its stage is always crowded, so a mashed green would pick a pad she never walked to.
    const props = this.host.storyProps();
    // A contest's held team keep their stations, so a ring keeps off them where it can, as off a story prop
    // (hunt 11: in the sea tug the leftmost ring stood round the ally at her rope, every choice).
    const held = team.map((f): [number, number, number, number] => [f.x - f.bodyHalf, f.top, f.x + f.bodyHalf, f.y + 20]);
    // ...and off the fight style's own (M76: the clash point's flare).
    const keepOff = [...(props ?? []), ...held, ...this.host.choiceKeepOff()];
    const input: PlaceInput = {
      n,
      avoid: avoid.map(body),
      cover: [...(v?.active ? [v] : []), ...team].map(body),
      contest: this.host.anchored && v?.active ? { meX: stand.x, villain: body(v) } : undefined,
      // A contest's held bodies keep rocking at the freeze's slow clock (item 083, the rope pull's serpent).
      sway: this.host.anchored ? CONTEST_SWAY : 0,
      left: ARENA_LEFT,
      right: ARENA_RIGHT,
      // A margin past her reach: she may still be settling when the pads go down.
      me: { x: stand.x, y: stand.y, reach: REACH + 25, first: props !== null },
      keepOff: keepOff.length ? keepOff : undefined,
    };
    // Two pads in a contest when three cannot keep off the held team (M65); not the story fight, whose plan
    // has one sensible word per beat and whose her-reach-first rule already crowds it.
    return props === null ? placeContestPads(input, held) : placePads(input);
  }

  /** One move word as a place: a glowing rune ring on the floor and its word on a sign above. */
  private makePad(word: string, x: number, y: number, bornAt: number): MovePad {
    const add = this.host.stage.add;
    const glow = add.image(0, 0, TEX.glow).setTint(PAD_GLOW).setScale(3.2, 1.3).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
    const disc = add.ellipse(0, 0, RING_W, RING_H, PAD_GLOW, 0.3).setStrokeStyle(6, 0xffffff, 0.9);
    const inner = add.ellipse(0, 0, 140, 46).setStrokeStyle(3, PAD_GLOW, 1);
    const runes = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return add.circle(Math.cos(a) * 82, Math.sin(a) * 29, 5, 0xffffff, 0.9);
    });
    const ring = add.container(x, y, [glow, disc, inner, ...runes]).setDepth(FLOOR_TOP - 3);
    const sy = y - SIGN_RISE;
    const plate = add.rectangle(0, 0, SIGN_W, SIGN_H, 0xfff8e8, 0.97).setStrokeStyle(7, PAD_GLOW);
    const stake = add.rectangle(0, 62, 10, 26, 0xfff8e8, 0.9);
    // Shrunk to the plate if long (BLAST ran over its edges, item 039).
    const label = fitText(
      add.text(0, 0, word.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '76px', color: '#1a1030' }).setOrigin(0.5),
      210,
      92,
    );
    const sign = add.container(x, sy, [stake, plate, label]).setDepth(DEPTH.prompt - 10);
    // What she reads and walks to: the bug-hunt checker's probe checks nothing covers them (item 059).
    sign.setData('qaTarget', `sign_${word}`);
    // The disc, not the ring's container: its soft glow spreads twice as wide and is not what she walks onto.
    disc.setData('qaTarget', `pad_${word}`);
    // Popped in from nothing by update(), on wall-clock time.
    sign.setScale(0);
    ring.setScale(0);
    return { word, x, y, ring, sign, bornAt };
  }

  /**
   * Where her teammates stand while a choice is open (item 043, M6): a tall
   * ally behind a sign disappeared. Each one standing where a sign or a ring
   * would cover them (or they it) steps to the nearest spot that is clear of
   * every sign, every ring, her hero and each other. Not in a contest, whose
   * staging holds everyone in place (a rope, a race lane); the pads keep off
   * them there instead (padSpots).
   */
  private teamStepBack(stand: { x: number; y: number }, pads: MovePad[]): Choice['stepBack'] {
    if (this.host.anchored) return [];
    const me = this.host.heroes[0];
    const taken: { x: number; y: number }[] = [{ x: stand.x, y: stand.y }];
    const out: Choice['stepBack'] = [];
    for (const f of this.host.heroes) {
      if (f === me || !f.active) continue;
      const to = clearSpot({ x: f.x, y: f.y, half: f.bodyHalf, h: Math.max(60, f.y - f.top) }, pads, taken, FLOOR);
      taken.push(to);
      if (to.x !== f.x || to.y !== f.y) out.push({ f, from: { x: f.x, y: f.y }, to });
    }
    return out;
  }

  /**
   * A contest's team and villain, held where they stood as the pads went down (hunt 11): the pads keep off
   * them there (padSpots), but on the slowed clock the stage kept easing them to their places and a late
   * bolt's knockback, a bubble's drift or a shove moved them on: the sea tug's serpent slid under PIG's sign.
   */
  private pinContest(me: Fighter): Choice['pinned'] {
    if (!this.host.anchored) return [];
    return [...this.host.heroes, this.host.villain].filter((f): f is Fighter => Boolean(f?.active) && f !== me).map((f) => ({ f, x: f.x, y: f.y }));
  }

  /**
   * The villain steps back off the pads too (item 071, M8), once he has
   * settled: one mid-leap when the choice opened lands on the frozen clock,
   * after the pads were placed, and came down on a ring (QUEST under Evil
   * Tiamat). Settled is a second of wall-clock time without moving; then he
   * steps clear like the team and holds there. Not in a contest (he holds his station).
   */
  private villainStepBack(c: Choice, me: Fighter): void {
    const v = this.host.villain;
    if (this.host.anchored || c.stepBack.some((s) => s.f === v) || !v?.active) return;
    const wall = performance.now();
    const seen = c.villainSeen;
    if (!seen || Math.abs(seen.x - v.x) > 1 || Math.abs(seen.y - v.y) > 1 || Math.abs(seen.lift - v.lift) > 1) {
      c.villainSeen = { x: v.x, y: v.y, lift: v.lift, at: wall };
      return;
    }
    if (wall - seen.at < 1000) return;
    // Her and every teammate where they stand once stepped, a teammate who never had to step included.
    const taken = [me, ...this.host.heroes.filter((f) => f !== me && f.active)].map((f) => c.stepBack.find((s) => s.f === f)?.to ?? { x: f.x, y: f.y });
    const to = clearSpot({ x: v.x, y: v.y, half: v.bodyHalf, h: Math.max(60, v.y - v.top) }, c.pads, taken, FLOOR);
    if (to.x === v.x && to.y === v.y) {
      // Clear where he stands: look again in a second, in case he moves on.
      c.villainSeen = { x: v.x, y: v.y, lift: v.lift, at: wall };
      return;
    }
    c.stepBack.push({ f: v, from: { x: v.x, y: v.y }, to, at: wall });
  }

  /** Pick a word: green on a lit pad, or F4. Only the right word closes the choice. */
  private pick(word: string): void {
    const c = this.current;
    if (!c || !c.open) return;
    c.open = false;
    if (word === c.right) {
      c.resolve();
      return;
    }
    void this.miss(c, word);
  }

  /**
   * A wrong pad: nothing fires and the fight stays frozen. A wiggle and a
   * giggle on the pad, then the partner says what it was and what to find
   * (her pick has been made, so its word may be said), and the pads open again.
   */
  private async miss(c: Choice, word: string): Promise<void> {
    c.misses++;
    (episode.house.misses ??= {})[c.key] = c.misses;
    sfxWrong();
    const pad = c.pads.find((p) => p.word === word);
    if (pad) pad.wiggleAt = performance.now();
    const n = narrator();
    // A beat for the giggle before the partner's line, on the page's clock (the fight's is frozen; hunt 11: under
    // the voice the giggle was ducked to under half).
    await this.host.guard(new Promise<void>((r) => setTimeout(r, 350)));
    if (this.current !== c) return;
    await this.host.guard(voiceBus.sequence([narratorLine(n, moveKey('not_move', c.right)), narratorLine(n, moveKey('was_move', word)), narratorLine(n, moveKey('find_move', c.right))]));
    if (this.current !== c) return;
    this.reopen(c);
  }

  /** The pads open again once a line has been said, the idle re-prompt's count from zero. */
  private reopen(c: Choice): void {
    c.open = true;
    c.idle = 0;
  }

  /** Everyone stepping back, where the step has them now: written before the fighters move and again after. */
  private holdStepBack(c: Choice): void {
    const wall = performance.now();
    for (const s of c.stepBack) {
      if (!s.f.active) continue;
      const k = Phaser.Math.Easing.Sine.Out(Math.min(1, (wall - (s.at ?? c.stepAt)) / STEP_BACK_MS));
      s.f.x = Phaser.Math.Linear(s.from.x, s.to.x, k);
      s.f.y = Phaser.Math.Linear(s.from.y, s.to.y, k);
    }
  }

  /** Tests (`__ww.place`, item 083): put her hero at (x, y) in an open choice, as if she had walked there. */
  place(x: number, y: number): boolean {
    const c = this.current;
    if (!c) return false;
    c.heroStep = null;
    c.at.x = Phaser.Math.Clamp(x, ARENA_LEFT, ARENA_RIGHT);
    c.at.y = Phaser.Math.Clamp(y, FLOOR_TOP, FLOOR_BOTTOM);
    this.holdHero();
    return true;
  }

  /** Pin her hero to where she walked in the choice: no leftover move timer or hop moves her. */
  holdHero(): void {
    const c = this.current;
    const me = this.host.heroes[0];
    if (c) this.holdStepBack(c);
    if (!c || !me?.active) return;
    me.x = c.at.x;
    me.y = c.at.y;
    me.lift = c.at.lift;
    me.hop = 0;
    me.spin = 0;
    // Over every fighter while she steers, but under the word signs: standing
    // below one, her head hid its last letter (TOP read TO, item 039). Her
    // white ring shows where she is. (updateVisual sets depth by y, so this runs after it.)
    me.root.setDepth(DEPTH.prompt - 12);
    c.here.setPosition(me.x, me.y).setScale(1 + 0.1 * Math.sin(performance.now() / 180));
  }

  /**
   * The choice, every frame, on real time (the scene clock is nearly frozen):
   * her hero walks with the stick, the pad she stands at lights up with a
   * green dot, green there picks it. Yellow or ten quiet seconds says it again.
   */
  update(realDt: number): void {
    const c = this.current!;
    const me = this.host.heroes[0]!;
    const controls = this.host.controls;
    // Stepping out from behind the villain (M75): the stick waits until she is out.
    const step = c.heroStep;
    const stepping = step !== null && performance.now() - step.at < STEP_BACK_MS;
    if (step) c.at.x = Phaser.Math.Linear(step.from, step.to, Phaser.Math.Easing.Sine.Out(Math.min(1, (performance.now() - step.at) / STEP_BACK_MS)));
    if (step && !stepping) c.heroStep = null;
    const walking = !stepping && stickWalk(me, c.at, controls.move, realDt);
    this.holdHero();
    for (const p of c.pinned) if (p.f.active) [p.f.x, p.f.y] = [p.x, p.y];
    // Her team steps off the pad row (item 043, M6), the villain once he settles (M8), and they stay there while the fight is frozen.
    this.villainStepBack(c, me);
    this.holdStepBack(c);

    let near: MovePad | null = null;
    let best = REACH;
    for (const p of c.pads) {
      const d = Phaser.Math.Distance.Between(me.x, me.y, p.x, p.y);
      if (d < best) {
        near = p;
        best = d;
      }
    }
    if (near !== c.near) {
      c.near = near;
      if (near) sfxSelect();
    }
    const wall = performance.now();
    const pulse = 1 + 0.06 * Math.sin(wall / 160);
    for (const p of c.pads) {
      const k = Phaser.Math.Clamp((wall - p.bornAt) / 260, 0, 1);
      const pop = k <= 0 ? 0 : Phaser.Math.Easing.Back.Out(k);
      const lit = p === near;
      p.ring.setScale(pop * (lit ? 1.2 : 1) * (c.open ? pulse : 1));
      p.ring.setAlpha(lit ? 1 : 0.8);
      p.sign.setScale(pop * (lit ? 1.12 : 1));
      // A wrong pick wiggles its sign side to side for half a second.
      const w = p.wiggleAt === undefined ? 1 : (wall - p.wiggleAt) / 500;
      p.sign.setX(p.x + (w < 1 ? Math.sin(w * Math.PI * 8) * 14 * (1 - w) : 0));
    }
    c.dot.setVisible(Boolean(near && c.open));
    if (near) {
      // Over its sign; beside it for a staggered lower pad, whose "over" is the upper signs' band (hunt 11:
      // the dot for MUD sat at SWIM's edge; GRAB's between RED and DRIP, beside the other words).
      const under = dotBeside(near, c.pads);
      if (under) c.dot.setPosition(near.x + dotSide(near, c.pads, GAME_WIDTH) * (SIGN_W / 2 + 40), near.sign.y).setScale(pulse);
      else c.dot.setPosition(near.x, near.sign.y - 90).setScale(pulse);
    }

    // Green with no pad lit does nothing: no hop in the choice.
    if (controls.pressed('green') && near && c.open) this.pick(near.word);
    if (controls.dev('F4') && this.current) {
      c.open = true;
      this.pick(c.right);
    }
    if (walking || dadLock.locked) c.idle = 0;
    else if (c.open && !voiceBus.busy) c.idle += realDt;
    // Standing still: the rooms' stick hint beside her hero, gone when she walks (item 043, M5).
    // Under dad lock the hint waits too, as in the rooms (item 080).
    if (walking || !c.open || dadLock.locked) c.still = 0;
    else c.still += realDt;
    if (walking || dadLock.locked) {
      c.stickHint?.destroy();
      c.stickHint = null;
    } else if (c.still * 1000 > STICK_HINT_MS && !c.stickHint) {
      c.stickHint = makeStickHint(this.host.stage, c.at.x, c.at.y);
      c.objs.push(c.stickHint);
    }
    if (c.stickHint) placeStickHint(c.stickHint, c.at.x, c.at.y);
    if (c.open && (controls.pressed('yellow') || c.idle > CHOICE_REPROMPT)) {
      // Green is ignored while the instruction plays, as on the first prompt:
      // the pads close for the line and open again when it ends.
      c.open = false;
      c.idle = 0;
      void voiceBus.say(narratorLine(narrator(), moveKey('use_move', c.right))).then(() => {
        if (this.current !== c) return;
        this.reopen(c);
      });
    }
  }
}
