import * as THREE from "three";
import { surface, block, mesh, rod, projectUV } from "./materials.js";

const signMaterials = new Map();
export function placard(
  g,
  text,
  x,
  y,
  z,
  w = 3,
  background = "#e8dfc8",
  ink = "#263c37",
) {
  const key = text + background + ink;
  if (!signMaterials.has(key)) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const c = canvas.getContext("2d");
    c.fillStyle = background;
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = ink;
    c.lineWidth = 6;
    c.strokeRect(14, 14, 996, 228);
    c.font = '600 102px "Noto Sans CJK JP",sans-serif';
    c.fillStyle = ink;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 512, 137, 950);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    signMaterials.set(
      key,
      new THREE.MeshStandardMaterial({
        map: t,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
    );
  }
  const m = mesh(
    g,
    new THREE.PlaneGeometry(w, w / 4),
    signMaterials.get(key),
    x,
    y,
    z,
  );
  m.userData.keep = true;
  return m;
}
export function windowUnit(g, x, y, z, w = 1.3, h = 1.2, lit = false) {
  const frame = surface("wood", "#5a5346"),
    glass = surface("glass", lit ? "#e4b976" : "#47666b", {
      roughness: 0.18,
      metalness: 0.25,
      emissive: lit ? "#f4a650" : "#162c32",
      emissiveIntensity: lit ? 0.45 : 0.04,
    });
  block(g, x, y, z, w + 0.12, h + 0.12, 0.14, frame);
  block(g, x, y, z + 0.08, w, h, 0.035, glass);
  block(g, x, y, z + 0.11, 0.035, h, 0.04, frame);
  block(g, x, y - h * 0.06, z + 0.12, w, 0.032, 0.04, frame);
  block(
    g,
    x,
    y - h / 2 - 0.06,
    z + 0.06,
    w + 0.3,
    0.09,
    0.32,
    surface("concrete", "#a6a18b"),
  );
}
export function makeBuilding(g, b, { shopLabel = "", seed = 0 } = {}) {
  const original = b,
    rotation =
      b.facing === "east"
        ? Math.PI / 2
        : b.facing === "west"
          ? -Math.PI / 2
          : 0;
  if (rotation) b = { ...b, w: b.d, d: b.w };
  const h = b.floors === 1 ? 3.3 : b.floors === 3 ? 8.3 : 5.9,
    front = b.d / 2;
  const building = new THREE.Group();
  building.position.set(original.x, original.y, original.z);
  building.rotation.y = rotation;
  g.add(building);
  const wall = surface(
    seed % 3 === 0 ? "stucco" : "plaster",
    ["#fff8e9", "#f7ebd7", "#ecf0e4", "#fcebd9"][seed % 4],
  );
  const darkWood = surface("wood", seed % 2 ? "#b1a18d" : "#8c7963");
  block(
    building,
    0,
    -0.23,
    0,
    b.w + 0.25,
    0.5,
    b.d + 0.25,
    surface("stone", "#9d9d8c"),
  );
  const body = block(building, 0, h / 2, 0, b.w, h, b.d, wall);
  block(building, 0, 0.5, front + 0.05, b.w, 1, 0.12, darkWood);
  block(building, 0, h * 0.53, front + 0.06, b.w, 0.18, 0.15, darkWood);
  const roofRise = b.style === "apartment" ? 1.2 : 1.8,
    over = 0.5,
    half = b.w / 2 + over,
    slope = Math.hypot(half, roofRise),
    pitch = Math.atan2(roofRise, half);
  const attic = new THREE.Shape();
  attic.moveTo(-b.w / 2, h);
  attic.lineTo(0, h + roofRise * 0.91);
  attic.lineTo(b.w / 2, h);
  attic.closePath();
  mesh(
    building,
    projectUV(
      new THREE.ExtrudeGeometry(attic, { depth: b.d, bevelEnabled: false }),
    ),
    wall,
    0,
    0,
    -b.d / 2,
  );
  for (const side of [-1, 1]) {
    const roof = block(
      building,
      (side * half) / 2,
      h + roofRise / 2,
      0,
      slope,
      0.15,
      b.d + 1,
      surface("tile", seed % 5 === 2 ? "#b49b87" : "#a3afb1"),
    );
    roof.rotation.z = -side * pitch;
    if (b.snow) {
      const snow = block(
        building,
        (side * half) / 2,
        h + roofRise / 2 + 0.1,
        0,
        slope,
        0.08,
        b.d + 1,
        surface("snow", "#edf0e8"),
      );
      snow.rotation.z = -side * pitch;
    }
    block(
      building,
      side * (b.w / 2 + over - 0.07),
      h - 0.02,
      0,
      0.13,
      0.16,
      b.d + 0.8,
      surface("metal", "#525956", { roughness: 0.48, metalness: 0.3 }),
    );
    rod(
      building,
      [side * (b.w / 2 + 0.22), h, front + 0.25],
      [side * (b.w / 2 + 0.22), 0.15, front + 0.25],
      0.045,
      surface("metal", "#6d7269"),
    );
  }
  rod(
    building,
    [0, h + roofRise + 0.08, -front - 0.5],
    [0, h + roofRise + 0.08, front + 0.5],
    0.11,
    surface("tile", "#677078"),
  );
  // Metal-framed entrance, transom, handles, threshold and an individual house number.
  block(building, 0, 1.16, front + 0.09, 1.25, 2.32, 0.2, darkWood);
  block(
    building,
    0,
    1.12,
    front + 0.21,
    1.08,
    2.1,
    0.04,
    surface("wood", "#696b5e"),
  );
  block(
    building,
    0,
    1.57,
    front + 0.24,
    0.82,
    0.95,
    0.025,
    surface("glass", "#5b7778", { roughness: 0.2, metalness: 0.2 }),
  );
  rod(
    building,
    [0.39, 0.92, front + 0.29],
    [0.39, 1.26, front + 0.29],
    0.022,
    surface("metal", "#b9b6a1", { metalness: 0.5 }),
  );
  block(
    building,
    0,
    0.035,
    front + 0.4,
    1.6,
    0.07,
    0.65,
    surface("concrete", "#c9c6b4"),
  );
  for (const xx of [-b.w * 0.3, b.w * 0.3]) {
    windowUnit(building, xx, 1.65, front + 0.06, b.w * 0.22, 1.45);
    if (h > 4) windowUnit(building, xx, 4.1, front + 0.06, 1.45, 1.38);
  }
  if (b.style === "apartment") {
    block(
      building,
      0,
      3.2,
      front + 0.52,
      b.w - 0.6,
      0.14,
      1.1,
      surface("concrete", "#a5a395"),
    );
    for (let i = 0; i < 12; i++)
      rod(
        building,
        [-b.w / 2 + 0.45 + (i * (b.w - 0.9)) / 11, 3.25, front + 1],
        [-b.w / 2 + 0.45 + (i * (b.w - 0.9)) / 11, 4.12, front + 1],
        0.018,
        surface("metal", "#4d5c58"),
      );
    block(
      building,
      0,
      4.12,
      front + 1,
      b.w - 0.8,
      0.055,
      0.055,
      surface("metal", "#505c58"),
    );
  }
  // Side windows, AC condensers, pipes, eaves and doorstep plants break the silhouettes.
  for (const side of [-1, 1]) {
    const unit = new THREE.Group();
    unit.position.set(side * (b.w / 2 + 0.04), 0, -b.d * 0.17);
    unit.rotation.y = (side * Math.PI) / 2;
    building.add(unit);
    windowUnit(unit, 0, 1.7, 0, 1.2, 1.15);
    if (h > 4) windowUnit(unit, 0, 4.2, 0, 1.1, 1.2);
    block(
      building,
      side * (b.w / 2 + 0.38),
      0.65,
      -b.d * 0.27,
      0.65,
      0.7,
      1.05,
      surface("metal", "#b6b6a5"),
    );
    for (let k = 0; k < 5; k++)
      block(
        building,
        side * (b.w / 2 + 0.72),
        0.42 + k * 0.1,
        -b.d * 0.27,
        0.025,
        0.025,
        0.8,
        surface("metal", "#696f66"),
      );
  }
  if (shopLabel) {
    placard(
      building,
      shopLabel,
      0,
      2.9,
      front + 0.28,
      Math.min(b.w - 0.4, 5.4),
      shopLabel === "魚屋" ? "#e5e5cd" : "#dfd2b1",
    );
    const awning = block(
      building,
      0,
      2.54,
      front + 0.78,
      b.w - 0.35,
      0.09,
      1.35,
      surface(
        "cloth",
        shopLabel === "魚屋"
          ? "#304f5b"
          : shopLabel === "喫茶店"
            ? "#5d6955"
            : "#7f5845",
      ),
    );
    awning.rotation.x = 0.12;
    for (let i = 0; i < Math.floor(b.w / 0.7); i++)
      block(
        building,
        -b.w / 2 + 0.5 + i * 0.7,
        2.38,
        front + 1.43,
        0.5,
        0.28,
        0.04,
        surface(
          "cloth",
          i % 2 ? "#b6b19b" : shopLabel === "魚屋" ? "#314e5b" : "#6b705c",
        ),
      );
  } else {
    placard(
      building,
      b.address?.split("丁目").at(-1) || "住まい",
      b.w * 0.35,
      2.7,
      front + 0.16,
      0.88,
      "#e2dfcf",
    );
    block(
      building,
      -b.w * 0.31,
      0.85,
      front + 0.48,
      0.5,
      0.38,
      0.18,
      surface("metal", "#667b72"),
    );
    block(
      building,
      -b.w * 0.31,
      0.96,
      front + 0.59,
      0.32,
      0.03,
      0.025,
      surface("metal", "#283e3b"),
    );
  }
  if (h > 4 && seed % 3 === 1) {
    for (const side of [-1, 1])
      for (let j = 0; j < 5; j++)
        block(
          building,
          side * b.w * 0.3 + (j - 2) * 0.22,
          4.1,
          front + 0.17,
          0.07,
          1.5,
          0.06,
          darkWood,
        );
  }
  // Small window planters and stored pottery give a reason for the space at the entrance.
  for (const side of [-1, 1]) {
    block(
      building,
      side * b.w * 0.3,
      0.68,
      front + 0.43,
      0.9,
      0.25,
      0.28,
      surface("ceramic", "#8f6d50"),
    );
    for (let j = 0; j < 6; j++) {
      const leaf = mesh(
        building,
        new THREE.SphereGeometry(0.1, 6, 4),
        surface("leaf", "#6f8051"),
        side * b.w * 0.3 + (j - 2.5) * 0.12,
        0.9 + (j % 2) * 0.09,
        front + 0.44,
      );
      leaf.scale.set(0.6, 1.5, 0.55);
    }
  }
  return { group: building, body, height: h };
}
export function fishDisplay(g, x, y, z) {
  const steel = surface("metal", "#a3b1ac", {
    roughness: 0.35,
    metalness: 0.45,
  });
  block(g, x, y + 0.7, z, 2.6, 0.2, 1.1, steel);
  block(g, x, y + 0.25, z, 2.4, 0.6, 0.85, surface("wood", "#6c8582"));
  block(
    g,
    x,
    y + 0.82,
    z,
    2.42,
    0.05,
    0.94,
    surface("ice", "#d8e2d9", { roughness: 0.22, metalness: 0.18 }),
  );
  for (let i = 0; i < 7; i++) {
    const fish = mesh(
      g,
      new THREE.SphereGeometry(0.16, 10, 6),
      surface("fish", i % 2 ? "#8daba7" : "#a4b9b6", {
        roughness: 0.3,
        metalness: 0.25,
      }),
      x - 0.95 + i * 0.31,
      y + 0.91,
      z,
    );
    fish.scale.set(0.65, 0.55, 2.1);
    fish.rotation.y = 0.2 * ((i % 3) - 1);
    const tail = mesh(
      g,
      new THREE.ConeGeometry(0.14, 0.22, 3),
      surface("fish", "#6e8c8a"),
      fish.position.x,
      y + 0.91,
      z - 0.38,
    );
    tail.rotation.x = -Math.PI / 2;
    tail.scale.y = 0.9;
    mesh(
      g,
      new THREE.SphereGeometry(0.022, 6, 4),
      surface("eye", "#1d2928"),
      fish.position.x + 0.08,
      y + 0.94,
      z + 0.22,
    );
  }
  placard(g, "本日の魚", x, y + 0.62, z + 0.59, 1.2, "#e6dfc9");
}
export function bicycle(g, x, y, z, rotation = 0) {
  const bike = new THREE.Group();
  bike.position.set(x, y, z);
  bike.rotation.y = rotation;
  g.add(bike);
  const metal = surface("metal", "#516b66", { metalness: 0.35 }),
    tyre = surface("rubber", "#333d38");
  for (const xx of [-0.53, 0.53]) {
    const wheel = mesh(
      bike,
      new THREE.TorusGeometry(0.31, 0.035, 6, 20),
      tyre,
      xx,
      0.34,
      0,
    );
    for (let a = 0; a < 8; a++) {
      const th = (a * Math.PI) / 4;
      rod(
        bike,
        [xx, 0.34, 0],
        [xx + 0.29 * Math.cos(th), 0.34 + 0.29 * Math.sin(th), 0],
        0.006,
        metal,
      );
    }
  }
  for (const [a, b] of [
    [
      [-0.53, 0.34, 0],
      [-0.1, 0.86, 0],
    ],
    [
      [-0.1, 0.86, 0],
      [0.2, 0.36, 0],
    ],
    [
      [0.2, 0.36, 0],
      [-0.53, 0.34, 0],
    ],
    [
      [-0.1, 0.86, 0],
      [0.49, 0.86, 0],
    ],
    [
      [0.49, 0.86, 0],
      [0.53, 0.34, 0],
    ],
    [
      [0.2, 0.36, 0],
      [0.49, 0.86, 0],
    ],
  ])
    rod(bike, a, b, 0.025, metal);
  block(bike, -0.1, 0.93, 0, 0.3, 0.07, 0.18, tyre);
  rod(bike, [0.49, 0.86, 0], [0.53, 1.07, 0], 0.023, metal);
  rod(bike, [0.53, 1.07, -0.2], [0.53, 1.07, 0.2], 0.018, metal);
}
