// The rented room: walls with door and windows, fixed kitchen, balcony or
// courtyard, and the player's furniture. Rebuilt when the arrangement changes.

import * as THREE from 'three';
import { HOME_BY_ID, type HomeDef, type WallSide } from '../data/homes';
import { FURNITURE_BY_ID } from '../data/furniture';
import { StaticBuilder, vertexColorMaterial } from './builder';
import { buildFurniture } from './furniture3d';
import { viewTexture } from './textures';
import { wallMaterial } from './interiors';
import { ShapeGrid, type Shape } from '../core/geo';
import { rotatedSize, WALL_ROWS } from '../core/housing';
import type { OwnedFurniture, Placement } from '../core/state';
import type { Area, Interactable } from './types';
import type { Lot } from './layout';

export const CELL = 0.5;
const H = 2.8;
const T = 0.16;

export const HOME_ORIGIN = { x: 5000, z: 4000 };

export interface HomeArea extends Area {
  home: HomeDef;
  ox: number;
  oz: number;
  furnitureGroup: THREE.Group;
  setFurniture(list: OwnedFurniture[], viewing: boolean): void;
  cellCenter(area: 'main' | 'out', x: number, z: number): { x: number; z: number };
  /** World → cell, or null when outside the area. */
  cellAt(area: 'main' | 'out', wx: number, wz: number): { x: number; z: number } | null;
  wallFrame(wall: WallSide): { x0: number; z0: number; dx: number; dz: number; nx: number; nz: number; rot: number; len: number };
  placementTransform(f: OwnedFurniture, list: OwnedFurniture[]): { x: number; y: number; z: number; rot: number } | null;
  outdoorOrigin(): { x: number; z: number } | null;
}

