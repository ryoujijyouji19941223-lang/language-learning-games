import * as THREE from 'three';
import {surface,block,mesh,rod} from './materials.js';
import {groundHeight} from './height.js';
import {random} from './vegetation.js';

// Original garden dressing. The door and public street remain open.
export function dressGarden(parent,p,seed,season){
  const rng=random(3901+seed*71),g=new THREE.Group(),y=groundHeight(p.x,p.z);
  const turn=p.facing==='east'?Math.PI/2:p.facing==='west'?-Math.PI/2:0;
  const w=turn?p.d:p.w,d=turn?p.w:p.d,front=d/2;
  g.position.set(p.x,y,p.z);g.rotation.y=turn;parent.add(g);
  const soil=surface('soil','#a69a7e'),stone=surface('stone','#c3bcaa'),wood=surface('wood','#9a8a70');
  const localHeight=(x,z)=>groundHeight(p.x+x*Math.cos(turn)+z*Math.sin(turn),p.z-x*Math.sin(turn)+z*Math.cos(turn))-y;
  const foliage=new THREE.SphereGeometry(.055,6,4);
  for(const side of [-1,1]){
    const bx=side*w*.31,bz=front+.38,base=localHeight(bx,bz),bw=Math.min(2.6,w*.29);
    block(g,bx,base+.08,bz,bw,.14,.62,soil);
    for(const z of [bz-.34,bz+.34])block(g,bx,base+.11,z,bw+.12,.21,.09,stone);
    for(const x of [bx-bw/2,bx+bw/2])block(g,x,base+.11,bz,.09,.21,.68,stone);
    for(let n=0;n<7;n++){
      const x=bx+(n/6-.5)*(bw-.22),z=bz+(rng()-.5)*.2,h=.25+rng()*.18;
      if(season==='冬'){
        rod(g,[x,base+.15,z],[x+.04,base+h+.17,z],.012,wood);
        block(g,x,base+.17,z,.24,.035,.23,surface('snow','#eceee3'));
        continue;
      }
      const leaf=surface('garden-leaf',season==='秋'?['#657047','#77804b','#8a673d'][n%3]:['#5b7449','#6c8651','#80945b'][n%3]);
      for(let k=0;k<14;k++){
        const a=k*2.399,r=.07+Math.sqrt(rng())*.13;
        const m=mesh(g,foliage,leaf,x+Math.sin(a)*r,base+.25+rng()*h,z+Math.cos(a)*r);
        m.scale.set(.65,1.5,.5);m.rotation.set(rng()*2,rng()*6,rng()*2);
      }
      if(season==='秋'&&n%2===0){
        // Small chrysanthemum-like heads, authored shapes rather than a flower photo.
        for(let k=0;k<3;k++){
          const fx=x+(k-1)*.07,fz=z+Math.sin(k*3)*.06,fy=base+h+.24;
          rod(g,[fx,base+.13,fz],[fx,fy,fz],.008,leaf);
          const flower=mesh(g,new THREE.SphereGeometry(.065,7,4),surface('petals',side<0?'#cbbb75':'#ad8b83'),fx,fy,fz);flower.scale.y=.5;
          mesh(g,new THREE.SphereGeometry(.019,6,4),surface('pollen','#bc914a'),fx,fy+.025,fz);
        }
      }
    }
  }
  // A narrow bamboo screen and coiled hose on one side, clear of the entrance.
  const sx=-w/2-.26,sz=-d*.1,base=localHeight(sx,sz);
  for(let j=0;j<9;j++){
    const z=sz+(j-4)*.14;
    rod(g,[sx,base+.05,z],[sx,base+1.05+(j%3)*.025,z],.025,surface('bamboo','#a49366'));
  }
  for(const h of [.25,.8])block(g,sx-.025,base+h,sz,.04,.045,1.28,surface('wood','#7d745b'));
  const coil=mesh(g,new THREE.TorusGeometry(.22,.022,5,24,Math.PI*5.5),surface('rubber','#6b8069'),-w/2-.15,base+.58,d*.2);
  coil.rotation.y=Math.PI/2;
  // Side-yard stones sit beside the foundation, not across the public walkway.
  for(let n=0;n<5;n++){
    const z=-d*.3+n*.62,x=w/2+.38,yy=localHeight(x,z);
    const rock=mesh(g,new THREE.DodecahedronGeometry(.19+rng()*.08,0),stone,x,yy+.03,z);
    rock.scale.set(1,.35,1.2);rock.rotation.y=rng()*6;
  }
  return g;
}
