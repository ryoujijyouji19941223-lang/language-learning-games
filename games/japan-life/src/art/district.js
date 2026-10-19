import * as THREE from "three";
import { places, residents, destinations } from "../data.js";
import { dwellings, doorOf } from "./layout.js";
import { groundHeight } from "./height.js";
import { surface, block, mesh, rod } from "./materials.js";
import { makeBuilding, placard, fishDisplay, bicycle } from "./buildings.js";
import { terrain, seaAndMountains } from "./landscape.js";
import { vegetation, random } from "./vegetation.js";
import { person } from "./characters.js";
import { dressGarden } from "./gardens.js";

export const industry = {
  fish: "魚屋",
  cafe: "喫茶店",
  grocery: "食料品店",
  furniture: "家具屋",
  clothes: "服屋",
  egg: "明石焼・玉子焼",
  office: "町役場",
  depot: "港の集荷場",
};
export function buildDistrict(world, state, optimize) {
  const g = new THREE.Group(),
    season = stateSeason(state),
    rng = random(19022),
    trees = [],
    lights = [];
  const { road } = terrain(g, season);
  const ocean = seaAndMountains(g);
  function potted(x, z, size = 1) {
    const y = groundHeight(x, z);
    mesh(
      g,
      new THREE.CylinderGeometry(0.28 * size, 0.2 * size, 0.42 * size, 10),
      surface("ceramic", "#a17752"),
      x,
      y + 0.21 * size,
      z,
    );
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4;
      const leaf = mesh(
        g,
        new THREE.SphereGeometry(0.17 * size, 6, 4),
        surface("leaf", "#637c4c"),
        x + Math.sin(a) * 0.17 * size,
        y + (0.5 + (k % 3) * 0.09) * size,
        z + Math.cos(a) * 0.17 * size,
      );
      leaf.scale.set(0.7, 1.1, 0.45);
      leaf.rotation.z = Math.sin(a) * 0.6;
    }
  }
  const parcels = [
    ...places.filter((p) => p.w),
    ...dwellings.map((b) => ({ ...b, kind: "residence" })),
  ];
  parcels.forEach((p, i) => {
    const y = groundHeight(p.x, p.z),
      label = industry[p.kind] || "";
    const built = makeBuilding(
      g,
      {
        ...p,
        y,
        floors: p.floors || (p.kind === "home" ? 2 : 1),
        style: p.style || (p.kind === "home" ? "apartment" : "shop"),
        snow: season === "冬",
      },
      { shopLabel: label, seed: i },
    );
    world.obstacle(p.x, p.z, p.w, p.d, built.body);
    if(["home","residence"].includes(p.kind))dressGarden(g,p,i,season);
    // Entrance paths and thin plinths use the same sampled surface as the character.
    const door = doorOf(p);
    if (p.facing)
      road(
        [door.x, door.z],
        [p.facing === "east" ? -3.5 : 3.5, door.z],
        1.55,
        "stone",
        "#c5b79b",
        0.03,
      );
    else
      road(
        [p.x, p.z + p.d / 2 + 0.2],
        [p.x, p.z + p.d / 2 + 2.1],
        1.7,
        "stone",
        "#c5b79b",
        0.03,
      );
    potted(p.x - p.w / 2 - 0.45, p.z + p.d / 2 + 0.3, 0.8);
    potted(p.x + p.w / 2 + 0.45, p.z + p.d / 2 + 0.25, 0.65);
    if (i % 2 === 0)
      bicycle(
        g,
        p.x + p.w / 2 + 0.85,
        groundHeight(p.x + p.w / 2 + 0.85, p.z),
        p.z,
        Math.PI / 2,
      );
    if (p.kind !== "residence")
      world.targets.push({
        type: "door",
        id: p.id,
        name: label || p.name,
        x: p.x,
        z: p.z + p.d / 2 + 0.8,
      });

    if (p.kind === "fish") {
      fishDisplay(g, p.x + p.w * 0.3, y, p.z + p.d / 2 + 0.65);
      const octopus = mesh(
        g,
        new THREE.SphereGeometry(0.17, 10, 6),
        surface("fish", "#936b5c"),
        p.x - p.w * 0.32,
        y + 0.84,
        p.z + p.d / 2 + 0.7,
      );
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        rod(
          g,
          [octopus.position.x, y + 0.8, octopus.position.z],
          [
            octopus.position.x + Math.sin(a) * 0.3,
            y + 0.74,
            octopus.position.z + Math.cos(a) * 0.3,
          ],
          0.035,
          surface("fish", "#916b5d"),
        );
      }
      block(
        g,
        p.x - p.w * 0.32,
        y + 0.61,
        p.z + p.d / 2 + 0.65,
        1.4,
        0.18,
        1,
        surface("wood", "#a4aa95"),
      );
    }
    if (p.kind === "grocery")
      for (let j = 0; j < 3; j++) {
        const xx = p.x + p.w * 0.25 + j * 0.65;
        block(
          g,
          xx,
          y + 0.4,
          p.z + p.d / 2 + 0.65,
          0.6,
          0.75,
          0.6,
          surface("wood", "#a08a65"),
        );
        for (let k = 0; k < 5; k++) {
          const v = mesh(
            g,
            new THREE.SphereGeometry(0.09, 7, 5),
            surface("produce", ["#b2a776", "#b38443", "#7f914f"][j]),
            xx + ((k % 3) - 1) * 0.14,
            y + 0.85 + Math.floor(k / 3) * 0.06,
            p.z + p.d / 2 + 0.6 + (k % 2) * 0.14,
          );
          if (j === 0) v.scale.set(0.6, 1.7, 0.6);
        }
      }
    if (p.kind === "cafe") {
      for (const x of [p.x - 2.4, p.x + 2.4]) {
        block(
          g,
          x,
          y + 0.75,
          p.z + p.d / 2 + 2.7,
          1,
          0.09,
          1,
          surface("wood", "#a28c66"),
        );
        rod(
          g,
          [x, y, p.z + p.d / 2 + 2.7],
          [x, y + 0.75, p.z + p.d / 2 + 2.7],
          0.07,
          surface("metal", "#617064"),
        );
        for (const side of [-1, 1]) {
          block(
            g,
            x + side * 0.8,
            y + 0.43,
            p.z + p.d / 2 + 2.7,
            0.48,
            0.08,
            0.48,
            surface("wood", "#8f7959"),
          );
          block(
            g,
            x + side * 0.8,
            y + 0.72,
            p.z + p.d / 2 + 2.5,
            0.48,
            0.56,
            0.06,
            surface("wood", "#8f7959"),
          );
        }
      }
      placard(
        g,
        "海辺の喫茶",
        p.x + p.w * 0.35,
        y + 0.8,
        p.z + p.d / 2 + 1.1,
        1.3,
        "#d2c6aa",
      );
    }
    // Separate unlit/emissive window overlay, varied per household in the evening.
    const panes = new THREE.Group();
    panes.position.set(p.x, y, p.z);
    panes.rotation.y=p.facing==="east"?Math.PI/2:p.facing==="west"?-Math.PI/2:0;
    const frontWidth=p.facing?p.d:p.w,frontDepth=p.facing?p.w:p.d;
    world.root.add(panes);
    const glow = new THREE.MeshBasicMaterial({
      color: "#edb778",
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    for (const xx of [-frontWidth * 0.3, frontWidth * 0.3])
      mesh(
        panes,
        new THREE.PlaneGeometry(frontWidth * 0.2, 1.22),
        glow,
        xx,
        1.65,
        frontDepth / 2 + 0.18,
      ).castShadow = false;
    lights.push({ mesh: panes, offset: i % 7 });
  });
  for (const d of destinations) {
    const y = groundHeight(d.x, d.z);
    block(
      g,
      d.x + 0.75,
      y + 1.15,
      d.z - 0.28,
      0.18,
      0.3,
      0.11,
      surface("metal", "#777e6f"),
    );
    world.targets.push({
      type: "delivery",
      id: d.id,
      name: d.name,
      x: d.x,
      z: d.z,
    });
  }
  // A continuous public way, with verges and branches rather than evenly spaced balls.
  const wanted = [
    [-7, -47, 1.25],
    [7, -43, 1.1],
    [-18, -1, 1],
    [-36, -18, 1.1],
    [-48, -16, 1.25],
    [-67, 21, 1.2],
    [5, 37, 0.9],
    [43, 39, 1.1],
    [-28, 17, 1],
    [-39, 5, 1.1],
    [47, -46, 1.3],
    [52, -55, 1.1],
    [38, -60, 1.2],
    [-67, -59, 1.2],
    [23, 25, 1],
    [-40, -56, 1.3],
  ];
  for (const t of wanted)
    if (
      !parcels.some(
        (b) =>
          Math.abs(b.x - t[0]) < b.w / 2 + 1 &&
          Math.abs(b.z - t[1]) < b.d / 2 + 1,
      )
    )
      trees.push(t);
  vegetation(g, trees, season);
  for (const [x, z] of [
    [45, -51],
    [-17, 43],
    [-45, 42],
  ]) {
    const y = groundHeight(x, z);
    block(g, x, y + 0.48, z, 2.1, 0.12, 0.55, surface("wood", "#a7987c"));
    block(g, x, y + 0.8, z - 0.24, 2.1, 0.55, 0.09, surface("wood", "#a7987c"));
    for (const side of [-1, 1])
      block(
        g,
        x + side * 0.8,
        y + 0.22,
        z,
        0.08,
        0.48,
        0.46,
        surface("metal", "#535f55"),
      );
    world.targets.push({
      type: "bench",
      id: "bench" + x,
      name: "ベンチで休む",
      x,
      z: z + 0.65,
    });
  }
  // Pole-mounted warm luminaires, visible at night without dozens of costly point lights.
  for (const [x, z] of [
    [-4.8, 38],
    [4.8, 21],
    [-4.8, 3],
    [4.8, -16],
    [-4.8, -38],
    [-38, -17],
    [-58, -18],
    [43, -49],
  ]) {
    const y = groundHeight(x, z);
    rod(g, [x, y, z], [x, y + 4.4, z], 0.047, surface("metal", "#5b6659"));
    block(g, x, y + 4.4, z, 0.48, 0.14, 0.38, surface("metal", "#4b5c53"));
    const bulb = mesh(
      g,
      new THREE.SphereGeometry(0.16, 8, 5),
      new THREE.MeshBasicMaterial({ color: "#ffe1a1" }),
      x,
      y + 4.23,
      z,
    );
    bulb.userData.keep = true;
    lights.push({ mesh: bulb, offset: 0, lamp: true });
    const pool = mesh(
      g,
      new THREE.CircleGeometry(2.2, 24),
      new THREE.MeshBasicMaterial({
        color: "#eac783",
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
      }),
      x,
      y + 0.08,
      z,
    );
    pool.rotation.x = -Math.PI / 2;
    pool.userData.keep = true;
    lights.push({ mesh: pool, offset: 0, lamp: true });
  }
  placard(g, "仕事と町の案内", 8, groundHeight(8, -51) + 1.6, -50.8, 2.2);
  block(
    g,
    8,
    groundHeight(8, -51) + 1.4,
    -51,
    2.5,
    1.9,
    0.2,
    surface("wood", "#a69373"),
  );
  world.targets.push({
    type: "board",
    id: "station_board",
    name: "仕事の掲示板",
    x: 8,
    z: -50,
  });
  const station = makeBuilding(
    g,
    {
      x: 0,
      z: -70,
      y: groundHeight(0, -70),
      w: 27,
      d: 6,
      floors: 1,
      style: "shop",
    },
    { shopLabel: "汐待駅", seed: 3 },
  );
  world.obstacle(0, -70, 27, 6, station.body);
  // Drainage and stone retaining walls create edges without blocking the street openings.
  for (const x of [-4.4, 4.4])
    for (const z of [-31, -12]) world.obstacle(x, z, 0.3, 7);
  for (let k = 0; k < 19; k++) {
    const z = -24 - k * 0.76,
      y = groundHeight(-18, z);
    block(g, -18, y - 0.08, z, 2.1, 0.16, 0.76, surface("stone", "#bbb59c"));
  }
  // Utility poles and catenary service wires are original geometry, not a copied city asset.
  const poles = [
    [-5.6, 35],
    [5.5, 13],
    [-5.5, -8],
    [5.5, -33],
    [-44, -17],
  ];
  for (let i = 0; i < poles.length; i++) {
    const [x, z] = poles[i],
      y = groundHeight(x, z),
      metal = surface("metal", "#6d7569");
    rod(
      g,
      [x, y, z],
      [x, y + 7.3, z],
      0.13,
      surface("concrete", "#b0afa2"),
      0.09,
    );
    rod(g, [x - 0.85, y + 6.6, z], [x + 0.85, y + 6.6, z], 0.05, metal);
    for (const dx of [-0.6, 0, 0.6])
      mesh(
        g,
        new THREE.CylinderGeometry(0.065, 0.065, 0.18, 8),
        surface("ceramic", "#c1c7b5"),
        x + dx,
        y + 6.7,
        z,
      );
    if (i % 2 === 0)
      mesh(
        g,
        new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12),
        metal,
        x + 0.3,
        y + 5.6,
        z,
      );
    if (i > 0) {
      const [px, pz] = poles[i - 1],
        py = groundHeight(px, pz) + 6.8;
      for (const shift of [-0.4, 0, 0.4]) {
        const points = [];
        for (let n = 0; n <= 18; n++) {
          const t = n / 18;
          points.push(
            new THREE.Vector3(
              px + shift + (x - px) * t,
              py + (y + 6.8 - py) * t - Math.sin(t * Math.PI) * 0.5,
              pz + (z - pz) * t,
            ),
          );
        }
        const line = new THREE.CatmullRomCurve3(points);
        mesh(
          g,
          new THREE.TubeGeometry(line, 24, 0.012, 3, false),
          surface("wire", "#414942"),
        ).castShadow = false;
      }
    }
  }
  world.root.add(optimize(g));
  for (const [i, p] of residents.entries()) {
    const outfit =
      i % 15 === 8
        ? "kimono"
        : i % 19 === 11
          ? "harajuku"
          : i % 23 === 15
            ? "samurai"
            : i % 29 === 19
              ? "ninja"
              : null;
    const model = person(
      {
        ...p.style,
        variant: i,
        work: !!p.workplace,
        outfit,
        coat: season === "秋" || season === "冬",
      },
      {},
      season,
    );
    world.dynamic.add(model);
    world.npcs.push({ data: p, mesh: model });
  }
  return { lights, ocean, season };
}
export function stateSeason(s) {
  const day = Math.floor(s.clock / 1440) % 365;
  return day < 59
    ? "冬"
    : day < 151
      ? "春"
      : day < 243
        ? "夏"
        : day < 334
          ? "秋"
          : "冬";
}