export function buildHome(homeId: string, index: number, lot: Lot): HomeArea {
  const h = HOME_BY_ID[homeId];
  const ox = HOME_ORIGIN.x + index * 60;
  const oz = HOME_ORIGIN.z;
  const W = h.w * CELL;
  const D = h.d * CELL;
  const group = new THREE.Group();
  group.name = `home:${homeId}`;
  group.visible = false;
  const walls: Area['walls'] = [];
  const baseShapes: Shape[] = [];
  const b = new StaticBuilder();

  // floor: terracotta tiles (h04 old house: stone)
  const floorTex = tileTexture(homeId === 'h04' ? '#cdbfa6' : '#c97b52', homeId === 'h04' ? '#b5a68c' : '#b86a44');
  floorTex.repeat.set(W / 0.5, D / 0.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, 0.002, oz);
  floor.receiveShadow = true;
  floor.name = 'floor-main';
  group.add(floor);

  const frame = (wall: WallSide) => {
    // origin at the wall's first cell edge, direction along increasing column, inward normal
    if (wall === 'n') return { x0: ox - W / 2, z0: oz - D / 2, dx: 1, dz: 0, nx: 0, nz: 1, rot: 0, len: W };
    if (wall === 's') return { x0: ox - W / 2, z0: oz + D / 2, dx: 1, dz: 0, nx: 0, nz: -1, rot: Math.PI, len: W };
    if (wall === 'w') return { x0: ox - W / 2, z0: oz - D / 2, dx: 0, dz: 1, nx: 1, nz: 0, rot: Math.PI / 2, len: D };
    return { x0: ox + W / 2, z0: oz - D / 2, dx: 0, dz: 1, nx: -1, nz: 0, rot: -Math.PI / 2, len: D };
  };

  for (const side of ['n', 'e', 's', 'w'] as WallSide[]) {
    const f = frame(side);
    const openings: { a: number; b: number; bottom: number; top: number; kind: 'door' | 'window' | 'out'; view?: 'sea' | 'street' | 'hill' }[] = [];
    if (h.door.wall === side) openings.push({ a: h.door.col * CELL, b: (h.door.col + h.door.width) * CELL, bottom: 0, top: 2.1, kind: 'door' });
    for (const w of h.windows) if (w.wall === side) openings.push({ a: w.col * CELL, b: (w.col + w.width) * CELL, bottom: 1.1, top: 2.1, kind: 'window', view: w.view });
    if (h.outdoor && h.outdoor.wall === side) openings.push({ a: h.outdoor.door.col * CELL, b: (h.outdoor.door.col + h.outdoor.door.width) * CELL, bottom: 0, top: 2.2, kind: 'out' });
    openings.sort((p, q) => p.a - q.a);
    const mat = wallMaterial('#f8f5ee');
    const meshes: THREE.Mesh[] = [];
    const seg = (from: number, to: number, y0: number, y1: number) => {
      if (to - from < 0.01 || y1 - y0 < 0.01) return;
      const len = to - from;
      const g = new THREE.BoxGeometry(f.dx ? len : T, y1 - y0, f.dz ? len : T);
      const m = new THREE.Mesh(g, mat);
      const mid = (from + to) / 2;
      m.position.set(f.x0 + f.dx * mid - f.nx * T / 2, (y0 + y1) / 2, f.z0 + f.dz * mid - f.nz * T / 2);
      m.receiveShadow = true;
      group.add(m);
      meshes.push(m);
      if (y0 < 1.8) baseShapes.push({ kind: 'box', x: m.position.x, z: m.position.z, hw: (f.dx ? len : T) / 2, hd: (f.dz ? len : T) / 2, rot: 0, top: H });
    };
    let cur = -T;
    for (const o of openings) {
      seg(cur, o.a, 0, H);
      seg(o.a, o.b, o.top, H);
      seg(o.a, o.b, 0, o.bottom);
      if (o.kind === 'window') {
        const mid = (o.a + o.b) / 2;
        const px = f.x0 + f.dx * mid - f.nx * (T + 0.05);
        const pz = f.z0 + f.dz * mid - f.nz * (T + 0.05);
        const view = new THREE.Mesh(new THREE.PlaneGeometry(o.b - o.a, o.top - o.bottom), new THREE.MeshBasicMaterial({ map: viewTexture(o.view ?? 'street') }));
        view.position.set(px, (o.top + o.bottom) / 2, pz);
        view.rotation.y = f.rot;
        group.add(view);
        b.box(f.x0 + f.dx * mid, o.bottom - 0.06, f.z0 + f.dz * mid, f.dx ? o.b - o.a + 0.2 : 0.3, 0.06, f.dz ? o.b - o.a + 0.2 : 0.3, '#fdfcf8');
        b.box(f.x0 + f.dx * mid - f.nx * T / 2, o.bottom, f.z0 + f.dz * mid - f.nz * T / 2, f.dx ? 0.05 : 0.06, o.top - o.bottom, f.dz ? 0.05 : 0.06, '#2a5f9e');
      }
      if (o.kind === 'door') {
        const mid = (o.a + o.b) / 2;
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(o.b - o.a, o.top), new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
        glow.position.set(f.x0 + f.dx * mid - f.nx * (T + 0.02), o.top / 2, f.z0 + f.dz * mid - f.nz * (T + 0.02));
        glow.rotation.y = f.rot;
        group.add(glow);
      }
      cur = o.b;
    }
    seg(cur, f.len + T, 0, H);
    walls.push(...meshes.map((m) => ({ mesh: m, nx: f.nx, nz: f.nz, px: f.x0, pz: f.z0 })));
  }

  // fixed kitchen
  {
    const k = h.kitchen;
    const kx = ox - W / 2 + (k.x + k.w / 2) * CELL;
    const kz = oz - D / 2 + (k.z + k.d / 2) * CELL;
    const kw = k.w * CELL;
    const kd = k.d * CELL;
    b.box(kx, 0, kz, kw, 0.88, kd, '#e7e1d4');
    b.box(kx, 0.88, kz, kw + 0.02, 0.05, kd + 0.02, '#9aa3ab');
    const alongX = k.w >= k.d;
    const stoveX = alongX ? kx + kw / 2 - 0.3 : kx;
    const stoveZ = alongX ? kz : kz + kd / 2 - 0.3;
    b.box(stoveX, 0.93, stoveZ, 0.5, 0.02, 0.5, '#2b2b2b');
    for (const [dx, dz] of [[-0.12, -0.12], [0.12, 0.12], [-0.12, 0.12], [0.12, -0.12]]) b.cylinder(stoveX + dx, 0.95, stoveZ + dz, 0.07, 0.01, '#555', 10);
    b.cylinder(stoveX + 0.12, 0.96, stoveZ - 0.12, 0.05, 0.1, '#b08d3c', 8); // μπρίκι
    const sinkX = alongX ? kx - kw / 2 + 0.35 : kx;
    const sinkZ = alongX ? kz : kz - kd / 2 + 0.35;
    b.box(sinkX, 0.9, sinkZ, 0.45, 0.04, 0.4, '#c9d1d9');
    // oven door facing the room
    const ovenPos = alongX ? { x: stoveX, z: kz + kd / 2 + 0.005 } : { x: kx + kw / 2 + 0.005, z: stoveZ };
    b.box(ovenPos.x, 0.15, ovenPos.z, alongX ? 0.5 : 0.02, 0.55, alongX ? 0.02 : 0.5, '#3b3b3b');
    if (h.griddle) b.box(stoveX - (alongX ? 0.5 : 0), 0.93, stoveZ - (alongX ? 0 : 0.5), 0.35, 0.03, 0.35, '#1b1b1b');
    // jars on a shelf above
    const shelfPos = alongX ? { x: kx, z: kz - kd / 2 + 0.12 } : { x: kx - kw / 2 + 0.12, z: kz };
    b.box(shelfPos.x, 1.6, shelfPos.z, alongX ? kw : 0.22, 0.04, alongX ? 0.22 : kd, '#a0784e');
    for (let i = 0; i < 4; i++) {
      const t = -0.6 + i * 0.4;
      b.cylinder(shelfPos.x + (alongX ? t : 0), 1.64, shelfPos.z + (alongX ? 0 : t), 0.06, 0.16, ['#e0b84a', '#3f7f3f', '#f4f1ea', '#b23a48'][i], 8);
    }
    baseShapes.push({ kind: 'box', x: kx, z: kz, hw: kw / 2, hd: kd / 2, rot: 0, top: 0.95 });
  }

  // balcony / courtyard
  let outOrigin: { x: number; z: number } | null = null;
  const bounds = [{ x0: ox - W / 2 + 0.2, z0: oz - D / 2 + 0.2, x1: ox + W / 2 - 0.2, z1: oz + D / 2 - 0.2 }];
  if (h.outdoor) {
    const o = h.outdoor;
    // only southern attachment is used by the data
    const x0 = ox - W / 2 + o.offset * CELL;
    const z0 = oz + D / 2 + T;
    const ow = o.w * CELL;
    const od = o.d * CELL;
    outOrigin = { x: x0, z: z0 };
    const tex = o.kind === 'balcony' ? tileTexture('#e9e3d6', '#d8d0c0') : tileTexture('#d9d2c4', '#bdb4a3');
    tex.repeat.set(ow / 0.5, od / 0.5);
    const of = new THREE.Mesh(new THREE.PlaneGeometry(ow, od), new THREE.MeshLambertMaterial({ map: tex }));
    of.rotation.x = -Math.PI / 2;
    of.position.set(x0 + ow / 2, 0.002, z0 + od / 2);
    of.receiveShadow = true;
    of.name = 'floor-out';
    group.add(of);
    // the gap through the wall
    const dx0 = ox - W / 2 + o.door.col * CELL;
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(o.door.width * CELL, T), new THREE.MeshLambertMaterial({ color: '#d8d0c0' }));
    gap.rotation.x = -Math.PI / 2;
    gap.position.set(dx0 + (o.door.width * CELL) / 2, 0.002, oz + D / 2 + T / 2);
    group.add(gap);
    bounds.push({ x0: dx0 + 0.15, z0: oz + D / 2 - 0.3, x1: dx0 + o.door.width * CELL - 0.15, z1: z0 + 0.3 });
    bounds.push({ x0: x0 + 0.15, z0: z0 + 0.1, x1: x0 + ow - 0.15, z1: z0 + od - 0.15 });
    if (o.kind === 'balcony') {
      for (const [x, z, w, d] of [[x0 + ow / 2, z0 + od, ow, 0.06], [x0, z0 + od / 2, 0.06, od], [x0 + ow, z0 + od / 2, 0.06, od]]) {
        b.box(x, 0, z, w, 1.0, d, '#fbfaf5');
        b.box(x, 1.0, z, w + 0.04, 0.05, d + 0.04, '#2a5f9e');
      }
      const view = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ map: viewTexture('sea') }));
      view.position.set(x0 + ow / 2, 3, z0 + od + 12);
      view.rotation.y = Math.PI;
      group.add(view);
    } else {
      for (const [x, z, w, d] of [[x0 + ow / 2, z0 + od + 0.08, ow + 0.16, 0.16], [x0 - 0.08, z0 + od / 2, 0.16, od + 0.16], [x0 + ow + 0.08, z0 + od / 2, 0.16, od + 0.16]]) {
        b.box(x, 0, z, w, 2.2, d, '#fbfaf5');
        b.box(x, 2.2, z, w + 0.04, 0.08, d + 0.04, '#fdfcf8');
      }
      // bougainvillea over the courtyard wall
      for (let i = 0; i < 7; i++) b.ball(x0 + 0.2 + i * 0.3, 2.3 + (i % 2) * 0.15, z0 + od + 0.1, 0.25, i % 3 ? '#c2185b' : '#3f7f3f');
    }
  }

  group.add(b.build(vertexColorMaterial()));
  const lamp = new THREE.PointLight('#ffe7c2', 9, 12, 1.6);
  lamp.position.set(ox, H - 0.3, oz);
  group.add(lamp);
  const ceilingGlow = new THREE.AmbientLight('#fff4e0', 0.25);
  group.add(ceilingGlow);

  const furnitureGroup = new THREE.Group();
  group.add(furnitureGroup);

  const cellCenter = (area: 'main' | 'out', x: number, z: number) => {
    if (area === 'main') return { x: ox - W / 2 + (x + 0.5) * CELL, z: oz - D / 2 + (z + 0.5) * CELL };
    const o = outOrigin ?? { x: ox, z: oz };
    return { x: o.x + (x + 0.5) * CELL, z: o.z + (z + 0.5) * CELL };
  };
  const cellAt = (area: 'main' | 'out', wx: number, wz: number) => {
    if (area === 'main') {
      const x = Math.floor((wx - (ox - W / 2)) / CELL);
      const z = Math.floor((wz - (oz - D / 2)) / CELL);
      return x >= 0 && z >= 0 && x < h.w && z < h.d ? { x, z } : null;
    }
    if (!outOrigin || !h.outdoor) return null;
    const x = Math.floor((wx - outOrigin.x) / CELL);
    const z = Math.floor((wz - outOrigin.z) / CELL);
    return x >= 0 && z >= 0 && x < h.outdoor.w && z < h.outdoor.d ? { x, z } : null;
  };

  const placementTransform = (f: OwnedFurniture, list: OwnedFurniture[]): { x: number; y: number; z: number; rot: number } | null => {
    const p = f.place;
    if (!p) return null;
    const def = FURNITURE_BY_ID[f.id];
    if (p.k === 'floor') {
      const { w, d } = rotatedSize(def, p.r);
      const a = cellCenter(p.area, p.x, p.z);
      return { x: a.x - CELL / 2 + (w * CELL) / 2, y: 0, z: a.z - CELL / 2 + (d * CELL) / 2, rot: -p.r * (Math.PI / 2) };
    }
    if (p.k === 'wall') {
      const fr = frame(p.wall);
      const along = (p.c + def.w / 2) * CELL;
      return { x: fr.x0 + fr.dx * along + fr.nx * 0.01, y: 0.6 + (p.row + def.d / 2) * CELL, z: fr.z0 + fr.dz * along + fr.nz * 0.01, rot: fr.rot };
    }
    if (p.k === 'window') {
      const w = h.windows[p.i];
      const fr = frame(w.wall);
      const along = (w.col + w.width / 2) * CELL;
      return { x: fr.x0 + fr.dx * along + fr.nx * 0.04, y: 1.6, z: fr.z0 + fr.dz * along + fr.nz * 0.04, rot: fr.rot };
    }
    const host = list.find((o) => o.uid === p.host);
    if (!host) return null;
    const ht = placementTransform(host, list);
    if (!ht) return null;
    const hd = FURNITURE_BY_ID[host.id];
    const slots = hd.anchors ?? 1;
    const offset = slots === 1 ? 0 : (p.i === 0 ? -1 : 1) * (hd.w * CELL) / 4;
    const topY = { f03: 0.77, f06: 0.79, f07: 0.47, f13: 0.5 }[host.id] ?? 0.75;
    const c = Math.cos(ht.rot);
    const s = Math.sin(ht.rot);
    return { x: ht.x + offset * c, y: topY, z: ht.z - offset * s, rot: ht.rot };
  };

  const area: HomeArea = {
    id: `home:${homeId}`, group, grid: new ShapeGrid(4), dynamic: [], interactables: [], floorY: 0, bounds, walls,
    spawn: spawnFor(h, ox, oz, W, D), exit: { area: 'town', x: lot.front.x, z: lot.front.z, yaw: lot.rot },
    zones: {}, staff: {}, home: h, ox, oz, furnitureGroup,
    cellCenter, cellAt, wallFrame: frame, placementTransform,
    outdoorOrigin: () => outOrigin,
    setFurniture(list: OwnedFurniture[], viewing: boolean) {
      for (const c of [...furnitureGroup.children]) furnitureGroup.remove(c);
      const shapes: Shape[] = [...baseShapes];
      const inter: Interactable[] = [];
      const id = `home:${homeId}`;
      const exitCell = doorInside(h);
      const ex = cellCenter('main', exitCell[0], exitCell[1]);
      inter.push({ id: `exit:${id}`, area: id, kind: 'exit', ref: homeId, x: ex.x, z: ex.z, r: 1.0 });
      if (!viewing) {
        const use = h.kitchen.use[Math.floor(h.kitchen.use.length / 2)];
        const kc = cellCenter('main', use[0], use[1]);
        inter.push({ id: `kitchen:${id}`, area: id, kind: 'kitchen', ref: homeId, x: kc.x, z: kc.z, r: 1.1 });
      }
      for (const f of list) {
        const t = placementTransform(f, list);
        if (!t) continue;
        const def = FURNITURE_BY_ID[f.id];
        const width = f.place?.k === 'window' ? h.windows[f.place.i].width : 2;
        const m = buildFurniture(f.id, width);
        m.position.set(t.x, t.y, t.z);
        m.rotation.y = t.rot;
        m.userData.uid = f.uid;
        m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        furnitureGroup.add(m);
        if (f.place?.k === 'floor' && !def.rug) {
          const { w, d } = rotatedSize(def, f.place.r);
          shapes.push({ kind: 'box', x: t.x, z: t.z, hw: (w * CELL) / 2 - 0.04, hd: (d * CELL) / 2 - 0.04, rot: 0, top: def.tall ? 2 : 1 });
        }
        if (!viewing && f.place?.k === 'floor' && def.bed) inter.push({ id: `bed:${f.uid}`, area: id, kind: 'bed', ref: f.uid, x: t.x, z: t.z, r: Math.max(def.w, def.d) * CELL * 0.75 + 0.5 });
        if (!viewing && f.place?.k === 'floor' && def.wardrobe) inter.push({ id: `wardrobe:${f.uid}`, area: id, kind: 'wardrobe', ref: f.uid, x: t.x, z: t.z, r: 1.3 });
      }
      const grid = new ShapeGrid(4);
      for (const s of shapes) grid.add(s);
      area.grid = grid;
      area.interactables = inter;
    },
  };
  area.setFurniture([], true);
  return area;
}

