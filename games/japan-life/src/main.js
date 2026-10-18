import "./style.css";
import { conversationFor, speakerLabel } from "./dialogue.js";
import { configureSurfaces } from "./art/materials.js";
import { textureSources } from "./art/texture-sources.js";
configureSurfaces(textureSources);
import { World } from "./world.js";
import { AudioSupport } from "./audio.js";
import { MusicPlayer } from "./music.js";
import { tracks, trackById } from "./music-data.js";
import { musicSources } from "./music-sources.js";
import * as E from "./engine.js";
import {
  places,
  placeById,
  homes,
  homeById,
  products,
  productById,
  furniture,
  clothes,
  recipes,
  residents,
  residentPosition,
  deliveries,
  destinations,
  cafeOrders,
} from "./data.js";

let storage;
try {
  storage = localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
}
const loaded = E.load(storage);
let state = loaded.state;
const hud = document.querySelector("#hud"),
  overlay = document.querySelector("#overlay"),
  context = document.querySelector("#context"),
  warning = document.querySelector("#save-warning");
let panel = null,
  detail = null,
  feedback = "",
  draft = null,
  composition = false,
  first = true,
  frameTime = performance.now(),
  hudTimer = 0,
  saveTimer = 0,
  footstep = 0;
const audio = new AudioSupport();
const music = new MusicPlayer(musicSources);
audio.onSpeaking = (active) => music.duck(active);
function activateAudio() {
  if (
    !music.context ||
    music.blocked ||
    (music.context.state === "suspended" && !music.paused)
  )
    void music.unlock();
}
document.addEventListener("pointerdown", activateAudio, { capture: true });
document.addEventListener("keydown", activateAudio, { capture: true });
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const yen = (v) => Math.floor(v).toLocaleString("ja-JP") + "円";
const b = (a, text, data = "", cls = "") =>
  `<button data-action="${a}" data-id="${esc(data)}" class="${cls}">${text}</button>`;
const check = (key, label, checked = false) =>
  `<label class="check"><input type="checkbox" name="${key}" ${checked ? "checked" : ""}>${label}</label>`;
