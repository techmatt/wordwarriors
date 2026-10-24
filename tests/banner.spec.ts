/**
 * Every word sits inside its banner (item 128). Matt, from play: the attic's
 * key word, lit red, sat over the banner's red trim (JORG IS VULNERABLE TO
 * SHELL). The banner art's cream panel is a band about a fifth of its height;
 * the words were laid out on the whole picture.
 *
 * The widest sentence each banner can show (a fetch frame in a side room, a
 * counter frame in the attic: every frame × every name its slot can take ×
 * every key word, measured in the page's own font) is played with
 * `?sentence=<frame>:<key>`, sampled with the bug-hunt checker's probe
 * (`?qa=1`) and its `panelIssues` check from the listening pass to the lit key
 * word, and shot (`banner-<kind>.png` in the test's output folder).
 */

import { test, expect, type Page } from '@playwright/test';

import { ROSTER, villainName } from '../content/battle/roster';
import { THINGS } from '../content/phonics/bank';
import { FRAMES, NO_ARTICLE, NUMBER_WORDS, type Frame } from '../content/phonics/sentences';
import { FONT_COMIC } from '../src/config';
import { SLOW, boot, collectErrors, expectNoErrors, readToKeyWord, until } from './harness';
import { coverIssues, panelIssues, type Issue } from './qa/checks';
import { qaLayout as layout } from './qa/probe';

/** Every word in the page's banner font, measured in a canvas: width at 100 px. */
async function widths(page: Page, words: string[]): Promise<Record<string, number>> {
  return page.evaluate(
    ([font, list]) => {
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `100px ${font}`;
      return Object.fromEntries(list.map((w) => [w, ctx.measureText(w).width]));
    },
    [FONT_COMIC, words] as const,
  );
}

/** The key words a frame can take (`episodePlans`: no number word outside a numbers frame, none the frame rules out, no A before a vowel or a some-word). */
function keysFor(f: Frame): string[] {
  const article = / A \{x\}$/.test(f.text);
  return THINGS.map((w) => w.word).filter((w) => (f.numbers || !NUMBER_WORDS.has(w)) && !f.not?.includes(w) && !(article && (/^[aeiou]/.test(w) || NO_ARTICLE.has(w))));
}

/** Each name slot: the URL key that casts it, and every character's name as that slot shows it. */
const SLOTS = {
  villain: { param: 'villain', name: (c: (typeof ROSTER)[number]) => villainName(c).displayName },
  helper: { param: 'ally', name: (c: (typeof ROSTER)[number]) => c.good.displayName },
  hero: { param: 'hero', name: (c: (typeof ROSTER)[number]) => c.good.displayName },
} as const;

interface Widest {
  frame: Frame;
  key: string;
  cast: string;
  tokens: string[];
}

/** The widest sentence of a use (fetch or counter): every frame, name and key word. */
async function widest(page: Page, use: Frame['use']): Promise<Widest> {
  const frames = FRAMES.filter((f) => f.use === use);
  const names = ROSTER.flatMap((c) => Object.values(SLOTS).map((s) => s.name(c).toUpperCase()));
  const keys = [...new Set(frames.flatMap(keysFor))].map((k) => k.toUpperCase());
  const frameWords = frames.flatMap((f) => f.text.split(' ').filter((t) => !t.startsWith('{')));
  const w = await widths(page, [...new Set([...names, ...keys, ...frameWords])]);
  let best: (Widest & { width: number }) | null = null;
  for (const frame of frames) {
    const slot = (Object.keys(SLOTS) as (keyof typeof SLOTS)[]).find((s) => frame.text.includes(`{${s}}`));
    // The roster's widest name for the slot (any frame without one: no cast needed).
    const pick = slot ? ROSTER.map((c) => ({ c, n: SLOTS[slot].name(c).toUpperCase() })).sort((a, b) => w[b.n]! - w[a.n]!)[0]! : null;
    const key = keysFor(frame).sort((a, b) => w[b.toUpperCase()]! - w[a.toUpperCase()]!)[0]!;
    const tokens = frame.text.replace(/\{(villain|helper|hero)\}/, pick?.n ?? '').replace('{x}', key.toUpperCase()).split(/\s+/).filter(Boolean);
    const width = tokens.reduce((n, t) => n + w[t]! + 40, 0);
    if (!best || width > best.width) best = { frame, key, cast: pick && slot ? `&${SLOTS[slot].param}=${pick.c.id}` : '', tokens, width };
  }
  return best!;
}

