import { test, expect } from "@playwright/test";
import * as E from "../src/engine.js";
import {
  recipes,
  destinations,
  residents,
  homes,
  residentPosition,
} from "../src/data.js";
import {conversationFor} from "../src/dialogue.js";
import {completeShift} from "./helpers/cafe.js";
const read = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("japan-life:v1")));
async function close(page) {
  if (await page.locator('[data-action="close"]').count())
    await page.locator('[data-action="close"]').first().click();
}
async function begin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "窓のある部屋を探す" }).click();
  for (const id of ["home02", "home03", "home01"])
    await page.locator(`[data-action="preview"][data-id="${id}"]`).click();
  await page
    .getByRole("button", { name: "この部屋で暮らす", exact: true })
    .click();
  // ソフトウェア描画の検証機で影をオフにする。移動・3D・衝突はそのまま検証する。
  await page.locator('.tools [data-action="settings"]').click();
  await page.locator("#shadows").uncheck();
  await close(page);
}
async function walk(page, x, z) {
  for (const [axis, target, positive, negative] of [
    ["x", x, "d", "a"],
    ["z", z, "s", "w"],
  ]) {
    let stuck = 0;
    for (let n = 0; n < 100; n++) {
      const s = await read(page),
        delta = target - s.pos[axis];
      if (Math.abs(delta) < (s.scene === "town" ? 0.75 : 0.15)) break;
      const key = delta > 0 ? positive : negative,
        running=s.scene === "town"&&Math.abs(delta)>6,
        duration = Math.max(
          250,
          Math.min(
            1000,
            (Math.abs(delta) / (s.scene === "town" ? (running?4.5:1.35) : 1.2)) * 1000,
          ),
        );
      if(running)await page.keyboard.down("Shift");
      await page.keyboard.down(key);
      await page.waitForTimeout(s.scene==="town"&&!running?Math.min(250,duration):duration);
      // A short tap can fall entirely between software-GPU frames. Wait for an actual simulation frame.
      if(s.scene==="town")await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
      await page.keyboard.up(key);
      if(running)await page.keyboard.up("Shift");
      const after = await read(page);
      if (Math.abs(after.pos[axis] - s.pos[axis]) < 0.015) stuck++;
      else stuck = 0;
      if(stuck===3&&s.scene==='town'){
        const now=await read(page),neighbor=residents.map(p=>residentPosition(p,now.clock)).find(p=>p.scene==='town'&&Math.hypot(p.x-now.pos.x,p.z-now.pos.z)<1.6);
        if(neighbor){
          // Physically step around a pedestrian; collision remains enabled.
          const side=axis==='z'?(neighbor.x>now.pos.x?'a':'d'):(neighbor.z>now.pos.z?'w':'s');
          await page.keyboard.down(side);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())));
          await page.keyboard.up(side);stuck=0;
        }
      }
      if (stuck >= 6)
        throw Error(
          `Walk blocked in ${s.scene} at ${JSON.stringify(s.pos)}, target ${x},${z}`,
        );
      if (n === 99) throw Error("Walking did not reach destination");
    }
  }
}
async function shop(page, id) {
  await page.keyboard.press("e");
  await expect.poll(async () => (await read(page)).scene).toBe(id);
  await walk(page, 0, 1.4);
  await page.keyboard.press("e");
  await expect(page.locator('#overlay [role="dialog"]')).toBeVisible();
}
async function leaveShop(page) {
  await close(page);
  const leaving=await read(page);
  if(leaving.scene==="market_cafe"&&leaving.pos.z<-.5){
    await walk(page,-3.3,-1.9);await walk(page,-3.3,2.8);
  }
  await walk(page, 0, 3.7);
  await page.keyboard.press("e");
  await expect.poll(async () => (await read(page)).scene).toBe("town");
}
async function buy(page, id, qty = 1) {
  await page.locator(`#qty-${id}`).fill(String(qty));
  await page.locator(`[data-action="buy"][data-id="${id}"]`).click();
}
async function fixture(page, state) {
  await page.addInitScript(
    (s) => localStorage.setItem("japan-life:v1", JSON.stringify(s)),
    state,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "暮らしの続きを歩く" }).click();
}

