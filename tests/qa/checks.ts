/**
 * The bug-hunt checker's automatic checks (item 039): pure functions over
 * what the probe (`src/qa/probe.ts`) and `__ww.state()` report at a capture.
 * Each returns issues; `key` dedupes one issue seen at many captures.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';

// Type-only: the probe's own shapes, without loading Phaser in node.
import type { QaLayout, QaSince, Rect } from '../../src/qa/probe';
import type { WWState } from '../harness';
import { wordLine } from '../../content/voice/ids';

export interface Issue {
  kind: string;
  /** `bug`: breaks a rule or the game; `look`: worth a human look. */
  severity: 'bug' | 'look';
  scene: string;
  detail: string;
  key: string;
  shot?: string;
}

export type Box = Rect;

/**
 * What the probe's `layout()` reports (src/qa/probe.ts, `QaLayout`): texts,
 * images, spots, targets (`qaTarget`), covers (`qaCover`), panels (`qaPanel`)
 * and her figure (`qaHero`, hunt 9). Panels and heroes are optional here so
 * a hand-built layout may leave them out.
 */
export type Layout = Omit<QaLayout, 'panels' | 'heroes'> & Partial<Pick<QaLayout, 'panels' | 'heroes'>>;

/**
 * Words she stands in front of (hunt 9: stepped up out of the Shape-Shifter's
 * options' reach, she stood over its label's changed letter): a word of reading
 * size (40 px or more) under her figure, drawn above it, by more than a fifth of
 * its box. Her picture's box carries air either side, so its middle half is hers.
 * A look: she can walk away, but nothing should put her there.
 */
