// Conversation with a resident: their topic, 2–3 replies (all fine), a short
// reaction, and the services they offer (shop, work, parcels, rooms, gifts).

import { NPC_BY_ID, GOODBYES, AGAIN, GIFT_THANKS, type Line } from '../data/npcs';
import { SHOP_BY_ID } from '../data/shops';
import { JOBS, SHIFT_LINES, type JobKind } from '../data/jobs';
import { DELIVERY_LINES } from '../data/deliveries';
import { ITEM_BY_ID } from '../data/items';
import { RECIPE_BY_ID } from '../data/recipes';
import { UI as UIL } from '../data/phrases';
import { recordTalk, giveGift, memory } from '../core/people';
import { whyNotStart, startJob } from '../core/jobs';
import { pickUpParcel, deliverParcel, pickupDef, parcelLabel } from '../core/delivery';
import { isOpen, hoursToday } from '../core/hours';
import { h, en, header } from './dom';
import { greekLine, type Ctx } from './ctx';
import { openShop } from './shop';
import { openRental } from './rental';
import { openJob } from './jobs';

export interface TalkServices { shop?: string; job?: JobKind; rental?: boolean; destId?: string }

export function servicesFor(npcId: string, ctx: Ctx): TalkServices {
  const npc = NPC_BY_ID[npcId];
  const out: TalkServices = {};
  const s = ctx.state;
  if (npc.work) {
    const shop = SHOP_BY_ID[npc.work];
    const atWork = isOpen(shop, s.time);
    if (atWork && shop.catalog && !shop.interior) out.shop = shop.id;
    if (atWork && shop.catalog && shop.interior && ctx.world.areaId() === `int:${shop.id}`) out.shop = shop.id;
    for (const job of Object.values(JOBS)) if (job.boss === npcId) out.job = job.kind;
  }
  if (npcId === 'g46') out.rental = true;
  return out;
}

