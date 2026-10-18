// A simple but recognisable 3D model for each of the 40 furniture items.
// Floor items: centred on their footprint, front = +z, bottom at y = 0.
// Wall items: back on the wall plane, facing +z. Anchor items: small, bottom at y = 0.

import * as THREE from 'three';
import { StaticBuilder, vertexColorMaterial } from './builder';
import { FURNITURE_BY_ID } from '../data/furniture';
import { paintingTexture } from './textures';

const CELL = 0.5;
const WOOD = '#a0784e';
const DARK_WOOD = '#6e4f33';
const WHITE = '#f4f1ea';
const BLUE = '#2a5f9e';

let sharedMat: THREE.Material | null = null;
const mat = () => (sharedMat ??= vertexColorMaterial());
const texCache = new Map<string, THREE.Texture>();
const tex = (k: 'caique' | 'windmill' | 'map' | 'plate' | 'mataki') => {
  let t = texCache.get(k);
  if (!t) { t = paintingTexture(k); texCache.set(k, t); }
  return t;
};

function legs(b: StaticBuilder, w: number, d: number, h: number, col: string, inset = 0.05, t = 0.05) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * (w / 2 - inset), 0, sz * (d / 2 - inset), t, h, t, col);
}

function plant(b: StaticBuilder, kind: 'basil' | 'geranium' | 'lemon' | 'bougainvillea') {
  b.cylinder(0, 0, 0, 0.18, 0.32, '#b5653e', 8, 1.2);
  if (kind === 'basil') { b.ball(0, 0.45, 0, 0.2, '#4f9a3f', 0); b.ball(0.08, 0.55, 0.05, 0.14, '#5fb04a', 0); }
  if (kind === 'geranium') { b.ball(0, 0.45, 0, 0.2, '#3f7f3f', 0); for (let i = 0; i < 5; i++) b.ball(Math.cos(i * 1.3) * 0.15, 0.6, Math.sin(i * 1.3) * 0.15, 0.07, '#e03131'); }
  if (kind === 'lemon') {
    b.cylinder(0, 0.3, 0, 0.04, 0.9, '#6b4a2b', 5);
    b.ball(0, 1.35, 0, 0.42, '#4f8a3b', 0);
    for (let i = 0; i < 5; i++) b.ball(Math.cos(i * 1.2) * 0.32, 1.2 + (i % 2) * 0.2, Math.sin(i * 1.2) * 0.32, 0.06, '#f2d600');
  }
  if (kind === 'bougainvillea') {
    b.cylinder(0, 0.3, 0, 0.04, 0.8, '#6b4a2b', 5);
    for (let i = 0; i < 6; i++) b.ball(Math.cos(i) * 0.25, 1.0 + (i % 3) * 0.2, Math.sin(i) * 0.25, 0.22, i % 2 ? '#c2185b' : '#d6336c', 0);
  }
}