for (const [use, slot] of [
  ['fetch', 'a'],
  ['counter', 'counter'],
] as const) {
  test(`the widest ${use} sentence sits inside its banner, every word, the lit key word too`, SLOW, async ({ page }, info) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    // Measured on a page of its own: `boot` warps the clocks once per page.
    const measure = await page.context().newPage();
    await measure.goto('/');
    const s = await widest(measure, use);
    await measure.close();
    const game = use === 'fetch' ? `&game=sentence:${s.frame.id}` : '';
    await boot(page, `?scene=room&slot=${slot}&nojourney=1&qa=1&sentence=${s.frame.id}:${s.key}${game}${s.cast}`);
    const st = await until(page, (x) => x.scene === 'SentenceRoom' && Boolean(x.room?.sentence), 90_000, 'sentence room');
    expect(st.room!.sentence!.tokens, 'the widest sentence').toEqual(s.tokens);
    // From the banner popping in through the listening pass (the key word's pulse) to her turn.
    const seen = new Map<string, Issue>();
    const look = async () => {
      // And the taller banner hangs over no picture (item 059).
      const l = await layout(page);
      for (const i of [...panelIssues(l, 'SentenceRoom'), ...coverIssues(l, 'SentenceRoom')]) if (!seen.has(i.key)) seen.set(i.key, i);
    };
    for (let at = Date.now(); Date.now() - at < 6000; ) {
      await look();
      await page.waitForTimeout(80);
    }
    // The key word lit, as the pictures wake.
    await readToKeyWord(page);
    await page.waitForTimeout(400);
    await look();
    await page.screenshot({ path: info.outputPath(`banner-${use}.png`) });
    expect([...seen.values()], s.tokens.join(' ')).toEqual([]);
    expectNoErrors(errors);
  });
}

// The other words printed on a panel: the parked Word → Picture's banner (its word as drawn; the
// letters shrink until the widest fits the cream) and the word machine's plate. Nothing covers a target either.
for (const [name, query, scene] of [
  ['the word machine', '?scene=room&slot=a&game=word_machine&nojourney=1', 'WordMachine'],
  ['word → picture (parked)', '?scene=picture&nojourney=1', 'WordToPicture'],
] as const) {
  test(`${name}: its words stay on their panel`, async ({ page }, info) => {
    const errors = collectErrors(page);
    await boot(page, `${query}&qa=1`);
    await until(page, (st) => st.scene === scene, 90_000, scene);
    const seen = new Map<string, Issue>();
    let panels = 0;
    for (let at = Date.now(); Date.now() - at < 4000; ) {
      const l = await layout(page);
      panels = Math.max(panels, l.panels?.filter((p) => p.scene === scene).length ?? 0);
      for (const i of [...panelIssues(l, scene), ...coverIssues(l, scene)]) if (!seen.has(i.key)) seen.set(i.key, i);
      await page.waitForTimeout(100);
    }
    await page.screenshot({ path: info.outputPath(`panel-${scene}.png`) });
    expect(panels, 'a panel tagged').toBeGreaterThan(0);
    expect([...seen.values()]).toEqual([]);
    expectNoErrors(errors);
  });
}

test('the read pass\'s green dot sits on the banner under its word, not down over the pictures (hunt 9)', async ({ page }) => {
  // Item 128's taller banner (pole, trim, tassels) hung the dot, placed under the whole banner, 115 px below
  // the word and over the top of the left picture, where a green dot means "take this".
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a');
  const s = await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked && Boolean(st.room.sentence.readDot), 60_000, 'the read pass, dot up');
  const dot = s.room!.sentence!.readDot!;
  await page.screenshot({ path: test.info().outputPath('read-dot.png') });
  expect(dot.y, `dot at ${dot.y}, banner's bottom at ${s.room!.sentence!.bannerBottom}`).toBeLessThan(s.room!.sentence!.bannerBottom!);
  expectNoErrors(errors);
});
