// Small rotating 3D preview of a furniture model inside shop panels.

import * as THREE from 'three';
import { buildFurniture } from '../world/furniture3d';
import { FURNITURE_BY_ID } from '../data/furniture';
import { h, en } from './dom';

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let model: THREE.Object3D | null = null;
let raf = 0;
let host: HTMLElement | null = null;

function ensure() {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return false;
  }
  renderer.setSize(220, 160);
  renderer.setPixelRatio(1);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#b8a27a', 1.6));
  const d = new THREE.DirectionalLight('#ffffff', 1.4);
  d.position.set(2, 3, 2);
  scene.add(d);
  camera = new THREE.PerspectiveCamera(35, 220 / 160, 0.05, 30);
  return true;
}

export function preview(el: HTMLElement, furnitureId: string) {
  if (!ensure() || !renderer || !scene || !camera) return;
  const def = FURNITURE_BY_ID[furnitureId];
  if (model) scene.remove(model);
  model = buildFurniture(furnitureId, 2);
  const size = Math.max(def.w, def.d) * 0.5;
  const isWall = def.mount === 'wall' || def.mount === 'window';
  scene.add(model);
  const dist = Math.max(1.2, size * 2.6 + (isWall ? 0.6 : 0));
  camera.position.set(dist * 0.7, isWall ? 0.2 : dist * 0.6, dist);
  camera.lookAt(0, isWall ? 0 : Math.min(1, 0.3 + (def.tall ? 0.6 : 0)), 0);
  if (host !== el || !el.contains(renderer.domElement)) {
    el.replaceChildren(renderer.domElement, h('div', { class: 'preview-label' }));
    host = el;
  }
  const label = el.querySelector('.preview-label');
  label?.replaceChildren(h('span', { lang: 'el' }, def.el), ' ', en(def.en, 'en small'));
  cancelAnimationFrame(raf);
  const loop = () => {
    if (!renderer || !scene || !camera || !model) return;
    if (!document.body.contains(renderer.domElement)) return;
    model.rotation.y += 0.012;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  loop();
}
