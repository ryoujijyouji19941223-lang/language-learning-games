// Renting, moving and arranging furniture (SPEC §6–7).
// Floor and wall are separate: floor furniture never removes wall decor. Every
// floor change is checked so that the door, the bed and the kitchen stay reachable.

import { HOME_BY_ID, MOVE_FEE, START_FURNITURE, type HomeDef, type WallSide } from '../data/homes';
import { FURNITURE_BY_ID, type FurnitureDef } from '../data/furniture';
import { dateOf, monthKey } from './calendar';
import { euro } from './money';
import { tx, fail, newUid, logEvent, type GameState, type Placement, type Rot, type OwnedFurniture } from './state';

export const WALL_ROWS = 4;

// ── Renting ──────────────────────────────────────────────────────────
export function viewHome(state: GameState, homeId: string) {
  return tx(state, (s) => {
    if (!HOME_BY_ID[homeId]) fail('Δεν υπάρχει τέτοιο δωμάτιο.', 'No such room.');
    if (!s.viewed.includes(homeId)) s.viewed.push(homeId);
  });
}

/**
 * Sign for a room. The first contract is the starting room (first month already
 * paid, starting furniture placed). Later contracts are moves: 20 € fee and all
 * furniture goes to the storage box. You always have exactly one home.
 */
export function rentHome(state: GameState, homeId: string) {
  return tx(state, (s) => {
    const h = HOME_BY_ID[homeId];
    if (!h) fail('Δεν υπάρχει τέτοιο δωμάτιο.', 'No such room.');
    if (s.home === homeId) fail('Εδώ μένεις ήδη.', 'You already live here.');
    if (s.jobs.active) fail('Τελείωσε πρώτα τη βάρδια.', 'Finish your shift first.');
    if (s.home === null) {
      s.home = homeId;
      s.rent.lastCharged = monthKey(dateOf(s.time));
      for (const id of START_FURNITURE) s.furniture.push({ uid: newUid(s), id, place: null });
      for (let i = 0; i < h.windows.length; i++) s.furniture.push({ uid: newUid(s), id: 'f35', place: null });
      autoPlaceStart(s, h);
      const msg = { el: `Καλώς ήρθες στο νέο σου σπίτι!`, en: `Welcome to your new home! The first month's rent is already paid.` };
      logEvent(s, msg);
      return msg;
    }
    if (s.money < MOVE_FEE) fail('Δεν φτάνουν τα λεφτά για τη μετακόμιση.', `Moving costs ${euro(MOVE_FEE)} — not enough money.`);
    s.money -= MOVE_FEE;
    for (const f of s.furniture) f.place = null;
    s.home = homeId;
    if (s.cooking) s.cooking = null;
    const msg = { el: `Μετακόμισες! Τα έπιπλα είναι στο κουτί αποθήκευσης.`, en: `You moved (fee ${euro(MOVE_FEE)}). All your furniture is in the storage box — place it with "Arrange furniture".` };
    logEvent(s, msg);
    return msg;
  });
}

export function payOwedRent(state: GameState) {
  return tx(state, (s) => {
    if (s.rent.owed <= 0) fail('Δεν χρωστάς τίποτα.', 'You owe nothing.');
    if (s.money < s.rent.owed) fail('Δεν φτάνουν τα λεφτά.', `Not enough money: ${euro(s.rent.owed)} owed.`);
    s.money -= s.rent.owed;
    const paid = s.rent.owed;
    s.rent.owed = 0;
    return { el: `Πλήρωσες ${euro(paid)}.`, en: `You paid the ${euro(paid)} you owed.` };
  });
}

// ── Grid geometry ────────────────────────────────────────────────────
export interface Footprint { x: number; z: number; w: number; d: number }

export function rotatedSize(def: FurnitureDef, r: Rot) {
  return r % 2 === 0 ? { w: def.w, d: def.d } : { w: def.d, d: def.w };
}

export function areaSize(h: HomeDef, area: 'main' | 'out') {
  if (area === 'main') return { w: h.w, d: h.d };
  if (!h.outdoor) return { w: 0, d: 0 };
  return { w: h.outdoor.w, d: h.outdoor.d };
}

/** Cells just inside each door (must stay free). */
export function doorCells(h: HomeDef): { main: [number, number][]; out: [number, number][] } {
  const inside = (wall: WallSide, col: number, w: number, d: number): [number, number] =>
    wall === 'n' ? [col, 0] : wall === 's' ? [col, d - 1] : wall === 'w' ? [0, col] : [w - 1, col];
  const main: [number, number][] = [];
  for (let i = 0; i < h.door.width; i++) main.push(inside(h.door.wall, h.door.col + i, h.w, h.d));
  const out: [number, number][] = [];
  if (h.outdoor) {
    const o = h.outdoor;
    for (let i = 0; i < o.door.width; i++) {
      const col = o.door.col + i;
      main.push(inside(o.wall, col, h.w, h.d));
      // the matching cell on the outdoor area's edge next to the room
      const oc = col - o.offset;
      out.push(o.wall === 's' ? [oc, 0] : o.wall === 'n' ? [oc, o.d - 1] : o.wall === 'e' ? [0, oc] : [o.w - 1, oc]);
    }
  }
  return { main, out };
}