function warn(text) {
  warning.textContent = text;
  warning.hidden = !text;
}
warn(loaded.warning);
function persist() {
  if (!E.save(storage, state))
    warn(
      "保存できません。この画面では遊べます。設定のJSON書き出しで記録を残してください。",
    );
}
function toast(text) {
  const el = document.querySelector("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3300);
}
let dialogue = null,
  dialogueTimer = null;
let world;
try {
  world = new World(document.querySelector("#world"), warn);
} catch (error) {
  warn(
    "3Dを起動できません。WebGL 2に対応するChromeやEdgeなどで開いてください。" +
      error.message,
  );
  document.querySelector("#loading").textContent =
    "3Dの初期化に失敗しました。ブラウザのハードウェアアクセラレーションも確認してください。";
  throw error;
}
function open(kind, id = null) {
  clearTimeout(dialogueTimer);
  if (kind === "npc")
    dialogue = {
      ...conversationFor(id),
      cursor: 0,
      auto: false,
      reply: null,
      choose: false,
    };
  else dialogue = null;
  audio.stop();
  music.preview = null;
  music.setPaused(document.hidden || kind === "welcome");
  world.keys.clear();
  world.touch = { x: 0, z: 0 };
  panel = kind;
  detail = id;
  feedback = "";
  render();
}
function close() {
  clearTimeout(dialogueTimer);
  dialogue = null;
  audio.stop();
  music.preview = null;
  music.setPaused(document.hidden);
  panel = null;
  detail = null;
  draft = null;
  world.setGhost?.(state, null, null);
  world.keys.clear();
  render();
  persist();
}
function notice(text) {
  feedback = text;
  renderPanel();
}
function title(name, kicker = "暮らしの手帳") {
  return `<div class="panel-head"><div><span class="eyebrow">${kicker}</span><h1>${esc(name)}</h1></div>${b("close", "×", "", "icon")}</div>`;
}
function renderHud() {
  const d = E.calendar(state.clock),
    home = state.home ? homeById[state.home].name : "部屋を内見中";
  const scene =
    state.scene === "town"
      ? state.pos.z > 25
        ? "港と海岸"
        : state.pos.x < -13
          ? "住宅地"
          : state.pos.z < -40
            ? "駅前と公園"
            : "商店街"
      : state.scene.startsWith("preview:")
        ? "部屋の内見"
        : placeById[state.scene]?.name || "町";
  const markup = `<header class="topbar"><div class="brand"><span class="brand-icon">汐</span><div>汐待町<small>SHIOMACHI</small></div></div><div class="date"><strong>${d.month}月${d.day}日 ${["月", "火", "水", "木", "金", "土", "日"][d.weekday]}曜日</strong><span>${d.season} · ${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}</span></div><div class="wallet">${yen(state.money)}<small>${state.debt ? "未払い " + yen(state.debt) : ""}</small></div></header><nav class="tools" aria-label="暮らしのメニュー">${b("map", "地図 M")}${b("phone", "スマホ・配達")}${b("journal", "暮らしの手帳")}${b("settings", "設定")}${music.blocked ? b("start-audio", "音を再生する") : ""}</nav><div class="where"><span class="eyebrow">${scene === "港と海岸" ? "SEASIDE" : scene === "商店街" ? "MARKET STREET" : scene === "住宅地" ? "NEIGHBOURHOOD" : "SHIOMACHI"}</span><strong>${esc(scene)}</strong><span>${esc(home)}</span>${world.route ? `<p class="route">◇ ${esc(world.route.name)}<br>${state.scene === "town" ? Math.ceil(Math.hypot(state.pos.x - world.route.x, state.pos.z - world.route.z)) + "m 先 · 地図の印へ歩こう" : "まず入口から外へ"}</p>` : ""}</div><div class="help">WASD / 矢印：歩く　Shift：走る　右ドラッグ：視点　E：調べる　Esc：戻る</div>`;
  if (!hud.firstElementChild) hud.innerHTML = markup;
  else {
    const next = document.createElement("div");
    next.innerHTML = markup;
    for (const selector of [".date", ".wallet", ".where", ".help"]) {
      const current = hud.querySelector(selector),
        replacement = next.querySelector(selector);
      if (current && replacement && current.innerHTML !== replacement.innerHTML)
        current.innerHTML = replacement.innerHTML;
    }
    const retry = hud.querySelector('.tools [data-action="start-audio"]');
    if (music.blocked && !retry)
      hud
        .querySelector(".tools")
        .insertAdjacentHTML("beforeend", b("start-audio", "音を再生する"));
    if (!music.blocked && retry) retry.remove();
  }
}
function housing() {
  return `${title("窓から、どんな暮らしを。", "住まいの案内")}<p>三つの部屋を内見して、一室を選べます。初月は支払済み、所持金20,000円から。転居は1,000円、家具はすべて保管箱へ。</p><div class="room-list">${homes.map((h) => `<article class="room-card ${state.scene.endsWith(h.id) ? "selected" : ""}"><div><span class="eyebrow">${h.w} × ${h.d} マス · ${state.inspected.includes(h.id) ? "内見した" : "まだ内見していない"}</span><h2>${h.name}</h2><p>${h.note}</p><strong>月 ${yen(h.rent)}</strong></div>${b("preview", "中を歩いて見る", h.id)}</article>`).join("")}</div>${state.scene.startsWith("preview:") ? `<div class="callout">いま映っているのは ${homeById[state.scene.slice(8)].name}。${state.inspected.length < 3 ? "ほかの部屋の窓も見てみませんか。" : "三つの部屋を見られました。"}</div>${b("contract", state.home === state.scene.slice(8) ? "自分の部屋に戻る" : state.home ? "この部屋へ引っ越す · 1,000円" : "この部屋で暮らす", state.scene.slice(8), "primary wide")}${b("close", "内見中の部屋を歩く", "", "wide")}` : ""}<p class="small">実在物件の相場・寸法・賃貸制度の再現ではありません。</p>`;
}
function shopPanel(id) {
  const p = placeById[id];
  if (p.kind === "office") return housing();
  const goods = products.filter((x) => x.store === id);
  const jobs = state.jobs.filter(
    (j) =>
      j.status === "accepted" &&
      deliveries.find((d) => d.id === j.id).pickup === id,
  );
  return `${title(p.name, "お店のカウンター")}<p>${p.open === 0 && p.close === 24 ? "ご案内の窓口です。" : `${p.open}:00〜${p.close}:00 ${p.closedDay === 2 ? "· 水曜休み" : ""}`}</p>${p.kind === "cafe" ? `${b("cafe", state.cafe && !state.cafe.done ? "勤務の続きをする" : "短時間勤務を見る", null, "primary wide")}<p class="small">4客の注文を準備して渡す仕事。2時間・2,000円。誤提供は作り直せます。</p>` : ""}${jobs.map((j) => `<article class="list-row"><span>${j.id} · ${deliveries.find((d) => d.id === j.id).item}</span>${b("pickup", "この荷物を受け取る", j.id)}</article>`).join("")}<div class="product-list">${goods.map((g) => `<article class="product" data-product="${g.id}"><div><span class="eyebrow">${g.kind === "food" ? "食材" : g.kind === "furniture" ? `${g.zone === "floor" ? "床" : g.zone === "wall" ? "壁" : g.zone === "window" ? "窓" : "机上"} ${g.w}×${g.d}` : g.kind === "clothes" ? "着替え" : "道具"}</span><h2>${g.name}</h2><span>${yen(g.price)} · 店の在庫 ${state.stock[g.id]}</span></div><div class="buy-controls"><label class="sr-only" for="qty-${g.id}">${g.name}の数量</label><input id="qty-${g.id}" type="number" min="1" max="99" value="1" aria-label="${g.name}の数量">${b("buy", "買う", g.id)}</div></article>`).join("")}</div>${goods.length ? "" : "<p>配達の受付と町の案内をしています。</p>"}`;
}
function cafePanel() {
  const j = state.cafe;
  if (!j || j.done)
    return `${title("喫茶つばめのお手伝い", "短時間勤務")}<p>4人のお客さんの注文を確認し、飲み物・数量・店内か持ち帰り・ミルクを準備して渡します。</p><div class="callout">所要時間 2時間 · 報酬 2,000円<br>時間と支払いは、4客目を終えたときに一度だけ。途中保存できます。</div>${j?.done ? "<p>前の勤務は完了・支払済みです。</p>" : ""}${b("start-cafe", "この勤務を始める", null, "primary wide")}`;
  const order = cafeOrders[j.step];
  return `${title(`お客さん ${j.step + 1} / 4`, "喫茶つばめ・勤務中")}<blockquote>${order.text}</blockquote>${support(order.text, "注文を読み返し、内容を確認できます。")}<div class="order-form"><label>飲み物<select id="drink"><option value="coffee">ホットコーヒー</option><option value="tea">紅茶</option></select></label><label>数量<input id="cups" type="number" min="1" max="3" value="1"></label>${check("takeout", "持ち帰り用にする")}${check("milk", "ミルクを別にする")}${b("prepare", "トレーに準備する", null, "primary wide")}</div>${j.prepared ? `<div class="tray" aria-label="準備したトレー">${Array.from({ length: j.prepared.qty }, () => `<span class="cup ${j.prepared.drink}">☕</span>`).join("")}<p>${j.prepared.drink === "coffee" ? "コーヒー" : "紅茶"} ${j.prepared.qty}杯 · ${j.prepared.takeout ? "持ち帰り" : "店内"} · ${j.prepared.milk ? "別のミルク付き" : "ミルクなし"}</p></div>${b("serve", "お客さんに渡す", null, "primary wide")}` : ""}<p class="small">間違えても何度でも準備し直せます。支援や入力速度で報酬を減らしません。</p>`;
}
function phonePanel() {
  return `${title("行き先を選んで、ひと仕事。", "スマホ・配達")}<p>同時に3件まで。集荷場所の店内で荷物を受け取り、町の受け取り口へ歩いて渡します。会話・確認中は時計停止。遅れても半額で届けられます。</p>${deliveries
    .map((d) => {
      const j = state.jobs.find((j) => j.id === d.id),
        dest = destinations.find((x) => x.id === d.dest),
        p = placeById[d.pickup];
      return `<article class="job"><span class="eyebrow">${d.id} · ${j ? { accepted: "受注済み・まだ集荷前", carrying: "この仕事の荷物を所持", done: "配達完了", cancelled: "取消済み" }[j.status] : "受付中"}</span><h2>${d.item} × ${d.qty}</h2><p>${p.name} → ${dest.name}</p><strong>${yen(d.reward)} / 受注から${d.limit}分</strong>${j && ["accepted", "carrying"].includes(j.status) ? `<p class="${state.clock > j.deadline ? "late" : ""}">${state.clock > j.deadline ? "遅配 · 報酬は半額" : `残り ${Math.ceil(j.deadline - state.clock)}分`}</p><div class="button-row">${b("route-place", "集荷店を地図で見る", d.pickup)}${b("route-drop", "届け先を地図で見る", d.dest)}${b("cancel-job", "取消", d.id)}</div>` : !j ? b("accept", "受ける", d.id) : `<p>受取報酬 ${yen(j.paid)}</p>`}</article>`;
    })
    .join("")}`;
}
function kitchenPanel() {
  const j = state.cooking;
  if (j && !j.done) {
    const r = recipes.find((r) => r.id === j.recipe);
    return `${title(r.name, "台所・調理中")}<p>材料は予約中。完成までは消費しません。閉じても続きを再開できます。</p><ol class="recipe-steps">${r.steps.map((text, i) => `<li class="${i === j.step ? "current" : i < j.step ? "done" : ""}">${esc(text)} ${i < j.step ? "✓" : ""}</li>`).join("")}</ol><div class="cook-stage"><div class="pot"><span style="transform:rotate(${j.hits * 30}deg)">🥄</span></div><strong>${r.steps[j.step]}</strong>${j.step === r.gesture ? `<p>手元の操作を3回。${j.hits} / 3</p>${b("cook-step", r.steps[j.step] + " · 手を動かす", String(j.step), "primary wide")}` : b("cook-step", r.steps[j.step] + " →", String(j.step), "primary wide")}</div>${support(r.steps[j.step], r.reading)}${b("cancel-cook", "調理を取り消す（材料は戻したまま）", null, "wide")}`;
  }
  return `${title("今日、なにを作ろう。", "自宅の台所")}${j?.done ? `<div class="callout">${productById[j.recipe].name}が完成しました。材料と時間は処理済みです。</div>` : ""}<p>ゲーム用に数量・工程を省略しています。実用の加熱や安全な調理を教えるレシピではありません。</p>${recipes
    .map(
      (r) =>
        `<article class="recipe"><span class="eyebrow">${r.tool} · ${r.minutes}分 · ${r.yield}食</span><h2>${r.name}</h2><p>${r.source}</p><form data-recipe="${r.id}"><div class="ingredients">${Object.entries(
          r.need,
        )
          .map(
            ([k, n]) =>
              `<label><input type="checkbox" name="ingredient" value="${k}">${productById[k]?.name || k} ${n} / 所持 ${state.bag[k] || 0}</label>`,
          )
          .join(
            "",
          )}</div>${b("start-cook", "材料を選んで料理を始める", r.id, "primary")}</form></article>`,
    )
    .join("")}<h2>できた料理</h2>${meals()}`;
}
function meals() {
  return (
    recipes
      .filter((r) => (state.bag[r.id] || 0) > 0)
      .map(
        (r) =>
          `<div class="list-row"><span>${r.name} × ${state.bag[r.id]}</span>${b("eat", "食べる", r.id)}</div>`,
      )
      .join("") || "<p>まだ完成した料理はありません。</p>"
  );
}
function furnishPanel() {
  if (state.scene !== state.home)
    return `${title("部屋を整える")}<p>自分の部屋に戻ると、保管箱と家具の配置を使えます。</p>`;
  if (!draft)
    return `${title("好きなものを、好きな場所へ。", "家具と保管箱")}<p>床・壁・窓・机上を別に扱います。配置を確定する前なら取り消せます。出口と台所、ベッドや椅子の使用面への道を残してください。</p>${state.furniture.map((i) => `<article class="list-row"><div><h2>${productById[i.kind].name}</h2><span>${i.at ? "配置中" : "保管中"} · ${productById[i.kind].zone}</span></div><div>${b("edit-furniture", "配置・移動", i.uid)}${i.at ? b("store-furniture", "保管", i.uid) : ""}</div></article>`).join("")}`;
  const item = state.furniture.find((i) => i.uid === draft.uid),
    p = productById[item.kind],
    h = homeById[state.home],
    at = draft.at,
    error = E.checkPlacement(state, item.uid, at);
  let controls = "";
  if (p.zone === "floor")
    controls = `<p>マスを押して位置を選択。${p.w} × ${p.d}マス、向き ${at.rot}°。</p><div class="floor-grid" style="grid-template-columns:repeat(${h.w},1fr)">${Array.from(
      { length: h.w * h.d },
      (_, i) => {
        const x = i % h.w,
          z = Math.floor(i / h.w),
          [w, d] = E.floorSize(p, at),
          selected = x >= at.x && x < at.x + w && z >= at.z && z < at.z + d;
        return `<button data-action="floor-cell" data-x="${x}" data-z="${z}" class="${selected ? "draft-cell" : E.occupied(state, item.uid).has(`${x},${z}`) ? "occupied" : ""}" aria-label="床 ${x},${z}">${x === Math.floor(h.w / 2) && z === h.d - 1 ? "扉" : x === 0 && z === 0 ? "台所" : ""}</button>`;
      },
    ).join("")}</div>${b("rotate", "90度回転", null, "wide")}`;
  if (p.zone === "wall")
    controls = `<label>壁<select id="wall">${["north", "east", "south", "west"].map((w, i) => `<option value="${w}" ${at.wall === w ? "selected" : ""}>${["奥", "右", "手前", "左"][i]}の壁</option>`).join("")}</select></label><label>横のマス<input id="wall-u" type="number" min="0" max="${h.d}" value="${at.u}"></label><label>高さのマス<input id="wall-v" type="number" min="1" max="5" value="${at.v}"></label><p>高さ2マス＝床から1m。低い机の後ろでも壁の判定は消えません。</p>`;
  if (p.zone === "window")
    controls = `<label>窓<select id="window">${Array.from({ length: h.windows }, (_, i) => `<option value="${i}" ${at.window === i ? "selected" : ""}>窓 ${i + 1}</option>`).join("")}</select></label>`;
  if (p.zone === "anchor")
    controls = `<label>机のアンカー<select id="anchor">${state.furniture
      .filter(
        (i) => ["f02", "f04", "f05"].includes(i.kind) && i.at?.zone === "floor",
      )
      .map(
        (i) =>
          `<option value="${i.uid}" ${at.host === i.uid ? "selected" : ""}>${productById[i.kind].name} (${i.uid})</option>`,
      )
      .join("")}</select></label>`;
  return `${title(p.name, "配置のプレビュー")}<p>半透明のモデルが設置候補です。確定前の編集はセーブに影響しません。</p>${controls}<p class="${error ? "error" : "valid"}" role="status">${error || "✓ この場所に置けます。"}</p><div class="button-row">${b("confirm-furniture", "ここに置く", null, "primary")}${b("cancel-furniture", "取消して戻る")}</div>`;
}
function mapPanel() {
  return `${title("歩いて、町を知る。", "町の地図")}<p>行き先を選ぶと町に印がつきます。地図からの瞬間移動はありません。</p><div class="town-map"><span class="sea-map">港と海</span><span class="map-road"></span>${places.map((p) => `<button data-action="route-place" data-id="${p.id}" style="left:${((p.x + 73) / 146) * 100}%;top:${((p.z + 74) / 123) * 100}%" title="${p.name}">${p.kind === "home" ? "⌂" : p.kind === "board" ? "▤" : "●"}<small>${p.name}</small></button>`).join("")}<span class="you" style="left:${((state.pos.x + 73) / 146) * 100}%;top:${((state.pos.z + 74) / 123) * 100}%">◎</span></div><div class="place-list">${places.map((p) => b("route-place", p.name, p.id)).join("")}</div><details><summary>町の60人を探す</summary><p>全員に固有の会話があります。ここは名簿で、会話は本人のところへ歩いてから。</p>${residents.map((p) => `<div class="list-row"><span>${p.name} · ${p.role} / ${p.area}</span>${b("route-npc", "場所に印をつける", p.id)}</div>`).join("")}</details>`;
}
function support(text, reading) {
  return `<div class="support"><details><summary>読み・やさしい意味・任意入力</summary><p>${esc(reading)}</p><p>確認や入力は生活の条件ではありません。選択・転記・再聴は別の記録です。</p>${b("practice", "ことばを写してみる", reading.split("／")[0])}</details><div class="button-row">${b("speak", "再聴", text)}${b("slow", "ゆっくり", text)}${b("stop-speech", "停止")}</div><p id="speech-status" role="status"></p></div>`;
}
function scheduleDialogue() {
  clearTimeout(dialogueTimer);
  if (
    panel === "npc" &&
    dialogue?.auto &&
    !dialogue.choose &&
    !dialogue.reply
  ) {
    const text = dialogue.lines[dialogue.cursor].text;
    dialogueTimer = setTimeout(
      () => {
        if (panel !== "npc" || !dialogue?.auto) return;
        if (dialogue.cursor < dialogue.lines.length - 1) {
          dialogue.cursor++;
          renderPanel();
          scheduleDialogue();
        } else {
          dialogue.auto = false;
          renderPanel();
        }
      },
      Math.max(state.settings.autoDelay * 1000, text.length * 100),
    );
  }
}
function npcPanel() {
  const p = residents.find((p) => p.id === detail),
    line = dialogue.lines[dialogue.cursor],
    last = dialogue.cursor === dialogue.lines.length - 1;
  return `${title(speakerLabel(line.speaker), "町のひとと、ひと休み")}${!dialogue.reply ? `<blockquote class="dialogue-line">${esc(line.text)}</blockquote>` : ""}${dialogue.reply ? `<div class="dialogue-exchange"><p><span>あなた</span>${esc(dialogue.reply.text)}</p><p><span>${speakerLabel(detail)}</span>${esc(dialogue.reply.reaction)}</p></div>` : ""}${dialogue.choose ? `<div class="dialogue-choices">${p.replies.map((r, i) => b("reply", esc(r.text), String(i))).join("")}</div>` : ""}${last && dialogue.kind === "work" ? `<p>2時間 · 2,000円。今から働きますか？</p><div class="button-row">${b("work-yes", "はい")}${b("work-no", "今はやめておく")}</div>` : ""}<div class="dialogue-controls">${dialogue.cursor > 0 ? b("dialogue-back", "前の話") : ""}${b("dialogue-next", last ? "会話を終える" : "次へ →", null, "primary")}${b("dialogue-auto", dialogue.auto ? "自動送りを止める" : "自動送り")}${last && dialogue.kind === "optional" && !dialogue.reply ? b("dialogue-choose", "ひとこと返す") : ""}</div>${support(dialogue.reply?.reaction || line.text, p.reading + "。" + p.meaning)}`;
}
function wardrobe() {
  return `${title("今日は、どんな服で。", "着替え")}<p>服は買っただけでは変わりません。「着る」で主人公に反映されます。</p>${[
    "top",
    "bottom",
    "shoes",
  ]
    .map(
      (slot, i) =>
        `<h2>${["上の服", "下の服", "靴"][i]}</h2><div class="clothes-list">${clothes
          .filter((c) => c.slot === slot && state.wardrobe.includes(c.id))
          .map(
            (c) =>
              `<button data-action="equip" data-id="${c.id}" class="${state.wear[slot] === c.id ? "equipped" : ""}"><span style="background:${c.color}"></span>${c.name} ${state.wear[slot] === c.id ? "✓ 着用中" : "着る"}</button>`,
          )
          .join("")}</div>`,
    )
    .join("")}`;
}
function journal() {
  const stats = state.stats;
  return `${title("今日は、あなたのペースで。")}<p>何もしない散歩の日があっても大丈夫。これは暮らしを試すための手帳で、語学の習得判定ではありません。</p><div class="journal-grid">${[
    ["bought", "買い物"],
    ["talked", "会話を選んだ"],
    ["worked", "喫茶の勤務"],
    ["delivered", "配達"],
    ["cooked", "料理"],
    ["eaten", "食事"],
    ["slept", "睡眠"],
    ["moved", "転居"],
  ]
    .map(
      ([k, name]) =>
        `<div><strong>${stats[k]}</strong><span>${name}</span></div>`,
    )
    .join(
      "",
    )}</div><div class="button-row">${b("wardrobe", "着替える")}${b("furnish", "部屋を整える")}${b("housing", "部屋を内見")}${b("rest", "休む・待つ")}${b("radio", "自宅のラジオ")}</div><h2>持ちもの</h2>${Object.entries(
    state.bag,
  )
    .filter(([, n]) => n > 0)
    .map(
      ([id, n]) =>
        `<div class="list-row"><span>${productById[id]?.name || id}</span><strong>${n}${E.reserved(state, id) ? "（調理の予約あり）" : ""}</strong></div>`,
    )
    .join(
      "",
    )}<h2>作った料理を食べる</h2>${meals()}<h2>残した話題</h2>${state.notes.map((id) => `<p>${esc(residents.find((p) => p.id === id)?.line || id)}</p>`).join("") || "<p>会話からお気に入りを残せます。</p>"}<h2>最近の暮らし</h2>${state.events
    .slice(-10)
    .reverse()
    .map(
      (e) =>
        `<p class="small">${E.calendar(e.clock).month}/${E.calendar(e.clock).day} · ${esc(e.text)}</p>`,
    )
    .join("")}`;
}
function settings() {
  audio.refresh();
  return `${title("設定と、記録。")}<label class="setting">文字の大きさ<select id="textScale">${[100, 125, 150].map((v) => `<option value="${v}" ${state.settings.textScale === v ? "selected" : ""}>${v}%</option>`).join("")}</select></label><label class="setting">自動送りの待ち時間<select id="autoDelay">${[4, 6, 10, 15].map((v) => `<option value="${v}" ${state.settings.autoDelay === v ? "selected" : ""}>${v}秒以上</option>`).join("")}</select></label><details><summary>季節を今日に合わせる</summary><p>保存した日付のまま続けることもできます。変更すると所持品と配達の残り時間を保ち、今日の月日へ移ります。過去の家賃は発生しません。</p>${b("align-calendar", "今日の季節へ移る")}</details>${musicSettings()}<label class="setting">日本語音声<input id="sound" type="checkbox" ${state.settings.sound ? "checked" : ""}></label><label class="setting">日本語の声<select id="voice"><option value="">${audio.voices.length ? "自動で選ぶ" : "日本語の声なし・文字で遊べます"}</option>${audio.voices.map((v) => `<option value="${esc(v.voiceURI)}" ${state.settings.voice === v.voiceURI ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label><label class="setting">仮の波音・足音<input id="ambient" type="checkbox" ${state.settings.ambient ? "checked" : ""}></label><label class="setting">環境音・足音の音量<input id="volume" type="range" min="0" max="1" step="0.05" value="${state.settings.volume}"></label><label class="setting">影を描く<input id="shadows" type="checkbox" ${state.settings.shadows ? "checked" : ""}></label><p>3Dが重い場合は影をオフにできます。音声や保存が使えない場合も、この画面内の暮らしは続けられます。</p><div class="button-row">${b("export", "JSONを書き出す")}<label class="file-button">JSONを読み込む<input type="file" id="import" accept="application/json,.json"></label></div><p>読み込みはこの作品の進行を置き換えます。不正なデータなら現在の記録を保ちます。</p><details><summary>この作品の記録を削除</summary><p>住居・所持品・お金・会話記録を消します。英語試作の保存には触れません。</p>${b("delete", "確認：日本の暮らしの記録を削除", null, "danger")}</details><p class="small">独自の簡易モデル・作成中の会話です。文化・日本語の本人確認、実機スマホ、学習効果は未確認です。</p>`;
}
function musicSettings() {
  return `<h2>音楽と聞き取り</h2><p>収録曲は独自の仮ループです。完成曲の監修・実聴は未確認。</p><label class="setting">音楽を消音<input id="musicMuted" type="checkbox" ${state.settings.musicMuted ? "checked" : ""}></label><label class="setting">音楽の音量<input id="musicVolume" type="range" min="0" max="1" step="0.05" value="${state.settings.musicVolume}"></label><label class="setting">声の音量<input id="voiceVolume" type="range" min="0" max="1" step="0.05" value="${state.settings.voiceVolume}"></label><p id="music-status" role="status"></p><div class="button-row">${b("start-audio", "音を再生する")}${b("radio", "自宅のラジオ")}</div>`;
}
function radioPanel() {
  const unlocked = E.ownsRadio(state),
    atHome = state.scene === state.home;
  return `${title("部屋に、好きな音を。", "自宅のラジオ")}<p>家具店の卓上ラジオ（1,800円）を取得すると自宅で選曲できます。保管・転居でも取得と選曲を保ちます。</p>${!atHome ? '<p class="callout">自宅へ戻ってから試聴・選曲できます。</p>' : !unlocked ? '<p class="callout">ラジオはまだ取得していません。既定曲と停止・音量は選べます。</p>' : "<p>取得済み。机に置いたラジオからも開けます。試聴から戻ると元の曲です。</p>"}<p id="music-status" role="status"></p>${tracks.map((t) => `<article class="recipe"><h2>${t.name}${state.music.homeTrack === t.id ? " ✓ 選択中" : ""}</h2><p>${t.mood}。完成曲ではありません。</p><div class="button-row">${atHome && unlocked ? b("preview-track", "試聴", t.id) : ""}${atHome && (unlocked || t.id === "jp_home_default") ? b("choose-track", "この曲に決める", t.id) : ""}</div></article>`).join("")}<div class="button-row">${b("cancel-preview", "試聴を終える")}${atHome ? b("stop-home-music", "自宅の曲を停止") : ""}${b("start-audio", "音を再生する")}${b("settings", "音量・消音の設定")}</div>`;
}
function updateMusicStatus() {
  music.sync(state);
  const status = music.status(),
    el = document.querySelector("#music-status");
  if (!el) return;
  for (const [key, value] of Object.entries(status))
    if (key !== "message") el.dataset[key] = String(value);
  el.textContent =
    status.message ||
    (state.settings.musicMuted
      ? "音楽は消音中です。"
      : status.paused
        ? "音楽は中断中です。"
        : status.track
          ? `${trackById[status.track].name} · 仮の独自ループ${music.preview ? "を試聴中" : ""}`
          : "音楽は停止中です。");
}
function restPanel() {
  const active = state.jobs.some((j) =>
    ["accepted", "carrying"].includes(j.status),
  );
  return `${title("ひと休み、しよう。")}<p>会話・確認中の時計は停止します。確定した休息の分だけ時間を進めます。</p>${active ? '<p class="callout">受注中の配達があります。待つ・眠ると期限を過ぎる場合があります。</p>' : ""}<div class="button-column">${state.scene === state.home ? b("sleep", "ベッドで翌朝08:00まで眠る") : ""}${b("wait-hour", "1時間待つ")}<label>何日先の朝まで休む？<input id="wait-days" type="number" min="1" max="7" value="1"></label>${b("wait-days", "確認して指定日の08:00へ進む")}</div>${state.debt ? `${b("pay-debt", "払える分の家賃を払う")}<p>未払い ${yen(state.debt)}。利息や強制退去はありません。</p>` : ""}`;
}
const kana =
  "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんー";
function practicePanel() {
  return `${title("ことばを、ゆっくり。", "任意のお手本転記")}<p>お手本：<strong>${esc(detail)}</strong></p><label>写す文字<input id="practice-input" autocomplete="off" autocorrect="off" spellcheck="false"></label><div class="kana">${[...kana].map((k) => b("kana", k, k)).join("")}${b("kana", "濁点", "゛")}${b("kana", "半濁点", "゜")}${b("kana", "小書き", "小")}${b("kana", "⌫", "消")}</div>${b("check-practice", "確認する", null, "primary wide")}<p>漢字も使う入力は端末のIMEを使えます。変換確定前のEnterでは確認しません。文字を写す記録で、理解や自力想起の成功とは扱いません。</p>`;
}
function renderPanel() {
  if (!panel) {
    overlay.innerHTML = "";
    overlay.className = "";
    return;
  }
  overlay.className = `visible ${panel === "welcome" ? "welcome" : panel === "npc" ? "dialogue" : ""}`;
  let content =
    panel === "welcome"
      ? `<div class="welcome-mark">汐</div><span class="eyebrow">SHIOMACHI · A LITTLE LIFE IN JAPAN</span><h1>海風の町で、<br>暮らしをひとつずつ。</h1><p>お店へ寄って、人と話して。<br>働いた日も、ただ歩いた日も、あなたの一日。</p><div class="welcome-actions">${b("begin", state.home ? "暮らしの続きを歩く" : "窓のある部屋を探す", null, "primary wide")}${b("settings", "設定・記録を読み込む", null, "wide")}</div><p class="small">架空の港町・M1/M2初期試作<br>簡易モデルとDRAFT会話。外部AI・APIキー不要。</p>`
      : panel === "housing"
        ? housing()
        : panel === "shop"
          ? shopPanel(detail)
          : panel === "cafe"
            ? cafePanel()
            : panel === "phone"
              ? phonePanel()
              : panel === "kitchen"
                ? kitchenPanel()
                : panel === "furnish"
                  ? furnishPanel()
                  : panel === "map"
                    ? mapPanel()
                    : panel === "npc"
                      ? npcPanel()
                      : panel === "wardrobe"
                        ? wardrobe()
                        : panel === "journal"
                          ? journal()
                          : panel === "radio"
                            ? radioPanel()
                            : panel === "settings"
                              ? settings()
                              : panel === "rest"
                                ? restPanel()
                                : panel === "practice"
                                  ? practicePanel()
                                  : panel === "delivery"
                                    ? `${title(destinations.find((d) => d.id === detail).name, "受け取り口・連絡先")}<p>呼び鈴を押して、ここで受け渡します。不在のときもこの受け取り口で待ち合わせできます。</p>${
                                        state.jobs
                                          .filter(
                                            (j) =>
                                              ["accepted", "carrying"].includes(
                                                j.status,
                                              ) &&
                                              deliveries.find(
                                                (d) => d.id === j.id,
                                              ).dest === detail,
                                          )
                                          .map(
                                            (j) =>
                                              `<div class="job"><p>${j.id} ${j.status === "carrying" ? "所持中の荷物" : "まだ集荷前"}</p>${b("finish-job", "相手に渡す", j.id, "primary")}</div>`,
                                          )
                                          .join("") ||
                                        "<p>この場所宛ての受注はありません。</p>"
                                      }`
                                    : "";
  overlay.innerHTML = `<section class="panel ${panel === "npc" ? "dialogue-panel" : ""}" aria-label="${panel}" role="dialog">${content}${feedback ? `<p class="feedback" role="status">${esc(feedback)}</p>` : ""}</section>`;
  if (panel === "furnish" && draft)
    world.setGhost?.(state, draft.uid, draft.at);
}
function render() {
  document.documentElement.style.setProperty(
    "--text-scale",
    String(state.settings.textScale / 100),
  );
  renderHud();
  renderPanel();
  document.body.classList.toggle("modal-open", !!panel);
}
function route(target) {
  world.route = target;
  close();
  toast("地図の印を目指して歩こう。移動はWASDまたは左スティック。");
}
function interact() {
  if (panel) return;
  const target = world.nearest(state);
  if (!target) {
    toast("人や扉、台所などに近づいて調べてください。");
    return;
  }
  try {
    if (target.type === "door") {
      E.enter(state, target.id);
      world.lastKey = "";
      persist();
      render();
      return;
    }
    if (target.type === "exit") {
      E.exit(state);
      world.lastKey = "";
      persist();
      render();
      return;
    }
    if (target.type === "npc") open("npc", target.id);
    if (target.type === "shop") open("shop", target.id);
    if (target.type === "board") open("phone");
    if (
      target.type === "bench" ||
      target.type === "bed" ||
      target.type === "seat"
    )
      open("rest");
    if (target.type === "kitchen") open("kitchen");
    if (target.type === "furnish") open("furnish");
    if (target.type === "radio") open("radio");
    if (target.type === "delivery") open("delivery", target.id);
  } catch (e) {
    toast(e.message);
  }
}
function runAction(action, id, button) {
  if (action === "align-calendar") {
    E.alignCalendar(state);
    world.lastKey = "";
    persist();
    render();
    return;
  }
  if (action === "dialogue-next") {
    audio.stop();
    if (dialogue.cursor < dialogue.lines.length - 1) {
      dialogue.cursor++;
      dialogue.choose = false;
      dialogue.reply = null;
      renderPanel();
      scheduleDialogue();
    } else {
      if (!dialogue.reply) E.recordReading(state, detail);
      close();
    }
    return;
  }
  if (action === "dialogue-back") {
    dialogue.cursor = Math.max(0, dialogue.cursor - 1);
    dialogue.choose = false;
    dialogue.reply = null;
    audio.stop();
    renderPanel();
    scheduleDialogue();
    return;
  }
  if (action === "dialogue-auto") {
    dialogue.auto = !dialogue.auto;
    renderPanel();
    scheduleDialogue();
    return;
  }
  if (action === "dialogue-choose") {
    dialogue.auto = false;
    clearTimeout(dialogueTimer);
    dialogue.choose = true;
    renderPanel();
    return;
  }
  if (action === "work-yes") {
    E.recordReading(state, detail);
    persist();
    open("cafe");
    return;
  }
  if (action === "work-no") {
    dialogue.lines.push({
      speaker: detail,
      text: "また気が向いたら声をかけてね。",
    });
    dialogue.cursor++;
    dialogue.kind = "listen";
    renderPanel();
    return;
  }

  if (action === "start-audio") {
    void music.unlock();
    return;
  }
  if (action === "preview-track") {
    if (state.scene !== state.home || !E.ownsRadio(state) || !trackById[id])
      throw Error("自宅で、取得したラジオの曲を選んでください。");
    music.preview = id;
    feedback = "試聴中です。決定せず戻ると元の曲へ戻ります。";
  }
  if (action === "choose-track") {
    E.chooseHomeTrack(state, id);
    music.preview = null;
    feedback = "自宅の曲を保存しました。";
  }
  if (action === "cancel-preview") {
    music.preview = null;
    feedback = "選択済みの曲へ戻しました。";
  }
  if (action === "stop-home-music") {
    E.stopHomeMusic(state);
    music.preview = null;
    feedback = "自宅の曲を停止しました。";
  }

  if (action === "close") {
    close();
    return;
  }
  if (action === "begin") {
    open(state.home ? "journal" : "housing");
    if (state.home) close();
    first = false;
    return;
  }
  if (
    [
      "housing",
      "map",
      "phone",
      "settings",
      "journal",
      "wardrobe",
      "furnish",
      "rest",
      "cafe",
      "radio",
    ].includes(action)
  ) {
    draft = null;
    open(action);
    return;
  }
  if (action === "preview") {
    E.preview(state, id);
    world.lastKey = "";
    open("housing");
  }
  if (action === "contract") {
    E.chooseHome(state, id);
    world.lastKey = "";
    close();
    toast("新しい部屋へようこそ。出口に近づいてEで町へ出られます。");
  }
  if (action === "buy") {
    E.buy(state, id, Number(document.querySelector(`#qty-${id}`).value));
    feedback = productById[id].name + "を買いました。";
  }
  if (action === "start-cafe") E.beginCafe(state);
  if (action === "prepare")
    E.prepareOrder(state, {
      drink: document.querySelector("#drink").value,
      qty: Number(document.querySelector("#cups").value),
      milk: document.querySelector('[name="milk"]').checked,
      takeout: document.querySelector('[name="takeout"]').checked,
    });
  if (action === "serve") {
    E.serveOrder(state);
    feedback = state.cafe.done
      ? "勤務終了。2,000円を受け取り、2時間進みました。"
      : "ありがとう。次のお客さんへ。";
  }
  if (action === "accept") E.acceptJob(state, id);
  if (action === "pickup") E.pickupJob(state, id);
  if (action === "finish-job") {
    E.finishJob(state, id);
    feedback = "配達を完了しました。報酬は一度だけ受け取っています。";
  }
  if (action === "cancel-job") E.cancelJob(state, id);
  if (action === "route-place") {
    const p = placeById[id];
    route({ id, name: p.name, x: p.x, z: p.z + (p.d ? p.d / 2 + 0.8 : 0) });
    return;
  }
  if (action === "route-drop") {
    route(destinations.find((d) => d.id === id));
    return;
  }
  if (action === "route-npc") {
    const p = residents.find((p) => p.id === id),
      position = residentPosition(p, state.clock),
      place = placeById[position.scene];
    route({
      id,
      name: p.name + "さん" + (place ? " · " + place.name + "の店内" : ""),
      x: place ? place.x : position.x,
      z: place ? place.z + place.d / 2 + 0.8 : position.z,
    });
    return;
  }
  if (action === "start-cook") {
    const form = button.closest("form");
    E.startCooking(
      state,
      id,
      [...form.querySelectorAll("input:checked")].map((i) => i.value),
    );
  }
  if (action === "cook-step") E.cookingAction(state, Number(id));
  if (action === "cancel-cook") E.cancelCooking(state);
  if (action === "eat") E.eat(state, id);
  if (action === "edit-furniture") {
    const i = state.furniture.find((i) => i.uid === id),
      p = productById[i.kind];
    draft = {
      uid: id,
      at: i.at
        ? structuredClone(i.at)
        : p.zone === "floor"
          ? { zone: "floor", x: 0, z: 2, rot: 0 }
          : p.zone === "wall"
            ? { zone: "wall", wall: "north", u: 2, v: 2 }
            : p.zone === "window"
              ? { zone: "window", window: 0 }
              : {
                  zone: "anchor",
                  host:
                    state.furniture.find(
                      (i) =>
                        ["f02", "f04", "f05"].includes(i.kind) &&
                        i.at?.zone === "floor",
                    )?.uid || "",
                },
    };
  }
  if (action === "floor-cell") {
    draft.at.x = Number(button.dataset.x);
    draft.at.z = Number(button.dataset.z);
  }
  if (action === "rotate") draft.at.rot = (draft.at.rot + 90) % 360;
  if (action === "confirm-furniture") {
    E.placeFurniture(state, draft.uid, draft.at);
    draft = null;
    world.setGhost?.(state, null, null);
    world.lastKey = "";
  }
  if (action === "cancel-furniture") {
    draft = null;
    world.setGhost?.(state, null, null);
  }
  if (action === "store-furniture") {
    E.storeFurniture(state, id);
    world.lastKey = "";
  }
  if (action === "equip") {
    E.equip(state, id);
    toast("服を着替えました。主人公の見た目に反映しています。");
  }
  if (action === "reply") {
    const reaction = E.talk(state, detail, Number(id));
    if (dialogue) {
      dialogue.reply = {
        text: residents.find((p) => p.id === detail).replies[Number(id)].text,
        reaction,
      };
      dialogue.choose = false;
      dialogue.auto = false;
      clearTimeout(dialogueTimer);
    } else feedback = reaction;
  }
  if (action === "bookmark") {
    if (!state.notes.includes(id)) state.notes.push(id);
    feedback = "話題を手帳へ残しました。";
  }
  if (action === "practice") {
    open("practice", id);
    return;
  }
  if (action === "speak" || action === "slow") {
    if (dialogue) {
      dialogue.auto = false;
      clearTimeout(dialogueTimer);
    }
    audio.speak(id, state.settings, action === "slow", (ok, message) => {
      document
        .querySelector("#speech-status")
        ?.replaceChildren(document.createTextNode(message));
      state.supportLog.push({
        type: ok ? "speech-ended" : "speech-error",
        target: id,
        clock: state.clock,
      });
      state.supportLog = state.supportLog.slice(-500);
      persist();
    });
    return;
  }
  if (action === "stop-speech") {
    audio.stop();
    return;
  }
  if (action === "kana") {
    const input = document.querySelector("#practice-input"),
      value = input.value,
      last = value.at(-1) || "";
    if (id === "消") input.value = [...value].slice(0, -1).join("");
    else if (id === "゛" || id === "゜")
      input.value = (value + (id === "゛" ? "\u3099" : "\u309a")).normalize(
        "NFC",
      );
    else if (id === "小") {
      const from = "あいうえおやゆよつ",
        to = "ぁぃぅぇぉゃゅょっ",
        i = from.indexOf(last);
      if (i >= 0) input.value = value.slice(0, -1) + to[i];
    } else input.value += id;
    input.focus();
    return;
  }
  if (action === "check-practice") {
    if (composition) return;
    const value = document
        .querySelector("#practice-input")
        .value.normalize("NFKC")
        .trim(),
      correct = value === detail.normalize("NFKC").trim();
    state.supportLog.push({
      type: "copy",
      target: detail,
      correct,
      clock: state.clock,
    });
    state.supportLog = state.supportLog.slice(-500);
    feedback = correct
      ? "お手本どおり写せました。これは転記の確認です。"
      : "お手本と比べてみよう。入力しなくても暮らしは続けられます。";
  }
  if (action === "sleep") {
    E.sleep(state);
    feedback = "翌朝08:00になりました。";
  }
  if (action === "wait-hour") {
    E.wait(state, 60);
    feedback = "1時間休みました。";
  }
  if (action === "wait-days") {
    const days = Number(document.querySelector("#wait-days").value);
    if (!Number.isInteger(days) || days < 1 || days > 7)
      throw Error("1〜7日を指定してください。");
    E.wait(
      state,
      (Math.floor(state.clock / E.DAY) + days) * E.DAY + 480 - state.clock,
    );
    feedback = "指定した朝になりました。配達の残り時間も確認してください。";
  }
  if (action === "pay-debt") {
    const payment = Math.min(state.money, state.debt);
    state.money -= payment;
    state.debt -= payment;
    feedback = yen(payment) + "を支払いました。";
  }
  if (action === "export") {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "japan-life-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (action === "delete") {
    storage.removeItem(E.SAVE_KEY);
    state = E.fresh();
    world.lastKey = "";
    warn("");
    open("welcome");
    return;
  }
  persist();
  render();
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  e.preventDefault();
  try {
    runAction(button.dataset.action, button.dataset.id, button);
  } catch (error) {
    if (panel) notice(error.message);
    else toast(error.message);
  }
});
document.addEventListener("submit", (e) => e.preventDefault());
document.addEventListener("change", async (e) => {
  const el = e.target;
  try {
    if (
      panel === "settings" &&
      [
        "sound",
        "ambient",
        "shadows",
        "volume",
        "voice",
        "voiceVolume",
        "musicVolume",
        "musicMuted",
        "textScale",
        "autoDelay",
      ].includes(el.id)
    ) {
      state.settings[el.id] =
        el.type === "checkbox"
          ? el.checked
          : [
                "volume",
                "voiceVolume",
                "musicVolume",
                "textScale",
                "autoDelay",
              ].includes(el.id)
            ? Number(el.value)
            : el.value;
      audio.ambient(state.settings.ambient, state.settings.volume);
      music.sync(state);
      document.documentElement.style.setProperty(
        "--text-scale",
        String(state.settings.textScale / 100),
      );
      persist();
    }
    if (panel === "furnish" && draft) {
      if (el.id === "wall") draft.at.wall = el.value;
      if (el.id === "wall-u") draft.at.u = Number(el.value);
      if (el.id === "wall-v") draft.at.v = Number(el.value);
      if (el.id === "window") draft.at.window = Number(el.value);
      if (el.id === "anchor") draft.at.host = el.value;
      renderPanel();
    }
    if (el.id === "import") {
      const file = el.files[0];
      if (!file) return;
      if (file.size > 5e6) throw Error("5MB以内のJSONを選んでください。");
      const imported = E.parse(await file.text());
      state = imported;
      world.lastKey = "";
      persist();
      feedback = "記録を読み込みました。閉じると続きから歩けます。";
      render();
    }
  } catch (error) {
    notice(error.message + " 現在の記録はそのままです。");
  }
});
document.addEventListener("compositionstart", () => {
  composition = true;
  world.keys.clear();
});
document.addEventListener("compositionend", () => {
  composition = false;
});
document.addEventListener("focusin", (e) => {
  if (e.target.matches("input,textarea,select")) world.keys.clear();
});
document.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.key === "Escape") {
    if (panel) close();
    else open("journal");
    return;
  }
  if (panel) {
    if (
      panel === "practice" &&
      e.key === "Enter" &&
      !e.isComposing &&
      !composition &&
      e.keyCode !== 229
    ) {
      e.preventDefault();
      try {
        runAction("check-practice");
      } catch {}
    }
    return;
  }
  if (e.target.matches("input,textarea,select") || e.isComposing) return;
  if (["e", "E", "Enter"].includes(e.key) && !e.repeat) {
    e.preventDefault();
    interact();
    return;
  }
  if (e.key.toLowerCase() === "m" && !e.repeat) {
    open("map");
    return;
  }
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Shift",
    ].includes(key)
  ) {
    e.preventDefault();
    world.keys.add(key);
  }
});
document.addEventListener("keyup", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  world.keys.delete(key);
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Shift",
    ].includes(key)
  )
    persist();
});
window.addEventListener("blur", () => {
  music.setPaused(true);
  world.keys.clear();
  world.touch = { x: 0, z: 0 };
  persist();
});
window.addEventListener("focus", () =>
  music.setPaused(document.hidden || panel === "welcome"),
);
document.addEventListener("visibilitychange", () => {
  frameTime = performance.now();
  music.setPaused(document.hidden || panel === "welcome");
  world.keys.clear();
  audio.stop();
  if (document.hidden) {
    audio.ambient(false, 0);
    persist();
  } else if (state.settings.ambient) audio.ambient(true, state.settings.volume);
});
const canvas = world.renderer.domElement;
let dragging = false,
  lastPointer = null;
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("pointerdown", (e) => {
  if (panel) return;
  if (e.button === 2 || e.pointerType === "touch") {
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging || panel) return;
  state.yaw -= (e.clientX - lastPointer.x) * 0.006;
  world.pitch = Math.max(
    0.2,
    Math.min(1.15, world.pitch + (e.clientY - lastPointer.y) * 0.004),
  );
  lastPointer = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
});
canvas.addEventListener("pointercancel", () => (dragging = false));
const stick = document.querySelector("#stick");
let stickPointer = null;
function moveStick(e) {
  if (panel || e.pointerId !== stickPointer) return;
  const r = stick.getBoundingClientRect(),
    dx = e.clientX - r.left - r.width / 2,
    dz = e.clientY - r.top - r.height / 2,
    n = Math.max(1, Math.hypot(dx, dz) / 30);
  world.touch = { x: dx / n / 30, z: dz / n / 30 };
  stick.firstElementChild.style.transform = `translate(${dx / n}px,${dz / n}px)`;
}
stick.addEventListener("pointerdown", (e) => {
  if (panel) return;
  e.preventDefault();
  stickPointer = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
});
stick.addEventListener("pointermove", moveStick);
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  stick.addEventListener(event, () => {
    stickPointer = null;
    world.touch = { x: 0, z: 0 };
    stick.firstElementChild.style.transform = "";
  });
