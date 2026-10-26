/**
 * The victory scene (item 027): after battle 2, before the recap, the villain,
 * good again, and everyone who took part do something nice together (dessert
 * round the table, a picnic, a boat ride…), in four short voiced lines in
 * bubbles. Then on to the fireworks and the recap (VictoryScene).
 *
 * Which scene and who says what is src/rules/endings.ts; the scenes are data
 * in content/house/endings.ts. `?ending=<id>` fixes the scene (tests, Matt).
 * Sprites move only by bob and squash; the one talking hops.
 */

import Phaser from 'phaser';

import { ENDING_BY_ID, endingArt, endingPropArt } from '../../content/house/endings';
import { voiceBus } from '../voice/VoiceBus';
import { startMusic } from '../audio/music';
import { ENDING_PAUSE, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { startScene } from '../art/gate';
import { castArt, castScale, drawEnding, episode, type Step } from '../episode/Episode';
import { burst, fitImage } from '../fx/juice';
import { SceneGen } from '../fx/sceneGen';
import { Controls } from '../input/Controls';
import { endingPeople, endingScript, standXs } from '../rules/endings';
import { progress } from '../state/progress';
import { hookState } from '../hookState';
import { Bubbles, type BubbleAnchor } from '../ui/Bubbles';
import type { SceneKey } from './keys';
import { openParent } from './ParentScene';

export class EndingScene extends Phaser.Scene {
  private controls!: Controls;
  private runs = new SceneGen(this);
  private step: Step | undefined;
  private leaving = false;

  constructor() {
    super('Ending' satisfies SceneKey);
  }

  create(data: { step?: Step }): void {
    const over = this.runs.begin();
    const gone = () => over() || this.leaving;
    this.step = data?.step;
    this.leaving = false;
    hookState.scene = 'Ending';
    hookState.room = null;
    this.controls = new Controls(this);

    // Drawn once per episode (a trip to the grown-ups page comes back to the same one).
    // Drawn early (item 065: the second battle draws it so its art loads during the fight); counted here.
    if (!episode.endingCounted) {
      episode.endingCounted = true;
      progress.remember('ending', drawEnding());
      // The episode is won here: counted now, not when green leaves the
      // victory screen (item 039: closing the tab there never counted it).
      progress.episodeDone();
    }
    const e = ENDING_BY_ID[drawEnding()]!;
    const people = endingPeople(episode);
    const script = endingScript(episode, e.id, episode.lines.ending);

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, endingArt(e.id)).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);
    // Depth by feet, as in the rooms: a front prop (the table, the boat) stands lower, so it is drawn over them.
    for (const p of e.props) {
      const img = fitImage(this.add.image(p.x, p.y, endingPropArt(p.id)).setOrigin(0.5, 1), p.w, p.h).setDepth(p.y);
      if (!p.front || p.cut === undefined) continue;
      // Cut in two: the top behind the cast, the bottom (a second copy, cropped) over them.
      img.setDepth(e.stand.y - 1);
      const from = Math.round(img.height * p.cut);
      fitImage(this.add.image(p.x, p.y, endingPropArt(p.id)).setOrigin(0.5, 1), p.w, p.h).setCrop(0, from, img.width, img.height - from).setDepth(p.y);
    }
    new Bubbles(this);

    const xs = standXs(e, people.length);
    const sprites = new Map<string, Phaser.GameObjects.Image>();
    const art = people.map((id) => castArt(id));
    people.forEach((id, i) => {
      // `stand.h` is a 1.25-size friend; the rest stand to their sizes beside
      // her (item 028), a dad at grown-up height, 1.2 × `stand.h` (item 034).
      const h = (e.stand.h * castScale(id)) / 1.25;
      const img = fitImage(this.add.image(xs[i]!, e.stand.y, art[i]!).setOrigin(0.5, 1), h * 0.95, h).setDepth(e.stand.y);
      sprites.set(id, img);
      const base = img.scaleY;
      this.tweens.add({ targets: img, scaleY: base * 1.04, scaleX: img.scaleX * 0.97, duration: 520 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 90 });
    });
    const anchor = (id: string): BubbleAnchor | null => {
      const img = sprites.get(id);
      return img ? { get x() { return img.x; }, get y() { return img.y; }, bubbleOffset: img.displayHeight, active: true } : null;
    };

    hookState.ending = { id: e.id, people, art, lines: script.map((b) => b.line), said: [], done: false };
    this.cameras.main.fadeIn(500, 255, 255, 255);
    startMusic('title');
    // The villain, good again, sparkles once.
    const v = sprites.get(episode.villain);
    if (v) burst(this, v.x, v.y - v.displayHeight / 2, { count: 40, speed: 260, colors: [0xffd23f, 0xff5ab4, 0xffffff] });

    void (async () => {
      await this.wait(ENDING_PAUSE.intro);
      for (const [i, b] of script.entries()) {
        if (gone()) return;
        if (i > 0) await this.wait(ENDING_PAUSE.between);
        if (gone()) return;
        const img = sprites.get(b.who);
        if (img) this.hop(img);
        if (await this.speak(b.line, anchor(b.who), gone)) hookState.ending?.said.push(b.line);
      }
      if (gone()) return;
      await this.wait(ENDING_PAUSE.outro);
      if (gone()) return;
      if (hookState.ending) hookState.ending.done = true;
      this.onward();
    })();
  }

  /** A line in a bubble over its speaker. A bark the bus drops (another just ended) is tried again: the scene's lines all play. */
  private async speak(id: string, at: BubbleAnchor | null, gone: () => boolean): Promise<boolean> {
    for (let tries = 0; tries < 20 && !gone(); tries++) {
      const t0 = performance.now();
      const said = await voiceBus.say(id, 'bark', at ?? undefined);
      if (said) return true;
      // Dropped at once: the voice was busy, or the bark gap has not passed yet.
      if (performance.now() - t0 > 100) return false;
      await this.wait(250);
    }
    return false;
  }

  /** The speaker hops twice with a squash, then bobs on with the rest. */
  private hop(img: Phaser.GameObjects.Image): void {
    const y = img.y;
    this.tweens.add({ targets: img, y: y - 26, duration: 170, yoyo: true, repeat: 1, ease: 'Quad.easeOut', onComplete: () => img.setY(y) });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  /** On to the fireworks and the recap, still the victory step. */
  private onward(): void {
    if (this.leaving) return;
    this.leaving = true;
    voiceBus.hush();
    this.cameras.main.fadeOut(400, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => startScene(this, 'Victory', { step: this.step }));
  }

  override update(): void {
    this.controls.update();
    if (this.controls.dev('F2')) this.onward();
    // Not while fading out to the recap: coming back would play the whole scene again.
    if (this.controls.dev('F9') && !this.leaving) openParent(this, { back: 'Ending', data: { step: this.step } });
    this.controls.endFrame();
  }
}

