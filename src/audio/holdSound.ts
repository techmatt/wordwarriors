/**
 * Held letter sounds (item 054, the Stretchy Bridge): while she stands on a
 * stone its sound goes on, so a slow slide is "mmm-aaa-t". Pure: samples in,
 * samples out, no Web Audio (tests/unit/holdSound.test.ts runs it on Node).
 *
 * It works from whatever clip is in place, the edge-tts placeholders now and
 * Matt's recordings later (`voice:clip`), so it reads the clip rather than a
 * table of trim points. The placeholders are a sound plus a schwa ("Suh",
 * "Luh", "Buh"; content/phonics/letters.ts says why), so the clip is cut up
 * by 10 ms frames of loudness and zero-crossing rate:
 *
 * - a **held** sound (`hold`: the vowels and the sounds you can stretch, M S F
 *   L N R V Z SH TH) keeps its steady part: a hiss up to the vowel after it
 *   (S of "Suh": noise, many crossings, then the quieter-crossing vowel), a hum
 *   up to where the crossings rise into the schwa (M N L), or a vowel's loud
 *   middle. That part is stretched smoothly (overlap-add, not a loop: item
 *   058) to one short natural stretch (`heldMs`, BRIDGE.stretchMs in the
 *   game), which fades and goes quiet: once, never repeated (item 085);
 * - a **once** sound (the stops, H, W, Y, X) plays once and never with an
 *   "uh": a burst or hiss up to the vowel (T, K, CH), the final hiss after it
 *   too (X is "Kuhs": K then S), or a voiced stop's first instant (B D G),
 *   faded out before the vowel can be heard.
 *
 * A recording that is already a bare sound (a clean "mmmm", a crisp "t") has
 * no schwa to find, and plays as it is: held whole, or once whole.
 */

// `.js` suffix: tools/voice/import.ts builds this file under NodeNext (as src/rules/bankAudit.ts).
import { BRIDGE } from '../config.js';

export type HoldMode = 'hold' | 'once';

/** What to play, in samples: `start`..`end` of the clip; a held clip's steady part is `steadyStart`..`end`. */
export interface HoldPlan {
  mode: HoldMode;
  start: number;
  end: number;
  /** Only for `hold`: where the attack ends and the steady part (stretched) begins. */
  steadyStart?: number;
  /** Once sounds with a final hiss (X): this second stretch follows the first. */
  tail?: [number, number];
}

const FRAME_S = 0.01;
/** Frames this far under the clip's loudest count as silence (an F hiss is 35-45 dB under its vowel). */
const QUIET_DB = 50;
/** A clip whose loudest frame is under this is silence. */
const SILENT_DB = -80;
/**
 * A frame whose zero-crossing rate (crossings per second) is over this is
 * noise (a hiss or a burst; SH's is about 7,000, a vowel's under 3,000).
 * Per second, not per sample: the browser decodes at the AudioContext's rate,
 * usually 48 kHz, and per sample a 48 kHz hiss counts half what it does at
 * 24 kHz (item 057: a recorded CH played 0.06 s of its 0.25 s at 48 kHz).
 * The values are 054's per-sample ones at 24 kHz, times 24,000.
 */
const NOISY = 4320;
/** A hum's crossings rising by this much (per second) is the schwa coming in (M N L into "uh"). */
const RISE = 720;
/** The steady part of a held sound stays within this of the loudest frame. */
const HELD_DB = 12;
/** A voiced stop (B D G) keeps this much of its onset. */
const VOICED_STOP_S = 0.06;
const MIN_HOLD_S = 0.06;
/** The longest held stretch kept (the stretch covers the rest). */
const MAX_HOLD_S = 0.45;
const MAX_BURST_S = 0.3;

interface Frame {
  db: number;
  zcr: number;
}

