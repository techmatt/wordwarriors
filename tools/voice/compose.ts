/**
 * `npm run voice:lines`: write content/voice/lines.json from the data.
 *
 * lines.json is generated, never hand-edited: the narrator templates
 * (content/voice/script.ts), the roster's names, taunts and ultimates
 * (content/battle/roster/, including each villain's house threat for the
 * wake-up) and the phonics tables (content/phonics/, including the sentence
 * frames' prefix lines and token words) are the source. Composing per narrator is what lets the ally really be the voice of
 * the instructions without anybody writing 12 copies of every line.
 *
 * Then `npm run voice:build` turns lines.json into audio; it is incremental, so
 * re-composing after a one-word change rebuilds one line.
 */

import { writeFile } from 'node:fs/promises';

import { CHARACTER_BY_ID, PERSONS, ROSTER, abilityCallout, personOf, villainName } from '../../content/battle/roster.js';
import { STORIES, storyLines } from '../../content/battle/stories/index.js';
import { ENDINGS } from '../../content/house/endings.js';
import { HOME_QUEST, QUESTS } from '../../content/house/quests.js';
import { ANY_SCENES, HUB_SCENES, hubStoryIds, type HubStory } from '../../content/house/scenes.js';
import type { FighterSpec } from '../../content/battle/types.js';
import { ALL_FAMILIES, sillyWord } from '../../content/phonics/families.js';
import { ALL_ACTIONS, BANK_BY_WORD, BANK } from '../../content/phonics/bank.js';
import { DIGRAPH_SOUNDS, LETTERS, LETTER_NAMES, LONG_VOWEL_SOUNDS, NAME_HIDES } from '../../content/phonics/letters.js';
import { FETCH_ITEMS, allFrameTokens, allPrefixes, tokenWord } from '../../content/phonics/sentences.js';
import { SPELL_WORDS } from '../../content/phonics/spelling.js';
import { WORDS, spokenWord } from '../../content/phonics/words.js';
import {
  DEFAULT_NARRATOR,
  coreLine,
  endingLine,
  PHONICS_SPEAKER,
  WAKERS,
  fighterId,
  group,
  heroKey,
  homeQuestLine,
  letterNameLine,
  nameHidesLine,
  letterSoundLine,
  moveKey,
  moveLine,
  nameLine,
  narratorLine,
  questLine,
  reformedLine,
  storyLine,
  rimeLine,
  sillyLine,
  tauntLine,
  ultimateLine,
  villainKey,
  wakeCastKey,
  wakeLine,
  wordLine,
  type SpokenLine,
} from '../../content/voice/ids.js';
import { CORE_LINES, HERO_LINES, MOVE_LINES, NARRATOR_LINES, VILLAIN_LINES, WAKE_VARIANTS, wakeTemplate, wakeVariant, type Template } from '../../content/voice/script.js';
import { isMain, LINES_FILE } from '../shared.js';
import type { LineSpec } from './types.js';

/** What a name placeholder reads: shown and, where edge-tts needs it, spoken. */
type Named = Pick<FighterSpec, 'displayName' | 'sayName'>;

interface Fill {
  hero?: Named;
  villain?: Named;
  helper?: Named;
  item?: string;
  itemSay?: string;
  word?: string;
  threat?: string;
  threatSay?: string;
}

/** A content line's words as a line spec carries them (`say` only when it has one). */
const spoken = (l: SpokenLine): SpokenLine => ({ text: l.text, ...(l.say ? { say: l.say } : {}) });

