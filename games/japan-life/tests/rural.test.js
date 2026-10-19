import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {places,destinations} from '../src/data.js';
import {dwellings,doorOf} from '../src/art/layout.js';
import {fenceSegments,parkedFootprints,parkingAreas} from '../src/art/town-plan.js';
import {treeAppearance} from '../src/art/tree-season.js';
const parcels=[...places.filter(p=>p.w),...dwellings.map(p=>({...p,kind:'residence'}))];
const obstacles=[...fenceSegments(parcels),...parkedFootprints];
const blocked=(x,z)=>obstacles.some(p=>Math.abs(p.x-x)<p.w/2+.28&&Math.abs(p.z-z)<p.d/2+.28);
test('塀と駐車車両が全住居・配達先の玄関と門の正面経路を塞がない',()=>{
  for(const p of parcels.filter(p=>['home','residence'].includes(p.kind))){
    const door=doorOf(p),dx=p.facing==='east'?1:p.facing==='west'?-1:0,dz=p.facing?0:1;
    for(let n=0;n<=8;n++)assert.ok(!blocked(door.x+dx*n*.15,door.z+dz*n*.15),p.id+' gate '+n);
  }
  for(const p of destinations)assert.ok(!blocked(p.x,p.z),p.id);
});
test('追加された塀・車両の位置で保存した旧v0.3記録を安全な公道へ移し、暮らしの記録は保持する',()=>{
  const old=E.fresh(new Date(2026,3,1));E.preview(old,'home02');E.chooseHome(old,'home02');old.worldVersion=2;old.scene='town';old.pos={x:parkingAreas[0].x,z:parkingAreas[0].z};
  const restored=E.parse(JSON.stringify(old));assert.equal(restored.worldVersion,3);assert.ok(!blocked(restored.pos.x,restored.pos.z));
  for(const k of ['clock','money','furniture','jobs','home','wear','debt','rentThrough'])assert.deepEqual(restored[k],old[k]);
  assert.equal(E.calendar(restored.clock).month,4); // never silently force an existing save into October
});
test('桜の花は春だけ。秋の桜は赤褐色の葉、冬は裸枝。他の春の木をピンクにしない',()=>{
  assert.equal(treeAppearance('秋','cherry').kind,'leaf');assert.equal(treeAppearance('春','cherry').kind,'blossom');
  assert.equal(treeAppearance('冬','cherry').kind,'bare');assert.equal(treeAppearance('春','maple').kind,'leaf');
  assert.ok(treeAppearance('秋','cherry').colors.every(c=>parseInt(c.slice(1,3),16)>parseInt(c.slice(3,5),16)));
});

test('西の住宅前の公道と余裕を塀で狭めず、旧配達の横移動も通れる',()=>{
  for(let x=-64;x<=-50;x+=.2)for(let z=-4.1;z<=-2.7;z+=.2)assert.ok(!blocked(x,z),`public lane ${x},${z}`);
});
