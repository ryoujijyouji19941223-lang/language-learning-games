// Generates the fixed town layout from data/town.ts: buildings (lots), doors,
// house numbers and residents' homes. Deterministic and free of three.js, so the
// map, the 3D world and the tests all see the same town.

import { ROADS, PLAZAS, SPECIAL_LOTS, LANDMARKS, HOME_ROADS, HOME_PREFS, type RoadDef, type Side } from '../data/town';
import { SHOP_BY_ID, type DistrictId } from '../data/shops';
import { NPCS } from '../data/npcs';
import {
  polyline, pointAt, leftNormal, heightAt, WEST_CLIFF_X, boxesOverlap, boxCorners, toWorld, rng, faceToRot,
  type Box, type Polyline, type Vec2, distanceToPolyline,
} from '../core/geo';

export interface LotStyle {
  wall: string;
  door: string;
  window: string;
  awning?: string;
  balcony: boolean;
  pots: number;
  bougainvillea: boolean;
  setback: boolean;
  chimney: boolean;
  roofStairs: boolean;
  shutters: boolean;
}

export interface Lot {
  id: string;
  kind: 'shop' | 'home' | 'house';
  shop?: string;
  home?: string;
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
  floors: number;
  district: DistrictId;
  road?: string;
  side?: Side;
  t?: number;
  addressNo?: number;
  /** Door centre on the front wall, and a standing point just outside it. */
  door: Vec2;
  front: Vec2;
  base: number;
  style: LotStyle;
  seed: number;
}

export interface RoadInfo extends RoadDef { line: Polyline }

export interface TownLayout {
  roads: RoadInfo[];
  lots: Lot[];
  obstacles: Box[];
  npcHome: Record<string, Lot>;
  lotById: Record<string, Lot>;
}

const WALLS = ['#f7f5ef', '#f4f1e8', '#faf8f2', '#f1ede2', '#f6f2e6', '#efe9dc', '#f3ead3', '#e9dcc1'];
const DOORS = ['#1f5fa8', '#2a6fb6', '#1b4f8a', '#3a7cc2', '#2e8b8b', '#1f6f5f', '#7a3b2e', '#264d73', '#1e88c8'];
const WINDOWS = ['#1f5fa8', '#2a6fb6', '#2e8b8b', '#1b4f8a', '#3f7f3f', '#264d73'];

const pick = <T>(r: () => number, list: T[]) => list[Math.floor(r() * list.length) % list.length];

function makeStyle(r: () => number, district: DistrictId, awning?: string): LotStyle {
  const pastel = district !== 'chora' && r() < 0.18;
  return {
    wall: pastel ? pick(r, ['#f3e2c0', '#f2d8c4', '#e8d9b5', '#f6e7d0']) : pick(r, WALLS),
    door: pick(r, DOORS),
    window: pick(r, WINDOWS),
    awning,
    balcony: r() < 0.45,
    pots: Math.floor(r() * 4),
    bougainvillea: r() < (district === 'chora' ? 0.35 : 0.18),
    setback: r() < 0.4,
    chimney: r() < 0.35,
    roofStairs: r() < 0.15,
    shutters: r() < 0.6,
  };
}

function lotBox(l: { x: number; z: number; rot: number; w: number; d: number }, top = 12): Box {
  return { kind: 'box', x: l.x, z: l.z, hw: l.w / 2, hd: l.d / 2, rot: l.rot, top };
}

function roadBoxes(road: RoadInfo, extra: number): Box[] {
  const out: Box[] = [];
  for (let i = 1; i < road.pts.length; i++) {
    const [ax, az] = road.pts[i - 1];
    const [bx, bz] = road.pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    // local +z along the segment
    const rot = Math.atan2(bx - ax, bz - az);
    out.push({ kind: 'box', x: (ax + bx) / 2, z: (az + bz) / 2, hw: road.width / 2 + extra, hd: len / 2 + road.width / 2, rot, top: 99 });
  }
  return out;
}

/** Areas where ordinary houses may stand. */
const TOWN_MASK: [number, number, number, number][] = [
  [-125, -58, 0, 45],
  [0, -56, 112, 50],
  [-36, -145, 126, -56],
  [100, -10, 256, 34],
];
const inMask = (x: number, z: number) => TOWN_MASK.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);

export function districtAt(x: number, z: number): DistrictId {
  if (x > 98 && z > -12) return 'limani';
  if (z < -56 && x > -40) return 'geitonia';
  if (x < -122) return 'paralia';
  if (x < 4 || (x < 12 && z < 20)) return 'chora';
  if (z < -20 && x > 0) return 'geitonia';
  return 'agora';
}

