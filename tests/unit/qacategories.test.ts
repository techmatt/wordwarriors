/**
 * Item 059: Matt's bug-hunt categories that a static scan can hold for every
 * line (American spelling), and the checker's own checks (tests/qa/wording.ts)
 * on the examples he found.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { logIssues, voiceBuildIssues } from '../qa/checks';
import { britishIn, clippedIn, giveawayIssues, tauntIssues, variantIssues } from '../qa/wording';

const LINES: { id: string; text: string; say?: string }[] = JSON.parse(readFileSync('content/voice/lines.json', 'utf8'));

test('spelling: no line says or shows a British spelling (item 059: PRACTISE)', () => {
  assert.deepEqual(britishIn('Time to PRACTISE your favourite colour!'), ['PRACTISE → practice', 'favourite → favorite', 'colour → color']);
  const bad = LINES.flatMap((l) => britishIn(`${l.text} ${l.say ?? ''}`).map((b) => `${l.id}: ${b}`));
  assert.deepEqual(bad, []);
});

test('clipped lines: TOO STRONG, LET GO is clipped; whole sentences and everyday exclamations are not', () => {
  assert.ok(clippedIn('Too strong, let go!'));
  assert.equal(clippedIn("It's too strong! Let's go and get ready!"), null);
  assert.equal(clippedIn('Wow! You did it!'), null);
  assert.equal(clippedIn('Now read the whole spell!'), null);
  assert.equal(clippedIn("Before we head out, let's grab the..."), null);
  // Item 080: natural lines the heuristic used to flag; "X for everybody!" stays a look (Matt's call M18).
  assert.equal(clippedIn('Quick, pick a move!'), null);
  assert.equal(clippedIn("Now's our chance! Let's use it!"), null);
  assert.equal(clippedIn("It's a race! Ready, set, go!"), null);
  assert.equal(clippedIn("Look, a secret door! Let's go through it!"), null);
  assert.ok(clippedIn('Gold coins for everybody!'));
});

test('giveaway: a picture with its own word printed beside it is a bug (item 059: the entry hall\'s VAN)', () => {
  const layout = {
    texts: [{ scene: 'Entry', text: 'VAN', b: [100, 210, 160, 240] as [number, number, number, number], depth: 300, group: 1, size: 28 }],
    images: [{ scene: 'Entry', key: 'pic_van', b: [80, 100, 180, 200] as [number, number, number, number], depth: 300 }],
    spots: [],
    targets: [],
    covers: [],
    hudDepth: 1000,
  };
  assert.equal(giveawayIssues(layout, 'Entry').length, 1);
  assert.equal(giveawayIssues({ ...layout, texts: [] }, 'Entry').length, 0);
  // The victory recap shows the words she read beside their pictures on purpose.
  assert.equal(giveawayIssues(layout, 'Victory').length, 0);
});

test('missing voice lines: a line with no clip, or a clip for old text, is a bug (item 062: captions with nothing said)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ww-voice-'));
  try {
    mkdirSync(path.join(dir, 'public', 'voice-gen'), { recursive: true });
    const lines = [
      { id: 'ok', text: 'Hello there!' },
      { id: 'unbuilt', text: 'A new line.' },
      { id: 'stale', text: 'Now worded like this.' },
      { id: 'gone', text: 'Its mp3 went.' },
    ];
    writeFileSync(path.join(dir, 'lines.json'), JSON.stringify(lines));
    const entry = (id: string, text: string) => ({ id, text, audio: `voice-gen/${id}.mp3` });
    writeFileSync(path.join(dir, 'public', 'voice-gen', 'manifest.json'), JSON.stringify({ lines: [entry('ok', 'Hello there!'), entry('stale', 'Once worded like that.'), entry('gone', 'Its mp3 went.')] }));
    for (const id of ['ok', 'stale']) writeFileSync(path.join(dir, 'public', 'voice-gen', `${id}.mp3`), 'ID3 audio');
    const found = voiceBuildIssues(path.join(dir, 'lines.json'), path.join(dir, 'public'));
    assert.deepEqual(found.map((i) => `${i.kind}:${i.key.split(':')[1]}`), ['voice-unbuilt:unbuilt', 'voice-stale:stale', 'voice-no-clip:gone']);
    assert.ok(found.every((i) => i.severity === 'bug'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // Played: a line that started with no decoded clip names why.
  const played = logIssues({ voice: [{ t: 0, id: 'nar_ellie_house_doors', scene: 'Hub', priority: 'instruction', text: 'Two doors!', noLine: false, silent: true, why: 'queued' }], locks: [], spikes: [], flashes: [], console: [], missingArt: [], frames: {}, now: 0 });
  assert.equal(played[0]?.kind, 'voice-silent');
  assert.match(played[0]!.detail, /no clip \(queued\)/);
});

test('missing voice lines: every line the game has is built, for the text it has now', () => {
  assert.deepEqual(voiceBuildIssues().map((i) => i.detail).slice(0, 20), []);
});

test('variant and taunt checks (item 089): a variant back before its round is done; a taunt over twice an episode', () => {
  const bases = { right: ['right', 'right_2', 'right_3'], room_find: ['room_find', 'room_find_2'] };
  // In turn, across narrators whose ids hold underscores: clean.
  assert.deepEqual(variantIssues(['nar_ellie_right', 'nar_dada_matt_blade_right_2', 'nar_ellie_right_3', 'nar_ellie_right', 'nar_ellie_room_find', 'nar_ellie_room_find_2'], bases), []);
  const back = variantIssues(['nar_ellie_right', 'nar_ellie_right_2', 'nar_ellie_right'], bases);
  assert.equal(back[0]?.kind, 'variant-repeat');
  assert.match(back[0]!.detail, /^right: right again after right_2/);
  assert.deepEqual(tauntIssues([['taunt_smaug_gold', 'taunt_smaug_gold'], ['taunt_smaug_gold']]), []);
  assert.deepEqual(tauntIssues([['taunt_smaug_gold', 'x', 'taunt_smaug_gold', 'taunt_smaug_gold']]).map((i) => i.detail), ['taunt_smaug_gold said 3 times in episode 1 (cap 2)']);
});
