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

import { heroIssues, logIssues, onlyLineVariants, padReachIssues, panelIssues, ruledCover, spawnIssues, storeChanges, voiceBuildIssues, type Box } from '../qa/checks';
import { britishIn, clippedIn, giveawayIssues, tauntIssues, variantIssues } from '../qa/wording';
import type { WWState } from '../harness';

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
  // Hunt 7: the space race's start, the fix-it praise, a doesn't.
  assert.equal(clippedIn("It's a space race! Ready, set, launch!"), null);
  assert.equal(clippedIn('Nice fixing!'), null);
  assert.equal(clippedIn("That doesn't match! Try another letter!"), null);
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

test('store changes (item 092): named down to the field, and a restarted room\'s line variant told apart from a leak', () => {
  const blob = (o: object) => JSON.stringify({ version: 9, words: { box: { seen: 1 } }, recent: { 'line:room_listen': ['a'] }, ...o });
  const was = { 'wordwarriors.progress': blob({}), other: 'x' };
  assert.deepEqual(storeChanges(was, { ...was }), []);
  const variant = storeChanges(was, { ...was, 'wordwarriors.progress': blob({ recent: { 'line:room_listen': ['a', 'b'] } }) });
  assert.deepEqual(variant, ['wordwarriors.progress recent.line:room_listen']);
  assert.ok(onlyLineVariants(variant));
  const leak = storeChanges(was, { 'wordwarriors.progress': blob({ words: { box: { seen: 2 } } }) });
  assert.deepEqual(leak, ['wordwarriors.progress words.box', 'other']);
  assert.ok(!onlyLineVariants(leak));
  assert.ok(!onlyLineVariants([]));
});

test('ruled covers (item 092): W12 and W5 are a look, anything past them still a bug', () => {
  assert.ok(ruledCover('Bedroom', 'door', 'dialogue', 36));
  assert.ok(ruledCover('Hub', 'circle', 'dialogue', 27));
  assert.ok(!ruledCover('Hub', 'circle', 'dialogue', 60), 'the box over the circle itself (fix 1)');
  assert.ok(ruledCover('Battle', 'pad_zip', 'dialogue', 14));
  assert.ok(!ruledCover('Battle', 'pad_zip', 'dialogue', 40));
  assert.ok(!ruledCover('SentenceRoom', 'leg', 'banner', 16));
});

test('variant check (item 092): an idle child\'s re-prompts, the same variant again, count once only when asked', () => {
  const bases = { house_doors: ['house_doors', 'house_doors_2'] };
  const ids = ['nar_ellie_house_doors', 'nar_ellie_house_doors', 'nar_ellie_house_doors_2'];
  assert.equal(variantIssues(ids, bases).length, 1);
  assert.deepEqual(variantIssues(ids, bases, true), []);
});

test('spawn-in-reach (hunt 6): a choice that appears within reach of her is a bug; one she was put on, or a door, is not', () => {
  const room = (spots: { id: string; x: number; y: number; correct: boolean | null }[]) =>
    ({ scene: 'ShifterRoom', room: { round: 'shifter:1:bun', player: { x: 640, y: 660, art: '' }, spots } }) as unknown as WWState;
  const s = room([{ id: 'stone_b', x: 640, y: 655, correct: true }, { id: 'stone_d', x: 400, y: 640, correct: false }, { id: 'door', x: 650, y: 650, correct: null }]);
  assert.deepEqual(spawnIssues(new Set(), s, 95).map((i) => i.detail), ['stone_b appeared 5 px from her (shifter:1:bun)']);
  assert.deepEqual(spawnIssues(new Set(['stone_b', 'stone_d', 'door']), s, 95), []);
  // Hunt 7: a lone answer (the bed she wakes in, the hub's secret door) is nothing to read.
  assert.deepEqual(spawnIssues(new Set(), room([{ id: 'bed', x: 640, y: 640, correct: true }, { id: 'door', x: 650, y: 650, correct: null }]), 95), []);
  // Hunt 9: measured from where she stood as it first showed, not where the driver has walked her since.
  const walked = room([{ id: 'stone_p', x: 640, y: 655, correct: true, from: { x: 640, y: 530 } } as never, { id: 'stone_j', x: 400, y: 640, correct: false }]);
  assert.deepEqual(spawnIssues(new Set(), walked, 95), []);
});

