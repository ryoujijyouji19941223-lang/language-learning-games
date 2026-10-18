// Shopping (SPEC §10): Καλημέρα → choose → Θα ήθελα… → Πόσο κάνει; → Ορίστε → Ευχαριστώ.
// Payment, stock and bag change in one step (core/shop.ts).

import { SHOP_BY_ID, type CatalogEntry } from '../data/shops';
import { ITEM_BY_ID } from '../data/items';
import { FURNITURE_BY_ID, NEW_THING_WISH } from '../data/furniture';
import { CLOTHES_BY_ID, SLOT_LABEL } from '../data/clothes';
import { NPC_BY_ID } from '../data/npcs';
import { SHOP_FLOW, GREETINGS_BY_TIME } from '../data/phrases';
import { checkout, priceAt, stockLeft, cartTotal, sell, sellPrice, type CartLine } from '../core/shop';
import { pickUpParcel, pickupDef } from '../core/delivery';
import { DELIVERY_LINES } from '../data/deliveries';
import { isOpen, hoursToday } from '../core/hours';
import { dateOf } from '../core/calendar';
import { euro, euroSpeech } from '../core/money';
import { h, en, header, button } from './dom';
import { greekLine, type Ctx } from './ctx';
import { preview } from './preview';

function nameOf(e: { kind: string; id: string }) {
  if (e.kind === 'item') return { el: ITEM_BY_ID[e.id].el, en: ITEM_BY_ID[e.id].en, icon: ITEM_BY_ID[e.id].emoji };
  if (e.kind === 'furniture') return { el: FURNITURE_BY_ID[e.id].el, en: FURNITURE_BY_ID[e.id].en, icon: '🪑' };
  const c = CLOTHES_BY_ID[e.id];
  return { el: c.el, en: `${c.en} (${SLOT_LABEL[c.slot].en.toLowerCase()})`, icon: '👕' };
}

