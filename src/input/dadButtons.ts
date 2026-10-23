/**
 * Dad buttons (item 053): keyboard `1` = no, `2` = yes, for the games that
 * ask a grown-up to judge what she said aloud (Charge the Spell: did she read
 * the word? the Stretchy Bridge from help level 2: hint / pictures; THE END:
 * 2 starts the next episode). They are always live, dad lock included (the lock stops
 * her presses, not his), and do nothing where no game is asking.
 *
 * A game that asks Dad calls `openDadButtons(onPress)` while it is open and
 * the closer it returns when it leaves (item 082, moved to THE END after the victory recap in item 085: it opens them
 * too, its 2 the only way on to a new episode, with its own cue label); while it is open a small 1 ✗ / 2 ✓
 * cue sits in the canvas's bottom-right corner (the dad-lock badge has the
 * bottom-left), and `setDadAsking(true)` lights it while a question is
 * actually waiting. The cue is a DOM element like the dad-lock badge: it is
 * for him, not her, and never shows up as game text.
 *
 * Tests press the real keys (`page.keyboard.press('2')`) or call
 * `dadPress('yes')` through the hooks (`__ww.dad`).
 */

import { FONT_HEAVY } from '../config';
import { CornerTag } from '../ui/cornerTag';

export type DadAnswer = 'yes' | 'no';

type Handler = (a: DadAnswer) => void;

let handler: Handler | null = null;
const cue = new CornerTag('dad-buttons', 'bottom-right', {
  padding: '3px 9px',
  borderRadius: '10px',
  background: 'rgba(20, 14, 40, 0.7)',
  font: `bold 14px ${FONT_HEAVY}`,
  transition: 'opacity 150ms, border-color 150ms',
});
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
export function openDadButtons(onPress: Handler, label = JUDGE_CUE): () => void {
  handler = onPress;
  asking = false;
  showCue(label);
  const mine = onPress;
  return () => {
    if (handler !== mine) return;
    handler = null;
    asking = false;
    cue.hide();
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

/**
 * The cue for a yes / no question; a game asking something else gives its own (THE END's "press 2").
 * No DAD on it (item 126): DAD is a bank word, and the cue shows in rooms before she may read it.
 */
const JUDGE_CUE = '<b>1</b> ✗ &nbsp; <b>2</b> ✓';

function showCue(label: string): void {
  cue.element.innerHTML = label;
  cue.show();
  style();
}

function style(): void {
  if (!cue.made) return;
  const s = cue.element.style;
  s.opacity = asking ? '1' : '0.45';
  s.border = `2px solid ${asking ? '#7ad9ff' : '#888'}`;
  s.color = asking ? '#ffffff' : '#cccccc';
}

/** A press shows on the cue for a moment, so Dad sees it landed. */
function flash(a: DadAnswer): void {
  if (!cue.shown) return;
  cue.element.style.borderColor = a === 'yes' ? '#44d95a' : '#e8483f';
  window.setTimeout(style, 250);
}
