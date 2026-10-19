import { describe, it, expect } from 'vitest';
import { eat, nextMealSwitch, isFull } from '../../src/core/shop';
import { weatherOfDay, monthOdds, weatherAt } from '../../src/core/weather';
import { dateOfDay } from '../../src/core/calendar';
import { isOpen } from '../../src/core/hours';
import { whereIs } from '../../src/core/people';
import { NPC_BY_ID } from '../../src/data/npcs';
import { CLIMATE } from '../../src/data/weather';
import { must, fresh, at } from './helpers';

describe('fullness: one meal until the next day/night switch', () => {
  it('switches at 06:00 and 18:00', () => {
    expect(nextMealSwitch(at(4, 1, 10)) % 1440).toBe(18 * 60);
    expect(nextMealSwitch(at(4, 1, 19)) % 1440).toBe(6 * 60);
    expect(nextMealSwitch(at(4, 1, 19))).toBe(at(4, 2, 6));
    expect(nextMealSwitch(at(4, 1, 3))).toBe(at(4, 1, 6));
  });
  it('after eating you cannot eat again until the switch; drinks always work; nothing is lost when refused', () => {
    let s = fresh();
    s.inventory = { 'food:koulouri': 2, 'food:water': 2, 'dish:r01': 1 };
    s = must(eat(s, 'food:koulouri')).state;
    expect(isFull(s)).toBe(true);
    expect(s.fullUntil).toBe(at(4, 1, 18));
    const refused = eat(s, 'dish:r01');
    expect(refused.ok).toBe(false);
    expect(s.inventory['dish:r01']).toBe(1);
    s = must(eat(s, 'food:water')).state;
    expect(s.inventory['food:water']).toBe(1);
    s.time = at(4, 1, 18);
    expect(isFull(s)).toBe(false);
    s = must(eat(s, 'dish:r01')).state;
    expect(s.fullUntil).toBe(at(4, 2, 6));
  });
});

describe('weather follows the monthly climate table', () => {
  it('rain days per month are close to the station averages over many years', () => {
    const rain = new Array(12).fill(0);
    const days = new Array(12).fill(0);
    for (let d = 0; d < 365 * 40; d++) {
      const m = dateOfDay(d).month;
      days[m]++;
      if (weatherOfDay(d).sky === 'rain') rain[m]++;
    }
    for (let m = 0; m < 12; m++) {
      const perMonth = (rain[m] / days[m]) * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
      expect(Math.abs(perMonth - CLIMATE[m].rainDays), `month ${m}`).toBeLessThan(1.2);
    }
  });
  it('summer is mostly sunny and winter cloudier; meltemi only in summer', () => {
    expect(monthOdds(6).clear).toBeGreaterThan(0.8);
    expect(monthOdds(0).clear).toBeLessThan(0.45);
    for (let d = 0; d < 365 * 3; d++) {
      const w = weatherOfDay(d);
      if (w.wind === 'meltemi') expect([5, 6, 7, 8]).toContain(dateOfDay(d).month);
    }
  });
  it('the same day always has the same weather (nothing to save)', () => {
    expect(weatherOfDay(123)).toEqual(weatherOfDay(123));
  });
  it('on a meltemi afternoon the beach stand closes early', () => {
    let day = -1;
    for (let d = 61; d < 160; d++) if (weatherOfDay(d).wind === 'meltemi' && dateOfDay(d).month >= 5) { day = d; break; }
    expect(day).toBeGreaterThan(0);
    expect(isOpen('beach_kantina', day * 1440 + 12 * 60)).toBe(true);
    expect(isOpen('beach_kantina', day * 1440 + 17 * 60)).toBe(false);
  });
  it('beach people go home while it rains', () => {
    let t = -1;
    for (let d = 200; d < 400 && t < 0; d++) {
      const w = weatherOfDay(d);
      if (w.sky === 'rain' && w.rainFrom <= 9 * 60 && w.rainTo > 11 * 60) t = d * 1440 + 10 * 60;
    }
    expect(t).toBeGreaterThan(0);
    expect(weatherAt(t).raining).toBe(true);
    expect(whereIs(NPC_BY_ID.g61, t)).toEqual({ kind: 'home' });
  });
});
