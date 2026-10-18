import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as E from "../src/engine.js";
import {
  homes,
  places,
  products,
  productById,
  furniture,
  clothes,
  recipes,
  residents,
  deliveries,
  destinations,
  cafeOrders,
} from "../src/data.js";
import { furnitureModel } from "../src/world.js";
function home(id = "home01") {
  const s = E.fresh();
  E.preview(s, id);
  E.chooseHome(s, id);
  return s;
}
function completeRecipe(s, id) {
  const r = recipes.find((r) => r.id === id);
  E.startCooking(s, id, Object.keys(r.need));
  while (!s.cooking.done) E.cookingAction(s, s.cooking.step);
}
function finishCafe(s) {
  E.beginCafe(s);
  for (const o of cafeOrders) {
    E.prepareOrder(s, o);
    E.serveOrder(s);
  }
}
test("24家具すべてに空でない3D形状があり、最大室で床・壁・窓・机上に置ける", () => {
  for (const item of furniture) {
    const model = furnitureModel(item);
    let meshes = 0;
    model.traverse((o) => {
      if (o.isMesh && o.geometry.getAttribute("position").count > 0) meshes++;
    });
    assert.ok(meshes > 0, item.id);
    const s = home("home03");
    s.furniture.forEach((i) => (i.at = null));
    s.furniture.push({ uid: "tested", kind: item.id, at: null });
    const at =
      item.zone === "floor"
        ? { zone: "floor", x: 3, z: 2, rot: 0 }
        : item.zone === "wall"
          ? { zone: "wall", wall: "north", u: 3, v: 2 }
          : item.zone === "window"
            ? { zone: "window", window: 0 }
            : { zone: "anchor", host: "starter-desk" };
    if (item.zone === "anchor")
      E.placeFurniture(s, "starter-desk", {
        zone: "floor",
        x: 0,
        z: 4,
        rot: 0,
      });
    E.placeFurniture(s, "tested", at);
    assert.ok(s.furniture.find((i) => i.uid === "tested").at);
    E.validate(s);
  }
});
test("SPECの16食材・6料理・24家具・12服・60人を持ち、会話と参照が固有", () => {
  assert.equal(products.filter((p) => p.kind === "food").length, 16);
  assert.equal(recipes.length, 6);
  assert.equal(furniture.length, 24);
  assert.equal(clothes.length, 12);
  assert.equal(residents.length, 60);
  assert.equal(new Set(residents.map((p) => p.id)).size, 60);
  assert.equal(new Set(residents.map((p) => p.line)).size, 60);
  assert.equal(
    new Set(residents.map((p) => JSON.stringify(p.replies))).size,
    60,
  );
  const plan = readFileSync(
    new URL("../CONTENT_PLAN.md", import.meta.url),
    "utf8",
  );
  for (const p of residents) {
    assert.ok(plan.includes(p.line));
    assert.ok(p.replies.length >= 2 && p.replies.length <= 3);
    assert.ok(p.replies.every((r) => r.text && r.reaction && r.intent));
    assert.equal(p.audioText, p.line);
    assert.ok(p.reading && p.meaning);
    assert.ok(
      Object.values(p.schedule).every(
        (v) => Number.isFinite(v.x) && Number.isFinite(v.z),
      ),
    );
  }
  for (const r of recipes)
    for (const id of Object.keys(r.need)) assert.ok(productById[id]);
  for (const d of deliveries) {
    assert.ok(places.some((p) => p.id === d.pickup));
    assert.ok(destinations.some((p) => p.id === d.dest));
  }
});
test("三室の内見から一住居を選び、初期所持・家賃支払済み・設備を保持", () => {
  const s = E.fresh();
  for (const h of homes) E.preview(s, h.id);
  assert.equal(s.home, null);
  assert.equal(s.inspected.length, 3);
  E.chooseHome(s, "home03");
  assert.equal(s.home, "home03");
  assert.equal(s.furniture.filter((i) => i.kind === "f19").length, 2);
  assert.equal(s.money, 20000);
  assert.deepEqual(s.bag, {
    rice: 2,
    nori: 2,
    salt: 5,
    miso: 3,
    dashi: 5,
    soy: 3,
  });
  E.validate(s);
});
test("数量不足・金額不足・店の不一致で、取引を途中変更しない", () => {
  const s = home();
  s.scene = "market_grocery";
  const before = JSON.stringify(s);
  assert.throws(() => E.buy(s, "egg", 60));
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => E.buy(s, "f01", 1));
  assert.equal(JSON.stringify(s), before);
  s.money = 1;
  const cash = JSON.stringify(s);
  assert.throws(() => E.buy(s, "egg", 1));
  assert.equal(JSON.stringify(s), cash);
  assert.throws(() => E.buy(s, "egg", 0.5));
});
test("購入は数量・在庫・所持金・時間をまとめて更新", () => {
  const s = home();
  s.scene = "market_grocery";
  const t = s.clock;
  E.buy(s, "egg", 2);
  assert.equal(s.bag.egg, 2);
  assert.equal(s.stock.egg, 48);
  assert.equal(s.money, 19840);
  assert.equal(s.clock, t + 2);
  E.validate(s);
});
test("営業時間と家具店の水曜休みを時計で判定", () => {
  const s = home();
  assert.equal(E.isOpen(s, "market_cafe"), false);
  E.advanceTime(s, 60);
  assert.equal(E.isOpen(s, "market_cafe"), true);
  s.clock = 2 * 1440 + 600;
  assert.equal(E.isOpen(s, "market_furniture"), false);
  assert.equal(E.isOpen(s, "market_clothes"), true);
  s.clock = 90 * 1440 + 1200;
  assert.equal(E.isOpen(s, "port_fish"), false);
});
test("4客の注文を作り直せ、報酬と2時間は勤務完了時に一度だけ", () => {
  const s = home();
  s.scene = "market_cafe";
  E.advanceTime(s, 60);
  const money = s.money,
    time = s.clock;
  E.beginCafe(s);
  E.prepareOrder(s, { drink: "tea", qty: 1, milk: false, takeout: false });
  assert.throws(() => E.serveOrder(s));
  assert.equal(s.cafe.step, 0);
  assert.equal(s.money, money);
  assert.equal(s.clock, time);
  for (const order of cafeOrders) {
    E.prepareOrder(s, order);
    E.serveOrder(s);
  }
  assert.equal(s.money, money + 2000);
  assert.equal(s.clock, time + 120);
  assert.equal(s.stats.worked, 1);
  assert.throws(() => E.serveOrder(s));
  assert.equal(s.money, money + 2000);
  E.validate(s);
});
test("勤務途中のJSON復元後も残り客から再開し、支払いが重複しない", () => {
  let s = home();
  s.scene = "market_cafe";
  E.advanceTime(s, 60);
  E.beginCafe(s);
  E.prepareOrder(s, cafeOrders[0]);
  E.serveOrder(s);
  s = E.parse(JSON.stringify(s));
  assert.equal(s.cafe.step, 1);
  for (const order of cafeOrders.slice(1)) {
    E.prepareOrder(s, order);
    E.serveOrder(s);
  }
  s = E.parse(JSON.stringify(s));
  assert.equal(s.stats.worked, 1);
  assert.throws(() => E.serveOrder(s));
});
test("配達は上限3・仕事別荷物・現地の受け渡し、二重報酬なし", () => {
  const s = home();
  for (const id of ["d01", "d02", "d03"]) E.acceptJob(s, id);
  assert.throws(() => E.acceptJob(s, "d04"));
  assert.throws(() => E.finishJob(s, "d01"));
  s.scene = "market_grocery";
  E.pickupJob(s, "d01");
  assert.throws(() => E.pickupJob(s, "d01"));
  assert.throws(() => E.finishJob(s, "d01"));
  const dest = destinations.find((d) => d.id === deliveries[0].dest);
  s.scene = "town";
  s.pos = { x: dest.x, z: dest.z };
  const cash = s.money;
  E.finishJob(s, "d01");
  assert.equal(s.money, cash + 400);
  assert.throws(() => E.finishJob(s, "d01"));
  assert.equal(s.money, cash + 400);
  assert.equal(s.bag.rice, 2);
  E.validate(s);
});
test("遅配は半額、取消は報酬なし・借金なし", () => {
  const s = home();
  E.acceptJob(s, "d01");
  s.scene = "market_grocery";
  E.pickupJob(s, "d01");
  E.advanceTime(s, 100);
  s.scene = "town";
  s.pos = { x: destinations[0].x, z: destinations[0].z };
  E.finishJob(s, "d01");
  assert.equal(s.jobs[0].paid, 200);
  E.acceptJob(s, "d02");
  const cash = s.money;
  E.cancelJob(s, "d02");
  assert.equal(s.money, cash);
  assert.equal(s.debt, 0);
  assert.throws(() => E.pickupJob(s, "d02"));
});
test("食材不足・器具不足・選択違いでは材料を一切消費しない", () => {
  const s = home(),
    before = JSON.stringify(s);
  assert.throws(() => E.startCooking(s, "r03", Object.keys(recipes[2].need)));
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => E.startCooking(s, "r01", ["rice", "salt"]));
  assert.equal(JSON.stringify(s), before);
  for (const [k, n] of Object.entries(recipes[5].need)) s.bag[k] = n;
  assert.throws(() => E.startCooking(s, "r06", Object.keys(recipes[5].need)));
});
test("6品すべて、予約→工程と手操作→完成の一回で消費・時間・完成品を処理", () => {
  for (const r of recipes) {
    let s = home();
    s.tools = ["akashipan"];
    for (const [k, n] of Object.entries(r.need)) s.bag[k] = n + 2;
    const bag = structuredClone(s.bag),
      time = s.clock;
    E.startCooking(s, r.id, Object.keys(r.need));
    assert.deepEqual(s.bag, bag);
    assert.throws(() => E.cookingAction(s, 3));
    s = E.parse(JSON.stringify(s));
    while (!s.cooking.done) E.cookingAction(s, s.cooking.step);
    assert.equal(s.clock, time + r.minutes);
    assert.equal(s.bag[r.id], (bag[r.id] || 0) + r.yield);
    for (const [k, n] of Object.entries(r.need))
      assert.equal(s.bag[k], bag[k] - n);
    assert.throws(() => E.cookingAction(s, 3));
    assert.equal(s.clock, time + r.minutes);
    E.validate(s);
  }
});
test("取消は予約を解くだけ、調理予約済みのごはんは食べられない", () => {
  const s = home();
  s.bag.r01 = 1;
  E.startCooking(s, "r02", Object.keys(recipes[1].need));
  assert.throws(() => E.eat(s, "r01"));
  E.cancelCooking(s);
  assert.equal(s.bag.r01, 1);
  E.eat(s, "r01");
  assert.equal(s.bag.r01, 0);
  assert.equal(s.stats.eaten, 1);
});
test("床の出口・台所・家具の使用面への経路を塞がない", () => {
  const s = home(),
    uid = "starter-desk";
  assert.match(
    E.checkPlacement(s, uid, { zone: "floor", x: 2, z: 6, rot: 0 }),
    /出入口/,
  );
  assert.match(
    E.checkPlacement(s, uid, { zone: "floor", x: 0, z: 0, rot: 0 }),
    /台所/,
  );
  assert.match(
    E.checkPlacement(s, uid, { zone: "floor", x: 5, z: 5, rot: 0 }),
    /部屋の外/,
  );
  assert.equal(
    E.checkPlacement(s, uid, { zone: "floor", x: 0, z: 3, rot: 0 }),
    "",
  );
  E.validate(s);
});
test("机の後ろの壁飾りを保持し、高い家具がぶつかる配置は拒否", () => {
  const s = home();
  s.furniture.push(
    { uid: "poster", kind: "f13", at: null },
    { uid: "bookcase", kind: "f07", at: null },
  );
  E.placeFurniture(s, "starter-desk", { zone: "floor", x: 0, z: 2, rot: 0 });
  E.placeFurniture(s, "poster", { zone: "wall", wall: "west", u: 2, v: 2 });
  const before = structuredClone(s.furniture.find((i) => i.uid === "poster"));
  assert.match(
    E.checkPlacement(s, "bookcase", { zone: "floor", x: 0, z: 2, rot: 90 }),
    /重なり|重なって/,
  );
  E.storeFurniture(s, "starter-desk");
  assert.match(
    E.checkPlacement(s, "bookcase", { zone: "floor", x: 0, z: 2, rot: 90 }),
    /壁飾り/,
  );
  assert.deepEqual(
    s.furniture.find((i) => i.uid === "poster"),
    before,
  );
  E.validate(s);
});
test("窓スロットと机上アンカーは重複せず、保管でも家具所有は失わない", () => {
  const s = home();
  s.furniture.push(
    { uid: "mug", kind: "f23", at: null },
    { uid: "vase", kind: "f22", at: null },
    { uid: "curtain2", kind: "f20", at: null },
  );
  E.placeFurniture(s, "mug", { zone: "anchor", host: "starter-desk" });
  assert.match(
    E.checkPlacement(s, "vase", { zone: "anchor", host: "starter-desk" }),
    /机/,
  );
  assert.match(
    E.checkPlacement(s, "curtain2", { zone: "window", window: 0 }),
    /窓/,
  );
  E.storeFurniture(s, "starter-desk");
  assert.equal(s.furniture.find((i) => i.uid === "mug").at, null);
  assert.equal(s.furniture.length, 7);
  E.validate(s);
});
test("転居で一住居のまま全家具を保管し、失敗時は元の状態を保つ", () => {
  const s = home();
  s.furniture.push({
    uid: "wall",
    kind: "f13",
    at: { zone: "wall", wall: "west", u: 1, v: 2 },
  });
  E.preview(s, "home02");
  const owned = s.furniture.map((i) => i.uid);
  E.chooseHome(s, "home02");
  assert.equal(s.home, "home02");
  assert.equal(s.money, 19000);
  assert.deepEqual(
    s.furniture.map((i) => i.uid),
    owned,
  );
  assert.ok(s.furniture.every((i) => i.at === null));
  E.chooseHome(s, "home02");
  assert.equal(s.money, 19000);
  E.preview(s, "home03");
  s.money = 0;
  const before = JSON.stringify(s);
  assert.throws(() => E.chooseHome(s, "home03"));
  assert.equal(JSON.stringify(s), before);
  E.validate(s);
});
test("服の所持と着用は別で、12点を性別の制限なしに選べる", () => {
  const s = home();
  assert.throws(() => E.equip(s, "c08"));
  s.wardrobe = clothes.map((c) => c.id);
  E.equip(s, "c08");
  assert.equal(s.wear.bottom, "c08");
  E.validate(s);
});
test("大幅な時間加算で各月の家賃と不足を一度ずつ処理し、保存復帰で再徴収しない", () => {
  let s = home();
  const initial = s.clock;
  E.advanceTime(s, 61 * 1440);
  assert.equal(E.calendar(s.clock).month, 6);
  assert.equal(s.money, 0);
  assert.equal(s.debt, 16000);
  s = E.parse(JSON.stringify(s));
  E.advanceTime(s, 0);
  assert.equal(s.debt, 16000);
  assert.equal(s.events.filter((e) => e.text.includes("家賃")).length, 2);
  assert.deepEqual(
    s.events
      .filter((e) => e.text.includes("家賃"))
      .map((e) => [E.calendar(e.clock).month, E.calendar(e.clock).day]),
    [
      [5, 1],
      [6, 1],
    ],
  );
  assert.equal(E.calendar(initial).year, 1);
});
test("365日暦・月曜始まり・2月28日・季節と7日以内の待機を扱う", () => {
  assert.equal(E.calendar(0).weekday, 0);
  assert.deepEqual(
    [E.calendar(59 * 1440).month, E.calendar(59 * 1440).day],
    [3, 1],
  );
  assert.equal(E.calendar(365 * 1440).year, 2);
  assert.equal(E.calendar(181 * 1440).season, "夏");
  const s = home();
  assert.throws(() => E.wait(s, 8 * 1440));
  E.sleep(s);
  assert.equal(E.calendar(s.clock).hour, 8);
  assert.equal(E.calendar(s.clock).day, 2);
});
test("全60人それぞれに返答でき、選んだ好みを正誤判定しない", () => {
  const s = home();
  for (const p of residents)
    for (let i = 0; i < p.replies.length; i++)
      assert.equal(E.talk(s, p.id, i), p.replies[i].reaction);
  assert.equal(Object.keys(s.history).length, 60);
  assert.equal(s.money, 20000);
  E.validate(s);
});
test("別作品・未対応版・壊れた構造・不整合な仕事を拒否する", () => {
  for (const value of ["{", "null", "{}", '{"game":"other","version":1}'])
    assert.throws(() => E.parse(value));
  for (const mutate of [
    (s) => (s.version = 99),
    (s) => (s.money = -1),
    (s) => (s.pos.x = NaN),
    (s) => (s.bag.egg = -1),
    (s) => (s.jobs = [{ id: "fake" }]),
    (s) => (s.cafe = { id: 1, done: true, step: 1 }),
    (s) => (s.furniture[0].at = { zone: "floor", x: 99, z: 99, rot: 0 }),
    (s) => (s.wear.top = "c08"),
    (s) => (s.cooking = { id: 1, done: true, recipe: "r01", step: 0, hits: 0 }),
  ]) {
    const s = home();
    mutate(s);
    assert.throws(() => E.validate(s));
  }
});
test("作品専用キーだけを使い、保存禁止でもメモリ上の生活は続く", () => {
  const storage = {
    getItem(key) {
      assert.equal(key, "japan-life:v1");
      throw Error();
    },
    setItem(key) {
      assert.equal(key, "japan-life:v1");
      throw Error();
    },
  };
  const { state, warning } = E.load(storage);
  assert.ok(warning);
  assert.equal(E.save(storage, state), false);
  E.chooseHome(state, "home01");
  state.scene = "market_grocery";
  E.buy(state, "egg", 1);
  assert.equal(state.bag.egg, 1);
});