function frames(x: Float32Array, rate: number): { hop: number; f: Frame[] } {
  const hop = Math.max(1, Math.round(rate * FRAME_S));
  const f: Frame[] = [];
  for (let k = 0; k + hop <= x.length; k += hop) {
    let e = 0;
    let z = 0;
    for (let i = k; i < k + hop; i++) {
      e += x[i]! * x[i]!;
      if (i > k && (x[i]! >= 0) !== (x[i - 1]! >= 0)) z++;
    }
    f.push({ db: 10 * Math.log10(e / hop + 1e-18), zcr: (z / (hop - 1)) * rate });
  }
  return { hop, f };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

/** The first index from `from` where `test` holds for `run` frames in a row (to `to`), or -1. */
function firstRun(f: Frame[], from: number, to: number, run: number, test: (fr: Frame) => boolean): number {
  for (let i = from; i + run - 1 <= to; i++) {
    let ok = true;
    for (let j = 0; j < run && ok; j++) ok = test(f[i + j]!);
    if (ok) return i;
  }
  return -1;
}

/** Where the clip's sound is, and how to play it held or once. */
export function holdPlan(x: Float32Array, rate: number, mode: HoldMode): HoldPlan {
  const { hop, f } = frames(x, rate);
  const whole = { mode, start: 0, end: x.length } as HoldPlan;
  if (!f.length) return whole;
  const peak = Math.max(...f.map((fr) => fr.db));
  // Nothing to cut in a silent clip.
  if (peak < SILENT_DB) return whole;
  const loud = (fr: Frame) => fr.db > peak - QUIET_DB;
  let on = f.findIndex(loud);
  let off = f.length - 1;
  while (off > on && !loud(f[off]!)) off--;
  if (on < 0) return whole;
  const at = (i: number) => Math.min(x.length, i * hop);
  const noisy = (fr: Frame) => loud(fr) && fr.zcr > NOISY;
  const ms = (s: number) => Math.max(1, Math.round(s / FRAME_S));
  // A hiss or burst at the start: its run of noisy frames (a one-frame dip allowed).
  const noiseEnd = (from: number, to: number) => {
    const quiet = firstRun(f, from, to, 2, (fr) => !noisy(fr));
    return quiet < 0 ? to + 1 : quiet;
  };
  // It starts with a hiss or burst when most of its first frames are noise
  // (a placeholder's lead-in can be a frame or two of breath first).
  const lead = f.slice(on, on + 4);
  const startsNoisy = lead.filter(noisy).length >= Math.min(2, lead.length);
  if (startsNoisy) while (on < off && !noisy(f[on]!)) on++;

  if (mode === 'once') {
    const burst = startsNoisy ? noiseEnd(on, off) : on;
    let end: number;
    // A real burst or hiss (T, K, CH): up to the vowel. A voiced stop's click
    // is shorter (D), and a voiced stop or glide (B G W Y) has none: only its
    // first instant, out before the vowel can be heard.
    if (burst - on >= ms(0.04)) end = Math.min(burst, on + ms(MAX_BURST_S));
    else {
      const vowel = firstRun(f, on + 1, off, 2, (fr) => fr.db > peak - HELD_DB);
      end = vowel < 0 ? off + 1 : Math.min(off + 1, Math.max(on + ms(VOICED_STOP_S), vowel + ms(0.02)), on + ms(MAX_BURST_S));
    }
    // A final hiss after the vowel (X's S of "Kuhs") is played straight after;
    // a real hiss, not the breath a clip ends on: within 30 dB of the peak and
    // 120 ms or more (B's placeholder ends on 80 ms of breath).
    let tail: [number, number] | undefined;
    const hiss = (fr: Frame) => noisy(fr) && fr.db > peak - 30;
    let last = off;
    while (last > end && !hiss(f[last]!)) last--;
    let t = last;
    while (t > end && hiss(f[t]!)) t--;
    if (last - t >= ms(0.12) && t > end + 1) tail = [at(t + 1), at(last + 1)];
    return { mode, start: at(on), end: at(end), ...(tail ? { tail } : {}) };
  }

  // Held. A hiss: up to the vowel after it.
  let end: number;
  if (startsNoisy) end = noiseEnd(on, off);
  else {
    // A hum or a vowel: up to where the schwa comes in, the crossings rising
    // (M N L into "uh") or the level jumping (V's buzz into its vowel), or
    // where it fades.
    const settle = on + ms(0.03);
    const head = f.slice(settle, settle + ms(0.06));
    const zcr = median(head.map((fr) => fr.zcr));
    const db = median(head.map((fr) => fr.db));
    const rise = firstRun(f, settle + ms(0.04), off, 3, (fr) => fr.zcr > zcr + RISE);
    const jump = firstRun(f, settle, off, 2, (fr) => fr.db > db + 6);
    const fade = firstRun(f, settle, off, 2, (fr) => fr.db < Math.max(db, peak - HELD_DB) - HELD_DB);
    end = Math.min(...[rise, jump, fade, off + 1].filter((i) => i >= 0));
  }
  end = Math.min(end, on + ms(MAX_HOLD_S));
  if (end - on < ms(MIN_HOLD_S)) return { mode: 'once', start: at(on), end: at(Math.max(end, on + ms(MIN_HOLD_S))) };
  // The steady part starts after the attack: a third of the way in, at least 20 ms.
  const steady = on + Math.max(ms(0.02), Math.round((end - on) / 3));
  return { mode, start: at(on), end: at(end), steadyStart: at(steady) };
}

/** The fades at either end of a once clip's parts. */
const FADE_IN_S = 0.004;
const FADE_OUT_S = 0.02;
/** A stretched sound's grains (Hann windows, half overlapping), and how far each may shift to line up with the last. */
const GRAIN_S = 0.04;
const ALIGN_S = 0.012;
/** How fast the grains' place drifts through the steady part, a share of real time (the rest is the stretch). */
const DRIFT = 0.3;
/** A stretched sound's own fade-out, so it ends "mmmm" and not cut off. */
const END_FADE_S = 0.2;

/**
 * Item 058: the held part, stretched to `n` samples by overlap-add (WSOLA).
 * Each grain is taken from the steady part `lo`..`hi`, where it lines up
 * best with the grain before (so a hum's waves run on, no beat), drifting
 * back and forth through it slowly, each grain's level evened to the part's,
 * so nothing repeats on a short beat and the level does not pulse. The first
 * grain is the clip itself at `lo`, so it joins the attack seamlessly.
 */
function stretch(x: Float32Array, lo: number, hi: number, n: number, half: number, rate: number): Float32Array {
  const out = new Float32Array(n);
  const g = half * 2;
  const tol = Math.max(0, Math.min(Math.round(ALIGN_S * rate), Math.floor((hi - lo - g) / 4)));
  const last = hi - g; // the latest a grain may start
  const win = Float32Array.from({ length: g }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / g));
  const rms = (a: number) => {
    let e = 0;
    for (let i = 0; i < g; i++) e += (x[a + i]! * win[i]!) ** 2;
    return Math.sqrt(e / g);
  };
  const levels: number[] = [];
  for (let a = lo; a <= last; a += half) levels.push(rms(a));
  const level = median(levels);
  // The target drifts lo..last and back (with room to shift by `tol`).
  const span = Math.max(0, last - lo - 2 * tol);
  let target = 0;
  let dir = 1;
  let prev = lo;
  for (let o = 0, k = 0; o < n; o += half, k++) {
    let pos = lo;
    if (k > 0) {
      // Line up with how the previous grain's sound goes on: x[prev + half ..].
      target += dir * half * DRIFT;
      if (target > span) (target = 2 * span - target), (dir = -1);
      if (target < 0) (target = -target), (dir = 1);
      const centre = lo + tol + Math.round(Math.min(span, Math.max(0, target)));
      const want = Math.min(prev + half, last);
      let best = -Infinity;
      for (let c = Math.max(lo, centre - tol); c <= Math.min(last, centre + tol); c++) {
        let s = 0;
        for (let i = 0; i < half; i += 2) s += x[c + i]! * x[want + i]!;
        if (s > best) (best = s), (pos = c);
      }
    }
    const r = rms(pos);
    const gain = k === 0 || r <= 0 || level <= 0 ? 1 : Math.min(4, Math.max(0.25, level / r));
    for (let i = 0; i < g && o + i < n; i++) out[o + i]! += x[pos + i]! * win[i]! * gain;
    prev = pos;
  }
  return out;
}

