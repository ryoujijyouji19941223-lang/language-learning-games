// Work objects are separate from household ingredients. A real cup occupies one place.
export const workStations = [
  { id: "ceramic", name: "店内用カップの棚", x: -3.3, z: -1.9 },
  { id: "paper", name: "持ち帰りカップの棚", x: -2.3, z: -1.9 },
  { id: "coffee", name: "コーヒーマシン", x: -0.7, z: -1.9 },
  { id: "tea", name: "紅茶のポット", x: 0.9, z: -1.9 },
  { id: "lid", name: "ふたを付ける", x: 2.1, z: -2.6 },
  { id: "pitcher", name: "小さなミルク容器を取る", x: 3.0, z: -.6 },
  { id: "milk", name: "ミルクの置き場", x: 3.0, z: -2.1 },
  { id: "tray", name: "トレー", x: 1.45, z: -1.7 },
  { id: "serve", name: "注文したお客さんに渡す", x: 0, z: -1.7 },
  { id: "discard", name: "作り直しの返却口", x: -3.3, z: -0.8 },
];
export const emptyWork = () => ({
  hand: null,
  machine: null,
  tray: [],
  milkSide: false,
  carryingTray: false,
  pouring: null,
  serial: 0,
});
const need = (value, message) => {
  if (!value) throw Error(message);
};
export function ensureWork(s) {
  need(s.cafe && !s.cafe.done, "勤務を始めると道具を使えます。");
  if (!s.cafe.work) {
    s.cafe.work = emptyWork();
    const p = s.cafe.prepared;
    if (p) {
      s.cafe.work.tray = Array.from({ length: p.qty }, (_, i) => ({
        kind: "cup",
        id: i + 1,
        container: p.takeout ? "paper" : "ceramic",
        drink: p.drink,
        milkInside: false,
        lidded: p.takeout,
      }));
      s.cafe.work.milkSide = p.milk;
      s.cafe.work.serial = p.qty;
    }
  }
  return s.cafe.work;
}
export function toolAction(s, id) {
  need(s.scene === "market_cafe", "喫茶店の道具です。");
  const station = workStations.find((t) => t.id === id);
  need(station, "その道具は見つかりません。");
  need(
    Math.hypot(s.pos.x - station.x, s.pos.z - station.z) < 1.15,
    "道具のそばへ歩いてください。",
  );
  const w = ensureWork(s);
  if (id === "discard") {
    s.cafe.work = emptyWork();
    s.cafe.prepared = null;
    return "器とトレーを戻しました。もう一度作れます。";
  }
  if (["ceramic", "paper"].includes(id)) {
    need(!w.hand && !w.carryingTray, "手元を空けてください。");
    w.hand = {
      kind: "cup",
      id: ++w.serial,
      container: id,
      drink: null,
      milkInside: false,
      lidded: false,
    };
    return id === "paper"
      ? "紙のカップを取りました。"
      : "店内用のカップを取りました。";
  }
  if (["coffee", "tea"].includes(id)) {
    need(!w.carryingTray, "先にトレーを置いてください。");
    if (!w.machine) {
      need(
        w.hand?.kind === "cup" && !w.hand.drink,
        "空のカップを器具へ置いてください。",
      );
      w.machine = { tool: id, cup: w.hand };
      w.hand = null;
      return "カップを器具に置きました。もう一度調べると注ぎます。";
    }
    need(w.machine.tool === id, "もう一方の器具にカップがあります。");
    if (w.pouring) return "注いでいます。少し待ってください。";
    if (!w.machine.cup.drink) {
      w.pouring = { tool: id, remaining: 2.6 };
      return id === "coffee"
        ? "コーヒーを抽出しています。"
        : "紅茶をポットから注いでいます。";
    }
    need(!w.hand, "手元を空けてから取ってください。");
    w.hand = w.machine.cup;
    w.machine = null;
    return "できた飲み物を取りました。";
  }
  if (id === "pitcher") {
    need(!w.hand && !w.carryingTray, "手元を空けてください。");
    w.hand = { kind: "pitcher", filled: false };
    return "別添え用の小さな容器を取りました。";
  }
  if (id === "milk") {
    need(w.hand && !w.carryingTray, "カップか小さな容器を持ってきてください。");
    if (w.hand.kind === "pitcher") {
      w.hand.filled = true;
      return "小さな容器にミルクを注ぎました。";
    }
    need(w.hand.drink, "先に飲み物を作ってください。");
    w.hand.milkInside = true;
    return "飲み物にミルクを加えました。「別で」の注文では別の容器を使います。";
  }
  if (id === "lid") {
    need(
      w.hand?.kind === "cup" && w.hand.container === "paper" && w.hand.drink,
      "できた飲み物が入った紙カップを持ってきてください。",
    );
    w.hand.lidded = true;
    return "持ち帰り用のふたを付けました。";
  }
  if (id === "tray") {
    if (w.carryingTray) {
      w.carryingTray = false;
      return "トレーを台に戻しました。";
    }
    if (w.hand?.kind === "pitcher") {
      need(w.hand.filled, "ミルクを注いでから置いてください。");
      need(!w.milkSide, "ミルクは既に別添えしています。");
      w.milkSide = true;
      w.hand = null;
      return "ミルクを飲み物とは別に置きました。";
    }
    if (w.hand) {
      need(w.hand.drink, "空のカップは先に器具へ置いてください。");
      need(w.tray.length < 3, "トレーは三杯までです。");
      w.tray.push(w.hand);
      w.hand = null;
      return "飲み物をトレーへ置きました。";
    }
    need(w.tray.length, "先に飲み物をトレーへ置いてください。");
    w.carryingTray = true;
    return "トレーを持ちました。注文したお客さんへ運びましょう。";
  }
  if (id === "serve") return "serve";
}
export function tickWork(s, dt) {
  const w = s.cafe?.work;
  if (!w?.pouring) return;
  w.pouring.remaining = Math.max(0, w.pouring.remaining - dt);
  if (w.pouring.remaining === 0) {
    w.machine.cup.drink = w.pouring.tool;
    w.pouring = null;
    return true;
  }
}
export function trayOrder(s) {
  const w = ensureWork(s);
  need(w.carryingTray && !w.hand, "トレーを持ってお客さんへ渡してください。");
  need(w.tray.length, "トレーが空です。");
  need(
    w.tray.every(
      (c) => c.drink === w.tray[0].drink && c.container === w.tray[0].container,
    ),
    "同じ注文の飲み物と容器をそろえてください。",
  );
  need(
    w.tray.every((c) => !c.milkInside),
    "この注文ではミルクを飲み物に混ぜず、必要なら別の容器へ注いでください。",
  );
  need(
    w.tray.every((c) => c.container !== "paper" || c.lidded),
    "持ち帰り用のカップにふたを付けてください。",
  );
  return {
    drink: w.tray[0].drink,
    qty: w.tray.length,
    takeout: w.tray[0].container === "paper",
    milk: w.milkSide,
  };
}
export function validateWork(w) {
  const cup = (c) =>
    c &&
    c.kind === "cup" &&
    Number.isInteger(c.id) &&
    c.id > 0 &&
    ["paper", "ceramic"].includes(c.container) &&
    [null, "coffee", "tea"].includes(c.drink) &&
    typeof c.milkInside === "boolean" &&
    typeof c.lidded === "boolean";
  const hand = w?.hand;
  need(
    w &&
      Number.isInteger(w.serial) &&
      w.serial >= 0 &&
      (hand === null ||
        cup(hand) ||
        (hand.kind === "pitcher" && typeof hand.filled === "boolean")) &&
      Array.isArray(w.tray) &&
      w.tray.length <= 3 &&
      w.tray.every((c) => cup(c) && c.drink) &&
      typeof w.milkSide === "boolean" &&
      typeof w.carryingTray === "boolean",
    "道具とカップの記録が壊れています。",
  );
  need(
    w.machine === null ||
      (["coffee", "tea"].includes(w.machine.tool) && cup(w.machine.cup)),
    "器具のカップが壊れています。",
  );
  need(
    w.pouring === null ||
      (w.machine &&
        !w.machine.cup.drink &&
        w.pouring.tool === w.machine.tool &&
        Number.isFinite(w.pouring.remaining) &&
        w.pouring.remaining > 0 &&
        w.pouring.remaining <= 2.6),
    "抽出の途中記録が壊れています。",
  );
  const cups = [
    ...(hand?.kind === "cup" ? [hand] : []),
    ...(w.machine ? [w.machine.cup] : []),
    ...w.tray,
  ];
  need(
    new Set(cups.map((c) => c.id)).size === cups.length,
    "同じカップが複数の場所にあります。",
  );
  need(
    !w.carryingTray || (!w.hand && w.tray.length),
    "トレーの持ち方が壊れています。",
  );
  return w;
}
