// Title screen, broken-save notice and the short (skippable) introduction.

import { h, en, button } from './dom';
import { UI as UIL, VOICE_HELP } from '../data/phrases';
import { NPC_BY_ID } from '../data/npcs';
import { backupBroken, parse } from '../core/save';
import { downloadText } from './settings';
import type { LoadResult } from '../core/save';
import type { GameState } from '../core/state';
import { greekLine, type Ctx } from './ctx';

export interface TitleHooks {
  onContinue(state: GameState): void;
  onNew(): void;
  onImport(state: GameState): void;
}

export function showTitle(root: HTMLElement, save: LoadResult, hooks: TitleHooks, voiceInfo: () => { greek: number; supported: boolean }) {
  const el = h('div', { class: 'title', 'data-testid': 'title' });
  const close = () => el.remove();
  const importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, 'data-testid': 'title-import', onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = parse(await f.text());
    if (!r.ok) { msg.textContent = `That file cannot be loaded (${r.reason}: ${r.detail}).`; return; }
    close();
    hooks.onImport(r.state);
  } }) as HTMLInputElement;
  const msg = h('p', { class: 'warn', lang: 'en' });
  const v = voiceInfo();
  el.append(
    h('div', { class: 'title-card' },
      h('h1', { lang: 'el' }, UIL.title.el),
      en('A life in a (fictional) Greek island town · Greek in the game, English help', 'en sub'),
      save.kind === 'broken' ? h('div', { class: 'warn-box', 'data-testid': 'broken-save' },
        h('p', { lang: 'en' }, `Your saved game could not be read (${save.reason}). It has not been deleted.`),
        h('div', { class: 'row wrap' },
          button('Κατέβασε το αρχείο', () => downloadText('greece-life-broken-save.json', save.raw), { enLabel: 'Download the broken save (for help)' }),
          button('Νέο παιχνίδι', () => { backupBroken(save.raw); close(); hooks.onNew(); }, { enLabel: 'Start over (a copy is kept in greece-life:v1:broken-backup)', testid: 'broken-new' }))) : null,
      h('div', { class: 'title-buttons' },
        save.kind === 'ok' ? button(UIL.continue.el, () => { close(); hooks.onContinue(save.state); }, { cls: 'btn primary big', enLabel: UIL.continue.en, testid: 'continue' }) : null,
        save.kind !== 'broken' ? button(UIL.newGame.el, () => { close(); hooks.onNew(); }, { cls: save.kind === 'ok' ? 'btn big' : 'btn primary big', enLabel: save.kind === 'ok' ? 'New game (replaces the save)' : UIL.newGame.en, testid: 'new' }) : null,
        button('Φόρτωση αρχείου', () => importInput.click(), { cls: 'btn', enLabel: 'Load a save file (JSON)' }),
        importInput),
      msg,
      h('p', { class: 'small', lang: 'en', 'data-testid': 'title-voice' }, !v.supported ? VOICE_HELP.unsupported : v.greek ? `🔊 ${v.greek} Greek voice(s) found.` : `🔇 ${VOICE_HELP.none}`),
      h('p', { class: 'small', lang: 'en' }, 'WASD/arrows walk · Shift run · right-drag camera · E talk/use · M map · Tab bag · P phone · L dictionary · Esc menu'),
      h('p', { class: 'small muted', lang: 'en' }, 'Greek text not yet checked by a native speaker. Placeholder 3D art. Prices and hours are game values.')));
  root.append(el);
  return el;
}

export function showIntro(ctx: Ctx, onRooms: () => void, onSkip: () => void) {
  const g46 = NPC_BY_ID.g46;
  const body = h('div', { class: 'intro' },
    h('h2', null, h('span', { lang: 'el' }, 'Καλώς ήρθες στον Ασπρόγιαλο!'), ' ', en('Welcome to Asprogialos!', 'en sub')),
    h('p', { lang: 'en' }, 'You have just arrived on the island to live here. First you need a room. Mrs Ourania, the landlady, is waiting at the rental office in the Neighbourhood (Γειτονιά).'),
    greekLine(ctx, g46.topic, { cat: 'talk', speaker: g46.name }),
    h('p', { lang: 'en', class: 'small' }, 'Press 🔊 to hear the Greek. Everything in the town is in Greek; English help is always one click away.'),
    h('div', { class: 'row' },
      button('Δες τα δωμάτια', () => { ctx.ui.close('intro'); onRooms(); }, { cls: 'btn primary', enLabel: 'See the four rooms', testid: 'intro-rooms' }),
      button('Παράλειψη', () => { ctx.ui.close('intro'); onSkip(); }, { enLabel: 'Skip: take the first room and start at home', testid: 'intro-skip' })));
  ctx.ui.open('intro', body, { className: 'intro-panel' });
}