function lotGroundOk(b: Box): boolean {
  const pts = [...boxCorners(b), { x: b.x, z: b.z }];
  return pts.every((p) => heightAt(p.x, p.z) > 0.35 && !(p.x > WEST_CLIFF_X && p.x < -108 && p.z > 4));
}

function finishLot(l: Omit<Lot, 'door' | 'front' | 'base'>): Lot {
  const door = toWorld(l, 0, l.d / 2);
  const front = toWorld(l, 0, l.d / 2 + 1.1);
  const base = Math.min(...boxCorners({ ...l, hw: l.w / 2, hd: l.d / 2 }).map((p) => heightAt(p.x, p.z)), heightAt(l.x, l.z)) - 0.3;
  return { ...l, door, front, base };
}

let cached: TownLayout | null = null;

export function getLayout(): TownLayout {
  if (cached) return cached;
  const roads: RoadInfo[] = ROADS.map((r) => ({ ...r, line: polyline(r.pts) }));
  const roadById = Object.fromEntries(roads.map((r) => [r.id, r]));
  const allRoadBoxes = roads.flatMap((r) => roadBoxes(r, 0.25));
  const lots: Lot[] = [];
  const obstacles: Box[] = [];

  // Landmarks reserve their ground first.
  const lm = LANDMARKS;
  obstacles.push({ kind: 'box', x: lm.church.x, z: lm.church.z, hw: lm.church.d / 2, hd: lm.church.w / 2, rot: faceToRot(lm.church.face), top: 14, id: 'church' });
  for (const p of PLAZAS) {
    obstacles.push({ kind: 'box', x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2, hw: (p.x1 - p.x0) / 2 + 0.8, hd: (p.z1 - p.z0) / 2 + 0.8, rot: 0, top: 0, id: `plaza:${p.id}` });
  }
  const blocked = (b: Box, pad: number) =>
    lots.some((l) => boxesOverlap(lotBox(l), b, pad)) || obstacles.some((o) => boxesOverlap(o, b, pad)) || allRoadBoxes.some((rb) => boxesOverlap(rb, b));

  const R = rng(20261018);

  // Special lots (shops, rentable rooms).
  for (const s of SPECIAL_LOTS) {
    let x: number;
    let z: number;
    let rot: number;
    let road: string | undefined;
    if (s.road) {
      const rd = roadById[s.road];
      const p = pointAt(rd.line, s.t ?? 0);
      const ln = leftNormal(p.dx, p.dz);
      const n = s.side === 'L' ? ln : { x: -ln.x, z: -ln.z };
      const off = rd.width / 2 + 0.4 + s.d / 2;
      x = p.x + n.x * off;
      z = p.z + n.z * off;
      rot = Math.atan2(-n.x, -n.z);
      road = s.road;
    } else {
      x = s.x ?? 0;
      z = s.z ?? 0;
      rot = faceToRot(s.face ?? 's');
    }
    const district = s.shop ? SHOP_BY_ID[s.shop].district : districtAt(x, z);
    lots.push(finishLot({
      id: s.id, kind: s.kind, shop: s.shop, home: s.home, x, z, rot, w: s.w, d: s.d, floors: s.floors, district,
      road, side: s.side, t: s.t, style: { ...makeStyle(R, district, s.awning), balcony: s.home === 'h02' || R() < 0.4 }, seed: Math.floor(R() * 1e9),
    }));
  }

  // Ordinary houses along roads.
  for (const rd of roads) {
    for (const side of rd.fill) {
      let t = 2.5;
      const end = Math.min(rd.line.total - 2, rd.fillTo ?? Infinity);
      while (t < end) {
        const w = 5 + R() * 4;
        const d = 6 + R() * 4;
        const tc = t + w / 2;
        const p = pointAt(rd.line, tc);
        const ln = leftNormal(p.dx, p.dz);
        const n = side === 'L' ? ln : { x: -ln.x, z: -ln.z };
        const off = rd.width / 2 + 0.4 + d / 2;
        const lot = { x: p.x + n.x * off, z: p.z + n.z * off, rot: Math.atan2(-n.x, -n.z), w, d };
        const box = lotBox(lot);
        const district = districtAt(lot.x, lot.z);
        if (inMask(lot.x, lot.z) && lotGroundOk(box) && !blocked(box, 0.5)) {
          const floors = district === 'chora' ? 1 + Math.floor(R() * 2) : district === 'geitonia' ? 2 + Math.floor(R() * 2) : 1 + Math.floor(R() * 3);
          lots.push(finishLot({
            id: `${rd.id}-${side}-${Math.round(tc)}`, kind: 'house', ...lot, floors, district, road: rd.id, side, t: tc,
            style: makeStyle(R, district), seed: Math.floor(R() * 1e9),
          }));
          t += w + 0.6 + R() * 1.6;
        } else {
          t += 1.5;
        }
      }
    }
  }

  // Back rows: fill the gaps behind the street fronts so the town reads as dense.
  const backAreas: [number, number, number, number, number][] = [
    [-122, -56, -2, 18, 240], [4, -54, 110, 12, 260], [-34, -142, 124, -58, 260], [102, -6, 254, 26, 90], [-2, 28, 100, 40, 40],
  ];
  for (const [x0, z0, x1, z1, tries] of backAreas) {
    for (let i = 0; i < tries; i++) {
      const x = x0 + R() * (x1 - x0);
      const z = z0 + R() * (z1 - z0);
      // face the nearest road
      let best: { d: number; rot: number } = { d: Infinity, rot: 0 };
      for (const rd of roads) {
        for (let k = 1; k < rd.pts.length; k++) {
          const dist = distanceToPolyline(x, z, [rd.pts[k - 1], rd.pts[k]]);
          if (dist < best.d) {
            const [ax, az] = rd.pts[k - 1];
            const [bx, bz] = rd.pts[k];
            const ang = Math.atan2(bx - ax, bz - az);
            // cross > 0: the point is right of the travel direction, so the front turns left
            const onRight = (bx - ax) * (z - az) - (bz - az) * (x - ax) > 0;
            best = { d: dist, rot: ang + (onRight ? Math.PI / 2 : -Math.PI / 2) };
          }
        }
      }
      if (best.d < 9) continue;
      const w = 5 + R() * 4;
      const d = 5.5 + R() * 4;
      const lot = { x, z, rot: best.rot + (R() - 0.5) * 0.12, w, d };
      const box = lotBox(lot);
      if (!inMask(x, z) || !lotGroundOk(box) || blocked(box, 0.9)) continue;
      const district = districtAt(x, z);
      const floors = district === 'chora' ? 1 + Math.floor(R() * 2) : 1 + Math.floor(R() * 3);
      lots.push(finishLot({ id: `back-${lots.length}`, kind: 'house', ...lot, floors, district, style: makeStyle(R, district), seed: Math.floor(R() * 1e9) }));
    }
  }

  // House numbers: odd on the left, even on the right, in order along the road.
  for (const rd of roads) {
    for (const side of ['L', 'R'] as Side[]) {
      const onSide = lots.filter((l) => l.road === rd.id && l.side === side).sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
      onSide.forEach((l, i) => { l.addressNo = side === 'L' ? 1 + i * 2 : 2 + i * 2; });
    }
  }

  // Residents' homes.
  const npcHome: Record<string, Lot> = {};
  const used = new Set<string>();
  const free = (roadId: string) => lots.filter((l) => l.kind === 'house' && l.road === roadId && l.addressNo && !used.has(l.id));
  const lotById = Object.fromEntries(lots.map((l) => [l.id, l]));
  for (const npc of NPCS) {
    const pref = HOME_PREFS[npc.id];
    let choice: Lot | undefined;
    if (pref) {
      let cands = free(pref.road);
      if (pref.near && lotById[pref.near]) {
        const t = lotById[pref.near];
        cands = cands.sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z));
      }
      choice = cands[0];
    }
    if (!choice) {
      for (const roadId of HOME_ROADS[npc.district]) {
        const cands = free(roadId);
        if (cands.length) { choice = cands[Math.floor(cands.length / 2)]; break; }
      }
    }
    if (!choice) choice = lots.find((l) => l.kind === 'house' && l.addressNo && !used.has(l.id));
    if (choice) { used.add(choice.id); npcHome[npc.id] = choice; }
  }

  cached = { roads, lots, obstacles, npcHome, lotById };
  return cached;
}

export const roadName = (id: string | undefined) => ROADS.find((r) => r.id === id);

/** "Οδός Ανέμων 5" style address for a lot (null for back-row houses). */
export function addressOf(lot: Lot): { el: string; en: string } | null {
  const rd = roadName(lot.road);
  if (!rd || !lot.addressNo) return null;
  return { el: `${rd.el} ${lot.addressNo}`, en: `${lot.addressNo} ${rd.en}` };
}
