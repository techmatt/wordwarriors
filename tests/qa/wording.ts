/**
 * The bug-hunt checker's checks for Matt's categories (item 059; the list is
 * "Categories to hunt (Matt)" at the top of docs/qa-findings.md): spelling
 * that is not American, a picture's word printed beside it (a giveaway),
 * clipped lines, and slow rooms. Pure functions over what the probe reports,
 * like `checks.ts`. A picture a four-year-old would not know, and a phrase
 * that feels odd in its moment, stay a human look (contact sheet, review).
 */

import type { Issue, Layout, Since } from './checks';

/**
 * British spellings (and British words) the game must not show or say: Matt
 * found PRACTISE (item 059). Whole words, any case; each with its American form.
 */
export const BRITISH: Record<string, string> = {
  practise: 'practice', practised: 'practiced', practising: 'practicing',
  colour: 'color', colours: 'colors', coloured: 'colored', colourful: 'colorful',
  favourite: 'favorite', favourites: 'favorites', honour: 'honor', neighbour: 'neighbor',
  armour: 'armor', armoury: 'armory', behaviour: 'behavior', flavour: 'flavor', humour: 'humor',
  harbour: 'harbor', rumour: 'rumor', vapour: 'vapor', splendour: 'splendor', labour: 'labor',
  grey: 'gray', centre: 'center', metre: 'meter', theatre: 'theater', litre: 'liter',
  realise: 'realize', organise: 'organize', recognise: 'recognize', apologise: 'apologize',
  travelled: 'traveled', travelling: 'traveling', cancelled: 'canceled', jewellery: 'jewelry',
  cosy: 'cozy', pyjamas: 'pajamas', tyre: 'tire', mum: 'mom', mummy: 'mommy', maths: 'math',
  aeroplane: 'airplane', programme: 'program', defence: 'defense', offence: 'offense',
  jelly: 'Jell-O (the wobbly dessert)', catalogue: 'catalog', moustache: 'mustache', plough: 'plow', sceptre: 'scepter',
};

const BRITISH_RE = new RegExp(`\\b(${Object.keys(BRITISH).join('|')})\\b`, 'gi');

/** The British spellings in `text`, as `found → American`. */
export function britishIn(text: string): string[] {
  return [...text.matchAll(BRITISH_RE)].map((m) => `${m[0]} → ${BRITISH[m[0].toLowerCase()]}`);
}

/** British spelling on screen or in a line said. */
export function spellingIssues(l: Layout, voice: Since['voice'], scene: string): Issue[] {
  const out: Issue[] = [];
  for (const t of l.texts) {
    for (const b of britishIn(t.text)) out.push({ kind: 'not-american', severity: 'bug', scene, detail: `on screen: "${t.text.slice(0, 40)}" (${b})`, key: `brit:text:${b}` });
  }
  for (const v of voice) {
    for (const b of britishIn(v.text)) out.push({ kind: 'not-american', severity: 'bug', scene: v.scene, detail: `${v.id}: "${v.text.slice(0, 60)}" (${b})`, key: `brit:voice:${v.id}` });
  }
  return out;
}

/**
 * A picture with its own word printed beside it (item 059: the entry hall's
 * VAN): she matches the letters instead of reading or sounding it out. A
 * `pic_<word>` image and a text reading WORD within GIVEAWAY_PX of it.
 */
export const GIVEAWAY_PX = 140;

export function giveawayIssues(l: Layout, scene: string, read: readonly string[] = []): Issue[] {
  const out: Issue[] = [];
  // The victory recap and the parent page show words with pictures on purpose: she has read them.
  if (scene === 'Victory' || scene === 'Parent') return out;
  for (const im of l.images) {
    if (!im.key.startsWith('pic_')) continue;
    const word = im.key.slice(4).toUpperCase();
    // A word she has read this episode (a fetched thing used in battle: THE ANT!) gives nothing away (item 069).
    if (read.some((r) => r.toUpperCase() === word)) continue;
    const near = l.texts.find((t) => t.text.replace(/[^A-Z ]/gi, ' ').toUpperCase().split(/\s+/).includes(word) && gap(im.b, t.b) <= GIVEAWAY_PX);
    if (near) out.push({ kind: 'giveaway', severity: 'bug', scene, detail: `${word} printed beside its picture ("${near.text.slice(0, 30)}")`, key: `giveaway:${scene}:${word}` });
  }
  return out;
}

