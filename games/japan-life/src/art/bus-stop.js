import * as THREE from 'three';
import {surface, block, mesh, rod} from './materials.js';
import {groundHeight} from './height.js';
import {placard} from './buildings.js';
import {busStop} from './town-plan.js';

// Original procedural shelter: weathered timber, faded sheet-metal gable and a long bench.
export function busShelter(g, world, road) {
  const {x,z,w,d,name}=busStop,y=groundHeight(x,z);
  const wood=surface('wood','#8c785d'),dark=surface('wood','#615b4b');
  const tin=surface('metal','#64847c',{roughness:.88}),rust=surface('metal','#947252');
  road([x-w/2,z],[x+w/2,z],d,'concrete','#b4b2a1',.1);
  // Side and back panels leave the entire street-facing entrance open.
  for(let i=0;i<18;i++){
    const xx=x-w/2+.16+i*.31;
    block(g,xx,y+1.05,z-d/2+.1,.29,1.9,.12,i%4===0?dark:wood);
  }
  for(const side of [-1,1]){
    for(const zz of [z-d/2+.1,z+d/2-.15]){
      const foot=groundHeight(x+side*(w/2-.08),zz);
      block(g,x+side*(w/2-.08),foot+.12,zz,.26,.24,.26,surface('stone','#888d80'));
      block(g,x+side*(w/2-.08),y+1.24,zz,.16,2.48,.16,dark);
    }
    for(let i=0;i<7;i++)block(g,x+side*(w/2-.08),y+.65,z-d/2+.3+i*.28,.12,1.05,.26,wood);
    rod(g,[x+side*(w/2-.08),y+2.4,z-d/2+.1],[x+side*(w/2-.08),y+1.8,z-.7],.045,dark);
  }
  for(const zz of [z-d/2+.1,z+d/2-.15])block(g,x,y+2.42,zz,w,.16,.16,dark);
  // A shallow gable across the depth with visible raised seams and rust at the eaves.
  for(const side of [-1,1]){
    const roof=block(g,x,y+2.7,z+side*.9,w+.5,.1,1.95,tin);
    roof.rotation.x=side*.19;
    for(let xx=x-w/2-.1;xx<x+w/2+.2;xx+=.24)
      rod(g,[xx,y+2.89,z],[xx,y+2.53,z+side*1.87],.018,tin);
    block(g,x,y+2.53,z+side*1.86,w+.5,.12,.08,rust);
  }
  block(g,x,y+2.9,z,w+.5,.08,.13,tin);
  const seatX=x-.6,seatZ=z-.8;
  for(const zz of [-.18,0,.18])block(g,seatX,y+.52,seatZ+zz,3.9,.09,.16,wood);
  for(const yy of [.82,1.04])block(g,seatX,y+yy,seatZ-.28,3.9,.15,.09,wood);
  for(const xx of [seatX-1.5,seatX+1.5]){
    block(g,xx,y+.27,seatZ,.12,.48,.5,dark);
    block(g,xx,y+.8,seatZ-.3,.1,.6,.1,dark);
  }
  placard(g,name,x,y+2.08,z-d/2+.18,2.2,'#e1d9b9');
  block(g,x+1.95,y+1.3,z-d/2+.23,.75,.98,.07,tin);
  placard(g,'駅前ゆき',x+1.95,y+1.52,z-d/2+.28,.65,'#eee9d6');
  for(let i=0;i<5;i++)block(g,x+1.95,y+1.31-i*.095,z-d/2+.28,.55,.025,.02,dark);
  // Bus-stop lollipop, safely beside the walking surface, rather than in its centre.
  const sx=x+4.1,sz=38.25,sy=groundHeight(sx,sz);
  block(g,sx,sy+.1,sz,.5,.2,.5,surface('concrete','#b5b4a4'));
  rod(g,[sx,sy,sz],[sx,sy+2.6,sz],.045,tin);
  mesh(g,new THREE.CircleGeometry(.43,24),surface('sign','#42685e'),sx,sy+2.35,sz+.015);
  mesh(g,new THREE.CircleGeometry(.37,24),surface('sign','#e0d4ae'),sx,sy+2.35,sz+.025);
  const busName=placard(g,'バス',sx,sy+2.36,sz+.04,.65,'#e0d4ae');
  busName.scale.y=2.4;
  placard(g,name,sx,sy+1.65,sz+.04,1.05,'#d2d7c5');
  world.targets.push({type:'bench',id:busStop.id,name:'バス停の長椅子で休む',x:seatX,z:z+.7});
}
