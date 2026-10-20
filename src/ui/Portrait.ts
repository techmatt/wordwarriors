/**
 * Who is talking (item 024): the speaker of a line, and their framed face card
 * with their name under it, for the dialogue box and the bark bubbles.
 *
 * The face is the speaker's name-free face card in this episode (`castFace`:
 * Julia the chef's in a chef episode). Evil versions have no face cards, so
 * theirs is the top of their full-body image, cropped square. The name plate
 * is the one place a character's name is printed beside a line; names as
 * sight words still use the name-free cards alone.
 */

import Phaser from 'phaser';

import { CHARACTER_BY_ID, personOf } from '../../content/battle/roster';
import type { Utterance } from '../audio/VoiceBus';
import { castArt, castFace, castId, episode, waker } from '../episode/Episode';

export interface Speaker {
  id: string;
  evil: boolean;
}

const NAME_FONT = '"Arial Rounded MT Bold", "Arial Black", sans-serif';

/**
 * The character behind a line. `phonics` (word confirmations, letter sounds)
 * is the primary dad's voice: the one who woke her (Dada Matt, or Dada Jason
 * when she plays as Dada Matt). Null when the speaker is not a character.
 */
export function speakerOf(u: Pick<Utterance, 'speaker'>): Speaker | null {
  // Phonics is Dada Matt's voice (his recordings replace it); while he is the
  // villain, the dad who woke her shows instead (item 025).
  const raw = u.speaker === 'phonics' ? (personOf(episode.villain) === 'dada_matt' ? personOf(waker()) : 'dada_matt') : u.speaker;
  const evil = raw.endsWith('_evil');
  const id = raw.replace(/_evil$/, '');
  return CHARACTER_BY_ID[id] ? { id, evil } : null;
}

/** The speaker's name as printed under the portrait, upper case like every text. */
export function speakerName(s: Speaker): string {
  const c = CHARACTER_BY_ID[s.id]!;
  return (s.evil ? c.evil : c.good).displayName.toUpperCase();
}

/** The speaker's frame colour: their own palette, so each character's card looks like theirs. */
export function speakerColour(s: Speaker): number {
  // The form they play today: lifter Dada Matt's red, not the builder's orange.
  const c = CHARACTER_BY_ID[castId(s.id)] ?? CHARACTER_BY_ID[s.id]!;
  return (s.evil ? c.evil : c.good).palette[0];
}

/** Same speaker? */
export function sameSpeaker(a: Speaker | null, b: Speaker | null): boolean {
  return Boolean(a && b && a.id === b.id && a.evil === b.evil);
}

/**
 * The speaker's face, `size` px square, centred on (0, 0). Good speakers use
 * their face card; evil ones (and anyone without a card) the top of their
 * full-body image, cropped square.
 */
export function faceImage(scene: Phaser.Scene, s: Speaker, size: number): Phaser.GameObjects.Image | null {
  const card = s.evil ? null : castFace(s.id);
  if (card && scene.textures.exists(card)) {
    const img = scene.add.image(0, 0, card);
    return img.setScale(Math.min(size / img.width, size / img.height));
  }
  const body = castArt(s.id, s.evil);
  if (!scene.textures.exists(body)) return null;
  const img = scene.add.image(0, 0, body).setOrigin(0, 0);
  const w = img.width;
  const h = img.height;
  // Head and shoulders: a square from the top, a little in from the sides.
  const side = Math.min(w * 0.82, h * 0.58);
  const cx = (w - side) / 2;
  const k = size / side;
  img.setCrop(cx, 0, side, side).setScale(k);
  img.setPosition(-cx * k - size / 2, -size / 2);
  return img;
}

export interface Portrait {
  root: Phaser.GameObjects.Container;
  /** The face alone, for the talking bob. */
  face: Phaser.GameObjects.Container;
  width: number;
  height: number;
  /** Where the card's middle is, relative to root (the name plate hangs below). */
  cardY: number;
}

/**
 * A framed face card with the speaker's name on a plate under it. The root's
 * origin is the middle of the whole thing (card and plate); `size` is the face.
 */
export function makePortrait(scene: Phaser.Scene, s: Speaker, size: number, opts: { name?: boolean } = {}): Portrait {
  const showName = opts.name ?? true;
  const pad = Math.round(size * 0.06);
  const card = size + pad * 2;
  const border = Math.max(3, Math.round(size * 0.04));
  const radius = Math.round(card * 0.14);
  const plateH = showName ? Math.round(Math.max(22, size * 0.2)) : 0;
  const overlap = showName ? Math.round(plateH * 0.35) : 0;
  const height = card + plateH - overlap;
  const cardY = -height / 2 + card / 2;
  const colour = speakerColour(s);

  const g = scene.add.graphics();
  // A soft drop shadow, then the card in the speaker's colour.
  g.fillStyle(0x000000, 0.25).fillRoundedRect(-card / 2 + 4, cardY - card / 2 + 6, card, card, radius);
  g.fillStyle(s.evil ? 0x2a1030 : 0xffffff, 1).fillRoundedRect(-card / 2, cardY - card / 2, card, card, radius);
  g.lineStyle(border, colour, 1).strokeRoundedRect(-card / 2, cardY - card / 2, card, card, radius);

  const face = scene.add.container(0, cardY);
  const img = faceImage(scene, s, size);
  // The face's corners sit inside the card's rounded ones (the padding is
  // more than the corner's cut), so no mask is needed, even mid-bob.
  if (img) face.add(img);
  const parts: Phaser.GameObjects.GameObject[] = [g, face];
  const width = card;

  if (showName) {
    const name = scene.add
      .text(0, 0, speakerName(s), { fontFamily: NAME_FONT, fontSize: `${Math.round(plateH * 0.72)}px`, color: '#ffffff' })
      .setOrigin(0.5);
    // One row, shrunk to fit: wrapped, a long name (EVIL JORMUNGANDR) grew past its plate onto the line (item 039).
    name.setWordWrapWidth(null as unknown as number);
    let fs = Math.round(plateH * 0.72);
    while (name.width > card * 1.15 && fs > 8) name.setFontSize(--fs);
    const plateW = Math.max(card * 0.7, name.width + plateH);
    const py = cardY + card / 2 - overlap + plateH / 2;
    const plate = scene.add.graphics();
    plate.fillStyle(s.evil ? 0x5a1a6a : 0x2a1a40, 1).fillRoundedRect(-plateW / 2, py - plateH / 2, plateW, plateH, plateH / 2);
    plate.lineStyle(Math.max(2, border - 1), colour, 1).strokeRoundedRect(-plateW / 2, py - plateH / 2, plateW, plateH, plateH / 2);
    name.setPosition(0, py);
    parts.push(plate, name);
  }

  const root = scene.add.container(0, 0, parts);
  return { root, face, width, height, cardY };
}
