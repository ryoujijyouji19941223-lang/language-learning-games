// Home kitchen (SPEC §12): pick a recipe, check ingredients, then do each step
// by hand (chop, grate, hold, pick the right ingredient, catch the foam).

import { RECIPES, RECIPE_BY_ID, KITCHEN_TOOLS, type RecipeStep } from '../data/recipes';
import { ITEM_BY_ID } from '../data/items';
import { startCooking, nextStep, finishCooking, cancelCooking, missingFor } from '../core/cooking';
import { hasGrill } from '../core/housing';
import { h, en, header, button } from './dom';
import { greekLine, type Ctx } from './ctx';

const nameOf = (id: string) => (id.startsWith('dish:') ? RECIPE_BY_ID[id.slice(5)] : ITEM_BY_ID[id]);
const emojiOf = (id: string) => (id.startsWith('dish:') ? '🍽️' : ITEM_BY_ID[id]?.emoji ?? '•');

export function openKitchen(ctx: Ctx) {
  const close = () => ctx.ui.close('kitchen');
  const body = h('div', { class: 'kitchen-panel' });
  ctx.ui.open('kitchen', body, { className: 'wide' });
  const list = () => {
    if (ctx.state.cooking) { steps(); return; }
    body.replaceChildren(
      header('Κουζίνα', 'Kitchen — game recipes, simplified (not a real cooking guide)', close),
      h('p', { class: 'hint', lang: 'en' }, `In your kitchen: ${KITCHEN_TOOLS.map((t) => `${t.el} (${t.en})`).join(', ')}. Sugar, water and ice are always there.`),
      h('div', { class: 'recipes' }, ...RECIPES.map((r) => {
        const miss = r.disabled ? [] : missingFor(ctx.state, r.id);
        const grillOk = !r.needsGrill || hasGrill(ctx.state);
        const can = !r.disabled && !miss.length && grillOk;
        ctx.note(r.el, r.en, 'dish');
        return h('article', { class: `recipe${can ? ' ready' : ''}${r.disabled ? ' disabled' : ''}`, 'data-recipe': r.id },
          h('h3', null, h('span', { lang: 'el' }, r.el), h('button', { class: 'icon', onclick: () => ctx.say(r.el, { lexEl: r.el, lexEn: r.en, cat: 'dish' }) }, '🔊'), ' ', en(r.en, 'en sub')),
          r.disabled ? h('p', { class: 'warn' }, h('span', { lang: 'el' }, r.disabled.el), ' ', en(r.disabled.en, 'en small')) : h('ul', { class: 'ings' },
            ...Object.entries(r.ingredients).map(([id, n]) => {
              const have = ctx.state.inventory[id] ?? 0;
              const def = nameOf(id);
              return h('li', { class: have >= n ? 'ok' : 'miss' }, `${emojiOf(id)} `, h('span', { lang: 'el' }, def?.el ?? id), ` ${have}/${n}`, ctx.state.settings.translation === 'always' ? en(` ${def?.en ?? ''}`, 'en small') : null);
            })),
          r.needsGrill && !grillOk ? h('p', { class: 'warn', lang: 'en' }, 'Needs a charcoal grill (ψησταριά) placed on your balcony or courtyard.') : null,
          r.note ? h('p', { class: 'hint', lang: 'en' }, r.note) : null,
          h('p', { class: 'small', lang: 'en' }, `${r.minutes} min · makes ${r.yield}`),
          button('Μαγείρεψε', () => { if (ctx.commit(startCooking(ctx.state, r.id), { save: false })) steps(); }, { disabled: !can, enLabel: 'Cook', cls: 'btn primary', testid: `cook-${r.id}` }));
      })),
    );
  };

  const steps = () => {
    const c = ctx.state.cooking!;
    const r = RECIPE_BY_ID[c.recipeId];
    const stage = h('div', { class: 'cook-stage' });
    body.replaceChildren(
      header(r.el, `${r.en} — step ${Math.min(c.step + 1, r.steps.length)} of ${r.steps.length}`, close),
      h('ol', { class: 'cook-steps' }, ...r.steps.map((st, i) => h('li', { class: i < c.step ? 'done' : i === c.step ? 'now' : '' }, h('span', { lang: 'el' }, st.el)))),
      stage,
      h('div', { class: 'row' }, button('Άσ’ το για μετά', () => { ctx.commit(cancelCooking(ctx.state), { save: true }); list(); }, { cls: 'btn ghost', enLabel: 'Stop (keep all ingredients)' })),
    );
    if (c.step >= r.steps.length) {
      stage.append(button('Έτοιμο!', () => {
        if (ctx.commit(finishCooking(ctx.state), { save: true })) {
          stage.replaceChildren(greekLine(ctx, { el: `Μπράβο! ${r.el} ×${r.yield}`, en: `Well done! ${r.en} ×${r.yield} is in your bag.` }, { big: true }));
          setTimeout(list, 1400);
        }
      }, { cls: 'btn primary big', enLabel: 'Finish: use the ingredients and put the dish in your bag', testid: 'cook-finish' }));
      return;
    }
    const st = r.steps[c.step];
    stage.append(greekLine(ctx, { el: st.el, en: st.en }, { cat: 'cook', big: true }));
    const advance = () => { if (ctx.commit(nextStep(ctx.state), { save: false, toast: false })) steps(); };
    stage.append(stepControl(ctx, st, Object.keys(c.reserved), advance));
  };
  list();
}

