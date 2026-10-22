/**
 * The bug-hunt checker's automatic checks (item 039): pure functions over
 * what the probe (`src/qa/probe.ts`) and `__ww.state()` report at a capture.
 * Each returns issues; `key` dedupes one issue seen at many captures.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';

import type { WWState } from '../harness';

export interface Issue {
  kind: string;
  /** `bug`: breaks a rule or the game; `look`: worth a human look. */
  severity: 'bug' | 'look';
  scene: string;
  detail: string;
  key: string;
  shot?: string;
}

export type Box = [number, number, number, number];

export interface Layout {
  texts: { scene: string; text: string; b: Box; depth: number; group: number; size: number }[];
  images: { scene: string; key: string; b: Box; depth: number }[];
  spots: { id: string; x: number; y: number }[];
  /** What she must look at or choose (`qaTarget` in the game): pictures, doors, pads, recap cards. */
  targets: { scene: string; id: string; b: Box; depth: number }[];
  /** What may hang over the scene (`qaCover`): the dialogue box and face card, bubbles, the sentence banner. */
  covers: { scene: string; kind: string; b: Box; depth: number }[];
  hudDepth: number;
}

/**
 * Banners and dialogue over the things she must look at or choose (item 059,
 * Matt: "a banner or dialogue box must never cover a picture or target"):
 * every tagged cover, and any untagged lettered text at speech depth or
 * above (a new banner nobody tagged), boxed per container, against every
 * target's bounds. Only a cover drawn above the target counts (the victory's
 * recap cards stand over the dialogue box on purpose), and only a real
 * overlap, more than a few pixels each way. Words inside a target (its
 * label) or inside a tagged cover (the box's own words) are not covers.
 */
export function coverIssues(l: Pick<Layout, 'texts' | 'targets' | 'covers' | 'hudDepth'>, scene: string): Issue[] {
  const out: Issue[] = [];
  const centre = (b: Box) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] as const;
  const within = (b: Box, outer: Box) => inside(...centre(b), outer);
  const covers = [...l.covers];
  const groups = new Map<number, { b: Box; depth: number }>();
  for (const t of l.texts) {
    if (t.depth < l.hudDepth || !/[A-Za-z]/.test(t.text)) continue;
    if (l.covers.some((c) => within(t.b, c.b)) || l.targets.some((g) => within(t.b, g.b))) continue;
    const g = groups.get(t.group);
    groups.set(t.group, g ? { b: [Math.min(g.b[0], t.b[0]), Math.min(g.b[1], t.b[1]), Math.max(g.b[2], t.b[2]), Math.max(g.b[3], t.b[3])], depth: Math.max(g.depth, t.depth) } : { b: [...t.b], depth: t.depth });
  }
  for (const g of groups.values()) covers.push({ scene, kind: 'hud-text', ...g });
  for (const t of l.targets) {
    for (const c of covers) {
      if (c.depth <= t.depth) continue;
      const w = Math.min(t.b[2], c.b[2]) - Math.max(t.b[0], c.b[0]);
      const h = Math.min(t.b[3], c.b[3]) - Math.max(t.b[1], c.b[1]);
      if (w <= 4 || h <= 4) continue;
      out.push({
        kind: 'target-covered',
        severity: 'bug',
        scene,
        detail: `${t.id} [${t.b.join(',')}] under the ${c.kind} [${c.b.join(',')}], ${w}x${h} px`,
        key: `covered:${scene}:${c.kind}:${t.id}`,
      });
    }
  }
  return out;
}

export interface Since {
  voice: { t: number; id: string; scene: string; priority: string; text: string; noLine: boolean; silent: boolean; why?: string }[];
  locks: { scene: string; round: string; start: number; ms: number; silentMs: number }[];
  spikes: { scene: string; t: number; ms: number; kind: string }[];
  flashes: { scene: string; t: number }[];
  console: { level: string; text: string; scene: string }[];
  missingArt: string[];
  /** Art drawn before it loaded, or a scene opened with its art still loading (item 065). */
  lateArt?: { scene: string; id: string }[];
  frames: Record<string, { n: number; over50: number; over100: number; max: number }>;
  now: number;
}

