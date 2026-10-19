// Temporary ambient sound made with Web Audio (no audio files): waves near the
// sea, wind on the hill, a soft murmur on the market street. Starts after the
// first click (browser rule) and can be switched off in Settings.

export class Ambient {
  private ctx: AudioContext | null = null;
  private waves: GainNode | null = null;
  private wind: GainNode | null = null;
  private murmur: GainNode | null = null;
  private master: GainNode | null = null;
  enabled = true;
  volume = 0.5;

  start() {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const data = noise.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; data[i] = last * 6; }
      this.master = ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(ctx.destination);
      const chain = (freq: number, q: number, type: BiquadFilterType) => {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(f).connect(g).connect(this.master!);
        src.start();
        return { g, f };
      };
      const w = chain(420, 0.6, 'lowpass');
      this.waves = w.g;
      // slow swell of the waves
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain).connect(w.f.frequency);
      lfo.start();
      this.wind = chain(900, 0.9, 'bandpass').g;
      this.murmur = chain(1600, 2.5, 'bandpass').g;
    } catch {
      this.ctx = null;
    }
  }

  set(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = volume;
    if (this.master) this.master.gain.value = enabled ? volume : 0;
    if (enabled && this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  /** sea 0–1 (closeness to the water), height in metres, market 0–1, inside true/false. */
  mix(sea: number, height: number, market: number, inside: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const k = inside ? 0.25 : 1;
    this.waves?.gain.setTargetAtTime(0.5 * sea * k, t, 0.6);
    this.wind?.gain.setTargetAtTime(Math.min(0.35, 0.05 + height / 60) * k, t, 0.8);
    this.murmur?.gain.setTargetAtTime(0.06 * market * k, t, 0.8);
  }

  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.enabled) void this.ctx?.resume(); }
}
