// The whole saved game. Every change goes through `tx`, which works on a copy and
// only returns it when the action succeeded, so a failed purchase, move or recipe
// never leaves the state half-changed.

import type { Line } from '../data/npcs';
import type { JobKind } from '../data/jobs';
import type { WallSide } from '../data/homes';
import { START_INVENTORY } from '../data/items';
import { START_WORN } from '../data/clothes';
import { START_MONEY } from '../data/homes';
import { START_TIME } from './calendar';

export const STATE_VERSION = 1;

export type Rot = 0 | 1 | 2 | 3;
export type Placement =
  | { k: 'floor'; area: 'main' | 'out'; x: number; z: number; r: Rot }
  | { k: 'wall'; wall: WallSide; c: number; row: number }
  | { k: 'window'; i: number }
  | { k: 'anchor'; host: string; i: number };

export interface OwnedFurniture { uid: string; id: string; place: Placement | null }

export interface DeliveryOffer { id: string; pickup: string; dest: string; pay: number; minutes: number; day: number }
export interface ActiveDelivery extends DeliveryOffer { acceptedAt: number; deadline: number; status: 'accepted' | 'carrying' }
export interface DeliveryRecord { id: string; outcome: 'delivered' | 'late' | 'cancelled'; pay: number; at: number }

export interface TavernaTable { order: string; water: boolean; served: boolean }
export interface JobSession {
  id: string;
  kind: JobKind;
  startedAt: number;
  /** Order ids, one per customer (café, bakery) or table (taverna). */
  orders: string[];
  index: number;
  /** Café: the customer index who changes their sugar to μέτριο. */
  amendAt: number | null;
  /** Bakery: items already on the shelves. */
  shelved: string[];
  tables: TavernaTable[];
}

export interface CookSession { recipeId: string; step: number; startedAt: number; reserved: Record<string, number> }

export interface NpcMemory { talks: number; lastDay: number; lastReply: number | null; gifts: number; gotGift: boolean }

export interface LexEntry {
  el: string;
  en: string;
  cat: string;
  seen: number;
  /** Heard through a real Greek voice (never counted without one). */
  listened: number;
  /** Chose the right meaning / action (café, bakery, shelves…). */
  selected: number;
  /** Typed while looking at the model. */
  copied: number;
  /** Typed from memory. */
  recalled: number;
  /** Typed correctly only without accents (counted as assisted). */
  assisted: number;
  fav: boolean;
}

export interface Settings {
  voiceURI: string | null;
  tts: boolean;
  rate: number;
  translation: 'always' | 'demand';
  ambient: boolean;
  volume: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  time: number;
  money: number;
  rent: { lastCharged: string | null; owed: number };
  home: string | null;
  viewed: string[];
  introDone: boolean;
  furniture: OwnedFurniture[];
  nextUid: number;
  inventory: Record<string, number>;
  clothes: { owned: string[]; worn: { top: string; bottom: string; shoes: string; acc: string | null } };
  stock: { day: number; left: Record<string, number> };
  deliveries: { day: number; offers: DeliveryOffer[]; active: ActiveDelivery[]; history: DeliveryRecord[]; seq: number };
  jobs: { active: JobSession | null; history: { id: string; kind: JobKind; at: number; pay: number }[]; seq: number };
  cooking: CookSession | null;
  npcs: Record<string, NpcMemory>;
  lexicon: Record<string, LexEntry>;
  settings: Settings;
  player: { area: string; x: number; z: number; yaw: number };
  stats: { cooked: number; shifts: number; delivered: number; listened: number; noVoicePlays: number };
  log: { at: number; el: string; en: string }[];
}

export const DEFAULT_SETTINGS: Settings = { voiceURI: null, tts: true, rate: 1, translation: 'always', ambient: true, volume: 0.5 };

export function newGame(settings: Settings = DEFAULT_SETTINGS, now = Date.now()): GameState {
  return {
    version: STATE_VERSION,
    createdAt: now,
    time: START_TIME,
    money: START_MONEY,
    rent: { lastCharged: null, owed: 0 },
    home: null,
    viewed: [],
    introDone: false,
    furniture: [],
    nextUid: 1,
    inventory: { ...START_INVENTORY },
    clothes: { owned: ['c01', 'c09', 'c15'], worn: { ...START_WORN } },
    stock: { day: 0, left: {} },
    deliveries: { day: -1, offers: [], active: [], history: [], seq: 1 },
    jobs: { active: null, history: [], seq: 1 },
    cooking: null,
    npcs: {},
    lexicon: {},
    settings: { ...settings },
    player: { area: 'town', x: 0, z: 0, yaw: 0 },
    stats: { cooked: 0, shifts: 0, delivered: 0, listened: 0, noVoicePlays: 0 },
    log: [],
  };
}

export type Ok = { ok: true; state: GameState; msg?: Line; total?: number };
export type Fail = { ok: false; error: Line };
export type Result = Ok | Fail;

export class ActionError extends Error {
  constructor(public line: Line) { super(line.en); }
}
export const fail = (el: string, en: string): never => { throw new ActionError({ el, en }); };

/** Run `fn` on a copy. Throwing ActionError (via `fail`) aborts with no change. */
export function tx(state: GameState, fn: (draft: GameState) => Line | void | { msg?: Line; total?: number }): Result {
  const draft = structuredClone(state);
  try {
    const out = fn(draft);
    if (out && 'el' in out) return { ok: true, state: draft, msg: out };
    return { ok: true, state: draft, msg: out?.msg, total: out?.total };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.line };
    throw e;
  }
}

export function addInventory(s: GameState, id: string, n: number) {
  const v = (s.inventory[id] ?? 0) + n;
  if (v < 0) fail('Δεν φτάνουν.', `Not enough: ${id}`);
  if (v === 0) delete s.inventory[id];
  else s.inventory[id] = v;
}

export function logEvent(s: GameState, line: Line) {
  s.log.unshift({ at: s.time, ...line });
  if (s.log.length > 40) s.log.length = 40;
}

export function newUid(s: GameState) {
  return `u${s.nextUid++}`;
}
