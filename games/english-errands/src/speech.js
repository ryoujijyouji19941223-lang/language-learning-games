export class Speaker {
  constructor(
    synth = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    onVoices = () => {},
  ) {
    this.synth = synth;
    this.Utterance = Utterance;
    this.generation = 0;
    this.timer = null;
    this.onVoices = onVoices;
    this.refresh = () => {
      this.voices = (this.synth?.getVoices() || []).filter((v) =>
        /^en(?:-|_|$)/iu.test(v.lang),
      );
      this.onVoices(this.voices);
    };
    this.voices = [];
    this.synth?.addEventListener("voiceschanged", this.refresh);
    this.refresh();
  }
  stop() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    this.synth?.cancel();
    this.utterance = null;
  }
  speak(reference, settings, callback = () => {}) {
    this.stop();
    const token = this.generation;
    this.refresh();
    const fail = (message) => callback({ status: "error", message });
    if (!settings.sound) {
      fail("音声は設定でオフになっています。英文で遊べます。");
      return;
    }
    if (!this.synth || !this.Utterance) {
      fail("このブラウザは音声合成に対応していません。英文で遊べます。");
      return;
    }
    const voice =
      this.voices.find((v) => v.voiceURI === settings.voiceURI) ||
      this.voices[0];
    if (!voice) {
      fail(
        "英語の声がまだ見つかりません。端末に英語音声を追加するか、再試行してください。英文でも遊べます。",
      );
      return;
    }
    const utterance = new this.Utterance(reference.text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = settings.rate;
    this.utterance = utterance;
    let finished = false;
    const finish = (result) => {
      if (token !== this.generation || finished) return;
      finished = true;
      clearTimeout(this.timer);
      callback(result);
    };
    utterance.onend = () =>
      finish({
        status: "success",
        message: "再生しました。もう一度聞くこともできます。",
      });
    utterance.onerror = () =>
      finish({
        status: "error",
        message:
          "音声を再生できませんでした。再試行するか、英文で遊んでください。",
      });
    callback({ status: "pending", message: "再生しています…" });
    this.timer = setTimeout(() => {
      finish({
        status: "error",
        message: "音声の応答がありません。再試行するか、英文で遊んでください。",
      });
      this.stop();
    }, 12000);
    try {
      this.synth.speak(utterance);
    } catch {
      finish({
        status: "error",
        message: "音声を開始できませんでした。再試行できます。",
      });
    }
  }
}
