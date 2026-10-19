import {test,expect} from '@playwright/test';
import * as E from '../src/engine.js';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('japan-life:v1')));
async function restore(p,s){
  await p.locator('.tools [data-action="settings"]').click();
  await p.locator('#import').setInputFiles({name:'rural-check.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
  await p.locator('[data-action="close"]').first().click();
}
function fixture(x,z){const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,'home01');s.scene='town';s.pos={x,z};s.clock+=6*60;s.settings.shadows=false;return s;}
test('追加した住宅の塀・駐車車両は実際に衝突し、門から既存の自宅と配達先へ歩いて近づける',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await restore(page,fixture(-36.4,-26.5));
  const canvas=page.locator('#world canvas');
  await page.keyboard.down('a');await page.waitForTimeout(2000);await page.keyboard.up('a');
  const wall=await read(page);expect(wall.pos.x).toBeGreaterThan(-37.2);expect(wall.pos.x).toBeLessThan(-36.4);
  await restore(page,fixture(-32,37.3));
  await page.keyboard.down('w');await page.waitForTimeout(2000);await page.keyboard.up('w');
  expect((await read(page)).pos.z).toBeGreaterThan(36);
  await restore(page,fixture(-43,-18.8));
  await page.keyboard.down('w');await page.waitForTimeout(1800);await page.keyboard.up('w');
  await expect(page.locator('#context')).toContainText('陽だまり');
  await page.keyboard.press('e');await expect.poll(async()=>(await read(page)).scene).toBe('home01');
  await page.keyboard.press('e');await expect.poll(async()=>(await read(page)).scene).toBe('town');
  await restore(page,fixture(-59,-40.5));
  await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
  await expect(page.locator('#context')).toContainText('汐坂二丁目1番');
  await page.keyboard.press('e');await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','delivery');
  expect(errors).toEqual([]);await page.screenshot({path:'evidence/rural/gate-delivery.png'});
});
test('読める地図から道案内を選び、P/Jメニューと390px幅でも位置・保存・ボタンを保つ',async({page})=>{
  await page.goto('/');await restore(page,fixture(0,43));
  const before=await read(page);await page.keyboard.press('m');
  await expect(page.locator('.town-map-view svg')).toBeVisible();
  await expect(page.locator('.map-destinations .map-place')).toHaveCount(13);
  await page.waitForTimeout(1000);expect((await read(page)).pos).toEqual(before.pos);
  await page.screenshot({path:'evidence/rural/map.png'});
  await page.locator('.map-destinations [data-id="market_grocery"]').click();
  await expect(page.locator('.route')).toContainText('こめのや');expect((await read(page)).pos).toEqual(before.pos);
  await page.keyboard.press('p');await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','phone');
  await page.keyboard.press('Escape');await page.keyboard.press('j');await expect(page.locator('#overlay [role="dialog"]')).toHaveAttribute('aria-label','journal');
  await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await page.keyboard.press('m');
  const box=await page.locator('.map-panel').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.height).toBeGreaterThan(750);
  await page.screenshot({path:'evidence/rural/map-mobile.png'});
  await page.locator('.map-destinations [data-id="home01"]').click();await expect(page.locator('.route')).toContainText('陽だまり');
  await page.reload();await page.getByRole('button',{name:'暮らしの続きを歩く'}).click();
  const after=await read(page);expect(after.home).toBe(before.home);expect(after.furniture).toEqual(before.furniture);expect(after.money).toBe(before.money);
});
