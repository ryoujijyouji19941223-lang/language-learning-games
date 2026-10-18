// Saving (SPEC §17). Key `greece-life:v1` in localStorage; nothing else is touched.
// Includes JSON export/import, version migration, range checks and a safe reset.

import { HOME_BY_ID } from '../data/homes';
import { FURNITURE_BY_ID } from '../data/furniture';
import { CLOTHES_BY_ID } from '../data/clothes';
import { ITEM_BY_ID } from '../data/items';
import { RECIPE_BY_ID } from '../data/recipes';
import { DEFAULT_SETTINGS, STATE_VERSION, type GameState } from './state';

export const SAVE_KEY = 'greece-life:v1';
export const BACKUP_KEY = 'greece-life:v1:broken-backup';
export const FORMAT = 'greece-life-save';

export interface SaveFile { format: string; version: number; savedAt: string; state: GameState }

export function serialize(state: GameState, now = new Date()): string {
  const file: SaveFile = { format: FORMAT, version: STATE_VERSION, savedAt: now.toISOString(), state };
  return JSON.stringify(file);
}

export type ParseResult = { ok: true; state: GameState; migrated: boolean } | { ok: false; reason: 'json' | 'format' | 'version' | 'invalid'; detail: string };

const isInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** Version 0 was the M1 draft layout: money in euros (float) and a flat `worn` array. */
function migrate(raw: Record<string, unknown>): { state: Record<string, unknown>; migrated: boolean } {
  const version = (raw.version as number) ?? 0;
  if (version === STATE_VERSION) return { state: raw.state as Record<string, unknown>, migrated: false };
  if (version === 0) {
    const old = raw.state as Record<string, unknown>;
    const worn = (old.worn as string[] | undefined) ?? ['c01', 'c09', 'c15'];
    const st: Record<string, unknown> = {
      ...old,
      version: 1,
      money: Math.round(((old.money as number) ?? 0) * 100),
      clothes: { owned: (old.clothesOwned as string[]) ?? [...worn], worn: { top: worn[0], bottom: worn[1], shoes: worn[2], acc: worn[3] ?? null } },
    };
    delete st.worn;
    delete st.clothesOwned;
    return { state: st, migrated: true };
  }
  throw new Error(`unknown version ${version}`);
}

/** Lists problems; empty means the state is safe to load. */
export function validate(st: Record<string, unknown>): string[] {
  const p: string[] = [];
  const s = st as unknown as GameState;
  if (s.version !== STATE_VERSION) p.push('version');
  if (!isNum(s.time) || s.time < 0 || s.time > 1440 * 365 * 200) p.push('time');
  if (!isInt(s.money) || Math.abs(s.money) > 1e9) p.push('money');
  if (!s.rent || !isInt(s.rent.owed) || s.rent.owed < 0) p.push('rent');
  if (s.home !== null && !HOME_BY_ID[s.home as string]) p.push('home');
  if (!Array.isArray(s.furniture)) p.push('furniture');
  else for (const f of s.furniture) {
    if (!f || typeof f.uid !== 'string' || !FURNITURE_BY_ID[f.id]) { p.push(`furniture item ${f?.id}`); continue; }
    if (f.place !== null && (typeof f.place !== 'object' || !['floor', 'wall', 'window', 'anchor'].includes(f.place.k))) p.push(`placement ${f.uid}`);
  }
  if (!s.inventory || typeof s.inventory !== 'object') p.push('inventory');
  else for (const [id, n] of Object.entries(s.inventory)) {
    const known = ITEM_BY_ID[id] || (id.startsWith('dish:') && RECIPE_BY_ID[id.slice(5)]);
    if (!known || !isInt(n) || (n as number) < 0) p.push(`inventory ${id}`);
  }
  if (!s.clothes || !Array.isArray(s.clothes.owned) || !s.clothes.worn) p.push('clothes');
  else {
    for (const c of s.clothes.owned) if (!CLOTHES_BY_ID[c]) p.push(`clothes ${c}`);
    for (const c of Object.values(s.clothes.worn)) if (c !== null && !CLOTHES_BY_ID[c as string]) p.push(`worn ${c}`);
  }
  if (!s.settings || typeof s.settings !== 'object') p.push('settings');
  if (!s.player || !isNum(s.player.x) || !isNum(s.player.z) || typeof s.player.area !== 'string') p.push('player');
  if (!s.deliveries || !Array.isArray(s.deliveries.active) || s.deliveries.active.length > 3) p.push('deliveries');
  if (!s.jobs || !Array.isArray(s.jobs.history)) p.push('jobs');
  if (!s.npcs || typeof s.npcs !== 'object') p.push('npcs');
  if (!s.lexicon || typeof s.lexicon !== 'object') p.push('lexicon');
  return p;
}

export function parse(text: string): ParseResult {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: 'json', detail: String(e) };
  }
  if (!raw || typeof raw !== 'object' || raw.format !== FORMAT || typeof raw.state !== 'object') {
    return { ok: false, reason: 'format', detail: 'Not a greece-life save file.' };
  }
  let st: Record<string, unknown>;
  let migrated = false;
  try {
    ({ state: st, migrated } = migrate(raw));
  } catch (e) {
    return { ok: false, reason: 'version', detail: String(e) };
  }
  // Fill fields added later with defaults, so older saves keep working.
  st.settings = { ...DEFAULT_SETTINGS, ...(st.settings as object) };
  st.stats = { cooked: 0, shifts: 0, delivered: 0, listened: 0, noVoicePlays: 0, ...(st.stats as object) };
  st.log = Array.isArray(st.log) ? st.log : [];
  st.viewed = Array.isArray(st.viewed) ? st.viewed : [];
  const problems = validate(st);
  if (problems.length) return { ok: false, reason: 'invalid', detail: problems.slice(0, 8).join(', ') };
  return { ok: true, state: st as unknown as GameState, migrated };
}

// ── Storage (localStorage; failures are reported, play continues) ──────
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

export function storage(): Store | null {
  try {
    const s = globalThis.localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

export function writeSave(state: GameState, store = storage()): { ok: boolean; error?: string } {
  if (!store) return { ok: false, error: 'Storage is not available in this browser window.' };
  try {
    store.setItem(SAVE_KEY, serialize(state));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

export type LoadResult = { kind: 'none' } | { kind: 'ok'; state: GameState; migrated: boolean } | { kind: 'broken'; reason: string; raw: string };

export function readSave(store = storage()): LoadResult {
  if (!store) return { kind: 'none' };
  let raw: string | null = null;
  try {
    raw = store.getItem(SAVE_KEY);
  } catch {
    return { kind: 'none' };
  }
  if (!raw) return { kind: 'none' };
  const r = parse(raw);
  if (r.ok) return { kind: 'ok', state: r.state, migrated: r.migrated };
  return { kind: 'broken', reason: `${r.reason}: ${r.detail}`, raw };
}

/** Keep a copy of a broken save under our own backup key before starting over. */
export function backupBroken(raw: string, store = storage()) {
  try { store?.setItem(BACKUP_KEY, raw); } catch { /* ignore */ }
}

export function deleteSave(store = storage()) {
  try { store?.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
