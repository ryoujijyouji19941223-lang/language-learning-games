// Buying and selling (SPEC §10). Payment, stock and the bag change together in
// one transaction; if anything is missing nothing is taken.

import { SHOP_BY_ID, LAIKI_DISCOUNT, type CatalogKind } from '../data/shops';
import { ITEM_BY_ID, DRINKS, MEAL_SWITCHES } from '../data/items';
import { hhmm } from './calendar';
import { FURNITURE_BY_ID } from '../data/furniture';
import { CLOTHES_BY_ID } from '../data/clothes';
import { isOpen } from './hours';
import { euro } from './money';
import { tx, fail, addInventory, newUid, logEvent, type GameState } from './state';

export interface CartLine { kind: CatalogKind; id: string; qty: number }

export function basePrice(kind: CatalogKind, id: string): number {
  if (kind === 'item') return ITEM_BY_ID[id]?.price ?? 0;
  if (kind === 'furniture') return FURNITURE_BY_ID[id]?.price ?? 0;
  return CLOTHES_BY_ID[id]?.price ?? 0;
}

export function priceAt(shopId: string, kind: CatalogKind, id: string): number {
  const p = basePrice(kind, id);
  return shopId === 'agora_laiki' ? Math.round((p * LAIKI_DISCOUNT) / 5) * 5 : p;
}

export function stockLeft(s: GameState, shopId: string, id: string): number {
  const entry = SHOP_BY_ID[shopId]?.catalog?.find((c) => c.id === id);
  if (!entry) return 0;
  return s.stock.left[`${shopId}:${id}`] ?? entry.stock;
}

export function cartTotal(shopId: string, lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + priceAt(shopId, l.kind, l.id) * l.qty, 0);
}

export function checkout(state: GameState, shopId: string, lines: CartLine[]) {
  return tx(state, (s) => {
    const shop = SHOP_BY_ID[shopId];
    if (!shop?.catalog) fail('Εδώ δεν πουλάνε τίποτα.', 'Nothing is sold here.');
    if (!isOpen(shop, s.time)) fail('Κλειστό.', 'The shop is closed.');
    const real = lines.filter((l) => l.qty > 0);
    if (!real.length) fail('Το καλάθι είναι άδειο.', 'The basket is empty.');
    for (const l of real) {
      const entry = shop.catalog!.find((c) => c.id === l.id && c.kind === l.kind);
      if (!entry) fail('Αυτό δεν το έχουμε.', `Not sold here: ${l.id}`);
      if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) fail('Λάθος ποσότητα.', 'Invalid quantity.');
      if (l.kind === 'clothes' && (l.qty !== 1 || s.clothes.owned.includes(l.id))) fail('Αυτό το ρούχο το έχεις ήδη.', 'You already own this piece of clothing.');
      if (stockLeft(s, shopId, l.id) < l.qty) fail('Δεν έχουμε τόσα σήμερα.', 'Not enough in stock today.');
    }
    const total = cartTotal(shopId, real);
    if (s.money < total) fail('Δεν φτάνουν τα λεφτά.', `Not enough money: ${euro(total)} needed.`);
    s.money -= total;
    for (const l of real) {
      s.stock.left[`${shopId}:${l.id}`] = stockLeft(s, shopId, l.id) - l.qty;
      if (l.kind === 'item') addInventory(s, l.id, l.qty);
      else if (l.kind === 'furniture') for (let i = 0; i < l.qty; i++) s.furniture.push({ uid: newUid(s), id: l.id, place: null });
      else s.clothes.owned.push(l.id);
    }
    const msg = { el: `Πλήρωσες ${euro(total)}.`, en: `You paid ${euro(total)}.` };
    logEvent(s, msg);
    return { msg, total };
  });
}

export const sellPrice = (kind: 'furniture' | 'clothes', id: string) => Math.round(basePrice(kind, id) / 2 / 10) * 10;

/** Sell stored furniture (by uid) or clothes you are not wearing, at half price. */
export function sell(state: GameState, shopId: string, items: { kind: 'furniture' | 'clothes'; ref: string }[]) {
  return tx(state, (s) => {
    const shop = SHOP_BY_ID[shopId];
    if (!shop?.buysBack) fail('Εδώ δεν αγοράζουν μεταχειρισμένα.', 'This shop does not buy things back.');
    if (!isOpen(shop, s.time)) fail('Κλειστό.', 'The shop is closed.');
    let total = 0;
    for (const it of items) {
      if (it.kind === 'furniture') {
        const f = s.furniture.find((x) => x.uid === it.ref);
        if (!f) fail('Δεν το βρίσκω.', 'Item not found.');
        if (f!.place) fail('Βάλ’ το πρώτα στο κουτί αποθήκευσης.', 'Put it in the storage box first.');
        if (!shop.catalog?.some((c) => c.kind === 'furniture' && c.id === f!.id)) fail('Αυτό δεν το αγοράζουμε.', 'This shop does not buy that kind of item.');
        s.furniture = s.furniture.filter((x) => x.uid !== it.ref);
        total += sellPrice('furniture', f!.id);
      } else {
        if (!s.clothes.owned.includes(it.ref)) fail('Δεν το έχεις.', 'You do not own that.');
        if (Object.values(s.clothes.worn).includes(it.ref)) fail('Το φοράς τώρα.', 'You are wearing it.');
        s.clothes.owned = s.clothes.owned.filter((c) => c !== it.ref);
        total += sellPrice('clothes', it.ref);
      }
    }
    s.money += total;
    return { msg: { el: `Πήρες ${euro(total)}.`, en: `You received ${euro(total)}.` }, total };
  });
}

/** Next switch between day and night (06:00 / 18:00) strictly after the given time. */
export function nextMealSwitch(t: number): number {
  const day = Math.floor(t / 1440) * 1440;
  for (const m of [...MEAL_SWITCHES, MEAL_SWITCHES[0] + 1440]) if (day + m > t) return day + m;
  return day + 1440 + MEAL_SWITCHES[0];
}

export const isFull = (s: GameState) => s.fullUntil !== null && s.time < s.fullUntil;

/** Eat (or drink). A meal fills you up until the next day/night switch; drinks never do. */
export function eat(state: GameState, itemId: string) {
  return tx(state, (s) => {
    if (!(s.inventory[itemId] > 0)) fail('Δεν το έχεις.', 'You do not have that.');
    if (!itemId.startsWith('food:') && !itemId.startsWith('dish:')) fail('Αυτό δεν τρώγεται έτσι.', 'That is an ingredient — cook it first.');
    const drink = DRINKS.has(itemId);
    if (!drink && isFull(s)) fail(`Έχεις φάει ήδη. Δεν πεινάς ως τις ${hhmm(s.fullUntil! % 1440)}.`, `You have already eaten. You will be hungry again at ${hhmm(s.fullUntil! % 1440)} (the next switch between day and night). Drinks are fine.`);
    addInventory(s, itemId, -1);
    if (drink) return { el: 'Ωραίο!', en: 'Nice! (Drinks do not fill you up.)' };
    s.fullUntil = nextMealSwitch(s.time);
    return { el: `Νόστιμο! Χόρτασες ως τις ${hhmm(s.fullUntil % 1440)}.`, en: `Delicious! You are full until ${hhmm(s.fullUntil % 1440)}.` };
  });
}
