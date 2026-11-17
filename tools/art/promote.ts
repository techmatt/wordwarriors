/**
 * What `art:pick` does after the cut (item 191), so a promotion is one command:
 *
 * - a word picture drawn from a brief has the brief written into `PICTURES`
 *   (content/art/prompts.ts), without the boilerplate `derived` adds back;
 * - the id's `PICK_NOTES` row says which candidate is `current`, from which round;
 * - the decision goes into its round's `picks/<round>.decided.json`, and once
 *   every row of the round is decided (picked, or `keep`) the round is archived
 *   in Drive (`docs/storage.md`, *Disk*): sheet, manifest, previews, briefs, and
 *   the candidates of rows Matt kept as they were;
 * - then `art:pick` rewrites content/art/waiting.ts, and if a word's liveness
 *   changed, the golden draws and the phonics recorder's `?missing`.
 */

import { readdir, readFile, rename, stat, writeFile, mkdir, cp, rm, realpath } from 'node:fs/promises';
import path from 'node:path';

import { SCRATCH } from '../scratch.js';
import { exists } from '../shared.js';

export const PROMPTS_FILE = path.join('content', 'art', 'prompts.ts');

// -- PICTURES and PICK_NOTES ------------------------------------------------------

/**
 * A brief's text as a `PICTURES` line: `derived` wraps it in "A single clear
 * picture of …, centred, instantly recognisable … Nothing else in the picture.",
 * so the brief's own opening and closing boilerplate go.
 */
export function pictureFromBrief(text: string): string {
  const body = text.replace(/\s+/g, ' ').trim().replace(/^A single clear picture of\s+/i, '');
  // Drop the closing boilerplate sentences, from the end.
  const sentences = body.split(/(?<=[.!)])\s+(?=[A-Z(])/);
  const boiler = /^(Centred|Centered|Instantly recognisable|NO TEXT|No text|Nothing else in the picture)/i;
  while (sentences.length > 1 && boiler.test(sentences[sentences.length - 1]!)) sentences.pop();
  const t = sentences.join(' ').trim().replace(/[.,;\s]+$/, '');
  if (!t) throw new Error(`the brief has nothing left once its boilerplate goes: ${text}`);
  return t;
}

/** The lines of a `const NAME: Record<string, string> = {` block: [first entry line, closing line). */
function block(lines: string[], name: string): [number, number] {
  const start = lines.findIndex((l) => new RegExp(`^(export )?const ${name}: Record<string, string> = \\{`).test(l));
  if (start < 0) throw new Error(`${PROMPTS_FILE}: no ${name} block`);
  const end = lines.findIndex((l, i) => i > start && /^\};/.test(l));
  return [start + 1, end];
}