test("実際に歩き、三室内見→買い物→勤務→二件配達→部屋と料理→睡眠・再開を一巡", async ({
  page,
}) => {
  test.setTimeout(600000); // Full physical errands plus four hands-on customers on software rendering.
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page);
  expect((await read(page)).inspected).toHaveLength(3);
  await page.screenshot({ path: "evidence/04-contract-room.png" });
  await page.keyboard.press("e");
  await expect.poll(async () => (await read(page)).scene).toBe("town");
  // 住宅地の公道を歩き、商店街の実際の入口へ。
  await walk(page, 0, -20.7);
  await walk(page, 0, -4.4);
  await walk(page, 17, -4.4);
  await shop(page, "market_grocery");
  await buy(page, "rice");
  await buy(page, "mirin");
  await buy(page, "sake_cook");
  await page.screenshot({ path: "evidence/05-shopping.png" });
  await leaveShop(page);
  console.log("CHECKPOINT: walked into grocery and bought ingredients");
  // 開店まで待ってから、喫茶店に徒歩で移動。
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="rest"]').click();
  await page.locator('[data-action="wait-hour"]').click();
  await close(page);
  await walk(page, 0, -4.4);
  // Use the wide seafront promenade, with clearance from the café corner.
  await walk(page, 0, 43);
  await walk(page, -7, 43);
  await walk(page, -7, 39.8);
  await shop(page, "market_cafe");
  await page.locator('#overlay [data-action="cafe"]').click();
  await page.locator('[data-action="start-cafe"]').click();
  await completeShift(page);
  await page.screenshot({ path: "evidence/06-cafe-work.png" });
  await leaveShop(page);
  console.log("CHECKPOINT: four café customers, paid once");
  // 二件受注して、別々の店で集荷。
  await page.locator('.tools [data-action="phone"]').click();
  for (const id of ["d01", "d02"])
    await page.locator(`[data-action="accept"][data-id="${id}"]`).click();
  await close(page);
  await walk(page, -7, 43);
  await walk(page, 0, 43);
  await walk(page, 0, -4.4);
  await walk(page, 17, -4.4);
  await shop(page, "market_grocery");
  await page.locator('[data-action="pickup"][data-id="d01"]').click();
  await leaveShop(page);
  await walk(page, 0, -4.4);
  await walk(page, 0, 43);
  await walk(page, -24, 43);
  await walk(page, -24, 38.7);
  await shop(page, "port_fish");
  await buy(page, "tako_boiled");
  await page.locator('[data-action="pickup"][data-id="d02"]').click();
  await leaveShop(page);
  await walk(page,-24,43);
  await page.screenshot({ path: "evidence/07-harbour-parcel.png" });
  await walk(page, 0, 43);
  // Approach the south-facing door from the public lane, not through the house.
  await walk(page, 0, -3.4);
  await walk(page, -61, -3.4);
  await walk(page, destinations[0].x, destinations[0].z);
  await page.keyboard.press("e");
  await page.locator('[data-action="finish-job"][data-id="d01"]').click();
  await close(page);
  await walk(page, -61, -3.4);
  await walk(page, -55, -3.4);
  await walk(page, -55, -20.7);
  await walk(page, -54, -20.7);
  await walk(page, destinations[1].x, destinations[1].z);
  await page.keyboard.press("e");
  await page.locator('[data-action="finish-job"][data-id="d02"]').click();
  expect((await read(page)).stats.delivered).toBe(2);
  await page.screenshot({ path: "evidence/08-delivery.png" });
  await close(page);
  console.log(
    "CHECKPOINT: collected at two shops, walked to recipients, delivered twice",
  );
  // 家具と服を買う。公道を回って入口まで。
  await walk(page, -54, -20.7);
  await walk(page, 0, -20.7);
  await walk(page, 0, -26.6);
  await walk(page, 17, -26.6);
  await shop(page, "market_furniture");
  for (const id of ["f13", "f09", "f23", "f25"]) await buy(page, id);
  await leaveShop(page);
  await walk(page, 35, -26.6);
  await shop(page, "market_clothes");
  await buy(page, "c02");
  await leaveShop(page);
  await walk(page, 0, -26.6);
  await walk(page, 0, -20.7);
  await walk(page, -43, -20.7);
  await page.keyboard.press("e");
  await expect.poll(async () => (await read(page)).scene).toBe("home01");
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="wardrobe"]').click();
  await page.locator('[data-action="equip"][data-id="c02"]').click();
  expect((await read(page)).wear.top).toBe("c02");
  await close(page);
  // 台所まで室内を歩き、日常料理と地域料理を手順・手操作で調理。
  await walk(page, 1.75, 1.4);
  await walk(page, 0.5, 1.4);
  await page.keyboard.press("e");
  for (const id of ["r01", "r05"]) {
    const recipe = recipes.find((r) => r.id === id),
      form = page.locator(`form[data-recipe="${id}"]`);
    for (const ingredient of Object.keys(recipe.need))
      await form.locator(`input[value="${ingredient}"]`).check();
    await form.locator('[data-action="start-cook"]').click();
    while (!(await read(page)).cooking.done)
      await page.locator('[data-action="cook-step"]').click();
  }
  expect((await read(page)).stats.cooked).toBe(2);
  await page.screenshot({ path: "evidence/09-cooking.png" });
  await page.locator('[data-action="eat"][data-id="r05"]').click();
  await close(page);
  console.log("CHECKPOINT: cooked rice and regional octopus rice, ate meal");
  // 壁と床の編集、回転、取消、保管と机上アンカー。
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="furnish"]').click();
  const s = await read(page),
    poster = s.furniture.find((i) => i.kind === "f13").uid,
    plant = s.furniture.find((i) => i.kind === "f09").uid,
    mug = s.furniture.find((i) => i.kind === "f23").uid;
  await page
    .locator(`[data-action="edit-furniture"][data-id="${poster}"]`)
    .click();
  await page.locator('[data-action="confirm-furniture"]').click();
  const wall = structuredClone(
    (await read(page)).furniture.find((i) => i.uid === poster).at,
  );
  await page
    .locator('[data-action="edit-furniture"][data-id="starter-desk"]')
    .click();
  await page
    .locator('[data-action="floor-cell"][data-x="0"][data-z="2"]')
    .click();
  await page.locator('[data-action="rotate"]').click();
  await page.locator('[data-action="confirm-furniture"]').click();
  expect((await read(page)).furniture.find((i) => i.uid === poster).at).toEqual(
    wall,
  );
  await page
    .locator('[data-action="edit-furniture"][data-id="starter-desk"]')
    .click();
  await page
    .locator('[data-action="floor-cell"][data-x="2"][data-z="6"]')
    .click();
  await page.locator('[data-action="confirm-furniture"]').click();
  await expect(page.locator(".feedback")).toContainText("出入口");
  await page.locator('[data-action="cancel-furniture"]').click();
  await page
    .locator(`[data-action="edit-furniture"][data-id="${plant}"]`)
    .click();
  await page
    .locator('[data-action="floor-cell"][data-x="0"][data-z="6"]')
    .click();
  await page.locator('[data-action="confirm-furniture"]').click();
  await page
    .locator(`[data-action="store-furniture"][data-id="${plant}"]`)
    .click();
  await page
    .locator(`[data-action="edit-furniture"][data-id="${mug}"]`)
    .click();
  await page.locator('[data-action="confirm-furniture"]').click();
  await page.screenshot({ path: "evidence/10-furniture.png" });
  await page
    .locator(`[data-action="store-furniture"][data-id="${mug}"]`)
    .click();
  const radio = (await read(page)).furniture.find((i) => i.kind === "f25").uid;
  await page
    .locator(`[data-action="edit-furniture"][data-id="${radio}"]`)
    .click();
  await page.locator('[data-action="confirm-furniture"]').click();

  await close(page);
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="rest"]').click();
  await close(page);
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="radio"]').click();
  await page
    .locator('[data-action="choose-track"][data-id="jp_shop_calm"]')
    .click();
  expect((await read(page)).music.homeTrack).toBe("jp_shop_calm");
  await page.screenshot({ path: "evidence/16-home-radio.png" });
  await close(page);
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="rest"]').click();
  await page.locator('[data-action="sleep"]').click();
  const slept = await read(page);
  expect(slept.stats.slept).toBe(1);
  expect(E.calendar(slept.clock).hour).toBe(8);
  await page.reload();
  await page.getByRole("button", { name: "暮らしの続きを歩く" }).click();
  const resumed = await read(page);
  expect(resumed.home).toBe(slept.home);
  expect(resumed.money).toBe(slept.money);
  expect(resumed.furniture).toEqual(slept.furniture);
  expect(resumed.jobs).toEqual(slept.jobs);
  expect(resumed.music).toEqual(slept.music);
  // 転居しても所有は一住居、家具を失わない。
  await page.locator('.tools [data-action="journal"]').click();
  await page.locator('[data-action="housing"]').click();
  await page.locator('[data-action="preview"][data-id="home02"]').click();
  await page.locator('[data-action="contract"]').click();
  const moved = await read(page);
  expect(moved.home).toBe("home02");
  expect(moved.music.homeTrack).toBe("jp_shop_calm");
  expect(moved.furniture.map((i) => i.uid)).toEqual(
    slept.furniture.map((i) => i.uid),
  );
  expect(moved.furniture.every((i) => i.at === null)).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "CHECKPOINT: furniture/wall/anchors, outfit, sleep, reload, one-home relocation",
  );
});

