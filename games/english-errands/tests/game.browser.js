import { test, expect } from "@playwright/test";
import { STORAGE_KEY } from "../src/storage.js";

async function mockSpeech(page, mode = "success") {
  await page.addInitScript((mode) => {
    window.__speechCalls = [];
    const listeners = [];
    const voices = [
      { lang: "en-US", voiceURI: "test-en", name: "Test English" },
      { lang: "ja-JP", voiceURI: "test-ja", name: "Japanese" },
    ];
    let timer;
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(text) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => (mode === "no-voice" ? [] : voices),
        addEventListener: (event, fn) => listeners.push(fn),
        cancel: () => {
          clearTimeout(timer);
          window.__speechCalls.push({ cancel: true });
        },
        speak: (utterance) => {
          window.__speechCalls.push({
            text: utterance.text,
            rate: utterance.rate,
            lang: utterance.lang,
            voice: utterance.voice.voiceURI,
          });
          timer = setTimeout(
            () =>
              mode === "error"
                ? utterance.onerror?.({ error: "synthesis-failed" })
                : utterance.onend?.(),
            10,
          );
        },
      },
    });
  }, mode);
}
const readState = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
async function start(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /おつかいをはじめる/ }).click();
  await expect(
    page.getByRole("heading", { name: "今日の品物を、ひとつずつ。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /確認した · お店に立つ/ }).click();
}
async function correctChoice(page) {
  await expect
    .poll(async () => (await readState(page)).session.current.audioHeard)
    .toBe(true);
  const a = (await readState(page)).session.current;
  await page.locator(`[data-choice="${a.itemId}"]`).click();
  return a;
}
const wordOf = (a) =>
  ({
    en001: "water",
    en002: "tea",
    en003: "coffee",
    en004: "milk",
    en005: "bread",
    en006: "rice",
    en007: "apple",
    en008: "banana",
    en009: "cup",
    en010: "plate",
    en011: "spoon",
    en012: "bowl",
  })[a.itemId];
async function finishDelivery(page, a, { screen = false, copy = false } = {}) {
  const word = wordOf(a);
  if (screen)
    for (const char of word) await page.locator(`[data-key="${char}"]`).click();
  else
    await page
      .getByRole("textbox", { name: "荷札の名前（英語1語）" })
      .fill(word);
  if (screen) await page.locator('[data-key="Enter"]').click();
  else await page.locator("#word-input").press("Enter");
  await expect(
    page.getByRole("button", { name: "お客さんに渡す →" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "お客さんに渡す →" }).click();
  await expect(
    page.getByRole("heading", { name: "ありがとう、また来るね。" }),
  ).toBeVisible();
  if (copy) {
    await page.getByRole("button", { name: "この文も打つ（任意）" }).click();
    const sentence = await page.locator(".copy-model").textContent();
    if (screen) {
      const target = sentence
        .toLowerCase()
        .replaceAll(",", "")
        .replace(/\.$/u, "");
      for (let i = 0; i < target.length; i++) {
        await expect(page.locator(`[data-key="${target[i]}"]`)).toHaveClass(
          /key-glow/,
        );
        await page.locator(`[data-key="${target[i]}"]`).click();
      }
      await page.locator('[data-key="Enter"]').click();
    } else {
      await page.locator("#copy-input").fill(sentence);
      await page.locator("#copy-input").press("Enter");
    }
    await expect(
      page.getByText("○ 文を写せたね。これはお手本を見た転記の記録です。"),
    ).toBeVisible();
  }
  await page.locator('[data-action="next"]').click();
}
test("導入→6件配達→結果→次の組、再読み込みでも報酬と記録が重複しない", async ({
  page,
}) => {
  await mockSpeech(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  for (let n = 0; n < 6; n++)
    await finishDelivery(page, await correctChoice(page), {
      copy: n <= 1,
      screen: n === 1,
    });
  await expect(
    page.getByRole("heading", { name: /6つの「ありがとう」が/ }),
  ).toBeVisible();
  const s = await readState(page);
  expect(s.completedSessions).toBe(1);
  expect(s.records.filter((r) => r.taskType === "delivery")).toHaveLength(6);
  expect(s.records.filter((r) => r.taskType === "copy")).toHaveLength(2);
  expect(
    s.session.attempts.every((a) => a.listeningSuccess && a.spellingUnaided),
  ).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: /おつかいをはじめる/ }).click();
  await expect(page.getByText("GROUP 02 / 03")).toBeVisible();
  expect((await readState(page)).completedSessions).toBe(1);
  expect(errors).toEqual([]);
});
test("3組18件を通して12語を届け、混合セッションに進める", async ({ page }) => {
  await mockSpeech(page);
  await start(page);
  const targets = new Set();
  for (let g = 1; g <= 3; g++) {
    for (let n = 0; n < 6; n++) {
      const a = await correctChoice(page);
      targets.add(a.itemId);
      await finishDelivery(page, a);
    }
    expect((await readState(page)).completedSessions).toBe(g);
    await page.locator('[data-action="start"]').click();
    if (g < 3) {
      await expect(page.getByText(`GROUP 0${g + 1} / 03`)).toBeVisible();
      await page.locator('[data-action="begin"]').first().click();
    }
  }
  expect(targets.size).toBe(12);
  expect((await readState(page)).session.group).toBe(4);
  await expect(page.locator(".choices .choice")).toHaveCount(3);
});
test("画面キー・Shift・Backspace・光るお手本、誤答とIME、途中保存を扱う", async ({
  page,
}) => {
  await mockSpeech(page);
  await start(page);
  const a = await correctChoice(page),
    word = wordOf(a);
  await page.getByRole("button", { name: "お手本を見る", exact: true }).click();
  await expect(page.locator(`[data-key="${word[0]}"]`)).toHaveClass(/key-glow/);
  await page.locator('[data-key="Shift"]').click();
  await page.locator(`[data-key="${word[0]}"]`).click();
  await expect(page.locator("#word-input")).toHaveValue(word[0].toUpperCase());
  await page.locator('[data-key="Backspace"]').click();
  await page.locator('[data-key="Shift"]').click();
  await page.locator('[data-key="z"]').click();
  await page.locator('[data-key="Enter"]').click();
  await expect(
    page.getByText("△ 綴りをもう一度。お手本を開いても大丈夫。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "再入力する", exact: true }).click();
  await page.locator("#word-input").fill(word.slice(0, 2));
  await page.reload();
  await page.getByRole("button", { name: /つづきから届ける/ }).click();
  await expect(page.locator("#word-input")).toHaveValue(word.slice(0, 2));
  await page.locator("#word-input").fill(word);
  await page.locator("#word-input").dispatchEvent("compositionstart");
  await page
    .locator("#word-input")
    .dispatchEvent("keydown", {
      key: "Enter",
      isComposing: true,
      bubbles: true,
    });
  expect((await readState(page)).session.phase).toBe("typing");
  await page.locator("#word-input").dispatchEvent("compositionend");
  await page.locator("#word-input").press("Enter");
  expect((await readState(page)).session.phase).toBe("ready");
  expect((await readState(page)).session.current.modelOpened).toBe(true);
});
test("音声失敗は英文へ切り替え、支援を閉じても聞き取り成功へ戻らない", async ({
  page,
}) => {
  await mockSpeech(page, "error");
  await start(page);
  await expect(page.locator(".audio-status")).toContainText(
    "再生できませんでした",
  );
  await expect(page.locator(".request-text")).toBeVisible();
  await page.getByRole("button", { name: "英文を閉じる" }).click();
  const a = (await readState(page)).session.current;
  await page.locator(`[data-choice="${a.itemId}"]`).click();
  await finishDelivery(page, a);
  const r = (await readState(page)).records[0];
  expect(r.audioFailed).toBe(true);
  expect(r.listeningSuccess).toBe(false);
  expect(r.textHintOpened).toBe(true);
});
test("英語の声なしでも、2回の誤選択と全支援で配達を完了できる", async ({
  page,
}) => {
  await mockSpeech(page, "no-voice");
  await start(page);
  await expect(page.locator(".audio-status")).toContainText(
    "英語の声がまだ見つかりません",
  );
  const a = (await readState(page)).session.current,
    wrong = a.options.find((id) => id !== a.itemId);
  await page.locator(`[data-choice="${wrong}"]`).click();
  await page.locator(`[data-choice="${wrong}"]`).click();
  await expect(page.locator("#model-guide")).toBeVisible();
  await page.locator("#word-input").fill("wrong");
  await page.locator("#word-input").press("Enter");
  await page.getByRole("button", { name: "今回は確認して渡す" }).click();
  await page.getByRole("button", { name: "お客さんに渡す →" }).click();
  await page.locator('[data-action="next"]').click();
  const r = (await readState(page)).records[0];
  expect(r.assistedCompletion).toBe(true);
  expect(r.spellingUnaided).toBe(false);
  expect(r.firstChoiceCorrect).toBe(false);
});
test("全12語・24画像が図鑑に表示され、お気に入り・速度・音声設定が保存される", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.goto("/");
  await page.getByRole("button", { name: "図鑑", exact: true }).click();
  await expect(page.locator(".word-card")).toHaveCount(12);
  await expect(page.locator(".two-images img")).toHaveCount(24);
  expect(
    await page
      .locator(".two-images img")
      .evaluateAll((images) =>
        images.every((i) => i.complete && i.naturalWidth > 0),
      ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "waterをお気に入り", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "図鑑", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "waterをお気に入り", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.locator('[data-setting="rate"]').selectOption("0.8");
  await page.locator("#voice-select").selectOption("test-en");
  await page.getByRole("button", { name: "▷ 英語の声を試す" }).click();
  expect(
    (await page.evaluate(() => window.__speechCalls))
      .filter((c) => c.text)
      .at(-1),
  ).toMatchObject({ rate: 0.8, voice: "test-en", lang: "en-US" });
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await page.locator('[data-setting="sound"]').uncheck();
  await page.getByRole("button", { name: "▷ 英語の声を試す" }).click();
  await expect(page.locator(".audio-status")).toContainText("オフ");
});
test("JSONの書き出し・読み込み・不正JSON拒否・この作品だけの削除", async ({
  page,
}) => {
  await mockSpeech(page);
  await start(page);
  const a = await correctChoice(page);
  await page.locator("#word-input").fill(wordOf(a).slice(0, 2));
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.evaluate(() => localStorage.setItem("another-game", "keep"));
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONを書き出す ↓" }).click();
  const download = await promise;
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^english-errands-/);
  await page.getByText("この作品の記録を削除する", { exact: true }).click();
  await page
    .getByRole("button", { name: "確認：この作品の記録をすべて削除" })
    .click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("another-game"))).toBe(
    "keep",
  );
  await page.locator("#import-file").setInputFiles(path);
  await expect(page.locator("#settings-message")).toContainText(
    "記録を読み込みました",
  );
  const before = await readState(page);
  await page
    .locator("#import-file")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.locator("#settings-message")).toContainText(
    "現在の記録は変更していません",
  );
  expect(await readState(page)).toEqual(before);
  await page.getByRole("button", { name: "おつかいに戻る →" }).click();
  await expect(page.locator("#word-input")).toHaveValue(wordOf(a).slice(0, 2));
});
test("壊れた保存・保存禁止でも起動でき、保存禁止中に配達できる", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    STORAGE_KEY,
  );
  await page.goto("/");
  await expect(page.locator("#storage-notice")).toContainText("読み込めません");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.getByRole("button", { name: /おつかいをはじめる/ }).click();
  await page.getByRole("button", { name: /確認した · お店に立つ/ }).click();
  await expect(page.locator("#storage-notice")).toContainText("保存できません");
  // 保存が使えない場合も画面の実際の操作で支援付き配達ができる。
  await page.locator(".choice").first().click();
  if (await page.locator(".choice").count())
    await page.locator(".choice").first().click();
  await page.locator("#word-input").fill("wrong");
  await page.locator("#word-input").press("Enter");
  await page.getByRole("button", { name: "今回は確認して渡す" }).click();
  await page.getByRole("button", { name: "お客さんに渡す →" }).click();
  await expect(
    page.getByRole("heading", { name: "ありがとう、また来るね。" }),
  ).toBeVisible();
});
test("PC・360pxで横にはみ出さず、画面キーが入力欄を覆わない", async ({
  page,
}, testInfo) => {
  await mockSpeech(page);
  await page.goto("/");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-title.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /おつかいをはじめる/ }).click();
  await page.getByRole("button", { name: /確認した · お店に立つ/ }).click();
  const a = await correctChoice(page);
  await page.getByRole("button", { name: "お手本を見る", exact: true }).click();
  await page.locator("#word-input").scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      page.locator("#word-input").evaluate((el) => {
        const r = el.getBoundingClientRect();
        const k = document.querySelector(".keyboard").getBoundingClientRect();
        return r.top >= 0 && r.bottom < k.top;
      }),
    )
    .toBe(true);
  const sizes = await page
    .locator(".key:not(.space)")
    .evaluateAll((keys) => keys.map((k) => k.getBoundingClientRect().width));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(28);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-typing.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.locator('[data-setting="fontSize"]').selectOption("large");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "おつかいに戻る →" }).click();
  await expect(page.locator("#word-input")).toBeVisible();
});
