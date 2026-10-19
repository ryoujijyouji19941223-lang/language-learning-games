// Collects many small vertex-coloured shapes and merges them into a few meshes,
// so the whole town is drawn with a handful of draw calls.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const cylCache = new Map<string, THREE.BufferGeometry>();
const sphereCache = new Map<string, THREE.BufferGeometry>();

function cyl(seg: number, top = 1, bottom = 1) {
  const k = `${seg}:${top}:${bottom}`;
  let g = cylCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(top, bottom, 1, seg, 1).toNonIndexed(); cylCache.set(k, g); }
  return g;
}
function sphere(detail: number) {
  const k = String(detail);
  let g = sphereCache.get(k);
  if (!g) { g = new THREE.IcosahedronGeometry(1, detail); g = g.index ? g.toNonIndexed() : g; sphereCache.set(k, g); }
  return g;
}

const tmpColor = new THREE.Color();
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();

export class StaticBuilder {
  private parts: THREE.BufferGeometry[] = [];
  private frame = new THREE.Matrix4();
  private stack: THREE.Matrix4[] = [];
  count = 0;

  /** Draw in a local frame (e.g. a building): translate then rotate around Y. */
  push(x: number, y: number, z: number, rotY = 0) {
    this.stack.push(this.frame.clone());
    const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z);
    this.frame = this.frame.clone().multiply(m);
  }
  pop() { this.frame = this.stack.pop() ?? new THREE.Matrix4(); }

  add(base: THREE.BufferGeometry, color: THREE.ColorRepresentation, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
    const g = base.clone();
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    tmpE.set(rx, ry, rz);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpV.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz));
    g.applyMatrix4(this.frame.clone().multiply(tmpM));
    tmpColor.set(color);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = tmpColor.r; col[i * 3 + 1] = tmpColor.g; col[i * 3 + 2] = tmpColor.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    this.count++;
  }

  /** Box with its bottom at y. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation, ry = 0, rx = 0, rz = 0) {
    this.add(UNIT_BOX, color, x, y + h / 2, z, w, h, d, rx, ry, rz);
  }
  /** Cylinder with its bottom at y. */
  cylinder(x: number, y: number, z: number, r: number, h: number, color: THREE.ColorRepresentation, seg = 8, topScale = 1, rx = 0, rz = 0) {
    this.add(cyl(seg, topScale, 1), color, x, y + h / 2, z, r, h, r, rx, 0, rz);
  }
  cone(x: number, y: number, z: number, r: number, h: number, color: THREE.ColorRepresentation, seg = 8) {
    this.add(cyl(seg, 0.001, 1), color, x, y + h / 2, z, r, h, r);
  }
  ball(x: number, y: number, z: number, r: number, color: THREE.ColorRepresentation, detail = 0, sy = 1) {
    this.add(sphere(detail), color, x, y, z, r, r * sy, r);
  }
  /** Half sphere (dome) sitting on y. */
  dome(x: number, y: number, z: number, r: number, color: THREE.ColorRepresentation) {
    const g = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
    this.add(g, color, x, y, z, r, r, r);
  }
  geometry(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, ry = 0) {
    this.add(g.index ? g.toNonIndexed() : g, color, x, y, z, 1, 1, 1, 0, ry, 0);
  }

  build(material: THREE.Material, opts: { shadows?: boolean } = {}): THREE.Mesh {
    const merged = this.parts.length ? mergeGeometries(this.parts, false)! : new THREE.BufferGeometry();
    this.parts = [];
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    if (opts.shadows !== false) { mesh.castShadow = true; mesh.receiveShadow = true; }
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }
}

export const vertexColorMaterial = () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/** Slight random variation of a hex colour (lightness). */
export function vary(hex: string, r: () => number, amount = 0.05) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + (r() - 0.5) * amount * 2)));
  return `#${c.getHexString()}`;
}
