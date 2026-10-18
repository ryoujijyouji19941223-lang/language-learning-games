// Shifts at the café, bakery and taverna (SPEC §11). A shift can be paused and
// resumed. Pay and time are added exactly once, when the shift is finished.
// Mistakes are not punished: the customer repeats or corrects and you try again.

import {
  JOBS, CAFE_ORDERS, BAKERY_ORDERS, TAVERNA_ORDERS, CAFE_LINES, TAVERNA_LINES, BAKERY_LINES, BAKES,
  type JobKind, type Drink, type Sugar, type Where, type Bake,
} from '../data/jobs';
import type { Line } from '../data/npcs';
import { dateOf } from './calendar';
import { isOpen } from './hours';
import { rng } from './geo';
import { advance } from './time';
import { euro } from './money';
import { tx, fail, addInventory, logEvent, type GameState, type JobSession } from './state';

export function whyNotStart(s: GameState, kind: JobKind): Line | null {
  const job = JOBS[kind];
  if (s.jobs.active && s.jobs.active.kind !== kind) return { el: 'Έχεις ήδη άλλη βάρδια.', en: 'You are in the middle of another shift.' };
  if (s.jobs.active) return null;
  if (!isOpen(job.shop, s.time)) return { el: 'Το μαγαζί είναι κλειστό.', en: 'The shop is closed now.' };
  const m = dateOf(s.time).minuteOfDay;
  if (m < job.startFrom || m > job.startTo) {
    const from = `${String(Math.floor(job.startFrom / 60)).padStart(2, '0')}:${String(job.startFrom % 60).padStart(2, '0')}`;
    const to = `${String(Math.floor(job.startTo / 60)).padStart(2, '0')}:${String(job.startTo % 60).padStart(2, '0')}`;
    return { el: `Η βάρδια ξεκινάει ${from}–${to}.`, en: `This shift starts between ${from} and ${to}.` };
  }
  return null;
}

function pickOrders<T extends { id: string }>(list: T[], n: number, seed: number): string[] {
  const r = rng(seed);
  const pool = [...list];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
  return out;
}

export function startJob(state: GameState, kind: JobKind) {
  return tx(state, (s) => {
    if (s.jobs.active?.kind === kind) return;
    const why = whyNotStart(s, kind);
    if (why) fail(why.el, why.en);
    const job = JOBS[kind];
    const seed = s.jobs.seq * 101 + Math.floor(s.time / 1440) * 7 + kind.length;
    const session: JobSession = {
      id: `j${s.jobs.seq++}`, kind, startedAt: s.time, orders: [], index: 0, amendAt: null, shelved: [], tables: [],
    };
    if (kind === 'cafe') {
      session.orders = pickOrders(CAFE_ORDERS, job.customers, seed);
      // one customer (not the first) may change the sugar to μέτριο after ordering
      const amendable = session.orders.findIndex((id, i) => i >= 1 && CAFE_ORDERS.find((o) => o.id === id)?.amendable);
      session.amendAt = amendable >= 1 ? amendable : null;
    } else if (kind === 'bakery') {
      session.orders = pickOrders(BAKERY_ORDERS, job.customers, seed);
    } else {
      const n = 2 + (seed % 2);
      session.orders = pickOrders(TAVERNA_ORDERS, n, seed);
      session.tables = session.orders.map((order) => ({ order, water: false, served: false }));
    }
    s.jobs.active = session;
  });
}

// ── Café ──────────────────────────────────────────────────────────────
export interface CafeTray { cups: { drink: Drink; sugar: Sugar }[]; water: boolean; where: Where | null; askedWhere: boolean }

export function cafeExpected(session: JobSession) {
  const order = CAFE_ORDERS.find((o) => o.id === session.orders[session.index])!;
  const amended = session.amendAt === session.index;
  const cups = order.cups.map((c) => ({ ...c, sugar: amended ? ('metrio' as Sugar) : c.sugar }));
  return { order, amended, cups, where: order.where ?? order.answer!, water: order.water };
}

/** null when the tray matches; otherwise the customer's short correction. */
export function checkCafe(session: JobSession, tray: CafeTray): Line | null {
  const exp = cafeExpected(session);
  if (!exp.order.where && !tray.askedWhere) return CAFE_LINES.noWhere;
  const key = (c: { drink: string; sugar: string }) => `${c.drink}/${c.sugar}`;
  const want = exp.cups.map(key).sort();
  const got = tray.cups.map(key).sort();
  if (want.length !== got.length) return CAFE_LINES.wrongCount;
  const wantDrinks = exp.cups.map((c) => c.drink).sort().join();
  const gotDrinks = tray.cups.map((c) => c.drink).sort().join();
  if (wantDrinks !== gotDrinks) return CAFE_LINES.wrongDrink;
  if (want.join() !== got.join()) return CAFE_LINES.wrongSugar;
  if (exp.water && !tray.water) return CAFE_LINES.water;
  if (!exp.water && tray.water) return CAFE_LINES.extraWater;
  if (tray.where !== exp.where) return CAFE_LINES.wrongWhere(exp.where);
  return null;
}

/** Hand over a café order. Correct → next customer; wrong → a correction (no change). */
export function serveCafe(state: GameState, tray: CafeTray) {
  return tx(state, (s) => {
    const j = s.jobs.active;
    if (!j || j.kind !== 'cafe') fail('Δεν δουλεύεις τώρα.', 'You are not on a café shift.');
    if (j!.index >= j!.orders.length) fail('Τελείωσαν οι πελάτες.', 'No more customers.');
    const problem = checkCafe(j!, tray);
    if (problem) return { msg: problem, total: 0 };
    j!.index++;
    return { msg: CAFE_LINES.thanks, total: 1 };
  });
}

