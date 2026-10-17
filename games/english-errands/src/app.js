import { items, byId, groupNames } from "./data.js";
import {
  DAY,
  freshState,
  startSession,
  finishIntro,
  choose,
  openHint,
  submitWord,
  assistWord,
  handover,
  advance,
  submitCopy,
  nextLetter,
  normalizeSentence,
  summary,
} from "./engine.js";
import { STORAGE_KEY, loadState, saveState, parseState } from "./storage.js";
import { Speaker } from "./speech.js";

const app = document.querySelector("#app");
const notice = document.querySelector("#storage-notice");
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
  };
}
const loaded = loadState(storage);
let state = loaded.state;
let view = "title";
let shifted = false;
let audioMessage = "";
let settingsMessage = "";
let composing = false;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/gu,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
function warn(message) {
  notice.textContent = message;
  notice.hidden = !message;
}
warn(loaded.warning);
function persist() {
  if (!saveState(storage, state))
    warn(
      "この端末では保存できません。画面を閉じるまで遊べます。設定の「JSONを書き出す」で記録を残してください。",
    );
}
const speaker = new Speaker(undefined, undefined, () => {
  if (view === "settings") updateVoices();
});
function audioStatus(message) {
  audioMessage = message;
  document.querySelectorAll(".audio-status").forEach((el) => {
    el.textContent = message;
  });
}
function play(reference, attempt = null, replay = false) {
  if (attempt && replay) attempt.replayCount++;
  speaker.speak(reference, state.settings, (result) => {
    audioStatus(result.message);
    if (
      attempt &&
      state.session?.current === attempt &&
      state.session.phase === "choice"
    ) {
      if (result.status === "success") {
        attempt.audioHeard = true;
        attempt.presentationMode =
          attempt.textHintOpened || attempt.meaningHintOpened
            ? "text"
            : "audio";
      }
      if (result.status === "error") {
        attempt.audioFailed = true;
        attempt.presentationMode = "text";
        attempt.textHintOpened = attempt.showText = true;
      }
      persist();
      if (result.status === "error" && view === "game") render();
    }
  });
}
function stopAudio() {
  speaker.stop();
  audioStatus("");
}
function autoPlay() {
  const s = state.session;
  if (!s?.current || s.phase !== "choice") return;
  if (state.settings.autoplay)
    play(byId[s.current.itemId].audioRequest, s.current);
  else audioStatus("「依頼を聞く」を押してね。音声なしでも英文で遊べます。");
}
const image = (item, variant = 0, alt = item.meaningJa, className = "") =>
  `<img class="item-art ${className}" src="${item.imageVariants[variant]}" alt="${escape(alt)}" draggable="false">`;
