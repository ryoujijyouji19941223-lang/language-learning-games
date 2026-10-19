import {vendingDrinks} from '../outdoor-data.js';
import * as THREE from 'three';
import {block,mesh,rod,surface} from './materials.js';
import {groundHeight} from './height.js';
import {placard} from './buildings.js';
import {vendingMachines,recyclingBins,park,parkPaths,parkRails,parkBenches,parkEquipment,parkUtilities,amenityObstacles,frontOf} from './amenity-plan.js';

function vending(g,p){
  const group=new THREE.Group(),y=groundHeight(p.x,p.z);group.position.set(p.x,y,p.z);g.add(group);
  const paint=surface('metal',p.color,{roughness:.63}),steel=surface('metal','#818b82'),dark=surface('metal','#293b36');
  block(group,0,.98,0,p.w,1.84,p.d,paint);
  block(group,0,1.92,0,p.w+.05,.055,p.d+.04,steel);
  for(const x of [-.44,.44])for(const z of [-.3,.3])block(group,x,.075,z,.12,.15,.12,dark);
  const face=p.d/2;
  block(group,-.1,1.31,face+.014,.85,.84,.035,dark);
  block(group,-.1,1.31,face+.035,.79,.78,.02,surface('sign','#e4ead8',{emissive:'#becbb9',emissiveIntensity:.24}));
  for(let row=0;row<2;row++){
    const yy=1.55-row*.36;
    for(let col=0;col<4;col++){
      const xx=-.4+col*.2;
      if(row===0){
        mesh(group,new THREE.CylinderGeometry(.058,.058,.16,12),surface('metal',col%2?'#b69a5b':'#695c4b'),xx,yy,face+.09);
        mesh(group,new THREE.CylinderGeometry(.057,.057,.008,12),steel,xx,yy+.083,face+.09);
        block(group,xx,yy,face+.15,.075,.055,.012,surface('sign','#dfd8b8'));
      }else{
        mesh(group,new THREE.CylinderGeometry(.048,.055,.17,10),surface('glass','#8fa46b',{roughness:.3}),xx,yy,face+.08);
        mesh(group,new THREE.CylinderGeometry(.027,.027,.055,10),surface('plastic','#53764f'),xx,yy+.107,face+.08);
        block(group,xx,yy,face+.14,.08,.07,.013,surface('sign','#e4dfc4'));
      }
      const button=mesh(group,new THREE.SphereGeometry(.032,8,6),surface('plastic',row?'#8cb0b5':'#d9956d'),xx,yy-.15,face+.072);button.scale.set(1,.55,.45);
    }
    placard(group,`${vendingDrinks[row].temperature} ${vendingDrinks[row].price}円`,-.1,yy-.235,face+.062,.78,row?'#9ab5b7':'#d29d78');
  }
  placard(group,'汐待ののみもの',0,1.8,face+.026,.98,'#355f54','#eee6cc');
  // Coin slot, return lever, contactless reader and a recessed collection flap.
  block(group,.45,1.43,face+.045,.14,.11,.025,dark);
  block(group,.45,1.59,face+.045,.08,.014,.025,dark);
  block(group,.47,1.17,face+.06,.09,.055,.06,steel);
  block(group,.45,.96,face+.05,.12,.13,.035,surface('plastic','#45697a'));
  block(group,-.08,.42,face+.024,.81,.28,.03,dark);
  block(group,-.08,.52,face+.057,.76,.07,.05,steel);
  placard(group,'取出口',-.08,.25,face+.04,.45,'#dad7c2');
  block(group,.45,.55,face+.06,.13,.12,.06,dark);
  for(let i=0;i<7;i++)block(group,-p.w/2-.005,.25+i*.055,.05,.02,.016,.4,dark);
  for(const x of [-.51,.51])for(const yy of [.16,1.7])mesh(group,new THREE.SphereGeometry(.013,5,4),steel,x,yy,face+.018);
}
function recoveryBin(g,p){
  const y=groundHeight(p.x,p.z),body=surface('metal','#c6c9ba'),dark=surface('rubber','#273a33');
  block(g,p.x,y+.46,p.z,p.w,.91,p.d,body);
  const lid=block(g,p.x,y+.96,p.z-.02,p.w+.04,.13,p.d+.06,surface('metal','#8b9e89'));lid.rotation.x=-.12;
  for(const side of [-1,1]){
    mesh(g,new THREE.CircleGeometry(.105,16),dark,p.x+side*.21,y+.84,p.z+p.d/2+.016);
    placard(g,side<0?'缶':'PET',p.x+side*.21,y+.56,p.z+p.d/2+.02,.32,'#e2dfc9');
  }
  placard(g,'飲料容器だけ',p.x,y+.25,p.z+p.d/2+.02,.8,'#e2dfc9');
  for(const side of [-1,1])block(g,p.x+side*.25,y+.045,p.z,.12,.09,.4,dark);
}
function parkBench(g,p){
  const y=groundHeight(p.x,p.z),wood=surface('wood','#9b8260'),iron=surface('metal','#526c60');
  for(const z of [-.18,0,.18])block(g,p.x,y+.5,p.z+z,p.w,.09,.16,wood);
  for(const yy of [.82,1.02])block(g,p.x,y+yy,p.z-.27,p.w,.15,.08,wood);
  for(const x of [-.8,.8]){
    block(g,p.x+x,y+.26,p.z,.09,.48,.47,iron);block(g,p.x+x,y+.81,p.z-.28,.09,.64,.09,iron);
    rod(g,[p.x+x,y+.66,p.z-.25],[p.x+x,y+.66,p.z+.22],.025,iron);
  }
}
function playground(g,road){
  const swing=parkEquipment.find(p=>p.id==='park-swing'),swingY=groundHeight(swing.x,swing.z),steel=surface('metal','#537e72'),wood=surface('wood','#9c805d');
  road([swing.x-swing.w/2,swing.z],[swing.x+swing.w/2,swing.z],swing.d,'sand','#bbae82',.06);
  for(const x of [swing.x-2,swing.x+2])for(const side of [-1,1]){
    const z=swing.z+side*1.45;
    rod(g,[x,groundHeight(x,z),z],[x,swingY+2.65,swing.z],.065,steel);
    block(g,x,groundHeight(x,z)+.035,z,.35,.07,.35,surface('concrete','#aaa995'));
  }
  rod(g,[swing.x-2.18,swingY+2.65,swing.z],[swing.x+2.18,swingY+2.65,swing.z],.07,steel);
  for(const x of [swing.x-.9,swing.x+.9]){
    for(const dx of [-.27,.27])rod(g,[x+dx,swingY+.48,swing.z],[x+dx,swingY+2.61,swing.z],.015,surface('metal','#8e978a'));
    block(g,x,swingY+.48,swing.z,.67,.09,.35,surface('rubber','#434e41'));
  }
  const slide=parkEquipment.find(p=>p.id==='park-slide'),y=groundHeight(slide.x,slide.z),topZ=slide.z-1.2;
  road([slide.x-1.3,slide.z],[slide.x+1.3,slide.z],slide.d,'sand','#bbae82',.06);
  block(g,slide.x,y+1.55,topZ,1.15,.12,1.1,wood);
  for(const x of [-.48,.48])for(const z of [topZ-.45,topZ+.45])rod(g,[slide.x+x,groundHeight(slide.x+x,z),z],[slide.x+x,y+1.55,z],.05,steel);
  const length=Math.hypot(1.2,2.5),angle=Math.atan2(1.2,2.5);
  const chute=block(g,slide.x,y+.96,slide.z+.5,.88,.06,length,surface('metal','#b7c0b4',{roughness:.45}));chute.rotation.x=angle;
  for(const dx of [-.49,.49]){
    const side=block(g,slide.x+dx,y+1.1,slide.z+.5,.07,.29,length,surface('metal','#b87051'));side.rotation.x=angle;
    rod(g,[slide.x+dx,y+1.55,topZ-.45],[slide.x+dx,y+2.14,topZ-.45],.025,steel);
    rod(g,[slide.x+dx,y+2.14,topZ-.45],[slide.x+dx,y+2.14,topZ+.4],.025,steel);
  }
  for(let i=0;i<5;i++){
    const z=topZ-1.2+i*.2;rod(g,[slide.x-.37,y+.22+i*.3,z],[slide.x+.37,y+.22+i*.3,z],.035,steel);
  }
  const sandbox=parkEquipment.find(p=>p.id==='park-sandbox');
  road([sandbox.x-sandbox.w/2,sandbox.z],[sandbox.x+sandbox.w/2,sandbox.z],sandbox.d,'sand','#d3c296',.08);
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const x=sandbox.x-sandbox.w/2+(i+.5)*sandbox.w/4,z=sandbox.z+side*sandbox.d/2;
      block(g,x,groundHeight(x,z)+.12,z,sandbox.w/4,.23,.14,wood);
    }
    block(g,sandbox.x+side*sandbox.w/2,groundHeight(sandbox.x+side*sandbox.w/2,sandbox.z)+.12,sandbox.z,.14,.23,sandbox.d,wood);
  }
  const by=groundHeight(sandbox.x+.6,sandbox.z);
  mesh(g,new THREE.CylinderGeometry(.14,.11,.22,12),surface('plastic','#bb8551'),sandbox.x+.6,by+.2,sandbox.z);
  rod(g,[sandbox.x+.5,by+.31,sandbox.z],[sandbox.x+.7,by+.38,sandbox.z],.016,steel);
  block(g,sandbox.x-.6,groundHeight(sandbox.x-.6,sandbox.z)+.11,sandbox.z,.19,.035,.27,surface('plastic','#738c82'));
}
export function neighborhoodAmenities(g,world,road){
  for(const p of amenityObstacles)world.obstacle(p.x,p.z,p.w,p.d);
  for(const p of vendingMachines){vending(g,p);world.targets.push({type:'vending',id:p.id,name:p.name,...frontOf(p)});}
  for(const p of recyclingBins){recoveryBin(g,p);world.targets.push({type:'recycle',id:p.id,name:'缶・ペットボトルの回収箱',...frontOf(p)});}
  // A managed fictional neighborhood park; keep the original map ID and bench.
  road([park.minX,-46.5],[park.maxX,-46.5],17,'grass','#c1bf96',.025);
  for(const p of parkPaths)road(p.a,p.b,p.width,'soil','#c1b796',.065);
  for(const p of parkRails){
    const vertical=p.w<p.d,ax=p.x-p.w/2,az=p.z-p.d/2,bx=p.x+p.w/2,bz=p.z+p.d/2;
    const a=vertical?[p.x,az]:[ax,p.z],b=vertical?[p.x,bz]:[bx,p.z],y=groundHeight(...a),by=groundHeight(...b),mat=surface('metal','#688476');
    rod(g,[a[0],y,a[1]],[a[0],y+.82,a[1]],.027,mat);
    for(const h of [.4,.8])rod(g,[a[0],y+h,a[1]],[b[0],by+h,b[1]],.022,mat);
  }
  for(const p of parkBenches){parkBench(g,p);world.targets.push({type:'bench',id:p.id,name:'公園のベンチで休む',...frontOf(p)});}
  playground(g,road);
  for(const p of parkUtilities){
    const y=groundHeight(p.x,p.z);
    if(p.id==='park-waste'){
      block(g,p.x,y+.42,p.z,.59,.8,.56,surface('metal','#637768'));
      block(g,p.x,y+.85,p.z,.65,.09,.62,surface('metal','#475f53'));
      block(g,p.x,y+.73,p.z+.29,.36,.12,.02,surface('rubber','#233930'));
      placard(g,'公園のごみ',p.x,y+.47,p.z+.3,.55,'#ddd7bd');
      placard(g,'家庭ごみ不可',p.x,y+.27,p.z+.3,.55,'#ddd7bd');
    }else{
      const concrete=surface('concrete','#b7b5a0'),metal=surface('metal','#a9b5ab');
      block(g,p.x,y+.42,p.z,.48,.84,.45,concrete);mesh(g,new THREE.CylinderGeometry(.36,.29,.11,16),concrete,p.x,y+.87,p.z);
      mesh(g,new THREE.CylinderGeometry(.28,.28,.012,16),surface('metal','#717e73'),p.x,y+.932,p.z);
      rod(g,[p.x,y+.95,p.z-.11],[p.x,y+1.03,p.z-.11],.028,metal);
      rod(g,[p.x,y+1.03,p.z-.11],[p.x,y+1.03,p.z+.01],.028,metal);
      rod(g,[p.x+.2,y+.65,p.z],[p.x+.38,y+.65,p.z],.028,metal);
      block(g,p.x+.34,y+.7,p.z,.1,.025,.06,metal);
    }
    world.targets.push({type:'amenity',id:p.id,name:p.name,...frontOf(p)});
  }
  const signY=groundHeight(36.6,-55);
  for(const x of [35.2,38])rod(g,[x,groundHeight(x,-54.9),-54.9],[x,signY+1.4,-54.9],.045,surface('wood','#7e7056'));
  placard(g,'駅前公園',36.6,signY+1.3,-54.85,2.8,'#c8cba9');
}
