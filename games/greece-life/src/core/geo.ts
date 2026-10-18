// Pure geometry shared by the 3D world, the map and the tests. No three.js here.

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export interface Vec2 { x: number; z: number }

// ── Deterministic random numbers ─────────────────────────────────────
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// ── Terrain ──────────────────────────────────────────────────────────
interface Plateau { x0: number; z0: number; x1: number; z1: number; h: number; soft: number }
const PLATEAUS: Plateau[] = [
  { x0: -118, z0: -58, x1: -4, z1: 14, h: 4, soft: 9 }, // Χώρα
  { x0: -34, z0: -140, x1: 124, z1: -56, h: 2.5, soft: 8 }, // Γειτονιά
];
const HILL = { x: -195, z: -72, r: 105, h: 22 };
const BASE = 0.6;
const WATER_DEPTH = -4;

function rectDistance(x: number, z: number, p: Plateau) {
  const dx = Math.max(p.x0 - x, 0, x - p.x1);
  const dz = Math.max(p.z0 - z, 0, z - p.z1);
  return Math.hypot(dx, dz);
}

/** Southern coastline (z beyond which there is sea) for a given x. */
export function coastZ(x: number): number {
  if (x >= 100) return 52; // harbour quay edge
  if (x >= 60) return 56;
  if (x >= -100) return 52;
  if (x >= -250) return 48;
  return 48 - (-250 - x) * 1.8; // western headland bends north
}

const inRect = (x: number, z: number, x0: number, z0: number, x1: number, z1: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;

/** Walkable structures over water (pier, breakwater). */
function quayStructure(x: number, z: number): boolean {
  if (inRect(x, z, 150.5, 46, 159.5, 96)) return true; // ferry pier
  if (inRect(x, z, 247, 44, 254, 121)) return true; // breakwater, north–south arm
  // breakwater, western arm from (251,120) to (214,128)
  const t = clamp((251 - x) / 37, 0, 1);
  const cz = lerp(120, 128, t);
  return x >= 213 && x <= 254 && Math.abs(z - cz) <= 3;
}

/** Ground height in metres (sea level = 0). */
export function heightAt(x: number, z: number): number {
  let h = BASE;
  for (const p of PLATEAUS) {
    const d = rectDistance(x, z, p);
    h = Math.max(h, p.h * (1 - smoothstep(0, p.soft, d)));
  }
  const dh = Math.hypot(x - HILL.x, z - HILL.z);
  h = Math.max(h, HILL.h * (1 - smoothstep(0, HILL.r, dh)));
  // low hills along the northern edge frame the town
  h = Math.max(h, 7 * smoothstep(-145, -175, z) + 0.6);
  // beach: sand slopes down into the sea
  if (x > -252 && x < -108 && z > 6) h = Math.min(h, BASE + 0.1 - (z - 6) * 0.045);
  // coast
  const zc = coastZ(x);
  if (x >= 100) {
    if (z > zc) h = WATER_DEPTH;
  } else if (z > zc) {
    h = lerp(h, WATER_DEPTH, smoothstep(zc, zc + 5, z));
  }
  if (x < -288) h = lerp(h, WATER_DEPTH, smoothstep(-288, -296, x));
  if (x > 262) h = lerp(h, WATER_DEPTH, smoothstep(262, 268, x));
  if (quayStructure(x, z)) h = Math.max(h, 1.0);
  return h;
}

/** Below this ground height the water is too deep to walk. */
export const WALK_MIN_HEIGHT = -0.3;
export const isWalkableGround = (x: number, z: number) => heightAt(x, z) > WALK_MIN_HEIGHT;

// ── Polylines ────────────────────────────────────────────────────────
export interface Polyline { pts: [number, number][]; lengths: number[]; total: number }

export function polyline(pts: [number, number][]): Polyline {
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, lengths, total: lengths[lengths.length - 1] };
}

export function pointAt(pl: Polyline, t: number): { x: number; z: number; dx: number; dz: number } {
  const tt = clamp(t, 0, pl.total);
  let i = 1;
  while (i < pl.pts.length - 1 && pl.lengths[i] < tt) i++;
  const [ax, az] = pl.pts[i - 1];
  const [bx, bz] = pl.pts[i];
  const seg = pl.lengths[i] - pl.lengths[i - 1] || 1;
  const u = (tt - pl.lengths[i - 1]) / seg;
  return { x: lerp(ax, bx, u), z: lerp(az, bz, u), dx: (bx - ax) / seg, dz: (bz - az) / seg };
}

/** Left normal (x east, z south): facing east, left points north. */
export const leftNormal = (dx: number, dz: number) => ({ x: dz, z: -dx });

export function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax;
  const vz = bz - az;
  const len2 = vx * vx + vz * vz || 1;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / len2, 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

export function distanceToPolyline(px: number, pz: number, pts: [number, number][]) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    best = Math.min(best, distanceToSegment(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  }
  return best;
}

// ── Collision shapes ─────────────────────────────────────────────────
/** Oriented box on the ground plane. rot: front (+local z) faces (sin rot, cos rot). */
export interface Box { kind: 'box'; x: number; z: number; hw: number; hd: number; rot: number; top: number; bottom?: number; id?: string }
export interface Circle { kind: 'circle'; x: number; z: number; r: number; top: number; id?: string }
export type Shape = Box | Circle;

export function toLocal(b: Box, x: number, z: number) {
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  const dx = x - b.x;
  const dz = z - b.z;
  // inverse rotation
  return { lx: dx * c - dz * s, lz: dx * s + dz * c };
}