const kitchenCells = (h: HomeDef): [number, number][] => {
  const cells: [number, number][] = [];
  for (let x = 0; x < h.kitchen.w; x++) for (let z = 0; z < h.kitchen.d; z++) cells.push([h.kitchen.x + x, h.kitchen.z + z]);
  return cells;
};

export function footprintOf(f: OwnedFurniture): Footprint | null {
  if (!f.place || f.place.k !== 'floor') return null;
  const def = FURNITURE_BY_ID[f.id];
  const { w, d } = rotatedSize(def, f.place.r);
  return { x: f.place.x, z: f.place.z, w, d };
}

/** Which floor cells are blocked for walking (rugs do not block). */
export function blockedCells(h: HomeDef, furniture: OwnedFurniture[], area: 'main' | 'out'): Set<string> {
  const set = new Set<string>();
  if (area === 'main') for (const [x, z] of kitchenCells(h)) set.add(`${x},${z}`);
  for (const f of furniture) {
    if (!f.place || f.place.k !== 'floor' || f.place.area !== area) continue;
    if (FURNITURE_BY_ID[f.id].rug) continue;
    const fp = footprintOf(f)!;
    for (let x = 0; x < fp.w; x++) for (let z = 0; z < fp.d; z++) set.add(`${fp.x + x},${fp.z + z}`);
  }
  return set;
}

