import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import * as E from "../src/engine.js";
const read = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("japan-life:v1")));

test("配布HTMLだけで3Dと歩行が起動し、外部通信なし・保存禁止でも進む", async ({
  page,
}) => {
  execFileSync("npm", ["run", "build"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
  });
  const html = readFileSync(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );
  expect(html).not.toMatch(/<script[^>]+src=/u);
  expect(html).not.toMatch(/<link[^>]+href="https?:/u);
  const url = "http://127.0.0.1:4180/packaged-game.html",
    requests = [],
    errors = [];
  await page.route(url, (route) =>
    route.fulfill({ contentType: "text/html; charset=utf-8", body: html }),
  );
  page.on("request", (r) => {
    if (/^https?:/u.test(r.url()) && r.url() !== url) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().setOffline(true);
  await page.goto(url);
  await page.getByRole("button", { name: "窓のある部屋を探す" }).click();
  await page
    .getByRole("button", { name: "この部屋で暮らす", exact: true })
    .click();
  await page.locator('.tools [data-action="settings"]').click();
  await page.locator("#shadows").uncheck();
  await page.locator('[data-action="close"]').click();
  await page.keyboard.press("e");
  const before = await read(page);
  await page.keyboard.down("d");
  await page.waitForTimeout(1000);
  await page.keyboard.up("d");
  expect((await read(page)).pos.x).toBeGreaterThan(before.pos.x);
  expect(await page.locator("#world canvas").count()).toBe(1);
  await page.screenshot({ path: "evidence/14-packaged-offline.png" });
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await page.evaluate(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  // 捕捉済みstorage自体の書込みも禁止して、確定後の継続を確認。
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="rest"]').click();
  await page.locator('[data-action="wait-hour"]').click();
  await expect(page.locator("#save-warning")).toContainText("保存できません");
});

test("建物の衝突と壁際の視点、壊れたセーブからの復旧案内", async ({ page }) => {
  const s = E.fresh(new Date(2026, 3, 1));
  E.chooseHome(s, "home01");
  s.scene = "town";
  s.pos = { x: 17, z: -4.4 };
  s.clock += 120;
  s.settings.shadows = false;
  await page.addInitScript(
    (s) => localStorage.setItem("japan-life:v1", JSON.stringify(s)),
    s,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "暮らしの続きを歩く" }).click();
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await page.waitForTimeout(1500);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  expect((await read(page)).pos.z).toBeGreaterThanOrEqual(-5.25);
  const canvas = page.locator("#world canvas");
  await canvas.click({ button: "right", position: { x: 600, y: 400 } });
  await page.mouse.move(600, 400);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(950, 440, { steps: 12 });
  await page.mouse.up({ button: "right" });
  await page.locator('.tools [data-action="map"]').click();
  await page.locator('[data-action="close"]').click();
  expect((await read(page)).yaw).not.toBe(0);
  await page.screenshot({ path: "evidence/15-wall-camera.png" });
  // 次の読み込みでは新規初期状態に進める（元の初期化スクリプトも更新する）。
  await page.addInitScript(() =>
    localStorage.setItem("japan-life:v1", "{broken"),
  );
  await page.reload();
  await expect(page.locator("#save-warning")).toContainText(
    "保存を読み込めません",
  );
  await page.getByRole("button", { name: "窓のある部屋を探す" }).click();
  await expect(page.locator(".room-card")).toHaveCount(3);
});


test("配布HTMLを実HTTPサーバーで開き、実際の旧v0.2記録から再開して歩ける",async({page})=>{
  const {createServer}=await import('node:http');
  const html=readFileSync(new URL('../dist/index.html',import.meta.url));
  const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    const old=JSON.parse(readFileSync(new URL('./fixtures/legacy-v0.2.json',import.meta.url),'utf8'));
    await page.addInitScript(s=>localStorage.setItem('japan-life:v1',JSON.stringify(s)),old);
    const external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))external.push(r.url());});
    await page.goto(origin);
    await page.getByRole('button',{name:'暮らしの続きを歩く'}).click();
    const current=await read(page);
    for(const key of ['clock','money','debt','furniture','wear','jobs','home','rentThrough','history','music'])expect(current[key]).toEqual(old[key]);
    expect(current.cafe.work.tray[0].drink).toBe('coffee');
    await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');
    await page.locator('.tools [data-action="settings"]').click();await page.locator('[data-action="close"]').first().click();
    expect((await read(page)).pos.z).toBeLessThan(old.pos.z);expect(external).toEqual([]);
    await page.screenshot({path:'evidence/art/packaged-legacy-http.png'});
  }finally{await new Promise(resolve=>server.close(resolve));}
});