/** Returns a model for a furniture id. `widthCells` is used for curtains (window width). */
export function buildFurniture(id: string, widthCells = 2): THREE.Object3D {
  const def = FURNITURE_BY_ID[id];
  const W = def.w * CELL;
  const D = def.d * CELL;
  const b = new StaticBuilder();
  const group = new THREE.Group();
  const texPlane = (k: Parameters<typeof tex>[0], w: number, h: number, y: number, round = false) => {
    const g = round ? new THREE.CircleGeometry(w / 2, 24) : new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex(k), transparent: round }));
    m.position.set(0, y, 0.035);
    group.add(m);
  };
  switch (id) {
    case 'f01':
    case 'f02': {
      b.box(0, 0, 0, W - 0.04, 0.32, D - 0.04, DARK_WOOD);
      b.box(0, 0.32, 0.05, W - 0.1, 0.18, D - 0.2, WHITE);
      b.box(0, 0.5, 0.25, W - 0.08, 0.06, D * 0.62, BLUE);
      b.box(0, 0.5, -D / 2 + 0.35, W * 0.6, 0.12, 0.35, '#ffffff');
      b.box(0, 0, -D / 2 + 0.05, W, 1.0, 0.08, DARK_WOOD);
      break;
    }
    case 'f03': {
      b.box(0, 0.72, 0, W, 0.05, D * 0.9, WOOD);
      legs(b, W, D * 0.9, 0.72, DARK_WOOD);
      b.box(W / 4, 0.5, 0, W / 2 - 0.1, 0.2, D * 0.8, WOOD);
      break;
    }
    case 'f04':
    case 'f05': {
      const seat = id === 'f05' ? '#d8c08a' : WOOD;
      b.box(0, 0.44, 0.02, 0.42, 0.05, 0.42, seat);
      legs(b, 0.42, 0.42, 0.44, id === 'f05' ? '#2a6f6f' : DARK_WOOD, 0.03, 0.04);
      b.box(0, 0.44, -0.19, 0.42, 0.5, 0.04, id === 'f05' ? '#2a6f6f' : DARK_WOOD);
      break;
    }
    case 'f06': {
      b.box(0, 0.74, 0, W - 0.05, 0.05, D - 0.05, WOOD);
      legs(b, W - 0.05, D - 0.05, 0.74, DARK_WOOD);
      b.box(0, 0.79, 0, W - 0.3, 0.005, D - 0.3, '#e9f1fb');
      break;
    }
    case 'f07': {
      b.box(0, 0.42, 0, W - 0.1, 0.05, D - 0.1, WOOD);
      legs(b, W - 0.1, D - 0.1, 0.42, DARK_WOOD);
      break;
    }
    case 'f08':
    case 'f09': {
      const c = id === 'f08' ? '#3d6f9e' : '#9e5b3d';
      b.box(0, 0.1, 0.05, W - 0.05, 0.35, D - 0.15, c);
      b.box(0, 0.1, -D / 2 + 0.1, W - 0.05, 0.85, 0.2, c);
      b.box(-W / 2 + 0.08, 0.1, 0.05, 0.16, 0.6, D - 0.15, c);
      b.box(W / 2 - 0.08, 0.1, 0.05, 0.16, 0.6, D - 0.15, c);
      b.box(0, 0.45, 0.08, W - 0.4, 0.1, D - 0.45, '#f1e6d2');
      legs(b, W - 0.1, D - 0.2, 0.1, DARK_WOOD);
      break;
    }
    case 'f10': {
      b.box(0, 0, 0, W - 0.04, 1.95, D - 0.04, WOOD);
      b.box(-W / 4, 0.1, D / 2 - 0.01, W / 2 - 0.08, 1.75, 0.02, '#b5895b');
      b.box(W / 4, 0.1, D / 2 - 0.01, W / 2 - 0.08, 1.75, 0.02, '#b5895b');
      b.box(-0.04, 0.95, D / 2 + 0.01, 0.03, 0.12, 0.03, '#d8b04a');
      b.box(0.04, 0.95, D / 2 + 0.01, 0.03, 0.12, 0.03, '#d8b04a');
      break;
    }
    case 'f11': {
      b.box(0, 0, 0, W - 0.04, 0.85, D - 0.08, WOOD);
      for (let i = 0; i < 3; i++) {
        b.box(0, 0.08 + i * 0.26, D / 2 - 0.03, W - 0.12, 0.22, 0.02, '#b5895b');
        b.box(0, 0.18 + i * 0.26, D / 2 - 0.01, 0.12, 0.03, 0.03, '#d8b04a');
      }
      break;
    }
    case 'f12': {
      b.box(0, 0, -D / 2 + 0.06, W - 0.04, 1.85, 0.04, DARK_WOOD);
      b.box(-W / 2 + 0.03, 0, 0, 0.04, 1.85, D - 0.1, DARK_WOOD);
      b.box(W / 2 - 0.03, 0, 0, 0.04, 1.85, D - 0.1, DARK_WOOD);
      const colors = ['#b23a48', '#2a5f9e', '#e0b84a', '#3f7f3f', '#6b4a8b', '#d9822b'];
      for (let s = 0; s < 4; s++) {
        b.box(0, s * 0.45 + 0.02, 0, W - 0.08, 0.03, D - 0.1, DARK_WOOD);
        for (let k = 0; k < 6; k++) b.box(-W / 2 + 0.12 + k * 0.13, s * 0.45 + 0.05, 0, 0.1, 0.3 + (k % 3) * 0.04, D - 0.2, colors[(k + s) % colors.length]);
      }
      break;
    }
    case 'f13': {
      b.box(0, 0, 0, 0.4, 0.5, 0.4, WOOD);
      b.box(0, 0.3, 0.2, 0.32, 0.14, 0.01, '#b5895b');
      break;
    }
    case 'f14': {
      b.box(0, 0, 0, W - 0.05, 0.48, D - 0.1, '#7a5230');
      b.box(0, 0.48, 0, W - 0.03, 0.08, D - 0.08, '#8b6a45');
      for (const x of [-W / 3, W / 3]) b.box(x, 0, 0, 0.05, 0.56, D - 0.06, '#3b3b3b');
      break;
    }
    case 'f15': b.cylinder(0, 0, 0, 0.21, 0.4, '#d9822b', 10); break;
    case 'f16': {
      b.cylinder(0, 0, 0, 0.18, 0.04, DARK_WOOD, 8);
      b.cylinder(0, 0, 0, 0.03, 1.75, DARK_WOOD, 6);
      for (let i = 0; i < 4; i++) b.box(Math.cos(i * 1.57) * 0.12, 1.55, Math.sin(i * 1.57) * 0.12, 0.2, 0.03, 0.03, DARK_WOOD, i * 1.57);
      b.box(0.12, 1.1, 0, 0.05, 0.5, 0.25, '#7a8a6a');
      break;
    }
    case 'f17': {
      b.cylinder(0, 0, 0, 0.16, 0.03, '#3b3b3b', 8);
      b.cylinder(0, 0, 0, 0.02, 1.45, '#3b3b3b', 6);
      b.cylinder(0, 1.4, 0, 0.2, 0.3, '#f2e3c2', 10, 0.6);
      break;
    }
    case 'f18': {
      const cols = ['#d6452f', '#2a5f9e', '#e0b84a', '#3f7f3f', '#f4f1ea'];
      for (let i = 0; i < 10; i++) b.box(0, 0, -D / 2 + (i + 0.5) * (D / 10), W - 0.04, 0.012, D / 10, cols[i % cols.length]);
      break;
    }
    case 'f19': {
      b.box(0, 0, 0, W - 0.04, 0.012, D - 0.04, '#2a5f9e');
      b.box(0, 0.002, 0, W - 0.3, 0.012, D - 0.3, '#f4f1ea');
      b.box(0, 0.004, 0, W - 0.5, 0.012, D - 0.5, '#2a5f9e');
      break;
    }
    case 'f20': {
      b.cylinder(0, 0, 0, 0.2, 0.32, '#c9a66b', 10, 1.15);
      b.box(0, 0.32, 0, 0.3, 0.12, 0.03, '#a0784e');
      break;
    }
    case 'f21': plant(b, 'basil'); break;
    case 'f22': plant(b, 'geranium'); break;
    case 'f23': plant(b, 'lemon'); break;
    case 'f24': plant(b, 'bougainvillea'); break;
    case 'f25': {
      b.cylinder(0, 0.7, 0, 0.24, 0.03, '#2a6f6f', 12);
      b.cylinder(0, 0, 0, 0.03, 0.7, '#2b2b2b', 6);
      b.cylinder(0, 0, 0, 0.16, 0.02, '#2b2b2b', 8);
      break;
    }
    case 'f26': {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 0.18, 0, sz * 0.4, 0.04, 0.7, 0.04, '#3b3b3b');
      b.box(0, 0.7, 0, 0.42, 0.18, 0.9, '#2b2b2b');
      b.box(0, 0.88, 0, 0.38, 0.02, 0.86, '#9a9a9a');
      for (let i = 0; i < 4; i++) b.ball(0, 0.8, -0.3 + i * 0.2, 0.06, '#e8590c');
      break;
    }
    // wall items (back at z = 0)
    case 'f27': {
      b.box(0, -0.5, 0, 0.42, 1.0, 0.04, DARK_WOOD);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.9), new THREE.MeshStandardMaterial({ color: '#cfe3ef', metalness: 0.9, roughness: 0.08 }));
      m.position.set(0, 0, 0.045);
      group.add(m);
      break;
    }
    case 'f28': {
      b.cylinder(0, 0, 0, 0.18, 0.04, '#f4f1ea', 16, 1, Math.PI / 2);
      b.box(0, 0, 0.03, 0.02, 0.12, 0.01, '#222');
      b.box(0.04, -0.02, 0.03, 0.08, 0.02, 0.01, '#222');
      break;
    }
    case 'f29': b.box(0, -0.45, 0, 0.95, 0.9, 0.04, DARK_WOOD); texPlane('caique', 0.85, 0.8, 0); break;
    case 'f30': b.box(0, -0.45, 0, 0.95, 0.9, 0.04, DARK_WOOD); texPlane('windmill', 0.85, 0.8, 0); break;
    case 'f31': b.box(0, -0.45, 0, 0.95, 0.9, 0.04, '#d8c49a'); texPlane('map', 0.85, 0.8, 0); break;
    case 'f32': {
      b.box(0, -0.04, 0.1, 0.95, 0.04, 0.22, WOOD);
      b.box(-0.35, -0.2, 0.05, 0.04, 0.18, 0.1, DARK_WOOD);
      b.box(0.35, -0.2, 0.05, 0.04, 0.18, 0.1, DARK_WOOD);
      b.cylinder(-0.2, 0, 0.1, 0.06, 0.14, '#3f7f3f', 8);
      b.box(0.15, 0, 0.1, 0.3, 0.2, 0.12, '#b23a48');
      break;
    }
    case 'f33': texPlane('mataki', 0.3, 0.3, 0, true); b.box(0, 0.15, 0, 0.02, 0.1, 0.02, '#d8b04a'); break;
    case 'f34': texPlane('plate', 0.4, 0.4, 0, true); break;
    // curtains: width given by the window
    case 'f35':
    case 'f36':
    case 'f37': {
      const ww = widthCells * CELL;
      const c = id === 'f36' ? '#2a5f9e' : '#fbfaf5';
      b.box(0, 0.62, 0.08, ww + 0.3, 0.04, 0.04, DARK_WOOD);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) b.box(s * (ww / 2 - 0.05 + k * 0.08), -0.55, 0.06 + (k % 2) * 0.02, 0.09, 1.15, 0.03, c);
      }
      if (id === 'f37') {
        const lace = new THREE.Mesh(new THREE.PlaneGeometry(ww, 0.55), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
        lace.position.set(0, 0.25, 0.07);
        group.add(lace);
      }
      break;
    }
    // desk-top items
    case 'f38': {
      for (let i = 0; i < 9; i++) b.ball(Math.cos(i * 0.7) * 0.07, 0.02, Math.sin(i * 0.7) * 0.04, 0.02, '#b23a2a');
      b.box(0, 0, 0.09, 0.02, 0.02, 0.06, '#d8b04a');
      break;
    }
    case 'f39': {
      b.cylinder(0, 0, 0, 0.07, 0.22, '#2a5f9e', 8, 0.7);
      for (let i = 0; i < 5; i++) b.ball(Math.cos(i * 1.3) * 0.07, 0.3 + (i % 2) * 0.05, Math.sin(i * 1.3) * 0.07, 0.05, ['#e03131', '#f2c94c', '#ffffff', '#d6336c', '#f08c00'][i]);
      break;
    }
    case 'f40': {
      b.box(0, 0, 0, 0.14, 0.02, 0.14, '#3b3b3b');
      b.box(0, 0.02, 0, 0.12, 0.2, 0.12, '#f2e3c2');
      b.box(0, 0.22, 0, 0.14, 0.03, 0.14, '#3b3b3b');
      b.cylinder(0, 0.02, 0, 0.025, 0.1, '#fff8dc', 6);
      break;
    }
  }
  const m = b.build(mat());
  m.matrixAutoUpdate = true;
  group.add(m);
  group.userData.furniture = id;
  void W;
  return group;
}
