import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {surface,mesh,block} from './materials.js';

export function person(style={},wear={},season='秋') {
  const g=new THREE.Group(),rig=new THREE.Group();g.add(rig);
  const n=style.variant||0,height=style.height||1.7,wide=(style.body||.95)*.95;
  const skin=surface('skin',['#d5af91','#bd9072','#e3c5a9','#ad8065'][n%4],{roughness:.83});
  const hair=surface('hair',style.hair||'#38312a',{roughness:.92});
  const top=surface('cloth',wear.top?.color||style.shirt||'#777d62',{roughness:.94}),bottom=surface('cloth',wear.bottom?.color||'#4e5552',{roughness:.94}),shoe=surface('leather',wear.shoes?.color||'#514838',{roughness:.62});
  const torso=mesh(rig,new THREE.CapsuleGeometry(.195,.32,4,8),top,0,1.03,0);torso.scale.set(wide,1,.66);
  const hips=mesh(rig,new THREE.SphereGeometry(.19,10,8),bottom,0,.74,0);hips.scale.set(wide,.65,.68);
  const neck=mesh(rig,new THREE.CylinderGeometry(.065,.075,.14,8),skin,0,1.37,0);
  const head=mesh(rig,new THREE.SphereGeometry(.18,16,12),skin,0,1.57,.005);head.scale.set(.83+(n%3)*.06,1.14-(n%2)*.07,.91);
  const cap=mesh(rig,new THREE.SphereGeometry(.184,14,10,0,Math.PI*2,0,Math.PI*.43),hair,0,1.6,-.01);cap.scale.set(1,1,.99);
  // Hair silhouette, side fringe, tied hair, eyebrows, irises, nose and mouth.
  for(const side of [-1,1]) {
    const fringe=mesh(rig,new THREE.SphereGeometry(.062,8,6),hair,side*.135,1.59,-.005);fringe.scale.set(.7,1.5+(n%3)*.3,.8);
    const eye=mesh(rig,new THREE.SphereGeometry(.023,8,5),surface('eye','#f2e9d9'),side*.062,1.59,.176);eye.scale.set(1,.62,.35);
    mesh(rig,new THREE.SphereGeometry(.011,7,5),surface('eye','#292e29'),side*.062,1.588,.185);
    const brow=block(rig,side*.063,1.627,.17,.052,.012,.012,hair);brow.rotation.z=side*(.05+(n%3)*.07);
    mesh(rig,new THREE.SphereGeometry(.03,7,5),skin,side*.158,1.56,-.005);
  }
  mesh(rig,new THREE.SphereGeometry(.026,8,6),skin,0,1.553,.169).scale.set(.6,.9,1.1);
  block(rig,0,1.507,.172,.045,.008,.013,surface('skin','#976857'));
  if(n%4===1) {const pony=mesh(rig,new THREE.CapsuleGeometry(.065,.2,3,8),hair,0,1.49,-.17);pony.rotation.x=.18;}
  if(n%4===2)mesh(rig,new THREE.SphereGeometry(.08,10,7),hair,0,1.78,-.09);
  if(n%5===3) {
    for(const side of [-1,1]){const glass=mesh(rig,new THREE.TorusGeometry(.041,.005,5,14),surface('metal','#625d4d'),side*.062,1.589,.195);glass.scale.y=.8;}
    block(rig,0,1.59,.195,.04,.007,.007,surface('metal','#625d4d'));
  }
  const coat=wear.top?.id==='c03'||style.coat||(!wear.top&&(season==='秋'||season==='冬'));
  if(coat) {
    const lower=mesh(rig,new THREE.CylinderGeometry(.205,.245,.38,10),top,0,.79,0);lower.scale.z=.68;
    for(const side of [-1,1]) {const lapel=block(rig,side*.066,1.18,.15,.095,.22,.025,surface('cloth',style.accent||'#a99d80'));lapel.rotation.z=-side*.2;}
    for(let i=0;i<3;i++)mesh(rig,new THREE.SphereGeometry(.012,6,4),surface('metal','#b8af96'),0,.88+i*.11,.165);
  }
  if(style.work) {block(rig,0,1.03,.15,.28,.4,.035,surface('cloth','#d4c6a1'));block(rig,0,.77,.16,.32,.21,.04,surface('cloth','#c5bb9f'));}
  if(style.outfit==='kimono'||style.outfit==='samurai') {
    const robe=mesh(rig,new THREE.CylinderGeometry(.19,.25,.62,10),surface('cloth',style.outfit==='kimono'?'#704d67':'#425761'),0,.58,0);robe.scale.z=.7;
    block(rig,0,.98,.14,.38,.12,.07,surface('cloth','#c3ab73'));
  }
  if(style.outfit==='harajuku') {
    block(rig,0,1.03,.17,.16,.32,.04,surface('cloth','#d0a0a7'));mesh(rig,new THREE.SphereGeometry(.06,8,5),surface('cloth','#cda87b'),.18,1.68,.02);
  }
  const legs=[],arms=[],knees=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group();leg.position.set(side*.105,.75,0);rig.add(leg);legs.push(leg);
    mesh(leg,new THREE.CapsuleGeometry(.074,.22,3,8),bottom,0,-.18,0);
    const knee=new THREE.Group();knee.position.y=-.35;leg.add(knee);knees.push(knee);
    mesh(knee,new THREE.CapsuleGeometry(.06,.22,3,8),bottom,0,-.17,0);
    const foot=mesh(knee,new THREE.CapsuleGeometry(.075,.13,3,8),shoe,0,-.33,.055);foot.rotation.x=Math.PI/2;foot.scale.y=1.15;
    const arm=new THREE.Group();arm.position.set(side*.228,1.24,0);rig.add(arm);arms.push(arm);
    mesh(arm,new THREE.CapsuleGeometry(.062,.2,3,8),top,side*.015,-.17,0);
    mesh(arm,new THREE.CapsuleGeometry(.049,.12,3,8),top,side*.02,-.38,.025);
    mesh(arm,new THREE.SphereGeometry(.049,8,6),skin,side*.02,-.49,.04);
  }
  if(wear.bottom?.shape==='skirt') {const skirt=mesh(rig,new THREE.CylinderGeometry(.17,.29,.42,12),bottom,0,.63,0);skirt.scale.z=.85;}
  if(season==='冬'&&style.variant!==undefined) {block(rig,0,1.3,.04,.37,.12,.34,surface('cloth',style.accent||'#a9a18c'));block(rig,.08,1.14,.19,.1,.3,.025,surface('cloth',style.accent||'#a9a18c'));}
  g.scale.setScalar(height/1.78);
  const groups=[];g.traverse(o=>{if(o.isGroup)groups.push(o);});
  for(const group of groups.reverse()) {
    const materials=new Map();for(const o of [...group.children])if(o.isMesh){if(!materials.has(o.material))materials.set(o.material,[]);materials.get(o.material).push(o);}
    for(const [material,items] of materials)if(items.length>1){const geos=items.map(o=>{o.updateMatrix();const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);return geo;});const geo=mergeGeometries(geos);if(geo){const merged=new THREE.Mesh(geo,material);merged.castShadow=true;merged.receiveShadow=true;group.add(merged);for(const o of items){group.remove(o);o.geometry.dispose();}}geos.forEach(g=>g.dispose());}
  }
  g.userData.rig={body:rig,legs,arms,knees,phase:0,moving:false};return g;
}
export function posePerson(g,distance,running,dt) {
  const r=g.userData.rig;if(!r)return;
  const moving=distance>.0005;r.moving=moving;
  if(moving)r.phase+=distance*(running?7.6:10.0);
  const amount=moving?(running?.86:.43):0, ease=Math.min(1,dt*15);
  for(let i=0;i<2;i++) {
    const a=Math.sin(r.phase+i*Math.PI)*amount;
    r.legs[i].rotation.x+=(a-r.legs[i].rotation.x)*ease;
    r.arms[i].rotation.x+=(-a*.8-r.arms[i].rotation.x)*ease;
    r.knees[i].rotation.x+=(Math.max(0,-a)*.8-r.knees[i].rotation.x)*ease;
  }
  r.body.position.y=moving?Math.abs(Math.sin(r.phase))*(running?.035:.016):0;
  const lean=moving&&running?.09:0;r.body.rotation.x+=(lean-r.body.rotation.x)*ease;
}
