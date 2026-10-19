// Deliveries (SPEC §11): accept from the phone (max 3), pick up at the shop, walk,
// hand over at the address. Each parcel is tied to its job id, never mixed with
// food. Late = half pay; cancel = no pay, no penalty; never paid twice.

import { PICKUPS, DESTINATIONS, DELIVERY_TIERS, MAX_ACTIVE_DELIVERIES, OFFERS_PER_DAY, type DestDef } from '../data/deliveries';
import { SHOP_BY_ID } from '../data/shops';
import { NPC_BY_ID } from '../data/npcs';
import { LANDMARKS } from '../data/town';
import { getLayout, addressOf } from '../world/layout';
import { rng, type Vec2 } from './geo';
import { isOpen } from './hours';
import { tx, fail, logEvent, type GameState, type DeliveryOffer } from './state';
import { euro } from './money';

const PICKUP_BY_ID = Object.fromEntries(PICKUPS.map((p) => [p.id, p]));
const DEST_BY_ID: Record<string, DestDef> = Object.fromEntries(DESTINATIONS.map((d) => [d.id, d]));

export function pickupDef(id: string) { return PICKUP_BY_ID[id]; }
export function destDef(id: string) { return DEST_BY_ID[id]; }

export function pickupPoint(id: string): Vec2 {
  const lot = getLayout().lots.find((l) => l.shop === PICKUP_BY_ID[id].shop);
  return lot ? lot.front : { x: 0, z: 0 };
}

export function spotPoint(spot: string): Vec2 {
  if (spot === 'chapel_door') return { x: LANDMARKS.chapel.x, z: LANDMARKS.chapel.z + 4.2 };
  if (spot === 'windmill_door') return { x: LANDMARKS.windmills[0].x + 3.6, z: LANDMARKS.windmills[0].z + 0.8 };
  return { x: 0, z: 0 };
}

export function destPoint(id: string): Vec2 {
  const d = DEST_BY_ID[id];
  const lay = getLayout();
  if (d.ref.kind === 'home') return lay.npcHome[d.ref.npc]?.front ?? { x: 0, z: 0 };
  if (d.ref.kind === 'shop') {
    const shop = d.ref.shop;
    if (shop === 'chora_church') return { x: LANDMARKS.church.x + 8.6, z: LANDMARKS.church.z };
    if (shop === 'beach_kantina') return { x: LANDMARKS.kantina.x, z: LANDMARKS.kantina.z + 2.6 };
    return lay.lots.find((l) => l.shop === shop)?.front ?? { x: 0, z: 0 };
  }
  return spotPoint(d.ref.spot);
}

/** What the parcel label says the destination is. */
export function destLabel(id: string): { el: string; en: string } {
  const d = DEST_BY_ID[id];
  if (d.ref.kind === 'home') {
    const lot = getLayout().npcHome[d.ref.npc];
    const addr = lot ? addressOf(lot) : null;
    const name = NPC_BY_ID[d.ref.npc].name;
    return { el: addr ? `${addr.el} (${name})` : name, en: addr ? `${addr.en} (${name})` : name };
  }
  if (d.ref.kind === 'shop') {
    const s = SHOP_BY_ID[d.ref.shop];
    return { el: s.el, en: s.en };
  }
  return { el: d.ref.el, en: d.ref.en };
}

export function parcelLabel(o: { pickup: string; dest: string }) {
  const p = PICKUP_BY_ID[o.pickup];
  const dl = destLabel(o.dest);
  return { el: `${p.count} × ${p.parcel.el} → ${dl.el}`, en: `${p.count} × ${p.parcel.en} → ${dl.en}` };
}

export function offersForDay(day: number): DeliveryOffer[] {
  const r = rng(day * 7919 + 13);
  const out: DeliveryOffer[] = [];
  const usedPairs = new Set<string>();
  let guard = 0;
  while (out.length < OFFERS_PER_DAY && guard++ < 200) {
    const p = PICKUPS[Math.floor(r() * PICKUPS.length)];
    const d = DESTINATIONS[Math.floor(r() * DESTINATIONS.length)];
    const key = `${p.id}>${d.id}`;
    if (usedPairs.has(key)) continue;
    const a = pickupPoint(p.id);
    const b = destPoint(d.id);
    const dist = Math.hypot(a.x - b.x, a.z - b.z);
    if (dist < 25) continue;
    usedPairs.add(key);
    const tier = DELIVERY_TIERS.find((t) => dist <= t.maxDist)!;
    out.push({ id: `o${day}-${out.length}`, pickup: p.id, dest: d.id, pay: tier.pay, minutes: tier.minutes, day });
  }
  return out;
}

