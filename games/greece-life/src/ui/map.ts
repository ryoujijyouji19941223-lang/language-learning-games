// Χάρτης (M): the whole town from above with Greek labels, you, and delivery targets.

import { getLayout } from '../world/layout';
import { heightAt } from '../core/geo';
import { PLAZAS, LANDMARKS, WORLD_BOUNDS } from '../data/town';
import { SHOP_BY_ID, DISTRICTS } from '../data/shops';
import { pickupPoint, destPoint, destLabel } from '../core/delivery';
import { h, en, header } from './dom';
import { FONT } from '../world/textures';
import type { Ctx } from './ctx';

let terrainCache: HTMLCanvasElement | null = null;

const SHORT: Record<string, string> = {
  port_fish: 'Ψάρια', port_taverna: 'Ταβέρνα', port_depot: 'Δέματα', port_kiosk: 'Περίπτερο', port_tickets: 'Εισιτήρια',
  agora_bakery: 'Φούρνος', agora_cafe: 'Καφετέρια', agora_greengrocer: 'Μανάβικο', agora_minimarket: 'Μίνι μάρκετ', agora_souvlaki: 'Σουβλάκια',
  agora_pastry: 'Γλυκά', agora_butcher: 'Κρεοπωλείο', agora_cheese: 'Τυριά', agora_furniture: 'Έπιπλα', agora_clothes: 'Ρούχα',
  agora_florist: 'Λουλούδια', agora_home: 'Είδη σπιτιού', chora_kafeneio: 'Καφενείο', chora_post: 'Ταχυδρομείο', chora_townhall: 'Δήμος',
  chora_pharmacy: 'Φαρμακείο', chora_barber: 'Κουρείο', chora_books: 'Βιβλία', chora_guesthouse: 'Ξενώνας', home_office: 'Ενοίκια',
};

