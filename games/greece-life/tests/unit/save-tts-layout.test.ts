import { describe, it, expect } from 'vitest';
import { serialize, parse, writeSave, readSave, SAVE_KEY, type Store } from '../../src/core/save';
import { newGame } from '../../src/core/state';
import { checkout } from '../../src/core/shop';
import { Speech, pickGreekVoice, type VoiceLike } from '../../src/tts';
import { getLayout } from '../../src/world/layout';
import { NPCS } from '../../src/data/npcs';
import { SHOPS } from '../../src/data/shops';
import { pointInShape, distanceToPolyline, heightAt, isWalkableGround } from '../../src/core/geo';
import { destPoint, pickupPoint } from '../../src/core/delivery';
import { DESTINATIONS, PICKUPS } from '../../src/data/deliveries';
import { must, withHome } from './helpers';

class MemoryStore implements Store {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

describe('save & restore (SPEC §17)', () => {
  it('round-trips home, furniture, bag, money, time, jobs and settings', () => {
    let s = withHome('h02');
    s = must(checkout(s, 'agora_greengrocer', [{ kind: 'item', id: 'lemon', qty: 3 }])).state;
    s.settings.rate = 0.8;
    s.settings.voiceURI = 'Microsoft Athina';
    s.time += 777;
    const store = new MemoryStore();
    expect(writeSave(s, store).ok).toBe(true);
    expect([...store.data.keys()]).toEqual([SAVE_KEY]);
    const back = readSave(store);
    expect(back.kind).toBe('ok');
    if (back.kind !== 'ok') return;
    expect(back.state).toEqual(s);
  });
  it('broken JSON or wrong values are reported, not loaded', () => {
    expect(parse('{oops').ok).toBe(false);
    expect(parse(JSON.stringify({ format: 'something-else', state: {} })).ok).toBe(false);
    const bad = JSON.parse(serialize(newGame()));
    bad.state.money = 'lots';
    const r = parse(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toContain('money');
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, '{"format":"greece-life-save","version":1,"state":{"time":-5}}');
    expect(readSave(store).kind).toBe('broken');
  });
  it('migrates a version 0 save (money in euros, flat clothes list)', () => {
    const v1 = newGame();
    const old = { ...v1, version: 0, money: 42.5, worn: ['c02', 'c08', 'c14'] } as Record<string, unknown>;
    delete old.clothes;
    const r = parse(JSON.stringify({ format: 'greece-life-save', version: 0, state: old }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.migrated).toBe(true);
    expect(r.state.money).toBe(4250);
    expect(r.state.clothes.worn).toEqual({ top: 'c02', bottom: 'c08', shoes: 'c14', acc: null });
  });
  it('a failing storage is reported and does not throw', () => {
    const store: Store = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem: () => {} };
    expect(writeSave(newGame(), store)).toMatchObject({ ok: false });
  });
});

describe('Greek voice selection (SPEC §15, mocked)', () => {
  const v = (name: string, lang: string): VoiceLike => ({ name, lang, voiceURI: name });
  it('prefers Athina → Nestoras → Stefanos, else the first el voice', () => {
    expect(pickGreekVoice([v('Microsoft Stefanos', 'el-GR'), v('Microsoft Nestoras Online (Natural)', 'el-GR'), v('Microsoft Athina Online (Natural)', 'el-GR')])!.name).toMatch(/Athina/);
    expect(pickGreekVoice([v('Microsoft Stefanos', 'el-GR'), v('Microsoft Nestoras Online', 'el_GR')])!.name).toMatch(/Nestoras/);
    expect(pickGreekVoice([v('Google UK English', 'en-GB'), v('Some voice', 'el-GR')])!.name).toBe('Some voice');
    expect(pickGreekVoice([v('Google UK English', 'en-GB')])).toBeNull();
  });
  it('speaks with lang set, cancels the previous line, and reports a missing Greek voice', () => {
    const spoken: { text: string; lang: string; rate: number }[] = [];
    let cancels = 0;
    class U { voice: unknown = null; lang = ''; rate = 1; onend: unknown = null; constructor(public text: string) {} }
    const synth = {
      voices: [v('Microsoft Athina Online (Natural)', 'el-GR')],
      getVoices() { return this.voices; },
      speak(u: U) { spoken.push({ text: u.text, lang: u.lang, rate: u.rate }); },
      cancel() { cancels++; },
    };
    const sp = new Speech(synth, U as never);
    expect(sp.speak('Καλημέρα!', { rate: 0.8 })).toEqual({ ok: true, voice: 'Microsoft Athina Online (Natural)' });
    expect(spoken[0]).toEqual({ text: 'Καλημέρα!', lang: 'el-GR', rate: 0.8 });
    expect(cancels).toBe(1);
    synth.voices = [v('Google US English', 'en-US')];
    sp.voices = [];
    expect(sp.speak('Καλημέρα!')).toEqual({ ok: false, reason: 'no-greek-voice' });
    expect(new Speech(null, null).speak('Γεια')).toEqual({ ok: false, reason: 'unsupported' });
    expect(sp.speak('Γεια', { enabled: false })).toEqual({ ok: false, reason: 'off' });
  });
});

describe('town layout', () => {
  const lay = getLayout();
  it('every shop with an address has a lot, and every door front is outside all buildings', () => {
    for (const shop of SHOPS) {
      if (['agora_laiki', 'chora_church', 'beach_kantina', 'hill_windmill', 'hill_chapel', 'port_kiosk'].includes(shop.id)) continue;
      const lot = lay.lots.find((l) => l.shop === shop.id);
      expect(lot, shop.id).toBeDefined();
    }
    const boxes = lay.lots.map((l) => ({ kind: 'box' as const, x: l.x, z: l.z, hw: l.w / 2, hd: l.d / 2, rot: l.rot, top: 10 }));
    for (const l of lay.lots.filter((x) => x.kind !== 'house')) {
      expect(boxes.some((b) => pointInShape(b, l.front.x, l.front.z)), l.id).toBe(false);
      expect(isWalkableGround(l.front.x, l.front.z), l.id).toBe(true);
    }
  });
  it('no building stands on a road', () => {
    for (const l of lay.lots) {
      for (const rd of lay.roads) {
        expect(distanceToPolyline(l.x, l.z, rd.pts), `${l.id} on ${rd.id}`).toBeGreaterThan(rd.width / 2 + 0.5);
      }
    }
  });
  it('all 72 residents have a home with a street address', () => {
    for (const n of NPCS) {
      const h = lay.npcHome[n.id];
      expect(h, n.id).toBeDefined();
      expect(h.addressNo, n.id).toBeGreaterThan(0);
    }
    expect(new Set(Object.values(lay.npcHome).map((l) => l.id)).size).toBe(72);
  });
  it('delivery points are on walkable ground', () => {
    for (const d of DESTINATIONS) {
      const p = destPoint(d.id);
      expect(isWalkableGround(p.x, p.z), d.id).toBe(true);
    }
    for (const p of PICKUPS) expect(heightAt(pickupPoint(p.id).x, pickupPoint(p.id).z)).toBeGreaterThan(0);
  });
  it('the town is dense enough to read as a town', () => {
    expect(lay.lots.length).toBeGreaterThan(220);
  });
});
