// Low-poly people. Residents differ by build, skin, hair, clothes colours and a
// few role props (apron, cap, glasses…). The player's clothes come from the
// four clothing slots and change the model.

import * as THREE from 'three';
import { StaticBuilder, vertexColorMaterial } from './builder';
import { CLOTHES_BY_ID } from '../data/clothes';

const SKIN = ['#f3d2b8', '#e6b996', '#c99572', '#a8714f', '#7a4f33'];

export interface Look {
  sex: 'm' | 'f';
  age: 'y' | 'm' | 'o';
  skin: string;
  hair: string;
  hairStyle: string;
  top: string;
  bottom: string;
  bottomType: string;
  build: string;
  acc: string[];
}

export function parseLook(s: string): Look {
  const [sex, age, skin, hair, hairStyle, top, bottom, bottomType, build, acc = ''] = s.split(' ');
  return { sex: sex as Look['sex'], age: age as Look['age'], skin: SKIN[Number(skin)] ?? SKIN[1], hair, hairStyle, top, bottom, bottomType, build, acc: acc ? acc.split(',') : [] };
}

function dims(look: Look) {
  const wide = look.build === 'broad' ? 1.15 : look.build === 'slim' ? 0.9 : 1;
  const tall = look.build === 'tall' ? 1.07 : look.build === 'short' ? 0.92 : look.age === 'o' ? 0.97 : 1;
  return { wide, tall };
}

function hairParts(b: StaticBuilder, look: Look, headY: number) {
  const h = look.hair;
  switch (look.hairStyle) {
    case 'bald':
      b.box(0, headY + 0.08, -0.13, 0.32, 0.12, 0.06, h);
      break;
    case 'long':
      b.box(0, headY + 0.24, -0.01, 0.34, 0.12, 0.34, h);
      b.box(0, headY - 0.16, -0.12, 0.34, 0.44, 0.1, h);
      b.box(-0.16, headY - 0.06, 0, 0.04, 0.3, 0.28, h);
      b.box(0.16, headY - 0.06, 0, 0.04, 0.3, 0.28, h);
      break;
    case 'bun':
      b.box(0, headY + 0.24, -0.01, 0.33, 0.1, 0.33, h);
      b.ball(0, headY + 0.3, -0.16, 0.1, h);
      b.box(0, headY + 0.02, -0.15, 0.33, 0.24, 0.04, h);
      break;
    case 'pony':
      b.box(0, headY + 0.24, -0.01, 0.33, 0.1, 0.33, h);
      b.box(0, headY - 0.05, -0.19, 0.08, 0.3, 0.08, h);
      b.box(0, headY + 0.05, -0.15, 0.33, 0.2, 0.04, h);
      break;
    case 'curly':
      for (let i = 0; i < 6; i++) b.ball(Math.cos(i) * 0.12, headY + 0.26, Math.sin(i) * 0.12 - 0.02, 0.09, h);
      b.box(0, headY + 0.02, -0.15, 0.34, 0.24, 0.05, h);
      break;
    case 'scarf':
      b.box(0, headY + 0.24, -0.01, 0.36, 0.12, 0.36, h);
      b.box(0, headY - 0.02, -0.17, 0.36, 0.36, 0.05, h);
      b.box(-0.17, headY + 0.02, 0, 0.04, 0.3, 0.34, h);
      b.box(0.17, headY + 0.02, 0, 0.04, 0.3, 0.34, h);
      break;
    case 'cropped':
      b.box(0, headY + 0.23, -0.01, 0.32, 0.06, 0.32, h);
      break;
    default:
      b.box(0, headY + 0.23, -0.02, 0.33, 0.1, 0.32, h);
      b.box(0, headY + 0.05, -0.15, 0.33, 0.2, 0.04, h);
  }
}

