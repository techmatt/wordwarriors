/**
 * The box a word picture is fitted to (hunt 10, M48). Phaser-free
 * (`tests/unit/pictureBox.test.ts`); `fitPicture` (src/fx/juice.ts) applies it.
 *
 * Every picture is fitted to a square, keeping its aspect, except the few
 * whose shape is far from square: standing people (DAD, VET, MOM, MAN: `pic_dad`
 * is 159 x 400) came out about half as wide as the rest, so DAD read as a tiny
 * extra person beside the real Dada Matt, and TUG, a wide picture, as a thin
 * band. Those are fitted to a box of their own aspect, the same area as the
 * square, so they read about as big; the long side stretches at most
 * `PICTURE_STRETCH` times the square's. The rest are kept (M21: nothing beside
 * them looks alike).
 */

/** The pictures fitted to their own aspect (M48): add one here to give it the same fit. */
export const SHAPED_PICTURES: ReadonlySet<string> = new Set(['pic_dad', 'pic_vet', 'pic_mom', 'pic_man', 'pic_tug']);

/** How much longer than the square's side a shaped picture's long side may grow. */
export const PICTURE_STRETCH = 1.45;

/**
 * The box to fit picture `key` (`aspect`: its width over its height) into, for
 * a `w` x `h` slot. A shaped picture gets a box of its own aspect and the
 * slot's area, its long side at most PICTURE_STRETCH times the slot's and
 * within `max` (a card's inside, a door's sign) if given; any other picture
 * gets the slot.
 */
export function pictureBox(key: string, aspect: number, w: number, h: number, max?: { w: number; h: number }): { w: number; h: number } {
  if (!SHAPED_PICTURES.has(key) || !(aspect > 0) || !Number.isFinite(aspect)) return { w, h };
  const area = w * h;
  let bw = Math.sqrt(area * aspect);
  let bh = Math.sqrt(area / aspect);
  const limW = Math.min(w * PICTURE_STRETCH, max?.w ?? Infinity);
  const limH = Math.min(h * PICTURE_STRETCH, max?.h ?? Infinity);
  const k = Math.min(1, limW / bw, limH / bh);
  bw *= k;
  bh *= k;
  // Never smaller than the plain square fit would draw it.
  const plain = Math.min(w / aspect, h);
  if (bh < plain) return { w, h };
  return { w: bw, h: bh };
}
