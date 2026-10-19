// Rooms to rent (SPEC §6): view any room, sign for one. You always have one home.

import { HOMES, HOME_BY_ID, MOVE_FEE } from '../data/homes';
import { DISTRICTS } from '../data/shops';
import { NPC_BY_ID } from '../data/npcs';
import { UI as UIL } from '../data/phrases';
import { rentHome, viewHome, payOwedRent } from '../core/housing';
import { euro } from '../core/money';
import { h, en, header, button, ask } from './dom';
import { greekLine, type Ctx } from './ctx';

export function openRental(ctx: Ctx) {
  const close = () => ctx.ui.close('rental');
  const landlady = NPC_BY_ID.g46;
  const body = h('div', { class: 'rental' });
  const render = () => {
    const s = ctx.state;
    body.replaceChildren(
      header('Γραφείο ενοικίων', 'Rental office — 4 rooms', close),
      greekLine(ctx, s.home ? { el: 'Θέλετε να μετακομίσετε; Δείτε τα δωμάτια.', en: 'Would you like to move? Have a look at the rooms.' } : landlady.topic, { cat: 'talk', speaker: landlady.name }),
      h('p', { class: 'hint', lang: 'en' }, s.home
        ? `You live in ${HOME_BY_ID[s.home].en}. Moving costs ${euro(MOVE_FEE)}; all your furniture goes to the storage box and nothing is lost.`
        : 'Choose your first room. The first month is already paid and a bed, desk, chair and curtains come with it. Rent is charged on the 1st of each month (game prices).'),
      s.rent.owed > 0 ? h('div', { class: 'warn' }, h('span', { lang: 'el' }, `Χρωστάς ${euro(s.rent.owed)}.`), ' ', en('Rent owed.'), button(UIL.payRent.el, () => { ctx.commit(payOwedRent(ctx.state), { save: true }); render(); }, { enLabel: UIL.payRent.en })) : '',
      h('div', { class: 'rooms' }, ...HOMES.map((home) => {
        const mine = s.home === home.id;
        const viewed = s.viewed.includes(home.id);
        return h('article', { class: `room${mine ? ' mine' : ''}`, 'data-room': home.id },
          h('h3', null, h('span', { lang: 'el' }, home.el), ' ', en(home.en, 'en sub')),
          h('p', null, h('span', { lang: 'el' }, DISTRICTS[home.district].el), ' · ', en(`${DISTRICTS[home.district].en}, ${(home.w * 0.5).toFixed(1)} × ${(home.d * 0.5).toFixed(1)} m${home.outdoor ? ` + ${home.outdoor.en}` : ''}, ${home.windows.length} window(s)`, 'en small')),
          greekLine(ctx, { el: home.featureEl, en: home.featureEn }, { cat: 'home' }),
          h('p', { class: 'rent' }, `${euro(home.rent)} `, h('span', { lang: 'el' }, 'τον μήνα'), en(' per month', 'en small')),
          viewed ? h('p', { class: 'tag' }, '✓ ', en('viewed', 'en small')) : null,
          mine ? h('p', { class: 'tag mine' }, h('span', { lang: 'el' }, UIL.home.el), en(' (your home)', 'en small')) : h('div', { class: 'row' },
            button(UIL.viewRoom.el, () => {
              ctx.commit(viewHome(ctx.state, home.id), { save: false, toast: false });
              ctx.ui.closeAll();
              ctx.world.viewHome(home.id);
            }, { enLabel: UIL.viewRoom.en, testid: `view-${home.id}` }),
            button(UIL.takeRoom.el, () => {
              const go = () => {
                if (ctx.commit(rentHome(ctx.state, home.id), { save: true })) {
                  ctx.ui.closeAll();
                  ctx.world.viewHome(null);
                  ctx.world.refreshHome();
                  ctx.world.enterArea(`home:${home.id}`);
                }
              };
              if (ctx.state.home) ask(ctx.ui, `Μετακόμιση; ${euro(MOVE_FEE)}`, `Move to ${home.en}? Moving costs ${euro(MOVE_FEE)}. All furniture goes into the storage box (nothing is lost).`, 'Ναι, μετακομίζω', go, 'Yes, move');
              else go();
            }, { enLabel: UIL.takeRoom.en, cls: 'btn primary', testid: `take-${home.id}` }),
          ));
      })),
    );
  };
  render();
  ctx.ui.open('rental', body, { className: 'wide' });
}
