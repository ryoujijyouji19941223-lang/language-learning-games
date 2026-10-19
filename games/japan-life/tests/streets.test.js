import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {places} from '../src/data.js';
import {dwellings} from '../src/art/layout.js';
import {vehicleWays,sidewalks,crossings,wayBounds,segmentDistance,streetObstacles,coastRails} from '../src/art/town-plan.js';
const overlaps=(a,b)=>a.minX<b.maxX-.01&&a.maxX>b.minX+.01&&a.minZ<b.maxZ-.01&&a.maxZ>b.minZ+.01;
const parcels=[...places.filter(p=>p.w),...dwellings,{x:0,z:-70,w:27,d:6}].map(p=>({minX:p.x-p.w/2,maxX:p.x+p.w/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2}));
test('車道の全端点は別の車道か町外へ続き、道路が建物を貫かない',()=>{
  for(const r of vehicleWays){
    for(const [x,z] of [r.a,r.b])assert.ok(Math.abs(x)>90||vehicleWays.some(other=>other!==r&&segmentDistance(x,z,other.a,other.b)<other.width/2),r.id+' disconnected');
    assert.ok(parcels.every(p=>!overlaps(wayBounds(r),p)),r.id+' through building');
  }
});
test('歩道の舗装は車道や住宅と重ならず、横断歩道は車道の中に収まる',()=>{
  for(const w of sidewalks){
    assert.ok(vehicleWays.every(r=>!overlaps(wayBounds(w),wayBounds(r))),JSON.stringify(w));
    assert.ok(parcels.every(p=>!overlaps(wayBounds(w),p)),'sidewalk through building '+JSON.stringify(w));
  }
  for(const c of crossings){
    const r=vehicleWays.find(r=>r.id===c.road);
    assert.ok(segmentDistance(c.x,c.z,r.a,r.b)<1e-9);
    assert.ok(vehicleWays.filter(other=>other!==r).every(other=>segmentDistance(c.x,c.z,other.a,other.b)>other.width/2+c.width/2));
  }
});
test('海岸柵の連続範囲を固体にして砂浜への中央開口を残す',()=>{
  const blocked=(x,z)=>streetObstacles.some(f=>Math.abs(x-f.x)<f.w/2+.26&&Math.abs(z-f.z)<f.d/2+.26);
  for(const f of coastRails)for(let x=Math.max(-71,f.x-f.w/2);x<Math.min(71,f.x+f.w/2);x+=.2)assert.ok(blocked(x,47.6));
  for(let x=-21;x<=16;x+=.2)assert.ok(!blocked(x,47.6));
});
test('旧v0.3.1の海岸柵・待合所に重なる位置を復旧し、日付・住居・家財・仕事を維持する',()=>{
  for(const [x,z] of [[-45,47.6],[43,35.4],[42.4,36.1],[65,-20]]){
    const old=E.fresh(new Date(2026,3,1));E.preview(old,'home02');E.chooseHome(old,'home02');old.worldVersion=3;old.scene='town';old.pos={x,z};
    const restored=E.parse(JSON.stringify(old));assert.equal(restored.worldVersion,5);assert.notDeepEqual(restored.pos,old.pos);
    for(const key of ['clock','money','debt','home','furniture','wear','jobs','rentThrough','music','history'])assert.deepEqual(restored[key],old[key],key);
    assert.deepEqual(E.parse(JSON.stringify(restored)),restored); // migration is idempotent
  }
});
