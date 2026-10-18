// Walk-in interiors: café, bakery, taverna, mini market, furniture shop,
// clothes shop and kafeneio (SPEC §4). Each is a separate area far from the
// town; doors switch areas. Walls facing the camera fade (cut-away view).

import * as THREE from 'three';
import { StaticBuilder, vertexColorMaterial } from './builder';
import { ShapeGrid, type Shape } from '../core/geo';
import { signTexture } from './textures';
import { buildFurniture } from './furniture3d';
import { SHOP_BY_ID, type InteriorKind } from '../data/shops';
import { CLOTHES } from '../data/clothes';
import type { Area, Interactable } from './types';
import type { Lot } from './layout';

export const INTERIOR_ORIGIN = { x: 4000, z: 4000 };

interface RoomSpec { W: number; D: number; H: number; floor: string; wall: string; trim: string }

const SPECS: Record<InteriorKind, RoomSpec> = {
  cafe: { W: 10, D: 8, H: 3.2, floor: '#c8b59a', wall: '#f6f3ec', trim: '#1f4e8c' },
  bakery: { W: 8, D: 7, H: 3.1, floor: '#d9c7a8', wall: '#fbf6ec', trim: '#a0522d' },
  taverna: { W: 12, D: 9, H: 3.3, floor: '#bfa78a', wall: '#f7f3ea', trim: '#1f5f8b' },
  minimarket: { W: 10, D: 9, H: 3.2, floor: '#d8d8d2', wall: '#f8f8f6', trim: '#d84a2f' },
  furniture: { W: 12, D: 10, H: 3.4, floor: '#b89a74', wall: '#f5f0e6', trim: '#7a5230' },
  clothes: { W: 9, D: 8, H: 3.2, floor: '#e6dccb', wall: '#fbfaf6', trim: '#2f6f8f' },
  kafeneio: { W: 10, D: 8, H: 3.2, floor: '#9f8a6c', wall: '#efe8d8', trim: '#2a4f7a' },
};

export function wallMaterial(color: string) {
  return new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 1 });
}

/** Room shell with a door in the south wall at x = doorX. Returns walls and collision shapes. */
export function roomShell(group: THREE.Group, ox: number, oz: number, W: number, D: number, H: number, wallColor: string, floorColor: string, doorX = 0, doorW = 1.2) {
  const walls: Area['walls'] = [];
  const shapes: Shape[] = [];
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ color: floorColor }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, 0.001, oz);
  floor.receiveShadow = true;
  group.add(floor);
  const T = 0.2;
  const mk = (w: number, h: number, d: number, x: number, y: number, z: number, nx: number, nz: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial(wallColor));
    m.position.set(ox + x, y, oz + z);
    m.receiveShadow = true;
    group.add(m);
    walls.push({ mesh: m, nx, nz, px: ox + x - nx * (d > w ? T / 2 : 0), pz: oz + z - nz * (w > d ? T / 2 : 0) });
    shapes.push({ kind: 'box', x: ox + x, z: oz + z, hw: w / 2, hd: d / 2, rot: 0, top: H });
  };
  mk(W + T * 2, H, T, 0, H / 2, -D / 2 - T / 2, 0, 1); // north
  mk(T, H, D, -W / 2 - T / 2, H / 2, 0, 1, 0); // west
  mk(T, H, D, W / 2 + T / 2, H / 2, 0, -1, 0); // east
  const left = doorX - doorW / 2 + W / 2;
  const right = W / 2 - (doorX + doorW / 2);
  mk(left, H, T, -W / 2 + left / 2, H / 2, D / 2 + T / 2, 0, -1);
  mk(right, H, T, W / 2 - right / 2, H / 2, D / 2 + T / 2, 0, -1);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, H - 2.2, T), wallMaterial(wallColor));
  lintel.position.set(ox + doorX, 2.2 + (H - 2.2) / 2, oz + D / 2 + T / 2);
  group.add(lintel);
  walls.push({ mesh: lintel, nx: 0, nz: -1, px: ox + doorX, pz: oz + D / 2 });
  // light from the doorway
  const door = new THREE.Mesh(new THREE.PlaneGeometry(doorW, 2.2), new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
  door.position.set(ox + doorX, 1.1, oz + D / 2 + T + 0.01);
  door.rotation.y = Math.PI;
  group.add(door);
  return { walls, shapes };
}

