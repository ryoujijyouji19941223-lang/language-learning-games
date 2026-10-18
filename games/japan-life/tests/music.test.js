import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as E from "../src/engine.js";
import { tracks, musicFor } from "../src/music-data.js";
import { MusicPlayer } from "../src/music.js";
import { AudioSupport } from "../src/audio.js";

function freshHome() {
  const s = E.fresh(new Date(2026,3,1));
  E.chooseHome(s, "home01");
  return s;
}
test("5仮曲が別々の実PCM音源で、ループ範囲と制作条件を持つ", () => {
  const hashes = new Set();
  for (const t of tracks) {
    const b = readFileSync(new URL("../src/" + t.file, import.meta.url));
    assert.equal(b.toString("ascii", 0, 4), "RIFF");
    assert.equal(b.toString("ascii", 8, 12), "WAVE");
    assert.equal(b.readUInt16LE(20), 1);
    assert.equal(b.readUInt16LE(22), 1);
    assert.equal(b.readUInt32LE(24), 16000);
    assert.equal(b.readUInt16LE(34), 16);
    assert.ok(Math.abs(b.readUInt32LE(40) / 32000 - t.loopEnd) < 0.0001);
    let energy = 0;
    for (let i = 44; i < b.length; i += 2) energy += b.readInt16LE(i) ** 2;
    assert.ok(Math.sqrt(energy / ((b.length - 44) / 2)) > 500);
    assert.ok(t.author && t.method && t.license && t.status.includes("仮"));
    hashes.add(createHash("sha256").update(b).digest("hex"));
  }
  assert.equal(hashes.size, 5);
});
test("ラジオ購入で選曲が開き、保管・転居・停止・保存と旧版移行で保持", () => {
  const s = freshHome();
  assert.equal(E.ownsRadio(s), false);
  const before = structuredClone(s);
  assert.throws(() => E.chooseHomeTrack(s, "jp_town_day"));
  assert.deepEqual(s, before);
  s.clock += 120;
  s.scene = "market_furniture";
  E.buy(s, "f25", 1);
  assert.equal(s.money, 18200);
  assert.ok(E.ownsRadio(s));
  s.scene = s.home;
  E.chooseHomeTrack(s, "jp_shop_calm");
  E.placeFurniture(s, s.furniture.at(-1).uid, {
    zone: "anchor",
    host: "starter-desk",
  });
  E.storeFurniture(s, s.furniture.at(-1).uid);
  assert.ok(E.ownsRadio(s));
  E.preview(s, "home02");
  E.chooseHome(s, "home02");
  E.stopHomeMusic(s);
  s.settings.musicMuted = true;
  s.settings.musicVolume = 0.45;
  s.settings.voiceVolume = 0.7;
  const restored = E.parse(JSON.stringify(s));
  assert.deepEqual(restored.music, {
    homeTrack: "jp_shop_calm",
    homeStopped: true,
  });
  assert.ok(restored.settings.musicMuted);
  assert.ok(E.ownsRadio(restored));
  const old = freshHome();
  delete old.music;
  delete old.stock.f25;
  for (const k of ["musicVolume", "musicMuted", "voiceVolume"])
    delete old.settings[k];
  const migrated = E.parse(JSON.stringify(old));
  assert.equal(migrated.home, old.home);
  assert.equal(migrated.money, old.money);
  assert.equal(migrated.stock.f25, 5);
  assert.equal(migrated.music.homeTrack, "jp_home_default");
  restored.music.homeStopped = false;
  restored.music.homeTrack = "retired_track";
  assert.equal(musicFor(restored), "jp_home_default");
  assert.doesNotThrow(() => E.validate(restored));
  restored.settings.musicVolume = 2;
  assert.throws(() => E.validate(restored));
});
test("町の昼夜・店と選択した自宅の曲は別に判定し、停止は町へ持ち出さない", () => {
  const s = freshHome();
  s.music.homeTrack = "jp_town_night";
  assert.equal(musicFor(s), "jp_town_night");
  s.scene = "town";
  s.clock = 5 * 60 + 59;
  assert.equal(musicFor(s), "jp_town_night");
  s.clock = 6 * 60;
  assert.equal(musicFor(s), "jp_town_day");
  s.clock = 18 * 60;
  assert.equal(musicFor(s), "jp_town_night");
  s.scene = "market_cafe";
  assert.equal(musicFor(s), "jp_shop_calm");
  s.scene = "market_furniture";
  assert.equal(musicFor(s), "jp_shop_lively");
  s.music.homeStopped = true;
  assert.equal(musicFor(s), "jp_shop_lively");
  s.scene = s.home;
  assert.equal(musicFor(s), null);
});

