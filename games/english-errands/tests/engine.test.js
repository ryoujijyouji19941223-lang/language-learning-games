import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { items, byId } from "../src/data.js";
import {
  DAY,
  freshState,
  startSession,
  finishIntro,
  openHint,
  choose,
  submitWord,
  assistWord,
  handover,
  advance,
  submitCopy,
  dueIds,
  matchesWord,
  matchesSentence,
  nextLetter,
  hearingSuccess,
  spellingSuccess,
  summary,
} from "../src/engine.js";
import {
  STORAGE_KEY,
  parseState,
  validateState,
  loadState,
  saveState,
} from "../src/storage.js";

const seed = (n) => () => (n = (n * 1664525 + 1013904223) >>> 0) / 4294967296;
function setup(rng = seed(42), now = 1000) {
  const s = freshState();
  startSession(s, now, rng);
  finishIntro(s, now, rng);
  return s;
}
function deliver(s, now = 2000, rng = seed(3)) {
  choose(s, s.session.current.itemId);
  submitWord(s, byId[s.session.current.itemId].lemma);
  handover(s, now);
  advance(s, now, rng);
}

test("randomUUIDが使えないHTTP環境でも新しい配達を開始できる", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {},
    });
    const state = setup();
    assert.equal(state.session.phase, "choice");
    assert.match(state.session.id, /^session-/u);
    validateState(state);
  } finally {
    Object.defineProperty(globalThis, "crypto", descriptor);
  }
});
test("12語・12依頼はSPECと一致し、2種類の実在する画像を持つ", async () => {
  assert.equal(items.length, 12);
  assert.equal(new Set(items.map((i) => i.id)).size, 12);
  assert.deepEqual(
    items.map((i) => i.lemma),
    [
      "water",
      "tea",
      "coffee",
      "milk",
      "bread",
      "rice",
      "apple",
      "banana",
      "cup",
      "plate",
      "spoon",
      "bowl",
    ],
  );
  assert.deepEqual(
    items.map((i) => i.requestEn),
    [
      "Water, please.",
      "Tea, please.",
      "Coffee, please.",
      "Milk, please.",
      "Some bread, please.",
      "Some rice, please.",
      "An apple, please.",
      "A banana, please.",
      "A cup, please.",
      "A plate, please.",
      "A spoon, please.",
      "A bowl, please.",
    ],
  );
  for (const item of items) {
    assert.equal(
      item.group,
      Math.floor((Number(item.id.slice(2)) - 1) / 4) + 1,
    );
    const images = await Promise.all(
      item.imageVariants.map((path) =>
        readFile(new URL(`../${path}`, import.meta.url), "utf8"),
      ),
    );
    assert.ok(images.every((svg) => svg.startsWith("<svg")));
    assert.notEqual(images[0], images[1]);
    assert.equal(item.audioWord.text, item.lemma);
    assert.equal(item.audioRequest.text, item.requestEn);
    assert.ok(item.requestJa);
  }
});
test("単語判定は前後空白・全角・大文字を許容し、語の追加・途中空白・不足を拒否", () => {
  const cup = byId.en009;
  for (const input of ["cup", " CUP ", " Ｃｕｐ\n"])
    assert.ok(matchesWord(input, cup));
  for (const input of ["a cup", "cu p", "cu", "cups", "cup please", ""])
    assert.ok(!matchesWord(input, cup));
});
test("文転記はコンマ・末尾句点・大小文字・連続空白を許容し、冠詞・語順を保持", () => {
  const apple = byId.en007;
  assert.ok(matchesSentence(" AN  APPLE PLEASE ", apple));
  assert.ok(matchesSentence("Ａｎ apple, please.", apple));
  for (const input of [
    "A apple, please.",
    "Apple please",
    "Please an apple",
    "An apples please",
  ])
    assert.ok(!matchesSentence(input, apple));
});
test("光るお手本は接頭部分と最初の相違箇所を示す", () => {
  assert.deepEqual(nextLetter("wa", "water"), {
    index: 2,
    char: "t",
    wrong: false,
  });
  assert.deepEqual(nextLetter("waz", "water"), {
    index: 2,
    char: "t",
    wrong: true,
  });
  assert.deepEqual(nextLetter("water", "water"), {
    index: 5,
    char: "",
    wrong: false,
  });
  assert.deepEqual(nextLetter("water ", "water please"), {
    index: 6,
    char: "p",
    wrong: false,
  });
  assert.deepEqual(nextLetter("water, p", "water please"), {
    index: 7,
    char: "l",
    wrong: false,
  });
});
test("導入を見ただけでは試行・報酬を付けない", () => {
  const s = freshState();
  startSession(s);
  assert.equal(s.session.phase, "intro");
  assert.equal(s.records.length, 0);
  finishIntro(s);
  assert.equal(s.completedSessions, 0);
  assert.equal(s.records.length, 0);
  assert.deepEqual(s.seenGroups, [1]);
});
test("3候補は重複せず、正答位置と画像は連続固定されない", () => {
  const targets = new Set();
  for (let seedValue = 0; seedValue < 80; seedValue++) {
    const rng = seed(seedValue),
      s = setup(rng);
    let lastPosition = -1;
    const images = {};
    for (let n = 0; n < 6; n++) {
      const a = s.session.current;
      targets.add(a.itemId);
      assert.equal(new Set(a.options).size, 3);
      assert.ok(a.options.includes(a.itemId));
      assert.notEqual(a.options.indexOf(a.itemId), lastPosition);
      lastPosition = a.options.indexOf(a.itemId);
      for (const id of a.options) {
        if (id in images) assert.notEqual(a.images[id], images[id]);
        images[id] = a.images[id];
      }
      deliver(s, 2000 + n, rng);
    }
    assert.equal(
      new Set(s.session.attempts.slice(0, 4).map((a) => a.itemId)).size,
      4,
    );
    assert.ok(
      s.session.attempts.every(
        (a, i, all) => i === 0 || a.itemId !== all[i - 1].itemId,
      ),
    );
  }
  assert.equal(targets.size, 4);
});
test("2回の誤選択で名前を確認でき、支援付きで最後まで届けられる", () => {
  const s = setup(),
    a = s.session.current,
    wrong = a.options.find((id) => id !== a.itemId);
  choose(s, wrong);
  assert.equal(s.session.phase, "choice");
  choose(s, wrong);
  assert.equal(s.session.phase, "typing");
  assert.equal(a.firstChoiceCorrect, false);
  assert.ok(a.modelOpened && a.assistedCompletion);
  assistWord(s);
  handover(s);
  advance(s);
  assert.equal(s.records[0].listeningSuccess, false);
  assert.equal(s.records[0].spellingUnaided, false);
});
test("英文・意味・お手本を閉じても、その試行の支援履歴は戻らない", () => {
  for (const kind of ["text", "meaning", "model"]) {
    const s = setup();
    openHint(s, kind);
    openHint(s, kind);
    const a = s.session.current;
    assert.equal(
      a[{ text: "showText", meaning: "showMeaning", model: "showModel" }[kind]],
      false,
    );
    assert.equal(
      a[
        {
          text: "textHintOpened",
          meaning: "meaningHintOpened",
          model: "modelOpened",
        }[kind]
      ],
      true,
    );
    a.audioHeard = true;
    choose(s, a.itemId);
    submitWord(s, byId[a.itemId].lemma);
    if (kind !== "model") assert.equal(hearingSuccess(a), false);
    if (kind !== "meaning") assert.equal(spellingSuccess(a), false);
  }
});
test("音声なし・音声失敗は、初回選択が正しくても聞き取り成功にしない", () => {
  for (const failed of [false, true]) {
    const s = setup(),
      a = s.session.current;
    a.audioHeard = failed;
    a.audioFailed = failed;
    choose(s, a.itemId);
    assert.equal(hearingSuccess(a), false);
  }
});
test("聞き取りと綴りの支援を分離し、選択後の英文は過去の聞き取りを変えない", () => {
  const s = setup(),
    a = s.session.current;
  a.audioHeard = true;
  choose(s, a.itemId);
  openHint(s, "text");
  submitWord(s, byId[a.itemId].lemma);
  assert.equal(hearingSuccess(a), true);
  assert.equal(spellingSuccess(a), false);
});
test("荷札完成後に英文を確認しても、その前に自力で綴れた記録は保持する", () => {
  const s = setup(),
    a = s.session.current;
  choose(s, a.itemId);
  submitWord(s, byId[a.itemId].lemma);
  openHint(s, "text");
  assert.equal(a.presentationMode, "text");
  assert.equal(spellingSuccess(a), true);
});
test("a cupは品違いとせず、荷札はcupへ訂正するよう案内", () => {
  const s = freshState();
  s.completedSessions = 2;
  startSession(s);
  finishIntro(s);
  while (s.session.current.itemId !== "en009") deliver(s);
  choose(s, "en009");
  assert.equal(submitWord(s, "a cup"), false);
  assert.match(s.session.current.feedback, /品は合っています/);
  assert.equal(s.session.current.spellingCorrectFirst, false);
  assert.ok(submitWord(s, "cup"));
  assert.equal(spellingSuccess(s.session.current), false);
});
test("転記は二重送信されず、単語の記録・成績と別に保持", () => {
  const s = setup(),
    a = s.session.current,
    item = byId[a.itemId];
  choose(s, item.id);
  submitWord(s, item.lemma);
  handover(s);
  assert.equal(submitCopy(s, "wrong"), false);
  assert.equal(submitCopy(s, item.requestEn), true);
  assert.equal(submitCopy(s, item.requestEn), false);
  advance(s);
  assert.deepEqual(summary(s.records), {
    deliveries: 1,
    listening: 0,
    spelling: 1,
    assisted: 0,
    copy: 1,
  });
  assert.ok(!("input" in s.records[1]));
  assert.ok(!("copyInput" in s.records[1]));
});
test("受け渡しボタンまでは進まず、不適切な遷移は何も変更しない", () => {
  const s = setup();
  assert.equal(advance(s), false);
  assert.equal(handover(s), false);
  choose(s, s.session.current.itemId);
  submitWord(s, byId[s.session.current.itemId].lemma);
  assert.equal(advance(s), false);
  assert.equal(s.session.attempts.length, 0);
  handover(s);
  assert.equal(s.session.phase, "delivered");
  assert.equal(s.session.attempts.length, 0);
});
test("保存→再開のどの段階でも、6件完了と報酬は一度だけ", () => {
  let s = setup();
  for (let n = 0; n < 6; n++) {
    const id = s.session.current.itemId;
    choose(s, id);
    s = parseState(JSON.stringify(s));
    submitWord(s, byId[id].lemma);
    s = parseState(JSON.stringify(s));
    handover(s);
    s = parseState(JSON.stringify(s));
    advance(s);
    s = parseState(JSON.stringify(s));
  }
  assert.equal(s.completedSessions, 1);
  assert.equal(s.records.length, 6);
  assert.equal(s.session.attempts.length, 6);
  assert.equal(advance(s), false);
  assert.equal(s.completedSessions, 1);
  startSession(s);
  assert.equal(s.session.group, 2);
});
test("組1→2→3→混合へ進み、全12語が正答・候補になり、混合は1語2回まで", () => {
  const rng = seed(92),
    s = freshState(),
    targetIds = new Set(),
    candidateIds = new Set();
  for (let g = 1; g <= 4; g++) {
    startSession(s, 1000, rng);
    finishIntro(s, 1000, rng);
    assert.equal(s.session.group, g);
    for (let n = 0; n < 6; n++) {
      const a = s.session.current;
      targetIds.add(a.itemId);
      a.options.forEach((id) => candidateIds.add(id));
      deliver(s, 2000 + n, rng);
    }
    assert.equal(s.completedSessions, g);
    if (g === 4)
      for (const item of items)
        assert.ok(
          s.session.attempts.filter((a) => a.itemId === item.id).length <= 2,
        );
  }
  assert.equal(targetIds.size, 12);
  assert.equal(candidateIds.size, 12);
});
test("残り2問は間違い・支援の多い語を優先し、連続同語は避ける", () => {
  const rng = seed(22),
    s = setup(rng),
    first = s.session.current.itemId;
  openHint(s, "text");
  openHint(s, "model");
  deliver(s, 2000, rng);
  for (let n = 0; n < 3; n++) deliver(s, 2100 + n, rng);
  assert.equal(s.session.current.itemId, first);
});
test("24時間経過した練習済み語を混合の先頭に優先し、飾りは失わない", () => {
  const s = setup();
  deliver(s, 1000);
  const id = s.records[0].itemId;
  assert.deepEqual(dueIds(s, 1000 + DAY - 1), []);
  assert.deepEqual(dueIds(s, 1000 + DAY), [id]);
  s.session = null;
  s.completedSessions = 3;
  startSession(s, 1000 + DAY);
  assert.equal(s.session.current.itemId, id);
  assert.equal(s.completedSessions, 3);
});
test("壊れたJSON・別作品・未対応版・不整合な途中データを拒否", () => {
  for (const raw of ["{", "null", "{}", '{"game":"other","version":1}'])
    assert.throws(() => parseState(raw));
  for (const mutate of [
    (s) => (s.version = 2),
    (s) => (s.settings.rate = 2),
    (s) => (s.favorites = ["bad"]),
    (s) => (s.session.current.options = ["en001"]),
    (s) => (s.session.completed = true),
    (s) => (s.records = [{}]),
    (s) => (s.session.current.itemId = "toString"),
    (s) => (s.session.current.input = null),
  ]) {
    const s = setup();
    mutate(s);
    assert.throws(() => validateState(s));
  }
});
test("保存不可でもメモリ上で遊べ、他作品の保存キーは操作しない", () => {
  const storage = {
    getItem(key) {
      assert.equal(key, STORAGE_KEY);
      throw Error();
    },
    setItem(key) {
      assert.equal(key, STORAGE_KEY);
      throw Error();
    },
  };
  const loaded = loadState(storage);
  assert.ok(loaded.warning);
  assert.equal(saveState(storage, loaded.state), false);
  startSession(loaded.state);
  finishIntro(loaded.state);
  deliver(loaded.state);
  assert.equal(loaded.state.records.length, 1);
});
