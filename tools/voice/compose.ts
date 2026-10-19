/**
 * `npm run voice:lines`: write content/voice/lines.json from the data.
 *
 * lines.json is generated, never hand-edited: the narrator templates
 * (content/voice/script.ts), the roster's names, taunts and ultimates
 * (content/battle/roster.ts, including each villain's house threat for the
 * wake-up) and the phonics tables (content/phonics/, including the sentence
 * frames' prefix lines and token words) are the source. Composing per narrator is what lets the ally really be the voice of
 * the instructions without anybody writing 12 copies of every line.
 *
 * Then `npm run voice:build` turns lines.json into audio; it is incremental, so
 * re-composing after a one-word change rebuilds one line.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { MOVE_WORDS, PERSONS, ROSTER, personOf } from '../../content/battle/roster.js';
import { ENDINGS } from '../../content/house/endings.js';
import { QUESTS, questLine } from '../../content/house/quests.js';
import type { FighterSpec } from '../../content/battle/types.js';
import { FAMILIES, sillyWord } from '../../content/phonics/families.js';
import { LETTERS, LETTER_NAMES } from '../../content/phonics/letters.js';
import { FETCH_ITEMS, allFrameTokens, allPrefixes, tokenWord } from '../../content/phonics/sentences.js';
import { SPELL_WORDS } from '../../content/phonics/spelling.js';
import { SPECIAL_WORDS, WORDS, spokenWord } from '../../content/phonics/words.js';
import {
  DEFAULT_NARRATOR,
  endingLine,
  PHONICS_SPEAKER,
  WAKERS,
  fighterId,
  group,
  letterNameLine,
  letterSoundLine,
  moveLine,
  nameLine,
  narratorLine,
  reformedLine,
  rimeLine,
  sillyLine,
  tauntLine,
  ultimateLine,
  wakeLine,
  wordLine,
} from '../../content/voice/ids.js';
import { CORE_LINES, HERO_LINES, MOVE_LINES, NARRATOR_LINES, VILLAIN_LINES, WAKE_LINES, type Template } from '../../content/voice/script.js';
import { isMain } from './clips.js';
import type { LineSpec } from './types.js';

interface Fill {
  hero?: FighterSpec;
  villain?: FighterSpec;
  helper?: FighterSpec;
  item?: string;
  itemSay?: string;
  word?: string;
  threat?: string;
  threatSay?: string;
}

/** Substitute placeholders into display text and spoken text separately. */
function fill(t: Template, f: Fill): { text: string; say?: string } {
  const show = (s: string) =>
    s
      .replace('{hero}', f.hero?.displayName ?? '')
      .replace(/\{villain\}/g, f.villain?.displayName ?? '')
      .replace('{helper}', f.helper?.displayName ?? '')
      .replace('{item}', f.item ?? '')
      .replace('{word}', f.word ?? '')
      .replace('{threat}', f.threat ?? '');
  const speak = (s: string) =>
    s
      .replace('{hero}', f.hero?.sayName ?? f.hero?.displayName ?? '')
      .replace(/\{villain\}/g, f.villain?.sayName ?? f.villain?.displayName ?? '')
      .replace('{helper}', f.helper?.sayName ?? f.helper?.displayName ?? '')
      .replace('{item}', f.itemSay ?? f.item ?? '')
      .replace('{word}', f.word ?? '')
      .replace('{threat}', f.threatSay ?? f.threat ?? '');
  const text = show(t.text);
  const needsSay =
    t.say !== undefined ||
    Boolean(f.hero?.sayName) ||
    Boolean(f.villain?.sayName) ||
    Boolean(f.helper?.sayName) ||
    Boolean(f.threatSay) ||
    Boolean(f.itemSay);
  return needsSay ? { text, say: speak(t.say ?? t.text) } : { text };
}

/**
 * How a sentence token is spoken on its own: the way it is written in a name
 * ("Evil", "Dada", "EvilRilla") with the name's sayName word for edge-tts, or
 * lower case for the little words ("is", "the", "a").
 */
