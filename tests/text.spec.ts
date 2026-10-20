/**
 * Text never runs off the screen (item 020): the caption ribbon, the bark
 * bubbles, the sentence banner and the grown-ups page, each at the longest
 * text the content has. `texts` lists every visible Text in the running
 * scenes with its world bounds, flagged when it leaves the 1280×720 frame.
 */

import { readFileSync } from 'node:fs';

import { test, expect, type Page } from '@playwright/test';

import { boot, collectErrors, expectNoErrors, until } from './harness';

interface Line {
  id: string;
  text: string;
}

interface TextInfo {
  scene: string;
  text: string;
  bounds: number[];
  offscreen: boolean;
}

const LINES = JSON.parse(readFileSync('content/voice/lines.json', 'utf8')) as Line[];
const longest = (pred: (l: Line) => boolean) => LINES.filter(pred).sort((a, b) => b.text.length - a.text.length)[0]!;

function texts(page: Page): Promise<TextInfo[]> {
  return page.evaluate(() => (window as unknown as { __ww: { texts(): TextInfo[] } }).__ww.texts());
}

/** Poll until `pred` holds over the visible texts; returns them. */
async function untilTexts(page: Page, pred: (t: TextInfo[]) => boolean, what: string): Promise<TextInfo[]> {
  const start = Date.now();
  for (;;) {
    const t = await texts(page);
    if (pred(t)) return t;
    if (Date.now() - start > 10_000) throw new Error(`timed out waiting for ${what}`);
    await page.waitForTimeout(30);
  }
}

/** Hush whatever is playing, then say `id`; a bark waits out the gap after a cut-off bark. */
async function say(page: Page, id: string, priority: 'instruction' | 'bark', at?: { x: number; y: number }): Promise<void> {
  await page.evaluate(() => (window as unknown as { __ww: { hush(): void } }).__ww.hush());
  await page.waitForTimeout(400);
  await page.evaluate(
    ([i, p, a]) => {
      const ww = (window as unknown as { __ww: { hush(): void; say(id: string, p: string, at?: unknown): Promise<boolean> } }).__ww;
      ww.hush();
      void ww.say(i as string, p as string, a ?? undefined);
    },
    [id, priority, at ?? null] as const,
  );
}

test('the grown-ups page: every column wraps or shrinks to fit', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=parent');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'parent page');
  const all = await texts(page);
  expect(all.length).toBeGreaterThan(50);
  expect(all.filter((t) => t.offscreen)).toEqual([]);
  expectNoErrors(errors);
});

test('the longest caption and the longest bubble stay on screen, even at the edges', async ({ page }) => {
  const errors = collectErrors(page);
  // The hub has both the ribbon and the bubbles. Part 2's: it says one line
  // (the secret door), where part 1 teaches the spell first (20-40 s).
  await boot(page, '?scene=house&part=2&nojourney=1');
  // Once the hub's own line is over and it is quiet: otherwise its next
  // line cuts the test's bubble off within a frame or two of popping in.
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:secret' && !s.room.locked && !s.voice.busy, 60_000, 'hub quiet');
  // Narrator lines are instructions (the ribbon); taunts and reformed lines are barks (bubbles).
  const instruction = longest((l) => l.id.startsWith('nar_') || l.id.startsWith('core_'));
  const lastWord = instruction.text.split(/\s+/).pop()!.toUpperCase();
  await say(page, instruction.id, 'instruction');
  // The ribbon shows each word as its own text.
  const ribbon = await untilTexts(page, (t) => t.some((x) => x.text === lastWord), `the ribbon showing "${instruction.text}"`);
  expect(ribbon.filter((t) => t.offscreen), instruction.text).toEqual([]);

  const bark = longest((l) => l.id.startsWith('taunt_') || l.id.startsWith('reformed_'));
  const words = bark.text.toUpperCase().split(/\s+/).join(' ');
  for (const at of [{ x: 0, y: 0 }, { x: 1280, y: 720 }, { x: 640, y: 360 }]) {
    await say(page, bark.id, 'bark', at);
    // The bubble's text (wrapped: newlines where spaces were), once it has popped in.
    const shown = await untilTexts(
      page,
      (t) => t.some((x) => x.text.replace(/\s+/g, ' ') === words && x.bounds[2]! - x.bounds[0]! > 100),
      `the bubble "${bark.text}" at ${at.x},${at.y}`,
    );
    expect(shown.filter((t) => t.offscreen), `${bark.text} at ${at.x},${at.y}`).toEqual([]);
  }
  expectNoErrors(errors);
});

test('the longest counter sentence fits its banner, one row or wrapped between words', async ({ page }) => {
  const errors = collectErrors(page);
  // OZYMANDIAS IS NO MATCH FOR THE ...: a long name, and the counter frames are the longest.
  await boot(page, '?scene=room&slot=counter&villain=ozymandias&nojourney=1');
  const s = await until(page, (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence), 30_000, 'sentence room');
  await page.waitForTimeout(800);
  const all = await texts(page);
  // Every frame word is on the banner whole (the key word is split into letters).
  for (const token of s.room!.sentence!.tokens.slice(0, -1)) expect(all.some((t) => t.text === token), token).toBe(true);
  expect(all.filter((t) => t.offscreen)).toEqual([]);
  expectNoErrors(errors);
});
