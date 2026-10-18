import {
  homes,
  homeById,
  places,
  placeById,
  products,
  productById,
  furniture,
  clothes,
  recipes,
  deliveries,
  destinations,
  cafeOrders,
  residents,
} from "./data.js";
import { trackById } from "./music-data.js";
export const SAVE_KEY = "japan-life:v1";
export const DAY = 1440;
const months = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
const int = (n, min = 0, max = 1e9) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
export function calendar(minutes) {
  const days = Math.floor(minutes / DAY),
    year = Math.floor(days / 365) + 1;
  let day = days % 365,
    month = 0;
  while (day >= months[month]) {
    day -= months[month];
    month++;
  }
  return {
    year,
    month: month + 1,
    day: day + 1,
    weekday: days % 7,
    hour: Math.floor((minutes % DAY) / 60),
    minute: Math.floor(minutes % 60),
    monthSerial: (year - 1) * 12 + month,
    season:
      month >= 2 && month <= 4
        ? "春"
        : month >= 5 && month <= 7
          ? "夏"
          : month >= 8 && month <= 10
            ? "秋"
            : "冬",
  };
}
export function fresh() {
  return {
    version: 1,
    game: "japan-life",
    clock: 90 * DAY + 480,
    money: 20000,
    debt: 0,
    rentThrough: 3,
    home: null,
    scene: "preview:home01",
    pos: { x: 1.75, z: 3.25 },
    yaw: 0,
    bag: { rice: 2, nori: 2, salt: 5, miso: 3, dashi: 5, soy: 3 },
    tools: [],
    furniture: [
      { uid: "starter-bed", kind: "f01", at: null },
      { uid: "starter-desk", kind: "f02", at: null },
      { uid: "starter-chair", kind: "f03", at: null },
      { uid: "starter-curtain", kind: "f19", at: null },
    ],
    wardrobe: ["c01", "c05", "c09"],
    wear: { top: "c01", bottom: "c05", shoes: "c09" },
    stock: Object.fromEntries(
      products.map((p) => [p.id, p.kind === "food" ? 50 : 5]),
    ),
    jobs: [],
    cafe: null,
    cooking: null,
    history: {},
    notes: [],
    supportLog: [],
    inspected: ["home01"],
    settings: {
      sound: true,
      ambient: false,
      shadows: true,
      voice: "",
      volume: 0.2,
      voiceVolume: 0.85,
      musicVolume: 0.28,
      musicMuted: false,
    },
    music: { homeTrack: "jp_home_default", homeStopped: false },
    serial: 0,
    events: [],
    stats: {
      bought: 0,
      worked: 0,
      delivered: 0,
      cooked: 0,
      talked: 0,
      slept: 0,
      moved: 0,
      eaten: 0,
    },
  };
}
function note(s, text, clock = s.clock) {
  s.events.push({ clock, text });
  if (s.events.length > 80) s.events.shift();
}
export function advanceTime(s, minutes) {
  requireThat(
    Number.isFinite(minutes) && minutes >= 0 && minutes <= DAY * 3660,
    "時間の指定が範囲外です。",
  );
  const before = Math.floor(s.clock / DAY),
    after = Math.floor((s.clock + minutes) / DAY);
  for (let d = before + 1; d <= after; d++) {
    const date = calendar(d * DAY);
    if (date.day === 1 && date.monthSerial > s.rentThrough) {
      if (s.home) {
        const rent = homeById[s.home].rent,
          paid = Math.min(rent, s.money);
        s.money -= paid;
        s.debt += rent - paid;
        note(
          s,
          `${date.month}月の家賃 ${rent}円。未払い ${rent - paid}円。`,
          d * DAY,
        );
      }
      s.rentThrough = date.monthSerial;
    }
  }
  s.clock += minutes;
}
export function isOpen(s, id) {
  const p = placeById[id];
  if (!p) return false;
  const d = calendar(s.clock);
  return (
    p.open === undefined ||
    (d.hour >= p.open && d.hour < p.close && d.weekday !== p.closedDay)
  );
}
export function shop(s, id) {
  requireThat(s.scene === id, "お店の中で品物を見てください。");
  requireThat(isOpen(s, id), "今は営業時間外です。");
}
export function buy(s, id, qty) {
  const p = productById[id];
  requireThat(
    p && products.includes(p) && int(qty, 1, 99),
    "商品と数量を確認してください。",
  );
  shop(s, p.store);
  requireThat(s.stock[id] >= qty, "お店の在庫が足りません。");
  requireThat(s.money >= p.price * qty, "お金が足りません。");
  if (p.kind === "clothes")
    requireThat(
      !s.wardrobe.includes(id) && qty === 1,
      "この服はすでに持っています。",
    );
  if (p.kind === "tool")
    requireThat(
      !s.tools.includes(id) && qty === 1,
      "この道具はすでに持っています。",
    );
  s.money -= p.price * qty;
  s.stock[id] -= qty;
  if (p.kind === "food") s.bag[id] = (s.bag[id] || 0) + qty;
  if (p.kind === "meal") s.bag[p.meal] = (s.bag[p.meal] || 0) + qty;
  if (p.kind === "furniture")
    for (let i = 0; i < qty; i++)
      s.furniture.push({ uid: `owned-${++s.serial}`, kind: id, at: null });
  if (p.kind === "clothes") s.wardrobe.push(id);
  if (p.kind === "tool") s.tools.push(id);
  s.stats.bought++;
  advanceTime(s, 2);
  note(s, `${p.name}を${qty}個買いました。`);
}
export function ownsRadio(s) {
  return s.furniture.some((i) => i.kind === "f25");
}
export function chooseHomeTrack(s, id) {
  requireThat(s.scene === s.home, "自宅で曲を選んでください。");
  requireThat(trackById[id], "収録された曲を選んでください。");
  requireThat(
    ownsRadio(s) || id === "jp_home_default",
    "家具店でラジオを取得すると選曲できます。",
  );
  s.music.homeTrack = id;
  s.music.homeStopped = false;
}
export function stopHomeMusic(s) {
  requireThat(s.scene === s.home, "自宅で曲を停止してください。");
  s.music.homeStopped = true;
}
export function preview(s, id) {
  requireThat(homeById[id], "その部屋はありません。");
  if (!s.inspected.includes(id)) s.inspected.push(id);
  s.scene = `preview:${id}`;
  s.pos = {
    x: (Math.floor(homeById[id].w / 2) + 0.5) * 0.5,
    z: homeById[id].d * 0.5 - 0.65,
  };
}
export function chooseHome(s, id) {
  requireThat(
    homeById[id] &&
      (s.scene === `preview:${id}` || (s.home === id && s.scene === id)),
    "先に部屋の中を内見してください。",
  );
  if (s.home === id) {
    s.scene = id;
    return;
  }
  const moving = s.home !== null;
  requireThat(!moving || s.money >= 1000, "引っ越しには1,000円必要です。");
  requireThat(
    !s.cooking || s.cooking.done,
    "調理を終えるか取り消してから引っ越してください。",
  );
  if (moving) {
    s.money -= 1000;
    s.furniture.forEach((i) => (i.at = null));
    s.stats.moved++;
  }
  s.home = id;
  s.rentThrough = calendar(s.clock).monthSerial;
  s.scene = id;
  s.pos = {
    x: (Math.floor(homeById[id].w / 2) + 0.5) * 0.5,
    z: homeById[id].d * 0.5 - 0.65,
  };
  if (!moving) {
    s.furniture.find((i) => i.kind === "f01").at = {
      zone: "floor",
      x: homeById[id].w - 2,
      z: 1,
      rot: 0,
    };
    s.furniture.find((i) => i.kind === "f02").at = {
      zone: "floor",
      x: 0,
      z: 4,
      rot: 0,
    };
    s.furniture.find((i) => i.kind === "f03").at = {
      zone: "floor",
      x: 2,
      z: 4,
      rot: 90,
    };
    s.furniture.find((i) => i.kind === "f19").at = {
      zone: "window",
      window: 0,
    };
    for (let window = 1; window < homeById[id].windows; window++)
      s.furniture.push({
        uid: `starter-curtain-${window}`,
        kind: "f19",
        at: { zone: "window", window },
      });
  }
  note(s, `${homeById[id].name}での暮らし。住居はこの一室です。`);
}
export function enter(s, id) {
  requireThat(s.scene === "town", "町の入口から入ってください。");
  const p = placeById[id];
  requireThat(
    p && p.w && Math.hypot(s.pos.x - p.x, s.pos.z - (p.z + p.d / 2 + 0.7)) < 3,
    "入口へ近づいてください。",
  );
  if (p.kind === "home") {
    if (s.home === id) {
      s.scene = id;
      s.pos = {
        x: (Math.floor(homeById[id].w / 2) + 0.5) * 0.5,
        z: homeById[id].d * 0.5 - 0.65,
      };
    } else preview(s, id);
    return;
  }
  requireThat(isOpen(s, id), "今は営業時間外です。");
  s.scene = id;
  s.pos = { x: 0, z: 3.2 };
}
export function exit(s) {
  const id = s.scene.startsWith("preview:") ? s.scene.slice(8) : s.scene;
  const p = placeById[id];
  requireThat(p, "外へ出られません。");
  s.scene = "town";
  s.pos = { x: p.x, z: p.z + p.d / 2 + 1.3 };
}
export function floorSize(item, at) {
  return at.rot % 180 === 90 ? [item.d, item.w] : [item.w, item.d];
}
export function occupied(s, exclude) {
  const cells = new Set(["0,0", "1,0"]);
  if (s.home === "home02")
    for (const cell of ["2,0", "2,1", "2,2"]) cells.add(cell);
  for (const i of s.furniture) {
    if (i.uid === exclude || i.at?.zone !== "floor") continue;
    const [w, d] = floorSize(productById[i.kind], i.at);
    for (let x = i.at.x; x < i.at.x + w; x++)
      for (let z = i.at.z; z < i.at.z + d; z++) cells.add(`${x},${z}`);
  }
  return cells;
}
function wallLength(h, wall) {
  return wall === "north" || wall === "south" ? h.w : h.d;
}
function wallTouches(h, at, w, d, wall) {
  return wall === "north"
    ? at.z === 0
    : wall === "south"
      ? at.z + d === h.d
      : wall === "west"
        ? at.x === 0
        : at.x + w === h.w;
}
function wallConflict(s, proposed, exclude) {
  const h = homeById[s.home];
  const list = s.furniture
    .filter((i) => i.uid !== exclude && i.at)
    .concat(proposed ? [proposed] : []);
  for (const wall of list.filter((i) => i.at.zone === "wall"))
    for (const floor of list.filter((i) => i.at.zone === "floor")) {
      const a = wall.at,
        b = floor.at,
        wp = productById[wall.kind],
        fp = productById[floor.kind],
        [w, d] = floorSize(fp, b);
      const start = a.wall === "north" || a.wall === "south" ? b.x : b.z,
        span = a.wall === "north" || a.wall === "south" ? w : d;
      if (
        wallTouches(h, b, w, d, a.wall) &&
        a.u < start + span &&
        a.u + wp.w > start &&
        fp.height > a.v * 0.5
      )
        return true;
    }
  return false;
}
export function checkPlacement(s, uid, at) {
  const h = homeById[s.home],
    instance = s.furniture.find((i) => i.uid === uid);
  if (!h || !instance) return "自分の部屋と家具を選んでください。";
  const item = productById[instance.kind];
  if (!at || at.zone !== item.zone)
    return "家具に合う設置場所を選んでください。";
  if (at.zone === "floor") {
    if (
      !int(at.x, 0, h.w) ||
      !int(at.z, 0, h.d) ||
      ![0, 90, 180, 270].includes(at.rot)
    )
      return "床マスと向きを確認してください。";
    const [w, d] = floorSize(item, at);
    if (at.x + w > h.w || at.z + d > h.d) return "部屋の外には置けません。";
    const cells = occupied(s, uid);
    for (let x = at.x; x < at.x + w; x++)
      for (let z = at.z; z < at.z + d; z++)
        if (cells.has(`${x},${z}`)) return "台所や他の家具と重なっています。";
    const door = { x: Math.floor(h.w / 2), z: h.d - 1 };
    for (let x = at.x; x < at.x + w; x++)
      for (let z = at.z; z < at.z + d; z++) cells.add(`${x},${z}`);
    if (
      cells.has(`${door.x},${door.z}`) ||
      cells.has(`${door.x},${door.z - 1}`)
    )
      return "出入口の通り道を空けてください。";
    const reachable = new Set(),
      todo = [door];
    while (todo.length) {
      const p = todo.pop(),
        key = `${p.x},${p.z}`;
      if (
        reachable.has(key) ||
        cells.has(key) ||
        p.x < 0 ||
        p.z < 0 ||
        p.x >= h.w ||
        p.z >= h.d
      )
        continue;
      reachable.add(key);
      todo.push(
        { x: p.x + 1, z: p.z },
        { x: p.x - 1, z: p.z },
        { x: p.x, z: p.z + 1 },
        { x: p.x, z: p.z - 1 },
      );
    }
    if (!reachable.has("0,1") && !reachable.has("1,1"))
      return "台所を使う場所への道を残してください。";
    const list = s.furniture
      .filter((i) => i.uid !== uid && i.at?.zone === "floor")
      .concat({ uid, kind: instance.kind, at });
    for (const p of list.filter((i) =>
      ["f01", "f03", "f06"].includes(i.kind),
    )) {
      const [fw, fd] = floorSize(productById[p.kind], p.at),
        points = [];
      if (p.at.rot === 0)
        for (let z = p.at.z; z < p.at.z + fd; z++)
          points.push(`${p.at.x - 1},${z}`);
      if (p.at.rot === 90)
        for (let x = p.at.x; x < p.at.x + fw; x++)
          points.push(`${x},${p.at.z - 1}`);
      if (p.at.rot === 180)
        for (let z = p.at.z; z < p.at.z + fd; z++)
          points.push(`${p.at.x + fw},${z}`);
      if (p.at.rot === 270)
        for (let x = p.at.x; x < p.at.x + fw; x++)
          points.push(`${x},${p.at.z + fd}`);
      if (!points.some((key) => reachable.has(key)))
        return "ベッドや椅子の使用面まで歩ける道を残してください。";
    }
  }
  if (at.zone === "wall") {
    if (
      !["north", "south", "west", "east"].includes(at.wall) ||
      !int(at.u, 0, 20) ||
      !int(at.v, 1, 5) ||
      at.u + item.w > wallLength(h, at.wall) ||
      at.v + item.d > 6
    )
      return "壁の範囲に収まる高さと位置を選んでください。";
    if (
      at.wall === "south" &&
      at.u < Math.floor(h.w / 2) + 1 &&
      at.u + item.w > Math.floor(h.w / 2) - 1 &&
      at.v < 4
    )
      return "扉の面は空けてください。";
    if (
      s.furniture.some(
        (i) =>
          i.uid !== uid &&
          i.at?.zone === "wall" &&
          i.at.wall === at.wall &&
          at.u < i.at.u + productById[i.kind].w &&
          at.u + item.w > i.at.u &&
          at.v < i.at.v + productById[i.kind].d &&
          at.v + item.d > i.at.v,
      )
    )
      return "壁飾りが重なっています。";
  }
  if (
    at.zone === "window" &&
    (!int(at.window, 0, h.windows - 1) ||
      s.furniture.some(
        (i) =>
          i.uid !== uid && i.at?.zone === "window" && i.at.window === at.window,
      ))
  )
    return "空いている窓を選んでください。";
  if (at.zone === "anchor") {
    const host = s.furniture.find(
      (i) =>
        i.uid === at.host &&
        i.at?.zone === "floor" &&
        ["f02", "f04", "f05"].includes(i.kind),
    );
    if (
      !host ||
      s.furniture.some(
        (i) =>
          i.uid !== uid && i.at?.zone === "anchor" && i.at.host === at.host,
      )
    )
      return "配置済みで、上が空いている机を選んでください。";
  }
  if (wallConflict(s, { ...instance, at }, uid))
    return "背の高い家具と壁飾りがぶつかります。高さや場所を変えてください。";
  return "";
}
export function placeFurniture(s, uid, at) {
  requireThat(s.scene === s.home, "自分の部屋で配置してください。");
  const error = checkPlacement(s, uid, at);
  requireThat(!error, error);
  const item = s.furniture.find((i) => i.uid === uid);
  item.at = structuredClone(at);
  if (at.zone === "floor") {
    const [w, d] = floorSize(productById[item.kind], at);
    if (
      s.pos.x > at.x * 0.5 - 0.18 &&
      s.pos.x < (at.x + w) * 0.5 + 0.18 &&
      s.pos.z > at.z * 0.5 - 0.18 &&
      s.pos.z < (at.z + d) * 0.5 + 0.18
    ) {
      const h = homeById[s.home];
      s.pos = { x: (Math.floor(h.w / 2) + 0.5) * 0.5, z: h.d * 0.5 - 0.65 };
    }
  }
  note(s, "家具の配置を保存しました。");
}
export function storeFurniture(s, uid) {
  requireThat(s.scene === s.home, "自分の部屋で保管してください。");
  const item = s.furniture.find((i) => i.uid === uid);
  requireThat(item, "家具がありません。");
  item.at = null;
  s.furniture.filter((i) => i.at?.host === uid).forEach((i) => (i.at = null));
}
export function equip(s, id) {
  requireThat(s.wardrobe.includes(id), "その服はまだ持っていません。");
  const c = productById[id];
  s.wear[c.slot] = id;
}
export function beginCafe(s) {
  shop(s, "market_cafe");
  requireThat(!s.cafe || s.cafe.done, "勤務の続きを進めてください。");
  s.cafe = { id: ++s.serial, step: 0, prepared: null, done: false };
}
export function prepareOrder(s, order) {
  requireThat(
    s.cafe && !s.cafe.done && s.scene === "market_cafe",
    "喫茶店の勤務中に準備してください。",
  );
  requireThat(
    ["coffee", "tea"].includes(order.drink) &&
      int(order.qty, 1, 3) &&
      typeof order.milk === "boolean" &&
      typeof order.takeout === "boolean",
    "品と数量を確認してください。",
  );
  s.cafe.prepared = structuredClone(order);
}
export function serveOrder(s) {
  const j = s.cafe;
  requireThat(
    j && !j.done && s.scene === "market_cafe",
    "勤務は完了しています。",
  );
  const expected = cafeOrders[j.step];
  requireThat(
    j.prepared &&
      ["drink", "qty", "milk", "takeout"].every(
        (key) => j.prepared[key] === expected[key],
      ),
    "注文と違うようです。品・数・店内か持ち帰り・ミルクを確認して作り直せます。",
  );
  j.step++;
  j.prepared = null;
  if (j.step === 4) {
    j.done = true;
    s.money += 2000;
    s.stats.worked++;
    advanceTime(s, 120);
    note(s, "4人のお客さんへの勤務を完了。2,000円、2時間。");
  }
}
export function acceptJob(s, id) {
  const offer = deliveries.find((j) => j.id === id);
  requireThat(
    offer && !s.jobs.some((j) => j.id === id),
    "この依頼はすでに受けています。",
  );
  requireThat(
    s.jobs.filter((j) => ["accepted", "carrying"].includes(j.status)).length <
      3,
    "同時に受けられる配達は3件までです。",
  );
  s.jobs.push({
    id,
    status: "accepted",
    accepted: s.clock,
    deadline: s.clock + offer.limit,
    paid: 0,
  });
}
export function pickupJob(s, id) {
  const job = s.jobs.find((j) => j.id === id),
    offer = deliveries.find((j) => j.id === id);
  requireThat(job?.status === "accepted", "集荷できる荷物はありません。");
  shop(s, offer.pickup);
  job.status = "carrying";
  note(s, `${id}の荷物を受け取りました。`);
}
export function finishJob(s, id) {
  const job = s.jobs.find((j) => j.id === id),
    offer = deliveries.find((j) => j.id === id);
  requireThat(
    job?.status === "carrying",
    "先にお店で、この仕事の荷物を受け取ってください。",
  );
  const dest = destinations.find((d) => d.id === offer.dest);
  requireThat(
    s.scene === "town" && Math.hypot(s.pos.x - dest.x, s.pos.z - dest.z) < 3,
    "指定の受け取り口まで歩いてください。",
  );
  job.paid = s.clock > job.deadline ? offer.reward / 2 : offer.reward;
  job.status = "done";
  s.money += job.paid;
  s.stats.delivered++;
  note(s, `${dest.name}に配達。${job.paid}円。`);
}
export function cancelJob(s, id) {
  const j = s.jobs.find((j) => j.id === id);
  requireThat(
    j && ["accepted", "carrying"].includes(j.status),
    "取消できる依頼はありません。",
  );
  j.status = "cancelled";
  j.paid = 0;
}
export function reserved(s, id) {
  return s.cooking && !s.cooking.done
    ? recipes.find((r) => r.id === s.cooking.recipe)?.need[id] || 0
    : 0;
}
export function startCooking(s, id, selected) {
  requireThat(s.scene === s.home && s.home, "自宅の台所で調理してください。");
  requireThat(
    !s.cooking || s.cooking.done,
    "調理中の料理を終えるか、取り消してください。",
  );
  const r = recipes.find((r) => r.id === id);
  requireThat(r, "レシピがありません。");
  requireThat(
    id !== "r06" || s.tools.includes("akashipan"),
    "明石焼には専用の明石焼器が必要です。家具店で買えます。",
  );
  requireThat(
    Array.isArray(selected) &&
      selected.length === Object.keys(r.need).length &&
      Object.keys(r.need).every((k) => selected.includes(k)),
    "必要な材料を一つずつ選んでください。",
  );
  requireThat(
    Object.entries(r.need).every(([k, n]) => (s.bag[k] || 0) >= n),
    "材料が足りません。まだ何も消費していません。",
  );
  s.cooking = { id: ++s.serial, recipe: id, step: 0, hits: 0, done: false };
}
export function cookingAction(s, step) {
  const j = s.cooking;
  requireThat(
    j && !j.done && s.scene === s.home,
    "調理中の工程を確認してください。",
  );
  const r = recipes.find((r) => r.id === j.recipe);
  requireThat(
    step === j.step,
    "工程を順に進めましょう。手元のお手本で確認できます。",
  );
  if (j.step === r.gesture && ++j.hits < 3) return;
  if (j.step === 3) {
    requireThat(
      Object.entries(r.need).every(([k, n]) => (s.bag[k] || 0) >= n),
      "予約した材料が足りません。材料は消費していません。",
    );
    for (const [k, n] of Object.entries(r.need)) s.bag[k] -= n;
    s.bag[idOf(r)] = (s.bag[idOf(r)] || 0) + r.yield;
    j.done = true;
    j.step = 4;
    s.stats.cooked++;
    advanceTime(s, r.minutes);
    note(s, `${r.name}が${r.yield}食できました。`);
  } else {
    j.step++;
    j.hits = 0;
  }
}
const idOf = (r) => r.id;
export function cancelCooking(s) {
  requireThat(s.cooking && !s.cooking.done, "調理中ではありません。");
  s.cooking = null;
}
export function eat(s, id) {
  requireThat(
    recipes.some((r) => r.id === id) && (s.bag[id] || 0) - reserved(s, id) > 0,
    "食べられる料理がありません。調理の予約分は残します。",
  );
  s.bag[id]--;
  s.stats.eaten++;
  advanceTime(s, 10);
  note(s, `${productById[id].name}を食べて一休み。`);
}
export function talk(s, id, choice) {
  const p = residents.find((p) => p.id === id);
  requireThat(
    p && int(choice, 0, p.replies.length - 1),
    "返事を選んでください。",
  );
  s.history[id] = {
    count: (s.history[id]?.count || 0) + 1,
    last: s.clock,
    choice,
  };
  s.stats.talked++;
  return p.replies[choice].reaction;
}
export function sleep(s) {
  requireThat(
    s.home === s.scene &&
      s.furniture.some((i) => i.kind === "f01" && i.at?.zone === "floor"),
    "自宅にベッドを置いてから休んでください。",
  );
  advanceTime(s, (Math.floor(s.clock / DAY) + 1) * DAY + 480 - s.clock);
  s.stats.slept++;
}
export function wait(s, minutes) {
  requireThat(int(minutes, 1, 7 * DAY), "待てる時間は7日以内です。");
  advanceTime(s, minutes);
}
export function save(storage, s) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
export function validate(s) {
  requireThat(
    s && s.game === "japan-life" && s.version === 1,
    "この作品の対応した版のJSONを選んでください。",
  );
  requireThat(
    Number.isFinite(s.clock) &&
      s.clock >= 0 &&
      s.clock <= DAY * 365 * 100 &&
      int(s.money) &&
      int(s.debt) &&
      int(s.rentThrough) &&
      int(s.serial),
    "時計やお金のデータが範囲外です。",
  );
  requireThat(s.home === null || homeById[s.home], "住居が不明です。");
  requireThat(
    typeof s.scene === "string" &&
      (s.scene === "town" ||
        placeById[s.scene] ||
        homes.some((h) => s.scene === `preview:${h.id}`)),
    "場所が不明です。",
  );
  requireThat(
    s.pos &&
      Number.isFinite(s.pos.x) &&
      Number.isFinite(s.pos.z) &&
      Math.abs(s.pos.x) < 1000 &&
      Math.abs(s.pos.z) < 1000 &&
      Number.isFinite(s.yaw),
    "現在地が壊れています。",
  );
  requireThat(
    s.bag &&
      Object.entries(s.bag).every(
        ([k, n]) => productById[k] && int(n, 0, 99999),
      ) &&
      s.stock &&
      products.every((p) => int(s.stock[p.id], 0, 99999)),
    "在庫が壊れています。",
  );
  requireThat(
    Array.isArray(s.furniture) &&
      s.furniture.length < 2000 &&
      new Set(s.furniture.map((i) => i.uid)).size === s.furniture.length &&
      s.furniture.every(
        (i) =>
          typeof i.uid === "string" &&
          furniture.some((f) => f.id === i.kind) &&
          (i.at === null || typeof i.at === "object"),
      ),
    "家具データが壊れています。",
  );
  if (s.home)
    for (const i of s.furniture.filter((i) => i.at)) {
      const error = checkPlacement(s, i.uid, i.at);
      requireThat(!error, error);
    }
  requireThat(
    Array.isArray(s.wardrobe) &&
      s.wardrobe.every((id) => clothes.some((c) => c.id === id)) &&
      s.wear &&
      ["top", "bottom", "shoes"].every(
        (slot) =>
          s.wardrobe.includes(s.wear[slot]) &&
          productById[s.wear[slot]].slot === slot,
      ),
    "服のデータが壊れています。",
  );
  requireThat(
    Array.isArray(s.tools) &&
      s.tools.every((id) => id === "akashipan") &&
      Array.isArray(s.inspected) &&
      s.inspected.every((id) => homeById[id]),
    "道具や内見データが壊れています。",
  );
  requireThat(
    Array.isArray(s.jobs) &&
      s.jobs.length <= deliveries.length &&
      new Set(s.jobs.map((j) => j.id)).size === s.jobs.length &&
      s.jobs.every(
        (j) =>
          deliveries.some((d) => d.id === j.id) &&
          ["accepted", "carrying", "done", "cancelled"].includes(j.status) &&
          Number.isFinite(j.accepted) &&
          Number.isFinite(j.deadline) &&
          j.deadline >= j.accepted &&
          int(j.paid),
      ) &&
      s.jobs.filter((j) => ["accepted", "carrying"].includes(j.status))
        .length <= 3,
    "配達データが壊れています。",
  );
  requireThat(
    s.cafe === null ||
      (int(s.cafe.id) &&
        int(s.cafe.step, 0, 4) &&
        typeof s.cafe.done === "boolean" &&
        s.cafe.done === (s.cafe.step === 4) &&
        (s.cafe.prepared === null ||
          (["coffee", "tea"].includes(s.cafe.prepared.drink) &&
            int(s.cafe.prepared.qty, 1, 3) &&
            typeof s.cafe.prepared.milk === "boolean" &&
            typeof s.cafe.prepared.takeout === "boolean"))),
    "勤務データが壊れています。",
  );
  requireThat(
    s.cooking === null ||
      (int(s.cooking.id) &&
        recipes.some((r) => r.id === s.cooking.recipe) &&
        int(s.cooking.step, 0, 4) &&
        int(s.cooking.hits, 0, 3) &&
        typeof s.cooking.done === "boolean" &&
        s.cooking.done === (s.cooking.step === 4)),
    "調理データが壊れています。",
  );
  requireThat(
    s.settings &&
      ["sound", "ambient", "shadows", "musicMuted"].every(
        (k) => typeof s.settings[k] === "boolean",
      ) &&
      typeof s.settings.voice === "string" &&
      Number.isFinite(s.settings.volume) &&
      s.settings.volume >= 0 &&
      s.settings.volume <= 1,
    "設定が壊れています。",
  );
  requireThat(
    ["musicVolume", "voiceVolume"].every(
      (k) =>
        Number.isFinite(s.settings[k]) &&
        s.settings[k] >= 0 &&
        s.settings[k] <= 1,
    ) &&
      s.music &&
      typeof s.music.homeTrack === "string" &&
      s.music.homeTrack.length < 100 &&
      typeof s.music.homeStopped === "boolean",
    "音楽の設定が壊れています。",
  );
  requireThat(
    s.history &&
      typeof s.history === "object" &&
      Object.entries(s.history).every(
        ([id, h]) =>
          residents.some((p) => p.id === id) &&
          int(h.count) &&
          Number.isFinite(h.last) &&
          int(h.choice, 0, 2),
      ) &&
      Array.isArray(s.notes) &&
      s.notes.length < 2000 &&
      s.notes.every((n) => typeof n === "string" && n.length < 500) &&
      Array.isArray(s.events) &&
      s.events.length <= 80 &&
      s.events.every(
        (e) =>
          typeof e.text === "string" &&
          e.text.length < 500 &&
          Number.isFinite(e.clock),
      ) &&
      s.stats &&
      [
        "bought",
        "worked",
        "delivered",
        "cooked",
        "talked",
        "slept",
        "moved",
        "eaten",
      ].every((k) => int(s.stats[k])),
    "記録が壊れています。",
  );
  requireThat(
    Array.isArray(s.supportLog) &&
      s.supportLog.length <= 500 &&
      s.supportLog.every(
        (r) =>
          ["copy", "speech-ended", "speech-error"].includes(r.type) &&
          typeof r.target === "string" &&
          r.target.length < 1000 &&
          Number.isFinite(r.clock),
      ),
    "支援の記録が壊れています。",
  );
  return s;
}
export function parse(raw) {
  requireThat(
    typeof raw === "string" && raw.length < 5e6,
    "5MB以内のJSONを選んでください。",
  );
  const s = JSON.parse(raw);
  // 公開済みv0.1.0の保存へ追加項目だけを補完し、他の不正データは受け入れない。
  if (s?.game === "japan-life" && s.version === 1) {
    if (s.music === undefined)
      s.music = { homeTrack: "jp_home_default", homeStopped: false };
    if (s.settings && typeof s.settings === "object") {
      for (const [k, v] of Object.entries({
        voiceVolume: 0.85,
        musicVolume: 0.28,
        musicMuted: false,
      }))
        if (s.settings[k] === undefined) s.settings[k] = v;
    }
    if (s.stock && typeof s.stock === "object" && s.stock.f25 === undefined)
      s.stock.f25 = 5;
  }
  return validate(s);
}
export function load(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return { state: raw ? parse(raw) : fresh(), warning: "" };
  } catch {
    return {
      state: fresh(),
      warning:
        "保存を読み込めません。新しく遊べます。必要なら設定から正しいJSONを読み込んでください。",
    };
  }
}