/** The distance between two boxes (0 when they touch or overlap). */
function gap(a: [number, number, number, number], b: [number, number, number, number]): number {
  const dx = Math.max(0, b[0] - a[2], a[0] - b[2]);
  const dy = Math.max(0, b[1] - a[3], a[1] - b[3]);
  return Math.hypot(dx, dy);
}

/**
 * Short exclamations a person really says: not clipped. Anything else of
 * three words or fewer, with no pronoun or verb to make it a sentence, is a
 * look (item 059: TOO STRONG, LET GO).
 */
const WHOLE = /^(yes|no|wow|bad news|good news|oh no|uh oh|hooray|yay|well done|got it|good job|great job|thank you|thanks|ready|go|let'?s go|hello|hi|bye|goodbye|ha+|oops|whoa|yum|look|listen|come on|watch out|you did it|we did it|again|nice|cool|perfect|amazing|brilliant|super|super duper|ta-?da|sorry|please|kiddo|sleepyhead|oopsie|shh|whe+|beep|boop|beep boop|guess what|good morning|wake up|rise and shine|great reading|welcome|all aboard|ready,? set,? (go|launch)|nice fixing|splash,? splash|row,? row,? row)$/i;
const SENTENCE_WORD = /\b(i|you|we|he|she|it|they|me|us|them|is|are|am|was|were|be|let'?s|can|will|do|does|did|have|has|had|i'?m|you'?re|we'?re|it'?s|that'?s|there'?s|here'?s|what'?s|look|find|get|go|come|say|read|help|try|walk|press|stand|see|grab|use|pick|now'?s|doesn'?t|don'?t|didn'?t|isn'?t|can'?t|won'?t)\b/i;

/** A clipped line: a sentence of a few words that is no sentence (no pronoun, no verb) and no everyday exclamation. */
export function clippedIn(text: string): string | null {
  // A prefix line runs on into a word line ("That wasn't...", "We need the..."): not a sentence of its own.
  if (/(\.\.\.|,)\s*$/.test(text.trim())) return null;
  const sentences = text.split(/(?<=[.!?])\s+/);
  // A single word said alone is a word line (the gift word, a move's name).
  if (sentences.length === 1 && !/\s/.test(text.trim())) return null;
  for (const raw of sentences) {
    const s = raw.replace(/[.!?…]+$/g, '').trim();
    // "Gold coins for everybody!" (item 080, M18): a thing for everybody with no verb, however long.
    const head = s.split(/,\s*/)[0]!;
    if (/ for everybody$/i.test(head) && !SENTENCE_WORD.test(head)) return raw.trim();
    const words = s.split(/[\s,]+/).filter(Boolean);
    if (words.length === 0 || words.length > 5 || WHOLE.test(s)) continue;
    // Each comma part on its own: "Too strong, let go" is two clipped halves. A
    // lone capitalized word is someone named ("Bad news, Julia").
    // "Look, a secret door!" points at something: whole (item 080).
    if (/^look,/i.test(s)) continue;
    const parts = s.split(/,\s*/).filter((p) => !WHOLE.test(p) && !/^[A-Z][a-z]+$/.test(p) && !/^(Dada|Evil) [A-Z][a-z]+$/.test(p));
    if (parts.some((p) => p.split(/\s+/).length <= 3 && !SENTENCE_WORD.test(p))) return raw.trim();
  }
  return null;
}

export function clippedIssues(voice: Since['voice']): Issue[] {
  const out: Issue[] = [];
  for (const v of voice) {
    // Battle shouts (a taunt, a move's or an ultimate's name) are shouts, not talk to her; so is a
    // story fight's back-and-forth ("Gold guards! Get them!", read through in hunt 7).
    if (/^(letter|word|taunt|move|ult|name|story)_/.test(v.id) || v.noLine) continue;
    const c = clippedIn(v.text);
    if (c) out.push({ kind: 'clipped-line', severity: 'look', scene: v.scene, detail: `${v.id}: "${c}" in "${v.text.slice(0, 60)}"`, key: `clipped:${v.id}` });
  }
  return out;
}

/**
 * Pacing (item 059: Charge the Spell frustrated her): a side room or the
 * warm-up that runs past its budget, in game time (the checker's real time
 * times its speed-up). The budgets are what an impatient four-year-old sits
 * through with Dad answering at once: Charge the Spell about 20 s.
 */
export const ROOM_BUDGET_MS: Record<string, number> = { ChargeRoom: 30_000, Entry: 45_000, SentenceRoom: 60_000, BridgeRoom: 75_000, ShifterRoom: 90_000, WordMachine: 75_000 };

/**
 * A Charge visit solo from its start (hunt 8, M38 (c), Matt's call): she says each sound along with
 * the helper rather than waiting on Dad, so its budget is longer.
 */
export const SOLO_CHARGE_BUDGET_MS = 35_000;

export function pacingIssues(visits: { scene: string; ms: number; wrong: boolean; solo?: boolean }[]): Issue[] {
  const out: Issue[] = [];
  for (const v of visits) {
    const budget = v.scene === 'ChargeRoom' && v.solo ? SOLO_CHARGE_BUDGET_MS : ROOM_BUDGET_MS[v.scene];
    // A scenario answering wrong on purpose is slower by design.
    if (!budget || v.wrong || v.ms <= budget) continue;
    out.push({ kind: 'slow-room', severity: 'look', scene: v.scene, detail: `${(v.ms / 1000).toFixed(1)} s against a ${(budget / 1000).toFixed(0)} s budget`, key: `slow:${v.scene}` });
  }
  return out;
}

/**
 * Lines said more than twice in a run (item 087: "Great reading, your word made
 * it extra strong" every move). Exempt: what must repeat, the letter sounds and
 * words (`letter_`, `word_`, `rime_`, `silly_`), the sentence prefixes, and the
 * move choice's own lines (`use_move`, `not_move`, `was_move`, `find_move`). A
 * run of several episodes counts them all together.
 */
export function repeatedLines(ids: readonly string[]): Record<string, number> {
  const n = new Map<string, number>();
  for (const id of ids) {
    if (/^(letter|word|rime|silly|sent)_/.test(id) || /_(use_move|not_move|was_move|find_move)_/.test(id)) continue;
    n.set(id, (n.get(id) ?? 0) + 1);
  }
  return Object.fromEntries([...n].filter(([, c]) => c > 2).sort((a, b) => b[1] - a[1]));
}

/**
 * Line variants said in turn (item 087, `src/episode/lineVariants.ts`; item
 * 089's check): a narrator line with variants (`right`, `right_2`...) takes the
 * next each time, across episodes, so between two sayings of one variant every
 * other variant of its line is said. `variant-repeat` when one comes back
 * sooner (a look: a variant picked while the voice bus dropped it shows as a
 * gap). `bases` maps each narrator key with variants to its variant keys.
 * `again`: a run of one variant counts once (item 092: an idle child's re-prompts
 * say again the variant she heard, by design since item 089's fix 84).
 */
export function variantIssues(ids: readonly string[], bases: Record<string, readonly string[]>, again = false): Issue[] {
  // Longest keys first, so `right_2` is not read as `right` said by narrator `..._right`.
  const keys = Object.entries(bases).flatMap(([base, vs]) => vs.map((v) => [v, base] as const)).sort((a, b) => b[0].length - a[0].length);
  const said = new Map<string, string[]>();
  for (const id of ids) {
    if (!id.startsWith('nar_')) continue;
    const hit = keys.find(([v]) => id.endsWith(`_${v}`));
    if (hit && !(again && said.get(hit[1])?.at(-1) === hit[0])) said.set(hit[1], [...(said.get(hit[1]) ?? []), hit[0]]);
  }
  const out: Issue[] = [];
  for (const [base, seq] of said) {
    const n = bases[base]!.length;
    for (let i = 0; i < seq.length; i++) {
      const last = seq.lastIndexOf(seq[i]!, i - 1);
      if (i === 0 || last < 0) continue;
      const between = new Set(seq.slice(last + 1, i));
      if (between.size < n - 1) {
        out.push({ kind: 'variant-repeat', severity: 'look', scene: '', detail: `${base}: ${seq[i]} again after ${[...between].join(', ') || 'nothing'} (${n} variants; said ${seq.join(' ')})`, key: `variant:${base}` });
        break;
      }
    }
  }
  return out;
}

/**
 * Taunts (item 087): none more than `max` times an episode (`pickTaunt`).
 * `episodes` is the transcript cut at each episode's end.
 */
export function tauntIssues(episodes: readonly (readonly string[])[], max = 2): Issue[] {
  const out: Issue[] = [];
  episodes.forEach((ids, e) => {
    const n = new Map<string, number>();
    for (const id of ids) if (id.startsWith('taunt_')) n.set(id, (n.get(id) ?? 0) + 1);
    for (const [id, c] of n) if (c > max) out.push({ kind: 'taunt-over-cap', severity: 'bug', scene: 'Battle', detail: `${id} said ${c} times in episode ${e + 1} (cap ${max})`, key: `taunt:${id}:${e}` });
  });
  return out;
}
