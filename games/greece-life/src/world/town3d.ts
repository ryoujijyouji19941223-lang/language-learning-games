// Builds the outdoor town: terrain, sea, paved streets and steps, white houses
// with blue doors and windows, shop signs, landmarks and props. Placeholder
// low-poly art made from three.js primitives (listed as temporary in README).

import * as THREE from 'three';
import { getLayout, addressOf, type Lot } from './layout';
import { StaticBuilder, vertexColorMaterial, vary } from './builder';
import { flagstoneTexture, cobbleTexture, concreteTexture, dirtTexture, mosaicTexture, signTexture, numberAtlas, signCase } from './textures';
import { heightAt, WEST_CLIFF_X, rng, pointAt, leftNormal, ShapeGrid, faceToRot, toWorld, distanceToPolyline, type Shape, type Box } from '../core/geo';
import { PLAZAS, LANDMARKS, ZONES, type RoadKind } from '../data/town';
import { SHOP_BY_ID, OPEN_SIGN } from '../data/shops';
import { DESTINATIONS } from '../data/deliveries';
import { destPoint } from '../core/delivery';
import { NPC_BY_ID } from '../data/npcs';
import type { Area, Interactable, SignInfo, DynamicShape } from './types';

export interface TownWorld {
  area: Area;
  signs: SignInfo[];
  openPlates: { shop: string; mesh: THREE.Mesh }[];
  openTextures: { open: THREE.Texture; closed: THREE.Texture };
  lanterns: THREE.InstancedMesh;
  laiki: THREE.Group;
  sea: THREE.Mesh;
  seaMaterial: THREE.MeshStandardMaterial & { userData: { shader?: { uniforms: { uTime: { value: number } } } } };
}

const FLOOR_H = 3;