/** A resident as one merged mesh (cheap to draw). Height about 1.7 m. */
export function buildResident(lookStr: string): THREE.Mesh {
  const look = parseLook(lookStr);
  const { wide, tall } = dims(look);
  const b = new StaticBuilder();
  b.push(0, 0, 0, 0);
  const legTop = 0.88;
  const torsoH = 0.6;
  const headY = legTop + torsoH + 0.2;
  const bt = look.bottomType;
  // legs
  for (const x of [-0.1 * wide, 0.1 * wide]) {
    b.box(x, 0, 0.02, 0.16, 0.09, 0.27, '#2b2b2b');
    if (bt === 'shorts' || bt === 'swim' || bt === 'bermuda') {
      const cut = bt === 'bermuda' ? 0.42 : bt === 'shorts' ? 0.55 : 0.72;
      b.box(x, 0.09, 0, 0.14, cut - 0.09, 0.16, look.skin);
      b.box(x, cut, 0, 0.17, legTop - cut, 0.19, look.bottom);
    } else {
      b.box(x, 0.09, 0, 0.16, legTop - 0.09, 0.18, bt === 'skirt' || bt === 'robe' ? look.skin : look.bottom);
    }
  }
  if (bt === 'skirt') b.cylinder(0, 0.3, 0, 0.27 * wide, legTop - 0.25, look.bottom, 8, 0.75);
  if (bt === 'robe') b.cylinder(0, 0.06, 0, 0.3 * wide, legTop + torsoH - 0.06, look.bottom, 8, 0.75);
  // torso and arms
  b.box(0, legTop, 0, 0.42 * wide, torsoH, 0.26, look.top);
  const armX = 0.27 * wide + 0.03;
  for (const x of [-armX, armX]) {
    b.box(x, legTop + 0.06, 0, 0.12, 0.52, 0.14, look.top);
    b.box(x, legTop - 0.04, 0, 0.11, 0.12, 0.12, look.skin);
  }
  // neck, head, face
  b.box(0, legTop + torsoH, 0, 0.12, 0.08, 0.12, look.skin);
  b.box(0, headY - 0.13, 0, 0.3, 0.34, 0.3, look.skin);
  b.box(-0.07, headY + 0.03, 0.151, 0.045, 0.045, 0.01, '#222');
  b.box(0.07, headY + 0.03, 0.151, 0.045, 0.045, 0.01, '#222');
  b.box(0, headY - 0.08, 0.151, 0.08, 0.02, 0.01, '#9a5a4a');
  hairParts(b, look, headY);
  for (const a of look.acc) {
    switch (a) {
      case 'apron': b.box(0, legTop - 0.35, 0.135, 0.36 * wide, 0.85, 0.02, '#f7f7f2'); break;
      case 'vest': b.box(0, legTop + 0.05, 0.135, 0.44 * wide, 0.5, 0.02, '#e3a33b'); break;
      case 'glasses': b.box(0, headY + 0.03, 0.16, 0.26, 0.06, 0.01, '#3a3a3a'); break;
      case 'beard': b.box(0, headY - 0.3, 0.12, 0.28, 0.16, 0.08, '#e0e0e0' === look.hair ? '#d0d0d0' : look.hair); break;
      case 'mustache': b.box(0, headY - 0.05, 0.155, 0.14, 0.035, 0.02, look.hair); break;
      case 'cap': b.box(0, headY + 0.27, -0.01, 0.34, 0.08, 0.34, '#2f4f6f'); b.box(0, headY + 0.27, 0.2, 0.3, 0.03, 0.14, '#2f4f6f'); break;
      case 'fishercap': b.box(0, headY + 0.26, 0, 0.35, 0.09, 0.36, '#1f2f4f'); b.box(0, headY + 0.25, 0.2, 0.3, 0.03, 0.1, '#1f2f4f'); break;
      case 'captain': b.box(0, headY + 0.26, 0, 0.36, 0.12, 0.36, '#fafafa'); b.box(0, headY + 0.26, 0.2, 0.3, 0.03, 0.12, '#111'); break;
      case 'strawhat': b.cylinder(0, headY + 0.24, 0, 0.32, 0.03, '#e0c27a', 10); b.cylinder(0, headY + 0.25, 0, 0.17, 0.14, '#e0c27a', 10); break;
      case 'bakerhat': b.cylinder(0, headY + 0.24, 0, 0.17, 0.22, '#fafafa', 10, 1.1); break;
      case 'kalimavki': b.cylinder(0, headY + 0.22, 0, 0.17, 0.26, '#111', 10, 1.15); break;
      case 'scarf': b.box(0, legTop + torsoH - 0.06, 0.06, 0.4, 0.12, 0.2, '#b23a48'); break;
      case 'bag': b.box(armX + 0.06, legTop - 0.25, 0, 0.08, 0.3, 0.26, '#7a4f2b'); b.box(0, legTop + 0.3, 0.135, 0.46 * wide, 0.04, 0.02, '#7a4f2b', 0, 0, 0.6); break;
      case 'cane': b.cylinder(armX + 0.08, 0, 0.12, 0.025, 0.85, '#5a3d22', 5); break;
      case 'camera': b.box(0, legTop + 0.2, 0.15, 0.16, 0.1, 0.07, '#222'); break;
      case 'whistle': b.box(0, legTop + 0.35, 0.14, 0.04, 0.06, 0.03, '#f2c230'); break;
    }
  }
  b.pop();
  const mesh = b.build(vertexColorMaterial());
  mesh.matrixAutoUpdate = true;
  mesh.scale.set(1, tall, 1);
  return mesh;
}

