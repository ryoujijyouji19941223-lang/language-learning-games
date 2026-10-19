// Canvas-drawn textures: paving, signs (Greek, drawn after the font is loaded),
// house numbers, paintings. Nothing is downloaded.

import * as THREE from 'three';
import { rng } from '../core/geo';

export const FONT = '"Noto Sans", "Segoe UI", sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function tex(c: HTMLCanvasElement, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Cycladic flagstones with white-washed joints. */
export function flagstoneTexture(base = '#b9b3a6', joint = '#f4f2ec', seed = 1) {
  const { c, g } = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = joint;
  g.fillRect(0, 0, 256, 256);
  let y = 0;
  while (y < 256) {
    const rowH = 28 + r() * 30;
    let x = -r() * 40;
    while (x < 256) {
      const w = 34 + r() * 48;
      const shade = 0.88 + r() * 0.2;
      const col = new THREE.Color(base).multiplyScalar(shade);
      g.fillStyle = `#${col.getHexString()}`;
      const pad = 3;
      g.beginPath();
      g.roundRect(x + pad, y + pad, w - pad * 2, Math.min(rowH, 256 - y) - pad * 2, 6);
      g.fill();
      x += w;
    }
    y += rowH;
  }
  return tex(c);
}

export function cobbleTexture(base = '#9c968b', seed = 2) {
  const { c, g } = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = '#6f6a62';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const rad = 7 + r() * 8;
    const col = new THREE.Color(base).multiplyScalar(0.85 + r() * 0.3);
    g.fillStyle = `#${col.getHexString()}`;
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      g.beginPath();
      g.ellipse(x + dx, y + dy, rad, rad * (0.7 + r() * 0.3), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c);
}

export function concreteTexture() {
  const { c, g } = canvas(256, 256);
  const r = rng(3);
  g.fillStyle = '#c9c3b6';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    g.fillStyle = `rgba(80,70,60,${r() * 0.08})`;
    g.fillRect(r() * 256, r() * 256, 2, 2);
  }
  g.strokeStyle = 'rgba(90,80,70,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
  return tex(c);
}

export function dirtTexture() {
  const { c, g } = canvas(256, 256);
  const r = rng(4);
  g.fillStyle = '#c7ad7c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(120,95,60,${r() * 0.25})` : `rgba(240,230,200,${r() * 0.25})`;
    const s = 1 + r() * 4;
    g.fillRect(r() * 256, r() * 256, s, s);
  }
  return tex(c);
}

/** Pebble mosaic for the square (χοχλάκι). */
export function mosaicTexture() {
  const { c, g } = canvas(512, 512);
  const r = rng(5);
  g.fillStyle = '#3a3a3a';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const d = Math.hypot(x - 256, y - 256);
    const ring = Math.floor(d / 34) % 2 === 0;
    g.fillStyle = ring ? `hsl(40,15%,${85 + r() * 10}%)` : `hsl(30,8%,${18 + r() * 10}%)`;
    g.beginPath();
    g.ellipse(x, y, 3 + r() * 2, 2 + r() * 1.5, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c, false);
}

/** Strip accents (tonos) for capital-letter signs; dialytika stays. */
export function signCase(s: string) {
  return s.normalize('NFD').replace(/́/g, '').toUpperCase().normalize('NFC');
}

export interface SignStyle { bg: string; fg: string; border?: string; font?: number }

export function signTexture(text: string, style: SignStyle, w = 1024, h = 192) {
  const { c, g } = canvas(w, h);
  g.fillStyle = style.bg;
  g.fillRect(0, 0, w, h);
  if (style.border) {
    g.strokeStyle = style.border;
    g.lineWidth = 10;
    g.strokeRect(8, 8, w - 16, h - 16);
  }
  let size = style.font ?? 104;
  g.font = `700 ${size}px ${FONT}`;
  while (g.measureText(text).width > w - 70 && size > 30) {
    size -= 4;
    g.font = `700 ${size}px ${FONT}`;
  }
  g.fillStyle = style.fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + size * 0.04);
  return tex(c, false);
}

