/**
 * Splitting a phonics-recorder take into clips (item 057; ported from item 055's
 * prototype, `scratch/voice-import/split.py`, whose report measured every number
 * here on a real recording). Pure: samples in, cuts and clips out.
 *
 * A take is one card: for each of its entries, the WORD, then its SOUND
 * `repeats` times, with pauses. So three entries of three repeats is 12
 * utterances, and the count must come out exactly; a take that doesn't is
 * refused, never guessed at.
 *
 * The recorder (`tools/recorder/phonics-recorder.html`) counts each take live
 * with the same detector: its `SPLIT` constants must equal these
 * (tests/unit/voiceImport.test.ts checks).
 */

/** The detector's numbers. Shared, by value, with the recorder page. */
export const SPLIT = {
  /** Envelope: a 20 ms RMS window every 10 ms, in dB. */
  winS: 0.02,
  hopS: 0.01,
  /** Rumble under this goes first: a bump or a breath puff is all under 100 Hz (g09's one stray run). */
  highpassHz: 80,
  /** A take whose loudest 20 ms is under this is empty (a mic that was off). */
  emptyDb: -60,
  /** Sound is over the floor (10th percentile) plus this share of the floor-to-peak range. */
  threshFrac: 0.25,
  /** Gaps under this are inside a word (a stop's closure: up to 0.11 s), not pauses (0.58 s and up). */
  mergeS: 0.25,
  /**
   * Runs shorter than this, or this far under the take's peak, are blips, breaths or clicks.
   * A hiss (S, SH, F, TH) is naturally far quieter than a voiced word: Matt's good card 1
   * (tests/fixtures/voice/matt-g01-good.wav, item 063) has its SSSS 18 to 24 dB under MOP,
   * so 20 dropped two of them. Every real run under 30 so far is a blip already too short.
   */
  minRunS: 0.06,
  dropDb: 30,
} as const;

/** How each clip is finished. Exported for import.ts's review page, which states these numbers. */
export const FINISH = {
  /** Each cut widens to where the envelope falls to the floor plus this (SH's soft onset, CHOP's P). */
  edgeDb: 6,
  fadeInS: 0.005,
  fadeOutS: 0.015,
  /** Active-frame RMS: the edge-tts placeholders measure -15 to -20 dBFS. */
  targetRmsDb: -17,
  peakCeilDb: -1,
  /**
   * Digital silence each side. Not room tone: normalising lifts the room to
   * within 50 dB of the peak, and the hold planner (holdSound.ts, QUIET_DB)
   * would take it for the sound's start.
   */
  padS: 0.03,
} as const;

/** A held sound's steady part must be this long for the bridge to stretch it (a few of its 40 ms grains). */
export const MIN_STEADY_S = 0.1;

export interface Entry {
  sound: string;
  word: string;
  kind: string;
  repeats: number;
}

export interface Cut {
  /** Samples, after widening. */
  start: number;
  end: number;
  /** Seconds: the run over the threshold, before widening. */
  core: [number, number];
  peakDb: number;
}

export interface TakeSplit {
  status: 'ok' | 'empty' | 'count';
  seconds: number;
  peakDbfs: number;
  expected: number;
  found: number;
  floorDb?: number;
  threshDb?: number;
  cuts: Cut[];
  dropped: { start: number; end: number; peakDb: number; why: 'short' | 'faint' }[];
  /** Gaps under mergeS, joined as inside a word: where (s) and how long. */
  joins: { at: number; gapS: number }[];
  /** The envelope, for the review page. */
  env: Float32Array;
}

const db = (p: number) => 10 * Math.log10(p + 1e-12);

/**
 * A 4th-order Butterworth high-pass, run forwards then backwards (zero phase,
 * like scipy's sosfiltfilt): two biquads with the Butterworth Qs, bilinear
 * (RBJ cookbook). The ends are padded with an odd reflection so the filter
 * settles before the take starts.
 */
export function highpass(x: Float32Array, rate: number, hz: number = SPLIT.highpassHz): Float32Array {
  const pad = Math.min(x.length - 1, Math.round(rate * 0.1));
  const n = x.length + 2 * pad;
  const y = new Float64Array(n);
  for (let i = 0; i < pad; i++) y[i] = 2 * x[0]! - x[pad - i]!;
  for (let i = 0; i < x.length; i++) y[pad + i] = x[i]!;
  for (let i = 0; i < pad; i++) y[pad + x.length + i] = 2 * x[x.length - 1]! - x[x.length - 2 - i]!;
  const w = (2 * Math.PI * hz) / rate;
  const sections = [1 / (2 * Math.cos(Math.PI / 8)), 1 / (2 * Math.cos((3 * Math.PI) / 8))].map((q) => {
    const alpha = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    const a0 = 1 + alpha;
    return { b0: (1 + c) / 2 / a0, b1: -(1 + c) / a0, b2: (1 + c) / 2 / a0, a1: (-2 * c) / a0, a2: (1 - alpha) / a0 };
  });
  const run = (from: number, to: number, step: number) => {
    for (const s of sections) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = from; i !== to; i += step) {
        const v = y[i]!;
        const o = s.b0 * v + s.b1 * x1 + s.b2 * x2 - s.a1 * y1 - s.a2 * y2;
        x2 = x1;
        x1 = v;
        y2 = y1;
        y1 = o;
        y[i] = o;
      }
    }
  };
  run(0, n, 1);
  run(n - 1, -1, -1);
  return Float32Array.from(y.subarray(pad, pad + x.length));
}

