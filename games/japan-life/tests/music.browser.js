import { test, expect } from "@playwright/test";
import * as E from "../src/engine.js";
import {residents,residentPosition} from "../src/data.js";

const read = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("japan-life:v1")));
const home = () => {
  const s = E.fresh(new Date(2026, 3, 1));
  E.chooseHome(s, "home01");
  s.settings.shadows = false;
  return s;
};
async function begin(page, s = home()) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem("japan-life:v1"))
      localStorage.setItem("japan-life:v1", JSON.stringify(s));
  }, s);
  await page.goto("/");
  await page.getByRole("button", { name: "暮らしの続きを歩く" }).click();
  await page.locator('.tools [data-action="settings"]').click();
}
async function restore(page, s) {
  if (!(await page.locator("#import").count()))
    await page.locator('.tools [data-action="settings"]').click();
  await page.locator("#import").setInputFiles({
    name: "music-state.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
}
async function track(page, id) {
  await expect(page.locator("#music-status")).toHaveAttribute("data-track", id);
}
async function instrument(page) {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.__audioContexts = [];
    window.AudioContext = class extends Native {
      constructor(...args) {
        super(...args);
        this.__gains = [];
        window.__audioContexts.push(this);
      }
      createGain() {
        const gain = super.createGain();
        this.__gains.push(gain);
        return gain;
      }
    };
  });
}

test("実音源5曲を復号し、場所切替・同曲継続・ラジオ試聴取消・選曲保存と消音復帰", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await instrument(page);
  await begin(page);
  await track(page, "jp_home_default");
  await expect(page.locator("#music-status")).toHaveAttribute(
    "data-running",
    "true",
  );
  await page.locator('[data-action="radio"]').click();
  await expect(page.locator('[data-action="choose-track"]')).toHaveCount(1);
  await expect(page.locator('[data-action="preview-track"]')).toHaveCount(0);
  const s = home();
  s.scene = "town";
  s.pos = { x: 0, z: 0 };
  await restore(page, s);
  await track(page, "jp_town_day");
  const start = await page.locator("#music-status").getAttribute("data-start");
  s.pos = { x: 30, z: 0 };
  await restore(page, s);
  await track(page, "jp_town_day");
  expect(await page.locator("#music-status").getAttribute("data-start")).toBe(
    start,
  );
  s.clock = 90 * 1440 + 18 * 60;
  await restore(page, s);
  await track(page, "jp_town_night");
  s.clock = 90 * 1440 + 10 * 60;
  s.scene = "market_cafe";
  s.pos = { x: 0, z: 2 };
  await restore(page, s);
  await track(page, "jp_shop_calm");
  s.scene = "market_grocery";
  await restore(page, s);
  await track(page, "jp_shop_lively");
  const shopStart = await page
    .locator("#music-status")
    .getAttribute("data-start");
  s.scene = "market_clothes";
  await restore(page, s);
  await track(page, "jp_shop_lively");
  expect(await page.locator("#music-status").getAttribute("data-start")).toBe(
    shopStart,
  );
  const owned = home();
  owned.furniture.push({ uid: "test-radio", kind: "f25", at: null });
  await restore(page, owned);
  await track(page, "jp_home_default");
  await page.locator('[data-action="radio"]').click();
  await page
    .locator('[data-action="preview-track"][data-id="jp_shop_calm"]')
    .click();
  await track(page, "jp_shop_calm");
  expect((await read(page)).music.homeTrack).toBe("jp_home_default");
  await page.locator('[data-action="cancel-preview"]').click();
  await track(page, "jp_home_default");
  await page
    .locator('[data-action="choose-track"][data-id="jp_town_night"]')
    .click();
  await track(page, "jp_town_night");
  await page.locator('[data-action="stop-home-music"]').click();
  await track(page, "");
  await page
    .locator('[data-action="choose-track"][data-id="jp_shop_calm"]')
    .click();
  await track(page, "jp_shop_calm");
  await page.locator('.tools [data-action="settings"]').click();
  await page.locator("#musicMuted").check();
  await expect(page.locator("#music-status")).toHaveAttribute(
    "data-level",
    "0",
  );
  const saved = await read(page);
  await page.reload();
  await page.getByRole("button", { name: "暮らしの続きを歩く" }).click();
  await page.locator('.tools [data-action="settings"]').click();
  await expect(page.locator("#musicMuted")).toBeChecked();
  await expect(page.locator("#music-status")).toHaveAttribute(
    "data-level",
    "0",
  );
  expect((await read(page)).music).toEqual(saved.music);
  await page.locator("#musicMuted").uncheck();
  await track(page, "jp_shop_calm");
  await page.waitForTimeout(1200);
  await expect(page.locator("#music-status")).toHaveAttribute(
    "data-active",
    "1",
  );
  // 実際のWebAudioで復号したバッファが、metadataどおりの秒数を持つことは単体でも照合。
  expect(await page.evaluate(() => window.__audioContexts[0].state)).toBe(
    "running",
  );
  expect(errors).toEqual([]);
});

