// Κινητό (P): delivery jobs, calendar and resting, rent, recent news.

import { MAX_ACTIVE_DELIVERIES, DESTINATIONS } from '../data/deliveries';
import { HOME_BY_ID } from '../data/homes';
import { EVENTS, MONTHS, WEEKDAYS } from '../data/phrases';
import { SHOP_BY_ID } from '../data/shops';
import { acceptDelivery, cancelDelivery, parcelLabel, pickupDef, refreshOffers } from '../core/delivery';
import { restDays, deadlinesBefore } from '../core/time';
import { dateOf, dateOfDay, nextMorning, MONTH_DAYS, hhmm, dateText } from '../core/calendar';
import { isOpen } from '../core/hours';
import { euro } from '../core/money';
import { tx } from '../core/state';
import { h, en, header, button, ask } from './dom';
import { greekLine, type Ctx } from './ctx';

export function openPhone(ctx: Ctx, tab: 'deliveries' | 'calendar' | 'home' | 'news' = 'deliveries') {
  const close = () => ctx.ui.close('phone');
  const body = h('div', { class: 'phone' });
  ctx.commit(tx(ctx.state, (s) => refreshOffers(s, Math.floor(s.time / 1440))), { save: false, toast: false });
  const render = (t: typeof tab) => {
    const s = ctx.state;
    const tabs = h('nav', { class: 'tabs' }, ...([['deliveries', 'Παραδόσεις', 'Deliveries'], ['calendar', 'Ημερολόγιο', 'Calendar'], ['home', 'Σπίτι', 'Home & rent'], ['news', 'Νέα', 'News']] as const)
      .map(([k, el, e]) => h('button', { class: `tab${k === t ? ' on' : ''}`, 'data-testid': `phonetab-${k}`, onclick: () => render(k) }, h('span', { lang: 'el' }, el), en(` ${e}`, 'en small'))));
    const c = h('div', { class: 'tab-body' });
    if (t === 'deliveries') {
      c.append(h('p', { class: 'hint', lang: 'en' }, `Up to ${MAX_ACTIVE_DELIVERIES} at once. Pick up at the shop, then hand over at the address (find it on the map, M). Late = half pay; cancelling costs nothing.`));
      c.append(h('h4', null, h('span', { lang: 'el' }, 'Δικές μου'), ' ', en(`mine (${s.deliveries.active.length}/${MAX_ACTIVE_DELIVERIES})`, 'en small')));
      for (const d of s.deliveries.active) {
        const lab = parcelLabel(d);
        const late = s.time > d.deadline;
        c.append(h('div', { class: `job-card${late ? ' late' : ''}`, 'data-delivery': d.id },
          greekLine(ctx, lab, { cat: 'delivery' }),
          h('p', { class: 'small', lang: 'en' }, `${d.status === 'carrying' ? '📦 In your bag — go to the address.' : `⏳ Pick up at ${SHOP_BY_ID[pickupDef(d.pickup).shop].en} (${SHOP_BY_ID[pickupDef(d.pickup).shop].el}).`} Deadline ${hhmm(d.deadline % 1440)}${late ? ' — late (half pay)' : ''}. Pay ${euro(d.pay)}.`),
          h('p', { class: 'small' }, h('span', { lang: 'el' }, DESTINATIONS.find((x) => x.id === d.dest)!.landmark.el), ' ', en(DESTINATIONS.find((x) => x.id === d.dest)!.landmark.en, 'en small')),
          button('Ακύρωση', () => ask(ctx.ui, 'Ακύρωση παράδοσης;', 'Cancel this delivery? No pay, no penalty.', 'Ναι', () => { ctx.commit(cancelDelivery(ctx.state, d.id), { save: true }); render(t); }), { cls: 'btn ghost', enLabel: 'Cancel' })));
      }
      c.append(h('h4', null, h('span', { lang: 'el' }, 'Διαθέσιμες σήμερα'), ' ', en('available today', 'en small')));
      for (const o of s.deliveries.offers) {
        const lab = parcelLabel(o);
        const shop = SHOP_BY_ID[pickupDef(o.pickup).shop];
        const open = isOpen(shop, s.time);
        c.append(h('div', { class: 'job-card', 'data-offer': o.id },
          greekLine(ctx, lab, { cat: 'delivery' }),
          h('p', { class: 'small', lang: 'en' }, `Pick up: ${shop.en} ${open ? '' : '(closed now)'} · ${euro(o.pay)} · ${o.minutes} min after accepting`),
          button('Αναλαμβάνω', () => { if (ctx.commit(acceptDelivery(ctx.state, o.id), { save: true })) render(t); }, { enLabel: 'Accept', disabled: !open || s.deliveries.active.length >= MAX_ACTIVE_DELIVERIES, testid: `accept-${o.id}` })));
      }
      if (!s.deliveries.offers.length) c.append(en('No more offers today. New ones tomorrow.', 'en small'));
    } else if (t === 'calendar') {
      const d = dateOf(s.time);
      const first = dateOfDay(d.dayIndex - (d.day - 1));
      const cells: HTMLElement[] = WEEKDAYS.map((w) => h('div', { class: 'cal-head', lang: 'el' }, w.el.slice(0, 3)));
      for (let i = 0; i < first.weekday; i++) cells.push(h('div', { class: 'cal-cell empty' }));
      for (let day = 1; day <= MONTH_DAYS[d.month]; day++) {
        const ev = EVENTS.find((e) => e.month === d.month && e.day === day);
        const sat = (first.weekday + day - 1) % 7 === 5;
        cells.push(h('div', { class: `cal-cell${day === d.day ? ' today' : ''}${ev ? ' event' : ''}`, title: ev ? ev.en : sat ? 'Λαϊκή (street market)' : '' },
          String(day), ev ? h('span', { class: 'ev', lang: 'el' }, ev.el) : sat ? h('span', { class: 'ev small', lang: 'el' }, 'Λαϊκή') : null));
      }
      const tt = dateText(s.time);
      c.append(
        h('h3', null, h('span', { lang: 'el' }, `${MONTHS[d.month].nom}, έτος ${d.year}`), ' ', en(`${MONTHS[d.month].en}, year ${d.year} (game calendar)`, 'en sub')),
        h('p', null, h('span', { lang: 'el' }, tt.el), ' ', en(tt.en, 'en small')),
        h('div', { class: 'calendar' }, ...cells),
        h('p', { class: 'hint', lang: 'en' }, 'Holiday names only for now; descriptions come after checking sources (M3). Movable feasts are fixed to one date in this game calendar.'),
        h('h4', null, h('span', { lang: 'el' }, 'Ξεκούραση'), ' ', en('rest: skip ahead, wake at 08:00', 'en small')),
        h('div', { class: 'row wrap' }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => button(`${n}`, () => {
          const target = nextMorning(s.time) + (n - 1) * 1440;
          const due = deadlinesBefore(s, target);
          const go = () => { if (ctx.commit(restDays(ctx.state, n), { save: true })) { close(); } };
          if (due.length || s.jobs.active) ask(ctx.ui, 'Σίγουρα;', `${due.length ? `${due.length} delivery deadline(s) will pass (they can still be delivered late for half pay). ` : ''}${s.jobs.active ? 'You have a shift in progress — finish it first.' : ''}`, 'Ναι', go);
          else go();
        }, { enLabel: n === 1 ? 'day' : 'days', testid: `rest-${n}` }))),
      );
    } else if (t === 'home') {
      const home = s.home ? HOME_BY_ID[s.home] : null;
      c.append(h('div', null,
        home ? greekLine(ctx, { el: home.el, en: home.en }, { cat: 'home' }) : h('p', { lang: 'en' }, 'No home yet — visit the rental office in the Neighbourhood (Γειτονιά).'),
        home ? h('p', null, `${euro(home.rent)} `, en('per month, charged on the 1st', 'en small')) : null,
        s.rent.owed ? h('p', { class: 'warn' }, h('span', { lang: 'el' }, `Χρωστάς ${euro(s.rent.owed)}`), ' ', en('— pay at the rental office.', 'en small')) : null,
        h('p', null, h('span', { lang: 'el' }, 'Λεφτά: '), euro(s.money)),
        h('p', { class: 'small', lang: 'en' }, `Shifts worked ${s.stats.shifts} · deliveries ${s.stats.delivered} · dishes cooked ${s.stats.cooked} · people met ${Object.values(s.npcs).filter((m) => m.talks > 0).length}/72`),
      ));
    } else {
      c.append(h('ul', { class: 'news' }, ...s.log.slice(0, 20).map((l) => h('li', null, h('span', { class: 'small' }, `${hhmm(l.at % 1440)} `), h('span', { lang: 'el' }, l.el), ' ', en(l.en, 'en small')))));
      if (!s.log.length) c.append(en('Nothing yet.', 'en small'));
    }
    body.replaceChildren(header('Κινητό', 'Phone (P)', close), tabs, c);
  };
  render(tab);
  ctx.ui.open('phone', body, { className: 'wide phone-panel' });
}
