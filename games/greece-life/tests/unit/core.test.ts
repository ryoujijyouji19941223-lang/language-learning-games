import { describe, it, expect } from 'vitest';
import { newGame } from '../../src/core/state';
import { checkout, sell, priceAt } from '../../src/core/shop';
import { rentHome, placeFurniture, storeFurniture, checkPaths, placementProblem, arrangement, restoreArrangement, hasGrill } from '../../src/core/housing';
import { startCooking, nextStep, finishCooking, cancelCooking } from '../../src/core/cooking';
import { startJob, serveCafe, cafeExpected, finishJob, shelveBake, serveBakery, tavernaWater, serveTaverna, BAKE_LIST } from '../../src/core/jobs';
import { acceptDelivery, pickUpParcel, deliverParcel, cancelDelivery, refreshOffers } from '../../src/core/delivery';
import { advance, sleep, restDays } from '../../src/core/time';
import { dateOf, START_TIME } from '../../src/core/calendar';
import { isOpen } from '../../src/core/hours';
import { euro, euroSpeech } from '../../src/core/money';
import { HOME_BY_ID } from '../../src/data/homes';
import { RECIPE_BY_ID } from '../../src/data/recipes';
import { BAKERY_ORDERS, TAVERNA_ORDERS } from '../../src/data/jobs';
import { must, withHome, at, fresh } from './helpers';

describe('money and calendar', () => {
  it('shows euros the Greek way and speaks them', () => {
    expect(euro(350).replace(/\s/g, ' ')).toBe('3,50 €');
    expect(euroSpeech(350)).toBe('τρία ευρώ και πενήντα λεπτά');
    expect(euroSpeech(100)).toBe('ένα ευρώ');
    expect(euroSpeech(22000)).toBe('διακόσια είκοσι ευρώ');
  });
  it('starts on Friday 1 May, year 1, 08:00', () => {
    const d = dateOf(START_TIME);
    expect([d.year, d.month, d.day, d.weekday, d.hour]).toEqual([1, 4, 1, 4, 8]);
  });
  it('small shops close for the afternoon break and reopen on Tue/Thu/Fri evenings', () => {
    // 1 May is a Friday
    expect(isOpen('agora_greengrocer', at(4, 1, 10))).toBe(true);
    expect(isOpen('agora_greengrocer', at(4, 1, 16))).toBe(false);
    expect(isOpen('agora_greengrocer', at(4, 1, 18))).toBe(true);
    expect(isOpen('agora_greengrocer', at(4, 3, 10))).toBe(false); // Sunday
    expect(isOpen('agora_laiki', at(4, 2, 9))).toBe(true); // Saturday
    expect(isOpen('beach_kantina', at(4, 1, 12))).toBe(false); // only June–September
    expect(isOpen('beach_kantina', at(6, 1, 12))).toBe(true);
  });
});

describe('shopping is one transaction (SPEC §10)', () => {
  it('pays, takes stock and fills the bag together', () => {
    const s = fresh();
    const r = must(checkout(s, 'agora_greengrocer', [{ kind: 'item', id: 'tomato', qty: 2 }, { kind: 'item', id: 'cucumber', qty: 1 }]));
    expect(r.total).toBe(170);
    expect(r.state.money).toBe(s.money - 170);
    expect(r.state.inventory.tomato).toBe(2);
    expect(r.state.stock.left['agora_greengrocer:tomato']).toBe(18);
    expect(s.inventory.tomato).toBeUndefined(); // original untouched
  });
  it('without enough money nothing changes', () => {
    const s = fresh();
    s.money = 100;
    const r = checkout(s, 'agora_furniture', [{ kind: 'furniture', id: 'f04', qty: 1 }, { kind: 'furniture', id: 'f20', qty: 1 }]);
    expect(r.ok).toBe(false);
    expect(s.money).toBe(100);
    expect(s.furniture).toHaveLength(0);
  });
  it('closed shops do not sell; laiki is cheaper', () => {
    const s = fresh();
    s.time = at(4, 3, 10); // Sunday
    expect(checkout(s, 'agora_greengrocer', [{ kind: 'item', id: 'tomato', qty: 1 }]).ok).toBe(false);
    expect(priceAt('agora_laiki', 'item', 'tomato')).toBeLessThan(priceAt('agora_greengrocer', 'item', 'tomato'));
  });
  it('clothes are bought once; sold back at half price only when not worn', () => {
    const s = fresh();
    const r = must(checkout(s, 'agora_clothes', [{ kind: 'clothes', id: 'c18', qty: 1 }]));
    expect(checkout(r.state, 'agora_clothes', [{ kind: 'clothes', id: 'c18', qty: 1 }]).ok).toBe(false);
    expect(sell(r.state, 'agora_clothes', [{ kind: 'clothes', ref: 'c01' }]).ok).toBe(false); // worn
    const sold = must(sell(r.state, 'agora_clothes', [{ kind: 'clothes', ref: 'c18' }]));
    expect(sold.total).toBe(900);
  });
});

