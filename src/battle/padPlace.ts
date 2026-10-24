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
 * cook-off's signs, a dad behind his sign in a race, M17). No pad opens within
 * her reach where that costs no older rule, and in the story fight whatever it
 * costs (hunt 10, M54), its rings then keeping off the story's props.
 */

/** A screen rectangle: [left, top, right, bottom]. */
export type Box = [number, number, number, number];

/** How far a pad's word sign stands above its ring. */
export const SIGN_RISE = 215;
/** A word sign's plate (moveChoice.ts draws it), centred on the sign. */
export const SIGN_W = 230;
export const SIGN_H = 100;
/** Least distance between two pads' columns: a sign is SIGN_W wide, so signs never touch. */
const PAD_GAP = 270;
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
  /**
   * How far a covered body may drift, each way, while the choice is open (item 083): a
   * contest's held team and villain keep rocking on their stations at the freeze's slow
   * clock (the rope pull's serpent went 0.26% under a sign), so no sign may come within it.
   */
  sway?: number;
  /** Tie-break luck, 0..1. */
  rand?: () => number;
  /**
   * Her feet and her reach (hunt 7): no pad opens within it, or a green mashed through the
   * partner's "Use HOP!" picks the pad she was left standing at, unread (a crowded story
   * fight put one there a quarter of the time). Kept only where it costs no older rule:
   * the pads stay in as early a tier and cover nobody more than without it. With `first`
   * (the story fight, hunt 10 M54: its stage is always crowded, so the trade-off gave her
   * reach up every time) it outranks every other rule.
   */
  me?: { x: number; y: number; reach: number; first?: boolean };
  /**
   * Floor props a ring keeps off where it can (hunt 10, M54: the story fight's stone, ledge
   * and hoard, faded while the choice is open). After her reach and nobody covered, before
   * the rest; a ring may still sit on one when nothing else fits.
   */
  keepOff?: Box[];
}

/** The sign's plate and its stake, with a margin: 10 px round the plate, and below it the stake (to 75) and 15 more. */
export function signBox(x: number, y: number): Box {
  const sy = y - SIGN_RISE;
  return [x - SIGN_W / 2 - 10, sy - SIGN_H / 2 - 10, x + SIGN_W / 2 + 10, sy + SIGN_H / 2 + 40];
}

/**
 * Whether the lit pad at `near` (a pad's floor spot) puts its green dot beside its sign, not 90 px over it:
 * when a higher pad's sign has that band, straight above (fix 190: MUD under SWIM) or to one side (hunt 11:
 * GRAB between RED and DRIP, its dot in the gap between their signs, at their height).
 */
export function dotBeside(near: { x: number; y: number }, pads: readonly { x: number; y: number }[]): boolean {
  const over = near.y - SIGN_RISE - 90;
  return pads.some((p) => p !== near && p.y < near.y && Math.abs(p.x - near.x) < SIGN_W + 80 && Math.abs(p.y - SIGN_RISE - over) < SIGN_H / 2 + 40);
}

/**
 * Which side of its sign a beside dot goes (`dotBeside`): the right, unless that is off the screen or on another
 * pad's sign (a branch review: two lower pads 240 apart put it on the next word's first letter), then the left.
 */
export function dotSide(near: { x: number; y: number }, pads: readonly { x: number; y: number }[], width: number): 1 | -1 {
  const r = 22;
  const off = SIGN_W / 2 + 40;
  const on = (x: number) => x - r < 0 || x + r > width || pads.some((p) => p !== near && Math.abs(p.x - x) < SIGN_W / 2 + r && Math.abs(p.y - near.y) < SIGN_H / 2 + r);
  // Under a higher sign it reads as that word's dot (the sheet read: TUG's under DOT's sign).
  const under = (x: number) => pads.some((p) => p !== near && p.y < near.y && Math.abs(p.x - x) < SIGN_W / 2 + r);
  for (const ok of [(x: number) => !on(x) && !under(x), (x: number) => !on(x)]) {
    if (ok(near.x + off)) return 1;
    if (ok(near.x - off)) return -1;
  }
  return near.x + off < width - 30 ? 1 : -1;
}