/** Called at each new day (and on first use). Accepted offers stay in `active`. */
export function refreshOffers(s: GameState, day: number) {
  if (s.deliveries.day === day) return;
  s.deliveries.day = day;
  const taken = new Set([...s.deliveries.active.map((a) => a.id), ...s.deliveries.history.map((h) => h.id)]);
  s.deliveries.offers = offersForDay(day).filter((o) => !taken.has(o.id));
}

export function acceptDelivery(state: GameState, offerId: string) {
  return tx(state, (s) => {
    const offer = s.deliveries.offers.find((o) => o.id === offerId);
    if (!offer) fail('Αυτή η παράδοση δεν υπάρχει πια.', 'That delivery is no longer available.');
    if (s.deliveries.active.length >= MAX_ACTIVE_DELIVERIES) fail('Έχεις ήδη τρεις παραδόσεις.', 'You already have three deliveries (the maximum).');
    const shop = PICKUP_BY_ID[offer!.pickup].shop;
    if (!isOpen(shop, s.time)) fail('Το μαγαζί είναι κλειστό τώρα.', 'The pick-up shop is closed right now.');
    s.deliveries.offers = s.deliveries.offers.filter((o) => o.id !== offerId);
    s.deliveries.active.push({ ...offer!, acceptedAt: s.time, deadline: s.time + offer!.minutes, status: 'accepted' });
    return { el: 'Ανέλαβες την παράδοση.', en: 'Delivery accepted. Go and pick up the parcel.' };
  });
}

export function pickUpParcel(state: GameState, deliveryId: string, atPickup: string) {
  return tx(state, (s) => {
    const d = s.deliveries.active.find((a) => a.id === deliveryId);
    if (!d) fail('Δεν υπάρχει τέτοια παράδοση.', 'No such delivery.');
    if (d!.status !== 'accepted') fail('Το δέμα το έχεις ήδη.', 'You already have this parcel.');
    if (d!.pickup !== atPickup) fail('Αυτό το δέμα δεν είναι εδώ.', 'This parcel is not picked up here.');
    if (!isOpen(PICKUP_BY_ID[d!.pickup].shop, s.time)) fail('Είναι κλειστά.', 'They are closed now.');
    d!.status = 'carrying';
    return { el: 'Πήρες το δέμα.', en: 'You picked up the parcel.' };
  });
}

export function deliverParcel(state: GameState, deliveryId: string, atDest: string) {
  return tx(state, (s) => {
    const d = s.deliveries.active.find((a) => a.id === deliveryId);
    if (!d) fail('Δεν υπάρχει τέτοια παράδοση.', 'No such delivery.');
    if (d!.status !== 'carrying') fail('Δεν έχεις αυτό το δέμα μαζί σου.', "You don't have this parcel with you — pick it up first.");
    if (d!.dest !== atDest) fail('Δεν είναι αυτή η διεύθυνση.', 'This is not the address on the label.');
    const late = s.time > d!.deadline;
    const pay = late ? Math.round(d!.pay / 2) : d!.pay;
    s.money += pay;
    s.deliveries.active = s.deliveries.active.filter((a) => a.id !== deliveryId);
    s.deliveries.history.unshift({ id: d!.id, outcome: late ? 'late' : 'delivered', pay, at: s.time });
    s.deliveries.history.length = Math.min(s.deliveries.history.length, 60);
    s.stats.delivered++;
    const msg = late
      ? { el: `Παράδοση με καθυστέρηση: ${euro(pay)}`, en: `Delivered late: half pay, ${euro(pay)}` }
      : { el: `Παράδοση! +${euro(pay)}`, en: `Delivered! +${euro(pay)}` };
    logEvent(s, msg);
    return { msg, total: pay };
  });
}

export function cancelDelivery(state: GameState, deliveryId: string) {
  return tx(state, (s) => {
    const d = s.deliveries.active.find((a) => a.id === deliveryId);
    if (!d) fail('Δεν υπάρχει τέτοια παράδοση.', 'No such delivery.');
    s.deliveries.active = s.deliveries.active.filter((a) => a.id !== deliveryId);
    s.deliveries.history.unshift({ id: d!.id, outcome: 'cancelled', pay: 0, at: s.time });
    return { el: 'Η παράδοση ακυρώθηκε.', en: 'Delivery cancelled (no pay, no penalty).' };
  });
}