describe('housing (SPEC §6–7)', () => {
  it('first room: one home, starting furniture placed, curtains for each window', () => {
    const s = must(rentHome(newGame(), 'h03')).state;
    expect(s.home).toBe('h03');
    expect(s.money).toBe(15000);
    expect(s.furniture.filter((f) => f.id === 'f35')).toHaveLength(2);
    expect(s.furniture.filter((f) => f.place).length).toBe(5);
    expect(checkPaths(HOME_BY_ID.h03, s.furniture)).toBeNull();
  });
  it('moving keeps every piece of furniture (in the storage box) and costs 20 €', () => {
    let s = withHome('h01');
    s = must(checkout(s, 'agora_furniture', [{ kind: 'furniture', id: 'f19', qty: 1 }])).state;
    const count = s.furniture.length;
    const moved = must(rentHome(s, 'h04')).state;
    expect(moved.home).toBe('h04');
    expect(moved.furniture).toHaveLength(count);
    expect(moved.furniture.every((f) => f.place === null)).toBe(true);
    expect(moved.money).toBe(s.money - 2000);
  });
  it('moving without money fails and keeps the old home', () => {
    const s = withHome('h01');
    s.money = 500;
    const r = rentHome(s, 'h02');
    expect(r.ok).toBe(false);
    expect(s.home).toBe('h01');
  });
  it('refuses floor furniture that blocks the door or cuts off the kitchen', () => {
    let s = withHome('h01');
    s.money = 100000;
    s = must(checkout(s, 'agora_furniture', [{ kind: 'furniture', id: 'f12', qty: 1 }, { kind: 'furniture', id: 'f08', qty: 1 }])).state;
    const shelf = s.furniture.find((f) => f.id === 'f12')!;
    // door of h01 is on the south wall at columns 4–5
    expect(placementProblem(HOME_BY_ID.h01, s.furniture, shelf.uid, { k: 'floor', area: 'main', x: 4, z: 7, r: 0 })).not.toBeNull();
    const sofa = s.furniture.find((f) => f.id === 'f08')!;
    // a 4-wide sofa across the room at z=2 would cut the kitchen off from the door
    const across = placementProblem(HOME_BY_ID.h01, s.furniture.map((f) => (f.id === 'f01' || f.id === 'f03' || f.id === 'f04' ? { ...f, place: null } : f)), sofa.uid, { k: 'floor', area: 'main', x: 0, z: 2, r: 0 });
    expect(across).toBeNull(); // still a 2-cell gap at x=4..5
    expect(placeFurniture(s, shelf.uid, { k: 'floor', area: 'main', x: 4, z: 7, r: 0 }).ok).toBe(false);
  });
  it('wall decor is not removed by placing a desk under it; desk-top items move to storage with the desk', () => {
    let s = withHome('h01');
    s = must(checkout(s, 'agora_furniture', [{ kind: 'furniture', id: 'f28', qty: 1 }])).state;
    s = must(checkout(s, 'agora_home', [{ kind: 'furniture', id: 'f40', qty: 1 }])).state;
    const clock = s.furniture.find((f) => f.id === 'f28')!;
    const desk = s.furniture.find((f) => f.id === 'f03')!;
    const lantern = s.furniture.find((f) => f.id === 'f40')!;
    s = must(placeFurniture(s, clock.uid, { k: 'wall', wall: 'w', c: 4, row: 2 })).state;
    s = must(placeFurniture(s, desk.uid, { k: 'floor', area: 'main', x: 0, z: 4, r: 0 })).state;
    expect(s.furniture.find((f) => f.uid === clock.uid)!.place).toEqual({ k: 'wall', wall: 'w', c: 4, row: 2 });
    s = must(placeFurniture(s, lantern.uid, { k: 'anchor', host: desk.uid, i: 0 })).state;
    const stored = must(storeFurniture(s, desk.uid)).state;
    expect(stored.furniture.find((f) => f.uid === lantern.uid)!.place).toBeNull();
    expect(stored.furniture.find((f) => f.uid === clock.uid)!.place).not.toBeNull();
  });
  it('outdoor area takes only pots and outdoor furniture; undo restores the arrangement', () => {
    let s = withHome('h02');
    s = must(checkout(s, 'agora_florist', [{ kind: 'furniture', id: 'f21', qty: 1 }])).state;
    const basil = s.furniture.find((f) => f.id === 'f21')!;
    const chair = s.furniture.find((f) => f.id === 'f04')!;
    expect(placeFurniture(s, chair.uid, { k: 'floor', area: 'out', x: 3, z: 1, r: 0 }).ok).toBe(false);
    const before = arrangement(s);
    s = must(placeFurniture(s, basil.uid, { k: 'floor', area: 'out', x: 3, z: 1, r: 0 })).state;
    expect(s.furniture.find((f) => f.uid === basil.uid)!.place).not.toBeNull();
    s = must(restoreArrangement(s, before)).state;
    expect(s.furniture.find((f) => f.uid === basil.uid)!.place).toBeNull();
  });
  it('the grill counts only when placed outside (h02/h04); h01/h03 have a griddle', () => {
    expect(hasGrill(withHome('h01'))).toBe(true);
    let s = withHome('h04');
    expect(hasGrill(s)).toBe(false);
    s = must(checkout(s, 'agora_furniture', [{ kind: 'furniture', id: 'f26', qty: 1 }])).state;
    const grill = s.furniture.find((f) => f.id === 'f26')!;
    s = must(placeFurniture(s, grill.uid, { k: 'floor', area: 'out', x: 0, z: 2, r: 0 })).state;
    expect(hasGrill(s)).toBe(true);
  });
});