export function openTalk(ctx: Ctx, npcId: string) {
  const npc = NPC_BY_ID[npcId];
  const today = Math.floor(ctx.state.time / 1440);
  const met = memory(ctx.state, npcId);
  const again = met.lastDay === today;
  const body = h('div', { class: 'talk' });
  const log = h('div', { class: 'talk-log' });
  const choices = h('div', { class: 'choices' });
  const close = () => ctx.ui.close('talk');
  body.append(
    header(npc.name, `${npc.role.en}`, close),
    h('p', { class: 'role' }, h('span', { lang: 'el' }, npc.role.el), ' · ', en(npc.formal ? 'speaks to you politely (εσείς / σας)' : 'speaks casually (εσύ / σου)', 'en small')),
    log,
    choices,
  );
  const npcSays = (line: Line, speak?: string) => log.append(h('div', { class: 'bubble npc' }, greekLine(ctx, line, { cat: 'talk', speaker: npc.name, speak })));
  const youSay = (line: Line) => log.append(h('div', { class: 'bubble you' }, greekLine(ctx, line, { cat: 'talk', speaker: 'Εσύ · You' })));
  const choice = (line: Line, fn: () => void, testid?: string) =>
    h('button', { class: 'choice', 'data-testid': testid, onclick: () => { fn(); } }, h('span', { lang: 'el' }, line.el), ctx.state.settings.translation === 'always' ? en(line.en, 'en small') : null);

  const services = () => {
    const sv = servicesFor(npcId, ctx);
    const list: HTMLElement[] = [];
    if (sv.shop) list.push(choice({ el: 'Θα ήθελα να ψωνίσω.', en: "I'd like to buy something." }, () => { close(); openShop(ctx, sv.shop!, npcId); }, 'shop'));
    if (sv.job) {
      const active = ctx.state.jobs.active;
      if (active?.kind === sv.job) list.push(choice(SHIFT_LINES.resume, () => { close(); openJob(ctx); }, 'job-resume'));
      else list.push(choice(SHIFT_LINES.ask, () => askWork(sv.job!), 'job'));
    }
    for (const d of ctx.state.deliveries.active) {
      if (d.status === 'accepted' && npc.work && pickupDef(d.pickup).shop === npc.work) {
        list.push(choice(DELIVERY_LINES.pickup, () => {
          youSay(DELIVERY_LINES.pickup);
          if (ctx.commit(pickUpParcel(ctx.state, d.id, d.pickup), { save: true })) npcSays(DELIVERY_LINES.pickupReply);
          render();
        }, 'pickup'));
      }
    }
    if (sv.rental) list.push(choice(UIL.rooms, () => { close(); openRental(ctx); }, 'rooms'));
    const food = Object.keys(ctx.state.inventory).filter((id) => id.startsWith('dish:') || id.startsWith('food:'));
    if (food.length) list.push(choice(npc.formal ? UIL.giveGiftFormal : UIL.giveGift, () => giftMenu(food)));
    const bye = npc.formal ? GOODBYES[2] : GOODBYES[1];
    list.push(choice(UIL.sayBye, () => { youSay(UIL.sayBye); setTimeout(close, 350); }, 'bye'));
    list.push(choice(bye, () => { youSay(bye); setTimeout(close, 350); }));
    return list;
  };

  const askWork = (kind: JobKind) => {
    youSay(SHIFT_LINES.ask);
    const why = whyNotStart(ctx.state, kind);
    if (why) {
      npcSays(SHIFT_LINES.notNow);
      npcSays(why);
      render();
      return;
    }
    npcSays(SHIFT_LINES.offer);
    const job = JOBS[kind];
    choices.replaceChildren(
      choice({ el: 'Ναι, ας ξεκινήσουμε!', en: `Yes, let's start! (${job.minutes / 60} h, pay ${job.pay / 100} €)` }, () => {
        if (ctx.commit(startJob(ctx.state, kind), { save: true })) { close(); openJob(ctx); }
      }, 'job-start'),
      choice({ el: 'Όχι τώρα, ευχαριστώ.', en: 'Not now, thanks.' }, () => { youSay({ el: 'Όχι τώρα, ευχαριστώ.', en: 'Not now, thanks.' }); render(); }),
    );
  };

  const giftMenu = (food: string[]) => {
    choices.replaceChildren(...food.map((id) => {
      const name = id.startsWith('dish:') ? RECIPE_BY_ID[id.slice(5)]?.el : ITEM_BY_ID[id]?.el;
      const nameEn = id.startsWith('dish:') ? RECIPE_BY_ID[id.slice(5)]?.en : ITEM_BY_ID[id]?.en;
      return choice({ el: `${name} (×${ctx.state.inventory[id]})`, en: nameEn ?? id }, () => {
        if (ctx.commit(giveGift(ctx.state, npcId, id), { save: true })) { youSay(npc.formal ? UIL.giveGiftFormal : UIL.giveGift); npcSays(GIFT_THANKS); }
        render();
      });
    }), choice(UIL.back, () => render()));
  };

  const render = () => choices.replaceChildren(...services());

  // first line
  if (again) {
    npcSays(npc.formal ? AGAIN.formal : AGAIN.casual);
    choices.replaceChildren(
      choice({ el: 'Τι λέγατε πριν;', en: 'What were you saying before? (hear the topic again)' }, () => { npcSays(npc.topic); topicReplies(); }),
      ...services(),
    );
  } else {
    npcSays(npc.topic);
    topicReplies();
  }

  function topicReplies() {
    choices.replaceChildren(
      ...npc.replies.map((r, i) => choice(r.say, () => {
        youSay(r.say);
        npcSays(r.react);
        const gotBefore = memory(ctx.state, npcId).gotGift;
        ctx.commit(recordTalk(ctx.state, npcId, i), { save: false, toast: false });
        if (r.gift && !gotBefore && memory(ctx.state, npcId).gotGift) ctx.ui.toast(`+1 ${RECIPE_BY_ID[r.gift.slice(5)]?.el ?? ''}`, `You received ${RECIPE_BY_ID[r.gift.slice(5)]?.en ?? 'a gift'}.`, 'good');
        render();
      }, `reply-${i}`)),
      ...services(),
    );
    if (!again) ctx.commit(recordTalk(ctx.state, npcId, null), { save: false, toast: false });
  }

  // a closed workplace: say when it opens
  if (npc.work && SHOP_BY_ID[npc.work]?.week && !isOpen(npc.work, ctx.state.time)) {
    const hrs = hoursToday(npc.work, ctx.state.time);
    log.append(h('p', { class: 'hint', lang: 'en' }, `${SHOP_BY_ID[npc.work].en}: closed now. ${hrs ? `Today: ${hrs}` : 'Closed today.'}`));
  }
  ctx.ui.open('talk', body, { className: 'talk-panel' });
  void parcelLabel;
}
