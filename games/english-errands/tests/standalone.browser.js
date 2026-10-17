import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { STORAGE_KEY } from "../src/storage.js";

const file = new URL("../dist/english-errands.html", import.meta.url);
// 管理Chromiumのfile://はポリシーで禁止されている。
// 許可されたループバックURLのHTTP応答として同じHTMLを渡し、外部依存を検証する。
const testURL = "http://127.0.0.1:4173/standalone-test.html";
async function openStandalone(page) {
  await page.route(testURL, route => route.fulfill({ contentType: "text/html; charset=utf-8", body: readFileSync(fileURLToPath(file), "utf8") }));
  await page.context().setOffline(true);
  await page.goto(testURL);
}
test.beforeAll(() => execFileSync(process.execPath, [fileURLToPath(new URL("../build-standalone.mjs", import.meta.url))]));

test("単一HTMLの応答だけで外部通信なしに6件配達・再開・図鑑を操作できる", async ({ page }) => {
  const errors = [], requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/^https?:/u.test(request.url()) && request.url() !== testURL) requests.push(request.url()); });
  await openStandalone(page);
  await page.getByRole("button", { name: /おつかいをはじめる/u }).click();
  await page.getByRole("button", { name: /確認した · お店に立つ/u }).click();
  for (let n = 0; n < 6; n++) {
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
    const a = state.session.current;
    await page.locator(`[data-choice="${a.itemId}"]`).click();
    await page.getByRole("button", { name: "お手本を見る", exact: true }).click();
    if (n === 0) {
      await page.reload();
      await page.getByRole("button", { name: /つづきから届ける/u }).click();
      await expect(page.locator("#model-guide")).toBeVisible();
    }
    const word = await page.locator(".model-word").textContent();
    for (const char of word) await page.locator(`[data-key="${char}"]`).click();
    await page.locator('[data-key="Enter"]').click();
    await page.getByRole("button", { name: "お客さんに渡す →" }).click();
    await page.locator('[data-action="next"]').click();
  }
  await expect(page.getByRole("heading", { name: /6つの「ありがとう」が/u })).toBeVisible();
  await page.getByRole("button", { name: "図鑑", exact: true }).click();
  await expect(page.locator(".two-images img")).toHaveCount(24);
  await expect.poll(() => page.locator(".two-images img").evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("単一HTMLは外部スクリプト・画像・CSSを参照せず、保存禁止でも起動する", async ({ page }) => {
  const html = readFileSync(fileURLToPath(file), "utf8");
  expect(html).not.toMatch(/<script[^>]+src=/u);
  expect(html).not.toMatch(/<link[^>]+stylesheet/u);
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); });
  await openStandalone(page);
  await page.getByRole("button", { name: /おつかいをはじめる/u }).click();
  await page.getByRole("button", { name: /確認した · お店に立つ/u }).click();
  await expect(page.locator(".choices button")).toHaveCount(3);
  await expect(page.locator("#storage-notice")).toContainText("保存できません");
});