/** The 20 ms RMS envelope in dB, every 10 ms. */
export function envelope(x: Float32Array, rate: number): { env: Float32Array; hop: number; win: number } {
  const win = Math.floor(rate * SPLIT.winS);
  const hop = Math.floor(rate * SPLIT.hopS);
  const n = Math.max(0, Math.floor((x.length - win) / hop) + 1);
  const env = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let e = 0;
    for (let i = k * hop; i < k * hop + win; i++) e += x[i]! * x[i]!;
    env[k] = db(e / win);
  }
  return { env, hop, win };
}

/** numpy's default (linear) percentile. */
function percentile(xs: Float32Array, p: number): number {
  const s = Float64Array.from(xs).sort();
  const at = (p / 100) * (s.length - 1);
  const lo = Math.floor(at);
  return s[lo]! + (s[Math.min(s.length - 1, lo + 1)]! - s[lo]!) * (at - lo);
}

const expectedCount = (entries: Entry[]) => entries.reduce((n, e) => n + 1 + e.repeats, 0);

/** Find the utterances in a take (already high-passed). */
export function splitTake(x: Float32Array, rate: number, entries: Entry[]): TakeSplit {
  const { env, hop, win } = envelope(x, rate);
  const t = (i: number) => (i * hop) / rate;
  let peak = -Infinity;
  for (const v of env) peak = Math.max(peak, v);
  let amp = 0;
  for (const v of x) amp = Math.max(amp, Math.abs(v));
  const expected = expectedCount(entries);
  const base = { seconds: x.length / rate, peakDbfs: 20 * Math.log10(amp + 1e-12), expected, env, cuts: [], dropped: [], joins: [] };
  if (!env.length || peak < SPLIT.emptyDb) return { ...base, status: 'empty', found: 0 };
  const floor = percentile(env, 10);
  const thr = floor + SPLIT.threshFrac * (peak - floor);
  const runs: [number, number][] = [];
  const joins: TakeSplit['joins'] = [];
  for (let i = 0; i < env.length; ) {
    if (env[i]! > thr) {
      let j = i;
      while (j < env.length && env[j]! > thr) j++;
      // A gap under mergeS is inside a word.
      const last = runs[runs.length - 1];
      if (last && t(i - last[1]) < SPLIT.mergeS) {
        joins.push({ at: t(last[1]), gapS: t(i - last[1]) });
        last[1] = j;
      } else runs.push([i, j]);
      i = j;
    } else i++;
  }
  const kept: { a: number; b: number; peak: number }[] = [];
  const dropped: TakeSplit['dropped'] = [];
  for (const [a, b] of runs) {
    let rp = -Infinity;
    for (let i = a; i < b; i++) rp = Math.max(rp, env[i]!);
    const why = t(b - a) < SPLIT.minRunS ? 'short' : rp < peak - SPLIT.dropDb ? 'faint' : null;
    if (why) dropped.push({ start: t(a), end: t(b), peakDb: rp, why });
    else kept.push({ a, b, peak: rp });
  }
  // Widen each run down to floor + edgeDb, never past the middle of the gap either side.
  const edge = floor + FINISH.edgeDb;
  const cuts: Cut[] = kept.map((r, k) => {
    const lo = k ? Math.floor((kept[k - 1]!.b + r.a) / 2) : 0;
    const hi = k + 1 < kept.length ? Math.floor((r.b + kept[k + 1]!.a) / 2) : env.length;
    let { a, b } = r;
    while (a > lo && env[a - 1]! > edge) a--;
    while (b < hi && env[b]! > edge) b++;
    return { start: Math.floor(t(a) * rate), end: Math.min(x.length, Math.floor(t(b) * rate + win)), core: [t(r.a), t(r.b)], peakDb: r.peak };
  });
  return { ...base, status: cuts.length === expected ? 'ok' : 'count', found: cuts.length, floorDb: floor, threshDb: thr, cuts, dropped, joins };
}

