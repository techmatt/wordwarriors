/**
 * Dad buttons (item 053): keyboard `1` = no, `2` = yes, for the games that
 * ask a grown-up to judge what she said aloud (Charge the Spell: did she say
 * the rune's sound?). They are always live, dad lock included (the lock stops
 * her presses, not his), and do nothing where no game is asking.
 *
 * A game that asks Dad calls `openDadButtons(onPress)` while it is open and
 * the closer it returns when it leaves; while it is open a small 1 ✗ / 2 ✓
 * cue sits in the canvas's bottom-right corner (the dad-lock badge has the
 * bottom-left), and `setDadAsking(true)` lights it while a question is
 * actually waiting. The cue is a DOM element like the dad-lock badge: it is
 * for him, not her, and never shows up as game text.
 *
 * Tests press the real keys (`page.keyboard.press('2')`) or call
 * `dadPress('yes')` through the hooks (`__ww.dad`).
 */

export type DadAnswer = 'yes' | 'no';

type Handler = (a: DadAnswer) => void;

let handler: Handler | null = null;
let cue: HTMLElement | null = null;
let asking = false;

/** Installed once, from main.ts. Capture phase, so the keys reach nothing else while a game asks. */
export function installDadButtons(): void {
  window.addEventListener(
    'keydown',
    (e) => {
      const a = answerFor(e.code);
      if (!a || !handler) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) dadPress(a);
    },
    true,
  );
  window.addEventListener('resize', place);
}

function answerFor(code: string): DadAnswer | null {
  if (code === 'Digit1' || code === 'Numpad1') return 'no';
  if (code === 'Digit2' || code === 'Numpad2') return 'yes';
  return null;
}

/** Dad pressed a button (the keys, or a test). Nothing happens unless a game is asking. */
export function dadPress(a: DadAnswer): void {
  if (!handler) return;
  flash(a);
  handler(a);
}

/** A game that asks Dad opens the buttons while it runs; call the closer when it leaves. */
export function openDadButtons(onPress: Handler): () => void {
  handler = onPress;
  asking = false;
  showCue();
  const mine = onPress;
  return () => {
    if (handler !== mine) return;
    handler = null;
    asking = false;
    cue?.remove();
  };
}

/** Whether the buttons are open (the hooks report it). */
export function dadButtonsOpen(): boolean {
  return handler !== null;
}

/** A question is waiting for Dad now: the cue lights up. */
export function setDadAsking(on: boolean): void {
  asking = on;
  style();
}

function showCue(): void {
  if (!cue) {
    cue = document.createElement('div');
    cue.id = 'dad-buttons';
    cue.innerHTML = '<span>DAD</span> <b>1</b> ✗ &nbsp; <b>2</b> ✓';
    Object.assign(cue.style, {
      position: 'fixed',
      zIndex: '10',
      pointerEvents: 'none',
      padding: '3px 9px',
      borderRadius: '10px',
      background: 'rgba(20, 14, 40, 0.7)',
      font: 'bold 14px "Arial Black", sans-serif',
      transition: 'opacity 150ms, border-color 150ms',
    } satisfies Partial<CSSStyleDeclaration>);
  }
  document.body.appendChild(cue);
  style();
  place();
}

function style(): void {
  if (!cue) return;
  cue.style.opacity = asking ? '1' : '0.45';
  cue.style.border = `2px solid ${asking ? '#7ad9ff' : '#888'}`;
  cue.style.color = asking ? '#ffffff' : '#cccccc';
}

/** A press shows on the cue for a moment, so Dad sees it landed. */
function flash(a: DadAnswer): void {
  if (!cue?.isConnected) return;
  cue.style.borderColor = a === 'yes' ? '#44d95a' : '#e8483f';
  window.setTimeout(style, 250);
}

/** The canvas is scaled to fit and centred: sit inside its bottom-right corner. */
function place(): void {
  if (!cue?.isConnected) return;
  const r = document.querySelector('#game canvas')?.getBoundingClientRect();
  cue.style.right = `${window.innerWidth - (r?.right ?? window.innerWidth) + 8}px`;
  cue.style.bottom = `${window.innerHeight - (r?.bottom ?? window.innerHeight) + 8}px`;
}