export function doorInside(h: HomeDef): [number, number] {
  const c = h.door.col + (h.door.width > 1 ? 1 : 0);
  if (h.door.wall === 's') return [c, h.d - 1];
  if (h.door.wall === 'n') return [c, 0];
  if (h.door.wall === 'w') return [0, c];
  return [h.w - 1, c];
}

function spawnFor(h: HomeDef, ox: number, oz: number, W: number, D: number) {
  const [cx, cz] = doorInside(h);
  const x = ox - W / 2 + (cx + 0.5) * CELL;
  const z = oz - D / 2 + (cz + 0.5) * CELL;
  const yaw = h.door.wall === 's' ? Math.PI : h.door.wall === 'n' ? 0 : h.door.wall === 'w' ? Math.PI / 2 : -Math.PI / 2;
  return { x, z, yaw };
}

const tileCache = new Map<string, THREE.CanvasTexture>();
function tileTexture(a: string, bcol: string) {
  const key = `${a}${bcol}`;
  const cached = tileCache.get(key);
  if (cached) { const c2 = cached.clone(); c2.needsUpdate = true; return c2; }
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = bcol;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = a;
  g.fillRect(2, 2, 60, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  tileCache.set(key, t);
  const t2 = t.clone();
  t2.needsUpdate = true;
  return t2;
}

export { WALL_ROWS };
export type { Placement };
