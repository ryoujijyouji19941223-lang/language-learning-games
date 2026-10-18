// Dictionary (Λεξικό, SPEC §14): words and lines you have seen, with separate
// counts for reading, hearing (only with a real Greek voice), choosing, copying,
// recalling and accent-assisted typing.

import type { GameState, LexEntry } from './state';

export type LexKind = 'seen' | 'listened' | 'selected' | 'copied' | 'recalled' | 'assisted';

export const lexKey = (el: string) => el.normalize('NFC').trim();

/** Mutates the state directly: dictionary updates are bookkeeping, not game actions. */
export function noteWord(s: GameState, el: string, en: string, cat: string, kind: LexKind = 'seen') {
  const key = lexKey(el);
  if (!key) return;
  const e: LexEntry = s.lexicon[key] ?? { el: key, en, cat, seen: 0, listened: 0, selected: 0, copied: 0, recalled: 0, assisted: 0, fav: false };
  e[kind]++;
  if (kind !== 'seen' && e.seen === 0) e.seen = 1;
  s.lexicon[key] = e;
}

export function toggleFavourite(s: GameState, el: string) {
  const e = s.lexicon[lexKey(el)];
  if (e) e.fav = !e.fav;
}