test("実WebAudioの音量をTTS開始で下げ、終了・取消・失敗で戻し、非表示中は停止", async ({
  page,
}) => {
  await instrument(page);
  await page.addInitScript(() => {
    window.SpeechSynthesisUtterance = class {};
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { lang: "ja-JP", voiceURI: "test-ja", name: "検証用" },
        ],
        addEventListener() {},
        cancel() {},
        speak(u) {
          window.__spoken = u;
        },
      },
    });
  });
  const s = home();
  s.scene = "town";
  const neighbor=residents.find(p=>p.id==="p33");
  s.clock=291*1440+17.5*60;
  const pos=residentPosition(neighbor,s.clock);
  s.pos={x:pos.x,z:pos.z+.8};
  await begin(page, s);
  await track(page, "jp_town_day");
  await page.locator('[data-action="close"]').click();
  await page.keyboard.press("e");
  await expect(page.locator(".panel h1")).toContainText("隣人");
  const gain = () =>
    page.evaluate(() => window.__audioContexts[0].__gains[0].gain.value);
  await page.locator('[data-action="speak"]').click();
  await expect.poll(gain).toBeLessThan(0.08);
  await page.evaluate(() => window.__spoken.onend());
  await expect.poll(gain).toBeGreaterThan(0.25);
  await page.locator('[data-action="speak"]').click();
  await expect.poll(gain).toBeLessThan(0.08);
  await page.locator('[data-action="stop-speech"]').click();
  await expect.poll(gain).toBeGreaterThan(0.25);
  await page.locator('[data-action="speak"]').click();
  await expect.poll(gain).toBeLessThan(0.08);
  await page.evaluate(() => window.__spoken.onerror());
  await expect.poll(gain).toBeGreaterThan(0.25);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__audioContexts[0].state))
    .toBe("suspended");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__audioContexts[0].state))
    .toBe("running");
});

for (const failure of ["再生拒否", "音源破損"])
  test(`${failure}を案内し、無音でも生活を続ける`, async ({ page }) => {
    await page.addInitScript((failure) => {
      if (failure === "再生拒否")
        AudioContext.prototype.resume = () => Promise.reject(Error("policy"));
      else
        AudioContext.prototype.decodeAudioData = () =>
          Promise.reject(Error("invalid audio"));
    }, failure);
    await begin(page);
    await expect(page.locator("#music-status")).toContainText(
      failure === "再生拒否" ? "開始できません" : "読み込めません",
    );
    await page.locator('[data-action="close"]').click();
    await page.locator('.tools [data-action="journal"]').click();
    await page.locator('[data-action="rest"]').click();
    await page.locator('[data-action="wait-hour"]').click();
    const before = (await read(page)).clock;
    await page.locator('[data-action="wait-hour"]').click();
    expect((await read(page)).clock).toBe(before + 60);
  });
