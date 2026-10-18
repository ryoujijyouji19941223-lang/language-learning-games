import {test,expect} from '@playwright/test';
import * as E from '../src/engine.js';
import {completeShift} from './helpers/cafe.js';
test('R3 実際にカップと器具を扱い四客へ提供し、紙カップ二杯・別添え・抽出中の再開を確認',async({page})=>{
  const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,'home01');s.scene='market_cafe';s.pos={x:0,z:1.4};s.clock+=120;
  await page.addInitScript(s=>{if(!localStorage.getItem('japan-life:v1'))localStorage.setItem('japan-life:v1',JSON.stringify(s));},s);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:'暮らしの続きを歩く'}).click();await page.keyboard.press('e');await page.locator('#overlay [data-action="cafe"]').click();await page.locator('[data-action="start-cafe"]').click();
  await expect(page.locator('#drink')).toHaveCount(0);await completeShift(page,{record:true});expect(errors).toEqual([]);
});