export function toWorld(b: { x: number; z: number; rot: number }, lx: number, lz: number) {
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
}

export function boxCorners(b: { x: number; z: number; hw: number; hd: number; rot: number }): Vec2[] {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => toWorld(b, sx * b.hw, sz * b.hd));
}

/** Push a circle (player) out of a shape. Returns the corrected position or null when free. */
export function pushOut(shape: Shape, x: number, z: number, r: number): Vec2 | null {
  if (shape.kind === 'circle') {
    const dx = x - shape.x;
    const dz = z - shape.z;
    const d = Math.hypot(dx, dz);
    const min = shape.r + r;
    if (d >= min) return null;
    if (d < 1e-6) return { x: shape.x + min, z: shape.z };
    return { x: shape.x + (dx / d) * min, z: shape.z + (dz / d) * min };
  }
  const { lx, lz } = toLocal(shape, x, z);
  const cx = clamp(lx, -shape.hw, shape.hw);
  const cz = clamp(lz, -shape.hd, shape.hd);
  const dx = lx - cx;
  const dz = lz - cz;
  const d = Math.hypot(dx, dz);
  if (d >= r) return null;
  let nx: number;
  let nz: number;
  if (d > 1e-6) {
    nx = cx + (dx / d) * r;
    nz = cz + (dz / d) * r;
  } else {
    // centre inside the box: leave by the nearest face
    const px = shape.hw - Math.abs(lx);
    const pz = shape.hd - Math.abs(lz);
    if (px < pz) {
      nx = Math.sign(lx || 1) * (shape.hw + r);
      nz = lz;
    } else {
      nx = lx;
      nz = Math.sign(lz || 1) * (shape.hd + r);
    }
  }
  return toWorld(shape, nx, nz);
}

export function pointInShape(shape: Shape, x: number, z: number, pad = 0): boolean {
  if (shape.kind === 'circle') return Math.hypot(x - shape.x, z - shape.z) < shape.r + pad;
  const { lx, lz } = toLocal(shape, x, z);
  return Math.abs(lx) < shape.hw + pad && Math.abs(lz) < shape.hd + pad;
}

/** Separating-axis overlap test for two oriented boxes (2D). */
export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
  const axes = [a.rot, a.rot + Math.PI / 2, b.rot, b.rot + Math.PI / 2].map((r) => ({ x: Math.cos(r), z: -Math.sin(r) }));
  const ca = boxCorners({ ...a, hw: a.hw + pad, hd: a.hd + pad });
  const cb = boxCorners(b);
  for (const ax of axes) {
    const pa = ca.map((p) => p.x * ax.x + p.z * ax.z);
    const pb = cb.map((p) => p.x * ax.x + p.z * ax.z);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
  }
  return true;
}

/**
 * Where a segment from (ax,az) to (bx,bz) first enters a shape, as a fraction 0..1,
 * or null. Height: ignored when the segment's y at that point is above the shape top.
 */
export function segmentHit(shape: Shape, ax: number, az: number, ay: number, bx: number, bz: number, by: number): number | null {
  if (shape.kind === 'circle') {
    const dx = bx - ax;
    const dz = bz - az;
    const fx = ax - shape.x;
    const fz = az - shape.z;
    const a = dx * dx + dz * dz;
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - shape.r * shape.r;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a < 1e-9) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0 || t > 1) return c < 0 ? 0 : null;
    return lerp(ay, by, t) > shape.top ? null : t;
  }
  const A = toLocal(shape, ax, az);
  const B = toLocal(shape, bx, bz);
  let t0 = 0;
  let t1 = 1;
  const dX = B.lx - A.lx;
  const dZ = B.lz - A.lz;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  if (!clip(-dX, A.lx + shape.hw) || !clip(dX, shape.hw - A.lx) || !clip(-dZ, A.lz + shape.hd) || !clip(dZ, shape.hd - A.lz)) return null;
  if (t0 > t1) return null;
  const y = lerp(ay, by, t0);
  if (y > shape.top || (shape.bottom !== undefined && y < shape.bottom)) return null;
  return t0;
}

/** Uniform grid for quick shape lookups. */
export class ShapeGrid {
  private cells = new Map<string, Shape[]>();
  constructor(private size = 16) {}
  private key(i: number, j: number) { return `${i},${j}`; }
  add(s: Shape) {
    const r = s.kind === 'circle' ? s.r : Math.hypot(s.hw, s.hd);
    const i0 = Math.floor((s.x - r) / this.size);
    const i1 = Math.floor((s.x + r) / this.size);
    const j0 = Math.floor((s.z - r) / this.size);
    const j1 = Math.floor((s.z + r) / this.size);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = this.key(i, j);
      const list = this.cells.get(k);
      if (list) list.push(s); else this.cells.set(k, [s]);
    }
  }
  near(x: number, z: number, radius: number): Shape[] {
    const out = new Set<Shape>();
    const i0 = Math.floor((x - radius) / this.size);
    const i1 = Math.floor((x + radius) / this.size);
    const j0 = Math.floor((z - radius) / this.size);
    const j1 = Math.floor((z + radius) / this.size);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const list = this.cells.get(this.key(i, j));
      if (list) for (const s of list) out.add(s);
    }
    return [...out];
  }
}

export const faceToRot = (face: 'n' | 's' | 'e' | 'w') => ({ s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 })[face];