// ── Player ─────────────────────────────────────────────────────────────
export interface Worn { top: string; bottom: string; shoes: string; acc: string | null }

export class PlayerModel {
  root = new THREE.Group();
  private body = new THREE.Group();
  legL = new THREE.Group();
  legR = new THREE.Group();
  armL = new THREE.Group();
  armR = new THREE.Group();
  private mat = vertexColorMaterial();
  private skin = SKIN[1];
  private hair = '#3b2a1e';

  constructor(worn: Worn) {
    this.root.add(this.body);
    this.legL.position.set(-0.1, 0.88, 0);
    this.legR.position.set(0.1, 0.88, 0);
    this.armL.position.set(-0.3, 1.44, 0);
    this.armR.position.set(0.3, 1.44, 0);
    this.root.add(this.legL, this.legR, this.armL, this.armR);
    this.dress(worn);
  }

  private part(fn: (b: StaticBuilder) => void) {
    const b = new StaticBuilder();
    fn(b);
    const m = b.build(this.mat);
    m.matrixAutoUpdate = true;
    return m;
  }

  dress(worn: Worn) {
    const top = CLOTHES_BY_ID[worn.top];
    const bottom = CLOTHES_BY_ID[worn.bottom];
    const shoes = CLOTHES_BY_ID[worn.shoes];
    const acc = worn.acc ? CLOTHES_BY_ID[worn.acc] : null;
    for (const g of [this.body, this.legL, this.legR, this.armL, this.armR]) {
      for (const c of [...g.children]) { g.remove(c); (c as THREE.Mesh).geometry?.dispose(); }
    }
    const skin = this.skin;
    // legs hang from the hip pivot (y = 0.88)
    for (const leg of [this.legL, this.legR]) {
      leg.add(this.part((b) => {
        const shape = bottom.shape;
        const cut = shape === 'shorts' ? -0.33 : shape === 'bermuda' ? -0.46 : shape === 'swim' ? -0.16 : -0.79;
        if (shape === 'skirt') b.box(0, -0.79, 0, 0.15, 0.79, 0.17, skin);
        else {
          b.box(0, cut, 0, 0.17, -cut, 0.19, bottom.color);
          if (cut > -0.79) b.box(0, -0.79, 0, 0.14, 0.79 + cut, 0.16, skin);
        }
        // shoes
        const sc = shoes.color;
        if (shoes.shape === 'sandals') { b.box(0, -0.88, 0.03, 0.16, 0.04, 0.28, sc); b.box(0, -0.84, 0.05, 0.15, 0.03, 0.04, sc); }
        else if (shoes.shape === 'boots') b.box(0, -0.88, 0.02, 0.18, 0.26, 0.28, sc);
        else {
          b.box(0, -0.88, 0.03, 0.17, 0.11, 0.29, sc);
          if (shoes.color2) b.box(0, -0.86, 0.03, 0.175, 0.03, 0.2, shoes.color2);
        }
      }));
    }
    this.body.add(this.part((b) => {
      const tc = top.color;
      b.box(0, 0.86, 0, 0.42, 0.62, 0.26, tc);
      if (top.shape === 'stripes' && top.color2) for (let i = 0; i < 4; i++) b.box(0, 0.94 + i * 0.13, 0, 0.425, 0.05, 0.265, top.color2);
      if (top.shape === 'shirt') b.box(0, 1.42, 0.05, 0.26, 0.06, 0.18, tc);
      if (top.shape === 'cardigan') b.box(0, 0.88, 0.131, 0.12, 0.56, 0.01, '#f1e6d2');
      if (top.shape === 'jacket') { b.box(0, 1.36, -0.15, 0.34, 0.2, 0.08, tc); b.box(0, 0.88, 0.132, 0.02, 0.56, 0.01, '#2b2b2b'); }
      if (bottom.shape === 'skirt') b.cylinder(0, 0.3, 0, 0.27, 0.6, bottom.color, 8, 0.75);
      else b.box(0, 0.8, 0, 0.42, 0.1, 0.25, bottom.color);
      // neck, head and face
      b.box(0, 1.48, 0, 0.12, 0.08, 0.12, skin);
      b.box(0, 1.55, 0, 0.3, 0.34, 0.3, skin);
      b.box(-0.07, 1.71, 0.151, 0.045, 0.045, 0.01, '#222');
      b.box(0.07, 1.71, 0.151, 0.045, 0.045, 0.01, '#222');
      b.box(0, 1.6, 0.151, 0.08, 0.02, 0.01, '#9a5a4a');
      b.box(0, 1.91, -0.02, 0.33, 0.1, 0.32, this.hair);
      b.box(0, 1.73, -0.15, 0.33, 0.2, 0.04, this.hair);
      b.box(-0.16, 1.74, -0.04, 0.03, 0.16, 0.2, this.hair);
      b.box(0.16, 1.74, -0.04, 0.03, 0.16, 0.2, this.hair);
      if (acc?.shape === 'strawhat') { b.cylinder(0, 1.92, 0, 0.36, 0.03, acc.color, 12); b.cylinder(0, 1.93, 0, 0.18, 0.16, acc.color, 12); b.cylinder(0, 1.95, 0, 0.185, 0.04, acc.color2 ?? '#333', 12); }
      if (acc?.shape === 'fishercap') { b.box(0, 1.93, 0, 0.35, 0.1, 0.36, acc.color); b.box(0, 1.92, 0.21, 0.3, 0.03, 0.12, acc.color); }
      if (acc?.shape === 'sunglasses') b.box(0, 1.71, 0.16, 0.28, 0.07, 0.015, acc.color);
    }));
    for (const arm of [this.armL, this.armR]) {
      arm.add(this.part((b) => {
        const sleeve = top.shape === 'sleeveless' ? 0 : top.shape === 'tee' || top.shape === 'stripes' ? 0.24 : 0.5;
        if (sleeve > 0) b.box(0, -sleeve, 0, 0.13, sleeve, 0.15, top.color);
        b.box(0, -0.58, 0, 0.11, 0.58 - sleeve, 0.12, skin);
        if (top.shape === 'stripes' && top.color2) b.box(0, -0.2, 0, 0.135, 0.04, 0.155, top.color2);
      }));
    }
  }

  /** Walk animation: phase advances with distance walked. */
  animate(phase: number, speed: number) {
    const a = Math.sin(phase) * Math.min(1, speed / 2.6) * 0.65;
    this.legL.rotation.x = a;
    this.legR.rotation.x = -a;
    this.armL.rotation.x = -a * 0.8;
    this.armR.rotation.x = a * 0.8;
  }
}
