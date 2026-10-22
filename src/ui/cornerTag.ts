/**
 * A small DOM tag over one corner of the canvas (item 088): the dad-lock
 * badge (bottom-left), Dad's 1 / 2 cue (bottom-right) and the DEBUG tag
 * (top-left). DOM, not game text: they are for the grown-ups, survive scene
 * changes, and never show up in the game's text.
 */

export type Corner = 'top-left' | 'bottom-left' | 'bottom-right';

/** How far a tag sits inside the canvas's corner, in CSS px. */
const INSET = 8;

const tags = new Set<CornerTag>();
let listening = false;

export class CornerTag {
  private el: HTMLElement | null = null;

  constructor(
    private readonly id: string,
    private readonly corner: Corner,
    private readonly look: Partial<CSSStyleDeclaration>,
    private readonly text?: string,
  ) {}

  /** The element, made the first time it is asked for (never on import: no DOM is touched until then). */
  get element(): HTMLElement {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = this.id;
      if (this.text !== undefined) this.el.textContent = this.text;
      Object.assign(this.el.style, { position: 'fixed', zIndex: '10', pointerEvents: 'none', ...this.look } satisfies Partial<CSSStyleDeclaration>);
    }
    return this.el;
  }

  /** Whether `element` has been made yet. */
  get made(): boolean {
    return this.el !== null;
  }

  get shown(): boolean {
    return this.el?.isConnected ?? false;
  }

  show(): void {
    document.body.appendChild(this.element);
    tags.add(this);
    listen();
    this.place();
  }

  hide(): void {
    this.el?.remove();
  }

  /** The canvas is scaled to fit and centred: sit inside its corner. */
  place(): void {
    const el = this.el;
    if (!el?.isConnected) return;
    const r = document.querySelector('#game canvas')?.getBoundingClientRect();
    if (this.corner === 'bottom-right') el.style.right = `${window.innerWidth - (r?.right ?? window.innerWidth) + INSET}px`;
    else el.style.left = `${(r?.left ?? 0) + INSET}px`;
    if (this.corner === 'top-left') el.style.top = `${(r?.top ?? 0) + INSET}px`;
    else el.style.bottom = `${window.innerHeight - (r?.bottom ?? window.innerHeight) + INSET}px`;
  }
}

/** One resize listener for every tag, added the first time one shows. */
function listen(): void {
  if (listening) return;
  listening = true;
  const placeAll = () => {
    for (const t of tags) t.place();
  };
  // Phaser refits the canvas on its next frame, not on the event (item 080): place again after it.
  window.addEventListener('resize', () => {
    placeAll();
    requestAnimationFrame(() => requestAnimationFrame(placeAll));
  });
}
