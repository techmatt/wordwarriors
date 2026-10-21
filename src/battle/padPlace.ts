/**
 * Where the move choice's pads go (moveChoice.ts), Phaser-free so the unit
 * tests can place them (tests/unit/padPlace.test.ts).
 *
 * One row across the floor where it fits, so every sign stands right above its
 * own ring and no two pads share a column (a stacked pair put the lower pad's
 * word over the upper ring); a staggered pair of rows only when a contest's
 * side is too narrow for one. The row and the columns keep rings and signs clear of every
 * fighter, so she never walks into a fighter's card to choose; and no sign may
 * stand over a body in `cover` (item 071: the villain always, and in a contest
 * the team at its held stations, which do not step back: Dada Jason behind the
 * cook-off's signs, a dad behind his sign in a race, M17).
 */

/** A screen rectangle: [left, top, right, bottom]. */
export type Box = [number, number, number, number];

/** How far a pad's word sign stands above its ring. */
export const SIGN_RISE = 215;
/** Least distance between two pads' columns: a sign is 230 wide, so signs never touch. */
export const PAD_GAP = 270;
/** The closest two columns may come when her side is narrow (item 071, M7): the plates still 10 px apart. */
const NARROW_GAP = 240;
/** Least distance between two staggered pads' columns, one on each row: the lower sign's plate clears the upper ring. */
const STAGGER_GAP = 150;

/** A fighter as placement sees it: feet at (x, y), body centre (cx, cy), half its width, its top. */
export interface PlaceBody {
  x: number;
  y: number;
  cx: number;
  cy: number;
  half: number;
  top: number;
}

export interface PlaceInput {
  /** How many pads (2 or 3). */
  n: number;
  /** Everyone to keep rings and signs clear of (her hero, the villain, the team, minions). */
  avoid: PlaceBody[];
  /** Bodies no sign may stand over. */
  cover: PlaceBody[];
  /** A contest: every pad on her side of the villain (item 034, M7). */
  contest?: { meX: number; villain: PlaceBody };
  /** The floor's left and right ends. */
  left: number;
  right: number;
  /** Tie-break luck, 0..1. */
  rand?: () => number;
}

/** The sign's plate and its stake, with a margin. */
export function signBox(x: number, y: number): Box {
  const sy = y - SIGN_RISE;
  return [x - 125, sy - 60, x + 125, sy + 90];
}

export function bodyBox(b: PlaceBody): Box {
  return [b.x - b.half, b.top, b.x + b.half, b.y];
}

/** How much of `body` the boxes in `over` cover, as a share of it. */
export function coveredShare(body: Box, over: Box[]): number {
  const w = Math.max(1, body[2] - body[0]);
  const h = Math.max(1, body[3] - body[1]);
  let area = 0;
  for (const o of over) {
    const ox = Math.min(body[2], o[2]) - Math.max(body[0], o[0]);
    const oy = Math.min(body[3], o[3]) - Math.max(body[1], o[1]);
    if (ox > 0 && oy > 0) area += ox * oy;
  }
  return area / (w * h);
}

