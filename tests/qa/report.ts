/**
 * The bug-hunt checker's summary (item 039):
 *   npx tsx tests/qa/report.ts <tag> [--no-sheets]
 * reads `scratch/qa/<tag>/<scenario>.json` and writes `scratch/qa/<tag>/summary.md`
 * (issues merged across scenarios, most frequent first, each with a shot),
 * and a contact sheet per scenario, `scratch/qa/<tag>/sheets/<scenario>_<n>.png`
 * (six shots a row at a quarter size, 48 a sheet, each labelled by its file name).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

import sharp, { type OverlayOptions } from 'sharp';

import type { Issue } from './checks';

const [tag = 'now', ...flags] = process.argv.slice(2);
const dir = `scratch/qa/${tag}`;

interface Run {
  scenario: { name: string; query: string };
  seconds: number;
  stalled: string | null;
  shots: number;
  cast: { ally: string | null; villain: string; fight?: string; read: string[] } | null;
  heapMB: number[];
  frames: Record<string, { n: number; over50: number; over100: number; max: number }>;
  locks: { scene: string; round: string; ms: number; silentMs: number }[];
  issues: (Issue & { count: number })[];
}

const runs: Run[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Run);

const merged = new Map<string, { i: Issue; count: number; in: Set<string> }>();
for (const r of runs) {
  for (const i of r.issues) {
    // Spikes are per moment: group them by scene.
    const key = i.kind.startsWith('spike') ? `${i.kind}:${i.scene}` : i.key;
    const m = merged.get(key) ?? { i, count: 0, in: new Set<string>() };
    m.count += i.count;
    m.in.add(r.scenario.name);
    merged.set(key, m);
  }
}

const lines: string[] = [`# QA run \`${tag}\``, '', '| scenario | s | shots | cast | heap MB | stalled |', '| --- | --- | --- | --- | --- | --- |'];
for (const r of runs) {
  lines.push(`| ${r.scenario.name} | ${r.seconds} | ${r.shots} | ${r.cast ? `${r.cast.ally ?? '-'} vs ${r.cast.villain} (${r.cast.fight ?? '?'})` : '-'} | ${r.heapMB.join(' → ')} | ${r.stalled ?? ''} |`);
}
lines.push('', '## Frames (worst per scene, real ms)', '', '| scene | frames | >50 ms | >100 ms | max |', '| --- | --- | --- | --- | --- |');
const frames = new Map<string, { n: number; over50: number; over100: number; max: number }>();
for (const r of runs) {
  for (const [s, f] of Object.entries(r.frames)) {
    const a = frames.get(s) ?? { n: 0, over50: 0, over100: 0, max: 0 };
    frames.set(s, { n: a.n + f.n, over50: a.over50 + f.over50, over100: a.over100 + f.over100, max: Math.max(a.max, f.max) });
  }
}
for (const [s, f] of frames) lines.push(`| ${s} | ${f.n} | ${f.over50} | ${f.over100} | ${f.max} |`);
lines.push('', '## Issues', '');
const sorted = [...merged.values()].sort((a, b) => (a.i.severity === b.i.severity ? b.count - a.count : a.i.severity === 'bug' ? -1 : 1));
for (const m of sorted) {
  lines.push(`- **${m.i.severity} ${m.i.kind}** (${m.i.scene}) ${m.i.detail} — ×${m.count} in ${[...m.in].join(', ')}${m.i.shot ? ` — \`${m.i.shot}\`` : ''}`);
}
writeFileSync(`${dir}/summary.md`, `${lines.join('\n')}\n`);
console.log(`${dir}/summary.md: ${runs.length} runs, ${merged.size} issues`);

if (!flags.includes('--no-sheets')) {
  const W = 320;
  const H = 180;
  const COLS = 6;
  const PER = 48;
  mkdirSync(`${dir}/sheets`, { recursive: true });
  for (const r of runs) {
    const sd = `${dir}/${r.scenario.name}`;
    if (!existsSync(sd)) continue;
    const files = readdirSync(sd).filter((f) => f.endsWith('.png')).sort();
    for (let p = 0; p * PER < files.length; p++) {
      const list = files.slice(p * PER, (p + 1) * PER);
      const tiles: OverlayOptions[] = [];
      for (const [i, f] of list.entries()) {
        const x = (i % COLS) * W;
        const y = Math.floor(i / COLS) * (H + 18);
        tiles.push({ input: await sharp(`${sd}/${f}`).resize(W, H).toBuffer(), left: x, top: y + 18 });
        const label = f.slice(0, -4).slice(0, 44).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        tiles.push({ input: Buffer.from(`<svg width="${W}" height="18"><text x="3" y="13" font-family="Arial" font-size="11">${label}</text></svg>`), left: x, top: y });
      }
      const rows = Math.ceil(list.length / COLS);
      await sharp({ create: { width: COLS * W, height: rows * (H + 18), channels: 3, background: '#ffffff' } })
        .composite(tiles)
        .png()
        .toFile(`${dir}/sheets/${r.scenario.name}_${p + 1}.png`);
    }
  }
  console.log(`sheets in ${dir}/sheets/`);
}
