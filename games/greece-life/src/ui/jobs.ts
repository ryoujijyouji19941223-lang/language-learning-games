// Shift panels. Listening is offered with 🔊; without a Greek voice the text is
// shown and the result is not counted as listening.

import {
  JOBS, CAFE_ORDERS, CAFE_LINES, DRINKS, SUGARS, WHERE, BAKES, BAKERY_ORDERS, BAKERY_LINES,
  TAVERNA_ORDERS, TAVERNA_DISHES, TAVERNA_LINES, SHIFT_LINES, type Drink, type Sugar, type Where, type Bake,
} from '../data/jobs';
import type { Line } from '../data/npcs';
import { NPC_BY_ID } from '../data/npcs';
import { serveCafe, cafeExpected, finishJob, quitJob, jobDone, shelveBake, serveBakery, BAKE_LIST, tavernaWater, serveTaverna, type CafeTray } from '../core/jobs';
import { h, en, header, button, ask } from './dom';
import { greekLine, type Ctx } from './ctx';

const CUSTOMER_NAMES = ['Πελάτισσα', 'Πελάτης', 'Πελάτισσα', 'Πελάτης', 'Πελάτισσα'];

export function openJob(ctx: Ctx) {
  const j = ctx.state.jobs.active;
  if (!j) return;
  if (j.kind === 'cafe') cafe(ctx);
  else if (j.kind === 'bakery') bakery(ctx);
  else taverna(ctx);
}

function shell(ctx: Ctx, title: Line, onLeave: () => void) {
  const body = h('div', { class: 'job' });
  body.append(header(title.el, `${title.en} — Esc pauses the shift; talk to the boss to continue`, onLeave));
  return body;
}

function finishBlock(ctx: Ctx, area: HTMLElement) {
  const j = ctx.state.jobs.active!;
  const job = JOBS[j.kind];
  area.append(
    greekLine(ctx, SHIFT_LINES.done, { cat: 'work', speaker: NPC_BY_ID[job.boss].name }),
    button('Τέλος βάρδιας', () => {
      if (ctx.commit(finishJob(ctx.state), { save: true })) ctx.ui.close('job');
    }, { cls: 'btn primary', enLabel: `Finish shift: +${job.pay / 100} €, ${job.minutes / 60} h pass`, testid: 'finish-shift' }),
  );
}

function quitButton(ctx: Ctx) {
  return button('Φεύγω', () => {
    ask(ctx.ui, 'Φεύγεις χωρίς πληρωμή;', 'Leave the shift without pay? (No other penalty.)', 'Ναι, φεύγω', () => {
      ctx.commit(quitJob(ctx.state), { save: true });
      ctx.ui.close('job');
    }, 'Yes, leave');
  }, { cls: 'btn ghost', enLabel: 'Quit without pay' });
}

/** Records how the order was understood: heard with a real voice, or read. */
function recordUnderstanding(ctx: Ctx, line: Line, heard: boolean) {
  ctx.note(line.el, line.en, 'work', heard ? 'listened' : 'selected');
}

