import { musicFor, trackById } from "./music-data.js";

// ループの切替と出力音量を分離し、再聴・ミュートで再生位置をリセットしない。
export class MusicPlayer {
  constructor(
    sources,
    createContext = () =>
      new (globalThis.AudioContext || globalThis.webkitAudioContext)(),
  ) {
    this.sources = sources;
    this.createContext = createContext;
    this.buffers = new Map();
    this.failed = new Set();
    this.nodes = new Set();
    this.token = 0;
    this.ducked = false;
    this.paused = false;
    this.preview = null;
    this.message = "";
    this.blocked = false;
  }
  async unlock() {
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.output = this.context.createGain();
        this.output.gain.value = 0;
        this.output.connect(this.context.destination);
      }
      await this.context.resume();
      if (this.context.state !== "running") throw Error("resume refused");
      this.blocked = false;
      this.message = "";
      if (this.paused) await this.context.suspend();
      this.applyVolume();
      this.sync(this.state);
    } catch {
      this.blocked = true;
      this.message =
        "音を開始できません。「音を再生する」で再試行できます。無音でも遊べます。";
    }
  }
  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (!this.context) return;
    const operation = paused ? this.context.suspend() : this.context.resume();
    operation.catch(() => {
      this.blocked = true;
      this.message = "音の再開を許可できません。再生ボタンで再試行できます。";
    });
  }
  duck(active) {
    this.ducked = active;
    this.applyVolume();
  }
  applyVolume() {
    const s = this.state?.settings;
    this.level =
      !s || s.musicMuted ? 0 : s.musicVolume * (this.ducked ? 0.2 : 1);
    if (!this.output) return;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(this.level, now, 0.08);
  }
  async decode(id) {
    if (this.buffers.has(id)) return this.buffers.get(id);
    const uri = this.sources[id];
    if (!uri || !uri.startsWith("data:audio/")) throw Error("missing audio");
    const bytes = Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (c) =>
      c.charCodeAt(0),
    );
    const buffer = await this.context.decodeAudioData(bytes.buffer);
    this.buffers.set(id, buffer);
    return buffer;
  }
  stopCurrent() {
    const old = this.current;
    this.current = null;
    if (!old) return;
    const now = this.context.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + 1);
    old.source.stop(now + 1.02);
  }
  sync(state) {
    if (!state) return;
    this.state = state;
    this.applyVolume();
    let id = this.preview || musicFor(state);
    if (this.failed.has(id))
      id = this.failed.has("jp_home_default") ? null : "jp_home_default";
    if (id !== this.requested) {
      this.token++;
      this.pending = undefined;
      this.requested = id;
    }
    if (
      !this.context ||
      this.blocked ||
      this.paused ||
      this.current?.id === id ||
      this.pending === id
    )
      return;
    const token = ++this.token;
    this.pending = id;
    if (!id) {
      this.stopCurrent();
      this.pending = undefined;
      return;
    }
    this.decode(id)
      .then((buffer) => {
        if (token !== this.token) return;
        this.pending = undefined;
        this.stopCurrent();
        const source = this.context.createBufferSource(),
          gain = this.context.createGain(),
          now = this.context.currentTime;
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = trackById[id].loopStart;
        source.loopEnd = Math.min(trackById[id].loopEnd, buffer.duration);
        source.connect(gain).connect(this.output);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + 1);
        const node = { id, source, gain, start: now };
        this.nodes.add(node);
        source.onended = () => {
          this.nodes.delete(node);
          source.disconnect();
          gain.disconnect();
        };
        this.current = node;
        source.start();
      })
      .catch(() => {
        if (token !== this.token) return;
        this.pending = undefined;
        this.failed.add(id);
        this.message =
          "曲を読み込めません。既定曲または無音で続けられます。所持品や選曲は残します。";
        this.sync(this.state);
      });
  }
  status() {
    return {
      track: this.current?.id || "",
      start: this.current?.start ?? -1,
      elapsed: this.current ? this.context.currentTime - this.current.start : 0,
      active: this.nodes.size,
      paused: this.paused,
      ducked: this.ducked,
      level: this.level || 0,
      running: this.context?.state === "running",
      message: this.message,
      blocked: this.blocked,
    };
  }
}
