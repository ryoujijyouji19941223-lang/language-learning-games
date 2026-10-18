// Game calendar (SPEC §9): not synced with real time. Year 1 starts on 1 May
// (Πρωτομαγιά) at 08:00. Ordinary 12 months, February has 28 days, Monday first.
// Time is stored as game minutes since 00:00 on 1 May, year 1.

import { MONTHS, WEEKDAYS, SEASONS } from '../data/phrases';

export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const START_DAY_OF_YEAR = 31 + 28 + 31 + 30; // 1 May, 0-based
/** Weekday of 1 May, year 1 (0 = Monday). The game calendar makes it a Friday. */
const START_WEEKDAY = 4;
export const START_TIME = 8 * 60;
/** Walking: one real second = 30 game seconds. */
export const GAME_MINUTES_PER_REAL_SECOND = 0.5;

export interface GameDate {
  dayIndex: number;
  year: number;
  /** 0 = January. */
  month: number;
  /** 1-based. */
  day: number;
  /** 0 = Monday. */
  weekday: number;
  minuteOfDay: number;
  hour: number;
  minute: number;
}

export function dateOfDay(dayIndex: number): Omit<GameDate, 'minuteOfDay' | 'hour' | 'minute'> {
  const abs = START_DAY_OF_YEAR + dayIndex;
  const year = 1 + Math.floor(abs / 365);
  let doy = ((abs % 365) + 365) % 365;
  let month = 0;
  while (doy >= MONTH_DAYS[month]) { doy -= MONTH_DAYS[month]; month++; }
  return { dayIndex, year, month, day: doy + 1, weekday: (((START_WEEKDAY + dayIndex) % 7) + 7) % 7 };
}

export function dateOf(minutes: number): GameDate {
  const dayIndex = Math.floor(minutes / 1440);
  const minuteOfDay = Math.floor(minutes - dayIndex * 1440);
  return { ...dateOfDay(dayIndex), minuteOfDay, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 };
}

export function dayIndexOf(year: number, month: number, day: number): number {
  let doy = day - 1;
  for (let m = 0; m < month; m++) doy += MONTH_DAYS[m];
  return (year - 1) * 365 + doy - START_DAY_OF_YEAR;
}

export function seasonOf(month: number): keyof typeof SEASONS {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const clockText = (minutes: number) => {
  const d = dateOf(minutes);
  return `${pad2(d.hour)}:${pad2(d.minute)}`;
};
export const hhmm = (minuteOfDay: number) => `${pad2(Math.floor(minuteOfDay / 60) % 24)}:${pad2(Math.floor(minuteOfDay % 60))}`;

/** "Παρασκευή 1 Μαΐου" / "Friday 1 May". */
export function dateText(minutes: number) {
  const d = dateOf(minutes);
  return {
    el: `${WEEKDAYS[d.weekday].el} ${d.day} ${MONTHS[d.month].gen}`,
    en: `${WEEKDAYS[d.weekday].en} ${d.day} ${MONTHS[d.month].en}, year ${d.year}`,
  };
}

export const monthKey = (d: { year: number; month: number }) => `${d.year}-${d.month}`;

/** Next 08:00 strictly after `minutes`. */
export function nextMorning(minutes: number): number {
  const day = Math.floor(minutes / 1440);
  const today8 = day * 1440 + 8 * 60;
  return minutes < today8 ? today8 : today8 + 1440;
}