function button(action, label, className = "", extra = "") {
  return `<button class="${className}" data-action="${action}" ${extra}>${label}</button>`;
}
function viewHead(eyebrow, title, detail) {
  return `<div class="view-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${detail}</p></div>${button("home", "← タイトル", "quiet")}</div>`;
}
function renderTitle() {
  const resumable = state.session && !state.session.completed;
  return `<section class="hero">
    <div class="hero-copy"><p class="eyebrow"><span class="tiny-line"></span> 小さなお店、開店です。</p><h1>きょうは、<br>ことばを<span class="accent">届けに。</span></h1><p class="hero-description">英語のお願いを聞いて、品物をえらぶ。<br>名前を荷札に書いたら、おつかい完了。<br>ゆっくり、あなたのペースでどうぞ。</p>
      <div class="hero-actions">${button(resumable ? "continue" : "start", resumable ? "つづきから届ける <span>→</span>" : "おつかいをはじめる <span>→</span>", "primary large")}${button("dictionary", "図鑑をのぞく ↗", "text-button")}</div>
      <p class="micro">1回6件 ・ 時間制限なし ・ お手本つき</p></div>
    <div class="shop-illustration" aria-label="キツネのお客さんが待つ小さなお店" role="img"><div class="shop-sign">LITTLE WORD SHOP <span>OPEN</span></div><div class="awning"></div><div class="shop-wall"><span class="sun">✳</span><div class="speech-bubble">Hello!<span>おつかい、お願いできる？</span></div><img class="fox" src="assets/fox.svg" alt=""><div class="shelf">${image(items[6], 0, "")}${image(items[0], 0, "")}${image(items[4], 0, "")}</div></div><div class="counter"><span>ことばと、ちいさなよろこび。</span></div><div class="shop-stamp">12 WORDS<br><strong>ひとつずつ</strong></div></div>
  </section>
  <section class="how-to" aria-label="遊び方"><div class="how-intro"><p class="eyebrow">HOW TO PLAY</p><h2>おつかいは、3つのこと。</h2></div><div class="how-step"><span>01</span><div><h3>耳をすませる</h3><p>英語のお願いを聞こう。</p></div></div><div class="how-step"><span>02</span><div><h3>品物をえらぶ</h3><p>3つの絵から、ぴったりを。</p></div></div><div class="how-step"><span>03</span><div><h3>荷札をかく</h3><p>お手本を使っても大丈夫。</p></div></div></section>
  <section class="progress-strip"><div><span class="eyebrow">YOUR LITTLE SHOP</span><p>届けたおつかい <strong>${state.completedSessions} 回</strong> <span class="decorations" aria-label="集めた店先の飾り">${"✿".repeat(Math.min(state.completedSessions, 12))}</span></p></div><p class="muted">失敗しても、何度でも。<br>お客さんは待ってくれるよ。</p></section>`;
}
function renderIntro() {
  const s = state.session;
  return `${viewHead(`GROUP 0${s.group} / 03`, "今日の品物を、ひとつずつ。", "絵・名前・音を確認しよう。カードを見ただけでは成績に数えません。")}
  <div class="intro-grid">${items
    .filter((i) => i.group === s.group)
    .map(
      (item) =>
        `<article class="word-card">${image(item)}<p class="word-en" lang="en">${item.lemma}</p><h2>${item.meaningJa}</h2><p lang="en">${item.requestEn}</p><p class="muted">${item.requestJa}</p><div class="card-audio">${button("audio-word", "▷ 単語", "quiet", `data-id="${item.id}"`)}${button("audio-request", "▷ 依頼", "quiet", `data-id="${item.id}"`)}</div></article>`,
    )
    .join("")}</div>
  <p class="audio-status" role="status">${escape(audioMessage)}</p><div class="center-actions">${button("begin", "確認した · お店に立つ →", "primary large")}${button("begin", "知っているのでスキップ", "text-button")}</div>`;
}
function guideMarkup(value, target) {
  const hint = nextLetter(value, target);
  return `<span class="model-label">お手本</span><span class="model-word" lang="en">${[...target].map((letter, index) => `<span class="${index < hint.index ? "matched" : index === hint.index ? "next-letter" : ""}">${letter === " " ? "␣" : escape(letter)}</span>`).join("")}</span><span class="guide-message">${hint.wrong ? `${hint.index + 1}文字目を直そう` : hint.char ? `次は ${hint.char === " " ? "Space" : hint.char.toUpperCase()}` : "ぜんぶ書けたね"}</span>`;
}
function keyboardMarkup(target = "", input = "") {
  const hint = target ? nextLetter(input, target).char.toLowerCase() : "";
  return `<div class="keyboard-top"><span>ENGLISH QWERTY</span><span>光るキーが、次の文字</span></div>${["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row, index) => `<div class="key-row row-${index}">${[...row].map((key) => `<button type="button" data-key="${key}" aria-label="${key}" class="key ${hint === key ? "key-glow" : ""}">${shifted ? key.toUpperCase() : key}</button>`).join("")}</div>`).join("")}<div class="key-row controls"><button type="button" data-key="Shift" aria-pressed="${shifted}" class="key">Shift ↑</button><button type="button" data-key=" " aria-label="Space" class="key space ${hint === " " ? "key-glow" : ""}">Space</button><button type="button" data-key="Backspace" class="key" aria-label="Backspace">⌫</button><button type="button" data-key="Enter" class="key enter">Enter ↵</button></div>`;
}
function renderGame() {
  const s = state.session;
  if (s.phase === "intro") return renderIntro();
  if (s.phase === "results") return renderResults();
  const a = s.current,
    item = byId[a.itemId];
  const typing = s.phase === "typing",
    delivered = s.phase === "delivered",
    ready = s.phase === "ready";
  const copying = delivered && a.copyOpen && !a.copyDone;
  const inputTarget = copying ? normalizeSentence(item.requestEn) : item.lemma;
  const inputValue = copying ? a.copyInput : a.input;
  const showBoard = state.settings.keyboard && (typing || copying);
  return `<div class="game-heading"><div><p class="eyebrow">GROUP ${String(s.group).padStart(2, "0")} · ${groupNames[s.group]}</p><h1>小さなお店のお手伝い</h1></div><div class="delivery-progress"><strong>${s.attempts.length + 1}<small> / 6 件目</small></strong><div class="progress-dots">${Array.from({ length: 6 }, (_, i) => `<span class="${i < s.attempts.length ? "done" : i === s.attempts.length ? "current" : ""}"></span>`).join("")}</div></div></div>
  <div class="game-layout"><section class="game-panel ${showBoard ? "with-keyboard" : ""}">
    <div class="customer"><img src="assets/fox.svg" alt="キツネのお客さん"><div><span class="eyebrow">お客さんのお願い</span><div class="request-actions">${button("listen", "▷ 依頼を聞く", "primary small")}${button("slow-listen", "▷ ゆっくり", "quiet small")}${button("stop-audio", "停止", "text-button small")}</div></div></div>
    <p class="audio-status" role="status">${escape(audioMessage || "依頼は何度でも聞き直せるよ。")}</p>
    ${!delivered ? `<div class="hint-actions">${button("hint-text", a.showText ? "英文を閉じる" : "英文を見る", "hint-button", `aria-expanded="${a.showText}"`)}${button("hint-meaning", a.showMeaning ? "意味を閉じる" : "意味を見る", "hint-button", `aria-expanded="${a.showMeaning}"`)}</div>` : ""}
    ${a.showText || delivered ? `<p class="request-text" lang="en">${item.requestEn}</p>` : ""}${a.showMeaning || delivered ? `<p class="meaning-text">${item.requestJa}</p>` : ""}
    <ol class="stage-list" aria-label="配達の手順"><li class="${s.phase === "choice" ? "active" : "finished"}">1 品物をえらぶ</li><li class="${typing ? "active" : ready || delivered ? "finished" : ""}">2 荷札をかく</li><li class="${ready || delivered ? "active" : ""}">3 お届け</li></ol>
    ${
      s.phase === "choice"
        ? `<h2 class="task-heading">どれを届けよう？</h2><div class="choices">${a.options.map((id, i) => `<button class="choice" data-choice="${id}" aria-label="候補${i + 1}">${image(byId[id], a.images[id], `候補${i + 1}の絵`)}<span>${String(i + 1).padStart(2, "0")}</span></button>`).join("")}</div><p class="feedback" role="status">${escape(a.choiceFeedback || "絵をタップして選んでね。")}</p>`
        : `<div class="parcel"><div class="parcel-art">${image(item, a.images[item.id], item.meaningJa)}<span>${delivered ? "✓ お届けしました" : "選んだ品物"}</span></div><div class="shipping-label"><span class="eyebrow">${delivered ? "THANK YOU!" : "DELIVERY LABEL"}</span><h2>${delivered ? "ありがとう、また来るね。" : "名前を荷札に書こう。"}</h2>${typing ? `<label class="sr-only" for="word-input">荷札の名前（英語1語）</label><input id="word-input" class="word-input" value="${escape(a.input)}" maxlength="160" lang="en" inputmode="${state.settings.keyboard ? "none" : "text"}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="英語で、ひとつの名前" aria-describedby="word-feedback"><div id="model-guide" class="model-guide" ${a.showModel ? "" : "hidden"}>${guideMarkup(a.input, item.lemma)}</div><div id="letter-feedback" class="letter-feedback">${a.submitted && a.spellingErrors ? diffMarkup(a.input, item.lemma) : ""}</div><div class="typing-actions">${button("submit-word", "決定 ↵", "primary")}${button("hint-model", a.showModel ? "お手本を閉じる" : "お手本を見る", "quiet")}${button("clear-input", "全消去", "text-button")}</div>` : `<p class="completed-label" lang="en">${item.lemma} <span>✓</span></p>`}</div></div>
    <p id="word-feedback" class="feedback" role="status">${escape(a.feedback)}</p>
    ${typing && a.spellingErrors > 0 ? `<div class="retry-actions">${button("retry-word", "再入力する", "quiet")}${button("assist", "今回は確認して渡す", "text-button")}</div>` : ""}
    ${ready ? button("handover", "お客さんに渡す →", "primary large full") : ""}
    ${delivered ? `<div class="delivered-actions">${button("copy-open", a.copyOpen ? "文の練習を閉じる" : "この文も打つ（任意）", "quiet")}<p class="micro">文の練習はお手本の「転記」として別に記録します。コンマ・最後の点は省略できます。</p></div>${a.copyOpen ? `<div class="copy-box"><p class="copy-model" lang="en">${item.requestEn}</p><label for="copy-input">お手本どおりに書いてみよう</label><input id="copy-input" class="word-input" value="${escape(a.copyInput)}" maxlength="160" lang="en" inputmode="${state.settings.keyboard ? "none" : "text"}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" ${a.copyDone ? "readonly" : ""}><div id="model-guide" class="model-guide">${guideMarkup(a.copyInput, normalizeSentence(item.requestEn))}</div>${a.copyDone ? "" : button("submit-copy", "文の転記を確認 ↵", "quiet")}<p class="feedback" role="status">${escape(a.copyFeedback || "")}</p></div>` : ""}${button("next", s.attempts.length === 5 ? "配達を終えて、結果を見る →" : "次のお願いへ →", "primary large full")}` : ""}`
    }
    ${showBoard ? `<div class="keyboard" aria-label="英語画面キーボード">${keyboardMarkup(a.showModel || copying ? inputTarget : "", inputValue)}</div>` : ""}
  </section><aside class="shop-note"><p class="eyebrow">SHOP NOTE</p><h2>あせらなくて、<br>大丈夫。</h2><p>聞き直しても、お手本を<br>見ても、最後まで届けられるよ。</p><div class="note-rule"></div><p>聞いて選んだこと。<br>自分で綴ったこと。<br>助けてもらったこと。</p><p>ひとつずつ、別々に<br>大切に記録します。</p><span class="note-flower">✳</span>${button("home", "いったんお休みする", "text-button")}<p class="micro">進み具合は自動で保存</p></aside></div>`;
}
function diffMarkup(value, target) {
  return `<span>入力の確認：</span>${[...value.normalize("NFKC")].map((ch, i) => `<span class="${ch.toLowerCase() === target[i] ? "letter-ok" : "letter-wrong"}">${escape(ch === " " ? "␣" : ch)}</span>`).join("")}<span>（○ 一致 / 下線は違う文字）</span>`;
}
function renderResults() {
  const s = state.session;
  const copies = state.records.filter(
    (r) => r.taskType === "copy" && r.sessionId === s.id,
  );
  const stats = summary([...s.attempts, ...copies]);
  return `<section class="results"><p class="eyebrow">TODAY'S DELIVERIES · おつかい完了</p><div class="reward-flower" aria-label="新しい店先の飾り">✿</div><h1>6つの「ありがとう」が、<br>届きました。</h1><p class="muted">お店に飾りがひとつ増えたよ。いままで ${state.completedSessions} 回のおつかい。</p><div class="result-stats"><div><strong>${stats.listening}<small> / 6</small></strong><span>音だけで選べた</span></div><div><strong>${stats.spelling}<small> / 6</small></strong><span>お手本なし・初回で綴れた</span></div><div><strong>${stats.assisted}<small> 件</small></strong><span>支援を使って届けた</span></div><div><strong>${stats.copy}<small> 件</small></strong><span>お手本の文を転記した</span></div></div><p class="micro">音声なし・英文や意味を見た問題は「音だけ」に数えません。<br>この記録だけで習得や学習効果を判定するものではありません。</p>
    <div class="result-details">${s.attempts.map((a) => `<div>${image(byId[a.itemId], 0, "")}<strong lang="en">${byId[a.itemId].lemma}</strong><span>${a.listeningSuccess ? "✓ 聞いて選べた" : "聞き取り成功の記録なし"}</span><span>${a.spellingUnaided ? "✓ 自分で綴れた" : "綴りは練習・支援あり"}</span></div>`).join("")}</div><div class="center-actions">${button("start", s.group < 3 ? "次の組のおつかいへ →" : "もう一回、おつかいへ →", "primary large")}${button("dictionary", "図鑑でふりかえる", "quiet")}${button("home", "タイトルへ", "text-button")}</div></section>`;
}
function renderDictionary() {
  return `${viewHead("WORD COLLECTION", "小さなことば図鑑", "12の品物と、そのお願い。好きなことばには星をつけよう。")}
  <p class="audio-status" role="status">${escape(audioMessage)}</p><div class="dictionary-grid">${items
    .map((item) => {
      const records = state.records.filter(
        (r) => r.itemId === item.id && r.taskType === "delivery",
      );
      const later =
        records.length > 1 &&
        records.at(-1).timestamp - records[0].timestamp >= DAY;
      return `<article class="word-card"><div class="word-card-top"><span class="eyebrow">${item.id.toUpperCase()} · 組${item.group}</span><button class="favorite" data-favorite="${item.id}" aria-label="${item.lemma}をお気に入り" aria-pressed="${state.favorites.includes(item.id)}">${state.favorites.includes(item.id) ? "★" : "☆"}</button></div><div class="two-images">${image(item, 0)}${image(item, 1)}</div><p class="word-en" lang="en">${item.lemma}</p><h2>${item.meaningJa}</h2><p lang="en">${item.requestEn}</p><p class="muted">${item.requestJa}</p><div class="card-audio">${button("audio-word", "▷ 単語", "quiet", `data-id="${item.id}"`)}${button("audio-request", "▷ 依頼", "quiet", `data-id="${item.id}"`)}</div><div class="word-status"><span>${state.seenGroups.includes(item.group) ? "確認した" : "未練習"}</span>${records.some((r) => r.listeningSuccess) ? "<span>聞いて選べた</span>" : ""}${records.some((r) => r.spellingUnaided) ? "<span>お手本なしで綴れた</span>" : ""}${later ? "<span>別の日にも確認した</span>" : ""}</div></article>`;
    })
    .join("")}</div>`;
}
function renderSettings() {
  const c = state.settings;
  return `${viewHead("MAKE YOURSELF AT HOME", "あなたのペースで。", "設定を変えても、途中のおつかいはそのままです。")}
    <section class="settings-card"><h2>音と文字</h2><label class="setting-row"><span>音声を使う<small>端末の英語音声を使います</small></span><input data-setting="sound" type="checkbox" ${c.sound ? "checked" : ""}></label><label class="setting-row"><span>依頼を自動再生<small>新しいお願いが届いたとき</small></span><input data-setting="autoplay" type="checkbox" ${c.autoplay ? "checked" : ""}></label>
    <label class="setting-row" for="voice-select"><span>英語の声</span><select id="voice-select" data-setting="voiceURI"></select></label><label class="setting-row"><span>音声の速さ</span><select data-setting="rate"><option value="1" ${c.rate === 1 ? "selected" : ""}>通常（1.0）</option><option value="0.8" ${c.rate === 0.8 ? "selected" : ""}>ゆっくり（0.8）</option></select></label>
    <p class="micro">声の有無・品質は端末とブラウザによります。日本語の声への代替はしません。</p><div class="card-audio">${button("test-audio", "▷ 英語の声を試す", "quiet")}${button("stop-audio", "停止", "quiet")}</div><p class="audio-status" role="status">${escape(audioMessage)}</p>
    <label class="setting-row"><span>英語の画面キーボード<small>オフにすると端末のキーボードを使います</small></span><input data-setting="keyboard" type="checkbox" ${c.keyboard ? "checked" : ""}></label><label class="setting-row"><span>文字の大きさ</span><select data-setting="fontSize"><option value="normal" ${c.fontSize === "normal" ? "selected" : ""}>ふつう</option><option value="large" ${c.fontSize === "large" ? "selected" : ""}>大きめ</option></select></label></section>
    <section class="settings-card"><h2>おつかいの記録</h2><p class="muted">このブラウザに保存します。別の端末へ移すときはJSONを使ってください。アカウントや自動同期はありません。</p><div class="save-actions">${button("export", "JSONを書き出す ↓", "quiet")}<label class="file-button quiet">JSONを読み込む ↑<input id="import-file" type="file" accept="application/json,.json"></label></div><p id="settings-message" role="status">${escape(settingsMessage)}</p><p class="micro">読み込みはこの作品の進行・設定・記録を置き換えます。今の記録を先に書き出せます。</p><details class="delete-area"><summary>この作品の記録を削除する</summary><p>進行・お気に入り・設定を削除します。他の作品には触れません。</p>${button("delete", "確認：この作品の記録をすべて削除", "danger")}</details></section>
    ${state.session && !state.session.completed ? `<div class="center-actions">${button("continue", "おつかいに戻る →", "primary large")}</div>` : ""}`;
}
function updateVoices() {
  const el = document.querySelector("#voice-select");
  if (!el || !speaker) return;
  el.innerHTML = `<option value="">${speaker.voices.length ? "英語の声を自動で選ぶ" : "英語の声が見つかりません"}</option>${speaker.voices.map((v) => `<option value="${escape(v.voiceURI)}">${escape(v.name)} (${escape(v.lang)})</option>`).join("")}`;
  el.value = state.settings.voiceURI;
}
function render() {
  document.documentElement.dataset.fontSize = state.settings.fontSize;
  document.body.classList.toggle(
    "has-board",
    view === "game" &&
      state.settings.keyboard &&
      (state.session?.phase === "typing" ||
        (state.session?.phase === "delivered" &&
          state.session?.current?.copyOpen &&
          !state.session.current.copyDone)),
  );
  app.innerHTML =
    view === "title"
      ? renderTitle()
      : view === "dictionary"
        ? renderDictionary()
        : view === "settings"
          ? renderSettings()
          : renderGame();
  if (view === "settings") updateVoices();
}
function navigate(destination) {
  stopAudio();
  view = destination;
  render();
  window.scrollTo({ top: 0 });
}
function focusInput() {
  requestAnimationFrame(() => {
    const input = activeInput();
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
function activeInput() {
  return document.querySelector("#copy-input:not([readonly]), #word-input");
}
function inputChanged(input, mode) {
  const a = state.session.current;
  if (mode && a.keyboardMode !== mode)
    a.keyboardMode = a.keyboardMode === "unknown" ? mode : "mixed";
  if (input.id === "copy-input") a.copyInput = input.value;
  else a.input = input.value;
  persist();
  updateGuide();
}
function updateGuide() {
  const a = state.session?.current;
  const input = activeInput();
  if (!a || !input) return;
  const target =
    input.id === "copy-input"
      ? normalizeSentence(byId[a.itemId].requestEn)
      : byId[a.itemId].lemma;
  const guide = document.querySelector("#model-guide");
  if (guide) guide.innerHTML = guideMarkup(input.value, target);
  const board = document.querySelector(".keyboard");
  if (board)
    board.innerHTML = keyboardMarkup(
      a.showModel || input.id === "copy-input" ? target : "",
      input.value,
    );
}
function screenKey(key) {
  const input = activeInput();
  if (!input) return;
  if (key === "Shift") {
    shifted = !shifted;
    updateGuide();
    return;
  }
  if (key === "Enter") {
    perform(input.id === "copy-input" ? "submit-copy" : "submit-word");
    return;
  }
  const start = input.selectionStart ?? input.value.length,
    end = input.selectionEnd ?? start;
  const pos =
    key === "Backspace" && start === end ? Math.max(0, start - 1) : start;
  const replacement =
    key === "Backspace" ? "" : shifted ? key.toUpperCase() : key;
  input.value = (
    input.value.slice(0, pos) +
    replacement +
    input.value.slice(end)
  ).slice(0, 160);
  input.focus({ preventScroll: true });
  input.setSelectionRange(pos + replacement.length, pos + replacement.length);
  inputChanged(input, "screen");
}
function perform(action, id) {
  const s = state.session,
    a = s?.current;
  if (["home", "dictionary", "settings"].includes(action)) {
    navigate(action === "home" ? "title" : action);
    return;
  }
  if (action === "start") {
    stopAudio();
    startSession(state);
    persist();
    view = "game";
    render();
    autoPlay();
    window.scrollTo({ top: 0 });
    return;
  }
  if (action === "continue") {
    navigate("game");
    if (s?.phase === "choice") autoPlay();
    return;
  }
  if (action === "begin") {
    stopAudio();
    finishIntro(state);
    persist();
    render();
    autoPlay();
    window.scrollTo({ top: 0 });
    return;
  }
  if (action === "audio-word" || action === "audio-request") {
    play(action === "audio-word" ? byId[id].audioWord : byId[id].audioRequest);
    return;
  }
  if (action === "test-audio") {
    play(items[0].audioRequest);
    return;
  }
  if (action === "stop-audio") {
    stopAudio();
    return;
  }
  if (action === "listen" || action === "slow-listen") {
    if (action === "slow-listen") {
      state.settings.rate = 0.8;
      persist();
    }
    play(byId[a.itemId].audioRequest, a, true);
    return;
  }
  if (action?.startsWith("hint-")) {
    openHint(state, action.slice(5));
    persist();
    render();
    if (s.phase === "typing") focusInput();
    return;
  }
  if (action === "submit-word") {
    if (composing) return;
    submitWord(state, document.querySelector("#word-input").value);
    persist();
    render();
    if (s.phase === "typing") focusInput();
    return;
  }
  if (action === "assist") {
    assistWord(state);
    persist();
    render();
    return;
  }
  if (action === "clear-input" || action === "retry-word") {
    const input = activeInput();
    if (input) {
      input.value = "";
      inputChanged(input);
      input.focus();
    }
    return;
  }
  if (action === "handover") {
    stopAudio();
    handover(state);
    persist();
    render();
    return;
  }
  if (action === "copy-open") {
    a.copyOpen = !a.copyOpen;
    persist();
    render();
    if (a.copyOpen) focusInput();
    return;
  }
  if (action === "submit-copy") {
    if (composing) return;
    submitCopy(state, document.querySelector("#copy-input").value);
    persist();
    render();
    if (!a.copyDone) focusInput();
    return;
  }
  if (action === "next") {
    stopAudio();
    advance(state);
    persist();
    render();
    autoPlay();
    window.scrollTo({ top: 0 });
    return;
  }
  if (action === "export") {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `english-errands-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (action === "delete") {
    stopAudio();
    try {
      storage.removeItem(STORAGE_KEY);
      warn("");
    } catch {
      warn(
        "端末の記録を削除できませんでした。ブラウザの保存設定を確認してください。",
      );
      return;
    }
    state = freshState();
    settingsMessage = "この作品の記録を削除しました。";
    render();
    return;
  }
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("button, .brand");
  if (!target) return;
  if (target.matches(".brand")) {
    event.preventDefault();
    navigate("title");
    return;
  }
  if (target.dataset.key !== undefined) {
    screenKey(target.dataset.key);
    return;
  }
  if (target.dataset.choice) {
    choose(state, target.dataset.choice);
    if (state.session.phase === "typing") stopAudio();
    persist();
    render();
    if (state.session.phase === "typing") focusInput();
    return;
  }
  if (target.dataset.favorite) {
    const id = target.dataset.favorite;
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((v) => v !== id)
      : [...state.favorites, id];
    persist();
    render();
    return;
  }
  perform(target.dataset.action || target.dataset.nav, target.dataset.id);
});
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("[data-key]")) event.preventDefault();
});
document.addEventListener("input", (event) => {
  if (
    event.target.matches("#word-input, #copy-input") &&
    !event.target.readOnly
  )
    inputChanged(event.target, "physical");
});
document.addEventListener("compositionstart", () => {
  composing = true;
});
document.addEventListener("compositionend", () => {
  composing = false;
});
document.addEventListener("keydown", (event) => {
  if (
    event.target.matches("#word-input, #copy-input") &&
    event.key === "Enter" &&
    !event.isComposing &&
    !composing &&
    event.keyCode !== 229
  ) {
    event.preventDefault();
    perform(event.target.id === "copy-input" ? "submit-copy" : "submit-word");
  }
});
document.addEventListener("change", async (event) => {
  const field = event.target.dataset.setting;
  if (field) {
    state.settings[field] =
      event.target.type === "checkbox"
        ? event.target.checked
        : field === "rate"
          ? Number(event.target.value)
          : event.target.value;
    stopAudio();
    persist();
    render();
    return;
  }
  if (event.target.id === "import-file") {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw new Error("5MB以内のJSONを選んでください。");
      const imported = parseState(await file.text());
      stopAudio();
      state = imported;
      persist();
      settingsMessage = "記録を読み込みました。途中のおつかいも再開できます。";
    } catch {
      settingsMessage =
        "読み込めませんでした。この作品の正しい形式のJSONを選んでください。現在の記録は変更していません。";
    }
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAudio();
    persist();
  }
});
render();
