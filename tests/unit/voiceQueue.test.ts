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
  // Item 150: the groups' background clips take four of the twelve slots, so a line and the art always find a connection.
  assert.equal(fetched.length, 4, 'four background clips at a time in all, not twelve per group');
  assert.equal(bank.state('nar_30'), 'queued');

  const said = bank.ensure('said', '/');
  const again = bank.ensure('said', '/');
  await tick();
  assert.equal(fetched[4], '/voice-gen/said.mp3', 'the line being said goes at once, ahead of 40-odd group clips, not waiting for a background slot');
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

test('a line asked for is not cancelled when its group is let go (item 150)', async () => {
  const { VoiceBank } = await import('../../src/voice/VoiceBank');
  const bank = new VoiceBank();
  const loaded = bank.load('/');
  await tick();
  await answerAll();
  assert.equal(await loaded, true);
  void bank.loadGroups(['old', 'nar'], '/');
  for (let i = 0; i < 5; i++) await tick();
  // Every slot taken (four background, eight lines asked for), then a queued clip asked for: to the front, still waiting.
  for (let i = 0; i < 8; i++) void bank.ensure(`nar_${30 + i}`, '/');
  await tick();
  assert.equal(bank.state('nar_20'), 'queued');
  const said = bank.ensure('nar_20', '/');
  await tick();
  assert.equal(bank.state('nar_20'), 'queued');
  bank.retain(['old']);
  let settled = false;
  void said.then(() => (settled = true));
  for (let i = 0; i < 20 && !settled; i++) await answerAll();
  assert.equal(bank.ready('nar_20'), true, 'decoded for the line, not cancelled with its group');
  assert.equal(bank.state('nar_19'), 'none', 'the rest of the group let go is still dropped');
});
