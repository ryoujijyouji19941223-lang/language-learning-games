// Τσάντα (Tab): food and dishes, clothes (wear them), furniture and parcels.

import { ITEM_BY_ID } from '../data/items';
import { RECIPE_BY_ID } from '../data/recipes';
import { CLOTHES, CLOTHES_BY_ID, SLOT_LABEL, type Slot } from '../data/clothes';
import { FURNITURE_BY_ID } from '../data/furniture';
import { eat } from '../core/shop';
import { wear, takeOffAccessory } from '../core/wardrobe';
import { parcelLabel } from '../core/delivery';
import { h, en, header, button } from './dom';
import { type Ctx } from './ctx';

export function openBag(ctx: Ctx, tab: 'food' | 'clothes' | 'furniture' | 'parcels' = 'food') {
  const close = () => ctx.ui.close('bag');
  const body = h('div', { class: 'bag' });
  const render = (t: typeof tab) => {
    const s = ctx.state;
    const tabs = h('nav', { class: 'tabs' }, ...([['food', 'Φαγητά', 'Food'], ['clothes', 'Ρούχα', 'Clothes'], ['furniture', 'Έπιπλα', 'Furniture'], ['parcels', 'Δέματα', 'Parcels']] as const)
      .map(([k, el, e]) => h('button', { class: `tab${k === t ? ' on' : ''}`, 'data-testid': `bagtab-${k}`, onclick: () => render(k) }, h('span', { lang: 'el' }, el), en(` ${e}`, 'en small'))));
    const content = h('div', { class: 'tab-body' });
    if (t === 'food') {
      const entries = Object.entries(s.inventory).sort();
      content.append(entries.length ? h('div', { class: 'catalog small' }, ...entries.map(([id, n]) => {
        const def = id.startsWith('dish:') ? RECIPE_BY_ID[id.slice(5)] : ITEM_BY_ID[id];
        const edible = id.startsWith('dish:') || id.startsWith('food:');
        return h('div', { class: 'item', 'data-item': id },
          h('div', { class: 'icon-big' }, id.startsWith('dish:') ? '🍽️' : ITEM_BY_ID[id]?.emoji ?? '•'),
          h('div', { class: 'item-name', lang: 'el' }, def?.el ?? id, h('button', { class: 'icon', onclick: () => ctx.say(def?.el ?? id, { lexEl: def?.el, lexEn: def?.en, cat: 'food' }) }, '🔊')),
          en(def?.en ?? '', 'en small'),
          h('div', { class: 'qty' }, `× ${n}`),
          edible ? button('Φάε', () => { ctx.commit(eat(ctx.state, id), { save: true }); render(t); }, { enLabel: 'Eat', testid: `eat-${id}` }) : null);
      })) : h('p', { class: 'hint', lang: 'en' }, 'Your bag is empty.'));
    } else if (t === 'clothes') {
      for (const slot of ['top', 'bottom', 'shoes', 'acc'] as Slot[]) {
        const owned = CLOTHES.filter((c) => c.slot === slot && s.clothes.owned.includes(c.id));
        content.append(h('h4', null, h('span', { lang: 'el' }, SLOT_LABEL[slot].el), ' ', en(SLOT_LABEL[slot].en, 'en small')),
          h('div', { class: 'row wrap' }, ...owned.map((c) => {
            const on = s.clothes.worn[slot] === c.id;
            return h('button', { class: `opt cloth${on ? ' on' : ''}`, 'data-testid': `wear-${c.id}`, onclick: () => { if (ctx.commit(wear(ctx.state, c.id), { save: true, toast: false })) { ctx.world.dress(); render(t); } } },
              h('span', { class: 'swatch', style: { background: c.color } }), h('span', { lang: 'el' }, c.el), en(` ${c.en}`, 'en small'));
          }),
          slot === 'acc' && s.clothes.worn.acc ? button('Βγάλε', () => { ctx.commit(takeOffAccessory(ctx.state), { save: true, toast: false }); ctx.world.dress(); render(t); }, { enLabel: 'Take off' }) : null));
      }
      content.append(h('p', { class: 'hint', lang: 'en' }, 'Buy more at Ρούχα «Αλάτι» on the market street. You can change clothes anywhere.'));
    } else if (t === 'furniture') {
      const stored = s.furniture.filter((f) => !f.place);
      const placed = s.furniture.filter((f) => f.place);
      const row = (f: typeof s.furniture[number]) => h('li', null, h('span', { lang: 'el' }, FURNITURE_BY_ID[f.id].el), ' ', en(FURNITURE_BY_ID[f.id].en, 'en small'));
      content.append(
        h('h4', null, h('span', { lang: 'el' }, 'Κουτί αποθήκευσης'), ' ', en(`storage box (${stored.length})`, 'en small')),
        stored.length ? h('ul', null, ...stored.map(row)) : en('empty', 'en small'),
        h('h4', null, h('span', { lang: 'el' }, 'Στο σπίτι'), ' ', en(`in your home (${placed.length})`, 'en small')),
        h('ul', null, ...placed.map(row)),
        h('p', { class: 'hint', lang: 'en' }, 'At home, choose "Διακόσμηση" (Arrange furniture) to place, rotate or store things.'));
    } else {
      const ds = s.deliveries.active;
      content.append(ds.length ? h('ul', { class: 'parcels' }, ...ds.map((d) => {
        const lab = parcelLabel(d);
        return h('li', null, d.status === 'carrying' ? '📦 ' : '⏳ ', h('span', { lang: 'el' }, lab.el), h('br'), en(`${lab.en} — ${d.status === 'carrying' ? 'in your bag' : 'not picked up yet'}`, 'en small'));
      })) : h('p', { class: 'hint', lang: 'en' }, 'No parcels. Accept deliveries on your phone (Κινητό › Παραδόσεις).'));
    }
    body.replaceChildren(header('Τσάντα', 'Bag (Tab)', close), tabs, content);
  };
  render(tab);
  ctx.ui.open('bag', body, { className: 'wide' });
  void CLOTHES_BY_ID;
}
