import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as E from '../src/engine.js';
import {recordBrowser} from '../tools/recording.mjs';
const out='evidence/streets';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('japan-life:v1')));
function fixture(x,z,yaw=0){const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,'home01');s.scene='town';s.pos={x,z};s.yaw=yaw;s.clock+=6*60;s.settings.shadows=false;return s;}
async function restore(p,s){
  await p.locator('.tools [data-action="settings"]').click();
  await p.locator('#import').setInputFiles({name:'street-check.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
  await p.locator('[data-action="close"]').first().click();
}
async function walk(p,x,z){
  for(const [axis,target,plus,minus] of [['x',x,'d','a'],['z',z,'s','w']]){
    let prev=Infinity,stuck=0;
    for(let i=0;i<100;i++){
      const s=await read(p),delta=target-s.pos[axis];if(Math.abs(delta)<.4)break;
      if(Math.abs(prev-s.pos[axis])<.025)stuck++;else stuck=0;
      if(stuck>8)throw Error('Walk blocked: '+JSON.stringify({target:[x,z],pos:s.pos}));
      prev=s.pos[axis];const key=delta>0?plus:minus;
      const running=Math.abs(delta)>5;if(running)await p.keyboard.down('Shift');await p.keyboard.down(key);
      await p.waitForTimeout(Math.max(180,Math.min(800,Math.abs(delta)/(running?4.5:1.35)*1000)));
      await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
      await p.keyboard.up(key);if(running)await p.keyboard.up('Shift');
      if(i===99)throw Error('Walk timeout '+x+','+z);
    }
  }
}
test('歩道を連続して歩き、横断歩道で商店街へ渡り、海岸の屋根付きバス停へ行って休める',async({page})=>{
  test.setTimeout(300000);await mkdir(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await restore(page,fixture(-1.8,39.1));
  const before=await read(page);const stop=await recordBrowser(page,resolve(out,'walk-sidewalk-bus.mp4'));
  for(const [x,z] of [[-1.8,3.6],[-5,3.6],[-5,-1.6],[-1.8,-1.6],[-1.8,-15.65],[-5,-15.65],[-5,-21.35],[-1.8,-22.6]])await walk(page,x,z);await page.screenshot({path:out+'/crosswalk.png'});
  await walk(page,6,-22.6);await walk(page,28,-20);await page.screenshot({path:out+'/pedestrian-street.png'});
  await walk(page,6,-20);await walk(page,6,39.1);await walk(page,42.4,39.1);await walk(page,42.4,37.8);
  await expect(page.locator('#context')).toContainText('バス停');
  await page.screenshot({path:out+'/bus-arrival.png'});
  const video=await stop();
  await page.keyboard.press('e');await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','rest');
  const after=await read(page);for(const k of ['money','furniture','home','jobs'])expect(after[k]).toEqual(before[k]);
  expect(errors).toEqual([]);
  await writeFile(out+'/walk-check.json',JSON.stringify({errors,video,route:[[-1.8,39.1],[-1.8,3.6],[-5,3.6],[-5,-1.6],[-1.8,-1.6],[-1.8,-15.65],[-5,-15.65],[-5,-21.35],[-1.8,-22.6],[6,-22.6],[28,-20],[6,-20],[6,39.1],[42.4,39.1],[42.4,37.8]],method:'One imported starting state; actual Shift/WASD movement with collisions, E opens rest menu. No position replacement along route.'},null,2));
});
test('海岸の左右の柵と歩行者道の終端で止まり、砂浜の開口と旧セーブの復旧を保つ',async({page})=>{
  await mkdir(out,{recursive:true});await page.goto('/');const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const x of [-45,40]){
    await restore(page,fixture(x,46.8));await page.keyboard.down('Shift');await page.keyboard.down('s');await page.waitForTimeout(1700);await page.keyboard.up('s');await page.keyboard.up('Shift');
    const s=await read(page);expect(s.pos.z).toBeGreaterThan(46.8);expect(s.pos.z).toBeLessThan(47.3);
  }
  await page.screenshot({path:out+'/coast-rail.png'});
  await restore(page,fixture(0,46.8));await walk(page,0,51);expect((await read(page)).pos.z).toBeGreaterThan(50.7);
  await restore(page,fixture(63.5,-20));await page.keyboard.down('d');await page.waitForTimeout(1700);await page.keyboard.up('d');expect((await read(page)).pos.x).toBeLessThan(64.7);
  await page.screenshot({path:out+'/pedestrian-end.png'});
  const old=fixture(-45,47.6);old.worldVersion=3;await restore(page,old);
  const current=await read(page);expect(current.worldVersion).toBe(5);expect(current.pos).not.toEqual(old.pos);
  for(const k of ['money','home','furniture','jobs','clock'])expect(current[k]).toEqual(old[k]);
  expect(errors).toEqual([]);
});
test('海岸の車道・歩道・待合所と町外へ続く道路を実画面と地図で確認する',async({page})=>{
  await mkdir(out,{recursive:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  for(const [name,x,z,yaw] of [['bus-stop',43,44,0],['coast-road',20,46.8,Math.PI/2],['hill-sidewalk',6,-35,0],['west-link',-40,-18.5,Math.PI/2],['road-outside',69,43,-Math.PI/2]]){
    const s=fixture(x,z,yaw);s.settings.shadows=true;await restore(page,s);await page.waitForTimeout(1200);await page.screenshot({path:out+'/'+name+'.png'});
  }
  await page.keyboard.press('m');await expect(page.locator('.map-legend')).toContainText('バス停');await page.screenshot({path:out+'/map.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/map-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(errors).toEqual([]);
  await writeFile(out+'/view-check.json',JSON.stringify({errors,method:'Separate legitimate save-import views, not a continuous walking route; actual WebGL frames, PC1280x800 and390x844.'},null,2));
});
