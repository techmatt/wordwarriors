/**
 * A–Z from the keyboard, only while a spelling game is open.
 *
 * The rest of the game never listens to letters (Controls leaves them alone),
 * so a stray keypress elsewhere does nothing. Tests type through
 * `typeLetter()` on the hooks object, which lands here.
 */

type Sink = (letter: string) => void;

let sink: Sink | null = null;

function onKey(e: KeyboardEvent): void {
  if (!sink || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (/^[a-zA-Z]$/.test(e.key)) {
    e.preventDefault();
    sink(e.key.toLowerCase());
  }
}

export function openTextEntry(fn: Sink): () => void {
  sink = fn;
  window.addEventListener('keydown', onKey);
  return () => {
    if (sink === fn) sink = null;
    window.removeEventListener('keydown', onKey);
  };
}

/** For tests: as if the key were typed. */
export function typeLetter(letter: string): boolean {
  if (!sink) return false;
  sink(letter.toLowerCase());
  return true;
}
