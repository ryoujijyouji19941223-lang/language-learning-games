import { newGame, type GameState } from '../../src/core/state';
import { rentHome } from '../../src/core/housing';
import { dayIndexOf } from '../../src/core/calendar';

export function must<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify((r as { error?: unknown }).error)}`);
  return r as Extract<T, { ok: true }>;
}

/** New game at 10:00 on Friday 1 May, when the small shops are open. */
export function fresh(): GameState {
  const s = newGame();
  s.time = 10 * 60;
  return s;
}

/** New game with a room rented and the player inside it. */
export function withHome(homeId = 'h01'): GameState {
  const s = must(rentHome(fresh(), homeId)).state;
  s.player.area = `home:${homeId}`;
  return s;
}

/** Minutes for a given game date and time. */
export const at = (month: number, day: number, h: number, m = 0, year = 1) => dayIndexOf(year, month, day) * 1440 + h * 60 + m;