// ── Bakery ────────────────────────────────────────────────────────────
export const BAKE_LIST = Object.keys(BAKES) as Bake[];

export function shelveBake(state: GameState, bake: Bake, shelf: Bake) {
  return tx(state, (s) => {
    const j = s.jobs.active;
    if (!j || j.kind !== 'bakery') fail('Δεν δουλεύεις τώρα.', 'You are not on a bakery shift.');
    if (j!.shelved.includes(bake)) return;
    if (bake !== shelf) return { msg: BAKERY_LINES.wrongShelf, total: 0 };
    j!.shelved.push(bake);
    return { msg: { el: `${BAKES[bake].many}: στο ράφι!`, en: 'On the shelf!' }, total: 1 };
  });
}

export function checkBakery(session: JobSession, bag: Partial<Record<Bake, number>>): Line | null {
  const order = BAKERY_ORDERS.find((o) => o.id === session.orders[session.index])!;
  for (const b of BAKE_LIST) if ((order.items[b] ?? 0) !== (bag[b] ?? 0)) return BAKERY_LINES.wrong;
  return null;
}

export function serveBakery(state: GameState, bag: Partial<Record<Bake, number>>) {
  return tx(state, (s) => {
    const j = s.jobs.active;
    if (!j || j.kind !== 'bakery') fail('Δεν δουλεύεις τώρα.', 'You are not on a bakery shift.');
    if (j!.shelved.length < BAKE_LIST.length) fail('Πρώτα τα ράφια.', 'Fill the shelves first.');
    if (j!.index >= j!.orders.length) fail('Τελείωσαν οι πελάτες.', 'No more customers.');
    const problem = checkBakery(j!, bag);
    if (problem) return { msg: problem, total: 0 };
    j!.index++;
    return { msg: BAKERY_LINES.thanks, total: 1 };
  });
}

// ── Taverna ───────────────────────────────────────────────────────────
export function tavernaWater(state: GameState, table: number) {
  return tx(state, (s) => {
    const j = s.jobs.active;
    if (!j || j.kind !== 'taverna' || !j.tables[table]) fail('Δεν δουλεύεις τώρα.', 'You are not on a taverna shift.');
    j!.tables[table].water = true;
    return TAVERNA_LINES.waterThanks;
  });
}

export function checkTaverna(session: JobSession, table: number, tray: Record<string, number>): Line | null {
  const t = session.tables[table];
  const order = TAVERNA_ORDERS.find((o) => o.id === t.order)!;
  for (const [dish, n] of Object.entries(tray)) if (n > (order.dishes[dish] ?? 0)) return TAVERNA_LINES.wrong;
  for (const [dish, n] of Object.entries(order.dishes)) if ((tray[dish] ?? 0) < n) return TAVERNA_LINES.missing;
  return null;
}

export function serveTaverna(state: GameState, table: number, tray: Record<string, number>) {
  return tx(state, (s) => {
    const j = s.jobs.active;
    if (!j || j.kind !== 'taverna' || !j.tables[table]) fail('Δεν δουλεύεις τώρα.', 'You are not on a taverna shift.');
    const t = j!.tables[table];
    if (t.served) fail('Αυτό το τραπέζι έχει φάει.', 'This table is already served.');
    if (!t.water) return { msg: TAVERNA_LINES.waterFirst, total: 0 };
    const problem = checkTaverna(j!, table, tray);
    if (problem) return { msg: problem, total: 0 };
    t.served = true;
    return { msg: TAVERNA_LINES.served, total: 1 };
  });
}

// ── Finishing ─────────────────────────────────────────────────────────
export function jobDone(j: JobSession): boolean {
  if (j.kind === 'taverna') return j.tables.length > 0 && j.tables.every((t) => t.served);
  if (j.kind === 'bakery') return j.shelved.length === BAKE_LIST.length && j.index >= j.orders.length;
  return j.index >= j.orders.length;
}

export function finishJob(state: GameState) {
  return tx(state, (s) => {
    const j = s.jobs.active;
    if (!j) fail('Δεν δουλεύεις τώρα.', 'No shift in progress.');
    if (!jobDone(j!)) fail('Δεν τελείωσε ακόμα η βάρδια.', 'The shift is not finished yet.');
    const job = JOBS[j!.kind];
    s.money += job.pay;
    if (job.bonusItem) addInventory(s, job.bonusItem, 1);
    s.jobs.history.unshift({ id: j!.id, kind: j!.kind, at: s.time, pay: job.pay });
    s.jobs.history.length = Math.min(s.jobs.history.length, 60);
    s.jobs.active = null;
    s.stats.shifts++;
    advance(s, job.minutes);
    const msg = { el: `Τέλος βάρδιας: +${euro(job.pay)}`, en: `Shift done: +${euro(job.pay)}, ${job.minutes / 60} hours passed.` };
    logEvent(s, msg);
    return { msg, total: job.pay };
  });
}

export function quitJob(state: GameState) {
  return tx(state, (s) => {
    if (!s.jobs.active) return;
    s.jobs.active = null;
    return { el: 'Σταμάτησες τη βάρδια χωρίς πληρωμή.', en: 'You left the shift without pay. No other penalty.' };
  });
}
