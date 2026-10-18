// Λεξικό (L): words and lines you met, favourites, and optional typing practice
// with an on-screen Greek keyboard (standard layout, ΄ for accents, final ς).

import { checkAnswer } from '../core/text';
import { lexKey, toggleFavourite } from '../core/lexicon';
import type { LexEntry } from '../core/state';
import { h, en, header, button } from './dom';
import type { Ctx } from './ctx';

const ROWS = [
  [';', 'ς', 'ε', 'ρ', 'τ', 'υ', 'θ', 'ι', 'ο', 'π'],
  ['α', 'σ', 'δ', 'φ', 'γ', 'η', 'ξ', 'κ', 'λ', '΄'],
  ['ζ', 'χ', 'ψ', 'ω', 'β', 'ν', 'μ', ',', '.', '¨'],
];
const ACCENT: Record<string, string> = { α: 'ά', ε: 'έ', η: 'ή', ι: 'ί', ο: 'ό', υ: 'ύ', ω: 'ώ', Α: 'Ά', Ε: 'Έ', Η: 'Ή', Ι: 'Ί', Ο: 'Ό', Υ: 'Ύ', Ω: 'Ώ' };
const DIAER: Record<string, string> = { ι: 'ϊ', υ: 'ϋ', Ι: 'Ϊ', Υ: 'Ϋ', ί: 'ΐ', ύ: 'ΰ' };

/** On-screen Greek keyboard that types into `input`. */
export function greekKeyboard(input: HTMLInputElement) {
  let dead: '΄' | '¨' | null = null;
  let shift = false;
  const type = (ch: string) => {
    let c = shift ? ch.toLocaleUpperCase('el') : ch;
    if (ch === '΄' || ch === '¨') { dead = ch; return; }
    if (dead === '΄' && ACCENT[c]) c = ACCENT[c];
    if (dead === '¨' && DIAER[c]) c = DIAER[c];
    dead = null;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = (input.value.slice(0, start) + c + input.value.slice(end)).normalize('NFC');
    input.selectionStart = input.selectionEnd = start + c.length;
    if (shift) { shift = false; render(); }
    input.dispatchEvent(new Event('input'));
  };
  const kb = h('div', { class: 'gk', 'aria-label': 'Greek keyboard' });
  const render = () => {
    kb.replaceChildren(
      ...ROWS.map((row) => h('div', { class: 'gk-row' }, ...row.map((k) => h('button', { class: `gk-key${k === '΄' || k === '¨' ? ' dead' : ''}`, type: 'button', 'data-key': k, onmousedown: (e: Event) => e.preventDefault(), onclick: () => type(k) }, shift ? k.toLocaleUpperCase('el') : k)))),
      h('div', { class: 'gk-row' },
        h('button', { class: `gk-key wide${shift ? ' on' : ''}`, type: 'button', onmousedown: (e: Event) => e.preventDefault(), onclick: () => { shift = !shift; render(); } }, '⇧'),
        h('button', { class: 'gk-key space', type: 'button', onmousedown: (e: Event) => e.preventDefault(), onclick: () => type(' ') }, ' '),
        h('button', { class: 'gk-key wide', type: 'button', onmousedown: (e: Event) => e.preventDefault(), onclick: () => { input.value = input.value.slice(0, -1); input.dispatchEvent(new Event('input')); } }, '⌫')),
    );
  };
  render();
  return kb;
}