document.querySelector("#touch-interact").addEventListener("click", interact);
const look = document.querySelector("#look-pad");
let lookPointer = null;
look.addEventListener("pointerdown", (e) => {
  if (panel) return;
  lookPointer = e.pointerId;
  lastPointer = { x: e.clientX, y: e.clientY };
  look.setPointerCapture(e.pointerId);
});
look.addEventListener("pointermove", (e) => {
  if (lookPointer !== e.pointerId || panel) return;
  state.yaw -= (e.clientX - lastPointer.x) * 0.007;
  world.pitch = Math.max(
    0.2,
    Math.min(1.15, world.pitch + (e.clientY - lastPointer.y) * 0.004),
  );
  lastPointer = { x: e.clientX, y: e.clientY };
});
for (const event of ["pointerup", "pointercancel"])
  look.addEventListener(event, () => (lookPointer = null));
let lastContext = "";
function loop(now) {
  const dt = Math.min((now - frameTime) / 1000, 1);
  frameTime = now;
  if (!document.hidden) {
    const blocked =
      !!panel || document.activeElement?.matches("input,textarea,select");
    world.frame(state, dt, blocked);
    if (!blocked) E.advanceTime(state, dt * 0.5);
    hudTimer += dt;
    saveTimer += dt;
    if (hudTimer > 0.5) {
      updateMusicStatus();
      renderHud();
      hudTimer = 0;
    }
    if (saveTimer > 3) {
      persist();
      saveTimer = 0;
    }
    const t = !blocked ? world.nearest(state) : null,
      key = t ? t.type + ":" + t.id : "";
    if (key !== lastContext) {
      context.innerHTML = t
        ? `<button id="interact-button"><kbd>E</kbd> ${esc(t.name)}</button>`
        : "";
      document
        .querySelector("#interact-button")
        ?.addEventListener("click", interact);
      lastContext = key;
    }
    if (state.settings.ambient && world.travel - footstep > 0.8) {
      audio.step(state.settings.volume);
      footstep = world.travel;
    }
  }
  requestAnimationFrame(loop);
}
world.sync(state);
world.camera.position.set(state.pos.x, 5, state.pos.z + 6);
document.querySelector("#loading").remove();
open("welcome");
requestAnimationFrame(loop);
