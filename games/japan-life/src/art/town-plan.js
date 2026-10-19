// Shared world/map plans. Positions of existing doors and homes stay unchanged.
import {walkingLoop} from './layout.js';
export const townWays=[
  {a:[0,-63],b:[0,44],width:6.4,kind:'road'},
  ...[-55,7,29].map(z=>({a:[-70,z],b:[70,z],width:6.4,kind:'road'})),
  {a:[-70,-20],b:[7,-20],width:5.2,kind:'road'},
  {a:[-70,-4],b:[0,-4],width:3.2,kind:'lane'},
  {a:[8,-20],b:[65,-20],width:8,kind:'pedestrian'},
  {a:[8,-1.5],b:[65,-1.5],width:5,kind:'pedestrian'},
  ...[-55,-34,10,57].map(x=>({a:[x,-60],b:[x,41],width:2.1,kind:'lane'})),
  {a:[-70,42],b:[70,42],width:5,kind:'promenade'},
];
export const parkingAreas=[
  {id:'home01-parking',x:-50.3,z:-24,w:2.7,d:5.2,car:true,color:'#c2c5ba'},
  {id:'hill02-parking',x:-61,z:-32,w:2.7,d:5.2,car:true,color:'#7d9698'},
  {id:'home02-parking',x:-64,z:2,w:2.7,d:5.2,car:false},
  {id:'fish-truck',x:-32,z:34,w:2.7,d:5.2,car:true,truck:true,color:'#e1e4db'},
];
export function segmentDistance(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
export function fenceSegments(parcels){
  const all=[];
  for(const p of parcels.filter(p=>['home','residence'].includes(p.kind))){
    const turn=p.facing==='east'?Math.PI/2:p.facing==='west'?-Math.PI/2:0,c=Math.cos(turn),s=Math.sin(turn);
    const w=(turn?p.d:p.w)/2+1.1,d=(turn?p.w:p.d)/2+1.0;
    const edges=[[-w,-d,w,-d],[-w,-d,-w,d],[w,-d,w,d],[-w,d,-1.5,d],[1.5,d,w,d]];
    for(const [ax,az,bx,bz] of edges){
      const n=Math.ceil(Math.hypot(bx-ax,bz-az));
      for(let i=0;i<n;i++){
        const lx=ax+(bx-ax)*(i+.5)/n,lz=az+(bz-az)*(i+.5)/n;
        const x=p.x+lx*c+lz*s,z=p.z-lx*s+lz*c;
        // Keep established public walking routes and the approach to every doorway open.
        if(walkingLoop.slice(1).some((b,k)=>segmentDistance(x,z,walkingLoop[k],b)<1.6)||townWays.some(r=>segmentDistance(x,z,r.a,r.b)<r.width/2+.6))continue;
        const localW=Math.abs(bx-ax)/n||.16,localD=Math.abs(bz-az)/n||.16;
        all.push({x,z,w:Math.abs(c)*localW+Math.abs(s)*localD,d:Math.abs(s)*localW+Math.abs(c)*localD,owner:p.id});
      }
    }
  }
  return all;
}
export const parkedFootprints=parkingAreas.filter(p=>p.car).map(p=>({x:p.x,z:p.z,w:1.7,d:3.5,vehicle:p.id}));
export const paddy={x:-66,z:-36,w:10,d:9};
