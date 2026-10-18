import {test,expect} from '@playwright/test';
import * as E from '../src/engine.js';
test('同じ海岸の四季の基礎差分を実画面で比較する（桜・祭り・降雪の完成確認ではない）',async({page})=>{
  await page.goto('/');
  for(const [month,name,label] of [[2,'spring','春'],[6,'summer','夏'],[9,'autumn','秋'],[0,'winter','冬']]){
    const s=E.fresh(new Date(2026,month,19));E.chooseHome(s,'home01');s.scene='town';s.pos={x:0,z:43};s.clock+=6*60;
    await page.locator('.tools [data-action="settings"]').click();
    await page.locator('#import').setInputFiles({name:'season.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
    await page.locator('[data-action="close"]').first().click();
    await expect(page.locator('.date')).toContainText(label);await page.waitForTimeout(1500);
    await page.screenshot({path:`evidence/art/season-${name}.png`});
  }
});
