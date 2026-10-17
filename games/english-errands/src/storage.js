import { freshState, GAME } from "./engine.js";
import { byId } from "./data.js";

export const STORAGE_KEY = "little-word-shop:english-errands:v1";
const bool = (v) => typeof v === "boolean";
const number = (v) => Number.isFinite(v) && v >= 0;
const integer = (v) => Number.isSafeInteger(v) && v >= 0;
const text = (v) => typeof v === "string" && v.length < 4000;
const ids = (v) => Array.isArray(v) && v.every((id) => Object.hasOwn(byId, id));
const unique = (v) => new Set(v).size === v.length;
const booleanFields = [
  "textHintOpened",
  "meaningHintOpened",
  "modelOpened",
  "assistedCompletion",
];
function validRecord(a) {
  return (
    a &&
    (a.listeningSuccess === undefined || bool(a.listeningSuccess)) &&
    (a.spellingUnaided === undefined || bool(a.spellingUnaided)) &&
    (a.sessionId === undefined || text(a.sessionId)) &&
    Object.hasOwn(byId, a.itemId) &&
    number(a.timestamp) &&
    ["delivery", "copy"].includes(a.taskType) &&
    ["pending", "audio", "text"].includes(a.presentationMode) &&
    [null, true, false].includes(a.firstChoiceCorrect) &&
    [null, true, false].includes(a.spellingCorrectFirst) &&
    booleanFields.every((k) => bool(a[k])) &&
    integer(a.wrongChoices) &&
    integer(a.replayCount) &&
    number(a.elapsedMs) &&
    ["unknown", "physical", "screen", "mixed"].includes(a.keyboardMode) &&
    a.autoCorrectionState === "unknown" &&
    (a.taskType !== "delivery" ||
      (integer(a.spellingErrors) && bool(a.audioHeard) && bool(a.audioFailed)))
  );
}
function validCurrent(a) {
  return (
    validRecord(a) &&
    a.taskType === "delivery" &&
    ids(a.options) &&
    a.options.length === 3 &&
    unique(a.options) &&
    a.options.includes(a.itemId) &&
    a.images &&
    a.options.every((id) => [0, 1].includes(a.images[id])) &&
    ["input", "copyInput", "feedback", "choiceFeedback"].every((k) =>
      text(a[k]),
    ) &&
    [
      "showText",
      "showMeaning",
      "showModel",
      "copyOpen",
      "copyDone",
      "submitted",
    ].every((k) => bool(a[k])) &&
    (!a.showText || a.textHintOpened) &&
    (!a.showMeaning || a.meaningHintOpened) &&
    (!a.showModel || a.modelOpened)
  );
}
export function validateState(s) {
  if (
    !s ||
    s.game !== GAME ||
    s.version !== 1 ||
    !integer(s.completedSessions) ||
    !Array.isArray(s.seenGroups) ||
    !s.seenGroups.every((g) => [1, 2, 3].includes(g)) ||
    !unique(s.seenGroups) ||
    !ids(s.favorites) ||
    !unique(s.favorites) ||
    !s.imageHistory ||
    typeof s.imageHistory !== "object" ||
    !Object.entries(s.imageHistory).every(
      ([id, n]) => Object.hasOwn(byId, id) && [0, 1].includes(n),
    ) ||
    !Array.isArray(s.records) ||
    s.records.length > 20000 ||
    !s.records.every(validRecord)
  )
    throw new Error("保存データの形式が違います。");
  const c = s.settings;
  if (
    !c ||
    !["sound", "autoplay", "keyboard"].every((k) => bool(c[k])) ||
    ![0.8, 1].includes(c.rate) ||
    !["normal", "large"].includes(c.fontSize) ||
    !text(c.voiceURI)
  )
    throw new Error("設定データが壊れています。");
  const a = s.session;
  if (a !== null) {
    if (
      !a ||
      !text(a.id) ||
      !a.id ||
      ![1, 2, 3, 4].includes(a.group) ||
      !["intro", "choice", "typing", "ready", "delivered", "results"].includes(
        a.phase,
      ) ||
      !ids(a.queue) ||
      a.queue.length > 4 ||
      !unique(a.queue) ||
      !Array.isArray(a.attempts) ||
      a.attempts.length > 6 ||
      !a.attempts.every((r) => validRecord(r) && r.taskType === "delivery") ||
      ![-1, 0, 1, 2].includes(a.lastPosition) ||
      !bool(a.completed) ||
      !bool(a.rewarded)
    )
      throw new Error("途中データが壊れています。");
    if (a.completed) {
      if (
        !a.rewarded ||
        a.phase !== "results" ||
        a.attempts.length !== 6 ||
        a.current !== null ||
        s.completedSessions < 1
      )
        throw new Error("完了データが矛盾しています。");
    } else if (
      a.rewarded ||
      a.phase === "results" ||
      a.attempts.length > 5 ||
      (a.phase === "intro" ? a.current !== null : !validCurrent(a.current))
    )
      throw new Error("途中データが矛盾しています。");
  }
  return s;
}
export function parseState(raw) {
  if (typeof raw !== "string" || raw.length > 5_000_000)
    throw new Error("5MB以内のこの作品のJSONを選んでください。");
  return validateState(JSON.parse(raw));
}
export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { state: raw ? parseState(raw) : freshState(), warning: "" };
  } catch {
    return {
      state: freshState(),
      warning:
        "保存を読み込めませんでした。この回は新しく遊べます。必要なら設定から記録を読み込んでください。",
    };
  }
}
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
