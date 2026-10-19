import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as E from '../src/engine.js';
import {recordBrowser} from '../tools/recording.mjs';
const out='evidence/amenities';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('japan-life:v1')));
function fixture(x,z,yaw=0){const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,'home01');s.scene='town';s.pos={x,z};s.yaw=yaw;s.clock+=6*60;s.settings.shadows=false;return s;}
async function restore(p,s){
  await p.locator('.tools [data-action="settings"]').click();
  await p.locator('#import').setInputFiles({name:'amenity-check.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
  await p.locator('[data-action="close"]').first().click();
}
async function walk(p,x,z){
  for(const [axis,target,plus,minus] of [['x',x,'d','a'],['z',z,'s','w']]){
    let prev=Infinity,stuck=0;
    for(let i=0;i<100;i++){
      const s=await read(p),delta=target-s.pos[axis];if(Math.abs(delta)<.4)break;
      if(Math.abs(prev-s.pos[axis])<.025)stuck++;else stuck=0;
      if(stuck>8)throw Error('Walk blocked: '+JSON.stringify({target:[x,z],pos:s.pos}));
      prev=s.pos[axis];const key=delta>0?plus:minus,running=Math.abs(delta)>5;
      if(running)await p.keyboard.down('Shift');await p.keyboard.down(key);
      await p.waitForTimeout(Math.max(180,Math.min(800,Math.abs(delta)/(running?4.5:1.35)*1000)));
      await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
      await p.keyboard.up(key);if(running)await p.keyboard.up('Shift');
      if(i===99)throw Error('Walk timeout '+x+','+z);
    }
  }
}
test('自販機・回収箱・公園の遊具と夜の表示を実描画し、地図から自販機を案内できる',async({page})=>{
  await mkdir(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  for(const [name,x,z,yaw] of [['coast-vending',37.9,40.2,0],['park-entry',41,-56,Math.PI],['playground',43,-39,0],['park-bins',51.4,-50.5,0]]){
    const s=fixture(x,z,yaw);s.settings.shadows=true;await restore(page,s);await page.waitForTimeout(1200);await page.screenshot({path:out+'/'+name+'.png'});
  }
  const night=fixture(37.9,40.2);night.clock=291*1440+20*60;await restore(page,night);await page.waitForTimeout(1000);await page.screenshot({path:out+'/vending-night.png'});
  const before=await read(page);await page.keyboard.press('m');await expect(page.locator('.map-legend')).toContainText('自販機');await page.screenshot({path:out+'/map.png'});
  await page.locator('[data-action="route-vending"][data-id="park-vending"]').click();await expect(page.locator('.route')).toContainText('公園の自動販売機');expect((await read(page)).pos).toEqual(before.pos);
  expect(errors).toEqual([]);await writeFile(out+'/view-check.json',JSON.stringify({errors,method:'Separate legitimate save-import views for appearance, followed by actual M and route selection. No teleport during a walking route.'},null,2));
});
test('自販機で二種を買い、飲み物と空き容器を再開し、実際に歩いて缶とPETを回収箱へ戻す',async({page})=>{
  await mkdir(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  const old=fixture(37.9,38.8);old.worldVersion=4;delete old.outdoors;await restore(page,old);
  const before=await read(page);expect(before.outdoors.drinks).toEqual({coffee:0,tea:0});
  const stop=await recordBrowser(page,resolve(out,'buy-drink-recycle.mp4'));
  await expect(page.locator('#context')).toContainText('自動販売機');await page.keyboard.press('e');
  await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','vending');
  for(const id of ['coffee','tea'])await page.locator(`[data-action="buy-vending"][data-id="${id}"]`).click();
  await page.locator('[data-action="drink-vending"][data-id="coffee"]').click();await page.screenshot({path:out+'/vending-panel.png'});
  expect((await read(page)).money).toBe(before.money-260);
  await page.keyboard.press('Escape');await page.reload();await page.getByRole('button',{name:'暮らしの続きを歩く'}).click();
  const resumed=await read(page);expect(resumed.outdoors).toEqual({drinks:{coffee:0,tea:1},empties:{can:1,pet:0}});
  await page.keyboard.press('j');await page.locator('[data-action="drink-vending"][data-id="tea"]').click();await page.keyboard.press('Escape');
  await walk(page,36.5,38.8);await expect(page.locator('#context')).toContainText('回収箱');await page.keyboard.press('e');
  await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','recycle');
  for(const id of ['can','pet'])await page.locator(`[data-action="recycle-container"][data-id="${id}"]`).click();
  await expect(page.locator('#overlay')).toContainText('戻す空き容器はありません');await page.screenshot({path:out+'/recycle-panel.png'});
  const after=await read(page);expect(after.outdoors).toEqual({drinks:{coffee:0,tea:0},empties:{can:0,pet:0}});expect(after.money).toBe(before.money-260);
  for(const k of ['bag','home','furniture','jobs','debt'])expect(after[k]).toEqual(before[k]);
  const video=await stop();expect(errors).toEqual([]);await writeFile(out+'/vending-check.json',JSON.stringify({errors,video,cost:260,method:'E at real vending machine; purchase, drink, reload, J drink, physical walk to recovery bin, E and separate can/PET return. No position replacement between actions.'},null,2));
});
test('海辺から小公園へ連続して歩き、ベンチで休み、遊具と柵の衝突を保って入口を通れる',async({page})=>{
  test.setTimeout(300000);await mkdir(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await restore(page,fixture(6,39.1));
  const stop=await recordBrowser(page,resolve(out,'walk-to-park.mp4'));
  await walk(page,6,-50);await walk(page,41,-50);await walk(page,41,-55.5);await walk(page,41,-50);await walk(page,45,-50);
  await expect(page.locator('#context')).toContainText('ベンチ');await page.keyboard.press('e');await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','rest');await page.keyboard.press('Escape');
  await walk(page,41,-50);await walk(page,41,-40);await walk(page,35.7,-40);await walk(page,35.7,-42.8);
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(1500);await page.keyboard.up('w');await page.keyboard.up('Shift');expect((await read(page)).pos.z).toBeGreaterThan(-43.3);
  await walk(page,35.7,-40);await walk(page,49.6,-40);await walk(page,49.6,-41.2);
  await page.keyboard.down('w');await page.keyboard.down('Shift');await page.waitForTimeout(1500);await page.keyboard.up('w');await page.keyboard.up('Shift');expect((await read(page)).pos.z).toBeGreaterThan(-42.0);
  await page.screenshot({path:out+'/slide-collision.png'});
  await walk(page,49.6,-40);await walk(page,29.7,-40);await walk(page,29.7,-47);
  await page.keyboard.down('d');await page.waitForTimeout(1700);await page.keyboard.up('d');expect((await read(page)).pos.x).toBeLessThan(30.72);
  await walk(page,29.7,-50);await walk(page,41,-50);await walk(page,49.5,-50);await walk(page,49.5,-52.2);
  await expect(page.locator('#context')).toContainText('自動販売機');
  const video=await stop();expect(errors).toEqual([]);await writeFile(out+'/park-walk-check.json',JSON.stringify({errors,video,method:'One starting-state import at coast; all subsequent travel is physical Shift/WASD, regular E rest, real swing/slide/fence collisions and open entrances.'},null,2));
});
