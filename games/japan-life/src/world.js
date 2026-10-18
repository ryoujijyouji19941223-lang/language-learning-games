import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  places,
  placeById,
  homes,
  homeById,
  residents,
  residentPosition,
  productById,
  destinations,
} from "./data.js";
import { floorSize } from "./engine.js";

const materials = new Map();
function mat(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
    );
  return materials.get(color);
}
function shape(group, geometry, x, y, z, color) {
  const mesh = new THREE.Mesh(geometry, mat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function box(g, x, y, z, w, h, d, c) {
  return shape(g, new THREE.BoxGeometry(w, h, d), x, y, z, c);
}
function ball(g, x, y, z, r, c) {
  return shape(g, new THREE.SphereGeometry(r, 8, 6), x, y, z, c);
}
function cylinder(g, x, y, z, r1, r2, h, c, sides = 8) {
  return shape(g, new THREE.CylinderGeometry(r1, r2, h, sides), x, y, z, c);
}
function optimize(group) {
  group.updateMatrixWorld(true);
  const meshes = new Map();
  group.traverse((o) => {
    if (o.isMesh && !o.userData.keep) {
      let geo = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      geo.applyMatrix4(o.matrixWorld);
      const key = o.material;
      if (!meshes.has(key)) meshes.set(key, []);
      meshes.get(key).push(geo);
    }
  });
  const output = new THREE.Group();
  for (const [material, geos] of meshes) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    output.add(mesh);
    geos.forEach((g) => g.dispose());
  }
  return output;
}
const signs = new Map();
function sign(g, text, x, y, z, width = 2.3, color = "#f8f1df") {
  const key = text + color;
  if (!signs.has(key)) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#5d7065";
    ctx.lineWidth = 7;
    ctx.strokeRect(7, 7, 498, 114);
    ctx.fillStyle = "#273f3b";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 67, 475);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    signs.set(
      key,
      new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    );
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    signs.get(key),
  );
  mesh.position.set(x, y, z);
  mesh.userData.keep = true;
  g.add(mesh);
  return mesh;
}
function tree(g, x, z, size = 1) {
  cylinder(g, x, 1.1 * size, z, 0.14 * size, 0.2 * size, 2.2 * size, "#846f54");
  ball(g, x, 2.9 * size, z, 1.25 * size, "#829d71");
  ball(g, x + 0.6 * size, 3 * size, z, 1 * size, "#9bb183");
}
function plant(g, x, z) {
  cylinder(g, x, 0.23, z, 0.25, 0.17, 0.46, "#b47b5f");
  for (let i = 0; i < 3; i++) {
    const leaf = ball(
      g,
      x + Math.sin(i * 2) * 0.18,
      0.65 + i * 0.13,
      z + Math.cos(i * 2) * 0.15,
      0.25,
      "#729773",
    );
    leaf.scale.y = 1.6;
  }
}
export function furnitureModel(item) {
  const g = new THREE.Group(),
    w = item.w * 0.5,
    d = item.d * 0.5,
    c = "#b99772";
  const leg = (x, z, h = 0.7) => box(g, x, h / 2, z, 0.07, h, 0.07, "#7d6951");
  switch (item.shape) {
    case "bed":
      box(g, 0, 0.2, 0, w, 0.35, d, "#967a60");
      box(g, 0, 0.46, 0, w - 0.05, 0.22, d - 0.08, "#e3d7bd");
      box(g, 0, 0.6, -d * 0.3, w * 0.8, 0.16, 0.4, "#fff5dd");
      box(g, 0, 0.61, d * 0.17, w * 0.96, 0.08, d * 0.55, "#96ada3");
      box(g, 0, 0.5, -d / 2, w, 0.85, 0.08, c);
      break;
    case "desk":
    case "table":
    case "lowtable": {
      const h = item.height;
      box(g, 0, h, 0, w, 0.08, d, c);
      [-1, 1].forEach((a) =>
        [-1, 1].forEach((b) => leg(a * (w / 2 - 0.09), b * (d / 2 - 0.09), h)),
      );
      if (item.shape === "desk")
        box(g, w * 0.25, h - 0.2, 0, w * 0.35, 0.25, d * 0.75, "#c8ab87");
      break;
    }
    case "chair":
      box(g, 0, 0.44, 0, w, 0.09, d, "#ab977d");
      box(g, 0, 0.72, -d * 0.4, w, 0.5, 0.08, c);
      [-1, 1].forEach((a) =>
        [-1, 1].forEach((b) => leg(a * 0.19, b * 0.19, 0.42)),
      );
      break;
    case "sofa":
      box(g, 0, 0.3, 0, w, 0.5, d, "#9cab9e");
      box(g, 0, 0.65, -d * 0.38, w, 0.6, 0.2, "#879a8d");
      box(g, -w * 0.43, 0.5, 0, 0.2, 0.55, d, "#879a8d");
      box(g, w * 0.43, 0.5, 0, 0.2, 0.55, d, "#879a8d");
      break;
    case "bookcase":
    case "cabinet":
      box(g, 0, item.height / 2, 0, w, item.height, d, c);
      box(
        g,
        0,
        item.height / 2,
        d * 0.52,
        w * 0.87,
        item.height * 0.86,
        0.04,
        "#665c4a",
      );
      for (let y = 0.2; y < item.height; y += 0.4) {
        box(g, 0, y, d * 0.1, w * 0.9, 0.05, d * 0.9, "#d4bb96");
        for (let j = 0; j < 4; j++)
          box(
            g,
            -w * 0.3 + j * w * 0.2,
            y + 0.14,
            d * 0.3,
            0.12,
            0.23,
            0.15,
            ["#698482", "#ba8c78", "#c7b16c", "#98a187"][j],
          );
      }
      break;
    case "plant":
      plant(g, 0, 0);
      break;
    case "light":
      cylinder(g, 0, 0.05, 0, 0.22, 0.22, 0.1, "#6a716b");
      cylinder(g, 0, 0.65, 0, 0.035, 0.035, 1.2, "#767268");
      cylinder(g, 0, 1.32, 0, 0.22, 0.36, 0.35, "#eddfae");
      break;
    case "bin":
      cylinder(g, 0, 0.22, 0, 0.2, 0.17, 0.44, "#8b9e98");
      break;
    case "cushion": {
      const m = ball(g, 0, 0.09, 0, 0.25, "#c99278");
      m.scale.set(1, 0.4, 1);
      break;
    }
    case "poster":
    case "flower":
    case "cloth":
      box(g, 0, item.d * 0.25, 0, w, item.d * 0.5, 0.04, "#b19371");
      box(
        g,
        0,
        item.d * 0.25,
        0.025,
        w * 0.9,
        item.d * 0.46,
        0.02,
        item.shape === "poster" ? "#8eb6ba" : "#d9bf9d",
      );
      ball(
        g,
        0,
        item.d * 0.28,
        0.06,
        0.16,
        item.shape === "poster" ? "#eed4a2" : "#bc8a81",
      );
      break;
    case "clock": {
      const m = cylinder(g, 0, 0.25, 0, 0.23, 0.23, 0.06, "#f2e6cd", 24);
      m.rotation.x = Math.PI / 2;
      box(g, 0, 0.3, 0.06, 0.025, 0.18, 0.03, "#4c635a");
      box(g, 0.06, 0.25, 0.06, 0.12, 0.025, 0.03, "#4c635a");
      break;
    }
    case "hanging":
      ball(g, 0, 0.3, 0, 0.2, "#b69168");
      box(g, 0, 0.13, 0, 0.04, 0.25, 0.03, "#bc806f");
      break;
    case "shelf":
      box(g, 0, 0.16, 0, w, 0.08, 0.28, c);
      break;
    case "curtain":
      box(
        g,
        -0.37,
        0.65,
        0,
        0.37,
        1.3,
        0.07,
        item.id === "f19" ? "#829eae" : "#d7cfb8",
      );
      box(
        g,
        0.37,
        0.65,
        0,
        0.37,
        1.3,
        0.07,
        item.id === "f19" ? "#829eae" : "#d7cfb8",
      );
      cylinder(g, 0, 1.35, 0, 0.025, 0.025, 1, "#8e7d62").rotation.z =
        Math.PI / 2;
      break;
    case "photo":
      box(g, 0, 0.14, 0, 0.24, 0.28, 0.04, c);
      box(g, 0, 0.14, 0.03, 0.18, 0.22, 0.02, "#83a5ac");
      break;
    case "vase":
      cylinder(g, 0, 0.12, 0, 0.06, 0.12, 0.24, "#b6c7bd");
      cylinder(g, 0, 0.3, 0, 0.01, 0.01, 0.25, "#6e8f66");
      ball(g, 0, 0.44, 0, 0.1, "#d8a18c");
      break;
    case "mug":
      cylinder(g, 0, 0.08, 0, 0.09, 0.08, 0.16, "#f0e1c1");
      shape(
        g,
        new THREE.TorusGeometry(0.06, 0.018, 5, 10),
        0.1,
        0.1,
        0,
        "#f0e1c1",
      );
      break;
    case "lamp":
      cylinder(g, 0, 0.04, 0, 0.14, 0.14, 0.08, "#887e6b");
      cylinder(g, 0, 0.17, 0, 0.02, 0.02, 0.25, "#887e6b");
      cylinder(g, 0, 0.3, 0, 0.12, 0.17, 0.15, "#ead5a4");
      break;
    case "radio":
      box(g, 0, 0.15, 0, 0.42, 0.28, 0.18, "#967a59");
      box(g, -0.07, 0.15, 0.1, 0.2, 0.18, 0.02, "#4c5f56");
      for (const y of [0.1, 0.15, 0.2])
        box(g, -0.07, y, 0.115, 0.18, 0.012, 0.015, "#c1b492");
      ball(g, 0.13, 0.13, 0.12, 0.035, "#e4d6b5");
      cylinder(g, 0.12, 0.42, 0, 0.008, 0.008, 0.32, "#b5bdb4").rotation.z =
        -0.22;
      break;
  }
  return g;
}
function person(style, wear) {
  const g = new THREE.Group();
  const top = wear?.top?.color || style.shirt,
    bottom = wear?.bottom?.color || "#5e7278",
    shoe = wear?.shoes?.color || "#715f4e";
  const head = ball(g, 0, 1.38, 0, 0.2, "#deb797");
  head.scale.set(0.86, 1.05, 0.9);
  const hair = ball(g, 0, 1.46, -0.035, 0.205, style.hair);
  hair.scale.set(0.95, 0.65, 1);
  box(g, 0, 1.02, 0, 0.4, 0.5, 0.25, top);
  box(g, 0, 1.2, 0.14, 0.14, 0.1, 0.03, "#e6dfc9");
  if (wear?.bottom?.shape === "skirt")
    cylinder(g, 0, 0.63, 0, 0.2, 0.33, 0.4, bottom);
  for (const side of [-1, 1]) {
    const arm = box(g, side * 0.265, 0.99, 0, 0.13, 0.47, 0.13, top);
    arm.rotation.z = side * 0.08;
    ball(g, side * 0.28, 0.73, 0, 0.07, "#deb797");
    cylinder(g, side * 0.115, 0.36, 0, 0.08, 0.075, 0.55, bottom);
    box(g, side * 0.115, 0.065, 0.06, 0.17, 0.12, 0.32, shoe);
  }
  box(g, -0.07, 1.39, 0.17, 0.025, 0.025, 0.025, "#433b35");
  box(g, 0.07, 1.39, 0.17, 0.025, 0.025, 0.025, "#433b35");
  if (style.accessory === 0) {
    box(g, 0.28, 0.77, 0.08, 0.18, 0.27, 0.13, "#d1b18a");
    box(g, 0.28, 0.99, 0.08, 0.11, 0.12, 0.04, "#7a6e57");
  }
  if (style.accessory === 1)
    cylinder(g, 0, 1.6, 0, 0.25, 0.25, 0.045, "#d3bd8d");
  if (style.accessory === 2) {
    box(g, 0, 0.97, -0.19, 0.27, 0.35, 0.18, "#816c54");
  }
  g.scale.set(style.body || 1, (style.height || 1.65) / 1.65, style.body || 1);
  return g;
}
export class World {
  constructor(container, onError) {
    this.container = container;
    this.onError = onError;
    this.keys = new Set();
    this.touch = { x: 0, z: 0 };
    this.yaw = 0;
    this.pitch = 0.58;
    this.obstacles = [];
    this.rayMeshes = [];
    this.npcs = [];
    this.targets = [];
    this.sceneId = "";
    this.lastKey = "";
    this.travel = 0;
    this.route = null;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#c2d8db");
    this.scene.fog = new THREE.Fog("#c2d8db", 65, 190);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.08, 400);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor("#c2d8db");
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight("#fff3dc", "#728c83", 2.2));
    this.sun = new THREE.DirectionalLight("#fff2d5", 2.7);
    this.sun.position.set(-30, 60, 25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.sun.shadow.camera.far = 120;
    this.sun.shadow.bias = -0.001;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.player = new THREE.Group();
    this.scene.add(this.player);
    this.ray = new THREE.Raycaster();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.activity = new THREE.Group();
    this.scene.add(this.activity);
    this.marker = shape(
      this.scene,
      new THREE.TorusGeometry(0.7, 0.06, 6, 24),
      0,
      0.1,
      0,
      "#e5b957",
    );
    this.marker.rotation.x = Math.PI / 2;
    this.marker.visible = false;
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      onError(
        "3Dの描画が中断しました。記録を保存し、画面を再読み込みしてください。",
      );
    });
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  clear() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.root.clear();
    this.dynamic.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.dynamic.clear();
    this.obstacles = [];
    this.rayMeshes = [];
    this.targets = [];
    this.npcs = [];
  }
  obstacle(x, z, w, d, mesh) {
    this.obstacles.push({ x, z, w, d });
    if (mesh) this.rayMeshes.push(mesh);
  }
  buildTown() {
    const g = new THREE.Group();
    box(g, 0, -0.2, -14, 146, 0.4, 120, "#b2bb98");
    box(g, 0, -0.01, -8, 9, 0.03, 120, "#9a9e92");
    for (const z of [-55, -20, 7, 29]) {
      box(g, 0, 0.015, z, 140, 0.04, 5, "#a3a599");
      box(g, 0, 0.045, z - 3.4, 140, 0.08, 1.4, "#d9ceaf");
    }
    for (const x of [-34, 10, 57])
      box(g, x, 0.02, -10, 3.5, 0.05, 90, "#c7c3ac");
    box(g, 0, 0, 41, 145, 0.25, 9, "#d7c8a7");
    box(g, 0, 0.05, 46, 145, 0.35, 1, "#87938b");
    this.water = box(g, 0, -0.3, 115, 400, 0.2, 140, "#79b5bd");
    for (let i = 0; i < 45; i++) {
      box(
        g,
        -75 + ((i * 17) % 150),
        0.02,
        51 + ((i * 13) % 120),
        4 + (i % 4) * 2,
        0.02,
        0.12,
        "#aed1cc",
      );
    }
    for (let i = 0; i < 35; i++) {
      const x = -69 + (i % 10) * 14,
        z = -66 + Math.floor(i / 10) * 28;
      if (
        places.some(
          (p) =>
            p.w && Math.abs(p.x - x) < p.w + 4 && Math.abs(p.z - z) < p.d + 4,
        )
      )
        continue;
      tree(g, x, z, 0.8 + (i % 3) * 0.15);
    }
    for (let i = 0; i < 10; i++) {
      cylinder(g, -68 + i * 14, 1.5, 39, 0.06, 0.06, 3, "#76877d");
      box(g, -68 + i * 14, 3, 39, 0.4, 0.12, 0.5, "#f3dcab");
    }
    for (const p of places.filter((p) => p.w)) {
      const h = p.kind === "home" ? 5.2 : 3.6,
        body = box(g, p.x, h / 2, p.z, p.w, h, p.d, p.color);
      this.obstacle(p.x, p.z, p.w, p.d, body);
      const roof = shape(
        g,
        new THREE.ConeGeometry(Math.max(p.w, p.d) * 0.76, 1.9, 4),
        p.x,
        h + 0.6,
        p.z,
        "#67797b",
      );
      roof.rotation.y = Math.PI / 4;
      roof.scale.z = p.d / p.w;
      box(
        g,
        p.x,
        h - 0.2,
        p.z + p.d / 2 + 0.6,
        p.w + 0.6,
        0.15,
        1.7,
        p.kind === "home" ? "#66736c" : "#e6cb9b",
      );
      const door = box(
        g,
        p.x,
        1.05,
        p.z + p.d / 2 + 0.05,
        1.25,
        2.1,
        0.12,
        "#5d7e7b",
      );
      box(g, p.x + 0.4, 1.05, p.z + p.d / 2 + 0.14, 0.05, 0.2, 0.06, "#e6d4b0");
      sign(
        this.root,
        p.name,
        p.x,
        2.95,
        p.z + p.d / 2 + 0.17,
        Math.min(p.w - 1, 4.6),
      );
      for (const x of [-p.w * 0.31, p.w * 0.31]) {
        box(g, p.x + x, 1.55, p.z + p.d / 2 + 0.08, 1.6, 1.3, 0.1, "#e2d8bd");
        box(g, p.x + x, 1.55, p.z + p.d / 2 + 0.16, 1.4, 1.1, 0.05, "#aac8c7");
        box(g, p.x + x, 1.55, p.z + p.d / 2 + 0.22, 0.05, 1.2, 0.04, "#7e8977");
      }
      if (p.kind === "home")
        for (const x of [-p.w * 0.3, 0, p.w * 0.3])
          box(g, p.x + x, 4, p.z + p.d / 2 + 0.08, 1.2, 1.05, 0.08, "#b5ccc8");
      plant(g, p.x - p.w / 2 - 0.6, p.z + p.d / 2 + 0.2);
      if (["grocery", "fish", "egg"].includes(p.kind))
        for (let j = 0; j < 3; j++) {
          box(
            g,
            p.x + p.w * 0.22 + j * 0.75,
            0.55,
            p.z + p.d / 2 + 0.5,
            0.65,
            0.9,
            0.65,
            "#9b8061",
          );
          for (let k = 0; k < 3; k++)
            ball(
              g,
              p.x + p.w * 0.22 + j * 0.75 + (k - 1) * 0.15,
              1.1,
              p.z + p.d / 2 + 0.5,
              0.14,
              p.kind === "fish"
                ? "#97afb3"
                : ["#9dac67", "#d6c19a", "#c59464"][j],
            );
        }
      this.targets.push({
        type: "door",
        id: p.id,
        name: p.name,
        x: p.x,
        z: p.z + p.d / 2 + 0.8,
      });
    }
    for (const d of destinations) {
      box(g, d.x, 0.65, d.z, 0.45, 1.3, 0.35, "#c18b6c");
      box(g, d.x, 0.95, d.z + 0.2, 0.28, 0.05, 0.04, "#6d776b");
      this.targets.push({
        type: "delivery",
        id: d.id,
        name: d.name,
        x: d.x,
        z: d.z,
      });
    }
    for (const [x, z] of [
      [45, -51],
      [-10, 40],
      [-45, 36],
    ]) {
      box(g, x, 0.45, z, 2, 0.15, 0.65, "#aa8c6b");
      box(g, x, 0.8, z - 0.25, 2, 0.65, 0.12, "#aa8c6b");
      this.targets.push({
        type: "bench",
        id: `bench${x}`,
        name: "ベンチで休む",
        x,
        z: z + 0.6,
      });
    }
    box(g, 8, 1.25, -51, 2, 1.5, 0.2, "#846c50");
    sign(this.root, "仕事と町の案内", 8, 1.4, -50.85, 1.8);
    this.targets.push({
      type: "board",
      id: "station_board",
      name: "仕事の掲示板",
      x: 8,
      z: -50,
    });
    box(g, 0, 2.7, -69, 28, 5.4, 7, "#c3b8a1");
    box(g, 0, 5.5, -69, 29, 0.35, 9, "#6e8581");
    sign(this.root, "汐待駅", 0, 3.4, -65.4, 5);
    this.obstacle(0, -69, 28, 7);
    for (let i = 0; i < 6; i++) {
      cylinder(g, -15 + i * 6, 1.5, 45, 0.1, 0.12, 3, "#8c8d78");
      const loop = shape(
        g,
        new THREE.TorusGeometry(0.3, 0.06, 6, 12),
        -15 + i * 6,
        0.6,
        44.4,
        "#b7a984",
      );
      loop.rotation.x = Math.PI / 2;
    }
    // 漁具と船。形状は独自の仮モデル。
    for (let i = 0; i < 3; i++) {
      const boat = new THREE.Group();
      const hull = shape(
        boat,
        new THREE.CylinderGeometry(1.4, 1, 5.2, 4),
        0,
        0.2,
        0,
        "#f0e5c9",
      );
      hull.rotation.z = Math.PI / 2;
      box(boat, 0, 0.8, 0, 1.8, 1.1, 1.4, "#739b9c");
      cylinder(boat, 0, 2, 0, 0.05, 0.05, 3, "#8f8170");
      boat.position.set(-38 + i * 36, 0, 57 + i * 9);
      g.add(boat);
    }
    for (let i = 0; i < 4; i++) {
      const wheel = shape(
        g,
        new THREE.TorusGeometry(0.38, 0.04, 5, 12),
        -16 + i * 0.6,
        0.5,
        -21,
        "#596d66",
      );
      wheel.rotation.y = 0;
    }
    box(g, -15, 1, -21, 1.8, 0.05, 0.04, "#82978a");
    this.root.add(optimize(g));
    for (const p of residents) {
      const mesh = person(p.style);
      this.dynamic.add(mesh);
      this.npcs.push({ data: p, mesh });
    }
  }
  buildRoom(s) {
    const preview = s.scene.startsWith("preview:"),
      home = homeById[preview ? s.scene.slice(8) : s.scene],
      g = new THREE.Group();
    const w = home ? home.w * 0.5 : 8,
      d = home ? home.d * 0.5 : 9,
      cx = home ? w / 2 : 0,
      cz = home ? d / 2 : 0;
    this.room = { w, d, cx, cz, home };
    box(g, cx, -0.1, cz, w, 0.2, d, "#cbb698");
    for (let i = 0; i < d; i += 0.5)
      box(g, cx, 0.006, (home ? 0 : -d / 2) + i, w, 0.01, 0.015, "#b29e80");
    const left = home ? 0 : -w / 2,
      right = home ? w : w / 2,
      back = home ? 0 : -d / 2,
      front = home ? d : d / 2;
    for (const [x, z, bw, bd] of [
      [cx, back, w, 0.12],
      [left, cz, 0.12, d],
      [right, cz, 0.12, d],
    ]) {
      const wall = box(g, x, 1.4, z, bw, 2.8, bd, "#e8dfc9");
      this.rayMeshes.push(wall);
    }
    // 手前は切り下げた壁。視点の遮蔽と配置の壁判定は独立。
    box(g, left + (w - 1) / 4, 0.45, front, (w - 1) / 2, 0.9, 0.1, "#ded3ba");
    box(g, right - (w - 1) / 4, 0.45, front, (w - 1) / 2, 0.9, 0.1, "#ded3ba");
    box(g, cx, 0.03, front - 0.35, 0.8, 0.04, 0.55, "#94a59b");
    this.targets.push({
      type: "exit",
      id: "exit",
      name: preview ? "町へ出る" : "外へ出る",
      x: cx,
      z: front - 0.4,
    });
    if (home) {
      box(g, 0.5, 0.45, 0.25, 1, 0.9, 0.5, "#9dafa6");
      box(g, 0.5, 0.94, 0.25, 1.1, 0.08, 0.6, "#eee5cf");
      cylinder(g, 0.23, 1.03, 0.25, 0.14, 0.14, 0.14, "#7f9190");
      this.obstacle(0.5, 0.25, 1, 0.5);
      sign(this.root, "台所", 0.5, 1.65, 0.09, 0.8);
      this.targets.push({
        type: "kitchen",
        id: "kitchen",
        name: "台所で料理",
        x: 0.45,
        z: 1,
      });
      if (home.id === "home02") {
        const partition = box(g, 1.25, 0.95, 0.65, 0.1, 1.9, 1.3, "#d1c5ac");
        this.obstacle(1.25, 0.65, 0.1, 1.3, partition);
      }
      const windowXs = home.windows === 2 ? [w * 0.24, w * 0.76] : [w * 0.6];
      windowXs.forEach((x) => {
        box(g, x, 1.65, 0.08, 0.85, 1.15, 0.06, "#94b9be");
        box(g, x, 1.65, 0.14, 0.04, 1.2, 0.03, "#7f8e80");
      });
      sign(
        this.root,
        preview ? "内見中" : home.name,
        cx,
        2.5,
        0.09,
        Math.min(w * 0.8, 2.7),
      );
      const items = preview
        ? [
            {
              uid: "previewbed",
              kind: "f01",
              at: { zone: "floor", x: home.w - 2, z: 1, rot: 0 },
            },
            {
              uid: "previewdesk",
              kind: "f02",
              at: { zone: "floor", x: 0, z: 4, rot: 0 },
            },
          ]
        : s.furniture;
      for (const instance of items.filter((i) => i.at))
        this.addFurniture(g, instance, items, home);
      if (!preview)
        this.targets.push({
          type: "furnish",
          id: "furnish",
          name: "保管箱・部屋を整える",
          x: w - 0.4,
          z: d - 0.7,
        });
    } else {
      const p = placeById[s.scene];
      sign(this.root, p.name, 0, 2.2, back + 0.12, 4);
      box(g, 0, 0.5, -1, 4, 1, 0.7, "#a98b69");
      this.obstacle(0, -1, 4, 0.7);
      if (p.kind === "cafe") {
        for (const x of [-2.7, 2.7]) {
          box(g, x, 0.8, 1, 1.1, 0.1, 1.1, "#b59d7c");
          cylinder(g, x, 0.4, 1, 0.06, 0.06, 0.8, "#6c786b");
          cylinder(g, x, 0.3, 2, 0.3, 0.3, 0.6, "#91a38f");
        }
        for (let i = 0; i < 3; i++) {
          const cup = furnitureModel(productById.f23);
          cup.position.set(-1 + i, 1.03, -1);
          g.add(cup);
        }
      } else if (p.kind === "furniture") {
        for (const [id, x, z] of [
          ["f06", -2.8, -3],
          ["f07", 2.7, -3],
          ["f09", 3, 1],
        ]) {
          const m = furnitureModel(productById[id]);
          m.position.set(x, 0, z);
          g.add(m);
        }
      } else if (p.kind === "clothes") {
        for (let i = 0; i < 4; i++) {
          box(
            g,
            -3 + i * 2,
            1.2,
            -3,
            0.65,
            0.6,
            0.25,
            ["#eee5d0", "#3c5b7b", "#97a187", "#8e8f91"][i],
          );
          cylinder(g, -3 + i * 2, 0.6, -3, 0.03, 0.03, 1.2, "#8a8171");
        }
      } else
        for (let i = 0; i < 4; i++) {
          box(g, -2.7 + i * 1.8, 1, -3, 1.2, 1.8, 0.7, "#a08a6f");
          for (let j = 0; j < 3; j++)
            for (let k = 0; k < 3; k++)
              ball(
                g,
                -3 + i * 1.8 + k * 0.3,
                0.45 + j * 0.55,
                -2.6,
                0.13,
                p.kind === "fish"
                  ? "#98bec0"
                  : ["#cbbb91", "#a6b974", "#d9b67a"][j],
              );
        }
      this.targets.push({
        type: "shop",
        id: p.id,
        name:
          p.kind === "office"
            ? "部屋を内見・転居"
            : p.kind === "cafe"
              ? "店員・喫茶の仕事"
              : "商品・集荷を確認",
        x: 0,
        z: 0.1,
      });
      const staff = residents.find((n) => n.workplace === p.id);
      const npc = person(
        staff?.style || {
          shirt: p.color,
          hair: "#493b33",
          height: 1.65,
          body: 1,
        },
      );
      npc.position.set(-2.7, 0, 0.3);
      g.add(npc);
      this.obstacle(-2.7, 0.3, 0.45, 0.45);
      npc.traverse((o) => {
        if (o.isMesh) this.rayMeshes.push(o);
      });
      if (staff)
        this.targets.push({
          type: "npc",
          id: staff.id,
          name: staff.name + "さんと話す",
          x: -2.7,
          z: 0.3,
        });
    }
    this.root.add(g);
  }
  addFurniture(g, instance, items, home) {
    const item = productById[instance.kind],
      at = instance.at,
      m = furnitureModel(item);
    if (at.zone === "floor") {
      const [w, d] = floorSize(item, at);
      m.position.set((at.x + w / 2) * 0.5, 0, (at.z + d / 2) * 0.5);
      m.rotation.y = (-at.rot * Math.PI) / 180;
      this.obstacle(m.position.x, m.position.z, w * 0.5, d * 0.5);
      if (["f01", "f03", "f06"].includes(item.id))
        this.targets.push({
          type: item.id === "f01" ? "bed" : "seat",
          id: instance.uid,
          name: item.id === "f01" ? "ベッドで翌朝まで眠る" : "座って休む",
          x: m.position.x,
          z: m.position.z,
        });
    } else if (at.zone === "wall") {
      const length =
        at.wall === "north" || at.wall === "south" ? home.w : home.d;
      const u = (at.u + item.w / 2) * 0.5;
      if (at.wall === "north") m.position.set(u, at.v * 0.5, 0.15);
      if (at.wall === "south") {
        m.position.set(u, at.v * 0.5, home.d * 0.5 - 0.1);
        m.rotation.y = Math.PI;
      }
      if (at.wall === "west") {
        m.position.set(0.12, at.v * 0.5, u);
        m.rotation.y = Math.PI / 2;
      }
      if (at.wall === "east") {
        m.position.set(home.w * 0.5 - 0.12, at.v * 0.5, u);
        m.rotation.y = -Math.PI / 2;
      }
    } else if (at.zone === "window") {
      const x =
        home.windows === 2
          ? home.w * 0.5 * (at.window === 0 ? 0.24 : 0.76)
          : home.w * 0.5 * 0.6;
      m.position.set(x, 1.05, 0.18);
    } else {
      const host = items.find((i) => i.uid === at.host);
      if (!host?.at) return;
      const hp = productById[host.kind],
        [w, d] = floorSize(hp, host.at);
      m.position.set(
        (host.at.x + w / 2) * 0.5,
        hp.height + 0.05,
        (host.at.z + d / 2) * 0.5,
      );
    }
    if (item.id === "f25")
      this.targets.push({
        type: "radio",
        id: instance.uid,
        name: "ラジオで曲を選ぶ",
        x: m.position.x,
        z: m.position.z,
      });
    g.add(m);
  }
  sync(s) {
    const roomKey =
      s.scene + JSON.stringify(s.furniture.map((i) => [i.uid, i.at]));
    if (this.lastKey !== roomKey) {
      this.clear();
      if (s.scene === "town") this.buildTown();
      else this.buildRoom(s);
      this.lastKey = roomKey;
      this.sceneId = s.scene;
      this.scene.fog.near = s.scene === "town" ? 65 : 20;
      this.scene.fog.far = s.scene === "town" ? 190 : 60;
    }
    const carrying = s.jobs.some((j) => j.status === "carrying");
    const wearKey = JSON.stringify(s.wear) + carrying;
    if (wearKey !== this.wearKey) {
      this.player.clear();
      this.player.add(
        person(
          { shirt: "#eee4ca", hair: "#443b31", height: 1.65, body: 0.92 },
          Object.fromEntries(
            Object.entries(s.wear).map(([k, v]) => [k, productById[v]]),
          ),
        ),
      );
      if (carrying) {
        box(this.player, 0.35, 0.88, 0.15, 0.34, 0.35, 0.32, "#c3a479");
        box(this.player, 0.35, 1.06, 0.15, 0.05, 0.02, 0.33, "#e8dbb2");
      }
      this.wearKey = wearKey;
    }
    const activityKey = s.scene + JSON.stringify([s.cafe?.prepared, s.cooking]);
    if (this.activityKey !== activityKey) {
      this.activity.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      this.activity.clear();
      this.activityKey = activityKey;
      if (s.scene === "market_cafe" && s.cafe?.prepared) {
        const p = s.cafe.prepared;
        box(this.activity, 0, 1.03, -0.8, 1.5, 0.06, 0.6, "#c1a479");
        for (let i = 0; i < p.qty; i++) {
          cylinder(
            this.activity,
            -0.45 + i * 0.42,
            1.18,
            -0.8,
            0.13,
            0.1,
            0.25,
            p.takeout ? "#dcc5a0" : "#f3e9cf",
          );
          cylinder(
            this.activity,
            -0.45 + i * 0.42,
            1.31,
            -0.8,
            0.11,
            0.11,
            0.012,
            p.drink === "coffee" ? "#584334" : "#a48e58",
          );
        }
        if (p.milk)
          cylinder(
            this.activity,
            0.57,
            1.14,
            -0.7,
            0.08,
            0.08,
            0.15,
            "#f1edda",
          );
      }
      if (s.scene === s.home && s.cooking) {
        const j = s.cooking;
        cylinder(this.activity, 0.5, 1.07, 0.25, 0.22, 0.2, 0.23, "#8a9e9b");
        cylinder(
          this.activity,
          0.5,
          1.2,
          0.25,
          0.19,
          0.19,
          0.015,
          j.recipe === "r03" ? "#a98c58" : "#edddaf",
        );
        const spoon = box(
          this.activity,
          0.5,
          1.28,
          0.25,
          0.04,
          0.35,
          0.04,
          "#b89b6c",
        );
        spoon.rotation.z = j.hits * 0.4;
        for (let i = 0; i < (j.done ? 5 : j.step + 1); i++)
          ball(
            this.activity,
            0.5 + Math.cos(i * 2) * 0.12,
            1.25,
            0.25 + Math.sin(i * 2) * 0.12,
            0.04,
            j.recipe === "r05"
              ? "#bd7e67"
              : j.recipe === "r06"
                ? "#e9c87d"
                : "#f2e8cd",
          );
      }
    }
    this.renderer.shadowMap.enabled = s.settings.shadows;
  }
  setGhost(s, uid, at) {
    if (this.ghost) {
      this.ghost.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.isMesh) o.material.dispose();
      });
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    if (!uid || !at || s.scene !== s.home) return;
    const instance = s.furniture.find((i) => i.uid === uid);
    if (!instance) return;
    const item = productById[instance.kind],
      home = homeById[s.home],
      g = furnitureModel(item);
    if (at.zone === "floor") {
      const [w, d] = floorSize(item, at);
      g.position.set((at.x + w / 2) * 0.5, 0.03, (at.z + d / 2) * 0.5);
      g.rotation.y = (-at.rot * Math.PI) / 180;
    } else if (at.zone === "wall") {
      const u = (at.u + item.w / 2) * 0.5;
      g.position.set(
        at.wall === "west"
          ? 0.14
          : at.wall === "east"
            ? home.w * 0.5 - 0.14
            : u,
        at.v * 0.5,
        at.wall === "north"
          ? 0.14
          : at.wall === "south"
            ? home.d * 0.5 - 0.14
            : u,
      );
      g.rotation.y =
        at.wall === "east"
          ? -Math.PI / 2
          : at.wall === "west"
            ? Math.PI / 2
            : at.wall === "south"
              ? Math.PI
              : 0;
    } else if (at.zone === "window")
      g.position.set(
        home.w *
          0.5 *
          (home.windows === 2 ? (at.window === 0 ? 0.24 : 0.76) : 0.6),
        1.05,
        0.18,
      );
    else {
      const host = s.furniture.find(
        (i) => i.uid === at.host && i.at?.zone === "floor",
      );
      if (!host) return;
      const hp = productById[host.kind],
        [w, d] = floorSize(hp, host.at);
      g.position.set(
        (host.at.x + w / 2) * 0.5,
        hp.height + 0.06,
        (host.at.z + d / 2) * 0.5,
      );
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.5;
        o.material.depthWrite = false;
      }
    });
    this.ghost = g;
    this.scene.add(g);
  }
  canMove(s, x, z) {
    const r = s.scene === "town" ? 0.26 : 0.18;
    if (s.scene === "town") {
      if (Math.abs(x) > 71 || z > 44.8 || z < -64) return false;
    } else {
      const { w, d, home } = this.room;
      if (home) {
        if (x < r || x > w - r || z < r || z > d - r) return false;
      } else if (Math.abs(x) > w / 2 - r || Math.abs(z) > d / 2 - r)
        return false;
    }
    if (
      this.obstacles.some(
        (b) =>
          Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r,
      )
    )
      return false;
    if (
      s.scene === "town" &&
      this.npcs.some(
        (n) =>
          n.inTown &&
          Math.hypot(n.mesh.position.x - x, n.mesh.position.z - z) < 0.5,
      )
    )
      return false;
    return true;
  }
  nearest(s) {
    let nearest = null,
      distance = 2.25;
    for (const t of this.targets) {
      const d = Math.hypot(s.pos.x - t.x, s.pos.z - t.z);
      if (d < distance) {
        nearest = t;
        distance = d;
      }
    }
    if (s.scene === "town")
      for (const n of this.npcs) {
        if (!n.inTown) continue;
        const d = Math.hypot(
          s.pos.x - n.mesh.position.x,
          s.pos.z - n.mesh.position.z,
        );
        if (d < distance) {
          nearest = {
            type: "npc",
            id: n.data.id,
            name: `${n.data.name}さんと話す`,
            x: n.mesh.position.x,
            z: n.mesh.position.z,
          };
          distance = d;
        }
      }
    return nearest;
  }
  frame(s, dt, blocked) {
    this.sync(s);
    this.yaw = s.yaw;
    if (!blocked) {
      const ix =
          (this.keys.has("d") || this.keys.has("ArrowRight") ? 1 : 0) -
          (this.keys.has("a") || this.keys.has("ArrowLeft") ? 1 : 0) +
          this.touch.x,
        iz =
          (this.keys.has("s") || this.keys.has("ArrowDown") ? 1 : 0) -
          (this.keys.has("w") || this.keys.has("ArrowUp") ? 1 : 0) +
          this.touch.z;
      const length = Math.hypot(ix, iz);
      if (length > 0.05) {
        const speed =
          s.scene === "town" ? (this.keys.has("Shift") ? 4.5 : 1.35) : 1.2;
        const f = (Math.min(1, length) * speed * dt) / length;
        const dx = (ix * Math.cos(s.yaw) + iz * Math.sin(s.yaw)) * f,
          dz = (-ix * Math.sin(s.yaw) + iz * Math.cos(s.yaw)) * f;
        const steps = Math.max(
          1,
          Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.12),
        );
        for (let i = 0; i < steps; i++) {
          if (this.canMove(s, s.pos.x + dx / steps, s.pos.z)) {
            s.pos.x += dx / steps;
            this.travel += Math.abs(dx / steps);
          }
          if (this.canMove(s, s.pos.x, s.pos.z + dz / steps)) {
            s.pos.z += dz / steps;
            this.travel += Math.abs(dz / steps);
          }
        }
        this.player.rotation.y = Math.atan2(dx, dz);
      }
    }
    this.player.position.set(s.pos.x, 0, s.pos.z);
    for (const n of this.npcs) {
      const p = residentPosition(n.data, s.clock);
      n.mesh.position.set(p.x, 0, p.z);
      n.inTown = p.scene === "town";
      n.mesh.visible =
        n.inTown && Math.hypot(p.x - s.pos.x, p.z - s.pos.z) < 42;
    }
    const target = new THREE.Vector3(s.pos.x, 1.05, s.pos.z),
      distance = s.scene === "town" ? 6.8 : 3.3;
    const desired = new THREE.Vector3(
      s.pos.x + Math.sin(s.yaw) * distance,
      1.05 + distance * this.pitch,
      s.pos.z + Math.cos(s.yaw) * distance,
    );
    this.root.updateMatrixWorld(true);
    this.dynamic.updateMatrixWorld(true);
    const dir = desired.clone().sub(target).normalize();
    this.ray.set(target, dir);
    this.ray.far = target.distanceTo(desired);
    const hits = [
      ...this.ray.intersectObjects(this.rayMeshes, false),
      ...this.ray.intersectObjects(
        this.npcs.filter((n) => n.mesh.visible).map((n) => n.mesh),
        true,
      ),
    ].sort((a, b) => a.distance - b.distance);
    const hit = hits.find((h) => h.distance > 0.12);
    if (hit)
      desired
        .copy(target)
        .addScaledVector(dir, Math.max(0.5, hit.distance - 0.25));
    this.player.visible = desired.distanceTo(target) > 0.75;
    this.camera.position.lerp(desired, Math.min(1, dt * 12));
    this.camera.lookAt(target);
    this.sun.position.set(s.pos.x - 20, 45, s.pos.z + 20);
    this.sun.target.position.set(s.pos.x, 0, s.pos.z);
    if (this.route && s.scene === "town") {
      this.marker.visible = true;
      this.marker.position.set(this.route.x, 0.12, this.route.z);
    } else this.marker.visible = false;
    const hour = (s.clock % 1440) / 60;
    this.sun.intensity = hour >= 6 && hour < 18 ? 2.5 : 1;
    this.scene.background.set(hour >= 6 && hour < 18 ? "#c2d8db" : "#637b8c");
    this.renderer.render(this.scene, this.camera);
  }
}
