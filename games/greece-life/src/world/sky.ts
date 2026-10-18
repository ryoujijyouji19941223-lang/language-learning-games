// Day and night from the game clock: sun, sky colours, fog, street lanterns.

import * as THREE from 'three';
import { smoothstep, lerp } from '../core/geo';

const DAY_TOP = new THREE.Color('#4f9fdf');
const DAY_HORIZON = new THREE.Color('#d6ecf8');
const DUSK_HORIZON = new THREE.Color('#f2a35e');
const DUSK_TOP = new THREE.Color('#5a6fa8');
const NIGHT_TOP = new THREE.Color('#0a1530');
const NIGHT_HORIZON = new THREE.Color('#1c2f52');

export class Sky {
  sun = new THREE.DirectionalLight('#fff4e0', 2.4);
  hemi = new THREE.HemisphereLight('#cfe8ff', '#b8a27a', 1.1);
  private dome: THREE.Mesh;
  private uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  night = 0;
  private clouds = new THREE.Group();
  private rain: THREE.Points;
  private rainPos: Float32Array;
  private cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, fog: false });

  constructor(private scene: THREE.Scene) {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; c.near = 1; c.far = 260;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target, this.hemi);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.uniforms,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float t = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, t), 1.0); }',
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), mat);
    this.dome.frustumCulled = false;
    scene.add(this.dome);
    scene.fog = new THREE.Fog('#d6ecf8', 140, 720);
    // clouds: flattened low-poly blobs high above the town
    const blob = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 40; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(blob, this.cloudMat);
        m.scale.set(18 + Math.random() * 14, 5 + Math.random() * 3, 12 + Math.random() * 8);
        m.position.set(k * 16 - 24, Math.random() * 4, Math.random() * 10);
        g.add(m);
      }
      const a = (i / 40) * Math.PI * 2 * 3.1;
      const r = 80 + (i * 37) % 380;
      g.position.set(Math.cos(a) * r, 110 + (i % 5) * 12, Math.sin(a) * r);
      g.userData.order = i;
      this.clouds.add(g);
    }
    scene.add(this.clouds);
    // rain: points falling in a box that follows the camera
    const N = 2200;
    this.rainPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { this.rainPos[i * 3] = (Math.random() - 0.5) * 50; this.rainPos[i * 3 + 1] = Math.random() * 25; this.rainPos[i * 3 + 2] = (Math.random() - 0.5) * 50; }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: '#c9d6e2', size: 0.12, transparent: true, opacity: 0.75 }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
  }

  /** cloud 0–1 (clear → overcast), raining, windy 0–1. */
  private cloud = 0;
  setWeather(cloud: number, raining: boolean, dt: number, wind: number) {
    this.cloud += (cloud - this.cloud) * Math.min(1, dt * 0.5);
    const show = Math.round(this.clouds.children.length * Math.min(1, 0.15 + this.cloud * 1.1));
    for (const c of this.clouds.children) c.visible = (c.userData.order as number) < show;
    this.clouds.rotation.y += dt * (0.004 + wind * 0.02);
    this.cloudMat.color.set(this.cloud > 0.6 ? '#c8ced6' : '#ffffff');
    this.rain.visible = raining;
    if (raining) {
      const p = this.rainPos;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= dt * 14;
        p[i] += dt * wind * 4;
        if (p[i + 1] < 0) { p[i + 1] += 25; p[i] = (Math.random() - 0.5) * 50; }
      }
      (this.rain.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  /** minuteOfDay 0–1440. */
  update(minuteOfDay: number, focus: THREE.Vector3, inside: boolean) {
    const h = minuteOfDay / 60;
    const rise = 6.3;
    const set = 20.6;
    const dayT = (h - rise) / (set - rise);
    const elevation = Math.sin(Math.PI * Math.min(1, Math.max(0, dayT)));
    const isDay = h > rise && h < set;
    const dusk = isDay ? Math.max(0, 1 - Math.min(dayT, 1 - dayT) * 7) : 0;
    const night = isDay ? 0 : 1 - Math.min(1, Math.min(Math.abs(h - rise), Math.abs(h - set), Math.abs(h + 24 - set)) / 1.2);
    this.night = isDay ? smoothstep(0.05, 0, elevation) * 0.6 : Math.max(0.6, night);
    const grey = this.cloud * 0.75;
    const top = new THREE.Color().lerpColors(DAY_TOP, DUSK_TOP, dusk).lerp(new THREE.Color('#8e9aa6'), grey).lerp(NIGHT_TOP, this.night);
    const hor = new THREE.Color().lerpColors(DAY_HORIZON, DUSK_HORIZON, dusk).lerp(new THREE.Color('#bcc4cc'), grey).lerp(NIGHT_HORIZON, this.night);
    this.uniforms.top.value.copy(top);
    this.uniforms.horizon.value.copy(hor);
    (this.scene.fog as THREE.Fog).color.copy(hor);
    (this.scene.fog as THREE.Fog).far = inside ? 2000 : this.rain.visible ? 380 : 720;
    // sun moves east → south → west (x east, z south)
    const az = Math.PI * Math.min(1, Math.max(0, dayT));
    const dir = isDay
      ? new THREE.Vector3(Math.cos(az), Math.max(0.12, elevation), Math.sin(az) * 0.6 + 0.4).normalize()
      : new THREE.Vector3(-0.3, 0.8, 0.5).normalize();
    this.sun.position.copy(focus).addScaledVector(dir, 120);
    this.sun.target.position.copy(focus);
    this.sun.intensity = (isDay ? lerp(0.6, 2.5, smoothstep(0, 0.35, elevation)) : 0.35) * (1 - this.cloud * 0.85);
    this.sun.color.set(isDay ? (dusk > 0.3 ? '#ffc58a' : '#fff4e0') : '#9fb6ff');
    this.hemi.intensity = lerp(1.15, 0.35, this.night);
    this.hemi.color.set(this.night > 0.5 ? '#6f86c8' : '#cfe8ff');
    this.dome.position.copy(focus);
    this.clouds.position.set(focus.x, 0, focus.z);
    this.rain.position.set(focus.x, focus.y - 2, focus.z);
    this.rain.visible = this.rain.visible && !inside;
  }
}
