/**
 * Held letter sounds, as played (item 058, src/audio/holdSound.ts): standing
 * on a Stretchy Bridge stone, a sound you can hold is one short natural
 * stretch of BRIDGE.stretchMs (item 085: 0.6 s, was 1.3 s), then quiet, never
 * repeated; a stop plays once. 054 looped the clip's steady part, and
 * on every real clip that part is 70-300 ms (M's was 110 ms), so the loop was
 * a fast stutter of "m"s; these tests would have caught it. (The cuts
 * themselves are tested in bridge.test.ts.)
 * `npx tsx --test tests/unit/holdSound.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HELD_MS, holdPlan, holdSamples } from '../../src/audio/holdSound';
import { BRIDGE } from '../../src/config';

const RATE = 48000;
type Part = [kind: 'quiet' | 'noise' | 'hum', s: number, amp?: number, hz?: number, ampEnd?: number];
/** A clip from parts: silence, noise (a hiss) and hums (a few harmonics, the level gliding to `ampEnd`). */
function clip(...parts: Part[]): Float32Array {
  const out: number[] = [];
  let r = 11;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (const [kind, s, amp = 0.3, hz = 120, ampEnd = amp] of parts) {
    const n = Math.round(s * RATE);
    for (let i = 0; i < n; i++) {
      const a = amp + ((ampEnd - amp) * i) / n;
      const t = (2 * Math.PI * hz * i) / RATE;
      out.push(kind === 'quiet' ? 0 : kind === 'noise' ? a * rnd() : a * (0.6 * Math.sin(t) + 0.3 * Math.sin(2 * t + 1) + 0.1 * Math.sin(3 * t + 2)));
    }
  }
  return Float32Array.from(out);
}

/** 20 ms RMS levels, in dB. */
function envelope(x: Float32Array, from: number, to: number): number[] {
  const hop = Math.round(0.02 * RATE);
  const out: number[] = [];
  for (let k = from; k + hop <= to; k += hop) {
    let e = 0;
    for (let i = k; i < k + hop; i++) e += x[i]! ** 2;
    out.push(10 * Math.log10(e / hop + 1e-12));
  }
  return out;
}

const CASES: [string, Float32Array][] = [
  // The placeholders: a hum fading a little into its schwa ("Mmm" then "uh"), a hiss before a vowel ("Suh").
  ['M', clip(['quiet', 0.25], ['hum', 0.17, 0.3, 110, 0.18], ['hum', 0.25, 0.4, 900], ['quiet', 0.2])],
  ['S', clip(['quiet', 0.25], ['noise', 0.19, 0.08, 0, 0.05], ['hum', 0.3, 0.5, 160], ['quiet', 0.2])],
  // The shortest steady part a cut keeps (TH's and V's are 110-120 ms).
  ['TH', clip(['quiet', 0.25], ['noise', 0.08, 0.05], ['hum', 0.3, 0.5, 160], ['quiet', 0.2])],
  // A recording that is already a bare, long hum.
  ['Mmmm', clip(['quiet', 0.1], ['hum', 0.9, 0.3, 120, 0.2], ['quiet', 0.1])],
];

for (const [name, x] of CASES) {
  test(`held ${name}: one smooth sound of BRIDGE.stretchMs, then quiet, never a short loop`, () => {
    const plan = holdPlan(x, RATE, 'hold');
    assert.equal(plan.mode, 'hold', name);
    const { data, loopStart } = holdSamples(x, plan, RATE, BRIDGE.stretchMs);
    const sound = Math.round((BRIDGE.stretchMs / 1000) * RATE);
    // It sounds for BRIDGE.stretchMs; whatever loops (if anything does) is silence.
    assert.equal(loopStart, sound, `${name}: the loop starts where the sound ends`);
    assert.ok(data.length > sound);
    for (let i = sound; i < data.length; i++) assert.equal(data[i], 0, `${name}: the loop is silent`);
    const env = envelope(data, Math.round(0.03 * RATE), sound - Math.round(0.25 * RATE));
    assert.ok(env.length >= 10, `${name}: ${env.length} frames of held sound`);
    // Smooth: no beat of dips and swells (a loop's seam), the level steady.
    const range = Math.max(...env) - Math.min(...env);
    assert.ok(range <= 4, `${name}: the level wanders ${range.toFixed(1)} dB`);
    for (let i = 1; i < env.length; i++) assert.ok(Math.abs(env[i]! - env[i - 1]!) <= 2, `${name}: a ${(env[i]! - env[i - 1]!).toFixed(1)} dB step at ${i * 20} ms`);
    // It fades out at the end rather than stopping dead.
    assert.ok(Math.abs(data[sound - 1]!) < 0.01, `${name}: fades out`);
    assert.ok(Math.abs(data[0]!) < 0.01, `${name}: fades in`);
  });
}

test('held: the attack plays as it is, joining the stretch with no click', () => {
  const x = CASES[0]![1];
  const plan = holdPlan(x, RATE, 'hold');
  const { data } = holdSamples(x, plan, RATE);
  // Past the fade-in, up to the join, the samples are the clip's.
  for (let i = Math.round(0.005 * RATE); i < Math.round(0.015 * RATE); i++) assert.equal(data[i], x[plan.start + i]);
  // No sample jumps by more than the clip's own largest step (with room for the level evening).
  let step = 0;
  for (let i = plan.start + 1; i < plan.end; i++) step = Math.max(step, Math.abs(x[i]! - x[i - 1]!));
  for (let i = 1; i < data.length; i++) assert.ok(Math.abs(data[i]! - data[i - 1]!) <= step * 2.5, `a click at ${i}`);
});

test('once sounds are unchanged: played once, nothing looped, no stretch', () => {
  const t = clip(['quiet', 0.25], ['noise', 0.07, 0.1], ['hum', 0.3, 0.5, 160], ['quiet', 0.2]);
  const plan = holdPlan(t, RATE, 'once');
  const { data, loopStart } = holdSamples(t, plan, RATE);
  assert.equal(loopStart, null);
  assert.equal(data.length, plan.end - plan.start);
});

test('the stretch is the BRIDGE.stretchMs knob (item 085): the default matches it, and the knob sets the length', () => {
  // holdSound.ts cannot import config.ts (tools/voice/import.ts builds it under NodeNext), so it keeps a default.
  assert.equal(HELD_MS, BRIDGE.stretchMs);
  // A short natural stretch, not the long 1.3 s hold it was.
  assert.ok(BRIDGE.stretchMs >= 300 && BRIDGE.stretchMs <= 900, `${BRIDGE.stretchMs} ms`);
  const x = CASES[0]![1];
  const plan = holdPlan(x, RATE, 'hold');
  for (const ms of [400, 600, 1000]) assert.equal(holdSamples(x, plan, RATE, ms).loopStart, Math.round((ms / 1000) * RATE), `${ms} ms`);
  // A knob shorter than the attack still plays the attack and a grain, never a negative stretch.
  const tiny = holdSamples(x, plan, RATE, 1);
  assert.ok(tiny.loopStart! > 0 && tiny.data.length > tiny.loopStart!);
});
