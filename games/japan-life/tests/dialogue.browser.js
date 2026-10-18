import { test, expect } from "@playwright/test";
import * as E from "../src/engine.js";
import { residents, residentPosition } from "../src/data.js";
const read = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("japan-life:v1")));
async function fixture(p, s) {
  await p.addInitScript(
    (s) => localStorage.setItem("japan-life:v1", JSON.stringify(s)),
    s,
  );
  await p.goto("/");
  await p.getByRole("button", { name: "暮らしの続きを歩く" }).click();
  await p.keyboard.press("e");
}
function state() {
  const s = E.fresh(new Date(2026, 9, 19));
  E.chooseHome(s, "home01");
  s.settings.shadows = false;
  return s;
}
test("魚屋の話を選択せず読み進め、近所二人の発話者交替を同じ下中央の枠で読む", async ({
  page,
}) => {
  const s = state();
  s.scene = "port_fish";
  s.pos = { x: -2.7, z: 1.3 };
  await fixture(page, s);
  await expect(page.locator(".dialogue-line")).toContainText("今日のたこ");
  await expect(page.locator('[data-action="reply"]')).toHaveCount(0);
  await page.locator('[data-action="dialogue-next"]').click();
  await expect(page.locator(".dialogue-line")).toContainText("ゆっくり");
  await page.screenshot({ path: "evidence/art/dialogue-fish.png" });
  await page.locator('[data-action="dialogue-next"]').click();
  expect((await read(page)).history.p01.mode).toBe("read");
  expect((await read(page)).history.p01.choice).toBeNull();
  const neighbors = state();
  neighbors.clock = 291 * 1440 + 17.5 * 60;
  neighbors.scene = "town";
  neighbors.pos = { x: -34.5, z: -15.5 };
  await page.locator('.tools [data-action="settings"]').click();
  await page
    .locator("#import")
    .setInputFiles({
      name: "neighbors.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(neighbors)),
    });
  await page.locator('[data-action="close"]').click();
  await page.keyboard.press("e");
  await expect(page.locator(".dialogue-panel h1")).toContainText("隣人");
  await page.locator('[data-action="dialogue-next"]').click();
  await expect(page.locator(".dialogue-panel h1")).toContainText("料理好き");
  const bounds = await page.locator(".dialogue-panel").boundingBox();
  expect(bounds.y).toBeGreaterThan(250);
  await page.screenshot({ path: "evidence/art/dialogue-neighbors.png" });
});
test("任意の返答と相手の反応を同じ枠に保ち、150%とスマホ幅でも読む", async ({
  page,
}) => {
  const s = state(),
    p = residents.find((p) => p.id === "p28");
  for (let m = 360; m < 1320; m += 15) {
    const pos = residentPosition(p, 291 * 1440 + m);
    if (pos.scene === "town") {
      s.clock = 291 * 1440 + m;
      s.scene = "town";
      s.pos = { x: pos.x, z: pos.z + 0.85 };
      break;
    }
  }
  s.settings.textScale = 150;
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, s);
  await expect(page.locator(".dialogue-line")).toContainText(p.line);
  await page.locator('[data-action="dialogue-choose"]').click();
  await page.locator('[data-action="reply"]').first().click();
  await expect(page.locator(".dialogue-exchange")).toContainText(
    p.replies[0].text,
  );
  await expect(page.locator(".dialogue-exchange")).toContainText(
    p.replies[0].reaction,
  );
  expect(
    await page
      .locator(".dialogue-exchange p")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(30);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "evidence/art/dialogue-mobile-150.png" });
});
test("勤務の意思決定ははい・いいえで、閉じる・自動送りで勝手に勤務しない", async ({
  page,
}) => {
  const s = state();
  s.clock = 291 * 1440 + 10 * 60;
  s.scene = "market_cafe";
  s.pos = { x: -2.7, z: 1.3 };
  await fixture(page, s);
  await page.locator('[data-action="dialogue-next"]').click();
  await expect(page.locator('[data-action="work-yes"]')).toBeVisible();
  await page.locator('[data-action="work-no"]').click();
  await expect(page.locator(".dialogue-line")).toContainText(
    "また気が向いたら",
  );
  expect((await read(page)).cafe).toBeNull();
  await page.locator('[data-action="dialogue-next"]').click();
  await page.keyboard.press("e");
  await page.locator('[data-action="dialogue-auto"]').click();
  await page.waitForTimeout(800);
  await page.locator('[data-action="dialogue-auto"]').click();
  expect((await read(page)).cafe).toBeNull();
  const text=await page.locator('.dialogue-line').textContent();await page.waitForTimeout(6500);
  await expect(page.locator('.dialogue-line')).toHaveText(text);
  await page.locator('[data-action="dialogue-auto"]').click();
  await expect(page.locator('[data-action="work-yes"]')).toBeVisible({timeout:12000});
  await expect(page.locator('[data-action="dialogue-auto"]')).toHaveText('自動送り',{timeout:12000});
  expect((await read(page)).cafe).toBeNull();
});