/**
 * The samples to play for a plan, played once. A once clip fades out over its
 * last FADE_OUT_S, and joins its tail. A held clip (item 058) is its attack,
 * then its steady part stretched smoothly (`stretch`) to `heldMs` in all
 * (BRIDGE.stretchMs, src/config.ts, by default), fading out: one short
 * "mmm". Nothing loops (item 090: 085 ended it on a silence VoiceBus looped
 * until she let go, and the release at `heldMs` came about when that loop
 * would start; 054 looped the steady part itself, and that is 70-300 ms on
 * every clip: M's 110 ms loop was a stutter of "m"s, nine a second).
 */
export function holdSamples(x: Float32Array, plan: HoldPlan, rate: number, heldMs = BRIDGE.stretchMs): Float32Array<ArrayBuffer> {
  if (plan.mode === 'hold' && plan.steadyStart !== undefined) return heldSamples(x, plan, rate, plan.steadyStart, heldMs);
  const parts: [number, number][] = [[plan.start, plan.end], ...(plan.tail ? [plan.tail] : [])];
  const len = parts.reduce((n, [a, b]) => n + Math.max(0, b - a), 0);
  const data = new Float32Array(Math.max(1, len));
  let o = 0;
  for (const [a, b] of parts) {
    data.set(x.subarray(a, b), o);
    // Each part fades in and out, so the jump over the vowel makes no click.
    const fi = Math.min(Math.round(FADE_IN_S * rate), Math.floor((b - a) / 2));
    for (let i = 0; i < fi; i++) data[o + i]! *= i / fi;
    if (plan.mode === 'once' || a !== plan.start) {
      const fo = Math.min(Math.round(FADE_OUT_S * rate), Math.floor((b - a) / 2));
      for (let i = 0; i < fo; i++) data[o + b - a - 1 - i]! *= i / fo;
    }
    o += b - a;
  }
  return data;
}