export function buildTown(): TownWorld {
  const lay = getLayout();
  const group = new THREE.Group();
  group.name = 'town';
  const shapes: Shape[] = [];
  const dynamic: DynamicShape[] = [];
  const interactables: Interactable[] = [];
  const signs: SignInfo[] = [];
  const openPlates: TownWorld['openPlates'] = [];
  const b = new StaticBuilder();
  const R = rng(99);
  const lanternSpots: THREE.Vector3[] = [];
  const stepShapes: Shape[] = [];

  // ── Terrain ───────────────────────────────────────────────────────
  group.add(buildTerrain());

  // ── Sea ───────────────────────────────────────────────────────────
  const seaGeo = new THREE.PlaneGeometry(2400, 2000, 160, 140);
  seaGeo.rotateX(-Math.PI / 2);
  seaGeo.translate(-20, 0, 200);
  const seaMaterial = new THREE.MeshStandardMaterial({ color: '#1f78b4', roughness: 0.22, metalness: 0.15, transparent: true, opacity: 0.86 }) as TownWorld['seaMaterial'];
  seaMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWind = { value: 1 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float w1 = sin(position.x * 0.09 + uTime * 0.9) * 0.08;
        float w2 = sin(position.z * 0.13 + uTime * 1.3 + position.x * 0.03) * 0.06;
        transformed.y += (w1 + w2) * uWind;`);
    seaMaterial.userData.shader = shader as unknown as { uniforms: { uTime: { value: number } } };
  };
  const sea = new THREE.Mesh(seaGeo, seaMaterial);
  sea.receiveShadow = true;
  sea.name = 'sea';
  group.add(sea);
  // distant islands
  for (const [x, z, r, h] of [[-700, 520, 160, 40], [420, 700, 220, 55], [900, 160, 140, 30], [-1100, -100, 200, 60]]) {
    b.cone(x, -2, z, r, h, '#9c9a7c', 9);
  }

  // ── Streets, steps and squares ─────────────────────────────────────
  const roadMats: Record<RoadKind, THREE.MeshLambertMaterial> = {
    quay: new THREE.MeshLambertMaterial({ map: concreteTexture() }),
    street: new THREE.MeshLambertMaterial({ map: flagstoneTexture('#b8b0a2', '#f4f2ec', 11) }),
    alley: new THREE.MeshLambertMaterial({ map: flagstoneTexture('#c4beb2', '#fbfaf6', 12) }),
    path: new THREE.MeshLambertMaterial({ map: dirtTexture() }),
  };
  const roadGeos: Record<RoadKind, THREE.BufferGeometry[]> = { quay: [], street: [], alley: [], path: [] };
  for (const rd of lay.roads) {
    roadGeos[rd.kind].push(ribbon(rd.line, rd.width, rd.kind === 'path' ? 3 : 4));
    addSteps(b, rd.line, rd.width, rd.kind, stepShapes);
    if (rd.kind !== 'path' && rd.id !== 'pier' && rd.id !== 'breakwater') {
      // street lamps
      for (let t = 6; t < rd.line.total - 3; t += 22) {
        const p = pointAt(rd.line, t);
        const n = leftNormal(p.dx, p.dz);
        const side = Math.floor(t / 22) % 2 ? 1 : -1;
        const x = p.x + n.x * side * (rd.width / 2 + 0.25);
        const z = p.z + n.z * side * (rd.width / 2 + 0.25);
        if (lay.lots.some((l) => Math.hypot(l.x - x, l.z - z) < Math.max(l.w, l.d) / 2 + 0.3)) continue;
        const y = heightAt(x, z);
        b.cylinder(x, y, z, 0.07, 3.2, '#2b2b2b', 6);
        b.box(x, y + 3.2, z, 0.25, 0.08, 0.25, '#2b2b2b');
        lanternSpots.push(new THREE.Vector3(x, y + 3.45, z));
        shapes.push({ kind: 'circle', x, z, r: 0.15, top: y + 3.4 });
      }
    }
    if (rd.plate) {
      const p = pointAt(rd.line, 1.2);
      const n = leftNormal(p.dx, p.dz);
      const x = p.x + n.x * (rd.width / 2 + 0.45);
      const z = p.z + n.z * (rd.width / 2 + 0.45);
      const y = heightAt(x, z);
      b.cylinder(x, y, z, 0.05, 2.1, '#3a3a3a', 6);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshBasicMaterial({ map: signTexture(signCase(rd.el), { bg: '#1f4f8f', fg: '#ffffff', border: '#ffffff', font: 92 }, 768, 192), side: THREE.DoubleSide }));
      plate.position.set(x, y + 2.25, z);
      plate.rotation.y = Math.atan2(p.dx, p.dz) + Math.PI / 2;
      group.add(plate);
      signs.push({ area: 'town', x, y: y + 2.25, z, el: rd.el, en: rd.en, sign: signCase(rd.el) });
    }
  }
  for (const kind of Object.keys(roadGeos) as RoadKind[]) {
    if (!roadGeos[kind].length) continue;
    const mesh = new THREE.Mesh(mergeAll(roadGeos[kind]), roadMats[kind]);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const p of PLAZAS) {
    const mat = p.kind === 'quay' ? roadMats.quay : p.kind === 'garden' ? roadMats.path : p.kind === 'lookout' ? roadMats.path : roadMats.street;
    const m = new THREE.Mesh(patch(p.x0, p.z0, p.x1, p.z1, 4), mat);
    m.receiveShadow = true;
    group.add(m);
  }
  {
    // pebble mosaic around the plane tree
    const c = LANDMARKS.planeTree;
    const g = new THREE.CircleGeometry(6.5, 40);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: mosaicTexture() }));
    m.position.set(c.x, heightAt(c.x, c.z) + 0.06, c.z);
    m.receiveShadow = true;
    group.add(m);
  }

  // ── Buildings ─────────────────────────────────────────────────────
  const maxNo = Math.max(1, ...lay.lots.map((l) => l.addressNo ?? 0));
  const atlas = numberAtlas(maxNo);
  const numberMat = new THREE.MeshBasicMaterial({ map: atlas.texture });
  const numberGeos: THREE.BufferGeometry[] = [];
  const openTex = { open: signTexture(signCase(OPEN_SIGN.open.el), { bg: '#2e7d32', fg: '#ffffff', font: 120 }, 512, 192), closed: signTexture(signCase(OPEN_SIGN.closed.el), { bg: '#b23a2a', fg: '#ffffff', font: 120 }, 512, 192) };

  const residentOf = new Map(Object.entries(lay.npcHome).map(([npc, l]) => [l.id, npc]));
  for (const lot of lay.lots) {
    const top = addBuilding(b, lot);
    const resident = residentOf.get(lot.id);
    if (resident) addResidentHome(b, group, signs, lot, resident);
    shapes.push({ kind: 'box', x: lot.x, z: lot.z, hw: lot.w / 2, hd: lot.d / 2, rot: lot.rot, top, id: lot.id });
    // house number tile
    if (lot.addressNo && lot.kind !== 'shop') {
      const fg = heightAt(lot.door.x, lot.door.z) - lot.base;
      const g = new THREE.PlaneGeometry(0.3, 0.3);
      const i = lot.addressNo - 1;
      const u0 = (i % atlas.cols) / atlas.cols;
      const v1 = 1 - Math.floor(i / atlas.cols) / atlas.rows;
      const uv = g.getAttribute('uv') as THREE.BufferAttribute;
      const du = 1 / atlas.cols;
      const dv = 1 / atlas.rows;
      uv.setXY(0, u0, v1); uv.setXY(1, u0 + du, v1); uv.setXY(2, u0, v1 - dv); uv.setXY(3, u0 + du, v1 - dv);
      const m = new THREE.Matrix4().makeRotationY(lot.rot);
      const pos = toWorld(lot, 0.95, lot.d / 2 + 0.04);
      m.setPosition(pos.x, lot.base + fg + 2.35, pos.z);
      g.applyMatrix4(m);
      numberGeos.push(g);
    }
    // shop sign, open/closed plate and the door interaction
    if (lot.shop) {
      const shop = SHOP_BY_ID[lot.shop];
      const fg = heightAt(lot.door.x, lot.door.z) - lot.base;
      const sw = Math.min(lot.w * 0.82, 6);
      const blueBoard = R() < 0.5;
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(sw, 0.62),
        new THREE.MeshLambertMaterial({ map: signTexture(shop.sign, blueBoard ? { bg: '#1f4f8f', fg: '#ffffff' } : { bg: '#fbf8f0', fg: '#1f4f8f', border: '#1f4f8f' }) }),
      );
      const sp = toWorld(lot, 0, lot.d / 2 + 0.07);
      sign.position.set(sp.x, lot.base + fg + 2.75, sp.z);
      sign.rotation.y = lot.rot;
      group.add(sign);
      signs.push({ area: 'town', x: sp.x, y: lot.base + fg + 2.75, z: sp.z, el: shop.el, en: shop.en, sign: shop.sign });
      if (shop.week) {
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24), new THREE.MeshBasicMaterial({ map: openTex.closed }));
        const pp = toWorld(lot, -0.95, lot.d / 2 + 0.05);
        plate.position.set(pp.x, lot.base + fg + 1.55, pp.z);
        plate.rotation.y = lot.rot;
        group.add(plate);
        openPlates.push({ shop: shop.id, mesh: plate });
      }
      const kind = lot.shop === 'home_office' ? 'office' : shop.interior ? 'enter' : 'counter';
      interactables.push({ id: `door:${lot.id}`, area: 'town', kind, ref: lot.shop, x: lot.front.x, z: lot.front.z, r: 1.8 });
    }
    if (lot.home) {
      interactables.push({ id: `door:${lot.id}`, area: 'town', kind: 'homeDoor', ref: lot.home, x: lot.front.x, z: lot.front.z, r: 1.8 });
      const fg = heightAt(lot.door.x, lot.door.z) - lot.base;
      const sp = toWorld(lot, 0, lot.d / 2 + 0.07);
      signs.push({ area: 'town', x: sp.x, y: lot.base + fg + 2.4, z: sp.z, el: 'Ενοικιάζεται', en: 'For rent (or your home)', sign: 'ΕΝΟΙΚΙΑΖΕΤΑΙ' });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.34), new THREE.MeshLambertMaterial({ map: signTexture('ΕΝΟΙΚΙΑΖΕΤΑΙ', { bg: '#f7e04a', fg: '#c62828', border: '#c62828' }, 768, 192) }));
      plate.position.set(sp.x, lot.base + fg + 2.4, sp.z);
      plate.rotation.y = lot.rot;
      plate.name = `rentplate:${lot.home}`;
      group.add(plate);
    }
  }
  if (numberGeos.length) group.add(new THREE.Mesh(mergeAll(numberGeos), numberMat));

  // ── Landmarks ─────────────────────────────────────────────────────
  addChurch(b, shapes, signs);
  addChapel(b, shapes);
  const sails = addWindmills(b, shapes, group);
  addLighthouse(b, shapes, lanternSpots);
  addKiosk(b, shapes, interactables, signs, group);
  addKantina(b, shapes, interactables, signs, group);
  addPlaneTree(b, shapes, interactables);
  addFerry(b);
  const boats = addCaiques(group);
  addBeach(b, shapes, interactables, R);
  addTerraces(b, shapes);
  addNature(b, shapes, R);
  addBenches(b, shapes, interactables);
  addCliffWall(b, shapes, R);
  addAnimals(b, R);
  const laiki = addLaiki(dynamic, interactables);
  group.add(laiki);

  // delivery drop-off points (only offered when you carry the matching parcel)
  for (const d of DESTINATIONS) {
    const p = destPoint(d.id);
    interactables.push({ id: `dest:${d.id}`, area: 'town', kind: 'dest', ref: d.id, x: p.x, z: p.z, r: 2.2 });
  }

  group.add(b.build(vertexColorMaterial()));

  const lanternGeo = new THREE.BoxGeometry(0.22, 0.32, 0.22);
  const lanternMat = new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: '#ffcf70', emissiveIntensity: 0 });
  const lanterns = new THREE.InstancedMesh(lanternGeo, lanternMat, Math.max(1, lanternSpots.length));
  lanternSpots.forEach((p, i) => lanterns.setMatrixAt(i, new THREE.Matrix4().setPosition(p)));
  lanterns.count = lanternSpots.length;
  group.add(lanterns);

  const grid = new ShapeGrid(16);
  for (const s of shapes) grid.add(s);
  const steps = new ShapeGrid(8);
  for (const s of stepShapes) steps.add(s);

  const area: Area = {
    id: 'town', group, grid, dynamic, interactables, floorY: null, walls: [],
    spawn: { x: 0, z: 0, yaw: 0 }, zones: ZONES, staff: {}, steps,
    update: (_dt, t) => {
      for (const s of sails) s.rotation.z = t * 0.25;
      boats.forEach((bt, i) => {
        bt.position.y = Math.sin(t * 1.1 + i) * 0.07;
        bt.rotation.z = Math.sin(t * 0.8 + i * 2) * 0.03;
      });
      const sh = seaMaterial.userData.shader;
      if (sh) sh.uniforms.uTime.value = t;
    },
  };
  return { area, signs, openPlates, openTextures: openTex, lanterns, laiki, sea, seaMaterial };
}

// ── helpers ────────────────────────────────────────────────────────────

function mergeAll(geos: THREE.BufferGeometry[]) {
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of nonIndexed) if (!g.getAttribute('normal')) g.computeVertexNormals();
  const out = new THREE.BufferGeometry();
  const total = nonIndexed.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of nonIndexed) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const u = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      pos.set([p.getX(i), p.getY(i), p.getZ(i)], (o + i) * 3);
      nor.set([n.getX(i), n.getY(i), n.getZ(i)], (o + i) * 3);
      if (u) uv.set([u.getX(i), u.getY(i)], (o + i) * 2);
    }
    o += p.count;
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

function terrainColor(x: number, z: number, h: number, r: number): [number, number, number] {
  const beach = x > WEST_CLIFF_X && x < -108 && z > 4;
  if (h < -0.4) return [0.62, 0.6, 0.48];
  if (beach) return [0.9 + r * 0.04, 0.82 + r * 0.04, 0.6];
  const townish = (x > -125 && x < 256 && z > -146 && z < 50) && !(x < -120);
  const slope = Math.abs(heightAt(x + 1, z) - heightAt(x - 1, z)) + Math.abs(heightAt(x, z + 1) - heightAt(x, z - 1));
  if (slope > 2.2) return [0.6, 0.57, 0.52];
  if (townish) return [0.86 + r * 0.04, 0.82 + r * 0.04, 0.74 + r * 0.03];
  // dry hillside: ochre grass with greener patches
  const green = (Math.sin(x * 0.11) + Math.cos(z * 0.13)) * 0.5 + r * 0.4;
  return green > 0.55 ? [0.6, 0.62, 0.38] : [0.78 + r * 0.06, 0.69 + r * 0.05, 0.45];
}

function buildTerrain() {
  const x0 = -330;
  const x1 = 290;
  const z0 = -185;
  const z1 = 150;
  const step = 2;
  const nx = Math.round((x1 - x0) / step);
  const nz = Math.round((z1 - z0) / step);
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const col = new Float32Array((nx + 1) * (nz + 1) * 3);
  const r = rng(7);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * step;
      const z = z0 + j * step;
      const h = heightAt(x, z);
      const k = (j * (nx + 1) + i) * 3;
      pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
      const c = terrainColor(x, z, h, r());
      const lin = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
      col[k] = lin.r; col[k + 1] = lin.g; col[k + 2] = lin.b;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i;
    const bb = a + 1;
    const c = a + nx + 1;
    const d = c + 1;
    idx.push(a, c, bb, bb, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = true;
  m.name = 'terrain';
  return m;
}

/** Paved strip following the ground. */
function ribbon(line: ReturnType<typeof getLayout>['roads'][number]['line'], width: number, tile: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const stepLen = 1;
  const n = Math.max(2, Math.ceil(line.total / stepLen));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * line.total;
    const p = pointAt(line, t);
    const ln = leftNormal(p.dx, p.dz);
    for (const s of [-1, 1]) {
      const x = p.x + ln.x * s * (width / 2);
      const z = p.z + ln.z * s * (width / 2);
      pos.push(x, heightAt(x, z) + 0.05, z);
      uv.push((s + 1) / 2 * (width / tile), t / tile);
    }
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure normals face up
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < nor.count; i++) if (nor.getY(i) < 0) nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
  return g;
}

function patch(x0: number, z0: number, x1: number, z1: number, tile: number) {
  const step = 1;
  const nx = Math.ceil((x1 - x0) / step);
  const nz = Math.ceil((z1 - z0) / step);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + (i / nx) * (x1 - x0);
    const z = z0 + (j / nz) * (z1 - z0);
    pos.push(x, heightAt(x, z) + 0.045, z);
    uv.push(x / tile, z / tile);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i;
    idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Steps where a street climbs: stone treads with white-washed edges. */
function addSteps(b: StaticBuilder, line: ReturnType<typeof getLayout>['roads'][number]['line'], width: number, kind: RoadKind, out: Shape[]) {
  if (kind === 'quay') return;
  const RISE = 0.17;
  let t = 0;
  while (t < line.total - 0.5) {
    const p = pointAt(line, t);
    const q = pointAt(line, Math.min(line.total, t + 0.5));
    const slope = (heightAt(q.x, q.z) - heightAt(p.x, p.z)) / 0.5;
    if (Math.abs(slope) < 0.11) { t += 0.5; continue; }
    const tread = Math.min(1.1, Math.max(0.32, RISE / Math.abs(slope)));
    const c = pointAt(line, t + tread / 2);
    const a = pointAt(line, t);
    const e = pointAt(line, Math.min(line.total, t + tread));
    const ha = heightAt(a.x, a.z);
    const he = heightAt(e.x, e.z);
    // the tread is level with the higher end, so each step shows a riser
    const top = Math.max(ha, he) + 0.02;
    const bottom = Math.min(ha, he) - 0.35;
    const rot = Math.atan2(c.dx, c.dz);
    const sw = kind === 'path' ? width * 0.8 : width;
    b.box(c.x, bottom, c.z, sw, top - bottom, tread, kind === 'path' ? '#b9a27a' : '#d3ccbe', rot);
    out.push({ kind: 'box', x: c.x, z: c.z, hw: sw / 2, hd: tread / 2, rot, top });
    // white-washed edge at the lower end of each step
    const low = ha < he ? -tread / 2 : tread / 2;
    b.box(c.x + c.dx * low, top - 0.05, c.z + c.dz * low, sw + 0.02, 0.07, 0.1, '#fbfaf6', rot);
    t += tread;
  }
}

/** One white island house (or shop) on its lot. Returns the roof height for collisions. */
function addBuilding(b: StaticBuilder, lot: Lot): number {
  const r = rng(lot.seed);
  const st = lot.style;
  const fg = Math.max(0.3, heightAt(lot.door.x, lot.door.z) - lot.base);
  const floors = lot.floors;
  const w = lot.w;
  const d = lot.d;
  const wall = st.wall;
  const trim = '#fdfcf8';
  b.push(lot.x, lot.base, lot.z, lot.rot);
  const upperSet = floors >= 2 && st.setback && lot.kind === 'house';
  const mainH = fg + (upperSet ? floors - 1 : floors) * FLOOR_H;
  b.box(0, 0, 0, w, mainH, d, wall);
  // parapet
  const pw = 0.18;
  b.box(0, mainH, d / 2 - pw / 2, w, 0.4, pw, trim);
  b.box(0, mainH, -d / 2 + pw / 2, w, 0.4, pw, trim);
  b.box(w / 2 - pw / 2, mainH, 0, pw, 0.4, d, trim);
  b.box(-w / 2 + pw / 2, mainH, 0, pw, 0.4, d, trim);
  b.box(0, mainH, 0, w - 0.4, 0.04, d - 0.4, '#e9e3d6');
  let roofTop = mainH + 0.4;
  if (upperSet) {
    const uw = w * (0.55 + r() * 0.2);
    const ud = d * (0.55 + r() * 0.15);
    const ux = (r() - 0.5) * (w - uw);
    const uz = -(d - ud) / 2;
    b.box(ux, mainH, uz, uw, FLOOR_H, ud, vary(wall, r, 0.03));
    b.box(ux, mainH + FLOOR_H, uz, uw + 0.1, 0.3, ud + 0.1, trim);
    b.box(ux, mainH + 0.8, uz + ud / 2 + 0.02, 0.9, 1.9, 0.06, st.door);
    roofTop = mainH + FLOOR_H + 0.3;
    if (r() < 0.5) {
      // pergola on the terrace
      b.box(ux, mainH + 2.4, uz + ud / 2 + 1.2, uw * 0.8, 0.08, 2.2, '#8b6a45');
      b.box(ux - uw * 0.38, mainH, uz + ud / 2 + 2.2, 0.1, 2.4, 0.1, '#8b6a45');
      b.box(ux + uw * 0.38, mainH, uz + ud / 2 + 2.2, 0.1, 2.4, 0.1, '#8b6a45');
    }
  }
  if (st.chimney) {
    const cx = (r() - 0.5) * (w - 1.2);
    const cz = -d / 2 + 0.8;
    b.box(cx, roofTop - 0.4, cz, 0.5, 1.1, 0.5, trim);
    b.box(cx, roofTop + 0.7, cz, 0.7, 0.12, 0.7, trim);
  }
  const fz = d / 2;
  const isShop = lot.kind === 'shop';
  // ground floor front
  b.box(0, fg - 0.25, fz + 0.4, 1.6, 0.25, 0.8, '#d8d2c4'); // door step
  if (isShop) {
    const ow = Math.min(w - 1.6, 4.4);
    b.box(-0.2, fg, fz + 0.01, ow, 2.45, 0.06, '#2c3e4f'); // shop window / opening
    b.box(-0.2, fg + 2.45, fz + 0.01, ow + 0.3, 0.12, 0.1, st.door);
    b.box(0, fg, fz + 0.04, 1.1, 2.2, 0.06, st.door);
    if (st.awning) {
      b.box(0, fg + 2.9, fz + 0.75, Math.min(w - 0.6, ow + 1.4), 0.08, 1.5, st.awning, 0, 0.28);
      for (let i = -2; i <= 2; i++) b.box(i * 0.9, fg + 2.6, fz + 1.45, 0.06, 0.32, 0.04, '#ffffff');
    }
    if (lot.shop === 'agora_greengrocer' || lot.shop === 'agora_florist') {
      for (let i = 0; i < 4; i++) {
        const x = -w / 2 + 0.8 + i * 0.9;
        b.box(x, fg, fz + 0.6, 0.7, 0.45, 0.5, '#a0784e');
        const fruit = lot.shop === 'agora_florist' ? ['#d6336c', '#f2c94c', '#e86a92', '#ffffff'][i] : ['#d93b2b', '#3f8f3f', '#f2c230', '#7a3f9a'][i];
        for (let k = 0; k < 4; k++) b.ball(x - 0.2 + (k % 2) * 0.4, fg + 0.55, fz + 0.5 + Math.floor(k / 2) * 0.2, 0.13, fruit);
      }
    }
  } else {
    b.box(0, fg, fz + 0.03, 1.05, 2.15, 0.06, st.door);
    b.box(0, fg + 2.15, fz + 0.03, 1.25, 0.12, 0.08, trim);
    b.box(0.32, fg + 1.05, fz + 0.08, 0.06, 0.06, 0.04, '#d8b04a'); // door knob
  }
  // windows
  const winCols = w > 8 ? 3 : w > 5.5 ? 2 : 1;
  const effFloors = upperSet ? floors - 1 : floors;
  for (let f = 0; f < effFloors; f++) {
    const y = fg + f * FLOOR_H + 1.0;
    for (let c = 0; c < winCols; c++) {
      const x = winCols === 1 ? 0 : -w / 2 + (w / winCols) * (c + 0.5);
      if (f === 0 && (Math.abs(x) < 1.4 || isShop)) continue;
      addWindow(b, x, y, fz, st);
    }
    if (f > 0 && st.balcony && f === 1) {
      const bw = Math.min(w * 0.55, 3.4);
      b.box(0, fg + FLOOR_H - 0.12, fz + 0.55, bw, 0.14, 1.1, trim);
      const rail = r() < 0.5 ? st.window : trim;
      b.box(0, fg + FLOOR_H, fz + 1.06, bw, 0.9, 0.06, rail);
      b.box(-bw / 2, fg + FLOOR_H, fz + 0.55, 0.06, 0.9, 1.1, rail);
      b.box(bw / 2, fg + FLOOR_H, fz + 0.55, 0.06, 0.9, 1.1, rail);
      b.box(0, fg + FLOOR_H + 0.02, fz + 0.03, 0.95, 2.0, 0.06, st.door);
      if (r() < 0.7) {
        for (let k = 0; k < 2; k++) {
          b.cylinder(-bw / 2 + 0.4 + k * 0.5, fg + FLOOR_H + 0.02, fz + 0.75, 0.16, 0.3, '#b5653e', 7);
          b.ball(-bw / 2 + 0.4 + k * 0.5, fg + FLOOR_H + 0.45, fz + 0.75, 0.22, ['#d6336c', '#e03131', '#4f8a3b'][k % 3]);
        }
      }
    }
  }
  // side windows
  if (r() < 0.6) addWindow(b, w / 2 + 0.01, fg + 1.0 + (floors > 1 ? FLOOR_H : 0), 0, st, Math.PI / 2);
  if (r() < 0.4) addWindow(b, -w / 2 - 0.01, fg + 1.0, -0.5, st, -Math.PI / 2);
  // pots by the door
  for (let i = 0; i < st.pots; i++) {
    const x = (i % 2 ? 1 : -1) * (0.95 + Math.floor(i / 2) * 0.45);
    b.cylinder(x, fg, fz + 0.35, 0.18, 0.36, '#b5653e', 7, 1.15);
    b.ball(x, fg + 0.5, fz + 0.35, 0.24, r() < 0.5 ? '#3f7f3f' : ['#d6336c', '#e03131', '#f08c00'][Math.floor(r() * 3)], 0);
  }
  if (st.bougainvillea) {
    const x = (r() < 0.5 ? -1 : 1) * (w / 2 - 0.4);
    b.cylinder(x, fg, fz + 0.12, 0.06, 2.4, '#6b4a2b', 5);
    for (let k = 0; k < 9; k++) {
      b.ball(x + (r() - 0.5) * 1.6, fg + 1.8 + r() * (mainH - fg - 1.2), fz + 0.25 + r() * 0.3, 0.35 + r() * 0.3, r() < 0.8 ? '#c2185b' : '#3f7f3f', 0);
    }
  }
  if (st.roofStairs && !isShop) {
    for (let k = 0; k < 8; k++) b.box(w / 2 + 0.45, 0, fz - 0.6 - k * 0.3, 0.9, fg + (k + 1) * (mainH - fg) / 8, 0.3, trim);
  }
  b.pop();
  return lot.base + roofTop + 0.5;
}

/**
 * A resident's home is outside-only (not enterable). It gets a name plate, a wall
 * lamp, a mailbox and a small object that hints at who lives there.
 */
function addResidentHome(b: StaticBuilder, group: THREE.Group, signs: SignInfo[], lot: Lot, npcId: string) {
  const npc = NPC_BY_ID[npcId];
  const fg = Math.max(0.3, heightAt(lot.door.x, lot.door.z) - lot.base);
  const fz = lot.d / 2;
  b.push(lot.x, lot.base, lot.z, lot.rot);
  b.box(-0.95, fg + 2.25, fz + 0.02, 0.2, 0.28, 0.16, '#2b2b2b'); // wall lamp
  b.box(-0.95, fg + 2.3, fz + 0.12, 0.14, 0.18, 0.12, '#fff2c4');
  b.box(1.0, fg + 1.05, fz + 0.06, 0.34, 0.26, 0.12, '#c9a227'); // mailbox
  b.box(1.0, fg + 1.21, fz + 0.06, 0.36, 0.04, 0.14, '#8a6d16');
  const role = npc.role.en;
  const x = -1.6;
  if (/fisher|net/.test(role)) {
    for (let i = 0; i < 4; i++) b.ball(x + (i % 2) * 0.3, fg + 0.15, fz + 0.55 + Math.floor(i / 2) * 0.25, 0.22, i % 2 ? '#3f7f6f' : '#c94f3a', 0, 0.45);
    b.box(x + 0.6, fg, fz + 0.3, 0.06, 1.8, 0.06, '#8b6a45', 0, 0.25);
  } else if (/cyclist/.test(role)) {
    for (const dx of [-0.4, 0.4]) b.cylinder(x + dx, fg + 0.32, fz + 0.4, 0.32, 0.04, '#2b2b2b', 12, 1, Math.PI / 2);
    b.box(x, fg + 0.5, fz + 0.4, 0.8, 0.05, 0.05, '#d6452f');
  } else if (/cat/.test(role)) {
    b.cylinder(x, fg, fz + 0.4, 0.12, 0.06, '#1f5fa8', 8);
    b.box(x + 0.4, fg + 0.12, fz + 0.45, 0.18, 0.18, 0.4, '#d9822b');
  } else if (/garden|geranium|florist|plant/.test(role)) {
    for (let i = 0; i < 4; i++) { b.cylinder(x + i * 0.35 - 0.3, fg, fz + 0.45, 0.14, 0.28, '#b5653e', 7); b.ball(x + i * 0.35 - 0.3, fg + 0.4, fz + 0.45, 0.18, i % 2 ? '#e03131' : '#3f8f3f'); }
  } else if (/bee/.test(role)) {
    b.box(x, fg, fz + 0.5, 0.5, 0.5, 0.4, '#f2c230');
    b.box(x, fg + 0.5, fz + 0.5, 0.56, 0.06, 0.46, '#8b6a45');
  } else if (/cook/.test(role)) {
    b.box(x, fg, fz + 0.45, 0.5, 0.75, 0.4, '#a0784e');
    b.cylinder(x, fg + 0.75, fz + 0.45, 0.16, 0.18, '#9aa3ab', 10);
  } else {
    b.box(x, fg + 0.42, fz + 0.4, 0.9, 0.06, 0.32, '#8b6a45');
    b.box(x - 0.38, fg, fz + 0.4, 0.08, 0.42, 0.3, '#f4f2ec');
    b.box(x + 0.38, fg, fz + 0.4, 0.08, 0.42, 0.3, '#f4f2ec');
  }
  b.pop();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.24), new THREE.MeshLambertMaterial({ map: signTexture(npc.name, { bg: '#fbf8f0', fg: '#1f4f8f', border: '#1f4f8f', font: 110 }, 512, 176) }));
  const p = toWorld(lot, 0.95, lot.d / 2 + 0.05);
  plate.position.set(p.x, lot.base + fg + 1.75, p.z);
  plate.rotation.y = lot.rot;
  group.add(plate);
  const addr = addressOf(lot);
  signs.push({ area: 'town', x: p.x, y: lot.base + fg + 1.75, z: p.z, el: addr ? `${npc.name} · ${addr.el}` : npc.name, en: `${npc.name}'s home (${npc.role.en}) — you can't go in${addr ? `; ${addr.en}` : ''}`, sign: npc.name });
}

function addWindow(b: StaticBuilder, x: number, y: number, z: number, st: Lot['style'], rot = 0) {
  b.push(x, 0, z, rot);
  b.box(0, y - 0.08, 0.02, 1.0, 0.08, 0.12, '#fdfcf8'); // sill
  b.box(0, y, 0.01, 0.82, 1.1, 0.06, '#26313b');
  b.box(0, y, 0.03, 0.82, 0.06, 0.04, st.window);
  b.box(0, y + 1.04, 0.03, 0.82, 0.06, 0.04, st.window);
  if (st.shutters) {
    b.box(-0.66, y, 0.04, 0.42, 1.1, 0.05, st.window);
    b.box(0.66, y, 0.04, 0.42, 1.1, 0.05, st.window);
  } else {
    b.box(0, y + 0.5, 0.04, 0.04, 0.6, 0.03, st.window);
  }
  b.pop();
}

function addChurch(b: StaticBuilder, shapes: Shape[], signs: SignInfo[]) {
  const c = LANDMARKS.church;
  const rot = faceToRot(c.face);
  const base = heightAt(c.x, c.z) - 0.4;
  b.push(c.x, base, c.z, rot);
  const W = c.w; // across the front
  const D = c.d; // depth
  b.box(0, 0, 0, W, 7, D, '#fbfaf5');
  b.box(0, 7, 0, W + 0.2, 0.3, D + 0.2, '#fdfcf8');
  // drum and blue dome
  b.cylinder(0, 7.3, -1, 3.2, 2.2, '#fbfaf5', 16);
  b.dome(0, 9.5, -1, 3.3, '#1f5fa8');
  b.box(0, 12.6, -1, 0.15, 1.2, 0.15, '#d8b04a');
  b.box(0, 13.1, -1, 0.7, 0.15, 0.15, '#d8b04a');
  // bell tower on the front corner
  const tx = W / 2 - 1.6;
  const tz = D / 2 - 1.6;
  b.box(tx, 0, tz, 3, 10, 3, '#fbfaf5');
  for (const [ax, az] of [[0, 1.51], [1.51, 0]]) b.box(tx + ax * 0.99, 8, tz + az * 0.99, ax ? 0.06 : 1.4, 1.6, az ? 0.06 : 1.4, '#3c4f63');
  b.box(tx, 7.6, tz, 3.2, 0.25, 3.2, '#fdfcf8');
  b.dome(tx, 10, tz, 1.5, '#1f5fa8');
  b.ball(tx, 8.8, tz, 0.35, '#b08d3c');
  // door, steps, windows
  b.box(-1, 0, D / 2 + 0.02, 2.0, 3.2, 0.08, '#7a3b2e');
  b.box(-1, 3.2, D / 2 + 0.02, 2.4, 0.5, 0.1, '#1f5fa8');
  for (let i = 0; i < 3; i++) b.box(-1, -0.2 + i * 0.12, D / 2 + 1.4 - i * 0.4, 4, 0.2, 0.6, '#e9e3d6');
  for (const x of [-W / 2 + 1.5, W / 2 - 4]) b.box(x, 4.2, D / 2 + 0.02, 0.8, 1.5, 0.06, '#3c4f63');
  b.pop();
  shapes.push({ kind: 'box', x: c.x, z: c.z, hw: W / 2, hd: D / 2, rot, top: base + 13 });
  const front = toWorld({ x: c.x, z: c.z, rot }, -1, D / 2 + 0.1);
  signs.push({ area: 'town', x: front.x, y: base + 3.6, z: front.z, el: SHOP_BY_ID.chora_church.el, en: SHOP_BY_ID.chora_church.en, sign: SHOP_BY_ID.chora_church.sign });
}

function addChapel(b: StaticBuilder, shapes: Shape[]) {
  const c = LANDMARKS.chapel;
  const rot = faceToRot(c.face);
  const base = heightAt(c.x, c.z) - 0.4;
  b.push(c.x, base, c.z, rot);
  b.box(0, 0, 0, 4.2, 3.6, 6, '#fdfcf8');
  b.box(0, 3.6, 1.2, 4.4, 0.2, 2.0, '#fdfcf8');
  b.cylinder(0, 3.6, -0.8, 1.5, 0.8, '#fdfcf8', 12);
  b.dome(0, 4.4, -0.8, 1.55, '#1f5fa8');
  b.box(0, 3.6, 3.0, 1.4, 1.6, 0.4, '#fdfcf8'); // bell gable
  b.box(0, 4.3, 3.05, 0.6, 0.7, 0.42, '#3c4f63');
  b.box(0, 0, 3.02, 1.0, 2.0, 0.06, '#1f5fa8');
  b.box(0, -0.2, 3.9, 5.8, 0.5, 2.2, '#e9e3d6');
  b.pop();
  shapes.push({ kind: 'box', x: c.x, z: c.z, hw: 2.1, hd: 3, rot, top: base + 6 });
}

function addWindmills(b: StaticBuilder, shapes: Shape[], group: THREE.Group) {
  const sails: THREE.Group[] = [];
  const sailMat = new THREE.MeshLambertMaterial({ color: '#f4efe2', side: THREE.DoubleSide });
  const woodMat = new THREE.MeshLambertMaterial({ color: '#5a3d22' });
  LANDMARKS.windmills.forEach((m, i) => {
    const base = heightAt(m.x, m.z) - 0.4;
    b.cylinder(m.x, base, m.z, 2.6, 7.4, '#fbfaf5', 14, 0.92);
    b.cone(m.x, base + 7.4, m.z, 2.55, 2.0, '#8b6a45', 14);
    b.box(m.x + 2.45, base + 0.4, m.z, 0.08, 2.0, 1.0, '#1f5fa8', Math.PI / 2 * 0); // door (east)
    b.box(m.x - 1.8, base + 4.5, m.z + 1.8, 0.5, 0.7, 0.06, '#26313b', Math.PI / 4);
    shapes.push({ kind: 'circle', x: m.x, z: m.z, r: 2.75, top: base + 9.5 });
    // sails face the sea (south)
    const g = new THREE.Group();
    g.position.set(m.x, base + 6.6, m.z + 2.8);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8), woodMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (let k = 0; k < 8; k++) {
      const arm = new THREE.Group();
      arm.rotation.z = (k / 8) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.6, 0.08), woodMat);
      pole.position.y = 2.3;
      arm.add(pole);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4), sailMat);
      sail.position.set(0.55, 2.6, 0);
      arm.add(sail);
      g.add(arm);
    }
    g.rotation.z = i;
    group.add(g);
    sails.push(g);
  });
  return sails;
}

function addLighthouse(b: StaticBuilder, shapes: Shape[], lanterns: THREE.Vector3[]) {
  const l = LANDMARKS.lighthouse;
  const base = heightAt(l.x, l.z) - 0.3;
  b.cylinder(l.x, base, l.z, 1.6, 10, '#fbfaf5', 14, 0.75);
  b.cylinder(l.x, base + 10, l.z, 1.4, 0.3, '#3b3b3b', 12);
  b.cylinder(l.x, base + 10.3, l.z, 0.9, 1.4, '#9fd3f0', 10);
  b.cone(l.x, base + 11.7, l.z, 1.1, 1.0, '#b23a2a', 10);
  b.box(l.x + 3.2, base, l.z, 4, 3, 3.5, '#fbfaf5');
  b.box(l.x + 3.2, base, l.z + 1.77, 0.9, 2, 0.06, '#1f5fa8');
  shapes.push({ kind: 'circle', x: l.x, z: l.z, r: 1.7, top: base + 12 });
  shapes.push({ kind: 'box', x: l.x + 3.2, z: l.z, hw: 2, hd: 1.75, rot: 0, top: base + 3 });
  lanterns.push(new THREE.Vector3(l.x, base + 11, l.z));
}

function addKiosk(b: StaticBuilder, shapes: Shape[], inter: Interactable[], signs: SignInfo[], group: THREE.Group) {
  const k = LANDMARKS.kiosk;
  const rot = Math.PI; // faces north, towards the street
  const base = heightAt(k.x, k.z);
  b.push(k.x, base, k.z, rot);
  b.box(0, 0, 0, 2.4, 2.5, 2.4, '#2f6f4f');
  b.box(0, 2.5, 0, 3.0, 0.15, 3.0, '#f2f2f2');
  b.box(0, 1.0, 1.21, 1.8, 1.0, 0.04, '#26313b');
  for (let i = 0; i < 6; i++) b.box(-1.0 + i * 0.4, 1.0, 1.25, 0.3, 0.4, 0.03, ['#e03131', '#f2c94c', '#1c7ed6', '#ffffff', '#2f9e44', '#f08c00'][i]);
  b.box(1.4, 0, 0.6, 0.6, 1.3, 0.6, '#e9ecef'); // fridge
  b.pop();
  shapes.push({ kind: 'box', x: k.x, z: k.z, hw: 1.2, hd: 1.2, rot, top: base + 2.7 });
  const front = toWorld({ x: k.x, z: k.z, rot }, 0, 2.2);
  inter.push({ id: 'door:port_kiosk', area: 'town', kind: 'counter', ref: 'port_kiosk', x: front.x, z: front.z, r: 1.8 });
  const sp = toWorld({ x: k.x, z: k.z, rot }, 0, 1.26);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), new THREE.MeshLambertMaterial({ map: signTexture('ΠΕΡΙΠΤΕΡΟ', { bg: '#fbf8f0', fg: '#2f6f4f', border: '#2f6f4f' }, 768, 160) }));
  sign.position.set(sp.x, base + 2.25, sp.z);
  sign.rotation.y = rot;
  group.add(sign);
  signs.push({ area: 'town', x: sp.x, y: base + 2.25, z: sp.z, el: SHOP_BY_ID.port_kiosk.el, en: SHOP_BY_ID.port_kiosk.en, sign: 'ΠΕΡΙΠΤΕΡΟ' });
}

function addKantina(b: StaticBuilder, shapes: Shape[], inter: Interactable[], signs: SignInfo[], group: THREE.Group) {
  const k = LANDMARKS.kantina;
  const base = heightAt(k.x, k.z);
  b.push(k.x, base, k.z, 0);
  b.box(0, 0.3, 0, 3.6, 2.2, 2.6, '#fdfcf8');
  b.box(0, 2.5, 0.3, 4.2, 0.1, 3.4, '#f2c230', 0, 0.12);
  b.box(0, 1.2, 1.31, 2.4, 0.9, 0.04, '#26313b');
  for (const x of [-1.3, 1.3]) b.cylinder(x, 0, 0.9, 0.3, 0.3, '#2b2b2b', 8, 1, 0, Math.PI / 2);
  b.pop();
  shapes.push({ kind: 'box', x: k.x, z: k.z, hw: 1.8, hd: 1.3, rot: 0, top: base + 2.6 });
  inter.push({ id: 'door:beach_kantina', area: 'town', kind: 'counter', ref: 'beach_kantina', x: k.x, z: k.z + 2.6, r: 1.8 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.4), new THREE.MeshLambertMaterial({ map: signTexture('ΚΑΝΤΙΝΑ', { bg: '#1f78b4', fg: '#ffffff' }, 768, 160) }));
  sign.position.set(k.x, base + 2.2, k.z + 1.33);
  group.add(sign);
  signs.push({ area: 'town', x: k.x, y: base + 2.2, z: k.z + 1.33, el: SHOP_BY_ID.beach_kantina.el, en: SHOP_BY_ID.beach_kantina.en, sign: 'ΚΑΝΤΙΝΑ' });
}

function addPlaneTree(b: StaticBuilder, shapes: Shape[], inter: Interactable[]) {
  const t = LANDMARKS.planeTree;
  const base = heightAt(t.x, t.z);
  b.cylinder(t.x, base, t.z, 0.85, 4.5, '#8a7d6b', 9, 0.75);
  b.cylinder(t.x, base, t.z, 1.25, 0.45, '#f4f2ec', 16); // whitewashed ring
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.ball(t.x + Math.cos(a) * 3.2, base + 6 + (i % 3) * 0.6, t.z + Math.sin(a) * 3.2, 2.6, i % 2 ? '#5e8c3a' : '#6f9e45', 1);
  }
  b.ball(t.x, base + 7.6, t.z, 3.4, '#689a40', 1);
  shapes.push({ kind: 'circle', x: t.x, z: t.z, r: 1.3, top: base + 4 });
  void inter;
}

function addFerry(b: StaticBuilder) {
  const f = LANDMARKS.ferry;
  b.push(f.x, 0, f.z, 0);
  b.box(0, -2, 0, 11, 5, 46, '#f4f4f4');
  b.box(0, -0.5, 0, 11.1, 0.8, 46.1, '#1f4f8f');
  b.box(0, 3, -4, 9.5, 2.6, 26, '#fbfbfb');
  b.box(0, 5.6, -8, 8, 2.4, 14, '#fbfbfb');
  for (let i = 0; i < 9; i++) b.box(4.78, 3.9, -15 + i * 2.6, 0.06, 0.8, 1.6, '#26313b');
  b.cylinder(0, 8, -10, 1.3, 3, '#1f4f8f', 10);
  b.box(0, 3, 21, 4, 2, 3, '#e9ecef');
  b.pop();
}

function addCaiques(group: THREE.Group) {
  const boats: THREE.Group[] = [];
  const spots: [number, number, number, string][] = [
    [112, 55, 0.2, '#1f5fa8'], [120, 56, -0.1, '#d6452f'], [128, 55.5, 0.1, '#2f9e44'], [136, 56.5, 0.25, '#f2c230'],
    [222, 55, -0.2, '#1f5fa8'], [230, 56, 0.1, '#d6452f'], [238, 55.5, 0, '#1c7ed6'], [244, 70, Math.PI / 2, '#e8590c'],
  ];
  for (const [x, z, rot, stripe] of spots) {
    const b = new StaticBuilder();
    b.box(0, -0.6, 0, 2.2, 1.1, 6.2, '#fdfcf8');
    b.box(0, -0.6, 3.25, 1.4, 1.2, 0.6, '#fdfcf8');
    b.box(0, 0.35, 0, 2.25, 0.18, 6.25, stripe);
    b.box(0, 0.45, -1.2, 1.4, 1.1, 1.6, '#fdfcf8');
    b.box(0, 1.55, -1.2, 1.6, 0.1, 1.8, stripe);
    b.cylinder(0, 0.45, 1.6, 0.05, 2.6, '#6b4a2b', 5);
    b.box(0.5, 0.45, 1.6, 0.6, 0.4, 0.6, '#c9b48a');
    const mesh = b.build(vertexColorMaterial());
    const g = new THREE.Group();
    g.add(mesh);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    group.add(g);
    boats.push(g);
  }
  return boats;
}

function addBeach(b: StaticBuilder, shapes: Shape[], inter: Interactable[], R: () => number) {
  const colors = ['#1c7ed6', '#f2f2f2', '#f08c00', '#e03131', '#2f9e44'];
  for (let i = 0; i < 12; i++) {
    const x = -232 + i * 9 + R() * 3;
    if (Math.abs(x - LANDMARKS.kantina.x) < 6) continue;
    const z = 14 + (i % 2) * 6 + R() * 2;
    const y = heightAt(x, z);
    b.cylinder(x, y, z, 0.04, 2.3, '#e9ecef', 5);
    b.cone(x, y + 2.0, z, 1.4, 0.5, colors[i % colors.length], 8);
    b.box(x + 0.9, y, z + 0.4, 0.7, 0.3, 1.9, '#e9dcc1');
    shapes.push({ kind: 'circle', x, z, r: 0.08, top: y + 2.3 });
  }
  // rocks at both ends and along rocky coast
  for (let i = 0; i < 70; i++) {
    const x = -100 + R() * 205;
    const z = 51 + R() * 6;
    b.ball(x, heightAt(x, z) - 0.2, z, 0.6 + R() * 1.1, R() < 0.5 ? '#9a948a' : '#8a857c', 0, 0.6);
  }
  for (let i = 0; i < 24; i++) {
    const x = WEST_CLIFF_X + 1 + R() * 6;
    const z = 10 + R() * 40;
    b.ball(x, heightAt(x, z) - 0.2, z, 0.8 + R() * 1.4, '#958f84', 0, 0.7);
  }
  // breakwater blocks
  for (let i = 0; i < 40; i++) {
    const z = 48 + i * 1.9;
    b.box(254.5 + R() * 0.6, -1.6, z, 1.6, 2.2, 1.6, '#c9c3b6', R());
  }
  b.box(251, 1, 121.5, 1.2, 4, 1.2, '#d6452f'); // harbour beacon
  void inter;
}

function addTerraces(b: StaticBuilder, shapes: Shape[]) {
  // taverna tables on the quay with blue chairs
  for (let i = 0; i < 6; i++) {
    const x = 197 + (i % 3) * 6;
    const z = 45.5 + Math.floor(i / 3) * 3.6;
    addTable(b, shapes, x, z, '#f4f4f4', '#1f5fa8', true);
  }
  // café terrace on the market street
  for (const x of [67.5, 71, 74.5]) addTable(b, shapes, x, 21.6, '#e9ecef', '#2b2b2b', false, 0.55);
  // kafeneio tables on the square
  for (const x of [-52, -48.5, -45, -41.5, -38]) addTable(b, shapes, x, -23.6, '#fdfcf8', '#2a6f4f', false, 0.6);
}

function addTable(b: StaticBuilder, shapes: Shape[], x: number, z: number, top: string, chair: string, umbrella: boolean, scale = 0.8) {
  const y = heightAt(x, z);
  b.cylinder(x, y, z, 0.06, 0.72, '#555', 5);
  b.box(x, y + 0.72, z, 0.9 * scale + 0.2, 0.05, 0.9 * scale + 0.2, top);
  for (const [dx, dz] of [[0.75, 0], [-0.75, 0]]) {
    b.box(x + dx, y, z + dz, 0.42, 0.45, 0.42, chair);
    b.box(x + dx * 1.25, y + 0.45, z + dz, 0.06, 0.5, 0.42, chair);
  }
  if (umbrella) {
    b.cylinder(x, y, z, 0.04, 2.4, '#e9ecef', 5);
    b.cone(x, y + 2.15, z, 1.5, 0.45, '#f4f4f4', 8);
  }
  shapes.push({ kind: 'circle', x, z, r: 0.55, top: y + 0.8 });
}

function addNature(b: StaticBuilder, shapes: Shape[], R: () => number) {
  const lay = getLayout();
  const nearRoad = (x: number, z: number, pad: number) => lay.roads.some((rd) => distanceToPolyline(x, z, rd.pts) < rd.width / 2 + pad);
  const nearPlaza = (x: number, z: number) => PLAZAS.some((p) => x > p.x0 - 1 && x < p.x1 + 1 && z > p.z0 - 1 && z < p.z1 + 1);
  // olive trees, scrub and stones on the hill and the north slopes
  let placed = 0;
  for (let i = 0; i < 900 && placed < 140; i++) {
    const x = -290 + R() * 180;
    const z = -160 + R() * 170;
    const h = heightAt(x, z);
    if (h < 1 || nearRoad(x, z, 1.8) || nearPlaza(x, z)) continue;
    if (lay.lots.some((l) => Math.hypot(l.x - x, l.z - z) < Math.max(l.w, l.d))) continue;
    if (LANDMARKS.windmills.some((m) => Math.hypot(m.x - x, m.z - z) < 7)) continue;
    if (Math.hypot(LANDMARKS.chapel.x - x, LANDMARKS.chapel.z - z) < 8) continue;
    if (Math.hypot(LANDMARKS.lighthouse.x - x, LANDMARKS.lighthouse.z - z) < 8) continue;
    placed++;
    if (R() < 0.45) {
      b.cylinder(x, h, z, 0.18, 1.3, '#6e5a44', 6, 0.7);
      for (let k = 0; k < 3; k++) b.ball(x + (R() - 0.5) * 1.2, h + 1.6 + R() * 0.6, z + (R() - 0.5) * 1.2, 0.8 + R() * 0.4, R() < 0.5 ? '#7d8c5a' : '#8f9c6b', 0);
      shapes.push({ kind: 'circle', x, z, r: 0.35, top: h + 2.5 });
    } else if (R() < 0.7) {
      b.ball(x, h + 0.2, z, 0.45 + R() * 0.3, R() < 0.5 ? '#7c8a4f' : '#9aa35c', 0, 0.7);
    } else {
      b.ball(x, h, z, 0.3 + R() * 0.5, '#a8a194', 0, 0.6);
    }
  }
  // dry-stone walls on the hill (low, decorative, along the mills road)
  for (let i = 0; i < 30; i++) {
    const rd = lay.roads.find((r) => r.id === 'mills')!;
    const p = pointAt(rd.line, 70 + i * 2.6);
    const n = leftNormal(p.dx, p.dz);
    const x = p.x + n.x * 3.4;
    const z = p.z + n.z * 3.4;
    b.box(x, heightAt(x, z) - 0.2, z, 0.5, 0.75, 2.7, '#b8ae9c', Math.atan2(p.dx, p.dz));
  }
  // cypresses near the church and chapel, tamarisks by the beach
  for (const [x, z] of [[-77, -22], [-77, -4], [-218, -40], [-204, -38], [-60, 22]]) {
    const h = heightAt(x, z);
    b.cone(x, h, z, 0.8, 7, '#3f5f37', 7);
    shapes.push({ kind: 'circle', x, z, r: 0.5, top: h + 7 });
  }
  for (let i = 0; i < 10; i++) {
    const x = -228 + i * 12 + R() * 4;
    const z = 6 + R() * 2;
    const h = heightAt(x, z);
    if (nearRoad(x, z, 1.5)) continue;
    b.cylinder(x, h, z, 0.15, 1.8, '#6e5a44', 6);
    b.ball(x, h + 2.4, z, 1.5, '#8a9a6b', 0, 0.8);
    shapes.push({ kind: 'circle', x, z, r: 0.3, top: h + 3 });
  }
  // vegetable garden in the neighbourhood
  for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) {
    const x = 29 + k * 3;
    const z = -140 + i * 3.4;
    const h = heightAt(x, z);
    b.box(x, h, z, 2.2, 0.25, 1.4, '#7a5a3a');
    for (let j = 0; j < 3; j++) b.ball(x - 0.7 + j * 0.7, h + 0.45, z, 0.3, (i + k) % 3 === 0 ? '#3f8f3f' : '#5aa84a', 0);
    if ((i + k) % 3 === 0) b.ball(x, h + 0.7, z + 0.2, 0.12, '#d93b2b');
  }
}

/** Low white-washed wall along the west cliff top (you cannot climb down the cliff). */
function addCliffWall(b: StaticBuilder, shapes: Shape[], R: () => number) {
  const x = WEST_CLIFF_X + 1.2;
  for (let z = -150; z < 6; z += 2) {
    const y = heightAt(x, z);
    if (y < 3) continue;
    b.box(x, y - 0.4, z + 1, 0.45, 1.2, 2.05, '#f7f5ef');
    b.box(x, y + 0.8, z + 1, 0.55, 0.08, 2.1, '#fdfcf8');
    shapes.push({ kind: 'box', x, z: z + 1, hw: 0.4, hd: 1.05, rot: 0, top: y + 0.9 });
    // rocks on the cliff face below
    if (R() < 0.5) b.ball(WEST_CLIFF_X - 2 - R() * 2, y * (0.3 + R() * 0.5), z + R() * 2, 1 + R() * 1.5, R() < 0.5 ? '#8f877a' : '#a39a8b', 0, 0.8);
  }
}

function addBenches(b: StaticBuilder, shapes: Shape[], inter: Interactable[]) {
  const t = LANDMARKS.planeTree;
  const spots: [number, number, number][] = [
    [t.x, t.z + 4.6, 0], [t.x - 4.6, t.z, Math.PI / 2], [t.x + 4.6, t.z, -Math.PI / 2], [t.x, t.z - 4.6, Math.PI],
    [128, 50.5, Math.PI], [205, 50.8, Math.PI], [250.6, 92, -Math.PI / 2],
    [-168, -101, Math.PI], [-163, -98, Math.PI * 0.8], [-187, -66, 0], [-200, 26, Math.PI], [36, -126, 0],
  ];
  spots.forEach(([x, z, rot], i) => {
    const y = heightAt(x, z);
    b.push(x, y, z, rot);
    b.box(0, 0.42, 0, 1.8, 0.08, 0.5, '#8b6a45');
    b.box(0, 0.5, -0.24, 1.8, 0.45, 0.06, '#8b6a45');
    b.box(-0.8, 0, 0, 0.12, 0.42, 0.45, '#f4f2ec');
    b.box(0.8, 0, 0, 0.12, 0.42, 0.45, '#f4f2ec');
    b.pop();
    shapes.push({ kind: 'box', x, z, hw: 0.9, hd: 0.3, rot, top: y + 0.9 });
    const front = toWorld({ x, z, rot }, 0, 0.9);
    inter.push({ id: `bench:${i}`, area: 'town', kind: 'bench', ref: String(i), x: front.x, z: front.z, r: 1.4 });
  });
}

function addAnimals(b: StaticBuilder, R: () => number) {
  const cat = (x: number, z: number, col: string, rot: number) => {
    const y = heightAt(x, z);
    b.push(x, y, z, rot);
    b.box(0, 0.12, 0, 0.18, 0.18, 0.42, col);
    b.box(0, 0.22, 0.25, 0.16, 0.16, 0.16, col);
    b.box(-0.05, 0.38, 0.27, 0.04, 0.07, 0.04, col);
    b.box(0.05, 0.38, 0.27, 0.04, 0.07, 0.04, col);
    b.box(0, 0.18, -0.3, 0.04, 0.04, 0.25, col, 0, -0.6);
    for (const [dx, dz] of [[-0.06, 0.15], [0.06, 0.15], [-0.06, -0.15], [0.06, -0.15]]) b.box(dx, 0, dz, 0.04, 0.12, 0.04, col);
    b.pop();
  };
  const catSpots: [number, number][] = [[33, -128], [41, -133], [27, -134], [-27, -60], [-50, 12], [118, 47.5], [226, 49], [-40, -20]];
  catSpots.forEach(([x, z], i) => cat(x, z, ['#f2f2f2', '#d9822b', '#3a3a3a', '#8a7e6a'][i % 4], R() * 6));
  // goats on the hill
  for (let i = 0; i < 7; i++) {
    const x = -150 - R() * 30;
    const z = -40 - R() * 25;
    const y = heightAt(x, z);
    b.push(x, y, z, R() * 6);
    b.box(0, 0.45, 0, 0.35, 0.4, 0.8, i % 2 ? '#f0ebe0' : '#6b5a4a');
    b.box(0, 0.7, 0.45, 0.22, 0.25, 0.3, i % 2 ? '#f0ebe0' : '#6b5a4a');
    b.box(-0.07, 0.95, 0.42, 0.04, 0.18, 0.04, '#3b3b3b', 0, -0.4);
    b.box(0.07, 0.95, 0.42, 0.04, 0.18, 0.04, '#3b3b3b', 0, -0.4);
    for (const [dx, dz] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) b.box(dx, 0, dz, 0.07, 0.45, 0.07, '#4a3f35');
    b.pop();
  }
}

/** Saturday street market stalls in the market square. */
function addLaiki(dynamic: DynamicShape[], inter: Interactable[]) {
  const g = new THREE.Group();
  g.name = 'laiki';
  const b = new StaticBuilder();
  const cols = ['#e03131', '#2f9e44', '#f08c00', '#1c7ed6', '#f2f2f2', '#ae3ec9'];
  for (let i = 0; i < 6; i++) {
    const x = 103.6;
    const z = 15 + i * 3.6;
    const y = heightAt(x, z);
    b.box(x, y, z, 1.6, 0.85, 3, '#c9a66b');
    for (let k = 0; k < 6; k++) b.ball(x - 0.4 + (k % 2) * 0.8, y + 1.0, z - 1 + Math.floor(k / 2) * 1.0, 0.25, cols[(i + k) % cols.length]);
    b.box(x, y + 2.2, z, 2.2, 0.06, 3.3, i % 2 ? '#f4f4f4' : '#1f5fa8', 0, 0, 0.15);
    for (const dz of [-1.5, 1.5]) b.cylinder(x + 0.9, y, z + dz, 0.04, 2.3, '#555', 5);
    const box: Box = { kind: 'box', x, z, hw: 0.8, hd: 1.5, rot: 0, top: y + 1 };
    dynamic.push({ shape: box, active: () => g.visible });
  }
  g.add(b.build(vertexColorMaterial()));
  g.visible = false;
  inter.push({ id: 'door:agora_laiki', area: 'town', kind: 'counter', ref: 'agora_laiki', x: 101.2, z: 24, r: 2.4 });
  return g;
}

export { addressOf };
