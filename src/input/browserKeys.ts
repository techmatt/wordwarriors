/**
 * The browser's own keys, kept from the page: two window listeners that
 * prevent a key's default and nothing else. main.ts installs them after the
 * debug key, so the order of the capture-phase listeners is dad lock's, Dad's
 * buttons', the debug key's, then these.
 */

import Phaser from 'phaser';

/**
 * The browser's own keys a child mashing the keyboard finds, before any scene's Controls exist (Boot, Wait)
 * as well as after (hunt 11): F1's help, F3's find bar, F6's address bar, F7's caret-browsing prompt, F10
 * and the menu key took the page's focus or opened a window over the game; Firefox's / and ' quick find too.
 * Only keys the game never reads: Phaser drops a key event whose default is already prevented, so the dev
 * keys (F2, F4, F8, F9) and the buttons are left to Controls, which prevents theirs itself. F5, F11 and F12
 * stay the browser's.
 */
const BROWSER_ONLY = new Set(['F1', 'F3', 'F6', 'F7', 'F10', 'ContextMenu', '/', "'"]);

export function installBrowserKeys(game: Phaser.Game): void {
  window.addEventListener('keydown', (e) => {
    if (BROWSER_ONLY.has(e.key)) e.preventDefault();
  }, { capture: true });
  // Tab is yellow, never the browser's focus move: in scenes with no Controls (Boot, Wait) it took focus off
  // the page and the keyboard went dead until a click (item 069). Prevented after Phaser has seen it, in the
  // bubble phase once the game is up (hunt 11: in the capture phase, as it was, Phaser dropped every Tab and
  // the keyboard's yellow did nothing anywhere).
  game.events.once(Phaser.Core.Events.READY, () => {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') e.preventDefault();
    });
  });
}
