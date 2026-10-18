// Home cooking (SPEC §12): ingredients are reserved when you start and only
// consumed — together with adding the dish and the time — when you finish.
// Cancelling or failing a step never loses ingredients.

import { RECIPE_BY_ID, dishId } from '../data/recipes';
import { ITEM_BY_ID } from '../data/items';
import { advance } from './time';
import { hasGrill, isInsideHome } from './housing';
import { tx, fail, addInventory, logEvent, type GameState } from './state';

export function missingFor(s: GameState, recipeId: string): { id: string; need: number; have: number }[] {
  const r = RECIPE_BY_ID[recipeId];
  return Object.entries(r.ingredients)
    .map(([id, need]) => ({ id, need, have: s.inventory[id] ?? 0 }))
    .filter((x) => x.have < x.need);
}

export function startCooking(state: GameState, recipeId: string) {
  return tx(state, (s) => {
    const r = RECIPE_BY_ID[recipeId];
    if (!r) fail('Δεν υπάρχει τέτοια συνταγή.', 'No such recipe.');
    if (r.disabled) fail(r.disabled.el, r.disabled.en);
    if (!isInsideHome(s)) fail('Μαγειρεύεις στην κουζίνα του σπιτιού σου.', 'You cook in your own kitchen.');
    if (s.cooking) fail('Μαγειρεύεις ήδη κάτι.', 'You are already cooking something.');
    if (r.needsGrill && !hasGrill(s)) fail('Χρειάζεσαι ψησταριά στο μπαλκόνι ή στην αυλή.', 'You need a charcoal grill (ψησταριά) on your balcony or courtyard.');
    const missing = missingFor(s, recipeId);
    if (missing.length) {
      const list = missing.map((m) => `${ITEM_BY_ID[m.id]?.el ?? RECIPE_BY_ID[m.id.replace('dish:', '')]?.el ?? m.id} ${m.have}/${m.need}`).join(', ');
      fail(`Λείπουν υλικά: ${list}`, `Missing ingredients: ${list}`);
    }
    s.cooking = { recipeId, step: 0, startedAt: s.time, reserved: { ...r.ingredients } };
  });
}

export function nextStep(state: GameState) {
  return tx(state, (s) => {
    if (!s.cooking) fail('Δεν μαγειρεύεις τίποτα.', 'Nothing is cooking.');
    const r = RECIPE_BY_ID[s.cooking!.recipeId];
    if (s.cooking!.step >= r.steps.length) fail('Τελείωσαν τα βήματα.', 'All steps are done.');
    s.cooking!.step++;
  });
}

export function finishCooking(state: GameState) {
  return tx(state, (s) => {
    const c = s.cooking;
    if (!c) fail('Δεν μαγειρεύεις τίποτα.', 'Nothing is cooking.');
    const r = RECIPE_BY_ID[c!.recipeId];
    if (c!.step < r.steps.length) fail('Δεν τελείωσες ακόμα.', 'Not finished yet.');
    for (const [id, n] of Object.entries(c!.reserved)) {
      if ((s.inventory[id] ?? 0) < n) fail('Λείπουν υλικά.', 'Some ingredients are missing now.');
    }
    for (const [id, n] of Object.entries(c!.reserved)) addInventory(s, id, -n);
    addInventory(s, dishId(r.id), r.yield);
    s.cooking = null;
    s.stats.cooked++;
    advance(s, r.minutes);
    const msg = { el: `Έτοιμο: ${r.el} ×${r.yield}`, en: `Ready: ${r.en} ×${r.yield} (${r.minutes} min)` };
    logEvent(s, msg);
    return msg;
  });
}

export function cancelCooking(state: GameState) {
  return tx(state, (s) => {
    s.cooking = null;
    return { el: 'Το άφησες για αργότερα. Τα υλικά είναι ακόμα δικά σου.', en: 'Stopped. You still have all the ingredients.' };
  });
}
