// Weather by month, based on real Cycladic climate figures (RESEARCH.md W01–W02).
// Rain days: Naxos (Chora) station, average 2010–2020. Sunshine hours per day:
// same station, 1955–1993 (no newer sunshine figures on the source page).
// Day length is the approximate daylight at 37° N. Meltemi and winter-wind
// frequencies are game estimates (no day counts found in the sources), see RESEARCH.md.

import type { Line } from './npcs';

const L = (el: string, en: string): Line => ({ el, en });

export interface MonthClimate {
  rainDays: number;
  sunHours: number;
  dayLength: number;
  /** Chance that a 3-day block is windy (meltemi in summer, north/south gales in winter). */
  windBlock: number;
}

/** January … December. */
export const CLIMATE: MonthClimate[] = [
  { rainDays: 10.2, sunHours: 4, dayLength: 9.9, windBlock: 0.25 },
  { rainDays: 7.4, sunHours: 6, dayLength: 10.8, windBlock: 0.25 },
  { rainDays: 6.5, sunHours: 7, dayLength: 11.9, windBlock: 0.15 },
  { rainDays: 2.0, sunHours: 8, dayLength: 13.0, windBlock: 0.1 },
  { rainDays: 1.5, sunHours: 10, dayLength: 14.0, windBlock: 0.08 },
  { rainDays: 0.8, sunHours: 13, dayLength: 14.5, windBlock: 0.15 },
  { rainDays: 0.2, sunHours: 13, dayLength: 14.3, windBlock: 0.4 },
  { rainDays: 0.0, sunHours: 12, dayLength: 13.5, windBlock: 0.4 },
  { rainDays: 0.1, sunHours: 10, dayLength: 12.4, windBlock: 0.15 },
  { rainDays: 2.4, sunHours: 8, dayLength: 11.2, windBlock: 0.1 },
  { rainDays: 4.0, sunHours: 5, dayLength: 10.2, windBlock: 0.15 },
  { rainDays: 6.0, sunHours: 3, dayLength: 9.6, windBlock: 0.25 },
];

export type Sky = 'clear' | 'partly' | 'cloudy' | 'rain';

export const SKY_TEXT: Record<Sky, Line & { icon: string }> = {
  clear: { ...L('Λιακάδα', 'sunny'), icon: '☀️' },
  partly: { ...L('Λίγα σύννεφα', 'a few clouds'), icon: '🌤️' },
  cloudy: { ...L('Συννεφιά', 'cloudy'), icon: '☁️' },
  rain: { ...L('Βροχή', 'rain'), icon: '🌧️' },
};

export const WIND_TEXT = {
  meltemi: L('Μελτέμι', 'meltemi: strong summer north wind'),
  windy: L('Αέρας', 'windy'),
};

/** The beach snack stand closes early on meltemi afternoons (CONTENT_PLAN §8). */
export const MELTEMI_KANTINA_CLOSE = 16 * 60;