// ── Café ──────────────────────────────────────────────────────────────
function cafe(ctx: Ctx) {
  const body = shell(ctx, JOBS.cafe, () => ctx.ui.close('job'));
  const stage = h('div', { class: 'stage' });
  body.append(stage, quitButton(ctx));
  ctx.ui.open('job', body, { className: 'wide job-panel' });
  let tray: CafeTray = { cups: [], water: false, where: null, askedWhere: false };
  let drink: Drink | null = null;
  let heard = false;
  let amendShown = false;

  const render = () => {
    const j = ctx.state.jobs.active;
    if (!j) { ctx.ui.close('job'); return; }
    stage.replaceChildren();
    if (jobDone(j)) { finishBlock(ctx, stage); return; }
    const exp = cafeExpected(j);
    const order = CAFE_ORDERS.find((o) => o.id === j.orders[j.index])!;
    const who = `${CUSTOMER_NAMES[j.index % CUSTOMER_NAMES.length]} ${j.index + 1}/${j.orders.length}`;
    const hide = ctx.state.settings.translation === 'demand' && ctx.speech.greekVoices().length > 0;
    const listen = h('div', { class: 'order' }, greekLine(ctx, order.line, { cat: 'work', speaker: who, hideText: hide, big: true }));
    listen.addEventListener('click', (e) => { if ((e.target as HTMLElement).dataset.testid === 'play') heard = ctx.speech.greekVoices().length > 0; });
    stage.append(listen);
    if (exp.amended && tray.cups.length > 0) {
      if (!amendShown) amendShown = true;
      stage.append(greekLine(ctx, CAFE_LINES.amend, { cat: 'work', speaker: who }));
    }
    if (tray.askedWhere && !order.where) stage.append(greekLine(ctx, CAFE_LINES.answer[order.answer!], { cat: 'work', speaker: who }));
    const pick = <T extends string>(title: string, titleEn: string, map: Record<T, Line>, current: T | null, onPick: (k: T) => void, testPrefix: string) =>
      h('div', { class: 'pick' }, h('h4', null, h('span', { lang: 'el' }, title), ' ', en(titleEn, 'en small')),
        h('div', { class: 'row' }, ...(Object.keys(map) as T[]).map((k) => h('button', { class: `opt${current === k ? ' on' : ''}`, 'data-testid': `${testPrefix}-${k}`, onclick: () => onPick(k) },
          h('span', { lang: 'el' }, map[k].el), ctx.state.settings.translation === 'always' ? en(map[k].en, 'en small') : null))));
    stage.append(
      pick('Ρόφημα', 'drink', DRINKS, drink, (k) => { drink = k; render(); }, 'drink'),
      pick('Ζάχαρη', 'sugar — adds the cup to the tray', SUGARS, null, (k: Sugar) => {
        if (!drink) { ctx.ui.toast('Διάλεξε ρόφημα πρώτα.', 'Choose a drink first.'); return; }
        tray.cups.push({ drink, sugar: k });
        render();
      }, 'sugar'),
      h('div', { class: 'pick' }, h('h4', null, h('span', { lang: 'el' }, 'Δίσκος'), ' ', en('tray', 'en small')),
        h('ul', { class: 'tray' }, ...tray.cups.map((c, i) => h('li', null, h('span', { lang: 'el' }, `${DRINKS[c.drink].el} · ${SUGARS[c.sugar].el}`),
          h('button', { class: 'icon', 'aria-label': 'remove', onclick: () => { tray.cups.splice(i, 1); render(); } }, '✕'))),
          tray.water ? h('li', null, h('span', { lang: 'el' }, 'νερό'), h('button', { class: 'icon', onclick: () => { tray.water = false; render(); } }, '✕')) : null),
        h('div', { class: 'row' },
          button('+ νερό', () => { tray.water = true; render(); }, { enLabel: 'add a water', testid: 'water' }),
          button(CAFE_LINES.askWhere.el, () => { tray.askedWhere = true; render(); }, { enLabel: 'ask: for here or to go?', testid: 'ask-where' }))),
      pick('Πού;', 'here or to go', WHERE, tray.where, (k: Where) => { tray.where = k; render(); }, 'where'),
      h('div', { class: 'row' }, button('Δώσε την παραγγελία', () => {
        const r = serveCafe(ctx.state, tray);
        if (!r.ok) { ctx.ui.toast(r.error.el, r.error.en, 'error'); return; }
        if (r.total) {
          ctx.commit(r, { save: true, toast: false });
          recordUnderstanding(ctx, order.line, heard);
          ctx.ui.toast(CAFE_LINES.thanks.el, CAFE_LINES.thanks.en, 'good');
          tray = { cups: [], water: false, where: null, askedWhere: false };
          drink = null;
          heard = false;
          amendShown = false;
        } else {
          stage.prepend(greekLine(ctx, r.msg!, { cat: 'work', speaker: who }));
          ctx.ui.toast(r.msg!.el, `${r.msg!.en} Try again.`);
          return;
        }
        render();
      }, { cls: 'btn primary', enLabel: 'Hand over the order', testid: 'serve' })),
    );
  };
  render();
}

