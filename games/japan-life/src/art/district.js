import * as THREE from 'three';
import {places,residents,destinations} from '../data.js';
import {dwellings} from './layout.js';
import {groundHeight} from './height.js';
import {surface,block,mesh,rod} from './materials.js';
import {makeBuilding,placard,fishDisplay,bicycle} from './buildings.js';
import {terrain,seaAndMountains} from './landscape.js';
import {vegetation,random} from './vegetation.js';
import {person} from './characters.js';

export const industry={fish:'魚屋',cafe:'喫茶店',grocery:'食料品店',furniture:'家具屋',clothes:'服屋',egg:'明石焼・玉子焼',office:'町役場',depot:'港の集荷場'};
export function buildDistrict(world,state,optimize) {
  const g=new THREE.Group(),season=stateSeason(state),rng=random(19022),trees=[],lights=[];
  const {road}=terrain(g,season);const ocean=seaAndMountains(g);
  function potted(x,z,size=1) {
    const y=groundHeight(x,z);mesh(g,new THREE.CylinderGeometry(.28*size,.2*size,.42*size,10),surface('ceramic','#a17752'),x,y+.21*size,z);
    for(let k=0;k<9;k++){const a=k*2.4;const leaf=mesh(g,new THREE.SphereGeometry(.17*size,6,4),surface('leaf','#637c4c'),x+Math.sin(a)*.17*size,y+(.5+(k%3)*.09)*size,z+Math.cos(a)*.17*size);leaf.scale.set(.7,1.1,.45);leaf.rotation.z=Math.sin(a)*.6;}
  }
  const parcels=[...places.filter(p=>p.w),...dwellings.map(b=>({...b,kind:'residence'}))];
  parcels.forEach((p,i)=>{
    const y=groundHeight(p.x,p.z),label=industry[p.kind]||'';
    const built=makeBuilding(g,{...p,y,floors:p.floors||(p.kind==='home'?2:1),style:p.style||(p.kind==='home'?'apartment':'shop')},{shopLabel:label,seed:i});
    world.obstacle(p.x,p.z,p.w,p.d,built.body);
    // Entrance paths and thin plinths use the same sampled surface as the character.
    road([p.x,p.z+p.d/2+.2],[p.x,p.z+p.d/2+2.1],1.7,'stone','#c5b79b',.03);
    potted(p.x-p.w/2-.45,p.z+p.d/2+.3,.8);potted(p.x+p.w/2+.45,p.z+p.d/2+.25,.65);
    if(i%2===0)bicycle(g,p.x+p.w/2+.85,groundHeight(p.x+p.w/2+.85,p.z),p.z,Math.PI/2);
    if(p.kind!=='residence')world.targets.push({type:'door',id:p.id,name:label||p.name,x:p.x,z:p.z+p.d/2+.8});
    else placard(g,p.address,p.x, y+.8,p.z+p.d/2+.31,1.65,'#c8c8b1');
    if(p.kind==='fish') {
      fishDisplay(g,p.x+p.w*.3,y,p.z+p.d/2+.65);
      const octopus=mesh(g,new THREE.SphereGeometry(.17,10,6),surface('fish','#936b5c'),p.x-p.w*.32,y+.84,p.z+p.d/2+.7);
      for(let k=0;k<8;k++){const a=k*Math.PI/4;rod(g,[octopus.position.x,y+.8,octopus.position.z],[octopus.position.x+Math.sin(a)*.3,y+.74,octopus.position.z+Math.cos(a)*.3],.035,surface('fish','#916b5d'));}
      block(g,p.x-p.w*.32,y+.61,p.z+p.d/2+.65,1.4,.18,1,surface('wood','#a4aa95'));
    }
    if(p.kind==='grocery')for(let j=0;j<3;j++) {
      const xx=p.x+p.w*.25+j*.65;block(g,xx,y+.4,p.z+p.d/2+.65,.6,.75,.6,surface('wood','#a08a65'));
      for(let k=0;k<5;k++){const v=mesh(g,new THREE.SphereGeometry(.09,7,5),surface('produce',['#b2a776','#b38443','#7f914f'][j]),xx+(k%3-1)*.14,y+.85+Math.floor(k/3)*.06,p.z+p.d/2+.6+(k%2)*.14);if(j===0)v.scale.set(.6,1.7,.6);}
    }
    if(p.kind==='cafe') {
      for(const x of [p.x-2.4,p.x+2.4]) {block(g,x,y+.75,p.z+p.d/2+2.7,1,.09,1,surface('wood','#a28c66'));rod(g,[x,y,p.z+p.d/2+2.7],[x,y+.75,p.z+p.d/2+2.7],.07,surface('metal','#617064'));
        for(const side of [-1,1]) {block(g,x+side*.8,y+.43,p.z+p.d/2+2.7,.48,.08,.48,surface('wood','#8f7959'));block(g,x+side*.8,y+.72,p.z+p.d/2+2.5,.48,.56,.06,surface('wood','#8f7959'));}
      }
      placard(g,'海辺の喫茶',p.x+p.w*.35,y+.8,p.z+p.d/2+1.1,1.3,'#d2c6aa');
    }
    // Separate unlit/emissive window overlay, varied per household in the evening.
    const panes=new THREE.Group();panes.position.set(p.x,y,p.z);world.root.add(panes);
    const glow=new THREE.MeshBasicMaterial({color:'#edb778',transparent:true,opacity:.6,depthWrite:false});
    for(const xx of [-p.w*.3,p.w*.3])mesh(panes,new THREE.PlaneGeometry(p.w*.20,1.22),glow,xx,1.65,p.d/2+.18).castShadow=false;
    lights.push({mesh:panes,offset:i%7});
  });
  for(const d of destinations) {
    const y=groundHeight(d.x,d.z);
    block(g,d.x+.75,y+1.15,d.z-.28,.18,.3,.11,surface('metal','#777e6f'));
    world.targets.push({type:'delivery',id:d.id,name:d.name,x:d.x,z:d.z});
  }
  // A continuous public way, with verges and branches rather than evenly spaced balls.
  const wanted=[[-7,-47,1.25],[7,-43,1.1],[-18,-1,1],[-36,-18,1.1],[-48,-16,1.25],[-67,21,1.2],[5,37,.9],[43,39,1.1],[-28,17,1],[-39,5,1.1],[47,-46,1.3],[52,-55,1.1],[38,-60,1.2],[-67,-59,1.2],[23,25,1],[-40,-56,1.3]];
  for(const t of wanted) if(!parcels.some(b=>Math.abs(b.x-t[0])<b.w/2+1&&Math.abs(b.z-t[1])<b.d/2+1))trees.push(t);
  vegetation(g,trees,season);
  for(const [x,z] of [[45,-51],[-17,43],[-45,42]]) {
    const y=groundHeight(x,z);block(g,x,y+.48,z,2.1,.12,.55,surface('wood','#a7987c'));block(g,x,y+.8,z-.24,2.1,.55,.09,surface('wood','#a7987c'));
    for(const side of [-1,1])block(g,x+side*.8,y+.22,z,.08,.48,.46,surface('metal','#535f55'));
    world.targets.push({type:'bench',id:'bench'+x,name:'ベンチで休む',x,z:z+.65});
  }
  // Pole-mounted warm luminaires, visible at night without dozens of costly point lights.
  for(const [x,z] of [[-4.8,38],[4.8,21],[-4.8,3],[4.8,-16],[-4.8,-38],[-38,-17],[-58,-18],[43,-49]]) {
    const y=groundHeight(x,z);rod(g,[x,y,z],[x,y+4.4,z],.047,surface('metal','#5b6659'));
    block(g,x,y+4.4,z,.48,.14,.38,surface('metal','#4b5c53'));
    const bulb=mesh(g,new THREE.SphereGeometry(.16,8,5),new THREE.MeshBasicMaterial({color:'#ffe1a1'}),x,y+4.23,z);bulb.userData.keep=true;lights.push({mesh:bulb,offset:0,lamp:true});
    const pool=mesh(g,new THREE.CircleGeometry(2.2,24),new THREE.MeshBasicMaterial({color:'#eac783',transparent:true,opacity:.13,depthWrite:false}),x,y+.08,z);pool.rotation.x=-Math.PI/2;pool.userData.keep=true;lights.push({mesh:pool,offset:0,lamp:true});
  }
  placard(g,'仕事と町の案内',8,groundHeight(8,-51)+1.6,-50.8,2.2);
  block(g,8,groundHeight(8,-51)+1.4,-51,2.5,1.9,.2,surface('wood','#a69373'));
  world.targets.push({type:'board',id:'station_board',name:'仕事の掲示板',x:8,z:-50});
  const station=makeBuilding(g,{x:0,z:-70,y:groundHeight(0,-70),w:27,d:6,floors:1,style:'shop'},{shopLabel:'汐待駅',seed:3});world.obstacle(0,-70,27,6,station.body);
  // Drainage and stone retaining walls create edges without blocking the street openings.
  for(const x of [-4.4,4.4])for(const z of [-31,-12])world.obstacle(x,z,.3,7);
  for(let k=0;k<19;k++){const z=-24-k*.76,y=groundHeight(-18,z);block(g,-18,y-.08,z,2.1,.16,.76,surface('stone','#bbb59c'));}
  world.root.add(optimize(g));
  for(const [i,p] of residents.entries()) {
    const outfit=i%15===8?'kimono':i%19===11?'harajuku':i%23===15?'samurai':i%29===19?'ninja':null;
    const model=person({...p.style,variant:i,work:!!p.workplace,outfit,coat:season==='秋'||season==='冬'},{},season);
    world.dynamic.add(model);world.npcs.push({data:p,mesh:model});
  }
  return {lights,ocean,season};
}
export function stateSeason(s) {
  const day=Math.floor(s.clock/1440)%365;return day<59?'冬':day<151?'春':day<243?'夏':day<334?'秋':'冬';
}
