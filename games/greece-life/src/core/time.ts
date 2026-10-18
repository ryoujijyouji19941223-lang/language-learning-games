// Moving the clock. Large jumps (sleep, resting several days) process every
// midnight in order, so rent is charged once per month and nothing is skipped.

import type { Line } from '../data/npcs';
import { HOME_BY_ID } from '../data/homes';
import { dateOfDay, monthKey, nextMorning } from './calendar';
import { refreshOffers } from './delivery';
import { euro } from './money';
import { logEvent, tx, fail, type GameState } from './state';

function onNewDay(s: GameState, day: number, events: Line[]) {
  const d = dateOfDay(day);
  s.stock = { day, left: {} };
  refreshOffers(s, day);
  if (d.day === 1) chargeRent(s, monthKey(d), events);
}

export function chargeRent(s: GameState, key: string, events: Line[] = []) {
  if (!s.home || s.rent.lastCharged === key) return;
  const rent = HOME_BY_ID[s.home].rent;
  s.rent.lastCharged = key;
  if (s.money >= rent) {
    s.money -= rent;
    const e = { el: `Πληρώθηκε το ενοίκιο: ${euro(rent)}`, en: `Rent paid: ${euro(rent)}` };
    events.push(e);
    logEvent(s, e);
  } else {
    s.rent.owed += rent;
    const e = { el: `Το ενοίκιο (${euro(rent)}) θα το πληρώσεις αργότερα.`, en: `Not enough money for the rent (${euro(rent)}). It is noted as owed — pay it at the rental office when you can.` };
    events.push(e);
    logEvent(s, e);
  }
}

/** Mutates `s` (call inside tx or on a draft). Returns messages for the player. */
export function advance(s: GameState, minutes: number): Line[] {
  if (!(minutes > 0)) return [];
  const events: Line[] = [];
  const startDay = Math.floor(s.time / 1440);
  s.time += minutes;
  const endDay = Math.floor(s.time / 1440);
  for (let d = startDay + 1; d <= endDay; d++) onNewDay(s, d, events);
  return events;
}

export function sleep(state: GameState) {
  return tx(state, (s) => {
    if (s.jobs.active) fail('Τελείωσε πρώτα τη βάρδια.', 'Finish your shift first.');
    const events = advance(s, nextMorning(s.time) - s.time);
    return { el: ['Καλημέρα!', ...events.map((e) => e.el)].join(' '), en: ['Good morning! It is 08:00.', ...events.map((e) => e.en)].join(' ') };
  });
}

export function waitHour(state: GameState) {
  return tx(state, (s) => {
    const events = advance(s, 60);
    return { el: ['Πέρασε μια ώρα.', ...events.map((e) => e.el)].join(' '), en: ['An hour passed.', ...events.map((e) => e.en)].join(' ') };
  });
}

/** Rest up to 7 days; you wake at 08:00 on the chosen day. */
export function restDays(state: GameState, days: number) {
  return tx(state, (s) => {
    if (!Number.isInteger(days) || days < 1 || days > 7) fail('Από μία ως επτά μέρες.', 'Choose 1 to 7 days.');
    if (s.jobs.active) fail('Τελείωσε πρώτα τη βάρδια.', 'Finish your shift first.');
    const target = nextMorning(s.time) + (days - 1) * 1440;
    const events = advance(s, target - s.time);
    return { el: [`Ξεκουράστηκες ${days} ${days === 1 ? 'μέρα' : 'μέρες'}.`, ...events.map((e) => e.el)].join(' '), en: [`You rested ${days} day(s).`, ...events.map((e) => e.en)].join(' ') };
  });
}

/** Deliveries whose deadline falls before the given time (shown before resting). */
export function deadlinesBefore(s: GameState, time: number) {
  return s.deliveries.active.filter((d) => d.deadline < time);
}