/** House numbers 1…n in one atlas (blue ceramic tiles, white digits). */
export function numberAtlas(max: number) {
  const cols = 12;
  const rows = Math.ceil(max / cols);
  const cell = 64;
  const { c, g } = canvas(cols * cell, rows * cell);
  for (let i = 0; i < max; i++) {
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    g.fillStyle = '#1f4f8f';
    g.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    g.strokeStyle = '#f2f2f2';
    g.lineWidth = 3;
    g.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
    g.fillStyle = '#ffffff';
    g.font = `700 30px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(i + 1), x + cell / 2, y + cell / 2 + 1);
  }
  const t = tex(c, false);
  return { texture: t, cols, rows };
}

/** Small paintings and the island map for wall decor. */
export function paintingTexture(kind: 'caique' | 'windmill' | 'map' | 'plate' | 'mataki') {
  const { c, g } = canvas(256, 256);
  if (kind === 'caique') {
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#9fd3f0'); sky.addColorStop(0.55, '#e8f4fa'); sky.addColorStop(0.56, '#2a77b5'); sky.addColorStop(1, '#174f86');
    g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.moveTo(40, 150); g.lineTo(216, 150); g.lineTo(190, 190); g.lineTo(66, 190); g.closePath(); g.fill();
    g.fillStyle = '#d33'; g.fillRect(52, 150, 152, 10);
    g.fillStyle = '#1f5fa8'; g.fillRect(100, 118, 40, 32);
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 5; g.beginPath(); g.moveTo(150, 150); g.lineTo(150, 70); g.stroke();
  } else if (kind === 'windmill') {
    const sky = g.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#f6c27a'); sky.addColorStop(1, '#f7e6c8');
    g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#c9b37a'; g.fillRect(0, 200, 256, 56);
    g.fillStyle = '#fafafa'; g.fillRect(100, 110, 60, 95);
    g.fillStyle = '#8b5a2b'; g.beginPath(); g.moveTo(92, 112); g.lineTo(130, 78); g.lineTo(168, 112); g.fill();
    g.strokeStyle = '#5a3d22'; g.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath(); g.moveTo(130, 95); g.lineTo(130 + Math.cos(a) * 80, 95 + Math.sin(a) * 80); g.stroke();
    }
  } else if (kind === 'map') {
    g.fillStyle = '#2c6fa8'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#e8dcb5';
    g.beginPath(); g.ellipse(128, 120, 95, 70, -0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c9b37a'; g.beginPath(); g.ellipse(85, 105, 35, 25, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(140, 130, 16, 12); g.fillRect(160, 140, 10, 8);
    g.fillStyle = '#3b2b1b'; g.font = `700 22px ${FONT}`; g.textAlign = 'center'; g.fillText('ΑΣΠΡΟΓΙΑΛΟΣ', 128, 225);
  } else if (kind === 'plate') {
    g.fillStyle = '#f6efe2'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1f5fa8'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c0582a';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.ellipse(128 + Math.cos(a) * 55, 128 + Math.sin(a) * 55, 16, 8, a, 0, Math.PI * 2); g.fill(); }
  } else {
    const rings: [number, string][] = [[124, '#1d4fb8'], [86, '#ffffff'], [58, '#7fc7ff'], [32, '#111']];
    for (const [rr, col] of rings) { g.fillStyle = col; g.beginPath(); g.arc(128, 128, rr, 0, Math.PI * 2); g.fill(); }
  }
  return tex(c, false);
}

/** Window backdrop for rooms: sea, street or hill. */
export function viewTexture(kind: 'sea' | 'street' | 'hill') {
  const { c, g } = canvas(256, 256);
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#8ccaf0'); sky.addColorStop(1, '#e8f4fb');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 256);
  if (kind === 'sea') {
    g.fillStyle = '#2a7bb8'; g.fillRect(0, 150, 256, 106);
    g.fillStyle = '#f2f2f2'; for (let i = 0; i < 5; i++) g.fillRect(10 + i * 50, 200 + (i % 2) * 20, 30, 18);
  } else if (kind === 'hill') {
    g.fillStyle = '#c9b37a'; g.beginPath(); g.moveTo(0, 256); g.quadraticCurveTo(128, 90, 256, 200); g.lineTo(256, 256); g.fill();
    g.fillStyle = '#fafafa'; g.fillRect(150, 120, 18, 30);
  } else {
    g.fillStyle = '#f4f1e8'; g.fillRect(0, 120, 110, 136); g.fillRect(140, 100, 116, 156);
    g.fillStyle = '#1f5fa8'; g.fillRect(30, 160, 30, 40); g.fillRect(180, 140, 26, 36);
  }
  return tex(c, false);
}
