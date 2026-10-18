// Original, fictional parcels. Door coordinates are shared by houses and deliveries.
export const dwellings = [
  {id:'hill01',x:-61,z:-11,w:8,d:6,floors:2,style:'apartment',address:'汐坂一丁目1番',units:6},
  {id:'hill02',x:-54,z:-32,w:7,d:7,floors:2,style:'timber',address:'汐坂一丁目2番',units:4},
  {id:'hill03',x:-31,z:-26,w:7,d:8,floors:2,style:'plaster',address:'汐坂一丁目3番',units:4},
  {id:'hill04',x:-59,z:-47,w:9,d:7,floors:2,style:'apartment',address:'汐坂二丁目1番',units:6},
  {id:'hill05',x:-43,z:-45,w:8,d:7,floors:2,style:'plaster',address:'汐坂二丁目2番',units:4},
  {id:'hill06',x:-10,z:-32,w:8,d:8,floors:2,style:'timber',address:'汐坂二丁目3番',units:4},
  {id:'lane01',x:-11,z:-11,w:7,d:8,floors:2,style:'plaster',address:'潮見通り1番',units:4},
  {id:'lane02',x:-10,z:10,w:7,d:7,floors:2,style:'timber',address:'潮見通り2番',units:4},
  {id:'lane03',x:11,z:20,w:8,d:7,floors:2,style:'plaster',address:'潮見通り3番',units:6},
  {id:'lane04',x:34,z:15,w:9,d:7,floors:2,style:'apartment',address:'潮見通り4番',units:6},
  {id:'lane05',x:54,z:7,w:8,d:7,floors:2,style:'plaster',address:'潮見通り5番',units:6},
  {id:'lane06',x:61,z:-44,w:8,d:7,floors:2,style:'timber',address:'公園通り1番',units:6},
];
export const doorOf = b => ({x:b.x,z:b.z+b.d/2+.9});
export const walkingLoop = [[0,40],[0,29],[0,7],[0,-4],[0,-20],[-34,-20],[-55,-20],[-55,-4],[0,-4],[0,7],[0,29],[0,40]];
export function alongLoop(distance) {
  let total=0;for(let i=1;i<walkingLoop.length;i++)total+=Math.hypot(walkingLoop[i][0]-walkingLoop[i-1][0],walkingLoop[i][1]-walkingLoop[i-1][1]);
  distance=((distance%total)+total)%total;
  for(let i=1;i<walkingLoop.length;i++) {const a=walkingLoop[i-1],b=walkingLoop[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=d)return {x:a[0]+(b[0]-a[0])*distance/d,z:a[1]+(b[1]-a[1])*distance/d};distance-=d;}
  return {x:0,z:40};
}