export function heroIssues(l: Pick<Layout, 'texts' | 'heroes'> & Partial<Pick<Layout, 'targets'>>, scene: string): Issue[] {
  const out: Issue[] = [];
  // A word on a thing she walks to (a stone, a pad) is under her when she stands at it to choose: that is
  // selection by walking, not this check's case (M42 asks about the stone sounding itself under her).
  const onTarget = (b: Box) => (l.targets ?? []).some((g) => g.scene === scene && inside((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, g.b));
  for (const h of l.heroes ?? []) {
    const w = h.b[2] - h.b[0];
    const body: Box = [h.b[0] + w / 4, h.b[1], h.b[2] - w / 4, h.b[3]];
    for (const t of l.texts) {
      if (t.scene !== h.scene || t.size < 40 || t.depth >= h.depth || !/[A-Za-z]/.test(t.text) || onTarget(t.b)) continue;
      const b = t.ink ?? t.b;
      const ix = Math.min(b[2], body[2]) - Math.max(b[0], body[0]);
      const iy = Math.min(b[3], body[3]) - Math.max(b[1], body[1]);
      const area = (b[2] - b[0]) * (b[3] - b[1]);
      if (ix <= 0 || iy <= 0 || area <= 0 || (ix * iy) / area < 0.2) continue;
      const name = t.text.replace(/\s+/g, ' ').slice(0, 30);
      out.push({ kind: 'text-under-hero', severity: 'look', scene, detail: `she stands over "${name}" (${Math.round((100 * ix * iy) / area)}% of it)`, key: `underhero:${scene}:${name}` });
    }
    // Hunt 10: a big picture glyph (no letters: Charge's gesture, a prop) drawn over her head and shoulders,
    // by more than a quarter of it (the cake slice sat on her face as the M sound played).
    const head: Box = [body[0], h.b[1], body[2], h.b[1] + (h.b[3] - h.b[1]) * 0.45];
    for (const t of l.texts) {
      if (t.scene !== h.scene || t.size < 60 || t.depth <= h.depth || /[A-Za-z0-9]/.test(t.text) || !t.text.trim()) continue;
      const b = t.b;
      const ix = Math.min(b[2], head[2]) - Math.max(b[0], head[0]);
      const iy = Math.min(b[3], head[3]) - Math.max(b[1], head[1]);
      const area = (b[2] - b[0]) * (b[3] - b[1]);
      if (ix <= 0 || iy <= 0 || area <= 0 || (ix * iy) / area < 0.25) continue;
      out.push({ kind: 'glyph-on-hero', severity: 'look', scene, detail: `${t.text.trim()} over her head (${Math.round((100 * ix * iy) / area)}% of it)`, key: `glyphhero:${scene}:${t.text.trim()}` });
    }
  }
  return out;
}

/**
 * A word crossing the edge of the panel it is printed on (item 128, Matt: the
 * attic's key word, lit red, sat over the banner's red trim): every lettered
 * text inside a `qaPanel` must lie wholly within its area, a pixel's slack.
 * The art's whole box (the cover) is not the test: its trim, pole and tassels
 * are no place for a word.
 */
export function panelIssues(l: Pick<Layout, 'texts' | 'panels'>, scene: string): Issue[] {
  const out: Issue[] = [];
  for (const t of l.texts) {
    const p = t.panel === undefined ? undefined : l.panels?.[t.panel];
    if (!p || !/[A-Za-z]/.test(t.text)) continue;
    // Its letters' ink where the probe measured it: a text's box carries the font's whole line height.
    const b = t.ink ?? t.b;
    const over = Math.max(p.b[0] - b[0], p.b[1] - b[1], b[2] - p.b[2], b[3] - p.b[3]);
    if (over <= 1) continue;
    const name = t.text.replace(/\s+/g, ' ').slice(0, 40);
    out.push({ kind: 'text-off-panel', severity: 'bug', scene, detail: `"${name}" [${b.join(',')}] crosses the ${p.kind}'s edge [${p.b.join(',')}] by ${over} px`, key: `offpanel:${scene}:${p.kind}:${name}` });
  }
  return out;
}

/**
 * Overlaps already ruled on in docs/qa-findings.md, a look and not a bug
 * (item 092: every scenario of a sweep reported them): W12's bedroom door
 * under the face card and the magic circle's edge (up to 30 px) under the story's last line,
 * W5's entry door on the door line, and W21's move-choice pad ring grazed (up
 * to 15 px of its bottom edge) by the partner's face card.
 */
export function ruledCover(scene: string, target: string, cover: string, overlapH: number): boolean {
  if (cover !== 'dialogue') return false;
  if ((scene === 'Bedroom' || scene === 'Entry') && target === 'door') return true;
  if (scene === 'Hub' && target === 'circle') return overlapH <= 30;
  // W44: under a two-row banner the find line's box can sit on a picture's foot (17 to 21 px), and goes as she walks.
  if (scene === 'SentenceRoom') return overlapH <= 22;
  return scene === 'Battle' && target.startsWith('pad_') && overlapH <= 15;
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
      const ruled = ruledCover(scene, t.id, c.kind, h);
      out.push({
        kind: ruled ? 'target-covered-ruled' : 'target-covered',
        severity: ruled ? 'look' : 'bug',
        scene,
        detail: `${t.id} [${t.b.join(',')}] under the ${c.kind} [${c.b.join(',')}], ${w}x${h} px`,
        key: `covered:${scene}:${c.kind}:${t.id}`,
      });
    }
  }
  return out;
}

/**
 * What the probe's `since(t)` reports (src/qa/probe.ts, `QaSince`). `lateArt`
 * (art drawn before it loaded, or a scene opened with its art still loading,
 * item 065) is optional here so a hand-built log may leave it out.
 */
export type Since = Omit<QaSince, 'lateArt'> & Partial<Pick<QaSince, 'lateArt'>>;

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
/**
 * The villain's decals (`decal_<id>`, src/world/houseMood.ts) beside a picture she picks from (hunt 11: a
 * question mark in line with the rhyme room's pictures; fix 150's bone pile between the hall's pictures read
 * as a fourth thing to pick). A look. Not the bedroom or the hub, where the mess comes in by the doors and
 * the toys on purpose, nor a door (the wall strip over the doors is the decals' place).
 */
