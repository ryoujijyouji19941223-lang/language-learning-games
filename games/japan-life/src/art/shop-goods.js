// Original shop stock. Shape, packaging and labels distinguish each trade.
import * as THREE from 'three';
import {surface, block, mesh, rod} from './materials.js';
import {placard, fishDisplay} from './buildings.js';
const mat=(kind,color)=>surface(kind,color);
function bottle(g,x,y,z,color){
  mesh(g,new THREE.CylinderGeometry(.075,.085,.3,10),mat('bottle',color),x,y+.15,z);
  mesh(g,new THREE.CylinderGeometry(.033,.033,.13,8),mat('glass','#775b35'),x,y+.36,z);
  block(g,x,y+.17,z+.075,.13,.12,.012,mat('paper','#eee4cd'));
  mesh(g,new THREE.CylinderGeometry(.037,.037,.04,8),mat('lid','#a34e32'),x,y+.44,z);
}
export function shopGoods(kind){
  const g=new THREE.Group();g.name='shop-stock-'+kind;
  const timber=mat('wood','#ae8c60'),paper=mat('paper','#e9dfc7');
  if(kind==='fish'){
    fishDisplay(g,-1.8,0,-2.9);fishDisplay(g,1.3,0,-2.9);
    for(const x of [-2.4,-1.3,1,2]){
      block(g,x,.2,-3.9,.85,.4,.55,mat('foam','#e2e1d4'));
      block(g,x,.4,-3.9,.73,.04,.43,mat('ice','#c5dcdb'));
    }
    const pink=mat('octopus','#a16b62');
    mesh(g,new THREE.SphereGeometry(.2,10,7),pink,1.3,1.08,-2.5);
    for(let k=0;k<8;k++){
      const a=k*Math.PI/4;rod(g,[1.3,.98,-2.5],[1.3+Math.cos(a)*.43,.88,-2.5+Math.sin(a)*.43],.045,pink,.025);
    }
    placard(g,'氷冷・本日の魚',-1.8,.62,-2.28,1.6);
  }else if(kind==='grocery'){
    for(const x of [-2.6,0,2.6]){
      block(g,x,1,-3.65,2.15,2,.14,timber);
      for(const y of [.35,.95,1.55])block(g,x,y,-3.3,2.15,.09,.7,timber);
    }
    for(let i=0;i<4;i++){
      const x=-3.3+i*.46;
      block(g,x,1.24,-3.3,.36,.46,.28,paper);block(g,x,1.49,-3.3,.32,.045,.29,paper);
      placard(g,'米 2kg',x,1.26,-3.145,.32,'#e9dfc7','#354f3a');
    }
    for(let i=0;i<8;i++)bottle(g,-.85+i*.24,1,-3.24,i%2?'#57442b':'#9b793f');
    placard(g,'しょうゆ・みりん',0,1.65,-3.1,1.8);
    for(let i=0;i<4;i++){
      block(g,1.9+i*.4,.55,-3.28,.3,.28,.22,mat('packet',i%2?'#454d38':'#d7b78b'));
      placard(g,i%2?'のり':'だし',1.9+i*.4,.56,-3.16,.25);
    }
    block(g,-2,.66,0,1.3,.13,.65,mat('egg-carton','#bcab87'));
    for(let i=0;i<10;i++){
      const egg=mesh(g,new THREE.SphereGeometry(.09,9,6),mat('egg','#f1e6cf'),-2.5+(i%5)*.24,.79,-.15+Math.floor(i/5)*.3);egg.scale.y=1.3;
    }
    placard(g,'たまご',-2,.48,.36,.8);
    for(let i=0;i<3;i++)block(g,1.9+i*.32,1.66,-3.3,.25,.17,.32,mat('tofu','#efeee2'));
    for(let i=0;i<7;i++)rod(g,[2+i*.1,.45,-2.6],[2.2+i*.1,1.25,-2.8],.025,mat('negi',i%2?'#5d7843':'#e2dfbc'));
  }else if(kind==='egg'){
    block(g,0,1.07,-1,2.2,.14,.6,mat('metal','#564b3b'));
    for(let i=0;i<18;i++){
      const x=-.92+(i%9)*.23,z=-1.16+Math.floor(i/9)*.27;
      mesh(g,new THREE.CylinderGeometry(.09,.08,.025,10),mat('brass','#bc934d'),x,1.16,z);
      if(i<9){const food=mesh(g,new THREE.SphereGeometry(.074,8,6),mat('egg','#e7c46c'),x,1.19,z);food.scale.y=.48;}
    }
    for(const x of [-2.4,2.4]){
      block(g,x,.74,-3.3,1.4,.1,.7,timber);rod(g,[x,0,-3.3],[x,.72,-3.3],.06,timber);
      mesh(g,new THREE.CylinderGeometry(.18,.14,.09,14),paper,x,.84,-3.3);bottle(g,x+.35,.8,-3.3,'#725237');
    }
  }else if(kind==='clothes'){
    for(let i=0;i<5;i++){
      const x=-3+i*1.4,c=mat('cloth',['#b8a186','#455c68','#6c7c58','#a16e59','#d2c5ad'][i]);
      block(g,x,1.38,-3,.5,.7,.16,c);
      for(const side of [-1,1]){const sleeve=block(g,x+side*.32,1.42,-3,.18,.5,.17,c);sleeve.rotation.z=side*.32;}
      rod(g,[x-.32,1.84,-3],[x+.32,1.84,-3],.015,mat('metal','#b6afa0'));
    }
    rod(g,[-3.5,1.94,-3],[3.4,1.94,-3],.035,mat('metal','#7c8379'));
    for(const x of [-3.5,3.4])rod(g,[x,0,-3],[x,1.94,-3],.035,mat('metal','#7c8379'));
  }else if(kind==='depot'){
    for(let i=0;i<8;i++){
      const x=-2.8+(i%4)*1.6,y=.3+Math.floor(i/4)*.63;
      block(g,x,y,-3,.9,.58,.65,mat('cardboard','#bf9c6e'));
      block(g,x,y+.3,-3,.1,.015,.65,mat('tape','#e3cc99'));placard(g,'取扱注意',x,y,-2.67,.55);
    }
  }else if(kind==='office'){
    block(g,2.7,.4,-3,1.4,.8,.45,timber);
    for(let i=0;i<4;i++){const leaflet=block(g,2.2+i*.32,.93,-3,.25,.34,.035,paper);leaflet.rotation.x=-.28;}
  }
  return g;
}
