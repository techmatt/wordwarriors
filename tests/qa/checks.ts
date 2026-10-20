/**
 * The bug-hunt checker's automatic checks (item 039): pure functions over
 * what the probe (`src/qa/probe.ts`) and `__ww.state()` report at a capture.
 * Each returns issues; `key` dedupes one issue seen at many captures.
 */

import { readdirSync, readFileSync } from 'node:fs';

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
  hudDepth: number;
}

export interface Since {
  voice: { t: number; id: string; scene: string; priority: string; text: string; noLine: boolean; silent: boolean }[];
  locks: { scene: string; round: string; start: number; ms: number; silentMs: number }[];
  spikes: { scene: string; t: number; ms: number; kind: string }[];
  flashes: { scene: string; t: number }[];
  console: { level: string; text: string; scene: string }[];
  missingArt: string[];
  frames: Record<string, { n: number; over50: number; over100: number; max: number }>;
  now: number;
}

const W = 1280;
const H = 720;

const area = (b: Box) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
const inter = (a: Box, b: Box): number => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
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
  // A target under the dialogue: the box's words (and the face cards) at speech depth and above.
  const hud = l.texts.filter((t) => t.depth >= l.hudDepth);
  const groups = new Map<number, Box>();
  for (const t of hud) {
    const g = groups.get(t.group);
    groups.set(t.group, g ? [Math.min(g[0], t.b[0]), Math.min(g[1], t.b[1]), Math.max(g[2], t.b[2]), Math.max(g[3], t.b[3])] : [...t.b]);
  }
  for (const s of l.spots) {
    for (const g of groups.values()) {
      const padded: Box = [g[0] - 20, g[1] - 16, g[2] + 20, g[3] + 16];
      // The thing stands on its spot: its middle is about 50 px above.
      if (inside(s.x, s.y - 50, padded)) out.push({ kind: 'target-covered', severity: 'look', scene, detail: `${s.id} under dialogue text`, key: `covered:${scene}:${s.id}` });
    }
  }
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

/** Voice with no line or no audio; console warnings; long locked or silent stretches; frame spikes. */
export function logIssues(q: Since): Issue[] {
  const out: Issue[] = [];
  for (const v of q.voice) {
    if (v.noLine) out.push({ kind: 'voice-no-line', severity: 'bug', scene: v.scene, detail: v.id, key: `noline:${v.id}` });
    else if (v.silent) out.push({ kind: 'voice-silent', severity: 'bug', scene: v.scene, detail: v.id, key: `silent:${v.id}` });
  }
  for (const c of q.console) {
    if (/^art: missing|^voice: (no line|could not)/.test(c.text)) continue;
    out.push({ kind: `console-${c.level}`, severity: c.level === 'error' ? 'bug' : 'look', scene: c.scene, detail: c.text, key: `console:${c.text.slice(0, 80)}` });
  }
  for (const a of q.missingArt) out.push({ kind: 'art-missing', severity: 'bug', scene: '', detail: a, key: `missing:${a}` });
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