test('pad-in-reach (hunt 7): a move pad opening within her reach is flagged once a choice', () => {
  const at = (x: number) =>
    ({ scene: 'Battle', battle: { part: 1, fight: 'smaug_story', me: { x: 0, y: 0 }, choice: { open: true, from: { x, y: 590 }, words: ['hop', 'lift'], spots: [{ word: 'hop', x: 760, y: 480 }, { word: 'lift', x: 630, y: 590 }] } } }) as unknown as WWState;
  const seen = new Set<string>();
  assert.deepEqual(padReachIssues(seen, at(560), 95).map((i) => i.detail), ['LIFT opened 70 px from her (smaug_story)']);
  assert.deepEqual(padReachIssues(seen, at(560), 95), [], 'once a choice');
  assert.deepEqual(padReachIssues(new Set(), at(300), 95), []);
});

test('text off its panel (item 128): the old attic banner\'s key word over the red trim is a bug; a word on the cream is not', () => {
  // Measured from the old layout: JORMUNGANDR CAN NOT GET PAST THE UMBRELLA, the cream band 44 px tall.
  const panels = [{ scene: 'SentenceRoom', kind: 'banner', b: [243, 100, 1037, 144] as Box }];
  const text = (t: string, b: Box, ink?: Box) => ({ scene: 'SentenceRoom', text: t, b, depth: 10, group: 3, size: 56, panel: 0, ...(ink ? { ink } : {}) });
  const issues = panelIssues({ panels, texts: [text('L', [893, 120, 920, 200], [893, 132, 920, 193]), text('JORMUNGANDR', [270, 90, 700, 150], [272, 104, 698, 140])] }, 'SentenceRoom');
  assert.deepEqual(issues.map((i) => [i.kind, i.severity, i.detail]), [['text-off-panel', 'bug', '"L" [893,132,920,193] crosses the banner\'s edge [243,100,1037,144] by 49 px']]);
  // No ink measured: the box is the test. No panel: no check.
  assert.equal(panelIssues({ panels, texts: [text('THE', [300, 98, 400, 140])] }, 'SentenceRoom').length, 1);
  assert.deepEqual(panelIssues({ panels, texts: [{ ...text('THE', [0, 0, 10, 10]), panel: undefined }] }, 'SentenceRoom'), []);
});

test('text under her (hunt 9): stepped straight up, she stood over the Shape-Shifter label\'s B; beside it, or a small word, is not flagged', () => {
  // Measured from the sweep's shot: her figure's box and the label's letters (78 px, depth 381; her container at her feet, 530).
  const hero = (x: number) => ({ scene: 'ShifterRoom', b: [x - 45, 385, x + 45, 530] as Box, depth: 530 });
  const letter = (t: string, x: number, size = 78) => ({ scene: 'ShifterRoom', text: t, b: [x - 30, 350, x + 30, 450] as Box, depth: 381, group: 4, size });
  const texts = [letter('B', 556), letter('U', 640), letter('G', 724)];
  assert.deepEqual(heroIssues({ texts, heroes: [hero(570)] }, 'ShifterRoom').map((i) => i.kind + ':' + i.detail.split(' (')[0]), ['text-under-hero:she stands over "B"']);
  assert.deepEqual(heroIssues({ texts, heroes: [hero(444)] }, 'ShifterRoom'), []);
  assert.deepEqual(heroIssues({ texts: [letter('B', 556, 20)], heroes: [hero(570)] }, 'ShifterRoom'), []);
  // A stone's letter under her as she stands at it to choose: selection by walking (M42), not flagged.
  assert.deepEqual(heroIssues({ texts, heroes: [hero(570)], targets: [{ scene: 'ShifterRoom', id: 'stone_b', b: [500, 330, 600, 470], depth: 381 }] }, 'ShifterRoom'), []);
});

test("a glyph on her (hunt 10): Charge's cake slice over her head and shoulders is a look; beside her, or small, is not", () => {
  // Measured from the sweep: her figure in Charge (depth 620) and the 84 px gesture glyph (sparkles depth).
  const her = { scene: 'ChargeRoom', b: [431, 447, 529, 577] as Box, depth: 620 };
  const glyph = (x: number, size = 84) => ({ scene: 'ChargeRoom', text: '🍰', b: [x - 46, 450, x + 46, 541] as Box, depth: 9000, group: 0, size });
  assert.deepEqual(heroIssues({ texts: [glyph(465)], heroes: [her] }, 'ChargeRoom').map((i) => i.kind), ['glyph-on-hero']);
  assert.deepEqual(heroIssues({ texts: [glyph(220)], heroes: [her] }, 'ChargeRoom'), []);
  assert.deepEqual(heroIssues({ texts: [glyph(465, 30)], heroes: [her] }, 'ChargeRoom'), []);
});
