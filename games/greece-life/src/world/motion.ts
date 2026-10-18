// Player movement with collisions, and the third-person camera that stays out
// of walls and people.

import * as THREE from 'three';
import { heightAt, pushOut, segmentHit, pointInShape, clamp, WALK_MIN_HEIGHT, type Shape } from '../core/geo';
import { WORLD_BOUNDS } from '../data/town';
import type { Area } from './types';

export const WALK_SPEED = 2.6;
export const RUN_SPEED = 5.4;
export const PLAYER_RADIUS = 0.32;

export function groundY(area: Area, x: number, z: number) {
  if (area.floorY !== null) return area.floorY;
  let h = heightAt(x, z);
  if (area.steps) for (const s of area.steps.near(x, z, 1)) if (s.top > h && pointInShape(s, x, z)) h = s.top;
  return h;
}

function inBounds(area: Area, x: number, z: number) {
  if (area.floorY === null) {
    const b = WORLD_BOUNDS;
    return x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && heightAt(x, z) > WALK_MIN_HEIGHT;
  }
  return (area.bounds ?? []).some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
}

export function nearbyShapes(area: Area, x: number, z: number, radius: number, extra: Shape[]): Shape[] {
  const list = area.grid.near(x, z, radius);
  for (const d of area.dynamic) if (d.active()) list.push(d.shape);
  for (const s of extra) list.push(s);
  return list;
}

/** Move a circle from (x,z) by (dx,dz), sliding along obstacles. */
export function moveWithCollisions(area: Area, x: number, z: number, dx: number, dz: number, extra: Shape[] = []) {
  const len = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(len / 0.12));
  let px = x;
  let pz = z;
  for (let i = 0; i < steps; i++) {
    let nx = px + dx / steps;
    let nz = pz + dz / steps;
    const gy = groundY(area, nx, nz);
    const shapes = nearbyShapes(area, nx, nz, 2, extra);
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const s of shapes) {
        if (s.top < gy + 0.25) continue;
        const p = pushOut(s, nx, nz, PLAYER_RADIUS);
        if (p) { nx = p.x; nz = p.z; moved = true; }
      }
      if (!moved) break;
    }
    if (!inBounds(area, nx, nz)) {
      // slide along the edge: keep whichever axis is still valid
      if (inBounds(area, nx, pz)) nz = pz;
      else if (inBounds(area, px, nz)) nx = px;
      else { nx = px; nz = pz; }
    }
    px = nx;
    pz = nz;
  }
  return { x: px, z: pz };
}

export class CameraRig {
  yaw = Math.PI;
  pitch = 0.42;
  dist = 6.5;
  wanted = 6.5;
  private current = 6.5;
  readonly camera: THREE.PerspectiveCamera;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  overhead = false;

  constructor(camera: THREE.PerspectiveCamera, el: HTMLElement) {
    this.camera = camera;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (e.button === 2) { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; el.setPointerCapture(e.pointerId); }
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.rotate(e.clientX - this.lastX, e.clientY - this.lastY);
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    const stop = (e: PointerEvent) => { if (e.button === 2 || this.dragging) { this.dragging = false; } };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('wheel', (e) => { this.wanted = clamp(this.wanted + Math.sign(e.deltaY) * 0.6, 2.5, 11); }, { passive: true });
  }

  rotate(dx: number, dy: number) {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch + dy * 0.004, 0.05, 1.25);
  }

  /** Forward and right vectors on the ground for camera-relative movement. */
  basis() {
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    return { fx, fz, rx: -fz, rz: fx };
  }

  private clearance(target: THREE.Vector3, area: Area, extra: Shape[], pitch: number, wanted: number) {
    const dirX = -Math.sin(this.yaw) * Math.cos(pitch);
    const dirY = Math.sin(pitch);
    const dirZ = -Math.cos(this.yaw) * Math.cos(pitch);
    let allowed = wanted;
    {
      const ex = target.x + dirX * wanted;
      const ey = target.y + dirY * wanted;
      const ez = target.z + dirZ * wanted;
      const shapes = nearbyShapes(area, target.x, target.z, wanted + 2, extra);
      let tMin = 1;
      for (const s of shapes) {
        const t = segmentHit(s, target.x, target.z, target.y, ex, ez, ey);
        if (t !== null && t < tMin) tMin = t;
      }
      // terrain in between
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const gx = target.x + (ex - target.x) * t;
        const gz = target.z + (ez - target.z) * t;
        const gy = target.y + (ey - target.y) * t;
        if (heightAt(gx, gz) + 0.35 > gy) { tMin = Math.min(tMin, Math.max(0, t - 0.12)); break; }
      }
      allowed = Math.max(0.8, wanted * tMin - 0.35);
    }
    return allowed;
  }

  private livePitch = 0.42;

  update(dt: number, target: THREE.Vector3, area: Area, extra: Shape[]) {
    let pitch = this.overhead ? 1.15 : area.floorY === null ? this.pitch : Math.max(this.pitch, 0.62);
    const wanted = this.overhead ? 7.5 : area.floorY === null ? this.wanted : Math.min(this.wanted, 6.2);
    let allowed = wanted;
    if (area.floorY === null) {
      allowed = this.clearance(target, area, extra, pitch, wanted);
      // in narrow alleys, look from higher up rather than from just behind the head
      for (const p of [0.75, 1.0, 1.2]) {
        if (allowed >= wanted * 0.6 || p <= pitch) continue;
        const a = this.clearance(target, area, extra, p, wanted);
        if (a > allowed + 0.5) { allowed = a; pitch = p; }
      }
    }
    this.livePitch += (pitch - this.livePitch) * Math.min(1, dt * 4);
    pitch = this.livePitch;
    const dirX = -Math.sin(this.yaw) * Math.cos(pitch);
    const dirY = Math.sin(pitch);
    const dirZ = -Math.cos(this.yaw) * Math.cos(pitch);
    if (area.floorY === null) allowed = Math.min(allowed, this.clearance(target, area, extra, pitch, wanted));
    // pull in fast, ease out slowly
    this.current = allowed < this.current ? allowed : this.current + (allowed - this.current) * Math.min(1, dt * 2.5);
    this.dist = this.current;
    this.camera.position.set(target.x + dirX * this.current, target.y + dirY * this.current, target.z + dirZ * this.current);
    this.camera.lookAt(target);
  }

  /** True when the camera sits inside a building, wall or person (used by tests). */
  insideSomething(area: Area, extra: Shape[]): boolean {
    const p = this.camera.position;
    if (area.floorY !== null) return false;
    return nearbyShapes(area, p.x, p.z, 2, extra).some((s) => s.top > p.y && pointInShape(s, p.x, p.z, -0.05) && (s.kind === 'circle' ? p.y < s.top : true));
  }
}