/** A pad's floor ring (moveChoice.ts draws its disc 190 by 70), centred on the pad. */
export function ringBox(x: number, y: number): Box {
  return [x - 95, y - 35, x + 95, y + 35];
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
  const was = layout({ ...inp, me: undefined });
  if (!inp.me) return was.spots;
  // Her reach gives way to every older rule (hunt 7's review): kept only where the pads stay in as
  // early a tier (a contest's on her side, item 034) and cover nobody more than they would without it.
  const kept = layout(inp);
  // The story fight (M54): her reach first, whatever it costs (a later tier, a sign over someone).
  if (inp.me.first && kept.spots.length) return kept.spots;
  return kept.spots.length && kept.tier <= was.tier && kept.cover <= was.cover + 1e-9 ? kept.spots : was.spots;
}

/** How much of the rings at `spots` stands on `boxes`, each ring's share summed. */
export function ringsOn(spots: readonly { x: number; y: number }[], boxes: Box[]): number {
  return spots.reduce((s, p) => s + coveredShare(ringBox(p.x, p.y), boxes), 0);
}

/**
 * A contest's pads (hunt 11, M65, Matt's call (b)): three where their rings keep off the held team
 * (`held`, also in `keepOff`), else two where two stand on it less (the sea tug: between her reach and
 * the serpent three rings fit only with one on Elsa at her rope). Outside a contest, as `placePads`.
 */
export function placeContestPads(inp: PlaceInput, held: Box[]): { x: number; y: number }[] {
  const three = placePads(inp);
  if (inp.n < 3 || !inp.contest || !held.length) return three;
  const on = ringsOn(three, held);
  if (on <= 1e-9) return three;
  const two = placePads({ ...inp, n: 2 });
  return two.length === 2 && ringsOn(two, held) < on - 1e-9 ? two : three;
}

/** The words that stand when there are fewer pads than words (M65): the right one and the first others, in order. */
export function standingWords(words: readonly string[], right: string, n: number): string[] {
  if (words.length <= n) return [...words];
  let others = n - 1;
  return words.filter((w) => w === right || others-- > 0);
}

/** Floor past the villain, on her side, too narrow for a pad (a ring, its sign and a gap to him and the wall). */
const BEHIND_ROOM = 300;

/**
 * Where her hero steps to as a brawl's choice opens (hunt 11, M75, Matt's call (a)): behind the villain at
 * the arena's end (`ozy_tiamat`: her at x 1170, Evil Tiamat 900 to 1140) there is no room for a ring
 * between him and the wall, so every pad opened on his far side and she walked 500 px through the dragon.
 * She steps out past him, as her team steps off the pads; null where she is not behind him like that.
 */
export function stepOutX(me: { x: number; half: number }, v: PlaceBody, left: number, right: number): number | null {
  const s = me.x >= v.x ? 1 : -1;
  // Floor past his body on her side, and on the other.
  const behind = s > 0 ? right - (v.x + v.half) : v.x - v.half - left;
  const before = s > 0 ? v.x - v.half - left : right - (v.x + v.half);
  if (behind >= BEHIND_ROOM || before <= behind) return null;
  const to = v.x - s * (v.half + me.half + 40);
  return Math.min(right, Math.max(left, to));
}