function stepControl(ctx: Ctx, st: RecipeStep, reserved: string[], done: () => void): HTMLElement {
  const wrap = h('div', { class: 'step-control' });
  if (st.op === 'chop' || st.op === 'grate' || st.op === 'mix' || st.op === 'tap') {
    const need = st.n ?? 1;
    let left = need;
    const label = { chop: 'Κόψε', grate: 'Τρίψε', mix: 'Ανακάτεψε', tap: 'Κάν’ το' }[st.op];
    const icon = { chop: '🔪', grate: '🧀', mix: '🥄', tap: '👐' }[st.op];
    const counter = h('span', { class: 'count' }, `${need - left}/${need}`);
    wrap.append(h('button', { class: 'btn big action', 'data-testid': 'step-action', onclick: () => { left--; counter.textContent = `${need - left}/${need}`; if (left <= 0) done(); } }, `${icon} `, h('span', { lang: 'el' }, label)), counter);
  } else if (st.op === 'hold') {
    const ms = st.ms ?? 1000;
    const bar = h('div', { class: 'bar' }, h('div', { class: 'fill' }));
    let t0 = 0;
    let raf = 0;
    const fill = bar.firstElementChild as HTMLElement;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      fill.style.width = `${p * 100}%`;
      if (p >= 1) { done(); return; }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const stop = () => { cancelAnimationFrame(raf); fill.style.width = '0%'; };
    wrap.append(h('button', { class: 'btn big action', 'data-testid': 'step-hold', onpointerdown: start, onpointerup: stop, onpointerleave: stop }, '🔥 ', h('span', { lang: 'el' }, 'Κράτα πατημένο'), en(' hold the button', 'en small')), bar);
  } else if (st.op === 'add') {
    wrap.append(h('p', { class: 'hint', lang: 'en' }, 'Pick the ingredient the step asks for:'),
      h('div', { class: 'row wrap' }, ...reserved.map((id) => h('button', { class: 'opt', 'data-testid': `pick-${id}`, onclick: (e: Event) => {
        if (id === st.pick) { ctx.note(nameOf(id)?.el ?? id, nameOf(id)?.en ?? '', 'food', 'selected'); done(); }
        else { (e.currentTarget as HTMLElement).classList.add('wrong'); ctx.ui.toast('Όχι αυτό.', 'Not that one — read the step again. Nothing was used up.'); }
      } }, `${emojiOf(id)} `, h('span', { lang: 'el' }, nameOf(id)?.el ?? id)))));
  } else if (st.op === 'choice') {
    wrap.append(h('div', { class: 'row' }, ...(st.options ?? []).map((o) => button(o.el, done, { enLabel: o.en, cls: 'opt' }))));
  } else if (st.op === 'watch') {
    // the foam rises; stop inside the green zone (try again as often as you like)
    const bar = h('div', { class: 'bar vertical' }, h('div', { class: 'zone' }), h('div', { class: 'fill' }));
    const fill = bar.querySelector('.fill') as HTMLElement;
    let p = 0;
    let raf = 0;
    const loop = () => { p = (p + 0.008) % 1.15; fill.style.height = `${Math.min(1, p) * 100}%`; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    wrap.append(bar, h('button', { class: 'btn big action', 'data-testid': 'step-stop', onclick: () => {
      if (p >= 0.62 && p <= 0.9) { cancelAnimationFrame(raf); done(); }
      else { ctx.ui.toast(p < 0.62 ? 'Πολύ νωρίς!' : 'Ξεχείλισε!', p < 0.62 ? 'Too early — wait for the foam.' : 'It boiled over — try again (no ingredients lost).'); p = 0; }
    } }, '✋ ', h('span', { lang: 'el' }, 'Σβήσε!'), en(' turn off the heat', 'en small')));
  }
  return wrap;
}
