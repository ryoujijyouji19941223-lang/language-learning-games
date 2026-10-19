import {placard} from './buildings.js';
import { townWays, vehicleWays, sidewalks, crossings, coastRails, segmentDistance } from './town-plan.js';
import * as THREE from "three";
import { surface, mesh, block, projectUV, rod } from "./materials.js";
import { groundHeight } from "./height.js";
import { random } from "./vegetation.js";
export function terrain(g, season) {
  const geo = new THREE.PlaneGeometry(480, 147, 320, 130);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -5.5);
  const p = geo.attributes.position,
    colors = [],
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    p.setY(i, groundHeight(x, z));
    const n =
      Math.sin(x * 0.31 + z * 0.17) * 0.035 +
      Math.sin(x * 0.13 - z * 0.27) * 0.025;
    c.set(
      season === "冬"
        ? "#eef0e9"
        : season === "秋"
          ? "#d9d5b4"
          : season === "春"
            ? "#d4dfb6"
            : "#c3d69e",
    );
    c.multiplyScalar(1 + n);
    colors.push(c.r, c.g, c.b);
  }
  geo.computeVertexNormals();
  projectUV(geo, 3.6);
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const land = mesh(
    g,
    geo,
    surface(season === "冬" ? "snow" : "grass", "#ffffff", {
      vertexColors: true,
    }),
  );
  land.userData.keep = true;
  land.castShadow = false;
  function road(
    a,
    b,
    width,
    type = "asphalt",
    tint = "#ffffff",
    height = 0.045,
  ) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
      steps = Math.ceil(length / 1.5),
      dx = (b[0] - a[0]) / length,
      dz = (b[1] - a[1]) / length,
      vertices = [],
      uv = [];
    for (let i = 0; i < steps; i++)
      for (const [t, side] of [
        [i, -1],
        [i, 1],
        [i + 1, -1],
        [i, 1],
        [i + 1, 1],
        [i + 1, -1],
      ]) {
        const d = (t / steps) * length,
          x = a[0] + dx * d - ((dz * width) / 2) * side,
          z = a[1] + dz * d + ((dx * width) / 2) * side;
        vertices.push(x, groundHeight(x, z) + height, z);
        uv.push(d / 2, (side * width) / 4);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const m = mesh(g, geometry, surface(type, tint));
    m.castShadow = false;
    return m;
  }
  for(const way of townWays){
    road(way.a,way.b,way.width,way.kind==='pedestrian'?'stone':'asphalt',way.kind==='pedestrian'?'#d0c5ae':'#868b82');
    if(way.kind==='pedestrian')for(const side of [-1,1])road([way.a[0],way.a[1]+side*(way.width/2-.25)],[way.b[0],way.b[1]+side*(way.width/2-.25)],.12,'brick','#9e8e71',.075);
  }
  for(const p of sidewalks)road(p.a,p.b,p.width,'concrete','#c9c6b5',.09);
  const atJunction=(x,z,own)=>vehicleWays.some(r=>r!==own&&segmentDistance(x,z,r.a,r.b)<r.width/2+.6);
  for(const way of vehicleWays.filter(r=>r.kind==='road')){
    const vertical=way.a[0]===way.b[0],len=Math.hypot(way.b[0]-way.a[0],way.b[1]-way.a[1]);
    const at=t=>[way.a[0]+(vertical?0:t),way.a[1]+(vertical?t:0)];
    for(let t=2;t<len-2;t+=5){
      const a=at(t),b=at(t+2);
      if(atJunction(...a,way)||atJunction(...b,way)||crossings.some(c=>c.road===way.id&&Math.hypot(c.x-a[0],c.z-a[1])<3))continue;
      road(a,b,.1,'paint','#eee9d8',.072);
    }
    // Low curb/drain edge, omitted at junctions and lowered at actual zebra crossings.
    for(const side of [-1,1])for(let t=0;t<len;t+=1.4){
      const a=at(t+.04),b=at(Math.min(t+1.3,len));
      a[vertical?0:1]+=side*(way.width/2+.015);b[vertical?0:1]+=side*(way.width/2+.015);
      if(atJunction(...a,way)||atJunction(...b,way))continue;
      const crossing=crossings.some(c=>c.road===way.id&&Math.hypot(c.x-a[0],c.z-a[1])<way.width/2+1.5);
      road(a,b,.12,'concrete','#acafa3',crossing?.065:.14);
    }
  }
  // White ladder bars only span the carriageway, perpendicular to vehicle travel.
  for(const c of crossings){
    const r=vehicleWays.find(r=>r.id===c.road),vertical=r.a[0]===r.b[0];
    for(let t=-r.width/2+.4;t<r.width/2-.2;t+=.8){
      const a=vertical?[c.x+t,c.z-c.width/2]:[c.x-c.width/2,c.z+t];
      const b=vertical?[c.x+t,c.z+c.width/2]:[c.x+c.width/2,c.z+t];
      road(a,b,.43,'paint','#eeeadd',.08);
    }
  }
  for(const x of [8,65])for(const z of [-20,-1.5]){
    rod(g,[x,groundHeight(x,z),z],[x,groundHeight(x,z)+2.6,z],.04,surface('metal','#767e73'));
    const sign=mesh(g,new THREE.CircleGeometry(.33,20),surface('sign','#3c7087'),x,groundHeight(x,z)+2.4,z);sign.userData.keep=true;
    const white=surface('paint','#eeeadd'),sy=groundHeight(x,z);
    mesh(g,new THREE.SphereGeometry(.055,8,5),white,x,sy+2.55,z+.035);
    block(g,x,sy+2.41,z+.035,.07,.18,.025,white);
    for(const side of [-1,1]){
      rod(g,[x,sy+2.46,z+.04],[x+side*.13,sy+2.37,z+.04],.016,white);
      rod(g,[x,sy+2.33,z+.04],[x+side*.1,sy+2.2,z+.04],.018,white);
    }
    placard(g,'歩行者専用',x,sy+1.85,z+.04,1.35,'#ede9da');
  }
  road([-21, 48], [15, 48], 5, "sand", "#d5c4a1", 0.05);
  return { road };
}
export function seaAndMountains(g) {
  const seaGeo = new THREE.PlaneGeometry(700, 440, 70, 44);
  seaGeo.rotateX(-Math.PI / 2);
  seaGeo.translate(0, 0, 286);
  const seaMat = new THREE.MeshStandardMaterial({
    color: "#386f76",
    roughness: 0.27,
    metalness: 0.28,
  });
  const time = { value: 0 };
  seaMat.onBeforeCompile = (shader) => {
    shader.uniforms.uShiomachiTime = time;
    shader.vertexShader =
      "uniform float uShiomachiTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.y += sin(position.x*.18 + uShiomachiTime*.7)*.055 + sin(position.z*.31+position.x*.09+uShiomachiTime*.5)*.035;",
      );
  };
  const water = mesh(g, seaGeo, seaMat);
  water.userData.keep = true;
  water.castShadow = false;
  const rng = random(189);
  for (let layer = 0; layer < 3; layer++) {
    const positions = [],
      indices = [],
      count = 60;
    for (let i = 0; i <= count; i++) {
      const x = -340 + (i * 680) / count,
        y =
          22 +
          Math.sin(i * 0.43 + layer) * 14 +
          Math.sin(i * 0.91) * 7 +
          Math.sin(i * 0.17) * 13 +
          layer * 7,
        z = -115 - layer * 65;
      positions.push(x, -5, z, x, y, z);
      if (i < count) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();
    projectUV(geo, 15);
    mesh(
      g,
      geo,
      surface("soil", ["#5d756e", "#748b84", "#8e9f99"][layer], {
        side: THREE.DoubleSide,
      }),
    ).castShadow = false;
  }
  // Harbour quay ends at a beach opening, with timber mooring posts and small boats.
  for(const f of coastRails){
    const a=f.x-f.w/2,b=f.x+f.w/2;
    for(let x=a;x<b;x+=1.5){
      const end=Math.min(x+1.5,b),y=groundHeight((x+end)/2,f.z);
      block(g,(x+end)/2,y-.42,48,end-x,.84,.8,surface('stone','#8b9285'));
    }
    for(let x=a;x<=b;x+=2){
      const end=Math.min(x+2,b),y=groundHeight(x,f.z),ey=groundHeight(end,f.z);
      rod(g,[x,y,f.z],[x,y+1.05,f.z],.045,surface('metal','#63746b'));
      for(const h of [.48,1.02])rod(g,[x,y+h,f.z],[end,ey+h,f.z],.035,surface('metal','#63746b'));
    }
  }
  for (let i = 0; i < 3; i++) {
    const boat = new THREE.Group();
    boat.position.set(-42 + i * 48, 0.12, 74 + i * 9);
    boat.rotation.y = 0.3 - i * 0.4;
    g.add(boat);
    const hull = new THREE.Shape();
    hull.moveTo(-0.85, -2.7);
    hull.lineTo(0.85, -2.7);
    hull.quadraticCurveTo(1.5, 0.8, 0, 3.2);
    hull.quadraticCurveTo(-1.5, 0.8, -0.85, -2.7);
    const hullMesh = mesh(
      boat,
      new THREE.ExtrudeGeometry(hull, {
        depth: 0.65,
        bevelEnabled: true,
        bevelSize: 0.08,
        bevelThickness: 0.08,
        bevelSegments: 1,
      }),
      surface("metal", "#d6d8c8"),
    );
    hullMesh.rotation.x = Math.PI / 2;
    block(boat, 0, 0.4, -0.8, 1.25, 1.0, 1.5, surface("wood", "#718a85"));
    block(boat, 0, 0.95, -0.8, 1.45, 0.12, 1.7, surface("metal", "#e1ddcb"));
    rod(boat, [0, 0.3, -1], [0, 3.5, -1], 0.035, surface("metal", "#727e72"));
  }
  return { water, time };
}
