// Ρυθμίσεις: Greek voice (choose, test, speed, on/off), translations, sound,
// saving (manual save, JSON export/import, delete) and the controls.

import { VOICE_HELP } from '../data/phrases';
import { isGreek } from '../tts';
import { serialize, parse, deleteSave } from '../core/save';
import { h, en, header, button, ask } from './dom';
import type { Ctx } from './ctx';

export interface SettingsHooks { onImport(state: unknown): void; onNewGame(): void; onAmbient(on: boolean, vol: number): void }

export function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function openSettings(ctx: Ctx, hooks: SettingsHooks) {
  const close = () => ctx.ui.close('settings');
  const body = h('div', { class: 'settings' });
  const render = () => {
    const s = ctx.state.settings;
    const voices = ctx.speech.voices;
    const greek = voices.filter(isGreek);
    const current = ctx.speech.voiceFor(s.voiceURI);
    const select = h('select', { 'aria-label': 'Greek voice', 'data-testid': 'voice-select', onchange: (e: Event) => { const v = (e.target as HTMLSelectElement).value; ctx.mutate((st) => { st.settings.voiceURI = v || null; }, true); render(); } },
      h('option', { value: '' }, 'Automatic (Athina → Nestoras → Stefanos → first Greek voice)'),
      ...greek.map((v) => h('option', { value: v.voiceURI, selected: s.voiceURI === v.voiceURI }, `${v.name} (${v.lang})`)));
    body.replaceChildren(
      header('Ρυθμίσεις', 'Settings (Esc)', close),
      h('section', null,
        h('h3', null, h('span', { lang: 'el' }, 'Φωνή'), ' ', en('Greek voice', 'en sub')),
        !ctx.speech.supported ? h('p', { class: 'warn', lang: 'en' }, VOICE_HELP.unsupported)
          : !greek.length ? h('p', { class: 'warn', lang: 'en', 'data-testid': 'no-voice-help' }, VOICE_HELP.none)
            : h('p', { lang: 'en', 'data-testid': 'voice-current' }, `In use: ${current ? `${current.name} (${current.lang})` : '—'} · ${greek.length} Greek voice(s) found.`),
        greek.length ? select : null,
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.tts, onchange: (e: Event) => { ctx.mutate((st) => { st.settings.tts = (e.target as HTMLInputElement).checked; }, true); render(); } }), en(' Speech on', 'en')),
        h('div', { class: 'row' },
          h('label', null, h('input', { type: 'radio', name: 'rate', checked: s.rate === 1, onchange: () => { ctx.mutate((st) => { st.settings.rate = 1; }, true); } }), en(' normal speed (1.0)')),
          h('label', null, h('input', { type: 'radio', name: 'rate', checked: s.rate !== 1, onchange: () => { ctx.mutate((st) => { st.settings.rate = 0.8; }, true); } }), en(' slower (0.8)'))),
        button('Δοκιμή: «Καλημέρα! Τι κάνεις;»', () => ctx.say('Καλημέρα! Τι κάνεις;', { lexEl: 'Καλημέρα! Τι κάνεις;', lexEn: 'Good morning! How are you?', cat: 'phrase' }), { enLabel: 'Test the voice', testid: 'voice-test' }),
        h('p', { class: 'small', lang: 'en' }, 'Tip: Microsoft Edge usually has natural Greek voices (Athina, Nestoras) with an internet connection. In Chrome you need the Windows Greek voice (Stefanos). Not yet checked on a real Windows PC by us.'),
      ),
      h('section', null,
        h('h3', null, h('span', { lang: 'el' }, 'Μετάφραση'), ' ', en('English help', 'en sub')),
        h('label', null, h('input', { type: 'radio', name: 'tr', checked: s.translation === 'always', onchange: () => { ctx.mutate((st) => { st.settings.translation = 'always'; }, true); } }), en(' always show English')),
        h('label', null, h('input', { type: 'radio', name: 'tr', checked: s.translation === 'demand', 'data-testid': 'tr-demand', onchange: () => { ctx.mutate((st) => { st.settings.translation = 'demand'; }, true); } }), en(' only when I press EN (and hide orders at work until I listen or reveal)')),
      ),
      h('section', null,
        h('h3', null, h('span', { lang: 'el' }, 'Ήχοι'), ' ', en('ambient sound (temporary)', 'en sub')),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: s.ambient, onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; ctx.mutate((st) => { st.settings.ambient = on; }, true); hooks.onAmbient(on, ctx.state.settings.volume); } }), en(' waves, wind and street sounds')),
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.volume, 'aria-label': 'Volume', oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); ctx.mutate((st) => { st.settings.volume = v; }, true); hooks.onAmbient(ctx.state.settings.ambient, v); } }),
      ),
      h('section', null,
        h('h3', null, h('span', { lang: 'el' }, 'Αποθήκευση'), ' ', en('saving', 'en sub')),
        h('p', { class: 'small', lang: 'en' }, 'The game saves automatically after buying, moving, work, cooking and sleeping (browser storage key greece-life:v1).'),
        h('div', { class: 'row wrap' },
          button('Αποθήκευση', () => ctx.save(true), { enLabel: 'Save now', testid: 'save-now' }),
          button('Εξαγωγή JSON', () => downloadText(`greece-life-save-${new Date().toISOString().slice(0, 10)}.json`, serialize(ctx.state)), { enLabel: 'Export save file', testid: 'export' }),
          h('label', { class: 'btn file' }, h('span', { lang: 'el' }, 'Φόρτωση JSON'), en(' Import save file', 'en small'),
            h('input', { type: 'file', accept: 'application/json,.json', 'data-testid': 'import', onchange: async (e: Event) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const r = parse(await file.text());
              if (!r.ok) { ctx.ui.toast('Το αρχείο δεν διαβάζεται.', `That file cannot be loaded (${r.reason}: ${r.detail}). Your current game is unchanged.`, 'error', 8000); return; }
              hooks.onImport(r.state);
              ctx.ui.toast('Φορτώθηκε!', r.migrated ? 'Loaded (converted from an older version).' : 'Save file loaded.', 'good');
              close();
            } })),
          button('Νέο παιχνίδι', () => ask(ctx.ui, 'Νέο παιχνίδι;', 'Start a new game? The current saved game will be replaced. Export it first if you want to keep it.', 'Ναι, από την αρχή', () => { deleteSave(); hooks.onNewGame(); close(); }, 'Yes, start over'), { cls: 'btn ghost', enLabel: 'New game (deletes the save)', testid: 'new-game' }),
        ),
      ),
      h('section', null,
        h('h3', null, h('span', { lang: 'el' }, 'Χειρισμός'), ' ', en('controls', 'en sub')),
        h('ul', { class: 'small', lang: 'en' },
          h('li', null, 'WASD / arrow keys: walk · Shift: run · right mouse drag: turn the camera · mouse wheel: zoom'),
          h('li', null, 'E or Enter: talk / look / use · Esc: back / this menu'),
          h('li', null, 'M: map · Tab: bag · P: phone (deliveries, calendar, rest) · L: dictionary'),
          h('li', null, 'While a text box is focused, the keys type instead of moving.')),
      ),
    );
  };
  render();
  ctx.ui.open('settings', body, { className: 'wide' });
}