export function openShop(ctx: Ctx, shopId: string, staffId?: string) {
  const shop = SHOP_BY_ID[shopId];
  const staff = staffId ? NPC_BY_ID[staffId] : shop.staff?.[0] ? NPC_BY_ID[shop.staff[0]] : undefined;
  const speaker = staff ? staff.name : shop.el;
  const close = () => ctx.ui.close('shop');
  const root = h('div', { class: 'shop' });
  root.append(header(shop.el, shop.en, close));
  const log = h('div', { class: 'talk-log short' });
  const main = h('div', { class: 'shop-main' });
  const actions = h('div', { class: 'choices row' });
  root.append(log, main, actions);
  const staffSays = (line: { el: string; en: string }, speak?: string) => { log.append(h('div', { class: 'bubble npc' }, greekLine(ctx, line, { cat: 'shop', speaker, speak }))); log.scrollTop = 1e6; };
  const youSay = (line: { el: string; en: string }) => { log.append(h('div', { class: 'bubble you' }, greekLine(ctx, line, { cat: 'shop', speaker: 'Εσύ · You' }))); log.scrollTop = 1e6; };
  const choice = (line: { el: string; en: string }, fn: () => void, testid?: string, disabled = false) =>
    h('button', { class: 'choice', 'data-testid': testid, disabled, onclick: fn }, h('span', { lang: 'el' }, line.el), ctx.state.settings.translation === 'always' ? en(line.en, 'en small') : null);

  ctx.ui.open('shop', root, { className: 'shop-panel' });

  if (!isOpen(shop, ctx.state.time)) {
    const hrs = hoursToday(shop, ctx.state.time);
    main.append(greekLine(ctx, SHOP_FLOW.closed, { cat: 'sign', big: true }), h('p', { lang: 'en', class: 'hint' }, hrs ? `Open today: ${hrs}.` : 'Closed all day today.', shop.hoursNote ? ` ${shop.hoursNote}` : ''));
    actions.append(button('Εντάξει', close, { enLabel: 'OK' }));
    return;
  }

  // parcels to collect here
  for (const d of ctx.state.deliveries.active) {
    if (d.status === 'accepted' && pickupDef(d.pickup).shop === shopId) {
      actions.append(choice(DELIVERY_LINES.pickup, () => {
        youSay(DELIVERY_LINES.pickup);
        if (ctx.commit(pickUpParcel(ctx.state, d.id, d.pickup), { save: true })) staffSays(DELIVERY_LINES.pickupReply);
      }, 'pickup'));
    }
  }

  const cart = new Map<string, CartLine>();
  const greet = GREETINGS_BY_TIME(dateOf(ctx.state.time).minuteOfDay);
  const greetStep = () => {
    if (!shop.catalog) {
      main.replaceChildren(h('p', { class: 'hint', lang: 'en' }, 'Nothing is sold here.'));
      return;
    }
    actions.replaceChildren(
      ...[...actions.querySelectorAll('[data-testid=pickup]')] as HTMLElement[],
      choice(SHOP_FLOW.greetMorning, () => afterGreet(SHOP_FLOW.greetMorning), 'greet-morning'),
      choice(SHOP_FLOW.greetEvening, () => afterGreet(SHOP_FLOW.greetEvening), 'greet-evening'),
    );
    main.replaceChildren(h('p', { class: 'hint', lang: 'en' }, `Greet first. It is ${dateOf(ctx.state.time).hour}:00 — "${greet.el}" fits the time of day (either is fine).`));
  };
  const afterGreet = (said: { el: string; en: string }) => {
    youSay(said);
    staffSays({ el: `${greet.el} ${SHOP_FLOW.staffAsk.el}`, en: `${greet.en} ${SHOP_FLOW.staffAsk.en}` });
    browse();
  };

  const browse = () => {
    const sellMode = { on: false };
    const grid = h('div', { class: 'catalog' });
    const summary = h('div', { class: 'cart' });
    const pv = h('div', { class: 'preview' });
    const renderCart = () => {
      const lines = [...cart.values()].filter((l) => l.qty > 0);
      const total = cartTotal(shopId, lines);
      summary.replaceChildren(
        h('strong', null, 'Καλάθι ', en('basket', 'en small')),
        lines.length ? h('ul', null, ...lines.map((l) => h('li', null, `${l.qty} × `, h('span', { lang: 'el' }, nameOf(l).el), ` — ${euro(priceAt(shopId, l.kind, l.id) * l.qty)}`))) : en('empty', 'en small'),
        h('div', { class: 'total' }, `${euro(total)}`, ' · ', en(`you have ${euro(ctx.state.money)}`, 'en small')),
      );
      orderBtn.disabled = !lines.length;
    };
    const card = (e: CatalogEntry) => {
      const nm = nameOf(e);
      const price = priceAt(shopId, e.kind, e.id);
      const left = stockLeft(ctx.state, shopId, e.id);
      const owned = e.kind === 'item' ? ctx.state.inventory[e.id] ?? 0 : e.kind === 'furniture' ? ctx.state.furniture.filter((f) => f.id === e.id).length : ctx.state.clothes.owned.includes(e.id) ? 1 : 0;
      const qty = h('span', { class: 'qty' }, String(cart.get(e.id)?.qty ?? 0));
      const set = (n: number) => {
        const max = e.kind === 'clothes' ? (owned ? 0 : 1) : Math.min(20, left);
        const v = Math.max(0, Math.min(max, n));
        cart.set(e.id, { kind: e.kind, id: e.id, qty: v });
        qty.textContent = String(v);
        renderCart();
      };
      ctx.note(nm.el, nm.en, e.kind === 'item' ? 'food' : e.kind);
      return h('div', { class: `item${left <= 0 ? ' soldout' : ''}`, 'data-item': e.id, onmouseenter: () => { if (e.kind === 'furniture') preview(pv, e.id); } },
        h('div', { class: 'icon-big' }, nm.icon),
        h('div', { class: 'item-name', lang: 'el' }, nm.el,
          h('button', { class: 'icon', title: 'Play', onclick: (ev: Event) => { ev.stopPropagation(); ctx.say(nm.el, { lexEl: nm.el, lexEn: nm.en, cat: 'food' }); } }, '🔊')),
        ctx.state.settings.translation === 'always' ? en(nm.en, 'en small') : h('button', { class: 'icon en-btn', onclick: (ev: Event) => { (ev.target as HTMLElement).replaceWith(en(nm.en, 'en small')); } }, 'EN'),
        h('div', { class: 'price' }, euro(price), e.kind === 'clothes' && owned ? en(' (owned)', 'en small') : en(` · stock ${left} · you have ${owned}`, 'en small')),
        h('div', { class: 'stepper' },
          h('button', { class: 'icon', 'aria-label': 'less', onclick: () => set((cart.get(e.id)?.qty ?? 0) - 1) }, '−'),
          qty,
          h('button', { class: 'icon', 'aria-label': 'more', 'data-testid': `add-${e.id}`, onclick: () => set((cart.get(e.id)?.qty ?? 0) + 1) }, '+')));
    };
    const orderBtn = choice(SHOP_FLOW.order, () => order(), 'order', true) as HTMLButtonElement;
    const renderGrid = () => {
      if (sellMode.on) {
        grid.replaceChildren(...sellCards());
        return;
      }
      grid.replaceChildren(...(shop.catalog ?? []).map(card));
    };
    const sellCards = () => {
      const items: HTMLElement[] = [];
      for (const f of ctx.state.furniture.filter((x) => !x.place && shop.catalog?.some((c) => c.kind === 'furniture' && c.id === x.id))) {
        const d = FURNITURE_BY_ID[f.id];
        items.push(h('div', { class: 'item' }, h('div', { class: 'item-name', lang: 'el' }, d.el), en(d.en, 'en small'), h('div', { class: 'price' }, euro(sellPrice('furniture', f.id))),
          button('Πούλησε', () => { if (ctx.commit(sell(ctx.state, shopId, [{ kind: 'furniture', ref: f.uid }]), { save: true })) { staffSays(SHOP_FLOW.sellReply); renderGrid(); } }, { enLabel: 'Sell' })));
      }
      if (shop.id === 'agora_clothes') {
        for (const c of ctx.state.clothes.owned.filter((id) => !Object.values(ctx.state.clothes.worn).includes(id))) {
          const d = CLOTHES_BY_ID[c];
          items.push(h('div', { class: 'item' }, h('div', { class: 'item-name', lang: 'el' }, d.el), en(d.en, 'en small'), h('div', { class: 'price' }, euro(sellPrice('clothes', c))),
            button('Πούλησε', () => { if (ctx.commit(sell(ctx.state, shopId, [{ kind: 'clothes', ref: c }]), { save: true })) { staffSays(SHOP_FLOW.sellReply); renderGrid(); } }, { enLabel: 'Sell' })));
        }
      }
      if (!items.length) items.push(h('p', { class: 'hint', lang: 'en' }, 'Nothing to sell: only things in your storage box (not placed) or clothes you are not wearing.'));
      return items;
    };
    renderGrid();
    renderCart();
    main.replaceChildren(h('div', { class: 'shop-cols' }, grid, h('div', { class: 'side' }, pv, summary)));
    const acts: HTMLElement[] = [orderBtn];
    if (shop.buysBack) acts.push(choice(SHOP_FLOW.sell, () => { sellMode.on = !sellMode.on; if (sellMode.on) youSay(SHOP_FLOW.sell); renderGrid(); }, 'sell'));
    acts.push(choice(SHOP_FLOW.justLooking, () => { youSay(SHOP_FLOW.justLooking); setTimeout(close, 300); }));
    actions.replaceChildren(...acts);
    if (shop.catalog?.some((c) => c.kind === 'furniture')) preview(pv, shop.catalog.find((c) => c.kind === 'furniture')!.id);
  };

  const order = () => {
    const lines = [...cart.values()].filter((l) => l.qty > 0);
    youSay(SHOP_FLOW.order);
    staffSays(SHOP_FLOW.here);
    actions.replaceChildren(choice(SHOP_FLOW.howMuch, () => {
      youSay(SHOP_FLOW.howMuch);
      const total = cartTotal(shopId, lines);
      staffSays({ el: `Κάνει ${euro(total)}.`, en: `That's ${euro(total)}.` }, `Κάνει ${euroSpeech(total)}.`);
      actions.replaceChildren(
        choice(SHOP_FLOW.pay, () => {
          youSay(SHOP_FLOW.pay);
          const r = checkout(ctx.state, shopId, lines);
          if (!r.ok) {
            staffSays(SHOP_FLOW.noMoneyReply);
            ctx.ui.toast(r.error.el, r.error.en, 'error');
            browse();
            return;
          }
          ctx.commit(r, { save: true, toast: false });
          cart.clear();
          const wish = lines.some((l) => l.kind !== 'item') ? `${SHOP_FLOW.thanks.el} ${NEW_THING_WISH.el}` : SHOP_FLOW.thanks.el;
          staffSays({ el: wish, en: lines.some((l) => l.kind !== 'item') ? `${SHOP_FLOW.thanks.en} ${NEW_THING_WISH.en}` : SHOP_FLOW.thanks.en });
          ctx.ui.toast(`−${euro(r.total ?? 0)}`, `Paid. You now have ${euro(ctx.state.money)}.`, 'good');
          actions.replaceChildren(
            choice(SHOP_FLOW.thanks, () => { youSay(SHOP_FLOW.thanks); staffSays(SHOP_FLOW.thanksStaff); setTimeout(close, 500); }, 'thanks'),
            choice({ el: 'Και κάτι ακόμα…', en: 'And something else…' }, () => browse()),
          );
        }, 'pay'),
        choice(SHOP_FLOW.noMoney, () => { youSay(SHOP_FLOW.noMoney); staffSays(SHOP_FLOW.noMoneyReply); browse(); }),
      );
    }, 'howmuch'));
  };

  greetStep();
}
