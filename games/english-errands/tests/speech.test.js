import { test } from "node:test";
import assert from "node:assert/strict";
import { Speaker } from "../src/speech.js";
const voice = { lang: "en-US", voiceURI: "english", name: "English" };
class Utterance {
  constructor(text) {
    this.text = text;
  }
}
function setup(voices = [voice]) {
  const synth = {
    getVoices: () => voices,
    addEventListener(name, fn) {
      this.change = fn;
    },
    cancel() {
      this.cancelled = true;
    },
    speak(u) {
      this.last = u;
    },
  };
  const speaker = new Speaker(synth, Utterance);
  return { speaker, synth };
}
const settings = { sound: true, rate: 0.8, voiceURI: "english" };
test("英語の声・教材・速度を指定し、再生完了でだけ成功を通知", () => {
  const { speaker, synth } = setup(),
    results = [];
  speaker.speak({ text: "Water, please." }, settings, (r) =>
    results.push(r.status),
  );
  assert.equal(synth.last.text, "Water, please.");
  assert.equal(synth.last.rate, 0.8);
  assert.equal(synth.last.voice, voice);
  assert.deepEqual(results, ["pending"]);
  synth.last.onend();
  assert.deepEqual(results, ["pending", "success"]);
  speaker.stop();
});
test("英語の声がなければ日本語へ代替せず、後からの声一覧更新を受ける", () => {
  let voices = [{ lang: "ja-JP" }];
  const { speaker, synth } = setup(voices),
    results = [];
  speaker.speak({ text: "tea" }, settings, (r) => results.push(r.status));
  assert.deepEqual(results, ["error"]);
  assert.equal(synth.last, undefined);
  synth.getVoices = () => [voice];
  synth.change();
  assert.deepEqual(speaker.voices, [voice]);
  speaker.stop();
});
test("停止と次の再生は古いコールバックを無効化する", () => {
  const { speaker, synth } = setup(),
    results = [];
  speaker.speak({ text: "tea" }, settings, (r) => results.push(r.status));
  const old = synth.last;
  speaker.stop();
  old.onend();
  old.onerror();
  assert.deepEqual(results, ["pending"]);
  speaker.speak({ text: "milk" }, settings, (r) => results.push(r.status));
  old.onend();
  synth.last.onerror();
  assert.deepEqual(results, ["pending", "pending", "error"]);
  speaker.stop();
});
test("無効設定・非対応・再生例外を失敗として通知", () => {
  const { speaker } = setup();
  let result;
  speaker.speak(
    { text: "tea" },
    { ...settings, sound: false },
    (r) => (result = r),
  );
  assert.equal(result.status, "error");
  const missing = new Speaker(null, null);
  missing.speak({ text: "tea" }, settings, (r) => (result = r));
  assert.equal(result.status, "error");
  const { speaker: broken, synth } = setup();
  synth.speak = () => {
    throw Error();
  };
  broken.speak({ text: "tea" }, settings, (r) => (result = r));
  assert.equal(result.status, "error");
  broken.stop();
});
