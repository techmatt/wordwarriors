/**
 * The parked Spell the Spell game's words, by villain: two warm-ups and the
 * magic word last. Short, and the ghost boxes show every letter.
 *
 * These used to be `counter.words` on the roster. Since item 015 the counter
 * item is flavour for one bag word, so a spelling triple is no part of it
 * (Matt's 017 call, item 020). The episode never uses these; compose.ts still
 * voices each word for the game.
 */
export const SPELL_WORDS: Record<string, [string, string, string]> = {
  julia: ['bed', 'hug', 'nap'],
  ellie: ['wet', 'dip', 'tub'],
  seraphina: ['cup', 'bun', 'yum'],
  dada_matt: ['bed', 'box', 'pad'],
  dada_jason: ['wet', 'rub', 'van'],
  elsa: ['sun', 'hat', 'hot'],
  anna: ['hug', 'pet', 'pal'],
  jasmine: ['map', 'zip', 'fan'],
  ozymandias: ['cup', 'tub', 'wet'],
  jormungandr: ['sun', 'pot', 'lit'],
  smaug: ['cup', 'net', 'fog'],
  tiamat: ['top', 'tip', 'hat'],
  // Not OFF (hunt 12): F F is no CVC word, and the letter-by-letter hint said its one sound twice.
  scar: ['box', 'pen', 'cub'],
  moriarty: ['map', 'pen', 'nab'],
  bavmorda: ['sun', 'pin', 'zap'],
  rilla: ['rat', 'bug', 'hen'],
  dada_matt_lifter: ['big', 'lug', 'box'],
  dada_matt_cyber: ['zip', 'bit', 'pen'],
  dada_matt_blade: ['zap', 'hit', 'pot'],
  dada_jason_warrior: ['run', 'wet', 'mop'],
  dada_jason_warlock: ['hop', 'sun', 'bus'],
};

/** The villain's triple, or a plain one for a villain with none. */
export function spellWordsFor(villainId: string): [string, string, string] {
  return SPELL_WORDS[villainId] ?? ['cat', 'dog', 'sun'];
}