const W = 1280;
const H = 720;

/** An `[l, t, r, b]` box's area (a `Box`, or a hook's `number[]`); 0 when it is empty. */
export const area = (b: readonly number[]) => Math.max(0, b[2]! - b[0]!) * Math.max(0, b[3]! - b[1]!);
/** The area two `[l, t, r, b]` boxes share; 0 when they do not overlap. */
export const inter = (a: readonly number[], b: readonly number[]): number => Math.max(0, Math.min(a[2]!, b[2]!) - Math.max(a[0]!, b[0]!)) * Math.max(0, Math.min(a[3]!, b[3]!) - Math.max(a[1]!, b[1]!));
const inside = (x: number, y: number, b: Box) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

/** Art ids whose PNG is still the placeholder painter's (its tEXt mark). */
export function placeholderArt(dir = 'public/art'): Set<string> {
  const mark = Buffer.from('tEXtWordWarriors\0placeholder', 'latin1');
  const out = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.png') && readFileSync(`${dir}/${f}`).subarray(0, 4096).includes(mark)) out.add(f.slice(0, -4));
  }
  return out;
}

/** Text off screen, text over text, lower case, tiny text; targets under the dialogue; placeholder art. */
export function layoutIssues(l: Layout, scene: string, placeholders: Set<string>): Issue[] {
  const out: Issue[] = [];
  const grown = scene === 'Parent';
  // The battle's comic words (BAM!, a move's name) pop, scale and fly: only its HUD counts there.
  const fleeting = (t: Layout['texts'][number]) => (scene === 'Battle' || scene === 'Ending') && t.depth < l.hudDepth;
  const lettered = (t: Layout['texts'][number]) => /[A-Za-z]/.test(t.text);
  for (const t of l.texts) {
    const name = t.text.replace(/\s+/g, ' ').slice(0, 40);
    // An emoji particle flying off the edge is fine; words are not.
    if (lettered(t) && (t.b[0] < -2 || t.b[1] < -2 || t.b[2] > W + 2 || t.b[3] > H + 2)) {
      out.push({ kind: 'text-offscreen', severity: 'bug', scene, detail: `"${name}" at ${t.b.join(',')}`, key: `offscreen:${t.scene}:${name}` });
    }
    if (!grown && /[a-z]/.test(t.text)) out.push({ kind: 'lower-case', severity: 'bug', scene, detail: `"${name}"`, key: `lower:${t.scene}:${name}` });
    if (!grown && !fleeting(t) && t.size > 0 && t.size < 14 && /[A-Z]/.test(t.text)) out.push({ kind: 'tiny-text', severity: 'look', scene, detail: `"${name}" at ${t.size.toFixed(0)}px`, key: `tiny:${t.scene}:${name}` });
  }
  // Text over text: two texts laid out apart (different containers) covering each other.
  for (let i = 0; i < l.texts.length; i++) {
    for (let j = i + 1; j < l.texts.length; j++) {
      const a = l.texts[i]!;
      const b = l.texts[j]!;
      if (a.text === b.text && a.group === b.group) continue;
      if ((fleeting(a) && fleeting(b)) || !lettered(a) || !lettered(b)) continue;
      if (a.group && a.group === b.group) continue;
      const o = inter(a.b, b.b);
      const small = Math.min(area(a.b), area(b.b));
      if (small > 0 && o / small > 0.3) {
        const na = a.text.replace(/\s+/g, ' ').slice(0, 24);
        const nb = b.text.replace(/\s+/g, ' ').slice(0, 24);
        // Emoji and outlines drawn as a second text at the same spot are one label.
        if (na === nb && Math.abs(a.b[0] - b.b[0]) < 6) continue;
        out.push({ kind: 'text-overlap', severity: 'look', scene, detail: `"${na}" over "${nb}"`, key: `overlap:${scene}:${[na, nb].sort().join('|')}` });
      }
    }
  }
  // A target under a banner, the dialogue box or a bubble (item 059: real boxes, a bug).
  out.push(...coverIssues(l, scene));
  for (const im of l.images) {
    if (placeholders.has(im.key)) out.push({ kind: 'placeholder-art', severity: 'look', scene, detail: im.key, key: `placeholder:${im.key}` });
  }
  return out;
}

