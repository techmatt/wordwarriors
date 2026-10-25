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
 *
 * Thinned (item 152): a kept hunt whose rulings have landed (`landed`: its section in
 * `docs/qa-findings.md` written and every row of its Matt's calls ruled) keeps each run's
 * `summary.md`, JSON and every shot that text cites (`citesShot`); its other shots go.
 * The newest hunt stays whole until Matt has ruled on it.
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
 * Have hunt `hunt`'s rulings landed? Its `## Hunt <n>` section is written and every row
 * of its `### Matt's calls` table has its Ruling filled (a section with no calls table
 * has nothing to rule). No section yet: the hunt is still going, or not written up.
 */
export function landed(findings: string, hunt: number): boolean {
  const section = huntSections(findings, new Set([hunt]));
  if (!section) return false;
  const calls = /^### Matt's calls\s*$([\s\S]*?)(?=^### |(?![\s\S]))/m.exec(section);
  if (!calls) return true;
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim());
  const rows = calls[1].split('\n').filter((l) => l.trim().startsWith('|'));
  const header = rows.shift();
  if (!header) return true;
  const names = cells(header);
  const col = names.findIndex((c) => /^ruling$/i.test(c));
  if (col < 0) return false;
  // A row with a stray empty cell (`||`) is wider than the header: its Ruling, the last column, is its last cell.
  const ruling = (c: string[]) => (col === names.length - 1 ? c[c.length - 1] : c[col]) ?? '';
  return rows.filter((l) => !/^\|[\s|:-]+$/.test(l.trim())).every((l) => ruling(cells(l)) !== '');
}

/**
 * Does `text` cite shot `rel` (`<scenario>/<n>_….png`, or any PNG path inside the run) of
 * run `tag`: its path (`qa/<tag>/<rel>`), or, for a scenario's shot, `` `<scenario>` <n> ``
 * as `docs/qa-findings.md` writes it (`` `drawn4` 296 ``, `` `soak3` 986, 990 ``)?
 */
export function citesShot(text: string, tag: string, rel: string): boolean {
  const r = rel.replace(/\\/g, '/');
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`qa[\\\\/]${esc(tag)}[\\\\/]${esc(r).replace(/\//g, '[\\\\/]')}`).test(text)) return true;
  const m = /^([^/]+)\/(\d+)_[^/]*\.png$/i.exec(r);
  if (!m) return false;
  const list = new RegExp(`\`${esc(m[1])}\`((?:[ ,]+(?:and |to )?\\d{3,4}\\b)+)`, 'g');
  for (const hit of text.matchAll(list)) {
    if (hit[1].match(/\d+/g)?.includes(m[2])) return true;
  }
  return false;
}

/**
 * Which runs to keep, which to thin and which to prune. `current` is the tag of the sweep
 * starting now, if any; `citing(kept)` returns the text the kept hunts cite runs in;
 * `isLanded(hunt)` says whether a hunt's rulings have landed, and a kept run of such a
 * hunt (the run starting aside) is thinned: its shots go but for the ones cited.
 */
export function plan(runs: Run[], current: string | undefined, citing: (hunts: ReadonlySet<number>, keep: string[]) => string, keepHunts = KEEP_HUNTS, isLanded: (hunt: number) => boolean = () => false): { keep: string[]; thin: string[]; prune: string[] } {
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
  const thin = runs.filter((r) => r.tag !== current && hunts.has(huntOf(r.tag) ?? -1) && isLanded(huntOf(r.tag)!)).map((r) => r.tag);
  return { keep, thin, prune };
}

/**
 * Thin run directory `runDir` (tag `tag`): delete every PNG `text` does not cite, then
 * the folders left empty. Returns the shots deleted (or that would be) and their bytes.
 */
export function thinRun(runDir: string, tag: string, text: string, dry: boolean): { shots: number; bytes: number } {
  let shots = 0;
  let bytes = 0;
  const walk = (rel: string): boolean => {
    const abs = path.join(runDir, rel);
    let empty = true;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (walk(r) && !dry) rmSync(path.join(runDir, r), { recursive: true, force: true });
        else empty = false;
      } else if (/\.png$/i.test(e.name) && !citesShot(text, tag, r)) {
        shots++;
        bytes += statSync(path.join(runDir, r)).size;
        if (!dry) rmSync(path.join(runDir, r), { force: true });
      } else empty = false;
    }
    return empty;
  };
  walk('');
  return { shots, bytes };
}

/** Prune `qa/` in the scratch home, and thin the runs of hunts whose rulings have landed; returns what went whole. */
export function prune(dry = false, current = process.env.QA_TAG ?? 'now'): string[] {
  const dir = scratchPath('qa');
  if (!existsSync(dir)) return [];
  const runs: Run[] = readdirSync(dir).map((tag) => ({ tag, mtimeMs: statSync(path.join(dir, tag)).mtimeMs }));
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'qa-findings.md');
  const findings = existsSync(file) ? readFileSync(file, 'utf8') : '';
  let text = '';
  const citing = (hunts: ReadonlySet<number>, keep: string[]) =>
    (text = [huntSections(findings, hunts), ...keep.map((t) => path.join(dir, t, 'summary.md')).filter(existsSync).map((f) => readFileSync(f, 'utf8'))].join('\n'));
  const { prune: gone, thin } = plan(runs, current, citing, KEEP_HUNTS, (h) => landed(findings, h));
  for (const tag of gone) {
    if (!dry) rmSync(path.join(dir, tag), { recursive: true, force: true });
  }
  if (gone.length) console.log(`qa prune: ${dry ? 'would delete' : 'deleted'} ${gone.length} older run${gone.length === 1 ? '' : 's'} in ${dir}: ${gone.join(' ')}`);
  const thinned: string[] = [];
  let bytes = 0;
  for (const tag of thin) {
    if (!statSync(path.join(dir, tag)).isDirectory()) continue;
    const t = thinRun(path.join(dir, tag), tag, text, dry);
    bytes += t.bytes;
    if (t.shots) thinned.push(`${tag} (${t.shots})`);
  }
  if (thinned.length) {
    const hunts = [...new Set(thinned.map((t) => huntOf(t)))].sort((a, b) => a! - b!).join(', ');
    console.log(`qa prune: ${dry ? 'would thin' : 'thinned'} ${thinned.length} run${thinned.length === 1 ? '' : 's'} of hunt${hunts.includes(',') ? 's' : ''} ${hunts} (rulings landed), ${(bytes / 1e9).toFixed(1)} GB of uncited shots: ${thinned.join(' ')}`);
  }
  if (dry) {
    const ruled = [...new Set(thin.map((t) => huntOf(t)!))].sort((a, b) => a - b);
    const whole = [...new Set(runs.map((r) => huntOf(r.tag)).filter((h): h is number => h !== null && !ruled.includes(h) && !gone.some((g) => huntOf(g) === h)))].sort((a, b) => a - b);
    console.log(`qa prune: thinned once ruled: ${ruled.length ? `hunt ${ruled.join(', ')}` : 'none'}; kept whole (rulings not landed): ${whole.length ? `hunt ${whole.join(', ')}` : 'none'}`);
  }
  return gone;
}

/** Playwright's `globalSetup`: once, as a sweep starts. */
export default function globalSetup(): void {
  if (process.env.QA_PRUNE === '0') return;
  prune();
}

// Run by hand, not imported by Playwright.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prune(process.argv.includes('--dry'));