describe('cooking reserves and consumes once (SPEC §12)', () => {
  it('missing ingredients: refuses to start and takes nothing', () => {
    const s = withHome();
    const r = startCooking(s, 'r01');
    expect(r.ok).toBe(false);
    expect(s.inventory).toEqual({ salt: 3, olive_oil: 3, oregano: 1, coffee_greek: 1 });
  });
  it('village salad: consumed only at the end, +2 dishes and +10 minutes', () => {
    let s = withHome();
    s = must(checkout(s, 'agora_greengrocer', [
      { kind: 'item', id: 'tomato', qty: 2 }, { kind: 'item', id: 'cucumber', qty: 1 }, { kind: 'item', id: 'onion', qty: 1 },
      { kind: 'item', id: 'green_pepper', qty: 1 }, { kind: 'item', id: 'olives', qty: 1 },
    ])).state;
    s = must(checkout(s, 'agora_cheese', [{ kind: 'item', id: 'feta', qty: 1 }])).state;
    s = must(startCooking(s, 'r01')).state;
    expect(s.inventory.tomato).toBe(2);
    const cancelled = must(cancelCooking(s)).state;
    expect(cancelled.inventory.tomato).toBe(2);
    for (let i = 0; i < RECIPE_BY_ID.r01.steps.length; i++) s = must(nextStep(s)).state;
    const t = s.time;
    s = must(finishCooking(s)).state;
    expect(s.inventory['dish:r01']).toBe(2);
    expect(s.inventory.tomato).toBeUndefined();
    expect(s.inventory.oregano).toBeUndefined();
    expect(s.time).toBe(t + 10);
    expect(finishCooking(s).ok).toBe(false);
  });
  it('taramosalata is not playable in M2', () => {
    expect(startCooking(withHome(), 'r12').ok).toBe(false);
  });
});

describe('shifts pay once (SPEC §11)', () => {
  it('café: 4 customers, wrong orders only get a correction, pay + 2 h once', () => {
    let s = newGame();
    s.time = at(4, 1, 10);
    s = must(startJob(s, 'cafe')).state;
    const money = s.money;
    const wrong = must(serveCafe(s, { cups: [], water: false, where: 'edo', askedWhere: true }));
    expect(wrong.total).toBe(0);
    expect(wrong.state.jobs.active!.index).toBe(0);
    while (s.jobs.active!.index < 4) {
      const exp = cafeExpected(s.jobs.active!);
      s = must(serveCafe(s, { cups: exp.cups, water: exp.water, where: exp.where, askedWhere: true })).state;
    }
    const t = s.time;
    const done = must(finishJob(s));
    expect(done.state.money).toBe(money + 1800);
    expect(done.state.time).toBe(t + 120);
    expect(finishJob(done.state).ok).toBe(false);
  });
  it('café: ordering without "εδώ/πακέτο" requires asking', () => {
    let s = newGame();
    s.time = at(4, 1, 10);
    s = must(startJob(s, 'cafe')).state;
    s.jobs.active!.orders = ['c1', 'c2', 'c3', 'c4'];
    const exp = cafeExpected(s.jobs.active!);
    const r = must(serveCafe(s, { cups: exp.cups, water: exp.water, where: exp.where, askedWhere: false }));
    expect(r.total).toBe(0);
  });
  it('bakery: shelves first, then 4 bags; pay 16 € and a koulouri', () => {
    let s = newGame();
    s.time = at(4, 1, 6, 30);
    s = must(startJob(s, 'bakery')).state;
    for (const b of BAKE_LIST) s = must(shelveBake(s, b, b)).state;
    while (s.jobs.active!.index < 4) {
      const order = BAKERY_ORDERS.find((o) => o.id === s.jobs.active!.orders[s.jobs.active!.index])!;
      s = must(serveBakery(s, order.items)).state;
    }
    const done = must(finishJob(s)).state;
    expect(done.inventory['food:koulouri']).toBe(1);
  });
  it('taverna: water and bread first, then the dishes', () => {
    let s = newGame();
    s.time = at(4, 1, 19, 30);
    s = must(startJob(s, 'taverna')).state;
    const tables = s.jobs.active!.tables.length;
    expect(tables).toBeGreaterThanOrEqual(2);
    const order = TAVERNA_ORDERS.find((o) => o.id === s.jobs.active!.tables[0].order)!;
    expect(must(serveTaverna(s, 0, order.dishes)).total).toBe(0); // no water yet
    for (let i = 0; i < tables; i++) {
      s = must(tavernaWater(s, i)).state;
      const o = TAVERNA_ORDERS.find((x) => x.id === s.jobs.active!.tables[i].order)!;
      s = must(serveTaverna(s, i, o.dishes)).state;
    }
    expect(must(finishJob(s)).state.money).toBe(s.money + 2800);
  });
  it('outside the shift window you cannot start', () => {
    const s = newGame();
    s.time = at(4, 1, 12);
    expect(startJob(s, 'bakery').ok).toBe(false);
    expect(startJob(s, 'taverna').ok).toBe(false);
  });
});

