import { SHOP_BY_ID, type ShopDef } from '../data/shops';
import { dateOf, hhmm } from './calendar';

export function isOpen(shop: ShopDef | string, minutes: number): boolean {
  const s = typeof shop === 'string' ? SHOP_BY_ID[shop] : shop;
  if (!s || !s.week) return false;
  const d = dateOf(minutes);
  if (s.months && !s.months.includes(d.month)) return false;
  return s.week[d.weekday].some(([a, b]) => d.minuteOfDay >= a && d.minuteOfDay < b);
}

/** Today's hours as text, e.g. "09:00–14:30, 17:30–20:30" or null when closed all day. */
export function hoursToday(shop: ShopDef | string, minutes: number): string | null {
  const s = typeof shop === 'string' ? SHOP_BY_ID[shop] : shop;
  if (!s?.week) return null;
  const d = dateOf(minutes);
  if (s.months && !s.months.includes(d.month)) return null;
  const iv = s.week[d.weekday];
  if (!iv.length) return null;
  return iv.map(([a, b]) => `${hhmm(a)}–${b >= 1440 ? '24:00' : hhmm(b)}`).join(', ');
}

/** The afternoon break (μεσημεριανή ανάπαυση) used for the quiet town mood and residents at home. */
export const isSiesta = (minuteOfDay: number) => minuteOfDay >= 14 * 60 + 30 && minuteOfDay < 17 * 60 + 30;