const wordIn = (text: string, w: string) => new RegExp(`\\b${w}\\b`, 'i').test(text);

/**
 * Says or shows a word she must read before she has answered: the sentence
 * room's key word, the word machine's word. `since` is the voice since the
 * round began.
 */
export function leakIssues(s: WWState, l: Layout, voiceSinceRound: Since['voice']): Issue[] {
  const out: Issue[] = [];
  const check = (target: string, where: string, banner: number) => {
    const T = target.toUpperCase();
    for (const v of voiceSinceRound) {
      if (v.id.startsWith('letter_')) continue;
      if (v.id === `word_${target}` || wordIn(v.text, target)) {
        out.push({ kind: 'says-target', severity: 'bug', scene: s.scene, detail: `${where}: "${v.id}" says ${T} before she answered`, key: `says:${where}:${v.id}` });
      }
    }
    const shown = l.texts.filter((t) => t.text.trim().toUpperCase() === T || wordIn(t.text, target)).length;
    if (shown > banner) out.push({ kind: 'shows-target', severity: 'bug', scene: s.scene, detail: `${where}: ${T} on screen ${shown}x`, key: `shows:${where}:${T}` });
  };
  const sent = s.room?.sentence;
  if (sent && sent.pass !== 'done') check(sent.key, `sentence ${sent.frame}`, 1);
  const m = s.room?.machine;
  // The machine's word is built from its rime and a tile, never printed whole before it is made.
  if (m && (m.phase === 'pick' || m.phase === 'intro') && m.word) check(m.word, `machine ${m.rime}`, 0);
  // The bridge's word is its stones, a letter each, never printed whole or said before she picks its picture (item 054).
  const b = s.room?.bridge;
  if (b && b.phase !== 'check' && b.phase !== 'done') check(b.word, `bridge ${b.index}`, 0);
  return out;
}

/**
 * Every line in `lines.json` with no clip: no manifest entry (`voice-unbuilt`),
 * a manifest entry for other text (`voice-stale`: the clip says an old line),
 * or a missing or empty mp3 (`voice-no-clip`). Item 062: Matt heard captions
 * with nothing said. The static half of "a line plays with no clip"; the
 * played half is `voice-silent` (logIssues), which names why.
 */
export function voiceBuildIssues(linesFile = 'content/voice/lines.json', out = 'public'): Issue[] {
  const lines = JSON.parse(readFileSync(linesFile, 'utf8')) as { id: string; text: string }[];
  let manifest: { lines: { id: string; text: string; audio: string }[] };
  try {
    manifest = JSON.parse(readFileSync(`${out}/voice-gen/manifest.json`, 'utf8'));
  } catch {
    return [{ kind: 'voice-unbuilt', severity: 'bug', scene: '', detail: 'no voice manifest: every line plays silent (npm run voice:build)', key: 'unbuilt:manifest' }];
  }
  const built = new Map(manifest.lines.map((l) => [l.id, l]));
  const issues: Issue[] = [];
  for (const l of lines) {
    const m = built.get(l.id);
    if (!m) issues.push({ kind: 'voice-unbuilt', severity: 'bug', scene: '', detail: `${l.id}: not in the manifest (npm run voice:build)`, key: `unbuilt:${l.id}` });
    else if (m.text !== l.text) issues.push({ kind: 'voice-stale', severity: 'bug', scene: '', detail: `${l.id}: the clip says "${m.text}", the line is "${l.text}"`, key: `stale:${l.id}` });
    else if (!clipSize(`${out}/${m.audio}`)) issues.push({ kind: 'voice-no-clip', severity: 'bug', scene: '', detail: `${l.id}: ${m.audio} missing or empty`, key: `noclip:${l.id}` });
  }
  return issues;
}