/** The pads' spots, left to right. */
export function placePads(inp: PlaceInput): { x: number; y: number }[] {
  const { n, avoid, cover } = inp;
  const rand = inp.rand ?? Math.random;
  /** How far a pad at (x, y) stays from every fighter: ring against feet, sign against body. */
  const clearance = (x: number, y: number): number => {
    let d = Infinity;
    for (const f of avoid) {
      // From the edge of the body, not its middle: a giant's pad stood inside her (item 034).
      d = Math.min(d, Math.hypot(Math.max(0, Math.abs(x - f.x) - f.half), (y - f.y) * 1.5), Math.hypot(Math.max(0, Math.abs(x - f.cx) - f.half), y - SIGN_RISE - f.cy));
    }
    return d;
  };
  // Every covered body's share under the signs, summed: 0 is the rule, more only when nothing else fits.
  const coverBoxes = cover.map(bodyBox);
  const columns = (edge: number): number[] => {
    const out: number[] = [];
    for (let x = inp.left + edge; x <= inp.right - edge; x += 20) out.push(x);
    return out;
  };

  type Spot = { x: number; y: number };
  /** Columns to use, how close two pads in one row may come, and the rows: one row at a time, or a staggered pair. */
  type Way = { xs: number[]; gap: number; rows: number[][] };
  // Not 640: a pad there sits under the caption ribbon while its word is said.
  const ROWS = [[480], [560]];
  // Staggered (M7): a pad on the lower row may stand half a sign from one on
  // the upper row, their plates one above the other with a gap between.
  const STAGGERED = [[480, 590]];

  /** The best set of n spots a way allows, and how much it covers. */
  const lay = ({ xs, gap, rows }: Way): { spots: Spot[]; cover: number } => {
    let best: Spot[] = [];
    let bestScore = -Infinity;
    let bestCover = Infinity;
    for (const ys of rows) {
      const cands = xs.flatMap((x) => ys.map((y) => ({ x, y })));
      // Every set of n spots left to right: in one row at least `gap` apart,
      // across the rows STAGGER_GAP (n is 2 or 3, so this stays small).
      const walk = (from: number, picked: Spot[]): void => {
        if (picked.length === n) {
          const signs = picked.map((p) => signBox(p.x, p.y));
          const cov = coverBoxes.reduce((s, b) => s + coveredShare(b, signs), 0);
          const clear = Math.min(...picked.map((p) => clearance(p.x, p.y)));
          let spread = Infinity;
          for (let i = 1; i < picked.length; i++) spread = Math.min(spread, picked[i]!.x - picked[i - 1]!.x);
          // Covering nobody first; then clear enough counts the same however
          // far; then one row over a staggered pair, spread out, a little luck.
          const rowsUsed = new Set(picked.map((p) => p.y)).size;
          const score = -cov * 100_000 + Math.min(clear, 240) * 3 - (rowsUsed - 1) * 200 + Math.min(spread, 420) * 0.25 + rand() * 25;
          if (score > bestScore) {
            bestScore = score;
            bestCover = cov;
            best = picked;
          }
          return;
        }
        for (let i = from; i < cands.length; i++) {
          const q = cands[i]!;
          if (picked.some((p) => q.x - p.x < (p.y === q.y ? gap : STAGGER_GAP))) continue;
          walk(i + 1, [...picked, q]);
        }
      };
      walk(0, []);
    }
    return { spots: best, cover: bestCover };
  };

  // The ways to lay the pads, in tiers: the first tier where they fit at all
  // wins; in it, the first way covering nobody, else the least covering one.
  // A contest keeps its pads on her side of the villain (item 034): a pad
  // past him had her fire her super from inside his coils, off her rope.
  // Where her side is narrow the pads close up, come nearer the edge and him,
  // then stagger, before (last of all) any goes past him (M7); her side wins
  // over covering nobody.
  const tiers: Way[][] = [];
  const c = inp.contest;
  if (c) {
    const v = c.villain;
    const mine = (edge: number, margin: number) => columns(edge).filter((x) => (c.meX < v.x ? x < v.x - v.half - margin : x > v.x + v.half + margin));
    tiers.push([
      { xs: mine(110, 100), gap: PAD_GAP, rows: ROWS },
      { xs: mine(110, 100), gap: NARROW_GAP, rows: ROWS },
      { xs: mine(60, 100), gap: NARROW_GAP, rows: ROWS },
      { xs: mine(60, 100), gap: NARROW_GAP, rows: STAGGERED },
      { xs: mine(60, 50), gap: NARROW_GAP, rows: ROWS },
    ]);
    tiers.push([{ xs: columns(110).filter((x) => Math.abs(x - v.x) > v.half + 90), gap: PAD_GAP, rows: ROWS }]);
  }
  tiers.push([
    { xs: columns(110), gap: PAD_GAP, rows: ROWS },
    { xs: columns(60), gap: NARROW_GAP, rows: ROWS },
    { xs: columns(60), gap: NARROW_GAP, rows: STAGGERED },
  ]);
  for (const ways of tiers) {
    let fallback: { spots: Spot[]; cover: number } | null = null;
    for (const way of ways) {
      const laid = lay(way);
      if (!laid.spots.length) continue;
      if (laid.cover < 0.005) return laid.spots;
      // Every way so far covers someone: keep the least covering, the earlier on a tie.
      if (!fallback || laid.cover < fallback.cover - 0.005) fallback = laid;
    }
    if (fallback) return fallback.spots;
  }
  return [];
}

/**
 * Where a fighter standing under a sign or on a ring steps to (item 043, M6;
 * item 071, M8 the villain too): the nearest spot clear of every sign, every
 * ring and the spots in `taken`; when the pads fill the row, the least covered.
 * Its feet at the same spot it stands on when nothing covers it.
 */
export function clearSpot(
  f: { x: number; y: number; half: number; h: number },
  pads: { x: number; y: number }[],
  taken: { x: number; y: number }[],
  floor: { left: number; right: number; top: number; bottom: number },
): { x: number; y: number } {
  const signs = pads.map((p) => signBox(p.x, p.y));
  const covered = (x: number, y: number): number => {
    const share = coveredShare([x - f.half, y - f.h, x + f.half, y], signs);
    const ring = pads.some((p) => Math.abs(x - p.x) < 95 + f.half * 0.5 && Math.abs(y - p.y) < 60);
    const crowd = taken.some((t) => Math.abs(x - t.x) < 110 && Math.abs(y - t.y) < 50);
    return share + (ring || crowd ? 1 : 0);
  };
  if (covered(f.x, f.y) <= 0) return { x: f.x, y: f.y };
  let to = { x: f.x, y: f.y };
  let best = Infinity;
  for (let x = floor.left + 40; x <= floor.right - 40; x += 20) {
    for (let y = floor.top + 20; y <= floor.bottom; y += 20) {
      const cost = covered(x, y) * 10_000 + Math.hypot(x - f.x, (y - f.y) * 1.5);
      if (cost < best) {
        best = cost;
        to = { x, y };
      }
    }
  }
  return to;
}
