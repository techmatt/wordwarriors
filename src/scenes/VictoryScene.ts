/**
 * Victory: fireworks, confetti, the heroes bouncing on a podium, the villain
 * turned good again and bouncing with them, and the recap. Once the recap is
 * said, a green dot: green fades the recap away and goes on to THE END
 * (TheEndScene, item 085), where only Dad's 2 starts a new episode (item 082's
 * wait, moved there). The victory scene (EndingScene, item 027) plays first; the villain's own
 * line is said there, so nothing here says it again.
 */

import Phaser from 'phaser';

import { WORD_BY_ID, pictureFor } from '../../content/phonics/words';
import { narratorLine, wordLine } from '../../content/voice/ids';
import { startMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxRight, sfxSelect, sfxVictory } from '../audio/sfx';
import { DEPTH, FONT_COMIC, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { castArt, castFace, castScale, counterWord, episode, narrator, podiumCheer, podiumSecond, villainSpec } from '../episode/Episode';
import { variant } from '../episode/lineVariants';
import { burst, fitImage, fitPicture, shockwave } from '../fx/juice';
import { SceneGen } from '../fx/sceneGen';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { startScene } from '../art/gate';
import { hookState } from '../hookState';
import { makeButtonDot } from '../ui/ButtonDot';
import { Bubbles } from '../ui/Bubbles';
import { Caption, type KeepOut } from '../ui/Caption';
import { fitText } from '../ui/fitText';
import { recapWords } from '../rules/recap';

/** The recap's row of cards: along the bottom, a little smaller than full size. */
const CARD_Y = 628;
const CARD_SCALE = 0.82;
/** A recap card's picture room (the card is 130 x 170, its word under the picture). */
const CARD_PIC_MAX = { w: 120, h: 112 };
/** Where the dad who woke her cheers with an ally on the podium (M50): his feet, on the grass left of it, clear of the cards' row. */
const CHEER_SPOT = { x: 168, y: 546 };

export class VictoryScene extends Phaser.Scene {
  private controls!: Controls;
  /** The recap is said: green goes on to THE END. */
  private ready = false;
  /** Green was pressed: the recap is fading out. */
  private leaving = false;
  private dot: Phaser.GameObjects.Container | null = null;
  private confetti: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fireworks: Phaser.Time.TimerEvent | null = null;
  private runs = new SceneGen(this);
  /** The recap's cards: the caption keeps off them. */
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Victory');
  }

  create(): void {
    const run = this.runs.begin();
    // Gone too once it is on its way to THE END (F2 mid-recap): nothing more is said.
    const gone = () => run() || this.leaving;
    hookState.scene = 'Victory';
    // The battle's last state stays readable here, for tests asking how it ended.
    hookState.room = null;
    hookState.recap = [];
    hookState.recapDone = false;
    this.ready = false;
    this.leaving = false;
    this.dot = null;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      hookState.recapDone = false;
    });
    this.cards = [];
    this.controls = new Controls(this);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'room_victory').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    // The recap cards light up as each word is said, so the box shows only
    // who says it; it keeps off the cards, the podium and the title.
    const keep = (o: { active: boolean; getBounds(): Phaser.Geom.Rectangle }, weight: number): KeepOut[] => {
      if (!o.active) return [];
      const b = o.getBounds();
      return [{ x: b.x, y: b.y, w: b.width, h: b.height, weight }];
    };
    const podium: Phaser.GameObjects.Image[] = [];
    let title: Phaser.GameObjects.Text | null = null;
    const caption = new Caption(this, {
      mode: (u) => (u.id.startsWith('word_') ? 'portrait' : undefined),
      // The cards weigh most: the closing lines' box sat over them (item 039); over the title is fine.
      avoid: () => [...this.cards.flatMap((c) => keep(c, 8)), ...podium.flatMap((p) => keep(p, 2)), ...(title ? keep(title, 1) : [])],
    });
    new Bubbles(this);
    this.cameras.main.fadeIn(400, 255, 255, 255);

    this.confetti = this.add.particles(0, -20, TEX.square, {
      x: { min: 0, max: GAME_WIDTH },
      speedY: { min: 120, max: 260 },
      speedX: { min: -60, max: 60 },
      rotate: { min: 0, max: 360 },
      scale: { min: 0.6, max: 1.4 },
      lifespan: 5000,
      frequency: 25,
      tint: [0xff5ab4, 0xffd23f, 0x7ad9ff, 0x8aff8a, 0x9b5de5],
    }).setDepth(DEPTH.fx);

    this.fireworks = this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(150, GAME_WIDTH - 150);
        const y = Phaser.Math.Between(80, 300);
        burst(this, x, y, { count: 70, speed: 420, gravity: 120, life: 1200, colors: [Phaser.Display.Color.RandomRGB().color, 0xffffff] });
        shockwave(this, x, y, 0xffffff, 120, 500);
        sfxBoom(1);
      },
    });

    // Everyone stands on a block of the podium in the art (item 039: they stood
    // in front of it, and her dad had the top step): she has the top one, her
    // ally the left, the villain, good again, the right.
    const blocks = { top: { x: 640, y: 450 }, left: { x: 405, y: 516 }, right: { x: 878, y: 528 } };
    // With no ally, the dad who woke her (and was there all along) has the left block.
    const second = podiumSecond();
    const places = [
      { id: episode.hero, at: blocks.top },
      ...(second ? [{ id: second, at: blocks.left }] : []),
      { id: episode.villain, at: blocks.right },
    ];
    places.forEach(({ id, at }, i) => {
      // Depth by feet, as in the rooms, so the speaker's glow sits under them.
      // Each as tall beside her as their size says (item 030: Scar just under her).
      const h = 150 * castScale(id);
      const img = fitImage(this.add.image(at.x, at.y, castArt(id)).setOrigin(0.5, 1), h * 0.95, h).setDepth(at.y);
      podium.push(img);
      caption.track(id, () => (img.active ? { x: img.x, y: at.y } : null));
      this.tweens.add({ targets: img, y: at.y - 30, duration: 300 + i * 40, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: img, scaleY: img.scaleY * 0.9, scaleX: img.scaleX * 1.08, duration: 300 + i * 40, yoyo: true, repeat: -1, delay: 300 + i * 40 });
    });
    // With an ally, the dad who woke her stands on the grass beside the podium,
    // cheering (hunt 10, M50): he was in the ending scene a moment before. No
    // block: quick little hops and squashes, a beat faster than the podium's.
    const cheer = podiumCheer();
    if (cheer) {
      const at = CHEER_SPOT;
      const h = 150 * castScale(cheer);
      const img = fitImage(this.add.image(at.x, at.y, castArt(cheer)).setOrigin(0.5, 1), h * 0.95, h).setDepth(at.y);
      podium.push(img);
      caption.track(cheer, () => (img.active ? { x: img.x, y: at.y } : null));
      this.tweens.add({ targets: img, y: at.y - 18, duration: 220, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: img, scaleY: img.scaleY * 0.92, scaleX: img.scaleX * 1.06, duration: 220, yoyo: true, repeat: -1, delay: 220 });
    }

    title = this.add
      .text(GAME_WIDTH / 2, 105, 'VICTORY!', { fontFamily: '"Arial Black", sans-serif', fontSize: '104px', color: '#ffd23f', stroke: '#5a1a7a', strokeThickness: 16 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    title.setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 600, ease: 'Elastic.easeOut' });

    sfxVictory();
    this.time.delayedCall(2200, () => startMusic('title'));
    void (async () => {
      const n = narrator();
      await voiceBus.say(narratorLine(n, variant('victory_1')));
      if (gone()) return;
      await this.recap(gone);
      if (gone()) return;
      await voiceBus.say(narratorLine(n, variant('victory_2')));
      if (gone()) return;
      // Said: a green dot (top right, clear of the title, the podium and the cards), and green goes on to THE END.
      this.dot = makeButtonDot(this, GAME_WIDTH - 90, 105, 'green', 30).setDepth(DEPTH.hud);
      this.ready = true;
      hookState.recapDone = true;
    })();
  }

  /** Green on the said recap: the fireworks stop, everything fades, and THE END opens. */
  private toTheEnd(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.ready = false;
    hookState.recapDone = false;
    sfxSelect();
    voiceBus.hush();
    this.fireworks?.remove();
    this.confetti?.stop();
    const all = this.children.list.filter((o) => o !== this.dot);
    this.dot?.destroy();
    this.dot = null;
    this.tweens.add({ targets: all, alpha: 0, duration: 450, ease: 'Sine.easeIn' });
    this.time.delayedCall(500, () => startScene(this, 'TheEnd'));
  }

  /**
   * The words she read this episode pop up one by one, each with its picture,
   * and each is said once more. Shown, never counted: nothing says "six words".
   * Order is the order she read them (episode.read); words show upper case.
   */
  private async recap(gone: () => boolean): Promise<void> {
    // Nine cards fit; which words stay when she read more: `recapWords`.
    const words = recapWords({
      read: episode.read,
      gift: episode.gift,
      moves: episode.moves ? [...episode.moves.part1, ...episode.moves.part2].map((c) => c.right) : [],
      counter: counterWord(),
      keys: (episode.house.plan ?? []).filter((p) => p.slot !== 'counter').map((p) => p.key),
    });
    const gap = 132;
    for (const [i, w] of words.entries()) {
      if (gone()) return;
      const x = GAME_WIDTH / 2 + (i - (words.length - 1) / 2) * gap;
      const card = this.add.rectangle(0, 0, 130, 170, 0xfffaf0).setStrokeStyle(6, 0x5a4a8a);
      const pic = this.pictureOf(w);
      hookState.recap.push({ word: w, picture: pic });
      const parts: Phaser.GameObjects.GameObject[] = [card];
      // A standing person or a wide picture by its own shape (M48: TUG was a thin band), inside the card above its word.
      if (pic) parts.push(fitPicture(this.add.image(0, -22, pic), 100, 100, CARD_PIC_MAX));
      // Shrunk to the card if the word is long (a name); never cut off.
      parts.push(fitText(this.add.text(0, 58, w.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '38px', color: '#1a1030' }).setOrigin(0.5), 120, 50));
      // Along the bottom, in front of the podium's feet: in the middle of the
      // screen they hid the grown-ups' heads (item 039).
      // Over the dialogue box (DEPTH.hud + 5): the card being said is the highlighter.
      const c = this.add.container(x, CARD_Y, parts).setDepth(DEPTH.hud + 6).setData('qaTarget', `card_${w}`);
      this.cards.push(c);
      c.setScale(0);
      this.tweens.add({ targets: c, scale: CARD_SCALE, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: c, y: CARD_Y - 8, duration: 700, yoyo: true, repeat: -1, delay: 300 + i * 90, ease: 'Sine.easeInOut' });
      sfxRight();
      burst(this, x, CARD_Y, { count: 30, speed: 300 });
      // The card is the highlighter: lit gold and a little bigger while its word is said.
      card.setStrokeStyle(10, 0xffd23f);
      this.tweens.add({ targets: c, scale: CARD_SCALE * 1.12, duration: 200, delay: 300, ease: 'Back.easeOut' });
      await voiceBus.say(wordLine(w));
      if (gone()) return;
      card.setStrokeStyle(6, 0x5a4a8a);
      this.tweens.add({ targets: c, scale: CARD_SCALE, duration: 200 });
    }
  }

  /**
   * A recap word's picture: its own card (fetched key words and the counter
   * word are picture words too; move words have theirs, item 018), else the
   * counter-item card for a counter word without one, else none.
   */
  private pictureOf(w: string): string | null {
    const entry = WORD_BY_ID[w];
    if (entry && (entry.character || this.textures.exists(pictureFor(entry)))) return pictureFor(entry, castFace);
    if (this.textures.exists(`pic_${w}`)) return `pic_${w}`;
    const counter = villainSpec().counter;
    if (counter.word === w) return `item_${counter.id}`;
    return null;
  }

  override update(): void {
    this.controls.update();
    // Green is ignored until the recap is said; F2 (skip) goes on at any time.
    if ((this.ready && this.controls.pressed('green')) || this.controls.dev('F2')) this.toTheEnd();
    // Not on the way out to THE END (item 089: back from the page, the whole recap played again).
    if (this.controls.dev('F9') && !this.leaving) this.scene.start('Parent', { back: 'Victory' });
    this.controls.endFrame();
  }
}
