import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import * as E from "../src/engine.js";
import { recordBrowser } from "../tools/recording.mjs";
const read = (p) =>
  p.evaluate(() => JSON.parse(localStorage.getItem("japan-life:v1")));
async function close(p) {
  await p.locator('[data-action="close"]').click();
}
async function restore(p, s) {
  await p.locator('.tools [data-action="settings"]').click();
  await p
    .locator("#import")
    .setInputFiles({
      name: "art-state.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(s)),
    });
  await close(p);
}
async function walk(p, x, z) {
  for (const [axis, target, plus, minus] of [
    ["x", x, "d", "a"],
    ["z", z, "s", "w"],
  ])
    for (let i = 0; i < 140; i++) {
      const s = await read(p),
        delta = target - s.pos[axis];
      if (Math.abs(delta) < 0.45) break;
      const key = delta > 0 ? plus : minus;
      await p.keyboard.down("Shift");
      await p.keyboard.down(key);
      await p.waitForTimeout(
        Math.max(250, Math.min(900, (Math.abs(delta) / 4.5) * 1000)),
      );
      await p.keyboard.up(key);
      await p.keyboard.up("Shift");
      if (i === 139) throw Error(`Physical walk did not reach ${x},${z}`);
    }
}
test("R1 秋の海岸から坂を上り丘の自宅まで実歩行し、関節と高さ・昼夕夜を記録", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const s = E.fresh(new Date(2026, 9, 19));
  E.chooseHome(s, "home01");
  s.scene = "town";
  s.pos = { x: 0, z: 43 };
  s.clock += 6 * 60;
  await page.addInitScript((s) => {
    if (!localStorage.getItem("japan-life:v1"))
      localStorage.setItem("japan-life:v1", JSON.stringify(s));
  }, s);
  await page.goto("/");
  await page.getByRole("button", { name: "暮らしの続きを歩く" }).click();
  const canvas = page.locator("#world canvas");
  await expect(canvas).toHaveAttribute("data-gait", "idle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "evidence/art/coast-autumn-day.png" });
  const initialHeight = Number(await canvas.getAttribute("data-height"));
  const stop = await recordBrowser(
    page,
    resolve("evidence/art/walk-coast-hill.mp4"),
  );
  await page.keyboard.down("w");
  await expect(canvas).toHaveAttribute("data-gait", "walk");
  await page.waitForTimeout(1500);
  await page.keyboard.up("w");
  await expect(canvas).toHaveAttribute("data-gait", "idle");
  await walk(page, 0, -20.7);
  await walk(page, -43, -20.7);
  const final = await read(page),
    height = Number(await canvas.getAttribute("data-height"));
  expect(height - initialHeight).toBeGreaterThan(5);
  expect(final.scene).toBe("town");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "evidence/art/hill-autumn-day.png" });
  console.log("Actual browser video:", await stop());
  // A fixed position and framing compare the light, rather than swapping an illustration.
  final.clock = 291 * 1440 + 17.5 * 60;
  await restore(page, final);
  await page.waitForTimeout(900);
  await page.screenshot({ path: "evidence/art/hill-autumn-evening.png" });
  final.clock = 291 * 1440 + 20 * 60;
  await restore(page, final);
  await page.waitForTimeout(900);
  await page.screenshot({ path: "evidence/art/hill-autumn-night.png" });
  final.clock = 291 * 1440 + 14 * 60;
  final.yaw = Math.PI;
  await restore(page, final);
  await page.waitForTimeout(900);
  await page.screenshot({ path: "evidence/art/hill-to-sea.png" });
  expect(errors).toEqual([]);
});