// ── Bakery ────────────────────────────────────────────────────────────
function bakery(ctx: Ctx) {
  const body = shell(ctx, JOBS.bakery, () => ctx.ui.close('job'));
  const stage = h('div', { class: 'stage' });
  body.append(stage, quitButton(ctx));
  ctx.ui.open('job', body, { className: 'wide job-panel' });
  let holding: Bake | null = null;
  let bag: Partial<Record<Bake, number>> = {};
  let heard = false;
  const render = () => {
    const j = ctx.state.jobs.active;
    if (!j) { ctx.ui.close('job'); return; }
    stage.replaceChildren();
    if (jobDone(j)) { finishBlock(ctx, stage); return; }
    if (j.shelved.length < BAKE_LIST.length) {
      stage.append(
        greekLine(ctx, BAKERY_LINES.shelvesIntro, { cat: 'work', speaker: NPC_BY_ID.g16.name }),
        h('h4', null, h('span', { lang: 'el' }, 'Ταψί'), ' ', en('tray from the oven — pick one, then click its shelf (read the labels)', 'en small')),
        h('div', { class: 'row' }, ...BAKE_LIST.filter((b) => !j.shelved.includes(b)).map((b) => h('button', { class: `opt big${holding === b ? ' on' : ''}`, 'data-testid': `tray-${b}`, onclick: () => { holding = b; render(); } }, BAKES[b].emoji))),
        h('h4', null, h('span', { lang: 'el' }, 'Ράφια'), ' ', en('shelves', 'en small')),
        h('div', { class: 'shelves' }, ...BAKE_LIST.map((b) => h('button', { class: `shelf${j.shelved.includes(b) ? ' full' : ''}`, 'data-testid': `shelf-${b}`, onclick: () => {
          if (!holding) return;
          const r = shelveBake(ctx.state, holding, b);
          if (r.ok && r.total) { ctx.commit(r, { save: false, toast: false }); ctx.note(BAKES[b].sign, BAKES[b].one.en, 'work', 'selected'); holding = null; }
          else if (r.ok) ctx.ui.toast(r.msg!.el, r.msg!.en, 'error');
          render();
        } }, h('span', { class: 'sign-text', lang: 'el' }, BAKES[b].sign), j.shelved.includes(b) ? h('span', { class: 'shelf-fill' }, BAKES[b].emoji.repeat(3)) : null))),
      );
      return;
    }
    const order = BAKERY_ORDERS.find((o) => o.id === j.orders[j.index])!;
    const who = `${CUSTOMER_NAMES[j.index % CUSTOMER_NAMES.length]} ${j.index + 1}/${j.orders.length}`;
    const hide = ctx.state.settings.translation === 'demand' && ctx.speech.greekVoices().length > 0;
    const line = greekLine(ctx, order.line, { cat: 'work', speaker: who, hideText: hide, big: true });
    line.addEventListener('click', (e) => { if ((e.target as HTMLElement).dataset.testid === 'play') heard = ctx.speech.greekVoices().length > 0; });
    stage.append(line,
      h('h4', null, h('span', { lang: 'el' }, 'Σακούλα'), ' ', en('bag: put in the right number of each', 'en small')),
      h('div', { class: 'catalog small' }, ...BAKE_LIST.map((b) => h('div', { class: 'item' },
        h('div', { class: 'icon-big' }, BAKES[b].emoji),
        h('div', { class: 'item-name', lang: 'el' }, BAKES[b].one.el),
        ctx.state.settings.translation === 'always' ? en(BAKES[b].one.en, 'en small') : null,
        h('div', { class: 'stepper' },
          h('button', { class: 'icon', onclick: () => { bag[b] = Math.max(0, (bag[b] ?? 0) - 1); render(); } }, '−'),
          h('span', { class: 'qty' }, String(bag[b] ?? 0)),
          h('button', { class: 'icon', 'data-testid': `bag-${b}`, onclick: () => { bag[b] = (bag[b] ?? 0) + 1; render(); } }, '+'))))),
      button('Ορίστε!', () => {
        const r = serveBakery(ctx.state, bag);
        if (!r.ok) { ctx.ui.toast(r.error.el, r.error.en, 'error'); return; }
        if (r.total) {
          ctx.commit(r, { save: true, toast: false });
          recordUnderstanding(ctx, order.line, heard);
          ctx.ui.toast(BAKERY_LINES.thanks.el, BAKERY_LINES.thanks.en, 'good');
          bag = {};
          heard = false;
        } else {
          ctx.ui.toast(r.msg!.el, `${r.msg!.en} Listen again and fix the bag.`, 'error');
        }
        render();
      }, { cls: 'btn primary', enLabel: 'Here you are! (hand over the bag)', testid: 'serve' }));
  };
  render();
}

