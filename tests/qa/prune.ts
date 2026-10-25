/**
 * The checker's retention (item 149): `qa/` in the scratch home keeps the last
 * three bug hunts and prunes the rest. Every sweep runs it as it starts
 * (`qa.config.ts`'s `globalSetup`; `QA_PRUNE=0` skips it); by hand:
 *
 *   npx tsx tests/qa/prune.ts [--dry]
 *
 * A run's tag names its hunt: `h<N>…` is hunt N (`h11a`, `h11lenses`, `h8issues.py`).
 * Kept: every run of the three highest hunts, counting the sweep starting now
 * (`QA_TAG`); that run itself, whatever its tag; any run a kept hunt cites
 * (`qa/<tag>/`, `QA_TAG=<tag>` or `` `<tag>` `` in a kept run's `summary.md` or in
 * the kept hunts' sections of `docs/qa-findings.md`); and a run with no hunt in its
 * tag (`087`, `look1`) no older than the oldest kept hunt's first run. Nothing else
 * reads an older run back: `report.ts` reads only its own tag. README, "The bug-hunt checker".
 */

import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scratchPath } from '../../tools/scratch';

/** Hunts kept. */
export const KEEP_HUNTS = 3;

/** The hunt a tag belongs to, or null for a run outside any hunt. */
export const huntOf = (tag: string): number | null => {
  const m = /^h(\d+)/.exec(tag);
  return m ? Number(m[1]) : null;
};

export interface Run {
  tag: string;
  /** When it was last written, ms. */
  mtimeMs: number;
}

/** Does `text` cite run `tag`: a path into it, its `QA_TAG=`, or the tag in backticks? */
export function cites(text: string, tag: string): boolean {
  const t = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Not followed by what a tag can go on with (`h9a` is not cited by `h9a-2`, `h9a2` or `h9a.x`; a full stop is fine).
  const end = '(?![\\w-]|\\.\\w)';
  return new RegExp(`qa[\\\\/]${t}${end}|QA_TAG=${t}${end}|\`${t}\``).test(text);
}

/** `docs/qa-findings.md`'s `## Hunt <n>` sections for the hunts in `hunts`. */
export function huntSections(findings: string, hunts: ReadonlySet<number>): string {
  return findings
    .split(/^(?=## )/m)
    .filter((s) => {
      const m = /^## Hunt (\d+)\b/.exec(s);
      return m && hunts.has(Number(m[1]));
    })
    .join('');
}

/**
 * Which runs to keep and which to prune. `current` is the tag of the sweep starting
 * now, if any; `citing(kept)` returns the text the kept hunts cite runs in.
 */
export function plan(runs: Run[], current: string | undefined, citing: (hunts: ReadonlySet<number>, keep: string[]) => string, keepHunts = KEEP_HUNTS): { keep: string[]; prune: string[] } {
  const numbers = new Set<number>();
  for (const r of runs) {
    const h = huntOf(r.tag);
    if (h !== null) numbers.add(h);
  }
  const ch = current === undefined ? null : huntOf(current);
  if (ch !== null) numbers.add(ch);
  const hunts = new Set([...numbers].sort((a, b) => b - a).slice(0, keepHunts));
  const firsts = runs.filter((r) => hunts.has(huntOf(r.tag) ?? -1)).map((r) => r.mtimeMs);
  const since = firsts.length ? Math.min(...firsts) : -Infinity;
  const kept = (r: Run) => {
    const h = huntOf(r.tag);
    return r.tag === current || (h === null ? r.mtimeMs >= since : hunts.has(h));
  };
  const keep = runs.filter(kept).map((r) => r.tag);
  const text = citing(hunts, keep);
  const prune: string[] = [];
  for (const r of runs) {
    if (kept(r)) continue;
    if (cites(text, r.tag)) keep.push(r.tag);
    else prune.push(r.tag);
  }
  return { keep, prune };
}

/** Prune `qa/` in the scratch home; returns what went. */
export function prune(dry = false, current = process.env.QA_TAG ?? 'now'): string[] {
  const dir = scratchPath('qa');
  if (!existsSync(dir)) return [];
  const runs: Run[] = readdirSync(dir).map((tag) => ({ tag, mtimeMs: statSync(path.join(dir, tag)).mtimeMs }));
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'qa-findings.md');
  const findings = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const citing = (hunts: ReadonlySet<number>, keep: string[]) =>
    [huntSections(findings, hunts), ...keep.map((t) => path.join(dir, t, 'summary.md')).filter(existsSync).map((f) => readFileSync(f, 'utf8'))].join('\n');
  const { prune: gone } = plan(runs, current, citing);
  for (const tag of gone) {
    if (!dry) rmSync(path.join(dir, tag), { recursive: true, force: true });
  }
  if (gone.length) console.log(`qa prune: ${dry ? 'would delete' : 'deleted'} ${gone.length} older run${gone.length === 1 ? '' : 's'} in ${dir}: ${gone.join(' ')}`);
  return gone;
}

/** Playwright's `globalSetup`: once, as a sweep starts. */
export default function globalSetup(): void {
  if (process.env.QA_PRUNE === '0') return;
  prune();
}

// Run by hand, not imported by Playwright.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prune(process.argv.includes('--dry'));
