// Residents: where they are (SPEC §13) and what the short conversation records.

import { NPC_BY_ID, NPCS, type NpcDef } from '../data/npcs';
import { SHOP_BY_ID } from '../data/shops';
import { dateOf } from './calendar';
import { isOpen, isSiesta } from './hours';
import { tx, fail, addInventory, type GameState } from './state';

export type Whereabouts = { kind: 'work'; shop: string } | { kind: 'zone'; zone: string } | { kind: 'home' };

/** Shop staff are at work while it is open; otherwise morning / evening spots, home at the break and at night. */
export function whereIs(npc: NpcDef, minutes: number): Whereabouts {
  if (npc.work && SHOP_BY_ID[npc.work]?.week && isOpen(npc.work, minutes)) return { kind: 'work', shop: npc.work };
  const m = dateOf(minutes).minuteOfDay;
  const night = m >= 22 * 60 || m < 7 * 60;
  if (night) return npc.night ? { kind: 'zone', zone: npc.night } : { kind: 'home' };
  if (isSiesta(m)) return { kind: 'home' };
  return { kind: 'zone', zone: m < 14 * 60 + 30 ? npc.am : npc.pm };
}

export function memory(s: GameState, id: string) {
  return s.npcs[id] ?? { talks: 0, lastDay: -1, lastReply: null, gifts: 0, gotGift: false };
}

/** Record that you talked and which reply you chose (all replies are fine). */
export function recordTalk(state: GameState, npcId: string, reply: number | null) {
  return tx(state, (s) => {
    const npc = NPC_BY_ID[npcId];
    if (!npc) fail('Άγνωστος.', 'Unknown person.');
    const m = { ...memory(s, npcId) };
    m.talks++;
    m.lastDay = Math.floor(s.time / 1440);
    if (reply !== null) {
      m.lastReply = reply;
      const gift = npc.replies[reply]?.gift;
      if (gift && !m.gotGift) {
        addInventory(s, gift, 1);
        m.gotGift = true;
      }
    }
    s.npcs[npcId] = m;
  });
}

export function giveGift(state: GameState, npcId: string, itemId: string) {
  return tx(state, (s) => {
    if (!(s.inventory[itemId] > 0)) fail('Δεν το έχεις.', 'You do not have that.');
    if (!itemId.startsWith('dish:') && !itemId.startsWith('food:')) fail('Δώσε κάτι φαγώσιμο.', 'Give something to eat.');
    addInventory(s, itemId, -1);
    const m = { ...memory(s, npcId) };
    m.gifts++;
    s.npcs[npcId] = m;
  });
}

export const metCount = (s: GameState) => NPCS.filter((n) => (s.npcs[n.id]?.talks ?? 0) > 0).length;