/** Set one single-line entry of a block, keeping a trailing `//` comment; a new key goes at the end. */
export function setEntry(src: string, name: string, key: string, value: string): string {
  const lines = src.split('\n');
  const [from, to] = block(lines, name);
  const keyRe = new RegExp(`^  (['"]?)${key}\\1:`);
  const line = `  ${key}: ${JSON.stringify(value)},`;
  const at = lines.findIndex((l, i) => i >= from && i < to && keyRe.test(l));
  if (at < 0) lines.splice(to, 0, line);
  else {
    // An entry must be one line here: a multi-line one is left for a hand.
    if (!/,(\s*\/\/.*)?$/.test(lines[at]!)) throw new Error(`${PROMPTS_FILE}: ${name}.${key} spans lines; edit it by hand`);
    const comment = /(['"`]),(\s*\/\/.*)$/.exec(lines[at]!)?.[2] ?? '';
    lines[at] = line + comment;
  }
  return lines.join('\n');
}

/** An entry's current value, if it is a plain one-line string literal. */
export function getEntry(src: string, name: string, key: string): string | undefined {
  const lines = src.split('\n');
  const [from, to] = block(lines, name);
  const m = lines.slice(from, to).map((l) => new RegExp(`^  (['"]?)${key}\\1:\\s*(.*?),(\\s*//.*)?$`).exec(l)).find(Boolean);
  if (!m) return undefined;
  const lit = m[2]!.trim();
  if (lit.startsWith('"')) return JSON.parse(lit) as string;
  if (lit.startsWith("'")) return lit.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  return undefined;
}

/** A pick note with its "`current` is …" sentence replaced by `current` (or added after the first sentence). */
export function noteWithCurrent(note: string | undefined, current: string): string {
  if (!note) return current;
  const re = /`current` is [^]*?\.(?=\s+(?:[`A-Z0-9(]|$)|$)\s*/;
  if (re.test(note)) return note.replace(re, `${current} `).trim();
  const first = /^[^]*?\.(?=\s+[`A-Z0-9(])/.exec(note);
  return first ? `${first[0]} ${current}${note.slice(first[0].length)}`.replace(/\s+/g, ' ').trim() : `${note} ${current}`;
}

// -- rounds -----------------------------------------------------------------------

export interface Manifest {
  name: string;
  rows: { id: string; options: { key: string; image: string; label?: string }[] }[];
}

export interface Decision {
  /** The candidate promoted, or `keep` for the art as it was. */
  key: string;
  at: string;
  brief?: { name: string; file: string };
}

export interface Decided {
  round: string;
  decisions: Record<string, Decision>;
}

const decidedFile = (picks: string, round: string) => path.join(picks, `${round}.decided.json`);

/** The rounds in `picks/` whose manifest has a row for `id`, newest first. */
export async function roundsFor(picks: string, id: string): Promise<string[]> {
  const files = (await readdir(picks).catch(() => [] as string[])).filter((f) => f.endsWith('.json') && !f.endsWith('.decided.json'));
  const found: { name: string; at: number }[] = [];
  for (const f of files) {
    const m = JSON.parse(await readFile(path.join(picks, f), 'utf8')) as Partial<Manifest>;
    if (Array.isArray(m.rows) && m.rows.some((r) => r.id === id)) found.push({ name: f.replace(/\.json$/, ''), at: (await stat(path.join(picks, f))).mtimeMs });
  }
  return found.sort((a, b) => b.at - a.at).map((r) => r.name);
}

export async function readManifest(picks: string, round: string): Promise<Manifest> {
  return JSON.parse(await readFile(path.join(picks, `${round}.json`), 'utf8')) as Manifest;
}

export async function readDecided(picks: string, round: string): Promise<Decided> {
  const f = decidedFile(picks, round);
  return (await exists(f)) ? (JSON.parse(await readFile(f, 'utf8')) as Decided) : { round, decisions: {} };
}

/** Record a row's decision; returns the rows still undecided. */
export async function decide(picks: string, round: string, id: string, d: Decision): Promise<string[]> {
  const m = await readManifest(picks, round);
  const decided = await readDecided(picks, round);
  decided.decisions[id] = d;
  await writeFile(decidedFile(picks, round), `${JSON.stringify(decided, null, 2)}\n`);
  return m.rows.map((r) => r.id).filter((r) => !decided.decisions[r]);
}

/** Drive's `archive\` beside the junction's target (`C:\Code\gdrive-sync\wordwarriors\archive`). */
export async function archiveRoot(originals: string): Promise<string> {
  return path.join(path.dirname(await realpath(originals)), 'archive');
}

/** Move a file or folder, across volumes too; a name already there is not overwritten. */
async function move(from: string, toDir: string): Promise<string | undefined> {
  if (!(await exists(from))) return undefined;
  await mkdir(toDir, { recursive: true });
  const to = path.join(toDir, path.basename(from));
  if (await exists(to)) throw new Error(`archive: ${to} is there already; move ${from} by hand`);
  try {
    await rename(from, to);
  } catch {
    await cp(from, to, { recursive: true });
    await rm(from, { recursive: true, force: true });
  }
  return to;
}

/**
 * Archive a decided round (items 187, 189): its sheet, manifest, decisions and
 * preview folder to `archive\art-originals\picks\`, the candidates still in
 * `alts/` for its rows (the ones Matt kept `current` for) to
 * `archive\art-originals\alts_<round>_passed\`, and the briefs its candidates
 * were drawn from to `archive\wordwarriors-scratch\<brief folder>\`.
 */
export async function archiveRound(opts: { picks: string; alts: string; archive: string; round: string; briefs: string[] }): Promise<string[]> {
  const { picks, alts, archive, round } = opts;
  const moved: string[] = [];
  const m = await readManifest(picks, round);
  // Every brief named by a candidate still in alts/ (their sidecars), and the ones picks recorded.
  const briefs = new Set(opts.briefs);
  const passed: string[] = [];
  // Only this round's own candidates (its manifest's numbered options): an id's numbers run on across
  // rounds, so a later round's open candidates for the same id stay in alts/.
  for (const r of m.rows) {
    for (const k of r.options.map((o) => o.key).filter((key) => /^\d+$/.test(key) && key !== '0')) {
      const png = path.join(alts, `${r.id}-${k}.png`);
      const side = path.join(alts, `${r.id}-${k}.json`);
      if (await exists(side)) {
        const s = JSON.parse(await readFile(side, 'utf8')) as { file?: string };
        if (s.file) briefs.add(s.file);
        passed.push(side);
      }
      if (await exists(png)) passed.push(png);
    }
  }
  for (const f of passed) moved.push((await move(f, path.join(archive, 'art-originals', `alts_${round.replace(/^art_alts_/, '')}_passed`)))!);
  for (const f of [`${round}.png`, `${round}.json`, `${round}.decided.json`, round]) {
    const to = await move(path.join(picks, f), path.join(archive, 'art-originals', 'picks'));
    if (to) moved.push(to);
  }
  for (const b of briefs) {
    // Only briefs in the scratch home; one in a folder there keeps its folder (`189_briefs\…`), which goes once empty.
    const from = path.resolve(b);
    const home = path.resolve(SCRATCH);
    if (!from.toLowerCase().startsWith(home.toLowerCase() + path.sep)) continue;
    const sub = path.dirname(path.relative(home, from));
    const to = await move(from, path.join(archive, 'wordwarriors-scratch', sub === '.' ? '' : sub)).catch(() => undefined);
    if (!to) continue;
    moved.push(to);
    const dir = path.dirname(from);
    if (path.resolve(dir).toLowerCase() !== home.toLowerCase() && !(await readdir(dir).catch(() => ['x'])).length) await rm(dir, { recursive: true });
  }
  return moved;
}
