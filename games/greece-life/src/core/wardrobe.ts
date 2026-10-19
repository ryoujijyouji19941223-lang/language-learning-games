import { CLOTHES_BY_ID } from '../data/clothes';
import { tx, fail, type GameState } from './state';

/** Wear an owned piece in its slot. Owning and wearing are separate (SPEC §8). */
export function wear(state: GameState, id: string) {
  return tx(state, (s) => {
    const c = CLOTHES_BY_ID[id];
    if (!c) fail('Άγνωστο ρούχο.', 'Unknown clothing.');
    if (!s.clothes.owned.includes(id)) fail('Δεν το έχεις.', 'You do not own that yet.');
    s.clothes.worn[c.slot] = id;
  });
}

/** Only the accessory slot may be empty. */
export function takeOffAccessory(state: GameState) {
  return tx(state, (s) => {
    s.clothes.worn.acc = null;
  });
}
