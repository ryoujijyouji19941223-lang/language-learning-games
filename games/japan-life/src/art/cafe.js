import * as THREE from "three";
import { surface, mesh, block, rod } from "./materials.js";
import { placard, windowUnit } from "./buildings.js";
import { person } from "./characters.js";
import { workStations } from "../cafe-work.js";

export function cupModel(cup, fill = 1) {
  const g = new THREE.Group(),
    paper = cup.container === "paper",
    body = surface("ceramic", paper ? "#d9c4a1" : "#e5e1ce", {
      roughness: paper ? 0.9 : 0.3,
    });
  mesh(
    g,
    new THREE.CylinderGeometry(0.115, 0.085, 0.22, 16, 1, true),
    body,
    0,
    0.11,
    0,
  );
  mesh(
    g,
    new THREE.CylinderGeometry(0.086, 0.086, 0.025, 16),
    body,
    0,
    0.014,
    0,
  );
  const lip = mesh(
    g,
    new THREE.TorusGeometry(0.115, 0.009, 5, 20),
    body,
    0,
    0.22,
    0,
  );
  lip.rotation.x = Math.PI / 2;
  if (!paper)
    mesh(g, new THREE.TorusGeometry(0.057, 0.016, 5, 14), body, 0.126, 0.13, 0);
  if (cup.drink) {
    const liquid = mesh(
      g,
      new THREE.CircleGeometry(0.102, 20),
      surface(
        "liquid",
        cup.milkInside
          ? "#8c6a46"
          : cup.drink === "coffee"
            ? "#382c20"
            : "#8f5b25",
        { roughness: 0.22 },
      ),
      0,
      0.035 + 0.164 * fill,
      0,
    );
    liquid.rotation.x = -Math.PI / 2;
    g.userData.liquid = liquid;
  }
  if (cup.lidded) {
    mesh(
      g,
      new THREE.CylinderGeometry(0.124, 0.121, 0.035, 20),
      surface("plastic", "#e9e7d8"),
      0,
      0.238,
      0,
    );
    block(g, 0, 0.259, 0.06, 0.045, 0.01, 0.02, surface("plastic", "#777e70"));
  }
  return g;
}
export function pitcherModel(filled = false) {
  const g = new THREE.Group();
  mesh(
    g,
    new THREE.CylinderGeometry(0.065, 0.075, 0.12, 12),
    surface("ceramic", "#ede6d4"),
    0,
    0.06,
    0,
  );
  mesh(
    g,
    new THREE.TorusGeometry(0.036, 0.012, 5, 12),
    surface("ceramic", "#ede6d4"),
    0.082,
    0.065,
    0,
  );
  if (filled) {
    const milk = mesh(
      g,
      new THREE.CircleGeometry(0.061, 12),
      surface("milk", "#fff4de"),
      0,
      0.122,
      0,
    );
    milk.rotation.x = -Math.PI / 2;
  }
  return g;
}
export function makeCafeRoom(world, s, optimize) {
  const g = new THREE.Group(),
    wood = surface("wood", "#d6c7a8"),
    steel = surface("metal", "#b9c3bc", { metalness: 0.55, roughness: 0.27 }),
    dark = surface("metal", "#44544e");
  world.room = { w: 8, d: 9, cx: 0, cz: 0, home: null };
  block(g, 0, -0.1, 0, 8, 0.2, 9, wood);
  for (const [x, z, w, d] of [
    [-4, 0, 0.12, 9],
    [4, 0, 0.12, 9],
    [0, -4.5, 8, 0.12],
  ]) {
    const wall = block(g, x, 1.5, z, w, 3, d, surface("stucco", "#f2e9d3"));
    world.rayMeshes.push(wall);
  }
  block(g, 0, 0.45, 4.5, 8, 0.9, 0.12, surface("wood", "#b9a687"));
  for (const side of [-1, 1]) {
    const windows = new THREE.Group();
    windows.position.set(side * 3.92, 0, 1.7);
    windows.rotation.y = (-side * Math.PI) / 2;
    g.add(windows);
    windowUnit(windows, 0, 1.7, 0, 2.8, 1.65);
    block(g, side * 2.7, 0.75, 1, 1.1, 0.1, 1.1, wood);
    rod(g, [side * 2.7, 0.05, 1], [side * 2.7, 0.72, 1], 0.07, dark);
    for (const zz of [0.2, 1.8]) {
      block(g, side * 2.7, 0.43, zz, 0.5, 0.1, 0.5, surface("wood", "#8e7960"));
      block(
        g,
        side * 2.7,
        0.72,
        zz - 0.21,
        0.5,
        0.53,
        0.07,
        surface("wood", "#8e7960"),
      );
    }
    const lamp = mesh(
      g,
      new THREE.ConeGeometry(0.24, 0.25, 16, 1, true),
      surface("metal", "#48605c"),
      side * 2.7,
      2.3,
      1,
    );
    rod(g, [side * 2.7, 2.4, 1], [side * 2.7, 3, 1], 0.014, dark);
  }
  const front = block(
    g,
    0,
    0.48,
    -1,
    4,
    0.96,
    0.65,
    surface("wood", "#8e7555"),
  );
  block(g, 0, 0.99, -1, 4.2, 0.08, 0.78, surface("wood", "#bcab86"));
  world.obstacle(0, -1, 4, 0.65, front);
  block(g, 0, 0.48, -3.65, 7.35, 0.96, 0.65, surface("wood", "#b8b1a0"));
  block(g, 0, 1, -3.65, 7.5, 0.08, 0.76, steel);
  world.obstacle(0, -3.65, 7.35, 0.65);
  const sideCounter = block(
    g,
    3.65,
    0.48,
    -1.9,
    0.65,
    0.96,
    2.8,
    surface("wood", "#aa9c81"),
  );
  world.obstacle(3.65, -1.9, 0.65, 2.8, sideCounter);
  block(g, -0.7, 1.1, -3.35, 1.15, 0.16, 0.65, steel);
  block(g, -0.7, 1.49, -3.53, 1.1, 0.72, 0.28, steel);
  block(g, -0.7, 1.82, -3.4, 1.17, 0.1, 0.6, dark);
  for (const x of [-0.9, -0.5]) {
    rod(g, [x, 1.48, -3.38], [x, 1.4, -3.1], 0.045, dark);
    rod(
      g,
      [x, 1.4, -3.1],
      [x + 0.13, 1.4, -2.99],
      0.027,
      surface("wood", "#4d4b3c"),
    );
  }
  const gauge = mesh(
    g,
    new THREE.TorusGeometry(0.073, 0.012, 6, 18),
    steel,
    -0.95,
    1.69,
    -3.36,
  );
  mesh(
    g,
    new THREE.CircleGeometry(0.063, 16),
    surface("ceramic", "#e8debf"),
    -0.95,
    1.69,
    -3.351,
  );
  for (const x of [-0.6, -0.43])
    mesh(
      g,
      new THREE.SphereGeometry(0.024, 6, 5),
      surface("light", "#a6ba75", {
        emissive: "#8ea65b",
        emissiveIntensity: 0.3,
      }),
      x,
      1.67,
      -3.35,
    );
  // A distinct pot, tea tin and milk bottle; they are not UI checkboxes.
  const kettle = mesh(
    g,
    new THREE.SphereGeometry(0.23, 14, 10),
    steel,
    1,
    1.25,
    -3.4,
  );
  kettle.scale.y = 0.88;
  mesh(
    g,
    new THREE.CylinderGeometry(0.12, 0.14, 0.045, 12),
    steel,
    1,
    1.48,
    -3.4,
  );
  mesh(g, new THREE.TorusGeometry(0.17, 0.025, 6, 18), dark, 0.77, 1.28, -3.43);
  rod(g, [1.14, 1.29, -3.31], [1.28, 1.23, -3.02], 0.035, steel, 0.022);
  mesh(
    g,
    new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12),
    surface("metal", "#6a7960"),
    1.7,
    1.18,
    -3.5,
  );
  placard(g, "紅茶", 1.7, 1.18, -3.37, 0.22);
  mesh(
    g,
    new THREE.CylinderGeometry(0.13, 0.12, 0.38, 12),
    surface("glass", "#e8e5d6"),
    3.57,
    1.19,
    -2.25,
  );
  block(g, 3.57, 1.4, -2.25, 0.18, 0.1, 0.18, surface("plastic", "#798a6c"));
  placard(g, "ミルク", 3.57, 1.18, -2.09, 0.25);
  for (let i = 0; i < 3; i++) {
    const cup = cupModel({ container: "ceramic" });
    cup.position.set(-3.3 + i * 0.08, 1.05 + i * 0.14, -3.35);
    g.add(cup);
  }
  for (let i = 0; i < 4; i++) {
    const cup = cupModel({ container: "paper" });
    cup.position.set(-2.3, 1.05 + i * 0.09, -3.35);
    g.add(cup);
  }
  for (let i = 0; i < 4; i++)
    mesh(
      g,
      new THREE.CylinderGeometry(0.125, 0.125, 0.025, 16),
      surface("plastic", "#ece8d8"),
      2.3,
      1.04 + i * 0.028,
      -3.35,
    );
  const creamer = pitcherModel();
  creamer.position.set(3.57, 1.03, -0.9);
  g.add(creamer);
  placard(g, "喫茶つばめ", 0, 2.5, -4.4, 3.4, "#c9c5ac");
  const owner = person(
    { variant: 15, work: true, shirt: "#556f62", height: 1.68 },
    {},
  );
  owner.position.set(-2.7, 0, 0.3);
  g.add(owner);
  world.obstacle(-2.7, 0.3, 0.45, 0.45);
  world.targets.push(
    { type: "shop", id: "market_cafe", name: "店員・喫茶の仕事", x: 0, z: 0.1 },
    { type: "npc", id: "p16", name: "喫茶店主と話す", x: -2.7, z: 0.3 },
    { type: "exit", id: "exit", name: "海辺へ出る", x: 0, z: 4.1 },
  );
  for (const t of workStations)
    world.targets.push({
      type: "workstation",
      id: t.id,
      name: t.name,
      x: t.x,
      z: t.z,
    });
  world.root.add(optimize(g));
}
export function workObjects(world, s) {
  const w = s.cafe?.work;
  if (!w) return {};
  const result = {};
  function cupAt(c, x, y, z) {
    const model = c.kind === "pitcher" ? pitcherModel(c.filled) : cupModel(c);
    model.position.set(x, y, z);
    world.activity.add(model);
    return model;
  }
  if (w.hand) result.held = cupAt(w.hand, 0, 0, 0);
  if (w.machine) {
    const brewing = !!w.pouring,
      c = {
        ...w.machine.cup,
        drink: brewing ? w.machine.tool : w.machine.cup.drink,
      };
    const model = cupAt(c, w.machine.tool === "coffee" ? -0.7 : 1, 1.04, -3.12);
    result.liquid = model.userData.liquid;
    if (brewing)
      result.stream = mesh(
        world.activity,
        new THREE.CylinderGeometry(0.012, 0.018, 0.19, 8),
        surface("liquid", w.pouring.tool === "coffee" ? "#49341e" : "#a57b35"),
        w.machine.tool === "coffee" ? -0.7 : 1,
        1.37,
        -3.12,
      );
  }
  const tray = new THREE.Group();
  block(tray, 0, 0, 0, 1.1, 0.06, 0.64, surface("wood", "#aa8c63"));
  block(tray, 0, 0.035, -0.32, 1.14, 0.08, 0.035, surface("wood", "#8c7656"));
  block(tray, 0, 0.035, 0.32, 1.14, 0.08, 0.035, surface("wood", "#8c7656"));
  w.tray.forEach((c, i) => {
    const model = cupModel(c);
    model.position.set(-0.32 + i * 0.31, 0.035, 0);
    tray.add(model);
  });
  if (w.milkSide) {
    const pitcher = pitcherModel(true);
    pitcher.position.set(0.36, 0.04, 0.2);
    tray.add(pitcher);
  }
  tray.position.set(1.4, 1.07, -1);
  world.activity.add(tray);
  result.tray = w.carryingTray ? tray : null;
  const customer = person(
    {
      variant: 40 + s.cafe.step,
      shirt: ["#849679", "#a48c80", "#8e9da4", "#998a68"][s.cafe.step % 4],
      height: 1.6,
    },
    {},
  );
  customer.position.set(0, 0, 0.4);
  customer.rotation.y = Math.PI;
  world.activity.add(customer);
  return result;
}