export function openLexicon(ctx: Ctx) {
  const close = () => ctx.ui.close('lexicon');
  const body = h('div', { class: 'lexicon' });
  let filter = '';
  let favOnly = false;
  const render = () => {
    const entries = Object.values(ctx.state.lexicon)
      .filter((e) => (!favOnly || e.fav) && (!filter || e.el.toLocaleLowerCase('el').includes(filter) || e.en.toLowerCase().includes(filter)))
      .sort((a, b) => Number(b.fav) - Number(a.fav) || b.seen - a.seen);
    const search = h('input', { type: 'search', placeholder: 'αναζήτηση / search', value: filter, 'aria-label': 'Search the dictionary', 'data-testid': 'lex-search', oninput: (e: Event) => { filter = (e.target as HTMLInputElement).value.toLocaleLowerCase('el'); renderList(); } }) as HTMLInputElement;
    const list = h('div', { class: 'lex-list' });
    const renderList = () => {
      const es = Object.values(ctx.state.lexicon)
        .filter((e) => (!favOnly || e.fav) && (!filter || e.el.toLocaleLowerCase('el').includes(filter) || e.en.toLowerCase().includes(filter)))
        .sort((a, b) => Number(b.fav) - Number(a.fav) || b.seen - a.seen)
        .slice(0, 150);
      list.replaceChildren(...es.map((e) => row(e)));
    };
    const row = (e: LexEntry) => h('div', { class: 'lex-row' },
      h('button', { class: `icon star${e.fav ? ' on' : ''}`, title: 'favourite', onclick: () => { ctx.mutate((s) => toggleFavourite(s, e.el), true); renderList(); } }, e.fav ? '★' : '☆'),
      h('span', { class: 'el-text', lang: 'el' }, e.el),
      h('button', { class: 'icon', onclick: () => ctx.say(e.el, { lexEl: e.el, lexEn: e.en, cat: e.cat }) }, '🔊'),
      h('button', { class: 'icon', onclick: () => ctx.say(e.el, { slow: true, lexEl: e.el, lexEn: e.en, cat: e.cat }) }, '🐢'),
      en(e.en, 'en'),
      h('span', { class: 'counts small', lang: 'en', title: 'seen · heard with a Greek voice · chosen · copied · recalled · accent-assisted' },
        `👁${e.seen} 👂${e.listened} ✔${e.selected} ✍${e.copied} 🧠${e.recalled}${e.assisted ? ` ±${e.assisted}` : ''}`),
      button('Γράψε', () => practice(e), { cls: 'btn small', enLabel: 'type it' }));
    renderList();
    body.replaceChildren(
      header('Λεξικό', `Dictionary — ${Object.keys(ctx.state.lexicon).length} entries you have met`, close),
      h('div', { class: 'row' }, search, h('label', null, h('input', { type: 'checkbox', checked: favOnly, onchange: (ev: Event) => { favOnly = (ev.target as HTMLInputElement).checked; renderList(); } }), en(' favourites only'))),
      h('p', { class: 'small', lang: 'en' }, '👁 seen · 👂 heard with a Greek voice (not counted without one) · ✔ chose right at work/cooking · ✍ copied · 🧠 typed from memory · ± right letters but accents missing (counted as assisted).'),
      list,
    );
    void entries;
  };
  const practice = (e: LexEntry) => {
    const input = h('input', { type: 'text', lang: 'el', class: 'type-in', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Type in Greek', 'data-testid': 'type-in' }) as HTMLInputElement;
    let mode: 'copy' | 'recall' = 'copy';
    const model = h('p', { class: 'el-text big', lang: 'el' }, e.el);
    const result = h('p', { class: 'result' });
    const wrap = h('div', { class: 'practice' },
      header('Γράψε', 'Typing practice (optional) — Windows Greek keyboard works too', () => { ctx.ui.close('practice'); render(); }),
      h('div', { class: 'row' },
        h('label', null, h('input', { type: 'radio', name: 'pm', checked: true, onchange: () => { mode = 'copy'; model.hidden = false; } }), en(' copy (model visible)')),
        h('label', null, h('input', { type: 'radio', name: 'pm', onchange: () => { mode = 'recall'; model.hidden = true; } }), en(' from memory (only English shown)'))),
      model, en(e.en, 'en'), input, greekKeyboard(input), result,
      h('div', { class: 'row' }, button('Έλεγχος', () => {
        const r = checkAnswer(input.value, e.el);
        if (r === 'wrong') { result.textContent = '✗ Not quite — try again.'; return; }
        ctx.note(e.el, e.en, e.cat, mode === 'copy' ? 'copied' : 'recalled');
        if (r === 'accents') ctx.note(e.el, e.en, e.cat, 'assisted');
        result.textContent = r === 'exact' ? '✓ Σωστά! Correct.' : '✓ Right letters; the accents (τόνοι) differ — counted as assisted.';
      }, { cls: 'btn primary', enLabel: 'Check', testid: 'type-check' })));
    ctx.ui.open('practice', wrap, { className: 'wide' });
    input.focus();
  };
  render();
  ctx.ui.open('lexicon', body, { className: 'wide' });
}

export { lexKey };
