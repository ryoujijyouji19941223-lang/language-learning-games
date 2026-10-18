// Always-visible HUD: clock and date, money, district, buttons, the "E" prompt,
// the sign translation card and active deliveries. It never covers the town.

import { h, en } from './dom';
import { clockText, dateText, dateOf, seasonOf } from '../core/calendar';
import { SEASONS } from '../data/phrases';
import { euro } from '../core/money';
import { parcelLabel } from '../core/delivery';
import type { GameState } from '../core/state';
import type { Ctx } from './ctx';

export interface HudHandlers { map(): void; bag(): void; phone(): void; lexicon(): void; settings(): void; edit(): void; clothes(): void; interact(): void }

export class Hud {
  el: HTMLElement;
  private clock = h('div', { class: 'clock', 'data-testid': 'clock' });
  private date = h('div', { class: 'date' });
  private money = h('div', { class: 'money', 'data-testid': 'money' });
  private district = h('div', { class: 'district' });
  private prompt = h('button', { class: 'prompt', 'data-testid': 'prompt', hidden: true });
  private sign = h('div', { class: 'sign-card', hidden: true, 'data-testid': 'sign-card' });
  private deliveries = h('div', { class: 'hud-deliveries' });
  private banner = h('div', { class: 'banner', hidden: true, 'data-testid': 'banner' });
  private homeBar = h('div', { class: 'home-bar', hidden: true });
  tags = h('div', { class: 'tags' });
  private last: Record<string, string> = {};
  private signKey = '';

  constructor(private ctx: Ctx, private on: HudHandlers) {
    const btn = (icon: string, el: string, enText: string, key: string, fn: () => void, testid: string) =>
      h('button', { class: 'hud-btn', title: `${enText} (${key})`, 'data-testid': testid, onclick: (e: Event) => { (e.currentTarget as HTMLElement).blur(); fn(); } },
        h('span', { class: 'ico' }, icon), h('span', { lang: 'el' }, el), h('kbd', null, key));
    this.prompt.addEventListener('click', () => on.interact());
    this.el = h('div', { class: 'hud' },
      h('div', { class: 'hud-tl' }, this.clock, this.date, this.money, this.district),
      h('div', { class: 'hud-tr' },
        btn('🗺', 'Χάρτης', 'Map', 'M', on.map, 'btn-map'),
        btn('🎒', 'Τσάντα', 'Bag', 'Tab', on.bag, 'btn-bag'),
        btn('📱', 'Κινητό', 'Phone', 'P', on.phone, 'btn-phone'),
        btn('📖', 'Λεξικό', 'Dictionary', 'L', on.lexicon, 'btn-lexicon'),
        btn('⚙', 'Ρυθμίσεις', 'Settings', 'Esc', on.settings, 'btn-settings'),
        this.deliveries),
      this.banner, this.prompt, this.sign, this.homeBar, this.tags);
    this.homeBar.append(
      h('button', { class: 'hud-btn', 'data-testid': 'btn-edit', onclick: () => on.edit() }, h('span', { class: 'ico' }, '🛋'), h('span', { lang: 'el' }, 'Διακόσμηση'), en(' arrange', 'en small')),
      h('button', { class: 'hud-btn', 'data-testid': 'btn-clothes', onclick: () => on.clothes() }, h('span', { class: 'ico' }, '👕'), h('span', { lang: 'el' }, 'Ρούχα'), en(' clothes', 'en small')),
    );
  }

  private set(el: HTMLElement, key: string, value: string, build: () => (Node | string)[]) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    el.replaceChildren(...build());
  }

  update(s: GameState, info: { district: { el: string; en: string }; prompt: { el: string; en: string } | null; atHome: boolean; banner: HTMLElement | null }) {
    const d = dateOf(s.time);
    const dt = dateText(s.time);
    this.set(this.clock, 'clock', clockText(s.time), () => [clockText(s.time)]);
    this.set(this.date, 'date', dt.el, () => [h('span', { lang: 'el' }, dt.el), ' · ', h('span', { lang: 'el' }, SEASONS[seasonOf(d.month)].el), en(` ${dt.en}`, 'en small')]);
    this.set(this.money, 'money', `${s.money}:${s.rent.owed}`, () => [`💶 ${euro(s.money)}`, s.rent.owed ? en(` (owe ${euro(s.rent.owed)})`, 'en small warn') : '']);
    this.set(this.district, 'district', info.district.el, () => [h('span', { lang: 'el' }, info.district.el), en(` ${info.district.en}`, 'en small')]);
    const pkey = info.prompt ? info.prompt.el : '';
    this.prompt.hidden = !info.prompt;
    this.set(this.prompt, 'prompt', pkey, () => (info.prompt ? [h('kbd', null, 'E'), ' ', h('span', { lang: 'el' }, info.prompt.el), en(` ${info.prompt.en}`, 'en small')] : []));
    const dkey = s.deliveries.active.map((x) => `${x.id}${x.status}`).join() + (s.time > (s.deliveries.active[0]?.deadline ?? Infinity) ? 'L' : '');
    this.set(this.deliveries, 'deliv', dkey, () => s.deliveries.active.map((x) => h('div', { class: `dl${s.time > x.deadline ? ' late' : ''}` }, x.status === 'carrying' ? '📦 ' : '⏳ ', h('span', { lang: 'el' }, parcelLabel(x).el))));
    this.homeBar.hidden = !info.atHome;
    this.banner.hidden = !info.banner;
    if (info.banner && this.banner.firstChild !== info.banner) this.banner.replaceChildren(info.banner);
  }

  showSign(sign: { el: string; en: string; sign: string } | null, key: string) {
    if (!sign) { this.sign.hidden = true; this.signKey = ''; return; }
    if (this.signKey === key && !this.sign.hidden) return;
    this.signKey = key;
    this.sign.hidden = false;
    this.ctx.note(sign.el, sign.en, 'sign');
    this.sign.replaceChildren(
      h('div', { class: 'sign-text', lang: 'el' }, sign.sign),
      h('div', null, h('span', { lang: 'el' }, sign.el),
        h('button', { class: 'icon', title: 'Play', 'data-testid': 'sign-play', onclick: (e: Event) => { e.stopPropagation(); this.ctx.say(sign.el, { lexEl: sign.el, lexEn: sign.en, cat: 'sign' }); } }, '🔊'),
        h('button', { class: 'icon', title: 'Slow', onclick: (e: Event) => { e.stopPropagation(); this.ctx.say(sign.el, { slow: true, lexEl: sign.el, lexEn: sign.en, cat: 'sign' }); } }, '🐢')),
      en(sign.en, 'en'));
  }
}