/** Fade the edges, normalise, pad with digital silence. */
export function finish(seg: Float32Array, rate: number): { data: Float32Array; gainDb: number; peakDbfs: number } {
  const y = Float32Array.from(seg);
  const fi = Math.floor(FINISH.fadeInS * rate);
  const fo = Math.floor(FINISH.fadeOutS * rate);
  for (let i = 0; i < fi && i < y.length; i++) y[i]! *= i / Math.max(1, fi - 1);
  for (let i = 0; i < fo && i < y.length; i++) y[y.length - 1 - i]! *= i / Math.max(1, fo - 1);
  const { env, hop, win } = envelope(y, rate);
  let top = -Infinity;
  for (const v of env) top = Math.max(top, v);
  let e = 0;
  let n = 0;
  env.forEach((v, k) => {
    if (v <= top - 20) return;
    for (let i = k * hop; i < k * hop + win; i++) e += y[i]! * y[i]!;
    n += win;
  });
  let amp = 0;
  for (const v of y) amp = Math.max(amp, Math.abs(v));
  const peak = 20 * Math.log10(amp + 1e-12);
  const gainDb = Math.min(FINISH.targetRmsDb - db(e / Math.max(1, n)), FINISH.peakCeilDb - peak);
  const g = 10 ** (gainDb / 20);
  const pad = Math.floor(FINISH.padS * rate);
  const data = new Float32Array(pad + y.length + pad);
  for (let i = 0; i < y.length; i++) data[pad + i] = y[i]! * g;
  return { data, gainDb, peakDbfs: peak + gainDb };
}

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(a * k);
        const wi = Math.sin(a * k);
        const p = i + k;
        const q = p + len / 2;
        const tr = re[q]! * wr - im[q]! * wi;
        const ti = re[q]! * wi + im[q]! * wr;
        re[q] = re[p]! - tr;
        im[q] = im[p]! - ti;
        re[p]! += tr;
        im[p]! += ti;
      }
    }
  }
}

/** 24 coarse bands of mean log energy, level-normalised: the repeats differ in loudness, not in kind. */
function logSpectrum(seg: Float32Array): Float64Array {
  const n = 1024;
  const x = seg.length < n ? Float32Array.from({ length: n }, (_, i) => seg[i] ?? 0) : seg;
  const spec = new Float64Array(n / 2 + 1);
  let frames = 0;
  for (let s = 0; s + n <= x.length; s += n / 2) {
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    // numpy's hanning: symmetric, n - 1 in the denominator.
    for (let i = 0; i < n; i++) re[i] = x[s + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    fft(re, im);
    for (let k = 0; k <= n / 2; k++) spec[k]! += re[k]! ** 2 + im[k]! ** 2;
    frames++;
  }
  // numpy's array_split: the first (len % 24) bands get one bin more.
  const bands = new Float64Array(24);
  const size = Math.floor(spec.length / 24);
  const extra = spec.length % 24;
  for (let b = 0, at = 0; b < 24; b++) {
    const len = size + (b < extra ? 1 : 0);
    let sum = 0;
    for (let k = at; k < at + len; k++) sum += spec[k]! / frames;
    bands[b] = db(sum / len);
    at += len;
  }
  const mean = bands.reduce((a, v) => a + v, 0) / 24;
  return bands.map((v) => v - mean);
}

/**
 * The repeats ranked closest-first: summed distance to the others, a band
 * spectrum's RMS difference in dB plus 20 per second of length difference.
 * The first is the medoid, the most typical take of the sound.
 */
export function rankRepeats(reps: { seg: Float32Array; coreS: number }[]): { order: number[]; distance: number[] } {
  const specs = reps.map((r) => logSpectrum(r.seg));
  const distance = reps.map((r, i) =>
    reps.reduce((sum, o, j) => {
      if (i === j) return sum;
      let d = 0;
      for (let b = 0; b < 24; b++) d += (specs[i]![b]! - specs[j]![b]!) ** 2;
      return sum + Math.sqrt(d / 24) + 20 * Math.abs(r.coreS - o.coreS);
    }, 0),
  );
  const order = reps.map((_, i) => i).sort((a, b) => distance[a]! - distance[b]! || a - b);
  return { order, distance };
}

/** A joined gap this long is two sounds run together, not a stop's closure inside a word (those are up to 0.11 s). */
export const RAN_TOGETHER_S = 0.14;

/** Why a take didn't count out, in plain words, with where to listen. */
export function countReason(s: TakeSplit): string {
  const at = (xs: number[]) => xs.map((v) => `${v.toFixed(1)} s`).join(', ');
  const why: string[] = [];
  const ran = s.joins.filter((j) => j.gapS >= RAN_TOGETHER_S);
  if (ran.length) why.push(`sounds ran together at ${at(ran.map((j) => j.at))} (pauses of ${Math.round(Math.min(...ran.map((j) => j.gapS)) * 1000)} ms or so: leave about a second)`);
  const faint = s.dropped.filter((d) => d.why === 'faint');
  if (faint.length) why.push(`${faint.length === 1 ? 'a sound' : `${faint.length} sounds`} at ${at(faint.map((d) => d.start))} too quiet to tell from noise (say ${faint.length === 1 ? 'it' : 'them'} louder, or closer to the mic)`);
  if (!why.length) why.push(s.found > s.expected ? 'an extra sound (a cough, an "um", a bump) or a word said in two pieces' : `sounds missing (the take is ${s.seconds.toFixed(1)} s: did it stop early?)`);
  return `found ${s.found} sounds, expected ${s.expected}: ${why.join('; ')}`;
}
