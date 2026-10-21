/**
 * Waits on real work run on the wall clock (item 069, src/realTime.ts): the
 * browser tests run every page clock 5x fast, which cut VoiceBank's 15 s fetch
 * timeout and VoiceBus's 4 s decode wait to a fifth, so voice fetches aborted
 * and lines played silent under load. The harness keeps the real setTimeout
 * as `__wwRealSetTimeout`; `realTimeout` uses it when it is there.
 * `npx tsx --test tests/unit/realTime.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { realTimeout } from '../../src/realTime';

test('realTimeout: the wall clock the harness kept, else plain setTimeout', async () => {
  const g = globalThis as unknown as { __wwRealSetTimeout?: (fn: () => void, ms: number) => unknown };
  const asked: number[] = [];
  g.__wwRealSetTimeout = (fn, ms) => {
    asked.push(ms);
    return setTimeout(fn, 0);
  };
  await new Promise<void>((resolve) => realTimeout(resolve, 15_000));
  assert.deepEqual(asked, [15_000], 'the full 15 s on the real clock, never a warped fifth');
  delete g.__wwRealSetTimeout;
  const t0 = Date.now();
  await new Promise<void>((resolve) => realTimeout(resolve, 5));
  assert.ok(Date.now() - t0 >= 4);
});

test('the voice fetch, the art fetch and the decode wait all time out on realTimeout', () => {
  for (const f of ['src/voice/VoiceBank.ts', 'src/art/ArtBank.ts', 'src/audio/VoiceBus.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.match(src, /realTimeout\(\(\) => (abort\.abort\(\)|resolve\('late'\))/, f);
  }
  // The harness hands the real clock over before it warps the page's.
  assert.match(readFileSync('tests/harness.ts', 'utf8'), /__wwRealSetTimeout = setT;/);
});