describe('deliveries (SPEC §11)', () => {
  const prepared = () => {
    const s = newGame();
    s.time = at(4, 1, 9);
    refreshOffers(s, 0);
    return s;
  };
  it('max three at once; parcel must be picked up before delivery; paid once', () => {
    let s = prepared();
    const offers = s.deliveries.offers.filter((o) => o.pickup !== 'p_pharmacy');
    for (const o of offers.slice(0, 3)) s = must(acceptDelivery(s, o.id)).state;
    expect(s.deliveries.active).toHaveLength(3);
    expect(acceptDelivery(s, offers[3].id).ok).toBe(false);
    const d = s.deliveries.active[0];
    expect(deliverParcel(s, d.id, d.dest).ok).toBe(false); // not carrying yet
    expect(pickUpParcel(s, d.id, 'p_wrong').ok).toBe(false);
    s = must(pickUpParcel(s, d.id, d.pickup)).state;
    expect(deliverParcel(s, d.id, 'd99').ok).toBe(false);
    const money = s.money;
    s = must(deliverParcel(s, d.id, d.dest)).state;
    expect(s.money).toBe(money + d.pay);
    expect(deliverParcel(s, d.id, d.dest).ok).toBe(false);
  });
  it('late delivery pays half; cancelling pays nothing', () => {
    let s = prepared();
    const [a, b] = s.deliveries.offers.filter((o) => o.pickup === 'p_depot' || o.pickup.startsWith('p_'));
    s = must(acceptDelivery(s, a.id)).state;
    s = must(acceptDelivery(s, b.id)).state;
    s = must(pickUpParcel(s, a.id, a.pickup)).state;
    s.time += a.minutes + 5;
    const money = s.money;
    s = must(deliverParcel(s, a.id, a.dest)).state;
    expect(s.money).toBe(money + Math.round(a.pay / 2));
    const c = must(cancelDelivery(s, b.id)).state;
    expect(c.money).toBe(s.money);
    expect(c.deliveries.active).toHaveLength(0);
  });
});

describe('time (SPEC §9)', () => {
  it('rent is charged once on the 1st of each month, also when skipping many days', () => {
    const s = withHome('h01');
    const money = s.money;
    advance(s, 31 * 1440); // to 1 June
    expect(s.money).toBe(money - 22000 >= 0 ? money - 22000 : money);
    s.money = 100000;
    const before = s.money;
    advance(s, 30 * 1440 + 60 * 24 * 31); // through 1 July and 1 August
    expect(before - s.money).toBe(2 * 22000);
    // the same month never twice
    const r = s.rent.lastCharged;
    advance(s, 60);
    expect(s.rent.lastCharged).toBe(r);
  });
  it('rent you cannot pay is recorded as owed', () => {
    const s = withHome('h04');
    s.money = 1000;
    advance(s, 31 * 1440);
    expect(s.rent.owed).toBe(42000);
    expect(s.money).toBe(1000);
  });
  it('sleep goes to 08:00 next morning; rest goes up to 7 days', () => {
    const s = withHome();
    s.time = at(4, 1, 23);
    const slept = must(sleep(s)).state;
    expect(dateOf(slept.time)).toMatchObject({ day: 2, hour: 8, minute: 0 });
    const rested = must(restDays(slept, 7)).state;
    expect(dateOf(rested.time)).toMatchObject({ day: 9, hour: 8 });
    expect(restDays(slept, 8).ok).toBe(false);
  });
});