export function decalIssues(l: Pick<Layout, 'images' | 'targets'>, scene: string): Issue[] {
  if (['Battle', 'Parent', 'Bedroom', 'Hub'].includes(scene)) return [];
  const out: Issue[] = [];
  const grow = (b: readonly number[], d: number): Box => [b[0]! - d, b[1]! - d, b[2]! + d, b[3]! + d];
  for (const im of l.images.filter((i) => i.scene === scene && i.key.startsWith('decal_'))) {
    // Not one hanging over it from the room's top (Elsa's icicles over the sentence room's HAT): wall mess, not a
    // thing on her floor to walk to.
    const over = (t: { b: readonly number[] }) => (im.b[1]! + im.b[3]!) / 2 < t.b[1]!;
    const near = l.targets.find((t) => t.scene === scene && !t.id.startsWith('door') && inter(grow(t.b, 30), im.b) > 0 && !over(t));
    if (near) out.push({ kind: 'decal-by-target', severity: 'look', scene, detail: `${im.key} at ${im.b.join(',')} by ${near.id}`, key: `decal:${scene}:${im.key}:${near.id}` });
  }
  return out;
}

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
    // Each text by its own scene (item 092: a capture taken as the room came back from the
    // grown-ups page held the page's last frame, and its mixed case read as the room's).
    if (!grown && t.scene !== 'Parent' && /[a-z]/.test(t.text)) out.push({ kind: 'lower-case', severity: 'bug', scene, detail: `"${name}"`, key: `lower:${t.scene}:${name}` });
    if (!grown && t.scene !== 'Parent' && !fleeting(t) && t.size > 0 && t.size < 14 && /[A-Z]/.test(t.text)) out.push({ kind: 'tiny-text', severity: 'look', scene, detail: `"${name}" at ${t.size.toFixed(0)}px`, key: `tiny:${t.scene}:${name}` });
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
  // A word over the edge of its banner or plate (item 128).
  out.push(...panelIssues(l, scene));
  // A word she stands in front of (hunt 9).
  out.push(...heroIssues(l, scene));
  // The villain's mess beside what she picks or on her (hunt 11).
  out.push(...decalIssues(l, scene));
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
      if (v.id === wordLine(target) || wordIn(v.text, target)) {
        out.push({ kind: 'says-target', severity: 'bug', scene: s.scene, detail: `${where}: "${v.id}" says ${T} before she answered`, key: `says:${where}:${v.id}` });
      }
    }
    // Not the grown-ups page's words (hunt 9: its "none = ANT" flagged a bridge on ANT): Dad's page, opened over a room.
    const shown = l.texts.filter((t) => t.scene !== 'Parent' && (t.text.trim().toUpperCase() === T || wordIn(t.text, target))).length;
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
  // The Shape-Shifter's new word (item 096): never said before she has it; read it shows it on the label (a letter
  // a text, so never one whole text either way), fix it shows only its picture.
  const sh = s.room?.shifter;
  if (sh && (sh.phase === 'intro' || sh.phase === 'pick')) check(sh.word, `shifter ${sh.index}`, 0);
  // The rhyme room's printed word (item 139): its plate is a text a sound unit, never the word whole, and it is
  // never said before she has it but in a miss's "Listen: bug, hug, rug!" (Matt's design), so only before a miss.
  const rh = s.room?.rhyme;
  if (rh && (rh.phase === 'intro' || rh.phase === 'pick') && rh.misses === 0) check(rh.word, `rhyme ${rh.index}`, 0);
  return out;
}

/**
 * A choice that appears within reach of her (hunt 6; the sentence room's fix 61, the word machine's 98,
 * the Shape-Shifter's 104): green mashed through the round's line picks it, unwalked and unread. `was`
 * holds the spot ids standing at the last poll; only a spot new since then counts (the driver puts her on
 * a spot only once the room listens, so a spot she was placed on is never new). Doors and the like
 * (`correct` null) are left out, and so is a lone answer with nothing to tell it from (hunt 7: the bed
 * she wakes in, the hub's secret door popping out beside her): walking to it reads nothing.
 */