function clipSize(file: string): number {
  try {
    return statSync(file).size;
  } catch {
    return 0;
  }
}

/** Voice with no line or no audio; console warnings; long locked or silent stretches; frame spikes. */
export function logIssues(q: Since, speed = 1): Issue[] {
  const out: Issue[] = [];
  for (const v of q.voice) {
    if (v.noLine) out.push({ kind: 'voice-no-line', severity: 'bug', scene: v.scene, detail: v.id, key: `noline:${v.id}` });
    // A line plays with no clip: its caption shows and nothing is said (item 062).
    else if (v.silent) {
      // Item 069: at test speed the game asks for lines `speed` times faster than the decode queue
      // can serve them (a whole episode at real speed had none silent), so a line still queued or
      // decoding is a look there; failed, none or a suspended context are bugs at any speed.
      const lag = speed > 1 && (v.why === 'queued' || v.why === 'decoding');
      out.push({ kind: 'voice-silent', severity: lag ? 'look' : 'bug', scene: v.scene, detail: `${v.id}: played with no clip (${v.why ?? 'not decoded'})${lag ? `, at speed ${speed}: check at WW_SPEED=1` : ''}`, key: `silent:${v.id}` });
    }
  }
  for (const c of q.console) {
    if (/^art: (missing|not ready)|^voice: (no line|could not)/.test(c.text)) continue;
    out.push({ kind: `console-${c.level}`, severity: c.level === 'error' ? 'bug' : 'look', scene: c.scene, detail: c.text, key: `console:${c.text.slice(0, 80)}` });
  }
  for (const a of q.missingArt) out.push({ kind: 'art-missing', severity: 'bug', scene: '', detail: a, key: `missing:${a}` });
  for (const a of q.lateArt ?? []) out.push({ kind: 'art-late', severity: 'bug', scene: a.scene, detail: `${a.id}: shown before it loaded`, key: `late:${a.scene}:${a.id}` });
  for (const k of q.locks) {
    if (k.silentMs > 2500) out.push({ kind: 'locked-silent', severity: 'look', scene: k.scene, detail: `${k.round}: input locked ${(k.ms / 1000).toFixed(1)} s, ${(k.silentMs / 1000).toFixed(1)} s of it silent`, key: `lsilent:${k.scene}:${k.round.replace(/:\w+$/, '')}` });
    else if (k.ms > 20_000) out.push({ kind: 'locked-long', severity: 'look', scene: k.scene, detail: `${k.round}: input locked ${(k.ms / 1000).toFixed(1)} s (talking)`, key: `llong:${k.scene}:${k.round.replace(/:\w+$/, '')}` });
  }
  // Full-screen flashes: more than three in any second is the photosensitivity line (WCAG 2.3.1).
  const fl = q.flashes;
  for (let i = 0; i + 3 < fl.length; i++) {
    if (fl[i + 3]!.t - fl[i]!.t < 1000) {
      const n = fl.filter((f) => f.t >= fl[i]!.t && f.t < fl[i]!.t + 1000).length;
      out.push({ kind: 'flash-rate', severity: 'look', scene: fl[i]!.scene, detail: `${n} full-screen flashes within one second`, key: `flash:${fl[i]!.scene}:${Math.round(fl[i]!.t / 5000)}` });
    }
  }
  for (const sp of q.spikes) {
    if (sp.ms >= 250) out.push({ kind: `spike-${sp.kind}`, severity: 'look', scene: sp.scene, detail: `${sp.ms} ms`, key: `spike:${sp.scene}:${sp.kind}:${Math.round(sp.t)}` });
  }
  return out;
}
