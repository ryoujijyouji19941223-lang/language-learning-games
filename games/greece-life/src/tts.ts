// Greek speech with the browser's Web Speech API (SPEC §15). No paid or online
// service of our own. speak() is only called from a click or key press.

export interface VoiceLike { name: string; lang: string; voiceURI: string; localService?: boolean }
export interface SynthLike {
  getVoices(): VoiceLike[];
  speak(u: unknown): void;
  cancel(): void;
  addEventListener?(type: 'voiceschanged', fn: () => void, opts?: { once?: boolean }): void;
}

const PREFERRED = [/Athina/i, /Nestoras/i, /Stefanos/i];

export const isGreek = (v: VoiceLike) => v.lang.replace('_', '-').toLowerCase().startsWith('el');

/** Athina → Nestoras → Stefanos, else the first Greek voice, else null. */
export function pickGreekVoice(list: VoiceLike[], preferredURI: string | null = null): VoiceLike | null {
  const el = list.filter(isGreek);
  if (preferredURI) {
    const chosen = list.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  for (const re of PREFERRED) {
    const v = el.find((x) => re.test(x.name));
    if (v) return v;
  }
  return el[0] ?? null;
}

export type SpeakResult = { ok: true; voice: string } | { ok: false; reason: 'unsupported' | 'no-greek-voice' | 'off' | 'empty' };

type Listener = () => void;

export class Speech {
  voices: VoiceLike[] = [];
  /** The utterance is kept until it ends (Chrome may drop onend for collected objects). */
  private current: unknown = null;
  private listeners = new Set<Listener>();
  constructor(
    private synth: SynthLike | null,
    private Utterance: (new (text: string) => { voice: unknown; lang: string; rate: number; onend: unknown }) | null,
  ) {}

  static fromWindow(): Speech {
    const w = globalThis as unknown as { speechSynthesis?: SynthLike; SpeechSynthesisUtterance?: new (t: string) => never };
    return new Speech(w.speechSynthesis ?? null, w.SpeechSynthesisUtterance ?? null);
  }

  get supported() { return !!this.synth && !!this.Utterance; }

  onChange(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { for (const fn of this.listeners) fn(); }

  /** Waits for voices (they can arrive late, e.g. Edge online voices), max `timeoutMs`. Keeps updating afterwards. */
  init(timeoutMs = 3000): Promise<VoiceLike[]> {
    const synth = this.synth;
    if (!synth) return Promise.resolve([]);
    const refresh = () => { this.voices = synth.getVoices(); this.emit(); };
    synth.addEventListener?.('voiceschanged', refresh);
    this.voices = synth.getVoices();
    if (this.voices.length) { this.emit(); return Promise.resolve(this.voices); }
    return new Promise((resolve) => {
      const t = setTimeout(() => { refresh(); resolve(this.voices); }, timeoutMs);
      synth.addEventListener?.('voiceschanged', () => { clearTimeout(t); refresh(); resolve(this.voices); }, { once: true });
    });
  }

  greekVoices() { return this.voices.filter(isGreek); }

  voiceFor(preferredURI: string | null) { return pickGreekVoice(this.voices, preferredURI); }

  /** One short line; stops anything still playing first. */
  speak(text: string, opts: { rate?: number; voiceURI?: string | null; enabled?: boolean } = {}): SpeakResult {
    if (opts.enabled === false) return { ok: false, reason: 'off' };
    if (!this.synth || !this.Utterance) return { ok: false, reason: 'unsupported' };
    if (!text.trim()) return { ok: false, reason: 'empty' };
    if (!this.voices.length) this.voices = this.synth.getVoices();
    const v = pickGreekVoice(this.voices, opts.voiceURI ?? null);
    if (!v || !isGreek(v)) return { ok: false, reason: 'no-greek-voice' };
    this.synth.cancel();
    const u = new this.Utterance(text.normalize('NFC'));
    u.voice = v;
    u.lang = v.lang;
    u.rate = opts.rate ?? 1;
    u.onend = () => { if (this.current === u) this.current = null; };
    this.current = u;
    this.synth.speak(u);
    return { ok: true, voice: v.name };
  }

  stop() { this.synth?.cancel(); this.current = null; }
}