/** A held clip: attack, the steady part stretched to `heldMs` in all, and a fade. */
function heldSamples(x: Float32Array, plan: HoldPlan, rate: number, steadyStart: number, heldMs: number): Float32Array<ArrayBuffer> {
  const { start, end } = plan;
  let half = Math.round((GRAIN_S * rate) / 2);
  // The attack (up to the steady part) as it is, crossfading into the first
  // grain over `half`; with no room for that, the stretch is all of it.
  let lo = steadyStart - half;
  if (lo < start || end - lo < 2 * half) {
    lo = start;
    half = Math.max(1, Math.min(half, Math.floor((end - start) / 2)));
  }
  const at = lo - start;
  // Never shorter than the attack and one grain, whatever the knob says.
  const total = Math.max(at + 2 * half, Math.round((heldMs / 1000) * rate));
  const data = new Float32Array(total);
  const body = stretch(x, lo, end, Math.max(0, total - at), half, rate);
  data.set(body.subarray(0, total - at), at);
  for (let i = 0; i < steadyStart - lo && lo > start; i++) {
    // The window's complement: the attack's fade-out and the first grain's fade-in sum to one.
    const w = 0.5 + 0.5 * Math.cos((Math.PI * i) / half);
    data[at + i]! += x[lo + i]! * w;
  }
  if (lo > start) data.set(x.subarray(start, lo), 0);
  const fi = Math.min(Math.round(FADE_IN_S * rate), total);
  for (let i = 0; i < fi; i++) data[i]! *= i / fi;
  const fo = Math.min(Math.round(END_FADE_S * rate), Math.floor(total / 2));
  for (let i = 0; i < fo; i++) data[total - 1 - i]! *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fo);
  return data;
}
