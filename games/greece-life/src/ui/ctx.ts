// The shared context every panel gets from main.ts, and the Greek line widget:
// Greek text, 🔊 (normal) and 🐢 (slow) audio, English shown always or on demand.

import type { GameState, Result } from '../core/state';
import type { Line } from '../data/npcs';
import type { Speech, SpeakResult } from '../tts';
import type { LexKind } from '../core/lexicon';
import { h, en, type UI } from './dom';

export interface WorldApi {
  enterArea(areaId: string, at?: { x: number; z: number; yaw: number }): void;
  areaId(): string;
  playerPos(): { x: number; z: number };
  refreshHome(): void;
  setEdit(on: boolean): void;
  viewHome(homeId: string | null): void;
  viewing(): string | null;
  dress(): void;
}

export interface Ctx {
  readonly state: GameState;
  ui: UI;
  speech: Speech;
  world: WorldApi;
  /** Apply an action result; toasts its message or error; autosaves when asked. */
  commit(r: Result, opts?: { save?: boolean; toast?: boolean }): boolean;
  /** Bookkeeping that is not an action (dictionary, settings). */
  mutate(fn: (s: GameState) => void, save?: boolean): void;
  note(el: string, en: string, cat: string, kind?: LexKind): void;
  say(text: string, opts?: { slow?: boolean; lexEl?: string; lexEn?: string; cat?: string }): SpeakResult;
  save(manual?: boolean): void;
  refresh(): void;
}

export interface LineOpts {
  cat?: string;
  /** Text for the synthesiser if it differs (e.g. prices spelled out). */
  speak?: string;
  big?: boolean;
  /** Hide the Greek text until revealed (listening practice). */
  hideText?: boolean;
  noAudio?: boolean;
  speaker?: string;
}

/** Greek line with audio buttons and the English help. Seeing it is noted in the dictionary. */
export function greekLine(ctx: Ctx, line: Line, opts: LineOpts = {}): HTMLElement {
  const cat = opts.cat ?? 'phrase';
  ctx.note(line.el, line.en, cat, 'seen');
  const always = ctx.state.settings.translation === 'always';
  const enEl = en(line.en, 'en tr');
  if (!always || opts.hideText) enEl.hidden = true;
  const elText = h('span', { class: 'el-text', lang: 'el' }, line.el);
  if (opts.hideText) elText.classList.add('hidden-text');
  const play = (slow: boolean) => { ctx.say(opts.speak ?? line.el, { slow, lexEl: line.el, lexEn: line.en, cat }); };
  const controls = opts.noAudio ? null : h('span', { class: 'audio' },
    h('button', { class: 'icon', title: 'Play the Greek (🔊)', 'aria-label': 'Play Greek audio', 'data-testid': 'play', onclick: (e: Event) => { e.stopPropagation(); play(false); } }, '🔊'),
    h('button', { class: 'icon', title: 'Play slowly (🐢)', 'aria-label': 'Play slowly', onclick: (e: Event) => { e.stopPropagation(); play(true); } }, '🐢'),
    always && !opts.hideText ? null : h('button', { class: 'icon en-btn', title: 'Show English', 'aria-label': 'Show English', onclick: (e: Event) => { e.stopPropagation(); enEl.hidden = !enEl.hidden; if (opts.hideText) elText.classList.remove('hidden-text'); } }, 'EN'));
  return h('div', { class: `gline${opts.big ? ' big' : ''}` },
    opts.speaker ? h('span', { class: 'speaker', lang: 'el' }, opts.speaker) : null,
    h('div', { class: 'gline-row' }, elText, controls),
    enEl);
}
