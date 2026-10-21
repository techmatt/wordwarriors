/**
 * The voice decode queue (item 062, src/voice/VoiceBank.ts): Matt saw captions
 * with nothing said, because the line being said waited behind its groups'
 * fetches past VoiceBus's ENSURE_TIMEOUT_MS. A fake fetch and AudioContext
 * stand in for the browser; every fetch waits until the test lets it answer.
 * `npx tsx --test tests/unit/voiceQueue.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

const fetched: string[] = [];
const answers = new Map<string, () => void>();

class FakeContext {
  state = 'running';
  decodeAudioData(): Promise<object> {
    return Promise.resolve({ duration: 1 });
  }
}

const g = globalThis as unknown as Record<string, unknown>;
g.window = { AudioContext: FakeContext };
g.fetch = (url: string) => {
  fetched.push(url);
  return new Promise((resolve) => answers.set(url, () => resolve({ ok: true, json: async () => MANIFEST, arrayBuffer: async () => new ArrayBuffer(8) })));
};

const line = (id: string, group: string) => ({ id, speaker: 'x', group, text: id, audio: `voice-gen/${id}.mp3`, words: [], duration: 1 });
const MANIFEST = {
  version: 2,
  provider: 'test',
  lines: [...Array.from({ length: 40 }, (_, i) => line(`nar_${i}`, 'nar')), ...Array.from({ length: 20 }, (_, i) => line(`old_${i}`, 'old')), line('said', 'nar')],
};

const tick = () => new Promise((r) => setTimeout(r, 0));
/** Answer every fetch under way, then let the queue move on. */
async function answerAll(): Promise<void> {
  for (const [url, go] of [...answers]) {
    answers.delete(url);
    go();
  }
  for (let i = 0; i < 5; i++) await tick();
}

test('a line about to be said decodes ahead of its groups, sharing their decode; a dropped group is not kept', async () => {
  const { VoiceBank } = await import('../../src/voice/VoiceBank');
  const bank = new VoiceBank();
  // The manifest itself.
  const loaded = bank.load('/');
  await tick();
  await answerAll();
  assert.equal(await loaded, true);
  fetched.length = 0;

  void bank.loadGroups(['nar', 'old'], '/');
  for (let i = 0; i < 5; i++) await tick();
  assert.equal(fetched.length, 12, 'twelve at a time in all, not twelve per group');
  assert.equal(bank.state('nar_30'), 'queued');

  const said = bank.ensure('said', '/');
  const again = bank.ensure('said', '/');
  await answerAll();
  assert.equal(fetched[12], '/voice-gen/said.mp3', 'the line being said is next, ahead of 40-odd group clips');
  while (!bank.ready('said')) await answerAll();
  await Promise.all([said, again]);
  assert.equal(fetched.filter((u) => u.endsWith('said.mp3')).length, 1, 'fetched once, not again behind the group or for a second ask');

  // A new episode lets the old group go: its queued clips never fetch, its in-flight ones are not kept.
  while (!fetched.some((u) => u.includes('old_'))) await answerAll();
  bank.retain(['nar']);
  await answerAll();
  for (let i = 0; i < 20; i++) await answerAll();
  const old = MANIFEST.lines.filter((l) => l.group === 'old').map((l) => l.id);
  assert.deepEqual(old.filter((id) => bank.ready(id)), [], 'nothing of the dropped group kept');
  assert.ok(fetched.filter((u) => u.includes('old_')).length < old.length, 'its queued clips were cancelled');
  assert.ok(bank.ready('nar_39'), 'the kept group finished');
});
