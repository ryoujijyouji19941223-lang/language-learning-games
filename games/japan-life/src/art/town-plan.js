// Shared world/map plans. Positions of existing doors and homes stay unchanged.
import {walkingLoop} from './layout.js';
// Car routes meet another car route or continue beyond the playable boundary (x=±71).
export const townWays=[
  {id:'hill-road',a:[2.1,-61],b:[2.1,43],width:6.4,kind:'road'},
  {id:'station-road',a:[-220,-61],b:[220,-61],width:6.4,kind:'road'},
  {id:'coast-road',a:[-220,43],b:[220,43],width:6.4,kind:'road'},
  {id:'west-link',a:[-220,-18.5],b:[2.1,-18.5],width:4.4,kind:'road'},
  {id:'west-lane',a:[-220,-4],b:[-32,-4],width:3.2,kind:'lane'},
  {id:'office-lane',a:[-32,-4],b:[-32,1],width:3.2,kind:'lane'},
  {id:'lane-link',a:[-32,1],b:[2.1,1],width:3.2,kind:'lane'},
  {id:'market-north',a:[6.6,-20],b:[65,-20],width:8,kind:'pedestrian'},
  {id:'market-south',a:[6.6,-1.5],b:[65,-1.5],width:5,kind:'pedestrian'},
];
export const vehicleWays=townWays.filter(r=>['road','lane'].includes(r.kind));
export const crossings=[
  {road:'west-link',x:-5,z:-18.5,width:2.4},
  {road:'lane-link',x:-5,z:1,width:2.4},
  {road:'hill-road',x:2.1,z:-45,width:2.4},
  {road:'hill-road',x:2.1,z:-22.6,width:2.4},
  {road:'hill-road',x:2.1,z:-3.1,width:2.4},
  {road:'hill-road',x:2.1,z:36,width:2.4},
  {road:'coast-road',x:43,z:43,width:2.4},
];
export const busStop={id:'coast-bus',x:43,z:36.9,w:5.6,d:3.2,name:'汐待海岸'};
const sidewalkPlans=[
  ...[-1.8,6].map(x=>({a:[x,-56.9],b:[x,39.1],width:1.2,kind:'sidewalk'})),
  ...[-1,1].map(side=>({a:[-220,-61+side*4.25],b:[220,-61+side*4.25],width:1.8,kind:'sidewalk'})),
  ...[39.1,46.9].map(z=>({a:[-220,z],b:[220,z],width:1.2,kind:'sidewalk'})),
  ...[-21.35,-15.65].map(z=>({a:[-220,z],b:[-2.4,z],width:1.2,kind:'sidewalk'})),
];
export function wayBounds(r){return {minX:Math.min(r.a[0],r.b[0])-(r.a[0]===r.b[0]?r.width/2:0),maxX:Math.max(r.a[0],r.b[0])+(r.a[0]===r.b[0]?r.width/2:0),minZ:Math.min(r.a[1],r.b[1])-(r.a[1]===r.b[1]?r.width/2:0),maxZ:Math.max(r.a[1],r.b[1])+(r.a[1]===r.b[1]?r.width/2:0)};}
// Cut sidewalks at carriageways: stone paving must not masquerade as a crossing.
export const sidewalks=sidewalkPlans.flatMap(p=>{
  const vertical=p.a[0]===p.b[0],axis=vertical?1:0,other=1-axis,fixed=p.a[other];
  let spans=[[p.a[axis],p.b[axis]]];
  for(const r of vehicleWays){
    const b=wayBounds(r),low=vertical?b.minZ:b.minX,high=vertical?b.maxZ:b.maxX;
    if(fixed+p.width/2< (vertical?b.minX:b.minZ)||fixed-p.width/2> (vertical?b.maxX:b.maxZ))continue;
    spans=spans.flatMap(([a,b])=>high<=a||low>=b?[[a,b]]:[[a,Math.min(b,low)], [Math.max(a,high),b]].filter(([a,b])=>b-a>.05));
  }
  return spans.map(([a,b])=>({...p,a:vertical?[fixed,a]:[a,fixed],b:vertical?[fixed,b]:[b,fixed]}));
});
// The same footprints drive visible rails, movement collision and old-save recovery.
export const coastRails=[[-220,-22],[17,220]].map(([a,b])=>({x:(a+b)/2,z:47.6,w:b-a,d:.16,kind:'coast'}));
export const pedestrianRails=townWays.filter(r=>r.kind==='pedestrian').map(r=>({x:r.b[0],z:r.b[1],w:.16,d:r.width,kind:'pedestrian-end'}));
export const shelterObstacles=[
  {x:43,z:35.4,w:5.6,d:.16,kind:'shelter-back'},
  ...[-1,1].map(side=>({x:43+side*2.72,z:36.45,w:.16,d:2.1,kind:'shelter-side'})),
  ...[-1,1].map(side=>({x:43+side*2.72,z:38.35,w:.16,d:.16,kind:'shelter-post'})),
  {x:42.4,z:36.1,w:3.9,d:.6,kind:'shelter-bench'},
  {x:47.1,z:38.25,w:.5,d:.5,kind:'bus-sign'},
];
export const streetObstacles=[...coastRails,...pedestrianRails,...shelterObstacles];
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
        if(walkingLoop.slice(1).some((b,k)=>segmentDistance(x,z,walkingLoop[k],b)<1.6)||[...townWays,...sidewalks].some(r=>segmentDistance(x,z,r.a,r.b)<r.width/2+.6))continue;
        const localW=Math.abs(bx-ax)/n||.16,localD=Math.abs(bz-az)/n||.16;
        all.push({x,z,w:Math.abs(c)*localW+Math.abs(s)*localD,d:Math.abs(s)*localW+Math.abs(c)*localD,owner:p.id});
      }
    }
  }
  return all;
}
export const parkedFootprints=parkingAreas.filter(p=>p.car).map(p=>({x:p.x,z:p.z,w:1.7,d:3.5,vehicle:p.id}));
export const paddy={x:-66,z:-36,w:10,d:9};
