import { items, byId } from "./data.js";

export const DAY = 24 * 60 * 60 * 1000;
export const GAME = "english-errands";
export const normalizeWord = (value) =>
  String(value).normalize("NFKC").trim().toLowerCase();
export const normalizeSentence = (value) =>
  normalizeWord(value)
    .replaceAll(",", "")
    .replace(/[.!?。]+$/u, "")
    .replace(/\s+/gu, " ");
export const matchesWord = (value, item) => normalizeWord(value) === item.lemma;
export const matchesSentence = (value, item) =>
  normalizeSentence(value) === normalizeSentence(item.requestEn);
export function nextLetter(value, target) {
  const typed = target.includes(" ")
    ? String(value)
        .normalize("NFKC")
        .trimStart()
        .toLowerCase()
        .replaceAll(",", "")
        .replace(/[.!?。]+$/u, "")
        .replace(/\s+/gu, " ")
    : normalizeWord(value);
  let index = 0;
  while (index < typed.length && typed[index] === target[index]) index++;
  return { index, char: target[index] || "", wrong: index < typed.length };
}
export function freshState() {
  return {
    game: GAME,
    version: 1,
    completedSessions: 0,
    seenGroups: [],
    favorites: [],
    imageHistory: {},
    records: [],
    session: null,
    settings: {
      sound: true,
      autoplay: true,
      rate: 1,
      keyboard: true,
      fontSize: "normal",
      voiceURI: "",
    },
  };
}
export function shuffle(values, rng = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function dueIds(state, now = Date.now()) {
  return items
    .filter((item) => {
      const history = state.records.filter(
        (r) => r.itemId === item.id && r.taskType === "delivery",
      );
      return history.length && now - history.at(-1).timestamp >= DAY;
    })
    .map((item) => item.id);
}
export function startSession(state, now = Date.now(), rng = Math.random) {
  if (state.session && !state.session.completed) return state.session;
  const group = Math.min(state.completedSessions + 1, 4);
  const pool = items
    .filter((i) => group === 4 || i.group === group)
    .map((i) => i.id);
  const due = dueIds(state, now);
  const ordered = shuffle(pool, rng).sort(
    (a, b) => Number(due.includes(b)) - Number(due.includes(a)),
  );
  state.session = {
    // LAN上のHTTPなどでも遊べるようにする。認証用IDではない。
    id:
      globalThis.crypto?.randomUUID?.() ??
      `session-${now}-${Math.random().toString(36).slice(2)}`,
    group,
    phase: group < 4 && !state.seenGroups.includes(group) ? "intro" : "choice",
    queue: group < 4 ? ordered : [],
    attempts: [],
    current: null,
    lastPosition: -1,
    completed: false,
    rewarded: false,
  };
  if (state.session.phase !== "intro") newAttempt(state, now, rng);
  return state.session;
}
export function finishIntro(state, now = Date.now(), rng = Math.random) {
  const session = state.session;
  if (session.phase !== "intro") return;
  if (!state.seenGroups.includes(session.group))
    state.seenGroups.push(session.group);
  newAttempt(state, now, rng);
}
export function pickNext(state, now = Date.now(), rng = Math.random) {
  const s = state.session;
  if (s.queue.length) return s.queue.shift();
  const last = s.attempts.at(-1)?.itemId;
  const candidates = items.filter(
    (i) =>
      (s.group === 4 || i.group === s.group) &&
      i.id !== last &&
      (s.group !== 4 || s.attempts.filter((a) => a.itemId === i.id).length < 2),
  );
  const due = dueIds(state, now);
  const score = (item) => {
    const previous = s.attempts.filter((a) => a.itemId === item.id);
    const errors = previous.reduce(
      (sum, a) =>
        sum +
        a.wrongChoices * 2 +
        a.spellingErrors +
        Number(a.textHintOpened) +
        Number(a.meaningHintOpened) +
        Number(a.modelOpened) +
        Number(a.assistedCompletion),
      0,
    );
    const dueBonus = due.includes(item.id) && !previous.length ? 100 : 0;
    return dueBonus + (s.group === 4 ? 0 : errors * 10) - previous.length;
  };
  return shuffle(candidates, rng).sort((a, b) => score(b) - score(a))[0].id;
}
export function newAttempt(state, now = Date.now(), rng = Math.random) {
  const s = state.session;
  const itemId = pickNext(state, now, rng);
  const pool = items.filter(
    (i) => i.id !== itemId && i.group <= Math.min(s.group, 3),
  );
  let options = shuffle(
    [
      itemId,
      ...shuffle(pool, rng)
        .slice(0, 2)
        .map((i) => i.id),
    ],
    rng,
  );
  if (options.indexOf(itemId) === s.lastPosition) options.push(options.shift());
  s.lastPosition = options.indexOf(itemId);
  const images = {};
  for (const id of options) {
    const variant =
      id in state.imageHistory
        ? 1 - state.imageHistory[id]
        : Math.floor(rng() * 2);
    images[id] = variant;
    state.imageHistory[id] = variant;
  }
  s.phase = "choice";
  s.current = {
    itemId,
    timestamp: now,
    taskType: "delivery",
    presentationMode: "pending",
    firstChoiceCorrect: null,
    wrongChoices: 0,
    textHintOpened: false,
    meaningHintOpened: false,
    modelOpened: false,
    replayCount: 0,
    spellingCorrectFirst: null,
    spellingErrors: 0,
    assistedCompletion: false,
    elapsedMs: 0,
    keyboardMode: "unknown",
    autoCorrectionState: "unknown",
    audioHeard: false,
    audioFailed: false,
    options,
    images,
    input: "",
    copyInput: "",
    copyDone: false,
    showText: false,
    showMeaning: false,
    showModel: false,
    copyOpen: false,
    choiceFeedback: "",
    feedback: "",
    submitted: false,
  };
}
export function openHint(state, kind) {
  const a = state.session.current;
  const field = {
    text: "textHintOpened",
    meaning: "meaningHintOpened",
    model: "modelOpened",
  }[kind];
  if (!field) return;
  a[field] = true;
  if (kind === "text" || kind === "meaning") a.presentationMode = "text";
  const display = {
    text: "showText",
    meaning: "showMeaning",
    model: "showModel",
  }[kind];
  a[display] = !a[display];
}
export function choose(state, itemId) {
  const s = state.session,
    a = s.current;
  if (s.phase !== "choice" || !a.options.includes(itemId)) return;
  const correct = itemId === a.itemId;
  if (a.firstChoiceCorrect === null) a.firstChoiceCorrect = correct;
  if (correct || a.wrongChoices === 1) {
    // 選択時点の支援と音声を固定。荷札段階で英文を見ても聞き取り記録を後から変えない。
    a.listeningSuccess =
      a.firstChoiceCorrect === true &&
      a.audioHeard &&
      !a.audioFailed &&
      !a.textHintOpened &&
      !a.meaningHintOpened;
  }
  if (!correct) {
    a.wrongChoices++;
    a.choiceFeedback = "△ もう一度聞いてみよう。選び直せるよ。";
    if (a.wrongChoices < 2) return;
    a.textHintOpened = a.showText = a.modelOpened = a.showModel = true;
    a.assistedCompletion = true;
    a.feedback = `いっしょに確認しよう。これは ${byId[a.itemId].lemma}。荷札に写してみよう。`;
  } else a.feedback = "○ 品物を選べたね。今度は名前を荷札に書こう。";
  a.choiceFeedback = "";
  s.phase = "typing";
}
export function submitWord(state, value) {
  const s = state.session,
    a = s.current;
  if (s.phase !== "typing") return;
  const item = byId[a.itemId];
  a.input = value;
  a.submitted = true;
  const correct = matchesWord(value, item);
  if (a.spellingCorrectFirst === null) a.spellingCorrectFirst = correct;
  if (correct) {
    a.spellingUnaided = spellingSuccess(a);
    a.feedback = "○ 荷札ができた！ 下のボタンでお客さんに渡そう。";
    s.phase = "ready";
  } else {
    a.spellingErrors++;
    a.feedback =
      normalizeWord(value).replace(/^(a|an|some) /u, "") === item.lemma
        ? `品は合っています。荷札には ${item.lemma} と書こう。`
        : "△ 綴りをもう一度。お手本を開いても大丈夫。";
  }
  return correct;
}
export function assistWord(state) {
  const s = state.session,
    a = s.current;
  if (s.phase !== "typing") return;
  a.assistedCompletion = a.modelOpened = a.showModel = true;
  a.spellingUnaided = false;
  a.input = byId[a.itemId].lemma;
  if (a.spellingCorrectFirst === null) a.spellingCorrectFirst = false;
  a.feedback = "○ 名前を確認できたね。いっしょに渡そう。";
  s.phase = "ready";
}
export function hearingSuccess(a) {
  if (typeof a.listeningSuccess === "boolean") return a.listeningSuccess;
  return (
    a.firstChoiceCorrect === true &&
    a.audioHeard &&
    !a.audioFailed &&
    !a.textHintOpened &&
    !a.meaningHintOpened
  );
}
export function spellingSuccess(a) {
  if (typeof a.spellingUnaided === "boolean") return a.spellingUnaided;
  return (
    a.spellingCorrectFirst === true &&
    !a.textHintOpened &&
    !a.modelOpened &&
    !a.assistedCompletion
  );
}
export function handover(state, now = Date.now()) {
  const s = state.session,
    a = s.current;
  if (s.phase !== "ready") return false;
  a.elapsedMs = Math.max(0, now - a.timestamp);
  s.phase = "delivered";
  return true;
}
export function submitCopy(state, value, now = Date.now()) {
  const s = state.session,
    a = s.current;
  if (s.phase !== "delivered" || a.copyDone) return false;
  a.copyInput = value;
  a.copyFeedback = matchesSentence(value, byId[a.itemId])
    ? "○ 文を写せたね。これはお手本を見た転記の記録です。"
    : "△ お手本と比べてみよう。a / an / some と語順もそのまま写してね。";
  if (!matchesSentence(value, byId[a.itemId])) return false;
  a.copyDone = true;
  state.records.push({
    itemId: a.itemId,
    sessionId: s.id,
    timestamp: now,
    taskType: "copy",
    presentationMode: "text",
    firstChoiceCorrect: null,
    wrongChoices: 0,
    textHintOpened: true,
    meaningHintOpened: true,
    modelOpened: true,
    replayCount: 0,
    spellingCorrectFirst: null,
    assistedCompletion: true,
    elapsedMs: 0,
    keyboardMode: a.keyboardMode,
    autoCorrectionState: "unknown",
  });
  return true;
}
export function advance(state, now = Date.now(), rng = Math.random) {
  const s = state.session;
  if (s.phase !== "delivered" || s.completed) return false;
  // 入力全文と画面用フィールドは履歴に残さない。
  const {
    input,
    copyInput,
    options,
    images,
    showText,
    showMeaning,
    showModel,
    copyOpen,
    copyDone,
    copyFeedback,
    feedback,
    choiceFeedback,
    submitted,
    ...record
  } = s.current;
  record.sessionId = s.id;
  record.listeningSuccess = hearingSuccess(record);
  record.spellingUnaided = spellingSuccess(record);
  s.attempts.push(record);
  state.records.push(record);
  if (s.attempts.length === 6) {
    s.completed = true;
    s.phase = "results";
    if (!s.rewarded) {
      state.completedSessions++;
      s.rewarded = true;
    }
    s.current = null;
  } else newAttempt(state, now, rng);
  return true;
}
export function summary(records) {
  const deliveries = records.filter((a) => a.taskType === "delivery");
  return {
    deliveries: deliveries.length,
    listening: deliveries.filter(hearingSuccess).length,
    spelling: deliveries.filter(spellingSuccess).length,
    assisted: deliveries.filter(
      (a) =>
        a.textHintOpened ||
        a.meaningHintOpened ||
        a.modelOpened ||
        a.assistedCompletion,
    ).length,
    copy: records.filter((a) => a.taskType === "copy").length,
  };
}