test("公園まで実歩行し、NPC会話と音声なし、会話中の移動停止・IME・地図の案内", async ({
  page,
}) => {
  const s = E.fresh(new Date(2026, 3, 1));
  E.chooseHome(s, "home01");
  s.scene = "town";
  s.pos = { x: 0, z: -20 };
  s.clock = 291 * 1440 + 17.1 * 60;
  s.settings.shadows = false;
  await fixture(page, s);
  await walk(page, 0, -55.5);
  await walk(page, 45, -55.5);
  await walk(page, 45, -51);
  await page.screenshot({ path: "evidence/11-station-park.png" });
  // 入力中は歩かず、音声のない状態も文字で返答できる。
  await page.locator('.tools [data-action="map"]').click();
  await page.getByText("町の60人を探す", { exact: true }).click();
  await page.locator('[data-action="route-npc"][data-id="p33"]').click();
  expect(await page.locator(".route").textContent()).toContain("隣人");
  await walk(page, 0, -51);
  await walk(page, 0, -20.7);
  await walk(page, -34, -20.7);
  await walk(page, -34, -17.6);
  await page.keyboard.press("e");
  await expect(page.locator(".dialogue-panel h1")).toContainText("隣人");
  const before = await read(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(400);
  await page.keyboard.up("w");
  expect((await read(page)).pos).toEqual(before.pos);
  await page.locator('[data-action="speak"]').click();
  await expect(page.locator("#speech-status")).toContainText(
    "日本語の声がありません",
  );
  expect((await read(page)).supportLog.at(-1).type).toBe("speech-error");
  for(let i=0;i<3;i++)await page.locator('[data-action="dialogue-next"]').click();
  expect((await read(page)).history.p33.count).toBe(1);
  await page.keyboard.press("e");
  await page.screenshot({ path: "evidence/12-conversation.png" });
  await page.locator(".support summary").click();
  await page.locator('[data-action="practice"]').click();
  await page.locator("#practice-input").fill("案内");
  await page.locator("#practice-input").dispatchEvent("compositionstart");
  await page.locator("#practice-input").dispatchEvent("keydown", {
    key: "Enter",
    isComposing: true,
    bubbles: true,
  });
  expect(
    (await read(page)).supportLog.filter((r) => r.type === "copy"),
  ).toHaveLength(0);
  await page.locator("#practice-input").dispatchEvent("compositionend");
  await page.locator("#practice-input").press("Enter");
  expect(
    (await read(page)).supportLog.filter((r) => r.type === "copy"),
  ).toHaveLength(1);
});

test("60人の話を、各人の生活時間と場所から聞いて進める", async ({ page }) => {
  // 個別の有効なJSONを復元する。全員への連続徒歩巡回ではない。
  await page.goto("/");
  for(const p of residents){
    const s=E.fresh(new Date(2026,9,19));E.chooseHome(s,"home01");s.settings.shadows=false;
    let position;
    for(let m=360;m<1320;m+=15){
      const clock=291*1440+m,candidate=residentPosition(p,clock);
      if(candidate.scene!=="residence") {s.clock=clock;position=candidate;break;}
    }
    expect(position,`Encounter for ${p.id}`).toBeTruthy();
    s.scene=position.scene;s.pos={x:position.x,z:position.z+.65};
    await page.locator('.tools [data-action="settings"]').click();
    await page.locator("#import").setInputFiles({name:"resident.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(s))});
    await close(page);await expect(page.locator("#context")).toContainText(p.role);await page.keyboard.press("e");
    const script=conversationFor(p.id,s.clock);
    await expect(page.locator(".dialogue-line")).toContainText(script.lines[0].text);
    await expect(page.locator('[data-action="reply"]')).toHaveCount(0);
    for(let i=0;i<script.lines.length;i++)await page.locator('[data-action="dialogue-next"]').click();
    expect((await read(page)).history[p.id].mode).toBe("read");
  }
});

test("タッチの歩行・視点、保存不能、JSONの入出力・不正データ拒否を扱う", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  await page.keyboard.press("e");
  const before = await read(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const stick = page.locator("#stick"),
    rect = await stick.boundingBox();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: rect.x + rect.width - 8, y: rect.y + rect.height / 2 }],
  });
  await page.waitForTimeout(500);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  // セーブの発火は実際の画面の閉じる操作で確認。
  await page.locator('.tools [data-action="settings"]').click();
  await close(page);
  expect((await read(page)).pos.x).toBeGreaterThan(before.pos.x);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 250, y: 270 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 300, y: 300 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.locator('.tools [data-action="settings"]').click();
  await close(page);
  expect((await read(page)).yaw).not.toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "evidence/13-mobile-controls.png" });
  await page.locator('.tools [data-action="settings"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="export"]').click();
  const download = await downloadPromise,
    path = await download.path();
  const current = await read(page);
  await page.locator("#import").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.locator(".feedback")).toContainText("現在の記録はそのまま");
  expect((await read(page)).home).toBe(current.home);
  await page.locator("#import").setInputFiles(path);
  await expect(page.locator(".feedback")).toContainText("記録を読み込みました");
  await page.evaluate(() =>
    localStorage.setItem("little-word-shop:english-errands:v1", "preserve"),
  );
  await page.getByText("この作品の記録を削除", { exact: true }).click();
  await page.locator('[data-action="delete"]').click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("little-word-shop:english-errands:v1"),
    ),
  ).toBe("preserve");
});
