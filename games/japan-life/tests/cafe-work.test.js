import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as C from '../src/cafe-work.js';
import {cafeOrders} from '../src/data.js';
function cafe(){const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,'home01');s.clock+=120;s.scene='market_cafe';E.beginCafe(s);return s;}
function use(s,id){const t=C.workStations.find(t=>t.id===id);s.pos={x:t.x,z:t.z};return C.toolAction(s,id);}
function makeCup(s,type,container='ceramic') {use(s,container);use(s,type);use(s,type);C.tickWork(s,3);use(s,type);if(container==='paper')use(s,'lid');use(s,'tray');}
test('現地の棚と器具で作り、カップが一箇所だけにあり抽出途中も復元する',()=>{
  const s=cafe();s.pos={x:0,z:3};assert.throws(()=>C.toolAction(s,'ceramic'));use(s,'ceramic');assert.equal(s.cafe.work.hand.container,'ceramic');use(s,'coffee');assert.equal(s.cafe.work.hand,null);use(s,'coffee');C.tickWork(s,1);
  const resumed=E.parse(JSON.stringify(s));assert.ok(resumed.cafe.work.pouring.remaining>1);assert.equal(resumed.cafe.work.machine.cup.drink,null);C.tickWork(resumed,2);use(resumed,'coffee');assert.equal(resumed.cafe.work.hand.drink,'coffee');C.validateWork(resumed.cafe.work);
});
test('四客を器具・紙カップ二杯・別添え容器で提供し、時間と報酬を一度だけ処理',()=>{
  const s=cafe(),before=structuredClone(s);
  for(const order of cafeOrders){for(let n=0;n<order.qty;n++)makeCup(s,order.drink,order.takeout?'paper':'ceramic');if(order.milk){use(s,'pitcher');use(s,'milk');use(s,'tray');}use(s,'tray');use(s,'serve');E.prepareOrder(s,C.trayOrder(s));E.serveOrder(s);E.validate(s);}
  assert.equal(s.money,before.money+2000);assert.equal(s.clock,before.clock+120);assert.equal(s.stats.worked,1);assert.throws(()=>E.serveOrder(s));
});
test('間違った容器・混ぜたミルク・ふた無しを修正でき、勤務状態の重複を拒否',()=>{
  const s=cafe();makeCup(s,'tea','paper');use(s,'tray');let copy=structuredClone(s);copy.cafe.work.tray[0].lidded=false;assert.throws(()=>C.trayOrder(copy));copy=structuredClone(s);copy.cafe.work.tray[0].milkInside=true;assert.throws(()=>C.trayOrder(copy));
  copy=structuredClone(s);copy.cafe.work.hand=copy.cafe.work.tray[0];assert.throws(()=>E.parse(JSON.stringify(copy)));
  const money=s.money;use(s,'discard');assert.equal(s.money,money);assert.equal(s.cafe.step,0);assert.equal(s.cafe.work.tray.length,0);
  delete s.cafe.work;E.prepareOrder(s,{drink:'coffee',qty:1,milk:false,takeout:false});const old=E.parse(JSON.stringify(s));assert.equal(old.cafe.work.tray[0].drink,'coffee');assert.equal(old.cafe.step,0);
});
test('季節の任意移行で期限の残り・お金・未払いを保持し、聞く会話を選択と区別',()=>{
  const s=cafe();E.acceptJob(s,'d01');s.debt=400;const remaining=s.jobs[0].deadline-s.clock,money=s.money;E.alignCalendar(s,new Date(2026,3,1));assert.equal(s.jobs[0].deadline-s.clock,remaining);assert.equal(s.money,money);assert.equal(s.debt,400);assert.equal(E.calendar(s.clock).month,4);E.recordReading(s,'p01');assert.equal(s.history.p01.mode,'read');assert.equal(s.history.p01.choice,null);E.validate(s);
});