/** Substitute placeholders into display text and spoken text separately. */
function fill(t: Template, f: Fill): { text: string; say?: string } {
  const show = (s: string) =>
    s
      .replaceAll('{hero}', f.hero?.displayName ?? '')
      .replaceAll('{villain}', f.villain?.displayName ?? '')
      .replaceAll('{helper}', f.helper?.displayName ?? '')
      .replaceAll('{item}', f.item ?? '')
      .replaceAll('{word}', f.word ?? '')
      .replaceAll('{threat}', f.threat ?? '');
  const speak = (s: string) =>
    s
      .replaceAll('{hero}', f.hero?.sayName ?? f.hero?.displayName ?? '')
      .replaceAll('{villain}', f.villain?.sayName ?? f.villain?.displayName ?? '')
      .replaceAll('{helper}', f.helper?.sayName ?? f.helper?.displayName ?? '')
      .replaceAll('{item}', f.itemSay ?? f.item ?? '')
      .replaceAll('{word}', f.word ?? '')
      .replaceAll('{threat}', f.threatSay ?? f.threat ?? '');
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
 * ("Dada", "Matt", "Jormungandr") with the name's sayName word for edge-tts, or
 * lower case for the little words ("is", "the", "a").
 */
function tokenForms(): Map<string, { show: string; say?: string }> {
  const forms = new Map<string, { show: string; say?: string }>();
  for (const c of ROSTER) {
    for (const f of [c.good, c.evil, villainName(c)]) {
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
    lines.push({ id: coreLine(t.key), speaker: DEFAULT_NARRATOR, group: group.core, ...fill(t, {}) });
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
        lines.push({ id: tauntLine(fid, taunt.key), speaker, group: group.fighter(fid), ...spoken(taunt) });
      }
      lines.push({ id: ultimateLine(fid), speaker, group: group.fighter(fid), text: `${spec.ultimate.name}!` });
      // Big moves (power 2+) are called out as they fire.
      for (const ab of spec.abilities.filter((a) => a.power >= 2)) {
        lines.push({ id: moveLine(fid, ab.id), speaker, group: group.fighter(fid), text: abilityCallout(ab) });
      }
    }
    // The villain good again, in the good voice, but in the villain's group:
    // only an episode with this villain says them, and it has that group loaded.
    for (const r of [...c.reformed.sorry, ...c.reformed.ending]) {
      lines.push({ id: reformedLine(c.id, r.key), speaker: personOf(c.id), group: group.fighter(fighterId(c.id, true)), ...spoken(r) });
    }
  }

  // The quests' setup lines (item 025; a few each since 037), in the owner's
  // (person's) voice. Group core: the bedroom says them, before any narrator
  // group is sure to be loaded.
  for (const [owner, q] of Object.entries(QUESTS)) {
    q.lines.forEach((l, i) => lines.push({ id: questLine(owner, i + 1), speaker: personOf(owner), group: group.core, ...spoken(l) }));
  }

  // The hub scenes (item 037): each helper's (form's) lines in its person's
  // voice, in that person's narrator group: whenever it helps, it narrates.
  const pushScene = (ids: ReturnType<typeof hubStoryIds>, s: HubStory, speaker: string) => {
    const said = [...s.lines.map((l, i) => [ids.lines[i]!, l] as const), [ids.circle, s.circle] as const, [ids.done, s.done] as const];
    for (const [id, l] of said) lines.push({ id, speaker, group: group.narrator(speaker), ...spoken(l) });
  };
  for (const [owner, scenes] of Object.entries(HUB_SCENES)) {
    const person = personOf(owner);
    scenes.forEach((s, i) => pushScene(hubStoryIds(owner, person, i + 1, s), s, person));
  }

  // Letter sounds, then the digraphs' (item 037: SH CH TH CK, one sound unit each, `letter_sh_sound`),
  // then the long vowels' (item 048: KEY, YOYO, `letter_long_e_sound`).
  for (const l of [...LETTERS, ...DIGRAPH_SOUNDS, ...LONG_VOWEL_SOUNDS]) {
    lines.push({
      id: letterSoundLine(l.letter),
      speaker: PHONICS_SPEAKER,
      group: group.phonics,
      text: l.say,
      // Item 085: a carrier word, cut to its vowel by the build (tools/voice/carrier.ts).
      ...(l.carrier ? { say: `${l.carrier.say}.`, cut: { keepDb: l.carrier.keepDb } } : {}),
      note: `placeholder for the /${l.letter}/ sound (${l.cls}); replace with a recorded clip`,
    });
  }
  // Letter names (item 033): the home warm-up spells its word with them.
  // Shown as the bare capital; edge-tts is given the name spelled out.
  for (const [letter, say] of Object.entries(LETTER_NAMES)) {
    lines.push({ id: letterNameLine(letter), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${letter.toUpperCase()}.`, say: `${say}.` });
  }
  // The sound hidden in the name (item 096): the bridge from a letter's name to its sound, said before the sound line.
  for (const [letter, where] of Object.entries(NAME_HIDES)) {
    const name = LETTER_NAMES[letter]!;
    const how = where === 'start' ? 'Keep just the start:' : 'Squeeze off the front:';
    lines.push({ id: nameHidesLine(letter), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${letter.toUpperCase()}'s name is ${name}... ${how}`, say: `${letter.toUpperCase()}'s name is ${name}... ${how.replace(':', '...')}` });
  }
  // The word machine (item 026): each rime alone, said after the onset's own
  // sound and never blended with it, and each silly word a wrong tile makes.
  // Stored words' families too (item 127): bringing a word back needs no synthesis.
  for (const f of ALL_FAMILIES) {
    lines.push({ id: rimeLine(f.rime), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${f.say}.`, note: `placeholder for the rime -${f.rime} said alone; replace with a recorded clip` });
    for (const s of f.silly) {
      lines.push({ id: sillyLine(sillyWord(s.letter, f.rime)), speaker: PHONICS_SPEAKER, group: group.phonics, text: `${s.say}!` });
    }
  }
  const wordLineWords = new Set<string>();
  for (const triple of Object.values(SPELL_WORDS)) for (const w of triple) wordLineWords.add(w);
  for (const w of WORDS) wordLineWords.add(w.word);
  // Sentence key words: what the side rooms fetch, and each villain's counter word.
  for (const f of FETCH_ITEMS) wordLineWords.add(f.word);
  for (const c of ROSTER) wordLineWords.add(c.counter.word);
  // Every bank word (item 037): pictures, move pads and gift words alike (a
  // right move pick goes into the victory recap, which says it).
  for (const w of BANK) wordLineWords.add(w.word);
  for (const w of [...wordLineWords].sort()) {
    // A name's sayName, or the bank's respelling where edge-tts misreads a word.
    const named = CHARACTER_BY_ID[w];
    const sayName = named?.good.sayName ?? BANK_BY_WORD[w]?.say;
    lines.push({
      id: wordLine(w),
      speaker: PHONICS_SPEAKER,
      group: group.phonics,
      // Lowercase, as she reads it on the card: the caption must match the word.
      // Names keep their capital, as they are written everywhere else.
      text: `${named ? spokenWord(w) : w}!`,
      ...(sayName ? { say: `${sayName}!` } : {}),
    });
  }

  // The sentence game. Prefix lines trail off before the key word, so no line
  // says the key word before she has answered; the key word is its word_ line.
  for (const p of allPrefixes()) {
    lines.push({ id: p.id, speaker: PHONICS_SPEAKER, group: group.phonics, ...spoken(p) });
  }
  // Every other token in a sentence gets a word line, for the yellow hint.
  const forms = tokenForms();
  for (const t of allFrameTokens()) {
    if (wordLineWords.has(t)) continue;
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
  const wake = (key: string) => wakeTemplate(key)!;
  for (const waker of WAKERS) {
    const push = (key: string, t: Template, f: Fill) => lines.push({ id: wakeLine(waker, key), speaker: waker, group: group.core, ...fill(t, f) });
    // Three variants of each (item 040): `up`, `up_2`, `up_3`; `good_<hero>`, `good_<hero>_2`...
    for (let n = 1; n <= WAKE_VARIANTS; n++) {
      push(wakeVariant('up', n), wake(wakeVariant('up', n)), {});
      push(wakeVariant('door', n), wake(wakeVariant('door', n)), {});
    }
    push('hi', wake('hi'), {});
    // Per person: every form of a character has the same name.
    for (const c of PERSONS) {
      if (c.id === waker) continue;
      for (let n = 1; n <= WAKE_VARIANTS; n++) push(wakeVariant(wakeCastKey('good', c.id), n), wake(wakeVariant('good', n)), { hero: c.good });
      push(wakeCastKey('helper', c.id), wake('helper'), { helper: c.good });
    }
    // Per roster id: each villain form has its own threat.
    for (const v of ROSTER) {
      push(wakeCastKey('bad', v.id), wake('bad'), { villain: v.evil, threat: v.house.threat, ...(v.house.threatSay ? { threatSay: v.house.threatSay } : {}) });
    }
  }

  // Narrators are persons: a dad narrates in his own voice whatever his form.
  for (const narrator of PERSONS) {
    const n = narrator.id;
    const g = group.narrator(n);
    for (const t of NARRATOR_LINES) lines.push({ id: narratorLine(n, t.key), speaker: n, group: g, ...fill(t, {}) });
    for (const hero of PERSONS) {
      if (hero.id === n) continue;
      for (const t of HERO_LINES) lines.push({ id: narratorLine(n, heroKey(t.key, hero.id)), speaker: n, group: g, ...fill(t, { hero: hero.good }) });
    }
    for (const villain of ROSTER) {
      for (const t of VILLAIN_LINES) {
        // The bare name (item 038) once the villain is known; "Evil" only where it announces them.
        lines.push({
          id: narratorLine(n, villainKey(t.key, villain.id)),
          speaker: n,
          group: g,
          ...fill(t, { villain: t.key === 'alarm_villain' ? villain.evil : villainName(villain), item: villain.counter.name, ...(villain.counter.sayName ? { itemSay: villain.counter.sayName } : {}) }),
        });
      }
    }
    // Stored actions too (item 127): bringing one back needs no synthesis.
    for (const word of ALL_ACTIONS.map((w) => w.word)) {
      for (const t of MOVE_LINES) lines.push({ id: narratorLine(n, moveKey(t.key, word)), speaker: n, group: g, ...fill(t, { word }) });
    }
    // For a helper with no quest place or no hub scene of their own: the
    // home quest's lines and the fallback scene, in every narrator's voice.
    HOME_QUEST.lines.forEach((l, i) => lines.push({ id: homeQuestLine(n, i + 1), speaker: n, group: g, ...spoken(l) }));
    ANY_SCENES.forEach((s, i) => pushScene(hubStoryIds(null, n, i + 1, s), s, n));
  }

  // Story fights (item 107): the villain's lines in his evil voice; Dad's and the
  // ally's in every person's, since whoever plays them says them. Groups of their
  // own, so only a story fight loads them, and only for the people in it.
  for (const story of STORIES) {
    const vid = fighterId(personOf(story.villain), true);
    for (const l of storyLines(story)) {
      if (l.who === 'villain') lines.push({ id: storyLine(story.id, l.key), speaker: vid, group: group.story(story.id), ...spoken(l) });
      else for (const p of PERSONS) lines.push({ id: storyLine(story.id, l.key, p.id), speaker: p.id, group: group.story(story.id, p.id), ...spoken(l) });
    }
  }

  // Victory scenes (item 027): every role line in every person's voice, since
  // anybody can host, cheer or close; a scene's fit line only in its dad's.
  for (const p of PERSONS) {
    for (const e of ENDINGS) {
      for (const key of ['open', 'cheer', 'close'] as const) {
        const l = e[key];
        lines.push({ id: endingLine(p.id, e.id, key), speaker: p.id, group: group.ending(p.id), ...spoken(l) });
      }
    }
  }
  for (const e of ENDINGS) {
    if (!e.fit) continue;
    const dad = personOf(e.fit.form);
    lines.push({ id: endingLine(dad, e.id, 'fit'), speaker: dad, group: group.ending(dad), ...spoken(e.fit) });
  }

  // Two lines under one id would silently shadow each other in the manifest.
  const seen = new Set<string>();
  const dupes = lines.filter((l) => (seen.has(l.id) ? true : (seen.add(l.id), false))).map((l) => l.id);
  if (dupes.length) throw new Error(`voice:lines: duplicate line ids: ${[...new Set(dupes)].join(', ')}`);

  return lines;
}

if (isMain(import.meta.url)) {
  const lines = composeLines();
  const file = LINES_FILE;
  // One line per object (item 047): ~10k lines rather than ~60k, a change is one diff line.
  await writeFile(file, `[\n${lines.map((l) => JSON.stringify(l)).join(',\n')}\n]\n`);
  const groups = new Map<string, number>();
  for (const l of lines) groups.set(l.group, (groups.get(l.group) ?? 0) + 1);
  console.log(`voice:lines: ${lines.length} lines in ${groups.size} groups -> ${file}`);
}
