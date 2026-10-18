/**
 * `npm run voice:lines`: write content/voice/lines.json from the data.
 *
 * lines.json is generated, never hand-edited: the narrator templates
 * (content/voice/script.ts), the roster's names, taunts and ultimates
 * (content/battle/roster.ts) and the phonics tables (content/phonics/) are the
 * source. Composing per narrator is what lets the ally really be the voice of
 * the instructions without anybody writing 12 copies of every line.
 *
 * Then `npm run voice:build` turns lines.json into audio; it is incremental, so
 * re-composing after a one-word change rebuilds one line.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { MOVE_WORDS, ROSTER } from '../../content/battle/roster.js';
import type { FighterSpec } from '../../content/battle/types.js';
import { LETTERS } from '../../content/phonics/letters.js';
import { WORDS, spokenWord } from '../../content/phonics/words.js';
import {
  DEFAULT_NARRATOR,
  PHONICS_SPEAKER,
  fighterId,
  group,
  letterSoundLine,
  nameLine,
  narratorLine,
  tauntLine,
  ultimateLine,
  wordLine,
} from '../../content/voice/ids.js';
import { CORE_LINES, HERO_LINES, MOVE_LINES, NARRATOR_LINES, VILLAIN_LINES, type Template } from '../../content/voice/script.js';
import { isMain } from './clips.js';
import type { LineSpec } from './types.js';

interface Fill {
  hero?: FighterSpec;
  villain?: FighterSpec;
  item?: string;
  word?: string;
}

/** Substitute placeholders into display text and spoken text separately. */
function fill(t: Template, f: Fill): { text: string; say?: string } {
  const show = (s: string) =>
    s
      .replace('{hero}', f.hero?.displayName ?? '')
      .replace(/\{villain\}/g, f.villain?.displayName ?? '')
      .replace('{item}', f.item ?? '')
      .replace('{word}', f.word ?? '');
  const speak = (s: string) =>
    s
      .replace('{hero}', f.hero?.sayName ?? f.hero?.displayName ?? '')
      .replace(/\{villain\}/g, f.villain?.sayName ?? f.villain?.displayName ?? '')
      .replace('{item}', f.item ?? '')
      .replace('{word}', f.word ?? '');
  const text = show(t.text);
  const needsSay = t.say !== undefined || Boolean(f.hero?.sayName) || Boolean(f.villain?.sayName);
  return needsSay ? { text, say: speak(t.say ?? t.text) } : { text };
}

export function composeLines(): LineSpec[] {
  const lines: LineSpec[] = [];

  for (const t of CORE_LINES) {
    lines.push({ id: `core_${t.key}`, speaker: DEFAULT_NARRATOR, group: group.core, ...fill(t, {}) });
  }

  for (const c of ROSTER) {
    for (const evil of [false, true]) {
      const spec = evil ? c.evil : c.good;
      const fid = fighterId(c.id, evil);
      const name: Template = { key: 'name', text: `${spec.displayName}!` };
      lines.push({
        id: nameLine(fid),
        speaker: fid,
        group: group.core,
        ...(spec.sayName ? { text: name.text, say: `${spec.sayName}!` } : { text: name.text }),
      });
      for (const taunt of spec.taunts) {
        lines.push({ id: tauntLine(fid, taunt.key), speaker: fid, group: group.fighter(fid), text: taunt.text, ...(taunt.say ? { say: taunt.say } : {}) });
      }
      lines.push({ id: ultimateLine(fid), speaker: fid, group: group.fighter(fid), text: `${spec.ultimate.name}!` });
    }
  }

  for (const l of LETTERS) {
    lines.push({
      id: letterSoundLine(l.letter),
      speaker: PHONICS_SPEAKER,
      group: group.phonics,
      text: l.say,
      note: `placeholder for the /${l.letter}/ sound (${l.cls}); replace with a recorded clip`,
    });
  }
  const spellWords = new Set<string>();
  for (const c of ROSTER) for (const w of c.counter.words) spellWords.add(w);
  for (const w of WORDS) spellWords.add(w.word);
  for (const w of [...spellWords].sort()) {
    const sayName = ROSTER.find((c) => c.id === w)?.good.sayName;
    lines.push({
      id: wordLine(w),
      speaker: PHONICS_SPEAKER,
      group: group.phonics,
      // Lowercase, as she reads it on the card: the caption must match the word.
      // Names keep their capital, as they are written everywhere else.
      text: `${sayName || ROSTER.some((c) => c.id === w) ? spokenWord(w) : w}!`,
      ...(sayName ? { say: `${sayName}!` } : {}),
    });
  }

  for (const narrator of ROSTER) {
    const n = narrator.id;
    const g = group.narrator(n);
    for (const t of NARRATOR_LINES) lines.push({ id: narratorLine(n, t.key), speaker: n, group: g, ...fill(t, {}) });
    for (const hero of ROSTER) {
      if (hero.id === n) continue;
      for (const t of HERO_LINES) lines.push({ id: narratorLine(n, `${t.key}_${hero.id}`), speaker: n, group: g, ...fill(t, { hero: hero.good }) });
    }
    for (const villain of ROSTER) {
      for (const t of VILLAIN_LINES) {
        lines.push({
          id: narratorLine(n, `${t.key}_${villain.id}`),
          speaker: n,
          group: g,
          ...fill(t, { villain: villain.evil, item: villain.counter.name }),
        });
      }
    }
    for (const word of MOVE_WORDS) {
      for (const t of MOVE_LINES) lines.push({ id: narratorLine(n, `${t.key}_${word}`), speaker: n, group: g, ...fill(t, { word }) });
    }
  }

  return lines;
}

if (isMain(import.meta.url)) {
  const lines = composeLines();
  const file = path.join('content', 'voice', 'lines.json');
  await writeFile(file, `${JSON.stringify(lines, null, 1)}\n`);
  const groups = new Map<string, number>();
  for (const l of lines) groups.set(l.group, (groups.get(l.group) ?? 0) + 1);
  console.log(`voice:lines: ${lines.length} lines in ${groups.size} groups -> ${file}`);
}
