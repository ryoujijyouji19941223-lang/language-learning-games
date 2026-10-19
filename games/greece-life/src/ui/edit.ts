// Διακόσμηση: arranging furniture at home (SPEC §7). Floor, wall, window and
// table-top places are separate. Each change is checked (door, bed and kitchen
// must stay reachable). Undo, rotate and store are always available.

import * as THREE from 'three';
import { FURNITURE_BY_ID } from '../data/furniture';
import type { WallSide } from '../data/homes';
import { placeFurniture, storeFurniture, placementProblem, restoreArrangement, arrangement, rotatedSize, WALL_ROWS, areaSize } from '../core/housing';
import type { Placement, Rot } from '../core/state';
import { buildFurniture } from '../world/furniture3d';
import { CELL, type HomeArea } from '../world/home3d';
import { h, en, button } from './dom';
import type { Ctx } from './ctx';

export interface EditEnv { scene: THREE.Scene; camera: THREE.Camera; canvas: HTMLCanvasElement; home: () => HomeArea | null }

const WALL_NAMES: Record<WallSide, { el: string; en: string }> = {
  n: { el: 'Βόρειος τοίχος', en: 'north wall' },
  e: { el: 'Ανατολικός', en: 'east wall' },
  s: { el: 'Νότιος', en: 'south wall' },
  w: { el: 'Δυτικός', en: 'west wall' },
};

