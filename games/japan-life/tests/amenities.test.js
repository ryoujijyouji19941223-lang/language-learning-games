import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {places} from '../src/data.js';
import {dwellings,doorOf} from '../src/art/layout.js';
import {amenityObstacles,parkPaths,vendingMachines,recyclingBins,frontOf} from '../src/art/amenity-plan.js';
import {vehicleWays,sidewalks,wayBounds} from '../src/art/town-plan.js';
const state=()=>{const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,'home01');s.scene='town';s.pos=frontOf(vendingMachines[0]);return s;};
test('自販機の正面で買うと所持金・飲料・買物記録と一分だけを更新し、再開できる',()=>{
  const s=state(),before=structuredClone(s);E.buyVendingDrink(s,'coast-vending','coffee');
  assert.equal(s.money,before.money-140);assert.equal(s.outdoors.drinks.coffee,1);assert.equal(s.stats.bought,before.stats.bought+1);assert.equal(s.clock,before.clock+1);
  assert.deepEqual(E.parse(JSON.stringify(s)),s);
  for(const k of ['bag','home','furniture','wear','jobs','music'])assert.deepEqual(s[k],before[k]);
});
test('遠隔・屋内・未契約・不足金額・不明商品・空の持ち物を拒否し、失敗時は状態を保つ',()=>{
  for(const change of [s=>s.pos={x:0,z:0},s=>s.scene='home01',s=>s.home=null,s=>s.money=10]){
    const s=state();change(s);const before=structuredClone(s);assert.throws(()=>E.buyVendingDrink(s,'coast-vending','tea'));assert.deepEqual(s,before);
  }
  const s=state();for(const action of [()=>E.buyVendingDrink(s,'coast-vending','rice'),()=>E.drinkVendingDrink(s,'tea'),()=>E.recycleContainer(s,'coast-recycle','can')]){
    const before=structuredClone(s);assert.throws(action);assert.deepEqual(s,before);
  }
});
test('飲料ごとの空き容器を一つずつ保持し、缶とPETだけを現地で戻して再開する',()=>{
  const s=state();E.buyVendingDrink(s,'coast-vending','coffee');E.buyVendingDrink(s,'coast-vending','tea');
  E.drinkVendingDrink(s,'coffee');E.drinkVendingDrink(s,'tea');assert.deepEqual(s.outdoors.empties,{can:1,pet:1});
  const copy=E.parse(JSON.stringify(s));assert.deepEqual(copy.outdoors,s.outdoors);
  s.pos=frontOf(recyclingBins[0]);const money=s.money,bag=structuredClone(s.bag),before=structuredClone(s);
  assert.throws(()=>E.recycleContainer(s,'coast-recycle','rice'));assert.deepEqual(s,before);
  E.recycleContainer(s,'coast-recycle','can');assert.deepEqual(s.outdoors.empties,{can:0,pet:1});assert.equal(s.money,money);assert.deepEqual(s.bag,bag);
  const returned=structuredClone(s);assert.throws(()=>E.recycleContainer(s,'coast-recycle','can'));assert.deepEqual(s,returned);
  E.recycleContainer(s,'coast-recycle','pet');assert.deepEqual(s.outdoors.empties,{can:0,pet:0});
});
test('v0.3.2の位置と生活を保持して追加記録だけ補完し、新設備上の位置だけ復旧する',()=>{
  for(const pos of [{x:0,z:-20},...amenityObstacles.slice(0,4).map(p=>({x:p.x,z:p.z}))]){
    const old=state();old.pos=pos;old.worldVersion=4;delete old.outdoors;const saved=E.parse(JSON.stringify(old));
    assert.equal(saved.worldVersion,5);assert.deepEqual(saved.outdoors,{drinks:{coffee:0,tea:0},empties:{can:0,pet:0}});
    for(const k of ['clock','money','bag','debt','home','furniture','jobs','music','history','rentThrough','stats'])assert.deepEqual(saved[k],old[k]);
    if(pos.x===0)assert.deepEqual(saved.pos,pos);else assert.equal(saved.pos.x,0);
  }
});
test('壊れた追加記録を勝手に初期化せず、負数・過大数・不明容器・欠落項目を拒否する',()=>{
  for(const change of [s=>s.outdoors=null,s=>s.outdoors.drinks.tea=-1,s=>s.outdoors.empties.pet=100000,s=>s.outdoors.empties.rice=1,s=>delete s.outdoors.drinks.coffee]){
    const s=state();change(s);assert.throws(()=>E.parse(JSON.stringify(s)),/飲み物と空き容器/);
  }
});
test('公園・自販機・回収箱は車道・歩道・建物・既存玄関と園路の中心を塞がない',()=>{
  const boxes=[...vehicleWays,...sidewalks].map(wayBounds);
  boxes.push(...[...places.filter(p=>p.w),...dwellings].map(p=>({minX:p.x-p.w/2,maxX:p.x+p.w/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2})));
  for(const p of amenityObstacles){
    const a={minX:p.x-p.w/2,maxX:p.x+p.w/2,minZ:p.z-p.d/2,maxZ:p.z+p.d/2};
    assert.ok(boxes.every(b=>!(a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ)),p.id||p.kind);
  }
  const blocked=(x,z)=>amenityObstacles.some(p=>Math.abs(p.x-x)<p.w/2+.26&&Math.abs(p.z-z)<p.d/2+.26);
  for(const p of [...places.filter(p=>p.w),...dwellings]){const d=doorOf(p);assert.ok(!blocked(d.x,d.z),p.id);}
  for(const r of parkPaths){const n=Math.ceil(Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1])*4);for(let i=0;i<=n;i++)assert.ok(!blocked(r.a[0]+(r.b[0]-r.a[0])*i/n,r.a[1]+(r.b[1]-r.a[1])*i/n),JSON.stringify(r));}
});
