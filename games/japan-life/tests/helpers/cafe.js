import {expect} from '@playwright/test';
import {resolve} from 'node:path';
import {cafeOrders} from '../../src/data.js';
import {workStations} from '../../src/cafe-work.js';
import {recordBrowser} from '../../tools/recording.mjs';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('japan-life:v1')));
async function close(p){await p.locator('[data-action="close"]').first().click();}
export async function cafeWalk(p,x,z) {
  for(const [axis,target,plus,minus] of [['x',x,'d','a'],['z',z,'s','w']])for(let n=0;n<45;n++){
    const s=await read(p),d=target-s.pos[axis];if(Math.abs(d)<.13)break;
    const key=d>0?plus:minus;await p.keyboard.down(key);await p.waitForTimeout(Math.max(180,Math.min(800,Math.abs(d)/1.2*1000)));await p.keyboard.up(key);
    if(n===44)throw Error(`Cafe walking blocked at ${JSON.stringify((await read(p)).pos)} to ${x},${z}`);
  }
}
export async function useTool(p,id) {
  const station=workStations.find(t=>t.id===id);await cafeWalk(p,station.x,station.z);await expect(p.locator('#context')).toContainText(station.name);await p.keyboard.press('e');
}
export async function makeCup(p,order,{reload=false}={}) {
  await useTool(p,order.takeout?'paper':'ceramic');await useTool(p,order.drink);await useTool(p,order.drink);
  if(reload){const partial=await read(p);expect(partial.cafe.work.pouring.remaining).toBeGreaterThan(0);await p.reload();await p.getByRole('button',{name:'暮らしの続きを歩く'}).click();}
  await expect.poll(async()=>(await read(p)).cafe.work.machine?.cup?.drink,{timeout:10000}).toBe(order.drink);await useTool(p,order.drink);
  if(reload)await p.screenshot({path:'evidence/art/cafe-filled-paper-cup.png'});
  if(order.takeout)await useTool(p,'lid');await useTool(p,'tray');
}
export async function completeShift(p,{record=false}={}) {
  // Walk around the actual counter; no coordinate fixture inside the work loop.
  await cafeWalk(p,-3.3,1.4);await cafeWalk(p,-3.3,-1.9);
  const stop=record?await recordBrowser(p,resolve('evidence/art/cafe-make-and-serve.mp4')):null;
  const before=await read(p);
  for(let i=before.cafe.step;i<4;i++){
    const order=cafeOrders[i];for(let n=0;n<order.qty;n++)await makeCup(p,order,{reload:record&&i===2&&n===0});
    if(order.milk){await useTool(p,'pitcher');await useTool(p,'milk');await useTool(p,'tray');}
    await useTool(p,'tray');if(i===0){await expect(p.locator('#work-note span')).toContainText('トレー');await p.screenshot({path:'evidence/art/cafe-carry-tray.png'});}await useTool(p,'serve');
    if(i===0){await p.screenshot({path:'evidence/art/cafe-first-customer.png'});if(stop)console.log('Actual cafe video:',await stop());}
    if(i<3)await close(p);
  }
  const end=await read(p);expect(end.cafe.done).toBe(true);expect(end.money).toBe(before.money+2000);expect(end.clock).toBe(before.clock+120);
  await p.screenshot({path:'evidence/art/cafe-shift-complete.png'});
}