class Parameter {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(v) {
    this.value = v;
  }
  linearRampToValueAtTime(v) {
    this.value = v;
  }
  setTargetAtTime(v) {
    this.value = v;
  }
}
class Context {
  state = "suspended";
  currentTime = 0;
  destination = {};
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  createGain() {
    return {
      gain: new Parameter(),
      connect(n) {
        return n;
      },
      disconnect() {},
    };
  }
  createBufferSource() {
    return {
      connect(n) {
        return n;
      },
      start() {},
      stop() {
        this.onended?.();
      },
      disconnect() {},
    };
  }
  async decodeAudioData() {
    return { duration: 20 };
  }
}
const sources = Object.fromEntries(
  tracks.map((t) => [t.id, "data:audio/wav;base64,AAAA"]),
);
const flush = () => new Promise((r) => setImmediate(r));
test("曲切替は一秒のフェードで収束し、同じ曲を再始動せず、連続再聴の音量が累積しない", async () => {
  const c = new Context(),
    p = new MusicPlayer(sources, () => c),
    s = freshHome();
  p.sync(s);
  await p.unlock();
  await flush();
  const start = p.status().start;
  c.currentTime = 3;
  p.sync(s);
  assert.equal(p.status().start, start);
  assert.equal(p.status().elapsed, 3);
  p.duck(true);
  p.duck(true);
  assert.equal(p.level, s.settings.musicVolume * 0.2);
  p.duck(false);
  assert.equal(p.level, s.settings.musicVolume);
  s.scene = "market_cafe";
  p.sync(s);
  await flush();
  assert.equal(p.status().track, "jp_shop_calm");
  assert.equal(p.status().active, 1);
  s.settings.musicMuted = true;
  p.duck(true);
  p.duck(false);
  assert.equal(p.level, 0);
  p.setPaused(true);
  assert.equal(c.state, "suspended");
  p.setPaused(false);
  assert.equal(c.state, "running");
  assert.equal(p.level, 0);
});
test("遅れて解決する旧選曲を捨て、音源欠落と再生拒否でも例外を画面に漏らさない", async () => {
  const c = new Context(),
    pending = [];
  c.decodeAudioData = () => new Promise((resolve) => pending.push(resolve));
  const p = new MusicPlayer(sources, () => c),
    s = freshHome();
  p.sync(s);
  await p.unlock();
  s.scene = "market_cafe";
  p.sync(s);
  s.scene = s.home;
  p.sync(s);
  pending[1]({ duration: 20 });
  pending[0]({ duration: 20 });
  pending[2]({ duration: 20 });
  await flush();
  assert.equal(p.status().track, "jp_home_default");
  const missing = new MusicPlayer({}, () => new Context());
  missing.sync(s);
  await missing.unlock();
  await flush();
  await flush();
  assert.equal(missing.status().track, "");
  assert.match(missing.message, /読み込めません/);
  const rejected = new MusicPlayer(sources, () => ({
    resume: async () => {
      throw Error("blocked");
    },
    createGain: () => ({ gain: new Parameter(), connect() {} }),
  }));
  rejected.sync(s);
  await rejected.unlock();
  assert.ok(rejected.blocked);
  assert.match(rejected.message, /無音/);
});
test("TTS完了・取消・失敗で減衰を解除し、声の音量を音楽と分離", () => {
  const oldSynth = globalThis.speechSynthesis,
    oldUtterance = globalThis.SpeechSynthesisUtterance;
  try {
    let spoken;
    globalThis.speechSynthesis = {
      getVoices: () => [{ lang: "ja-JP" }],
      addEventListener() {},
      cancel() {},
      speak(u) {
        spoken = u;
      },
    };
    globalThis.SpeechSynthesisUtterance = class {};
    const audio = new AudioSupport(),
      changes = [];
    audio.onSpeaking = (active) => changes.push(active);
    const settings = freshHome().settings;
    audio.speak("こんにちは", settings, false, () => {});
    assert.equal(spoken.volume, settings.voiceVolume);
    assert.equal(changes.at(-1), true);
    spoken.onend();
    assert.equal(changes.at(-1), false);
    audio.speak("こんにちは", settings, false, () => {});
    audio.stop();
    assert.equal(changes.at(-1), false);
    audio.speak("こんにちは", settings, false, () => {});
    spoken.onerror();
    assert.equal(changes.at(-1), false);
    audio.stop();
  } finally {
    globalThis.speechSynthesis = oldSynth;
    globalThis.SpeechSynthesisUtterance = oldUtterance;
  }
});
