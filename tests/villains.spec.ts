/**
 * Item 115: Evil Elsa, Evil Ozymandias and Evil Moriarty joined the active villains. One
 * whole episode each by `?villain=<id>` (a drawn cast round it, so the ally, the dads and
 * the rooms vary by seed): the bad news names the villain, the house wears its mood, the
 * showdown is the villain's own style, the villain is beaten, and no line, art or scene is
 * missing on the way. Every ally × villain pair is `pairs.spec.ts` (`WW_PAIRS=+elsa`). @slow.
 */

import { test, expect } from '@playwright/test';

import { ownFight } from '../src/rules/fights';
import { SLOW, boot, collectErrors, expectNoErrors, playEpisode, press, until } from './harness';

const VILLAINS = ['elsa', 'ozymandias', 'moriarty'];

VILLAINS.forEach((villain, i) => {
  test(`Evil ${villain}: a whole episode, the bad news to the victory, nothing missing`, SLOW, async ({ page }) => {
    test.setTimeout(600_000);
    const errors = collectErrors(page, { voice: true });
    await boot(page, `?villain=${villain}&seed=${115 + i}&nojourney=1`);
    await until(page, (s) => s.scene === 'Title', 30_000, 'title');
    await page.waitForTimeout(300);
    await press(page, 'green');
    // The bad news is said before she can leave the bedroom (the bus keeps only recent lines).
    const door = await until(page, (s) => s.room?.round === 'bedroom:door', 180_000, 'the news, the quest, the door');
    expect(door.voice.history.some((id) => id.startsWith('wake_') && id.endsWith(`_bad_${villain}`)), 'the bad news names the villain').toBe(true);
    await page.screenshot({ path: `tests/screenshots/115_${villain}_bedroom.png` });
    const { end, keys } = await playEpisode(page);
    await page.screenshot({ path: `tests/screenshots/115_${villain}_victory.png` });
    expect(end.episode.villain).toBe(villain);
    expect(end.battle?.fight).toBe(ownFight(villain));
    for (const k of keys) expect(end.episode.read).toContain(k);
    expect(end.battle?.villains[0]?.hp).toBe(0);
    expectNoErrors(errors);
  });
});