export function openEdit(ctx: Ctx, env: EditEnv) {
  const home = env.home();
  if (!home) return;
  const hd = home.home;
  const undo: ReturnType<typeof arrangement>[] = [];
  let selected: string | null = null;
  let place: Placement | null = null;
  let ghost: THREE.Object3D | null = null;
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#2f9e44', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  marker.renderOrder = 5;
  const gridLines = buildGrid(home);
  env.scene.add(gridLines, marker);
  marker.visible = false;

  const panel = h('div', { class: 'edit' });
  const status = h('p', { class: 'status', 'aria-live': 'polite' });

  const defOf = (uid: string) => FURNITURE_BY_ID[ctx.state.furniture.find((f) => f.uid === uid)!.id];

  const defaultPlace = (uid: string): Placement => {
    const f = ctx.state.furniture.find((x) => x.uid === uid)!;
    if (f.place) return { ...f.place } as Placement;
    const def = FURNITURE_BY_ID[f.id];
    if (def.mount === 'wall') return { k: 'wall', wall: 'n', c: Math.max(0, Math.floor((hd.w - def.w) / 2)), row: 2 };
    if (def.mount === 'window') return { k: 'window', i: 0 };
    if (def.mount === 'anchor') {
      const host = ctx.state.furniture.find((o) => o.place?.k === 'floor' && (FURNITURE_BY_ID[o.id].anchors ?? 0) > 0);
      return { k: 'anchor', host: host?.uid ?? '', i: 0 };
    }
    return { k: 'floor', area: def.outdoor && hd.outdoor && !def.sit ? 'out' : 'main', x: Math.floor(hd.w / 2) - 1, z: Math.floor(hd.d / 2), r: 0 };
  };

  const select = (uid: string | null) => {
    selected = uid;
    if (ghost) { env.scene.remove(ghost); ghost = null; }
    if (uid) {
      const f = ctx.state.furniture.find((x) => x.uid === uid)!;
      place = defaultPlace(uid);
      ghost = buildFurniture(f.id, place.k === 'window' ? hd.windows[place.i]?.width ?? 2 : 2);
      ghost.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.material = (m.material as THREE.Material).clone();
          (m.material as THREE.Material).transparent = true;
          (m.material as THREE.Material).opacity = 0.6;
        }
      });
      env.scene.add(ghost);
    } else place = null;
    update();
  };

  const problem = () => (selected && place ? placementProblem(hd, ctx.state.furniture, selected, place) : null);

  const update = () => {
    marker.visible = false;
    if (ghost && selected && place) {
      const f = ctx.state.furniture.find((x) => x.uid === selected)!;
      const tf = home.placementTransform({ ...f, place }, ctx.state.furniture.map((o) => (o.uid === selected ? { ...o, place } : o)));
      if (tf) {
        ghost.position.set(tf.x, tf.y + (place.k === 'floor' ? 0.02 : 0), tf.z);
        ghost.rotation.y = tf.rot;
        ghost.visible = true;
        const p = problem();
        (marker.material as THREE.MeshBasicMaterial).color.set(p ? '#e03131' : '#2f9e44');
        if (place.k === 'floor') {
          const def = defOf(selected);
          const { w, d } = rotatedSize(def, place.r);
          marker.scale.set(w * CELL, d * CELL, 1);
          marker.rotation.set(-Math.PI / 2, 0, 0);
          marker.position.set(tf.x, 0.02, tf.z);
          marker.visible = true;
        } else if (place.k === 'wall') {
          const def = defOf(selected);
          const fr = home.wallFrame(place.wall);
          marker.scale.set(def.w * CELL, def.d * CELL, 1);
          marker.rotation.set(0, fr.rot, 0);
          marker.position.set(tf.x + fr.nx * 0.03, tf.y, tf.z + fr.nz * 0.03);
          marker.visible = true;
        }
      } else ghost.visible = false;
    }
    renderPanel();
  };

  const move = (dx: number, dz: number) => {
    if (!place || !selected) return;
    const def = defOf(selected);
    if (place.k === 'floor') {
      const size = areaSize(hd, place.area);
      const { w, d } = rotatedSize(def, place.r);
      place = { ...place, x: Math.max(0, Math.min(size.w - w, place.x + dx)), z: Math.max(0, Math.min(size.d - d, place.z + dz)) };
    } else if (place.k === 'wall') {
      const len = place.wall === 'n' || place.wall === 's' ? hd.w : hd.d;
      place = { ...place, c: Math.max(0, Math.min(len - def.w, place.c + dx)), row: Math.max(0, Math.min(WALL_ROWS - def.d, place.row - dz)) };
    } else if (place.k === 'window') {
      place = { ...place, i: (place.i + (dx || dz) + hd.windows.length) % hd.windows.length };
    } else {
      const hosts = anchorSlots();
      const idx = hosts.findIndex((s) => s.host === place!.k && false) ;
      void idx;
      const cur = hosts.findIndex((s) => place!.k === 'anchor' && s.host === place!.host && s.i === place!.i);
      const next = hosts[(cur + (dx || dz) + hosts.length) % Math.max(1, hosts.length)];
      if (next) place = { k: 'anchor', host: next.host, i: next.i };
    }
    update();
  };

  const anchorSlots = () => ctx.state.furniture.flatMap((o) => (o.place?.k === 'floor' ? Array.from({ length: FURNITURE_BY_ID[o.id].anchors ?? 0 }, (_, i) => ({ host: o.uid, i, el: FURNITURE_BY_ID[o.id].el })) : []));

  const rotate = () => {
    if (!place || place.k !== 'floor') return;
    place = { ...place, r: ((place.r + 1) % 4) as Rot };
    move(0, 0);
  };

  const commitPlace = () => {
    if (!selected || !place) return;
    const before = arrangement(ctx.state);
    if (ctx.commit(placeFurniture(ctx.state, selected, place), { save: true, toast: false })) {
      undo.push(before);
      ctx.world.refreshHome();
      status.textContent = 'Placed.';
      select(null);
    } else update();
  };

  const store = (uid = selected) => {
    if (!uid) return;
    const before = arrangement(ctx.state);
    if (ctx.commit(storeFurniture(ctx.state, uid), { save: true })) {
      undo.push(before);
      ctx.world.refreshHome();
      if (uid === selected) select(null);
      else renderPanel();
    }
  };

  const doUndo = () => {
    const snap = undo.pop();
    if (!snap) { ctx.ui.toast('Τίποτα για αναίρεση.', 'Nothing to undo.'); return; }
    if (ctx.commit(restoreArrangement(ctx.state, snap), { save: true, toast: false })) { ctx.world.refreshHome(); select(null); }
  };

  const setArea = (area: 'main' | 'out') => { if (place?.k === 'floor') { place = { ...place, area, x: 0, z: 0 }; move(0, 0); } };
  const setWall = (wall: WallSide) => { if (place?.k === 'wall') { place = { ...place, wall, c: 0 }; move(0, 0); } };

  function renderPanel() {
    const stored = ctx.state.furniture.filter((f) => !f.place);
    const placed = ctx.state.furniture.filter((f) => f.place);
    const p = problem();
    const sel = selected ? defOf(selected) : null;
    panel.replaceChildren(
      h('header', { class: 'panel-head' }, h('h2', null, h('span', { lang: 'el' }, 'Διακόσμηση'), ' ', en('Arrange furniture', 'en sub')),
        h('button', { class: 'close', 'aria-label': 'Done', onclick: () => ctx.ui.close('edit') }, '✓')),
      sel ? h('div', { class: 'sel' },
        h('p', null, h('strong', { lang: 'el' }, sel.el), ' ', en(sel.en, 'en small')),
        p ? h('p', { class: 'warn' }, h('span', { lang: 'el' }, p.el), ' ', en(p.en, 'en small')) : h('p', { class: 'ok' }, en('This spot works.', 'en small')),
        place?.k === 'floor' && hd.outdoor && sel.outdoor ? h('div', { class: 'row' },
          button('Δωμάτιο', () => setArea('main'), { cls: `btn small${place.area === 'main' ? ' on' : ''}`, enLabel: 'room' }),
          button(hd.outdoor.el, () => setArea('out'), { cls: `btn small${place.area === 'out' ? ' on' : ''}`, enLabel: hd.outdoor.en, testid: 'area-out' })) : null,
        place?.k === 'wall' ? h('div', { class: 'row wrap' }, ...(['n', 'e', 's', 'w'] as WallSide[]).map((w) => button(WALL_NAMES[w].el, () => setWall(w), { cls: `btn small${place?.k === 'wall' && place.wall === w ? ' on' : ''}`, enLabel: WALL_NAMES[w].en, testid: `wall-${w}` }))) : null,
        place?.k === 'anchor' && !anchorSlots().length ? h('p', { class: 'warn', lang: 'en' }, 'Place a desk, table or bedside table first.') : null,
        h('div', { class: 'row wrap' },
          place?.k === 'floor' ? button('Γύρισε', rotate, { enLabel: 'rotate (R)', testid: 'rotate' }) : null,
          button('Βάλε εδώ', commitPlace, { cls: 'btn primary', enLabel: 'place (Enter)', disabled: !!p, testid: 'place' }),
          button('Άκυρο', () => select(null), { enLabel: 'cancel' })),
        h('p', { class: 'small', lang: 'en' }, 'Arrow keys or the mouse move it; click places it.'),
      ) : h('p', { class: 'hint', lang: 'en' }, 'Choose something from the storage box, or click a placed item in the list to move it.'),
      h('div', { class: 'row' }, button('Αναίρεση', doUndo, { enLabel: 'undo (Ctrl+Z)', testid: 'undo', disabled: !undo.length })),
      h('h4', null, h('span', { lang: 'el' }, 'Κουτί αποθήκευσης'), ' ', en(`storage box (${stored.length})`, 'en small')),
      h('ul', { class: 'fl' }, ...stored.map((f) => h('li', null, h('button', { class: `opt${selected === f.uid ? ' on' : ''}`, 'data-testid': `pick-${f.id}`, onclick: () => select(f.uid) },
        h('span', { lang: 'el' }, FURNITURE_BY_ID[f.id].el), en(` ${FURNITURE_BY_ID[f.id].en}`, 'en small'))))),
      h('h4', null, h('span', { lang: 'el' }, 'Στο σπίτι'), ' ', en(`placed (${placed.length})`, 'en small')),
      h('ul', { class: 'fl' }, ...placed.map((f) => h('li', null,
        h('button', { class: `opt${selected === f.uid ? ' on' : ''}`, 'data-testid': `move-${f.id}`, onclick: () => select(f.uid) }, h('span', { lang: 'el' }, FURNITURE_BY_ID[f.id].el), en(` ${FURNITURE_BY_ID[f.id].en}`, 'en small')),
        button('Στο κουτί', () => store(f.uid), { cls: 'btn small', enLabel: 'store', testid: `store-${f.id}` })))),
      status,
    );
  }

  // mouse: hover moves the cursor, click places
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const onMove = (e: PointerEvent) => {
    if (!selected || !place || (place.k !== 'floor' && place.k !== 'wall')) return;
    const r = env.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, env.camera as THREE.PerspectiveCamera);
    const def = defOf(selected);
    if (place.k === 'floor') {
      const hit = new THREE.Vector3();
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const cell = home.cellAt(place.area, hit.x, hit.z) ?? home.cellAt(place.area === 'main' ? 'out' : 'main', hit.x, hit.z);
      if (!cell) return;
      const area = home.cellAt(place.area, hit.x, hit.z) ? place.area : place.area === 'main' ? 'out' : 'main';
      if (area === 'out' && !def.outdoor) return;
      const { w, d } = rotatedSize(def, place.r);
      place = { ...place, area, x: cell.x - Math.floor(w / 2), z: cell.z - Math.floor(d / 2) };
      move(0, 0);
    } else {
      const fr = home.wallFrame(place.wall);
      const wp = new THREE.Plane(new THREE.Vector3(fr.nx, 0, fr.nz), -(fr.nx * fr.x0 + fr.nz * fr.z0));
      const hit = new THREE.Vector3();
      if (!ray.ray.intersectPlane(wp, hit)) return;
      const along = (hit.x - fr.x0) * fr.dx + (hit.z - fr.z0) * fr.dz;
      place = { ...place, c: Math.floor(along / CELL - def.w / 2 + 0.5), row: Math.floor((hit.y - 0.6) / CELL - def.d / 2 + 0.5) };
      move(0, 0);
    }
  };
  const onClick = (e: MouseEvent) => { if (e.button === 0 && selected && !problem()) commitPlace(); };
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key;
    if (k === 'ArrowLeft') move(-1, 0);
    else if (k === 'ArrowRight') move(1, 0);
    else if (k === 'ArrowUp') move(0, -1);
    else if (k === 'ArrowDown') move(0, 1);
    else if (k === 'r' || k === 'R') rotate();
    else if (k === 'Enter') commitPlace();
    else if (k === 'Delete' || k === 'Backspace') store();
    else if ((k === 'z' || k === 'Z') && (e.ctrlKey || e.metaKey)) doUndo();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  env.canvas.addEventListener('pointermove', onMove);
  env.canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey, true);
  ctx.world.setEdit(true);
  renderPanel();
  ctx.ui.open('edit', panel, {
    className: 'dock-left',
    onClose: () => {
      env.canvas.removeEventListener('pointermove', onMove);
      env.canvas.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey, true);
      if (ghost) env.scene.remove(ghost);
      env.scene.remove(gridLines, marker);
      ctx.world.setEdit(false);
    },
  });
}

function buildGrid(home: HomeArea) {
  const pts: number[] = [];
  const hd = home.home;
  const add = (area: 'main' | 'out', w: number, d: number) => {
    const o = home.cellCenter(area, 0, 0);
    const x0 = o.x - CELL / 2;
    const z0 = o.z - CELL / 2;
    for (let i = 0; i <= w; i++) pts.push(x0 + i * CELL, 0.015, z0, x0 + i * CELL, 0.015, z0 + d * CELL);
    for (let j = 0; j <= d; j++) pts.push(x0, 0.015, z0 + j * CELL, x0 + w * CELL, 0.015, z0 + j * CELL);
  };
  add('main', hd.w, hd.d);
  if (hd.outdoor) add('out', hd.outdoor.w, hd.outdoor.d);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#1f4f8f', transparent: true, opacity: 0.35 }));
}
