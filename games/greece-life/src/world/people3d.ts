// Places the 72 residents in the town or inside shops according to the clock.

import * as THREE from 'three';
import { NPCS, type NpcDef } from '../data/npcs';
import { SHOP_BY_ID } from '../data/shops';
import { LANDMARKS, ZONES } from '../data/town';
import { whereIs } from '../core/people';
import { getLayout } from './layout';
import { buildResident } from './characters';
import { heightAt, toWorld, faceToRot, type Shape } from '../core/geo';
import type { Area, Interactable } from './types';

export interface NpcSpot { area: string; x: number; z: number; yaw: number }

export class People {
  meshes = new Map<string, THREE.Mesh>();
  spots = new Map<string, NpcSpot>();
  private lastKey = '';

  constructor(private areas: Map<string, Area>) {
    for (const n of NPCS) {
      const m = buildResident(n.look);
      m.name = `npc:${n.id}`;
      m.userData.npc = n.id;
      this.meshes.set(n.id, m);
    }
  }

  private shopSpot(npc: NpcDef, shopId: string): NpcSpot {
    const shop = SHOP_BY_ID[shopId];
    const idx = Math.max(0, (shop.staff ?? []).indexOf(npc.id));
    if (shop.interior) {
      const area = this.areas.get(`int:${shopId}`);
      const pts = area?.staff[shopId] ?? [];
      const p = pts[idx % Math.max(1, pts.length)];
      if (area && p) return { area: area.id, x: p[0], z: p[1], yaw: p[2] };
    }
    if (shopId === 'chora_church') {
      const c = LANDMARKS.church;
      const f = toWorld({ x: c.x, z: c.z, rot: faceToRot(c.face) }, 2.2, c.d / 2 + 2.2);
      return { area: 'town', x: f.x, z: f.z, yaw: faceToRot(c.face) };
    }
    if (shopId === 'port_kiosk') return { area: 'town', x: LANDMARKS.kiosk.x + 1.9, z: LANDMARKS.kiosk.z - 0.6, yaw: Math.PI };
    if (shopId === 'beach_kantina') return { area: 'town', x: LANDMARKS.kantina.x - 1.4, z: LANDMARKS.kantina.z + 1.9, yaw: 0 };
    const lot = getLayout().lots.find((l) => l.shop === shopId);
    if (!lot) return { area: 'town', x: 0, z: 0, yaw: 0 };
    const side = idx % 2 === 0 ? 1 : -1;
    const p = toWorld(lot, side * (1.3 + Math.floor(idx / 2) * 0.9), lot.d / 2 + 0.55);
    return { area: 'town', x: p.x, z: p.z, yaw: lot.rot };
  }

  /** Recompute where everyone stands. Cheap; called when the game time moves on. */
  place(time: number, hasHome: boolean) {
    const key = `${Math.floor(time / 10)}:${hasHome}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const lay = getLayout();
    const zoneUse = new Map<string, number>();
    for (const npc of NPCS) {
      let spot: NpcSpot;
      const w = whereIs(npc, time);
      if (npc.id === 'g46' && !hasHome) {
        spot = this.shopSpot(npc, 'home_office');
      } else if (w.kind === 'work') {
        spot = this.shopSpot(npc, w.shop);
      } else if (w.kind === 'zone') {
        let pts = ZONES[w.zone];
        let areaId = 'town';
        if (!pts || !pts.length) {
          for (const a of this.areas.values()) {
            if (a.zones[w.zone]?.length) { pts = a.zones[w.zone]; areaId = a.id; break; }
          }
        }
        const n = zoneUse.get(w.zone) ?? 0;
        zoneUse.set(w.zone, n + 1);
        if (pts && pts.length) {
          const p = pts[n % pts.length];
          const ring = Math.floor(n / pts.length);
          const ox = ring ? Math.cos(n * 2.4) * 0.9 * ring : 0;
          const oz = ring ? Math.sin(n * 2.4) * 0.9 * ring : 0;
          spot = { area: areaId, x: p[0] + ox, z: p[1] + oz, yaw: (n * 1.7) % (Math.PI * 2) };
        } else {
          spot = this.homeSpot(npc.id, lay);
        }
      } else {
        spot = this.homeSpot(npc.id, lay);
      }
      this.spots.set(npc.id, spot);
    }
  }

  private homeSpot(id: string, lay: ReturnType<typeof getLayout>): NpcSpot {
    const lot = lay.npcHome[id];
    if (!lot) return { area: 'town', x: 0, z: 0, yaw: 0 };
    const p = toWorld(lot, 0.8, lot.d / 2 + 0.6);
    return { area: 'town', x: p.x, z: p.z, yaw: lot.rot };
  }

  /** Attach meshes of the current area to the scene; returns collision circles and talk points. */
  sync(scene: THREE.Object3D, areaId: string, areaFloor: number | null): { shapes: Shape[]; interact: Interactable[] } {
    const shapes: Shape[] = [];
    const interact: Interactable[] = [];
    for (const [id, m] of this.meshes) {
      const s = this.spots.get(id);
      if (!s || s.area !== areaId) {
        if (m.parent) m.parent.remove(m);
        continue;
      }
      if (m.parent !== scene) scene.add(m);
      const y = areaFloor ?? heightAt(s.x, s.z);
      m.position.set(s.x, y, s.z);
      m.userData.baseY = y;
      if (m.userData.facing === undefined) m.rotation.y = s.yaw;
      m.userData.baseYaw = s.yaw;
      shapes.push({ kind: 'circle', x: s.x, z: s.z, r: 0.3, top: y + 1.8, id: `npc:${id}` });
      interact.push({ id: `npc:${id}`, area: areaId, kind: 'npc', ref: id, x: s.x, z: s.z, r: 1.7 });
    }
    return { shapes, interact };
  }

  /** Small idle motion; people near the player turn towards them. */
  animate(t: number, px: number, pz: number) {
    for (const [id, m] of this.meshes) {
      if (!m.parent) continue;
      const s = this.spots.get(id)!;
      const d = Math.hypot(px - s.x, pz - s.z);
      const base = m.userData.baseYaw as number;
      const want = d < 3.2 ? Math.atan2(px - s.x, pz - s.z) : base;
      let diff = want - m.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      m.rotation.y += diff * 0.08;
      m.position.y = (m.userData.baseY as number) + Math.abs(Math.sin(t * 1.6 + id.charCodeAt(2))) * 0.012;
    }
  }
}