export function openMap(ctx: Ctx) {
  const close = () => ctx.ui.close('map');
  const W = 1100;
  const Hh = 600;
  const b = WORLD_BOUNDS;
  const sx = W / (b.x1 - b.x0);
  const sz = Hh / (b.z1 - b.z0);
  const s = Math.min(sx, sz);
  const px = (x: number) => (x - b.x0) * s;
  const pz = (z: number) => (z - b.z0) * s;
  const canvas = h('canvas', { width: W, height: Hh, class: 'map-canvas', 'aria-label': 'Town map' });
  const g = canvas.getContext('2d')!;
  const lay = getLayout();
  if (!terrainCache) {
    terrainCache = document.createElement('canvas');
    terrainCache.width = W;
    terrainCache.height = Hh;
    const tg = terrainCache.getContext('2d')!;
    const img = tg.createImageData(W, Hh);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const wx = b.x0 + x / s;
      const wz = b.z0 + y / s;
      const ht = heightAt(wx, wz);
      const k = (y * W + x) * 4;
      if (ht < 0) { img.data.set([60, 140, 200, 255], k); continue; }
      const beach = wx > -236 && wx < -108 && wz > 4;
      const c = beach ? [235, 220, 170] : ht > 5 ? [200 - ht * 2, 185 - ht * 1.5, 130] : [232, 226, 210];
      img.data.set([c[0], c[1], c[2], 255], k);
    }
    tg.putImageData(img, 0, 0);
  }
  const draw = () => {
    g.drawImage(terrainCache!, 0, 0);
    // roads and squares
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const rd of lay.roads) {
      g.strokeStyle = rd.kind === 'path' ? '#b89a6a' : '#ffffff';
      g.lineWidth = Math.max(2, rd.width * s);
      g.beginPath();
      rd.pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const p of PLAZAS) g.fillRect(px(p.x0), pz(p.z0), (p.x1 - p.x0) * s, (p.z1 - p.z0) * s);
    // buildings
    for (const l of lay.lots) {
      g.save();
      g.translate(px(l.x), pz(l.z));
      g.rotate(-l.rot);
      g.fillStyle = l.kind === 'shop' ? '#2f6fb0' : l.home ? '#e0a020' : '#c9c2b4';
      g.fillRect((-l.w / 2) * s, (-l.d / 2) * s, l.w * s, l.d * s);
      g.restore();
    }
    g.fillStyle = '#1f5fa8';
    g.beginPath(); g.arc(px(LANDMARKS.church.x), pz(LANDMARKS.church.z), 5, 0, Math.PI * 2); g.fill();
    for (const m of LANDMARKS.windmills) { g.fillStyle = '#7a5230'; g.beginPath(); g.arc(px(m.x), pz(m.z), 3.5, 0, Math.PI * 2); g.fill(); }
    // labels
    g.font = `700 11px ${FONT}`;
    g.textAlign = 'center';
    for (const l of lay.lots) {
      if (!l.shop && !l.home) continue;
      const label = l.home ? (ctx.state.home === l.home ? 'Σπίτι μου' : 'Ενοικιάζεται') : SHORT[l.shop!] ?? SHOP_BY_ID[l.shop!].el;
      g.fillStyle = 'rgba(255,255,255,0.8)';
      const w = g.measureText(label).width + 6;
      g.fillRect(px(l.x) - w / 2, pz(l.z) - 18, w, 13);
      g.fillStyle = l.home && ctx.state.home === l.home ? '#b85c00' : '#17324f';
      g.fillText(label, px(l.x), pz(l.z) - 8);
    }
    g.font = `700 16px ${FONT}`;
    g.fillStyle = 'rgba(23,50,79,0.75)';
    const dl: [keyof typeof DISTRICTS, number, number][] = [['limani', 190, 15], ['agora', 55, 5], ['chora', -60, -45], ['geitonia', 40, -112], ['paralia', -200, 0]];
    for (const [id, x, z] of dl) g.fillText(DISTRICTS[id].el, px(x), pz(z));
    g.font = `600 12px ${FONT}`;
    g.fillText('Ανεμόμυλοι', px(-216), pz(-104));
    g.fillText('Φάρος', px(-229), pz(-34));
    g.fillText('Εκκλησάκι', px(-211), pz(-54));
    // deliveries
    for (const d of ctx.state.deliveries.active) {
      const p = d.status === 'accepted' ? pickupPoint(d.pickup) : destPoint(d.dest);
      g.fillStyle = d.status === 'accepted' ? '#e8590c' : '#2f9e44';
      g.beginPath(); g.arc(px(p.x), pz(p.z), 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.font = `700 10px ${FONT}`;
      g.fillText(d.status === 'accepted' ? '📦' : '⌂', px(p.x), pz(p.z) + 3);
    }
    // player
    const pp = ctx.world.areaId() === 'town' ? ctx.world.playerPos() : null;
    if (pp) {
      g.fillStyle = '#d6336c';
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath(); g.arc(px(pp.x), pz(pp.z), 6, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  };
  draw();
  const legend = h('div', { class: 'legend' },
    h('span', null, h('i', { class: 'dot', style: { background: '#2f6fb0' } }), en('shop', 'en small')),
    h('span', null, h('i', { class: 'dot', style: { background: '#e0a020' } }), en('room to rent / your home', 'en small')),
    h('span', null, h('i', { class: 'dot', style: { background: '#d6336c' } }), en('you', 'en small')),
    h('span', null, h('i', { class: 'dot', style: { background: '#e8590c' } }), en('parcel to pick up', 'en small')),
    h('span', null, h('i', { class: 'dot', style: { background: '#2f9e44' } }), en('address to deliver', 'en small')),
  );
  const targets = h('ul', { class: 'targets' }, ...ctx.state.deliveries.active.map((d) => {
    const dl = destLabel(d.dest);
    return h('li', null, d.status === 'carrying' ? '⌂ ' : '📦 ', h('span', { lang: 'el' }, d.status === 'carrying' ? dl.el : SHOP_BY_ID[pickupDefShop(d.pickup)].el), ' ', en(d.status === 'carrying' ? dl.en : SHOP_BY_ID[pickupDefShop(d.pickup)].en, 'en small'));
  }));
  ctx.ui.open('map', h('div', { class: 'map' }, header('Χάρτης', 'Map of Asprogialos (M) — walk there; the map does not teleport you', close), canvas, legend, targets), { className: 'map-panel' });
}

import { pickupDef } from '../core/delivery';
const pickupDefShop = (id: string) => pickupDef(id).shop;
