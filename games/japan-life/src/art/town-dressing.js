import {busShelter} from './bus-stop.js';
import * as THREE from 'three';
import {surface,block,mesh,rod} from './materials.js';
import {groundHeight} from './height.js';
import {placard} from './buildings.js';
import {parkingAreas,parkedFootprints,fenceSegments,paddy,streetObstacles,pedestrianRails} from './town-plan.js';
import {random} from './vegetation.js';
function vehicle(g,p){
  const car=new THREE.Group();car.position.set(p.x,groundHeight(p.x,p.z),p.z);g.add(car);
  const paint=surface('car-paint',p.color,{roughness:.36,metalness:.22}),glass=surface('glass','#4b6568',{roughness:.2});
  block(car,0,.53,0,1.66,.48,3.45,paint);
  if(p.truck){
    block(car,0,1.05,.91,1.6,.82,1.35,paint);block(car,0,1.15,1.6,1.4,.5,.035,glass);
    for(const side of [-1,1]){
      block(car,side*.83,.87,-.66,.08,.27,2.03,paint);block(car,side*.82,1.2,.85,.026,.44,.95,glass);
    }
    block(car,0,.79,-1.67,1.65,.28,.06,paint);
    for(const x of [-.4,.4])block(car,x,.88,-.7,.55,.32,.65,surface('foam','#d8ded5'));
    placard(car,'鮮魚',0,1.06,-1.71,.9);
  }else{
    block(car,0,1.02,-.15,1.48,.68,1.86,paint);block(car,0,1.12,.81,1.35,.43,.025,glass);block(car,0,1.12,-1.1,1.3,.38,.025,glass);
    for(const side of [-1,1]){block(car,side*.75,1.16,-.14,.025,.36,1.45,glass);block(car,side*.89,1.1,.62,.17,.13,.2,paint);}
  }
  for(const side of [-1,1])for(const z of [-1.08,1.08]){
    const wheel=mesh(car,new THREE.CylinderGeometry(.3,.3,.18,14),surface('rubber','#303934'),side*.81,.31,z);wheel.rotation.z=Math.PI/2;
    const hub=mesh(car,new THREE.CylinderGeometry(.15,.15,.19,10),surface('metal','#a8afa8'),side*.83,.31,z);hub.rotation.z=Math.PI/2;
  }
  for(const x of [-.55,.55]){block(car,x,.61,1.74,.32,.14,.03,surface('lamp','#eee5c5'));block(car,x,.6,-1.75,.22,.16,.03,surface('red','#9b4736'));}
  placard(car,'汐待 12',0,.39,1.76,.42,'#d6cd8f');
}
export function townDressing(g,world,parcels,road,season){
  for(const f of streetObstacles)world.obstacle(f.x,f.z,f.w,f.d);
  for(const f of pedestrianRails){
    for(let z=f.z-f.d/2;z<=f.z+f.d/2;z+=1.25){
      const end=Math.min(z+1.25,f.z+f.d/2),y=groundHeight(f.x,z),ey=groundHeight(f.x,end);
      rod(g,[f.x,y,z],[f.x,y+1,z],.045,surface('metal','#61796d'));
      for(const h of [.5,1])rod(g,[f.x,y+h,z],[f.x,ey+h,end],.035,surface('metal','#61796d'));
    }
  }
  busShelter(g,world,road);
  for(const f of fenceSegments(parcels)){
    const y=groundHeight(f.x,f.z);
    block(g,f.x,y+.43,f.z,f.w,.86,f.d,surface('concrete','#b6b3a1'));
    block(g,f.x,y+.87,f.z,f.w+.025,.06,f.d+.025,surface('stone','#898c80'));
    world.obstacle(f.x,f.z,f.w,f.d);
  }
  for(const p of parkingAreas){
    // The individual strips follow the sloping terrain rather than floating above it.
    road([p.x,p.z-p.d/2],[p.x,p.z+p.d/2],p.w,'concrete','#b7b8a8',.065);
    for(const side of [-1,1])road([p.x+side*(p.w/2-.1),p.z-p.d/2],[p.x+side*(p.w/2-.1),p.z+p.d/2],.065,'paint','#e6e4cc',.08);
    for(const side of [-1,1])block(g,p.x+side*.7,groundHeight(p.x,p.z-p.d/2+.5)+.1,p.z-p.d/2+.5,.5,.16,.2,surface('concrete','#bfc1b3'));
    if(p.car)vehicle(g,p);
  }
  for(const p of parkedFootprints)world.obstacle(p.x,p.z,p.w,p.d);
  // Harvested October paddy: low stubble, narrow earthen banks; no pink trees or summer rice.
  for(let x=paddy.x-paddy.w/2;x<paddy.x+paddy.w/2;x+=.5)road([x,paddy.z-paddy.d/2],[x,paddy.z+paddy.d/2],.5,'soil',season==='冬'?'#c9c9bb':'#aa9763',.07);
  for(const z of [paddy.z-paddy.d/2,paddy.z+paddy.d/2])road([paddy.x-paddy.w/2,z],[paddy.x+paddy.w/2,z],.35,'grass','#9b9766',.16);
  const rng=random(3471);
  for(let i=0;i<240;i++){
    const x=paddy.x+(i%20-9.5)*.47,z=paddy.z+(Math.floor(i/20)-5.5)*.7,y=groundHeight(x,z)+.09;
    for(let j=0;j<2;j++)rod(g,[x+j*.045,y,z],[x+.06+j*.045,y+.15+rng()*.1,z+.03],.012,surface('straw','#baac6d'));
  }
  // Vacant lot: low, patchy dry grass and a gravel edge, keeping rural breathing room.
  road([-48,13],[-39,13],7,'soil','#bab194',.035);
  for(let i=0;i<55;i++){
    const x=-48+rng()*9,z=9.7+rng()*6.5,y=groundHeight(x,z);
    rod(g,[x,y,z],[x+.15,y+.25+rng()*.2,z],.012,surface('dry-grass','#99975e'));
  }
  // Coastal black-pine inspired silhouettes, evergreen in every season.
  for(let i=0;i<15;i++){
    const x=-66+i*2.2,z=45.2+(i%2)*1.5,y=groundHeight(x,z),h=3.4+rng()*1.7;
    rod(g,[x,y,z],[x+.35,y+h,z],.16,surface('bark','#6c6452'),.06);
    for(let k=0;k<4;k++){
      const a=k*2.4,xx=x+Math.sin(a)*1.1,zz=z+Math.cos(a)*1.1,yy=y+h-.65+rng()*.65;
      rod(g,[x+.2,y+h*.65,z],[xx,yy,zz],.055,surface('bark','#6c6452'),.018);
      for(let n=0;n<9;n++){
        const a=n*2.399,r=Math.sqrt(n/8)*.95;
        const needles=mesh(g,new THREE.IcosahedronGeometry(.46+rng()*.15,1),surface('pine',['#4e6847','#425e40','#5b704a'][n%3]),xx+Math.cos(a)*r,yy+.2+rng()*.25,zz+Math.sin(a)*r*.8);
        needles.scale.set(1,.57+rng()*.22,1.1);
      }
    }
  }
}
