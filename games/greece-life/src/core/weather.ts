// Daily weather, decided only by the game date (nothing to save). Proportions
// follow the monthly climate table: many sunny days in summer, more rain and
// cloud in winter. Rain falls during part of the day; meltemi blows in 3-day spells.

import { CLIMATE, SKY_TEXT, WIND_TEXT, type Sky } from '../data/weather';
import { MONTH_DAYS, dateOfDay } from './calendar';
import { rng } from './geo';

export interface DayWeather {
  sky: Sky;
  /** Rain window (minutes from midnight) on rainy days; outside it the sky is cloudy. */
  rainFrom: number;
  rainTo: number;
  wind: 'calm' | 'windy' | 'meltemi';
}

/** Probabilities for one month: rain from rain days, clouds from missing sunshine. */
export function monthOdds(month: number) {
  const c = CLIMATE[month];
  const rain = c.rainDays / MONTH_DAYS[month];
  const overcast = 1 - c.sunHours / c.dayLength;
  const dry = Math.max(0, overcast - rain);
  const cloudy = Math.max(0.02, dry * 0.6);
  const partly = Math.max(0.03, dry * 0.8);
  return { rain, cloudy, partly, clear: Math.max(0, 1 - rain - cloudy - partly) };
}

export function weatherOfDay(dayIndex: number): DayWeather {
  const d = dateOfDay(dayIndex);
  const r = rng(dayIndex * 2654435761 + 17);
  const odds = monthOdds(d.month);
  const x = r();
  const sky: Sky = x < odds.rain ? 'rain' : x < odds.rain + odds.cloudy ? 'cloudy' : x < odds.rain + odds.cloudy + odds.partly ? 'partly' : 'clear';
  const start = 6 * 60 + Math.floor(r() * 12) * 60;
  const len = (3 + Math.floor(r() * 6)) * 60;
  // wind comes in spells of three days
  const block = Math.floor(dayIndex / 3);
  const wr = rng(block * 40503 + 7)();
  const summer = d.month >= 5 && d.month <= 8;
  const windy = wr < CLIMATE[d.month].windBlock;
  return { sky, rainFrom: start, rainTo: Math.min(1440, start + len), wind: windy ? (summer ? 'meltemi' : 'windy') : 'calm' };
}

export function weatherAt(minutes: number) {
  const day = Math.floor(minutes / 1440);
  const w = weatherOfDay(day);
  const m = minutes - day * 1440;
  const raining = w.sky === 'rain' && m >= w.rainFrom && m < w.rainTo;
  const sky: Sky = w.sky === 'rain' && !raining ? 'cloudy' : w.sky;
  return { ...w, raining, nowSky: sky };
}

/** HUD text for now: "🌧️ Βροχή · Αέρας". */
export function weatherText(minutes: number) {
  const w = weatherAt(minutes);
  const s = SKY_TEXT[w.nowSky];
  const wind = w.wind === 'calm' ? null : WIND_TEXT[w.wind];
  return { icon: w.wind === 'calm' ? s.icon : `${s.icon}💨`, el: wind ? `${s.el} · ${wind.el}` : s.el, en: wind ? `${s.en}, ${wind.en}` : s.en };
}

/** Forecast line for a whole day (calendar). */
export function dayForecast(dayIndex: number) {
  const w = weatherOfDay(dayIndex);
  const s = SKY_TEXT[w.sky];
  const wind = w.wind === 'calm' ? null : WIND_TEXT[w.wind];
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:00`;
  return {
    icon: s.icon,
    el: `${s.el}${w.sky === 'rain' ? ` ${hh(w.rainFrom)}–${hh(w.rainTo)}` : ''}${wind ? ` · ${wind.el}` : ''}`,
    en: `${s.en}${w.sky === 'rain' ? ` from ${hh(w.rainFrom)} to ${hh(w.rainTo)}` : ''}${wind ? `, ${wind.en}` : ''}`,
  };
}

export { MONTH_DAYS };
