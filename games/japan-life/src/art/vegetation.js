import { treeAppearance } from './tree-season.js';
import * as THREE from "three";
import { surface, rod, mesh } from "./materials.js";
import { groundHeight } from "./height.js";
export function random(seed = 1) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const leafShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.12);
  s.lineTo(-0.065, -0.035);
  s.lineTo(-0.11, 0.03);
  s.lineTo(-0.045, 0.026);
  s.lineTo(-0.06, 0.1);
  s.lineTo(-0.018, 0.065);
  s.lineTo(0, 0.145);
  s.lineTo(0.025, 0.065);
  s.lineTo(0.065, 0.1);
  s.lineTo(0.048, 0.025);
  s.lineTo(0.11, 0.03);
  s.lineTo(0.065, -0.035);
  s.closePath();
  return new THREE.ShapeGeometry(s);
};
export function vegetation(g, trees, season) {
  const rng = random(8791),
    instances = [],
    cherryLeaves = [],
    blossoms = [],
    fallen = [],
    grass = [];
  let treeIndex=0;
  for (const [x,z,size=1,species=treeIndex%3===0?'cherry':'maple'] of trees){
    const look=treeAppearance(season,species),colors=look.colors;
    const dominant=colors[treeIndex++%Math.max(1,colors.length)];
    const items=look.kind==='blossom'?blossoms:species==='cherry'?cherryLeaves:instances;
    const y = groundHeight(x, z),
      h = 3.8 * size;
    rod(
      g,
      [x, y, z],
      [x + 0.12, y + h, z - 0.08],
      0.2 * size,
      surface("wood", "#8e8069"),
      0.075 * size,
    );
    for (let k = 0; k < 7; k++) {
      const a = k * 2.399,
        tip = [
          x + Math.sin(a) * 1.7 * size,
          y + (3.0 + rng() * 1.9) * size,
          z + Math.cos(a) * 1.65 * size,
        ];
      rod(
        g,
        [x + 0.06, y + h * (0.55 + rng() * 0.2), z],
        tip,
        0.072 * size,
        surface("wood", "#81725e"),
        0.018 * size,
      );
      if (season !== "冬")
        for (let i = 0; i < 95; i++) {
          const az = rng() * Math.PI * 2,
            r = Math.sqrt(rng()) * 1.05 * size;
          items.push({
            x: tip[0] + Math.sin(az) * r,
            y: tip[1] + (rng() - 0.5) * 1.7 * size,
            z: tip[2] + Math.cos(az) * r,
            rx: rng() * 3,
            ry: rng() * 6,
            rz: rng() * 6,
            scale: (0.55 + rng() * 0.6) * size,
            color:
              rng() > 0.15
                ? dominant
                : colors[Math.floor(rng() * colors.length)],
          });
        }
    }
    if (season === "秋")
      for (let i = 0; i < 65; i++) {
        const dx = (rng() - 0.5) * 6 * size,
          dz = (rng() - 0.5) * 6 * size;
        fallen.push({
          x: x + dx,
          y: groundHeight(x + dx, z + dz) + 0.036,
          z: z + dz,
          rx: -Math.PI / 2,
          ry: 0,
          rz: rng() * 6,
          scale: 0.5 + rng() * 0.6,
          color:
            rng() > 0.15 ? dominant : colors[Math.floor(rng() * colors.length)],
        });
      }
  }
  function instanced(geometry, items, mat, shadows = true) {
    const object = new THREE.InstancedMesh(geometry, mat, items.length),
      dummy = new THREE.Object3D(),
      c = new THREE.Color();
    items.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      dummy.scale.setScalar(p.scale || 1);
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
      if (p.color) object.setColorAt(i, c.set(p.color));
    });
    object.castShadow = shadows;
    object.receiveShadow = true;
    object.userData.keep = true;
    g.add(object);
    return object;
  }
  const leafMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,side:THREE.DoubleSide});
  const oval=new THREE.Shape();oval.moveTo(0,-.12);oval.quadraticCurveTo(-.13,.02,0,.16);oval.quadraticCurveTo(.13,.02,0,-.12);
  instanced(new THREE.ShapeGeometry(oval),cherryLeaves,leafMat);
  // Five distinct petals only on spring cherry trees.
  const flower=new THREE.Shape();
  for(let i=0;i<30;i++){
    const a=i/30*Math.PI*2,r=.085*(.8+.22*Math.cos(a*5));
    if(i===0)flower.moveTo(Math.cos(a)*r,Math.sin(a)*r);else flower.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  flower.closePath();instanced(new THREE.ShapeGeometry(flower),blossoms,leafMat);
  const leaves = instanced(
    leafShape(),
    instances,
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
    true,
  );
  instanced(
    leafShape(),
    fallen,
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    false,
  );
  for (let i = 0; i < 1600; i++) {
    const x = (rng() - 0.5) * 143,
      z = -66 + rng() * 110;
    if (trees.every((t) => Math.hypot(t[0] - x, t[1] - z) > 6)) continue;
    grass.push({
      x,
      y: groundHeight(x, z) + 0.12,
      z,
      ry: rng() * 6,
      scale: 0.6 + rng(),
      color:
        season === "冬"
          ? "#c5c6b7"
          : season === "秋"
            ? ["#838452", "#a19a64", "#737d4c"][i % 3]
            : "#819752",
    });
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-0.014, 0, 0, 0, 0.26, 0, 0.012, 0, 0],
      3,
    ),
  );
  blade.computeVertexNormals();
  blade.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 1, 0], 2),
  );
  instanced(
    blade,
    grass,
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    false,
  );
  return leaves;
}
