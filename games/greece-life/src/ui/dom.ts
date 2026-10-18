// Tiny DOM helpers and the panel stack. Panels pause the clock and stop walking.

type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const en = (text: string, cls = 'en') => h('span', { class: cls, lang: 'en' }, text);

export interface Panel { el: HTMLElement; onClose?: () => void; id: string; modal: boolean }

export class UI {
  readonly root: HTMLElement;
  readonly layer: HTMLElement;
  readonly toasts: HTMLElement;
  stack: Panel[] = [];
  private listeners = new Set<() => void>();

  constructor(root: HTMLElement) {
    this.root = root;
    this.layer = h('div', { class: 'panels' });
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
    root.append(this.layer, this.toasts);
  }

  onChange(fn: () => void) { this.listeners.add(fn); }
  private changed() { for (const fn of this.listeners) fn(); }

  /** Open a panel. `modal` panels pause time and block movement (all except the edit sidebar). */
  open(id: string, el: HTMLElement, opts: { onClose?: () => void; modal?: boolean; className?: string } = {}): Panel {
    const existing = this.stack.find((p) => p.id === id);
    if (existing) this.close(existing);
    const wrap = h('section', { class: `panel ${opts.className ?? ''}`, role: 'dialog', 'data-panel': id, 'aria-label': id }, el);
    const p: Panel = { el: wrap, onClose: opts.onClose, id, modal: opts.modal !== false };
    this.stack.push(p);
    this.layer.append(wrap);
    this.changed();
    return p;
  }

  replace(id: string, el: HTMLElement) {
    const p = this.stack.find((x) => x.id === id);
    if (!p) return;
    p.el.replaceChildren(el);
  }

  top(): Panel | undefined { return this.stack[this.stack.length - 1]; }
  has(id: string) { return this.stack.some((p) => p.id === id); }

  close(p: Panel | string | undefined = this.top()) {
    const panel = typeof p === 'string' ? this.stack.find((x) => x.id === p) : p;
    if (!panel) return;
    this.stack = this.stack.filter((x) => x !== panel);
    panel.el.remove();
    panel.onClose?.();
    this.changed();
  }

  closeAll() { while (this.stack.length) this.close(); }

  /** Time stops and the player cannot walk while a modal panel is open (SPEC §9). */
  blocking() { return this.stack.some((p) => p.modal); }

  toast(el: string, enText?: string, kind: 'info' | 'error' | 'good' = 'info', ms = 4200) {
    const t = h('div', { class: `toast ${kind}` }, h('span', { lang: 'el' }, el), enText ? en(enText) : null);
    this.toasts.append(t);
    setTimeout(() => t.classList.add('hide'), ms);
    setTimeout(() => t.remove(), ms + 600);
    while (this.toasts.children.length > 4) this.toasts.firstChild?.remove();
  }
}

export function button(label: string | Node, onClick: () => void, opts: { cls?: string; title?: string; disabled?: boolean; enLabel?: string; testid?: string } = {}) {
  return h('button', { class: opts.cls ?? 'btn', title: opts.title, disabled: opts.disabled, onclick: (e: Event) => { e.stopPropagation(); onClick(); }, 'data-testid': opts.testid },
    typeof label === 'string' ? h('span', { lang: 'el' }, label) : label,
    opts.enLabel ? en(opts.enLabel, 'en small') : null);
}

export function header(title: string, enTitle: string, onClose: () => void) {
  return h('header', { class: 'panel-head' },
    h('h2', null, h('span', { lang: 'el' }, title), ' ', en(enTitle, 'en sub')),
    h('button', { class: 'close', title: 'Close (Esc)', 'aria-label': 'Close', onclick: onClose }, '✕'));
}

/** Small yes/no question in its own panel (instead of window.confirm). */
export function ask(ui: UI, elText: string, enText: string, yes: string, onYes: () => void, yesEn = 'Yes') {
  const close = () => ui.close('ask');
  ui.open('ask', h('div', { class: 'ask' },
    h('p', null, h('span', { lang: 'el' }, elText)),
    h('p', null, en(enText)),
    h('div', { class: 'row' },
      button(yes, () => { close(); onYes(); }, { cls: 'btn primary', enLabel: yesEn, testid: 'ask-yes' }),
      button('Όχι', close, { enLabel: 'No', testid: 'ask-no' }))), { className: 'small' });
}
