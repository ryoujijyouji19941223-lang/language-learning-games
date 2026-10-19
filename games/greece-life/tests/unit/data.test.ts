import { describe, it, expect } from 'vitest';
import { collectStrings, textProblem, checkAnswer } from '../../src/core/text';
import { NPCS } from '../../src/data/npcs';
import { SHOPS, SHOP_BY_ID } from '../../src/data/shops';
import { INGREDIENTS, FOODS, ITEM_BY_ID } from '../../src/data/items';
import { RECIPES } from '../../src/data/recipes';
import { FURNITURE, FURNITURE_BY_ID } from '../../src/data/furniture';
import { CLOTHES, CLOTHES_BY_ID } from '../../src/data/clothes';
import { HOMES } from '../../src/data/homes';
import { ROADS, ZONES, SPECIAL_LOTS } from '../../src/data/town';
import * as jobs from '../../src/data/jobs';
import * as phrases from '../../src/data/phrases';
import * as deliveries from '../../src/data/deliveries';

const ALL_DATA = { NPCS, SHOPS, INGREDIENTS, FOODS, RECIPES, FURNITURE, CLOTHES, HOMES, ROADS, jobs, phrases, deliveries };

describe('text rules (SPEC §16)', () => {
  it('every data string is NFC, without U+1F00–U+1FFF and U+037E', () => {
    const bad = collectStrings(ALL_DATA).filter((s) => textProblem(s.value));
    expect(bad).toEqual([]);
  });
  it('Greek question mark is the ordinary ";"', () => {
    expect(NPCS.find((n) => n.id === 'g13')!.topic.el.endsWith(';')).toBe(true);
    expect(textProblem('Τι κάνεις;')).not.toBeNull();
    expect(textProblem('ά'.normalize('NFD'))).not.toBeNull();
    expect(textProblem('ά')).not.toBeNull();
  });
  it('typed answers: accents may be assisted, final sigma is handled', () => {
    expect(checkAnswer('Ευχαριστώ', 'Ευχαριστώ')).toBe('exact');
    expect(checkAnswer('ευχαριστω', 'Ευχαριστώ')).toBe('accents');
    expect(checkAnswer('καλος', 'καλός')).toBe('accents');
    expect(checkAnswer('καλημερα', 'Ευχαριστώ')).toBe('wrong');
  });
});

describe('content counts (CONTENT_PLAN)', () => {
  it('72 residents with unique ids, a topic, 2–3 replies and a reaction each', () => {
    expect(NPCS).toHaveLength(72);
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(72);
    for (const n of NPCS) {
      expect(n.replies.length).toBeGreaterThanOrEqual(2);
      expect(n.replies.length).toBeLessThanOrEqual(3);
      for (const r of n.replies) {
        expect(r.say.el.length).toBeGreaterThan(2);
        expect(r.react.el.length).toBeGreaterThan(2);
        expect(r.react.en.length).toBeGreaterThan(2);
      }
    }
  });
  it('residents differ: no two share the same topic line, and every look string parses', () => {
    expect(new Set(NPCS.map((n) => n.topic.el)).size).toBe(72);
    for (const n of NPCS) expect(n.look.split(' ').length).toBeGreaterThanOrEqual(9);
  });
  it('every resident hang-out exists and every workplace is a shop', () => {
    for (const n of NPCS) {
      expect(ZONES[n.am], `${n.id} am ${n.am}`).toBeDefined();
      expect(ZONES[n.pm], `${n.id} pm ${n.pm}`).toBeDefined();
      if (n.night) expect(ZONES[n.night]).toBeDefined();
      if (n.work) expect(SHOP_BY_ID[n.work], n.work).toBeDefined();
    }
  });
  it('32 ingredients, 40 furniture, 20 clothes, 4 rooms, 13 recipes (12 playable)', () => {
    expect(INGREDIENTS).toHaveLength(32);
    expect(FURNITURE).toHaveLength(40);
    expect(CLOTHES).toHaveLength(20);
    expect(HOMES).toHaveLength(4);
    expect(RECIPES).toHaveLength(13);
    expect(RECIPES.filter((r) => !r.disabled)).toHaveLength(12);
  });
  it('recipes only use known ingredients or dishes; r05 uses two cooked dishes; no lettuce in r01', () => {
    for (const r of RECIPES) {
      for (const id of Object.keys(r.ingredients)) {
        const ok = ITEM_BY_ID[id] || (id.startsWith('dish:') && RECIPES.some((x) => `dish:${x.id}` === id));
        expect(ok, `${r.id} uses ${id}`).toBeTruthy();
      }
      for (const st of r.steps) if (st.pick) expect(r.ingredients[st.pick], `${r.id} step picks ${st.pick}`).toBeGreaterThan(0);
    }
    expect(Object.keys(RECIPES.find((r) => r.id === 'r05')!.ingredients)).toEqual(expect.arrayContaining(['dish:r02', 'dish:r13']));
    expect(JSON.stringify(RECIPES.find((r) => r.id === 'r01'))).not.toMatch(/μαρούλι|lettuce\b(?! in)/);
  });
  it('every ingredient can be bought somewhere; catalogs point at real things', () => {
    for (const i of INGREDIENTS) {
      expect(SHOPS.some((s) => s.catalog?.some((c) => c.kind === 'item' && c.id === i.id)), i.id).toBe(true);
    }
    for (const s of SHOPS) for (const c of s.catalog ?? []) {
      const ok = c.kind === 'item' ? ITEM_BY_ID[c.id] : c.kind === 'furniture' ? FURNITURE_BY_ID[c.id] : CLOTHES_BY_ID[c.id];
      expect(ok, `${s.id}: ${c.id}`).toBeDefined();
    }
    for (const f of FURNITURE) expect(SHOPS.some((s) => s.catalog?.some((c) => c.id === f.id)), f.id).toBe(true);
    for (const c of CLOTHES) expect(SHOP_BY_ID.agora_clothes.catalog!.some((x) => x.id === c.id)).toBe(true);
  });
  it('signs are capitals without accents (dialytika may stay)', () => {
    for (const s of SHOPS) {
      expect(s.sign, s.id).toBe(s.sign.toUpperCase());
      expect(/[ΆΈΉΊΌΎΏ]/.test(s.sign), s.id).toBe(false);
    }
  });
  it('special lots refer to existing roads, shops and homes', () => {
    for (const l of SPECIAL_LOTS) {
      if (l.road) expect(ROADS.some((r) => r.id === l.road), l.id).toBe(true);
      if (l.shop) expect(SHOP_BY_ID[l.shop], l.id).toBeDefined();
    }
  });
});