export function spawnIssues(was: ReadonlySet<string>, s: WWState, reach: number): Issue[] {
  const r = s.room;
  if (!r?.player) return [];
  if (r.spots.filter((sp) => sp.correct !== null).length < 2) return [];
  return r.spots
    // Measured from where she stood as it first showed (hunt 9: polls are sparse while shots are taken, and the
    // driver had walked her 70 px toward the answer before the next poll saw the new stones).
    .map((sp) => ({ sp, d: Math.hypot(sp.x - (sp.from ?? r.player).x, sp.y - (sp.from ?? r.player).y) }))
    .filter(({ sp, d }) => sp.correct !== null && !was.has(sp.id) && d < reach)
    .map(({ sp, d }) => ({ kind: 'spawn-in-reach', severity: 'bug', scene: s.scene, detail: `${sp.id} appeared ${Math.round(d)} px from her (${r.round})`, key: `spawn:${s.scene}:${r.round}` }));
}

/**
 * A move pad opening within her reach (hunt 7, fix 119): the green dot already over it, a green
 * mashed through "Use HOP!" picks it unread. Checked once per choice, as it first opens (`seen`
 * holds the choices already checked). A contest may still need one there (her side, nobody
 * covered, outrank her reach), so a look.
 */
export function padReachIssues(seen: Set<string>, s: WWState, reach: number): Issue[] {
  const c = s.battle?.choice;
  // Where she stood as the pads went down, not where the driver has walked her since.
  const me = c?.from;
  if (!c || !me) return [];
  const key = `${s.battle!.part}:${c.words.join(',')}`;
  if (seen.has(key)) return [];
  seen.add(key);
  return c.spots
    .filter((p) => Math.hypot(p.x - me.x, p.y - me.y) < reach)
    .map((p) => ({ kind: 'pad-in-reach', severity: 'look', scene: s.scene, detail: `${p.word.toUpperCase()} opened ${Math.round(Math.hypot(p.x - me.x, p.y - me.y))} px from her (${s.battle!.fight})`, key: `padreach:${s.battle!.fight}:${p.word}` }));
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
    // Charge the Spell's quiet beats are hers: she says each rune's sound back, then reads (hunt 7).
    if (k.silentMs > 2500 && k.scene !== 'ChargeRoom') out.push({ kind: 'locked-silent', severity: 'look', scene: k.scene, detail: `${k.round}: input locked ${(k.ms / 1000).toFixed(1)} s, ${(k.silentMs / 1000).toFixed(1)} s of it silent`, key: `lsilent:${k.scene}:${k.round.replace(/:\w+$/, '')}` });
    // Charge has nothing for her to press (Dad answers): its whole two-word visit can be one lock (item 140).
    else if (k.ms > (k.scene === 'ChargeRoom' ? 66_000 : 20_000)) out.push({ kind: 'locked-long', severity: 'look', scene: k.scene, detail: `${k.round}: input locked ${(k.ms / 1000).toFixed(1)} s (talking)`, key: `llong:${k.scene}:${k.round.replace(/:\w+$/, '')}` });
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

/**
 * What changed between two snapshots of localStorage (item 092), named down to
 * a field's own entry where a value is JSON: `wordwarriors.progress
 * recent.line:room_listen`, `wordwarriors.progress words.box`.
 */
export function storeChanges(was: Record<string, string | null>, now: Record<string, string | null>): string[] {
  const parse = (v: string | null | undefined): unknown => {
    try {
      return v == null ? undefined : JSON.parse(v);
    } catch {
      return v;
    }
  };
  const out: string[] = [];
  const walk = (a: unknown, b: unknown, path: string, depth: number): void => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const objects = a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b);
    if (!objects || depth === 0) {
      out.push(path);
      return;
    }
    const [x, y] = [a as Record<string, unknown>, b as Record<string, unknown>];
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], path ? `${path}.${k}` : k, depth - 1);
  };
  for (const k of new Set([...Object.keys(was), ...Object.keys(now)])) {
    if (was[k] === now[k]) continue;
    const from = out.length;
    walk(parse(was[k]), parse(now[k]), '', 2);
    for (let i = from; i < out.length; i++) out[i] = `${k} ${out[i]}`.trim();
  }
  return out;
}

/** Changes that are only line variants said (`recent.line:<key>`): a room started again says its opening line's next variant. */
export const onlyLineVariants = (changes: string[]): boolean => changes.length > 0 && changes.every((c) => /^wordwarriors\.progress recent\.line:/.test(c));
