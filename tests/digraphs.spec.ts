/**
 * Item 085: a multi-letter sound unit is said once, as its one sound. The
 * entry hall's level-1 clue (a new player's, the default) named every letter
 * before each unit's sound, so KING came out "...en, gee, ng": the NG's
 * letters, then the NG. Now a single letter is named and sounded, a
 * multi-letter unit only sounded: "kay, kuh, eye, ih, ng". The rule over
 * every bank word is tests/unit/soundOut.test.ts; this plays it in the hall
 * (`?grab=` picks its word) from the voice log.
 */

import { test, expect } from '@playwright/test';
import { BANK_BY_WORD } from '../content/phonics/bank';
import { boot, collectErrors, expectNoErrors, until } from './harness';
import { wordLine } from '../content/voice/ids';

// KING ends in NG; SHELL starts with SH and ends in a doubled LL (L's one sound).
const WORDS: Record<string, { said: string[]; never: string[] }> = {
  king: {
    // The sounds alone, never a letter's name (item 137).
    said: ['letter_k_sound', 'letter_i_sound', 'letter_ng_sound'],
    never: ['letter_k_hides', 'letter_k_name', 'letter_i_name', 'letter_n_sound', 'letter_g_sound'],
  },
  shell: {
    said: ['letter_sh_sound', 'letter_e_sound', 'letter_l_sound'],
    never: ['letter_e_name', 'letter_s_sound', 'letter_h_sound', 'letter_l_name'],
  },
};

for (const [word, { said, never }] of Object.entries(WORDS)) {
  test(`entry hall clue: ${word.toUpperCase()}'s ${BANK_BY_WORD[word]!.units.filter((u) => u.length > 1).join(' and ').toUpperCase()} said once, as one sound, never as its letters`, async ({ page }) => {
    const errors = collectErrors(page);
    await boot(page, `?scene=grab&nojourney=1&grab=${word}`);
    const s = await until(page, (st) => st.scene === 'Entry' && st.room?.round === 'entry:find' && !st.room.locked, 60_000, 'clue given');
    expect(s.room!.grab!.word).toBe(word);
    expect(s.room!.grab!.level).toBe(1);
    const letters = s.voice.history.filter((id) => id.startsWith('letter_'));
    expect(letters).toEqual(said);
    for (const id of never) expect(letters).not.toContain(id);
    // Each unit's sound exactly once.
    for (const id of said.filter((x) => x.endsWith('_sound'))) expect(letters.filter((x) => x === id)).toHaveLength(1);
    expect(s.voice.history).not.toContain(wordLine(word));
    expectNoErrors(errors);
  });
}