function staffLine(id: string): [number, number, number][] {
  void id;
  return [];
}

export function buildInterior(kind: InteriorKind, shopId: string, index: number, lot: Lot): Area {
  const spec = SPECS[kind];
  const ox = INTERIOR_ORIGIN.x + index * 60;
  const oz = INTERIOR_ORIGIN.z;
  const group = new THREE.Group();
  group.name = `int:${shopId}`;
  group.visible = false;
  const { W, D, H } = spec;
  const { walls, shapes } = roomShell(group, ox, oz, W, D, H, spec.wall, spec.floor);
  const b = new StaticBuilder();
  const inter: Interactable[] = [];
  const zones: Record<string, [number, number][]> = {};
  const staff: Record<string, [number, number, number][]> = { [shopId]: staffLine(shopId) };
  const box = (x: number, z: number, w: number, d: number, h: number, color: string, collide = true) => {
    b.box(ox + x, 0, oz + z, w, h, d, color);
    if (collide) shapes.push({ kind: 'box', x: ox + x, z: oz + z, hw: w / 2, hd: d / 2, rot: 0, top: h });
  };
  const sign = (text: string, x: number, y: number, z: number, w: number, rotY = 0, bg = '#fbf8f0', fg = spec.trim) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.19), new THREE.MeshLambertMaterial({ map: signTexture(text, { bg, fg, border: fg }) }));
    m.position.set(ox + x, y, oz + z);
    m.rotation.y = rotY;
    group.add(m);
  };
  const counterFront = (x: number, z: number) => inter.push({ id: `counter:${shopId}`, area: `int:${shopId}`, kind: 'counter', ref: shopId, x: ox + x, z: oz + z, r: 1.6 });
  // trim line along walls
  for (const [x, z, w, d] of [[0, -D / 2 + 0.03, W, 0.06], [-W / 2 + 0.03, 0, 0.06, D], [W / 2 - 0.03, 0, 0.06, D]] as const) b.box(ox + x, 0, oz + z, w, 0.12, d, spec.trim);

  const shop = SHOP_BY_ID[shopId];
  sign(shop.sign, 0, H - 0.55, -D / 2 + 0.02, Math.min(W * 0.6, 5));

  if (kind === 'cafe') {
    box(0, -D / 2 + 1.2, W * 0.6, 0.8, 1.05, '#2f4f6f');
    b.box(ox, 1.05, oz - D / 2 + 1.2, W * 0.6 + 0.1, 0.06, 0.9, '#e9e3d6');
    b.box(ox - 1.6, 1.11, oz - D / 2 + 1.1, 0.7, 0.45, 0.45, '#9aa3ab'); // espresso machine
    b.box(ox + 0.8, 1.11, oz - D / 2 + 1.1, 0.25, 0.4, 0.25, '#d0d0d0'); // frappé mixer
    for (let i = 0; i < 6; i++) b.cylinder(ox + 1.4 + i * 0.18, 1.11, oz - D / 2 + 1.3, 0.05, 0.14, '#f4f4f4', 8);
    box(0, -D / 2 + 0.25, W * 0.7, 0.4, 1.8, '#d9cdb4');
    for (let i = 0; i < 10; i++) b.cylinder(ox - 2.6 + i * 0.55, 1.2, oz - D / 2 + 0.3, 0.06, 0.18, ['#4f8a3b', '#d84a2f', '#e0b84a'][i % 3], 6);
    const tables: [number, number][] = [[-3, 1.2], [-0.6, 1.8], [2.4, 1.2], [3.6, -1.2]];
    for (const [x, z] of tables) {
      b.cylinder(ox + x, 0, oz + z, 0.05, 0.74, '#333', 6);
      b.cylinder(ox + x, 0.74, oz + z, 0.42, 0.04, '#f4f4f4', 12);
      for (const dx of [-0.65, 0.65]) b.box(ox + x + dx, 0, oz + z, 0.4, 0.46, 0.4, '#2b2b2b');
      shapes.push({ kind: 'circle', x: ox + x, z: oz + z, r: 0.5, top: 0.8 });
    }
    zones.cafe_table = [[ox - 3, oz + 1.95], [ox + 2.4, oz + 1.95]];
    staff[shopId] = [[ox - 1.5, oz - D / 2 + 0.6, 0], [ox + 1.5, oz - D / 2 + 0.6, 0]];
    counterFront(0, -D / 2 + 2.3);
    inter.push({ id: `job:${shopId}`, area: `int:${shopId}`, kind: 'jobStation', ref: 'cafe', x: ox + 2.6, z: oz - D / 2 + 2.3, r: 1.3 });
  }
  if (kind === 'bakery') {
    box(0, -0.4, W * 0.62, 0.8, 1.0, '#c8823a');
    const glass = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 0.35, 0.7), new THREE.MeshLambertMaterial({ color: '#cfe8f2', transparent: true, opacity: 0.4 }));
    glass.position.set(ox, 1.18, oz - 0.4);
    group.add(glass);
    for (let i = 0; i < 8; i++) b.ball(ox - 2 + i * 0.55, 1.08, oz - 0.4, 0.14, ['#d9a35a', '#e8c37a', '#b97a3a'][i % 3], 0, 0.5);
    for (let s = 0; s < 4; s++) {
      box(0, -D / 2 + 0.35, W * 0.85, 0.5, 0.05, '#8b6a45', false);
      b.box(ox, 0.4 + s * 0.45, oz - D / 2 + 0.35, W * 0.85, 0.04, 0.5, '#8b6a45');
      for (let k = 0; k < 10; k++) b.ball(ox - 3 + k * 0.66, 0.5 + s * 0.45, oz - D / 2 + 0.35, 0.15, s % 2 ? '#c99350' : '#e0b06a', 0, 0.55);
    }
    shapes.push({ kind: 'box', x: ox, z: oz - D / 2 + 0.35, hw: W * 0.43, hd: 0.3, rot: 0, top: 2 });
    box(W / 2 - 0.9, -D / 2 + 1.6, 1.3, 1.2, 1.7, '#9a948a'); // oven
    b.box(ox + W / 2 - 0.9, 0.5, oz - D / 2 + 2.21, 0.8, 0.6, 0.02, '#2b2b2b');
    staff[shopId] = [[ox - 1.2, oz - 1.4, 0], [ox + 1.2, oz - 1.4, 0]];
    counterFront(0, 0.9);
    inter.push({ id: `job:${shopId}`, area: `int:${shopId}`, kind: 'jobStation', ref: 'bakery', x: ox + W / 2 - 1.2, z: oz + 0.4, r: 1.3 });
  }
  if (kind === 'taverna') {
    // kitchen pass on the north wall
    box(0, -D / 2 + 0.6, 4, 0.6, 1.1, '#e9e3d6');
    b.box(ox, 1.1, oz - D / 2 + 0.25, 4, 1.2, 0.1, '#7a5230');
    const tables: [number, number][] = [[-4, -1], [-1.3, -0.6], [1.5, -1], [4, -0.6], [-3, 2.2], [0.5, 2.6], [3.6, 2.2]];
    for (const [x, z] of tables) {
      b.box(ox + x, 0.74, oz + z, 1.2, 0.05, 0.9, '#f4f4f4');
      for (let i = 0; i < 4; i++) b.box(ox + x - 0.45 + (i % 2) * 0.9, 0.791, oz + z - 0.3 + Math.floor(i / 2) * 0.6, 0.3, 0.005, 0.3, '#3a7cc2');
      for (const [sx, sz] of [[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]]) b.box(ox + x + sx, 0, oz + z + sz, 0.08, 0.74, 0.08, '#7a5230');
      for (const dz of [-0.75, 0.75]) b.box(ox + x, 0, oz + z + dz, 0.42, 0.45, 0.42, '#1f5fa8');
      shapes.push({ kind: 'box', x: ox + x, z: oz + z, hw: 0.65, hd: 0.5, rot: 0, top: 0.8 });
    }
    staff[shopId] = [[ox + 2.5, oz + 0.8, Math.PI], [ox - 2.6, oz + 0.8, Math.PI / 2], [ox, oz - D / 2 + 0.25 - 0.6, 0]];
    staff[shopId][2] = [ox + 0.9, oz - D / 2 + 1.2, 0];
    counterFront(-1.6, -D / 2 + 1.5);
    inter.push({ id: `job:${shopId}`, area: `int:${shopId}`, kind: 'jobStation', ref: 'taverna', x: ox + 1.2, z: oz - D / 2 + 1.5, r: 1.3 });
  }
  if (kind === 'minimarket') {
    const colors = ['#e03131', '#1c7ed6', '#f2c94c', '#2f9e44', '#f08c00', '#ae3ec9', '#ffffff'];
    for (const x of [-3, 0, 3]) {
      box(x, -0.8, 0.8, 4.2, 1.6, '#e9ecef');
      for (let s = 0; s < 3; s++) for (let k = 0; k < 12; k++) {
        for (const side of [-1, 1]) b.box(ox + x + side * 0.33, 0.25 + s * 0.5, oz - 2.7 + k * 0.35, 0.12, 0.24, 0.24, colors[(k + s + (side > 0 ? 3 : 0)) % colors.length]);
      }
    }
    box(-W / 2 + 0.5, -D / 2 + 2.5, 0.8, 4, 1.9, '#cfe3ef'); // fridges
    box(W / 2 - 1.4, D / 2 - 1.8, 1.6, 0.8, 1.0, '#d84a2f'); // till
    staff[shopId] = [[ox + W / 2 - 1.4, oz + D / 2 - 2.6, 0]];
    staff[shopId] = [[ox + W / 2 - 0.5, oz + D / 2 - 1.8, -Math.PI / 2]];
    counterFront(W / 2 - 2.8, D / 2 - 1.8);
  }
  if (kind === 'furniture') {
    const show: [string, number, number, number][] = [
      ['f08', -3.5, -2.8, 0], ['f09', -0.8, -3, 0], ['f02', 3.2, -2.6, 0], ['f06', -3.6, 0.6, 0], ['f10', 1.4, -4.3, 0],
      ['f12', 4.6, -4.3, 0], ['f19', 0.4, 0.4, 0], ['f07', 0.4, 0.4, 0], ['f17', 5, 0.5, 0], ['f14', 2.8, 1.8, 0],
      ['f25', -1.8, 2.8, 0], ['f05', -1.0, 2.8, 0], ['f26', 5, 2.6, 0],
    ];
    for (const [id, x, z, rot] of show) {
      const m = buildFurniture(id);
      m.position.set(ox + x, 0, oz + z);
      m.rotation.y = rot;
      group.add(m);
      if (id !== 'f19') shapes.push({ kind: 'circle', x: ox + x, z: oz + z, r: id === 'f08' || id === 'f02' || id === 'f06' ? 0.9 : 0.5, top: 1 });
    }
    box(-W / 2 + 1.3, D / 2 - 1.7, 2, 0.7, 1.0, '#7a5230');
    staff[shopId] = [[ox - W / 2 + 1.3, oz + D / 2 - 2.4, 0], [ox - W / 2 + 2.8, oz + D / 2 - 3.2, Math.PI / 4]];
    counterFront(-W / 2 + 1.3, D / 2 - 0.9);
  }
  if (kind === 'clothes') {
    for (const [x, z] of [[-2.5, -1.5], [0.5, -1.5], [3, -1.5]] as const) {
      b.box(ox + x, 0, oz + z, 0.06, 1.6, 0.06, '#3b3b3b');
      b.box(ox + x, 1.55, oz + z, 2, 0.04, 0.04, '#3b3b3b');
      shapes.push({ kind: 'box', x: ox + x, z: oz + z, hw: 1, hd: 0.3, rot: 0, top: 1.6 });
    }
    CLOTHES.forEach((c, i) => {
      const rack = i % 3;
      const x = [-2.5, 0.5, 3][rack] - 0.85 + Math.floor(i / 3) * 0.26;
      b.box(ox + x, 0.75, oz - 1.5, 0.05, 0.75, 0.42, c.color);
    });
    const mirror = buildFurniture('f27');
    mirror.position.set(ox + W / 2 - 0.12, 1.3, oz + 0.8);
    mirror.rotation.y = -Math.PI / 2;
    group.add(mirror);
    inter.push({ id: `mirror:${shopId}`, area: `int:${shopId}`, kind: 'mirror', ref: shopId, x: ox + W / 2 - 1, z: oz + 0.8, r: 1.2 });
    box(-W / 2 + 1.2, D / 2 - 2, 1.6, 0.7, 1.0, '#2f6f8f');
    staff[shopId] = [[ox - W / 2 + 1.2, oz + D / 2 - 2.7, 0]];
    counterFront(-W / 2 + 1.2, D / 2 - 1.2);
  }
  if (kind === 'kafeneio') {
    box(0, -D / 2 + 1, 3.6, 0.7, 1.05, '#7a5230');
    b.box(ox - 0.8, 1.05, oz - D / 2 + 1, 0.3, 0.2, 0.3, '#b08d3c'); // μπρίκι on the counter
    const tables: [number, number][] = [[-3, 0.8], [0, 1.6], [3, 0.8], [-3, -1.6], [3, -1.6]];
    for (const [x, z] of tables) {
      b.box(ox + x, 0.72, oz + z, 0.8, 0.04, 0.8, '#f1e6d2');
      b.box(ox + x, 0.76, oz + z, 0.6, 0.03, 0.4, '#8b5a2b'); // τάβλι
      for (let k = 0; k < 6; k++) b.box(ox + x - 0.25 + k * 0.1, 0.79, oz + z - 0.12, 0.04, 0.005, 0.12, k % 2 ? '#f4f4f4' : '#2b2b2b');
      for (const [sx, sz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) b.box(ox + x + sx, 0, oz + z + sz, 0.06, 0.72, 0.06, '#5a3d22');
      for (const dx of [-0.7, 0.7]) {
        b.box(ox + x + dx, 0, oz + z, 0.4, 0.45, 0.4, '#3a6f4f');
        b.box(ox + x + dx * 1.25, 0.45, oz + z, 0.05, 0.5, 0.4, '#3a6f4f');
      }
      shapes.push({ kind: 'box', x: ox + x, z: oz + z, hw: 0.45, hd: 0.45, rot: 0, top: 0.8 });
    }
    for (const [x, kindP] of [[-3, 'caique'], [3, 'windmill']] as const) {
      const p = buildFurniture(kindP === 'caique' ? 'f29' : 'f30');
      p.position.set(ox + x, 2.1, oz - D / 2 + 0.11);
      group.add(p);
    }
    zones.kafeneio_in = [[ox - 3.7, oz + 0.8], [ox - 2.3, oz + 0.8], [ox + 2.3, oz + 0.8], [ox + 3.7, oz + 0.8]];
    staff[shopId] = [[ox + 0.6, oz - D / 2 + 0.45, 0]];
    counterFront(0, -D / 2 + 1.9);
  }

  inter.push({ id: `exit:${shopId}`, area: `int:${shopId}`, kind: 'exit', ref: shopId, x: ox, z: oz + D / 2 - 0.6, r: 1.3 });
  group.add(b.build(vertexColorMaterial()));
  const lamp = new THREE.PointLight('#ffe7c2', 14, 16, 1.6);
  lamp.position.set(ox, H - 0.3, oz);
  group.add(lamp);

  const grid = new ShapeGrid(8);
  for (const s of shapes) grid.add(s);
  const yawOut = lot.rot; // facing away from the door, into the street
  return {
    id: `int:${shopId}`, group, grid, dynamic: [], interactables: inter, floorY: 0,
    bounds: [{ x0: ox - W / 2 + 0.3, z0: oz - D / 2 + 0.3, x1: ox + W / 2 - 0.3, z1: oz + D / 2 - 0.3 }],
    walls, spawn: { x: ox, z: oz + D / 2 - 1.1, yaw: Math.PI }, exit: { area: 'town', x: lot.front.x, z: lot.front.z, yaw: yawOut },
    zones, staff,
  };
}