function tokenForms(): Map<string, { show: string; say?: string }> {
  const forms = new Map<string, { show: string; say?: string }>();
  for (const c of ROSTER) {
    for (const f of [c.good, c.evil]) {
      const shown = f.displayName.split(/\s+/);
      // sayName has the same word count as displayName, so words pair by index.
      const said = f.sayName?.split(/\s+/);
      shown.forEach((w, i) => {
        const key = tokenWord(w);
        if (forms.has(key)) return;
        const say = said && said.length === shown.length && said[i] !== w ? said[i] : undefined;
        forms.set(key, say ? { show: w, say } : { show: w });
      });
    }
  }
  return forms;
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
      // A dad's form speaks in the dad's own voice (item 025).
      const speaker = fighterId(personOf(c.id), evil);
      const name: Template = { key: 'name', text: `${spec.displayName}!` };
      lines.push({
        id: nameLine(fid),
        speaker,
        group: group.core,
        ...(spec.sayName ? { text: name.text, say: `${spec.sayName}!` } : { text: name.text }),
      });
      for (const taunt of spec.taunts) {
        lines.push({ id: tauntLine(fid, taunt.key), speaker, group: group.fighter(fid), text: taunt.text, ...(taunt.say ? { say: taunt.say } : {}) });
      }
      lines.push({ id: ultimateLine(fid), speaker, group: group.fighter(fid), text: `${spec.ultimate.name}!` });
      // Big moves (power 2+) are called out as they fire.
      for (const ab of spec.abilities.filter((a) => a.power >= 2)) {
        lines.push({ id: moveLine(fid, ab.id), speaker, group: group.fighter(fid), text: `${ab.name}!` });
      }
    }
    // The villain good again, in the good voice, but in the villain's group:
    // only an episode with this villain says them, and it has that group loaded.
    for (const r of c.reformed) {
      lines.push({ id: reformedLine(c.id, r.key), speaker: personOf(c.id), group: group.fighter(fighterId(c.id, true)), text: r.text, ...(r.say ? { say: r.say } : {}) });
    }
  }

  // The quests' setup lines (item 025), in the owner's (person's) voice. Group
  // core: the bedroom says them, before any narrator group is sure to be loaded.
  for (const [owner, q] of Object.entries(QUESTS)) {
    lines.push({ id: questLine(owner), speaker: personOf(owner), group: group.core, text: q.text, ...(q.say ? { say: q.say } : {}) });
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
  // Letter names (item 033): the home warm-up spells its word with them.
  // Shown as the bare capital; edge-tts is given the name spelled out.
  for (const [letter, say] of Object.entries(LETTER_NAMES)) {
    lines.push({ id: letterNameLine(letter), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${letter.toUpperCase()}.`, say: `${say}.` });
  }
  // The word machine (item 026): each rime alone, said after the onset's own
  // sound and never blended with it, and each silly word a wrong tile makes.
  for (const f of FAMILIES) {
    lines.push({ id: rimeLine(f.rime), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${f.say}.`, note: `placeholder for the rime -${f.rime} said alone; replace with a recorded clip` });
    for (const s of f.silly) {
      lines.push({ id: sillyLine(sillyWord(s.letter, f.rime)), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${s.say}!` });
    }
  }
  const spellWords = new Set<string>();
  for (const triple of Object.values(SPELL_WORDS)) for (const w of triple) spellWords.add(w);
  for (const w of WORDS) spellWords.add(w.word);
  // Sentence key words: what the side rooms fetch, and each villain's counter word.
  for (const f of FETCH_ITEMS) spellWords.add(f.word);
  for (const c of ROSTER) spellWords.add(c.counter.word);
  for (const w of SPECIAL_WORDS) spellWords.add(w.word);
  // Move words: a right pick in the battle goes into the victory recap, which says it.
  for (const w of MOVE_WORDS) spellWords.add(w);
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

  // The sentence game. Prefix lines trail off before the key word, so no line
  // says the key word before she has answered; the key word is its word_ line.
  for (const p of allPrefixes()) {
    lines.push({ id: p.id, speaker: PHONICS_SPEAKER, group: group.phonics, text: p.text, ...(p.say ? { say: p.say } : {}) });
  }
  // Every other token in a sentence gets a word line, for the yellow hint.
  const forms = tokenForms();
  for (const t of allFrameTokens()) {
    if (spellWords.has(t)) continue;
    const form = forms.get(t) ?? { show: t };
    lines.push({
      id: wordLine(t),
      speaker: PHONICS_SPEAKER,
      group: group.phonics,
      text: `${form.show}!`,
      ...(form.say ? { say: `${form.say}!` } : {}),
    });
  }

  // The bedroom wake-up, in the waker's own voice. Group core: the bedroom is
  // the first thing after the title, before any narrator group is loaded.
  const wake = (key: string) => WAKE_LINES.find((t) => t.key === key)!;
  for (const waker of WAKERS) {
    const push = (key: string, t: Template, f: Fill) => lines.push({ id: wakeLine(waker, key), speaker: waker, group: group.core, ...fill(t, f) });
    push('up', wake('up'), {});
    push('door', wake('door'), {});
    push('hi', wake('hi'), {});
    // Per person: every form of a character has the same name.
    for (const c of PERSONS) {
      if (c.id === waker) continue;
      push(`good_${c.id}`, wake('good'), { hero: c.good });
      push(`helper_${c.id}`, wake('helper'), { helper: c.good });
    }
    // Per roster id: each villain form has its own threat.
    for (const v of ROSTER) {
      push(`bad_${v.id}`, wake('bad'), { villain: v.evil, threat: v.house.threat, ...(v.house.threatSay ? { threatSay: v.house.threatSay } : {}) });
    }
  }

  // Narrators are persons: a dad narrates in his own voice whatever his form.
  for (const narrator of PERSONS) {
    const n = narrator.id;
    const g = group.narrator(n);
    for (const t of NARRATOR_LINES) lines.push({ id: narratorLine(n, t.key), speaker: n, group: g, ...fill(t, {}) });
    for (const hero of PERSONS) {
      if (hero.id === n) continue;
      for (const t of HERO_LINES) lines.push({ id: narratorLine(n, `${t.key}_${hero.id}`), speaker: n, group: g, ...fill(t, { hero: hero.good }) });
    }
    for (const villain of ROSTER) {
      for (const t of VILLAIN_LINES) {
        lines.push({
          id: narratorLine(n, `${t.key}_${villain.id}`),
          speaker: n,
          group: g,
          ...fill(t, { villain: villain.evil, item: villain.counter.name, ...(villain.counter.sayName ? { itemSay: villain.counter.sayName } : {}) }),
        });
      }
    }
    for (const word of MOVE_WORDS) {
      for (const t of MOVE_LINES) lines.push({ id: narratorLine(n, `${t.key}_${word}`), speaker: n, group: g, ...fill(t, { word }) });
    }
  }

  // Victory scenes (item 027): every role line in every person's voice, since
  // anybody can host, cheer or close; a scene's fit line only in its dad's.
  for (const p of PERSONS) {
    for (const e of ENDINGS) {
      for (const key of ['open', 'cheer', 'close'] as const) {
        const l = e[key];
        lines.push({ id: endingLine(p.id, e.id, key), speaker: p.id, group: group.ending(p.id), text: l.text, ...(l.say ? { say: l.say } : {}) });
      }
    }
  }
  for (const e of ENDINGS) {
    if (!e.fit) continue;
    const dad = personOf(e.fit.form);
    lines.push({ id: endingLine(dad, e.id, 'fit'), speaker: dad, group: group.ending(dad), text: e.fit.text, ...(e.fit.say ? { say: e.fit.say } : {}) });
  }

  // Two lines under one id would silently shadow each other in the manifest.
  const seen = new Set<string>();
  const dupes = lines.filter((l) => (seen.has(l.id) ? true : (seen.add(l.id), false))).map((l) => l.id);
  if (dupes.length) throw new Error(`voice:lines: duplicate line ids: ${[...new Set(dupes)].join(', ')}`);

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