// ── Taverna ───────────────────────────────────────────────────────────
function taverna(ctx: Ctx) {
  const body = shell(ctx, JOBS.taverna, () => ctx.ui.close('job'));
  const stage = h('div', { class: 'stage' });
  body.append(stage, quitButton(ctx));
  ctx.ui.open('job', body, { className: 'wide job-panel' });
  let trayFor: number | null = null;
  let tray: Record<string, number> = {};
  const render = () => {
    const j = ctx.state.jobs.active;
    if (!j) { ctx.ui.close('job'); return; }
    stage.replaceChildren();
    if (jobDone(j)) { finishBlock(ctx, stage); return; }
    stage.append(h('p', { class: 'hint', lang: 'en' }, 'Custom here: bring water and bread to a new table first. Then take the order, collect the dishes from the kitchen pass and carry them to the table.'));
    const tables = h('div', { class: 'tables' });
    j.tables.forEach((t, i) => {
      const order = TAVERNA_ORDERS.find((o) => o.id === t.order)!;
      const card = h('div', { class: `table-card${t.served ? ' done' : ''}` }, h('h4', null, h('span', { lang: 'el' }, `Τραπέζι ${i + 1}`), ' ', en(`table ${i + 1}`, 'en small')));
      if (t.served) card.append(greekLine(ctx, TAVERNA_LINES.served, { cat: 'work' }));
      else if (!t.water) {
        card.append(greekLine(ctx, TAVERNA_LINES.waterFirst, { cat: 'work' }),
          button('Νερό και ψωμί', () => { if (ctx.commit(tavernaWater(ctx.state, i), { save: false })) render(); }, { enLabel: 'bring water & bread', testid: `water-${i}` }));
      } else {
        card.append(greekLine(ctx, TAVERNA_LINES.ready, { cat: 'work' }), greekLine(ctx, order.line, { cat: 'work', big: true }),
          button('Στην κουζίνα', () => { trayFor = i; tray = {}; render(); }, { enLabel: 'go to the kitchen for this table', testid: `kitchen-${i}` }));
      }
      tables.append(card);
    });
    stage.append(tables);
    if (trayFor !== null && !j.tables[trayFor].served) {
      const i = trayFor;
      stage.append(h('div', { class: 'kitchen' },
        greekLine(ctx, TAVERNA_LINES.kitchen, { cat: 'work', speaker: NPC_BY_ID.g14.name }),
        h('div', { class: 'row wrap' }, ...Object.entries(TAVERNA_DISHES).map(([id, line]) => h('button', { class: 'opt', 'data-testid': `dish-${id}`, onclick: () => { tray[id] = (tray[id] ?? 0) + 1; render(); } },
          h('span', { lang: 'el' }, line.el), ctx.state.settings.translation === 'always' ? en(line.en, 'en small') : null))),
        h('p', null, h('span', { lang: 'el' }, 'Δίσκος: '), Object.entries(tray).map(([id, n]) => `${n} × ${TAVERNA_DISHES[id].el}`).join(', ') || en('empty', 'en small'),
          h('button', { class: 'icon', title: 'empty the tray', onclick: () => { tray = {}; render(); } }, '↺')),
        button(`Πήγαινε στο τραπέζι ${i + 1}`, () => {
          const r = serveTaverna(ctx.state, i, tray);
          if (!r.ok) { ctx.ui.toast(r.error.el, r.error.en, 'error'); return; }
          if (r.total) { ctx.commit(r, { save: true, toast: false }); ctx.note(TAVERNA_ORDERS.find((o) => o.id === j.tables[i].order)!.line.el, '', 'work', 'selected'); trayFor = null; tray = {}; }
          else ctx.ui.toast(r.msg!.el, r.msg!.en, 'error');
          render();
        }, { cls: 'btn primary', enLabel: `carry the tray to table ${i + 1}`, testid: `serve-${i}` })));
    }
  };
  render();
}
