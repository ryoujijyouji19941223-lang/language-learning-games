// Fictional facilities. Shared by rendering, interaction, maps and save recovery.
export const vendingMachines=[
  {id:'coast-vending',name:'海辺の自動販売機',x:37.9,z:37.6,w:1.15,d:.82,color:'#a34e3c'},
  {id:'park-vending',name:'公園の自動販売機',x:49.5,z:-53.3,w:1.15,d:.82,color:'#d8d6bc'},
];
export const recyclingBins=[
  {id:'coast-recycle',name:'海辺の飲料容器回収箱',x:36.5,z:37.7,w:.9,d:.65},
  {id:'park-recycle',name:'公園の飲料容器回収箱',x:51.1,z:-53.3,w:.9,d:.65},
];
export const park={minX:31,maxX:55,minZ:-55,maxZ:-38};
export const parkPaths=[
  {a:[6,-50],b:[53,-50],width:2.2},
  {a:[41,-56.75],b:[41,-40],width:2.2},
  {a:[6,-40],b:[53,-40],width:2},
  {a:[53,-50],b:[53,-40],width:1.5},
];
export const parkBenches=[{id:'park-west-bench',x:35,z:-41.5,w:2.1,d:.55},{id:'park-east-bench',x:51,z:-48.4,w:2.1,d:.55}];
export const parkEquipment=[
  {id:'park-swing',x:35.7,z:-45.2,w:4.6,d:3.4},
  {id:'park-slide',x:49.6,z:-44.6,w:2.6,d:4.8},
  {id:'park-sandbox',x:35.7,z:-53.1,w:3.2,d:2.6},
];
export const parkUtilities=[
  {id:'park-waste',name:'公園のごみ箱',x:53,z:-53.3,w:.6,d:.6,text:'この公園で出た燃やすごみ用です。家庭ごみは入れないでください。缶とペットボトルは隣の専用回収箱へ。'},
  {id:'park-water',name:'公園の水飲み場',x:32.9,z:-42.3,w:.65,d:.65,text:'水飲み場と、手を洗うための蛇口があります。上には飲み口、横には手を洗う蛇口が付いています。'},
];
export function frontOf(p){return {x:p.x,z:p.z+p.d/2+.65};}
function rail(ax,az,bx,bz){
  const n=Math.ceil(Math.hypot(bx-ax,bz-az)/1.2);
  return Array.from({length:n},(_,i)=>({x:ax+(bx-ax)*(i+.5)/n,z:az+(bz-az)*(i+.5)/n,w:Math.abs(bx-ax)/n||.08,d:Math.abs(bz-az)/n||.08,kind:'park-rail'}));
}
export const parkRails=[
  ...rail(31,-55,39.3,-55),...rail(42.7,-55,55,-55),
  ...rail(31,-55,31,-51.7),...rail(31,-48.3,31,-41.5),...rail(31,-38.5,31,-38),
  ...rail(55,-55,55,-52.5),...rail(55,-49.5,55,-38),...rail(31,-38,55,-38),
];
export const amenityObstacles=[...vendingMachines,...recyclingBins,...parkUtilities,...parkBenches,...parkEquipment,...parkRails,{id:'original-park-bench',x:45,z:-51,w:2.1,d:.55}];