function reachable(w: number, d: number, blocked: Set<string>, starts: [number, number][]): Set<string> {
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  for (const [x, z] of starts) {
    const k = `${x},${z}`;
    if (!blocked.has(k)) { seen.add(k); queue.push([x, z]); }
  }
  while (queue.length) {
    const [x, z] = queue.shift()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const k = `${nx},${nz}`;
      if (nx < 0 || nz < 0 || nx >= w || nz >= d || blocked.has(k) || seen.has(k)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return seen;
}

export type LayoutProblem = { el: string; en: string } | null;

/** Checks the walking path: door → kitchen, door → beside the bed, door → balcony/courtyard door. */
export function checkPaths(h: HomeDef, furniture: OwnedFurniture[]): LayoutProblem {
  const blocked = blockedCells(h, furniture, 'main');
  const doors = doorCells(h);
  for (const [x, z] of doors.main) {
    if (blocked.has(`${x},${z}`)) return { el: 'Κλείνει την πόρτα.', en: 'That blocks a door.' };
  }
  const entrance: [number, number][] = [];
  for (let i = 0; i < h.door.width; i++) entrance.push(doors.main[i]);
  const seen = reachable(h.w, h.d, blocked, entrance);
  if (!h.kitchen.use.some(([x, z]) => seen.has(`${x},${z}`))) return { el: 'Δεν φτάνεις στην κουζίνα.', en: 'That cuts off the kitchen from the door.' };
  for (const [x, z] of doors.main.slice(h.door.width)) {
    if (!seen.has(`${x},${z}`)) return { el: 'Δεν φτάνεις στην πόρτα του μπαλκονιού.', en: 'That cuts off the balcony / courtyard door.' };
  }
  for (const f of furniture) {
    if (!f.place || f.place.k !== 'floor' || f.place.area !== 'main' || !FURNITURE_BY_ID[f.id].bed) continue;
    const fp = footprintOf(f)!;
    let ok = false;
    for (let x = fp.x - 1; x <= fp.x + fp.w && !ok; x++) {
      for (let z = fp.z - 1; z <= fp.z + fp.d && !ok; z++) {
        const inside = x >= fp.x && x < fp.x + fp.w && z >= fp.z && z < fp.z + fp.d;
        const corner = (x < fp.x || x >= fp.x + fp.w) && (z < fp.z || z >= fp.z + fp.d);
        if (!inside && !corner && seen.has(`${x},${z}`)) ok = true;
      }
    }
    if (!ok) return { el: 'Δεν φτάνεις στο κρεβάτι.', en: 'There is no free space to reach the bed.' };
  }
  if (h.outdoor) {
    const ob = blockedCells(h, furniture, 'out');
    for (const [x, z] of doors.out) if (ob.has(`${x},${z}`)) return { el: 'Κλείνει την πόρτα.', en: 'That blocks the balcony / courtyard door.' };
  }
  return null;
}

function overlaps(a: Footprint, b: Footprint) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
}

/** Check one placement against the room; returns a problem or null. */
export function placementProblem(h: HomeDef, furniture: OwnedFurniture[], uid: string, place: Placement): LayoutProblem {
  const me = furniture.find((f) => f.uid === uid);
  if (!me) return { el: 'Δεν βρέθηκε.', en: 'Item not found.' };
  const def = FURNITURE_BY_ID[me.id];
  const others = furniture.filter((f) => f.uid !== uid);
  if (place.k === 'floor') {
    if (def.mount !== 'floor') return { el: 'Αυτό δεν μπαίνει στο πάτωμα.', en: 'This does not go on the floor.' };
    if (place.area === 'out' && !h.outdoor) return { el: 'Δεν υπάρχει μπαλκόνι.', en: 'This room has no balcony or courtyard.' };
    if (place.area === 'out' && !def.outdoor) return { el: 'Αυτό δεν μπαίνει έξω.', en: 'Only plant pots and outdoor furniture go outside.' };
    const size = areaSize(h, place.area);
    const { w, d } = rotatedSize(def, place.r);
    const fp = { x: place.x, z: place.z, w, d };
    if (fp.x < 0 || fp.z < 0 || fp.x + w > size.w || fp.z + d > size.d) return { el: 'Δεν χωράει εκεί.', en: 'It does not fit there.' };
    if (place.area === 'main' && kitchenCells(h).some(([x, z]) => x >= fp.x && x < fp.x + w && z >= fp.z && z < fp.z + d)) {
      return { el: 'Εκεί είναι η κουζίνα.', en: 'The kitchen counter is there.' };
    }
    for (const o of others) {
      const ofp = footprintOf(o);
      if (!ofp || (o.place as { area: string }).area !== place.area) continue;
      const oRug = FURNITURE_BY_ID[o.id].rug;
      if (overlaps(fp, ofp) && (def.rug ? oRug : !oRug)) return { el: 'Υπάρχει ήδη κάτι εκεί.', en: 'Something is already there.' };
    }
    const trial = others.concat({ ...me, place });
    return checkPaths(h, trial);
  }
  if (place.k === 'wall') {
    if (def.mount !== 'wall') return { el: 'Αυτό δεν κρεμιέται στον τοίχο.', en: 'This does not go on the wall.' };
    const len = place.wall === 'n' || place.wall === 's' ? h.w : h.d;
    if (place.c < 0 || place.c + def.w > len || place.row < 0 || place.row + def.d > WALL_ROWS) return { el: 'Δεν χωράει εκεί.', en: 'It does not fit there.' };
    const cells = new Set<string>();
    for (let c = 0; c < def.w; c++) for (let r = 0; r < def.d; r++) cells.add(`${place.c + c},${place.row + r}`);
    for (const [c, r] of wallReserved(h, place.wall)) if (cells.has(`${c},${r}`)) return { el: 'Εκεί είναι πόρτα, παράθυρο ή κουζίνα.', en: 'A door, window or the kitchen is there.' };
    for (const o of others) {
      if (!o.place || o.place.k !== 'wall' || o.place.wall !== place.wall) continue;
      const od = FURNITURE_BY_ID[o.id];
      for (let c = 0; c < od.w; c++) for (let r = 0; r < od.d; r++) if (cells.has(`${o.place.c + c},${o.place.row + r}`)) return { el: 'Υπάρχει ήδη κάτι εκεί.', en: 'Something is already hanging there.' };
    }
    return null;
  }
  if (place.k === 'window') {
    if (def.mount !== 'window') return { el: 'Αυτό δεν είναι κουρτίνα.', en: 'Only curtains go on windows.' };
    if (place.i < 0 || place.i >= h.windows.length) return { el: 'Δεν υπάρχει τέτοιο παράθυρο.', en: 'No such window.' };
    if (others.some((o) => o.place?.k === 'window' && o.place.i === place.i)) return { el: 'Το παράθυρο έχει ήδη κουρτίνα.', en: 'That window already has a curtain.' };
    return null;
  }
  // anchor
  if (def.mount !== 'anchor') return { el: 'Αυτό δεν μπαίνει πάνω στο τραπέζι.', en: 'This does not go on a table top.' };
  const host = others.find((o) => o.uid === place.host);
  if (!host || !host.place || host.place.k !== 'floor') return { el: 'Πρώτα βάλε το έπιπλο.', en: 'Place the table or desk first.' };
  const slots = FURNITURE_BY_ID[host.id].anchors ?? 0;
  if (place.i < 0 || place.i >= slots) return { el: 'Δεν υπάρχει θέση εκεί.', en: 'No free spot there.' };
  if (others.some((o) => o.place?.k === 'anchor' && o.place.host === place.host && o.place.i === place.i)) return { el: 'Η θέση είναι πιασμένη.', en: 'That spot is taken.' };
  return null;
}

/** Wall cells used by doors, windows and the kitchen counter (row 0). */
export function wallReserved(h: HomeDef, wall: WallSide): [number, number][] {
  const out: [number, number][] = [];
  const add = (col: number, width: number, rows: number[]) => { for (let i = 0; i < width; i++) for (const r of rows) out.push([col + i, r]); };
  if (h.door.wall === wall) add(h.door.col, h.door.width, [0, 1, 2]);
  for (const win of h.windows) if (win.wall === wall) add(win.col, win.width, [1, 2]);
  if (h.outdoor && h.outdoor.wall === wall) add(h.outdoor.door.col, h.outdoor.door.width, [0, 1, 2]);
  if (h.kitchen.wall === wall) {
    if (wall === 'n' || wall === 's') add(h.kitchen.x, h.kitchen.w, [0]);
    else add(h.kitchen.z, h.kitchen.d, [0]);
  }
  return out;
}

/** Place (or move) an owned item. */
export function placeFurniture(state: GameState, uid: string, place: Placement) {
  return tx(state, (s) => {
    const h = s.home ? HOME_BY_ID[s.home] : null;
    if (!h) fail('Δεν έχεις σπίτι ακόμα.', 'You have no home yet.');
    const problem = placementProblem(h!, s.furniture, uid, place);
    if (problem) fail(problem.el, problem.en);
    const f = s.furniture.find((x) => x.uid === uid)!;
    f.place = place;
  });
}

/** Put an item (and anything standing on it) into the storage box. */
export function storeFurniture(state: GameState, uid: string) {
  return tx(state, (s) => {
    const f = s.furniture.find((x) => x.uid === uid);
    if (!f) fail('Δεν βρέθηκε.', 'Item not found.');
    if (!f!.place) return;
    f!.place = null;
    const moved = s.furniture.filter((o) => o.place?.k === 'anchor' && o.place.host === uid);
    for (const o of moved) o.place = null;
    if (moved.length) return { el: 'Μαζί και τα μικρά πράγματα από πάνω.', en: `Stored, together with ${moved.length} small item(s) that stood on it.` };
  });
}

/** Restore a previous furniture arrangement (undo). Only placements change. */
export function restoreArrangement(state: GameState, snapshot: { uid: string; place: Placement | null }[]) {
  return tx(state, (s) => {
    const byUid = new Map(snapshot.map((x) => [x.uid, x.place]));
    for (const f of s.furniture) if (byUid.has(f.uid)) f.place = byUid.get(f.uid)!;
    const h = s.home ? HOME_BY_ID[s.home] : null;
    if (h) {
      const p = checkPaths(h, s.furniture);
      if (p) fail(p.el, p.en);
    }
  });
}

export const arrangement = (s: GameState) => s.furniture.map((f) => ({ uid: f.uid, place: f.place ? { ...f.place } : null }));

/** Starting room: bed, desk, chair and curtains in sensible places. */
function autoPlaceStart(s: GameState, h: HomeDef) {
  const spots: Record<string, Placement[]> = {
    f01: [{ k: 'floor', area: 'main', x: h.w - 2, z: 0, r: 0 }, { k: 'floor', area: 'main', x: h.w - 2, z: 2, r: 0 }, { k: 'floor', area: 'main', x: 0, z: h.d - 4, r: 0 }],
    f03: [{ k: 'floor', area: 'main', x: 0, z: Math.max(2, h.d - 4), r: 0 }, { k: 'floor', area: 'main', x: 2, z: Math.floor(h.d / 2), r: 0 }],
    f04: [{ k: 'floor', area: 'main', x: 2, z: Math.max(2, h.d - 4), r: 0 }, { k: 'floor', area: 'main', x: 0, z: Math.max(2, h.d - 2), r: 0 }],
  };
  let win = 0;
  for (const f of s.furniture) {
    if (f.id === 'f35') {
      if (win < h.windows.length) f.place = { k: 'window', i: win++ };
      continue;
    }
    for (const p of spots[f.id] ?? []) {
      if (!placementProblem(h, s.furniture, f.uid, p)) { f.place = p; break; }
    }
  }
}

export function isInsideHome(s: GameState) {
  return !!s.home && s.player.area === `home:${s.home}`;
}

/** Charcoal grill available: the griddle in h01/h03, or a ψησταριά placed on the balcony/courtyard. */
export function hasGrill(s: GameState) {
  if (!s.home) return false;
  const h = HOME_BY_ID[s.home];
  if (h.griddle) return true;
  return s.furniture.some((f) => FURNITURE_BY_ID[f.id].grill && f.place?.k === 'floor' && f.place.area === 'out');
}

export function hasPlacedBed(s: GameState) {
  return s.furniture.some((f) => FURNITURE_BY_ID[f.id].bed && f.place?.k === 'floor');
}
