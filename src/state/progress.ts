/** The one ProgressStore the game uses. Tests reach it through the hooks object. */
import { ProgressStore, STORE_KEY } from './ProgressStore';

export const progress = new ProgressStore();

// Item 144 (M72): another tab writing the store (or clearing site data, key null) is re-read here, so a stale tab
// no longer writes back over the episodes played in the other. The event never fires in the tab that wrote.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY || e.key === null) progress.reload();
  });
}
