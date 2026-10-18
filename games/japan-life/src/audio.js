export class AudioSupport {
  constructor() {
    this.synth = globalThis.speechSynthesis;
    this.voices = [];
    this.token = 0;
    this.refresh = () => {
      this.voices = (this.synth?.getVoices() || []).filter((v) =>
        /^ja(?:-|_|$)/i.test(v.lang),
      );
    };
    this.synth?.addEventListener("voiceschanged", this.refresh);
    this.refresh();
  }
  stop() {
    this.token++;
    clearTimeout(this.timer);
    this.synth?.cancel();
  }
  speak(text, settings, slow, done) {
    this.stop();
    const token = this.token;
    this.refresh();
    const voice =
      this.voices.find((v) => v.voiceURI === settings.voice) || this.voices[0];
    if (!settings.sound || !this.synth || !voice) {
      done(
        false,
        !settings.sound
          ? "音声はオフです。文字で進められます。"
          : "日本語の声がありません。端末の音声設定を確認するか、文字で進めてください。",
      );
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = slow ? 0.8 : 1;
    this.utterance = utterance;
    let finished = false;
    const finish = (ok, message) => {
      if (token !== this.token || finished) return;
      finished = true;
      clearTimeout(this.timer);
      done(ok, message);
    };
    utterance.onend = () =>
      finish(true, "再生が終わりました。再聴は理解の正解記録とは別です。");
    utterance.onerror = () =>
      finish(false, "音声の再生に失敗しました。文字でも進められます。");
    this.timer = setTimeout(() => {
      finish(false, "音声が応答しません。文字で続けられます。");
      this.stop();
    }, 20000);
    try {
      this.synth.speak(utterance);
    } catch {
      finish(false, "音声を開始できませんでした。");
    }
  }
  ambient(enabled, volume) {
    if (!enabled) {
      if (this.gain) this.gain.gain.value = 0;
      return;
    }
    try {
      if (!this.context) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        this.context = new AC();
        const b = this.context.createBuffer(
            1,
            this.context.sampleRate * 3,
            this.context.sampleRate,
          ),
          a = b.getChannelData(0);
        for (let i = 0; i < a.length; i++) a[i] = (Math.random() - 0.5) * 0.15;
        const noise = this.context.createBufferSource();
        noise.buffer = b;
        noise.loop = true;
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 420;
        this.gain = this.context.createGain();
        noise
          .connect(filter)
          .connect(this.gain)
          .connect(this.context.destination);
        noise.start();
      }
      this.context.resume();
      this.gain.gain.value = volume * 0.25;
    } catch {}
  }
  step(volume) {
    if (!this.context || this.context.state !== "running") return;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.frequency.value = 90;
    gain.gain.setValueAtTime(volume * 0.12, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + 0.055,
    );
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.06);
  }
}