/** The pads' spots, with the tier they settled in and how much they cover. */
function layout(inp: PlaceInput): { spots: { x: number; y: number }[]; tier: number; cover: number } {
  const { n, avoid, cover, me } = inp;
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
  const sway = inp.sway ?? 0;
  const keepOff = inp.keepOff ?? [];
  const coverBoxes = cover.map((b): Box => {
    const [l, t, r, btm] = bodyBox(b);
    return [l - sway, t, r + sway, btm];
  });
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
  const lay = ({ xs, gap, rows }: Way): { spots: Spot[]; cover: number; on: number } => {
    let best: Spot[] = [];
    let bestScore = -Infinity;
    let bestCover = Infinity;
    let bestOn = Infinity;
    for (const ys of rows) {
      // Each spot's clearance and cover once (a share sums over the signs, so a set's cover is its spots' sum).
      const cands = xs
        .flatMap((x) =>
          ys.map((y) => {
            const sign = [signBox(x, y)];
            const ring = ringBox(x, y);
            return { x, y, clear: clearance(x, y), cov: coverBoxes.reduce((s, b) => s + coveredShare(b, sign), 0), on: coveredShare(ring, keepOff) };
          }),
        )
        .filter((q) => !me || Math.hypot(q.x - me.x, q.y - me.y) >= me.reach);
      type Cand = (typeof cands)[number];
      // Every set of n spots left to right: in one row at least `gap` apart,
      // across the rows STAGGER_GAP (n is 2 or 3, so this stays small).
      const walk = (from: number, picked: Cand[]): void => {
        if (picked.length === n) {
          const cov = picked.reduce((s, p) => s + p.cov, 0);
          const clear = Math.min(...picked.map((p) => p.clear));
          let spread = Infinity;
          for (let i = 1; i < picked.length; i++) spread = Math.min(spread, picked[i]!.x - picked[i - 1]!.x);
          // Covering nobody first (any cover at all outweighs the rest, item 083); then clear enough counts the same however
          // far; then one row over a staggered pair, spread out, a little luck.
          const rowsUsed = new Set(picked.map((p) => p.y)).size;
          // Then how much of the rings stands on a floor prop (M54), above every nicety after it.
          const on = picked.reduce((s, p) => s + p.on, 0);
          const score = -cov * 1e9 - on * 1e4 + Math.min(clear, 240) * 3 - (rowsUsed - 1) * 200 + Math.min(spread, 420) * 0.25 + rand() * 25;
          if (score > bestScore) {
            bestScore = score;
            bestCover = cov;
            bestOn = on;
            best = picked.map((p) => ({ x: p.x, y: p.y }));
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
    return { spots: best, cover: bestCover, on: bestOn };
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
  for (const [tier, ways] of tiers.entries()) {
    let fallback: { spots: Spot[]; cover: number } | null = null;
    // Covering nobody, but a ring on something to keep off (a story prop, a contest's held teammate): the
    // tier's later ways may fit clear of it (hunt 11: the sea tug's first way kept a ring on the ally).
    let clearOfNone: { spots: Spot[]; on: number } | null = null;
    for (const way of ways) {
      const laid = lay(way);
      if (!laid.spots.length) continue;
      // Nobody covered at all: a sliver counts (item 083: 0.26% of the serpent passed a 0.5% bar).
      if (laid.cover === 0) {
        if (laid.on <= 1e-9) return { spots: laid.spots, tier, cover: 0 };
        if (!clearOfNone || laid.on < clearOfNone.on - 1e-9) clearOfNone = laid;
        continue;
      }
      // Every way so far covers someone: keep the least covering, the earlier on a tie.
      if (!fallback || laid.cover < fallback.cover - 1e-9) fallback = laid;
    }
    if (clearOfNone) return { spots: clearOfNone.spots, tier, cover: 0 };
    if (fallback) return { spots: fallback.spots, tier, cover: fallback.cover };
  }
  return { spots: [], tier: Infinity, cover: Infinity };
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
    // On a ring by the feet, or over one with the body (the sheet read: Ozymandias's feet 120 px under SMASH's
    // ring, his torso and cape over a third of it).
    const body: Box = [x - f.half, y - f.h, x + f.half, y];
    const ring = pads.some((p) => (Math.abs(x - p.x) < 95 + f.half * 0.5 && Math.abs(y - p.y) < 60) || coveredShare(ringBox(p.x, p.y), [body]) > 0.25);
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
