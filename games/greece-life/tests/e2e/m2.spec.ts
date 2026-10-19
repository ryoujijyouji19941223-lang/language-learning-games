import { test, expect, type Page } from '@playwright/test';
import { boot, g, tp, pressE, standAt, state, mockSpeech, ATHINA } from './helpers';
import { CAFE_ORDERS, TAVERNA_ORDERS } from '../../src/data/jobs';
import { NPCS } from '../../src/data/npcs';

// M2: one full day of life, following CLAUDE_TASKS.md §4 "一巡の合格条件".

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/artifacts/m2-${name}.png` });
const minuteOf = (h: number, m = 0) => h * 60 + m; // day 0 = Friday 1 May

async function buy(page: Page, shopLot: string, lines: Record<string, number>, inside = false) {
  const lot = await g<any>(page, 'lot', shopLot);
  await tp(page, 'town', lot.front.x, lot.front.z, lot.rot + Math.PI);
  await pressE(page);
  if (inside) {
    await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe(`int:${shopLot}`);
    await standAt(page, 'counter', shopLot);
    await pressE(page);
  }
  const panel = page.locator('[data-panel=shop]');
  await expect(panel).toBeVisible();
  await panel.getByTestId('greet-morning').click();
  for (const [id, n] of Object.entries(lines)) for (let i = 0; i < n; i++) await panel.getByTestId(`add-${id}`).click();
  await panel.getByTestId('order').click();
  await panel.getByTestId('howmuch').click();
  await panel.getByTestId('pay').click();
  await panel.getByTestId('thanks').click();
  await expect(panel).toBeHidden();
  if (inside) { await standAt(page, 'exit', shopLot); await pressE(page); }
}

test('a full day: rooms, shopping, work, deliveries, furniture, cooking, clothes, sleep, save, move', async ({ page }) => {
  test.setTimeout(1_500_000);
  await mockSpeech(page, [ATHINA]);
  await boot(page);
  await page.getByTestId('new').click();

  // 1. view all four rooms, then rent h02 (balcony)
  await page.getByTestId('intro-rooms').click();
  for (const id of ['h01', 'h02', 'h03', 'h04']) {
    await page.getByTestId(`view-${id}`).click();
    await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe(`home:${id}`);
    await expect(page.getByTestId('banner')).toBeVisible();
    await shot(page, `01-view-${id}`);
    await pressE(page); // leave by the door
    await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('town');
    await expect(page.locator('[data-panel=rental]')).toBeVisible();
  }
  expect((await state(page)).viewed.sort()).toEqual(['h01', 'h02', 'h03', 'h04']);
  await page.getByTestId('take-h02').click();
  await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('home:h02');
  let s = await state(page);
  expect(s.home).toBe('h02');
  expect(s.money).toBe(15000);

  // 2. shopping with the greeting → order → price → pay → thanks flow
  await g(page, 'setTime', minuteOf(10));
  await buy(page, 'agora_greengrocer', { tomato: 2, cucumber: 1, onion: 1, green_pepper: 1, olives: 1, potato: 2 });
  await buy(page, 'agora_cheese', { feta: 1 });
  await buy(page, 'agora_florist', { f21: 1, f39: 1 });
  await buy(page, 'agora_furniture', { f28: 1 }, true);
  s = await state(page);
  expect(s.inventory.tomato).toBe(2);
  expect(s.inventory.feta).toBe(1);
  expect(s.furniture.filter((f: any) => ['f21', 'f39', 'f28'].includes(f.id))).toHaveLength(3);
  const spent = 15000 - s.money;
  expect(spent).toBe(120 + 50 + 30 + 40 + 200 + 80 + 300 + 800 + 1400 + 1800);
  // stop by and chat with someone on the way
  const spot = await g<any>(page, 'npcSpot', 'g20');
  await tp(page, spot.area, spot.x + 1, spot.z, -Math.PI / 2);
  await pressE(page);
  await page.locator('[data-panel=talk]').getByTestId('reply-0').click();
  await shot(page, '02-chat');
  await page.locator('[data-panel=talk]').getByTestId('bye').click();
  await expect(page.locator('[data-panel=talk]')).toBeHidden();

  // 3. deliveries: take two, cannot hand over before pick-up, paid once
  await page.keyboard.press('p');
  s = await state(page);
  const easy = s.deliveries.offers.filter((o: any) => ['p_depot', 'p_greengrocer', 'p_florist', 'p_home', 'p_pharmacy'].includes(o.pickup)).slice(0, 2);
  expect(easy.length).toBe(2);
  for (const o of easy) await page.getByTestId(`accept-${o.id}`).click();
  await shot(page, '03-phone-deliveries');
  await page.keyboard.press('Escape');
  for (const o of easy) {
    // at the address without the parcel: no hand-over offered
    const p0 = await destPointOf(page, o.dest);
    await tp(page, 'town', p0.x, p0.z, 0);
    expect((await g<any[]>(page, 'interactables')).some((i) => i.kind === 'dest')).toBe(false);
    // the offer is accepted but the parcel is still at the shop
    const all = await page.evaluate(() => (window as any).__greece.state().deliveries.active);
    expect(all.find((d: any) => d.id === o.id).status).toBe('accepted');
    const shopId = { p_depot: 'port_depot', p_greengrocer: 'agora_greengrocer', p_florist: 'agora_florist', p_home: 'agora_home', p_pharmacy: 'chora_pharmacy' }[o.pickup as string]!;
    const lot = await g<any>(page, 'lot', shopId);
    await tp(page, 'town', lot.front.x, lot.front.z, lot.rot + Math.PI);
    await pressE(page);
    await page.getByTestId('pickup').first().click();
    await page.keyboard.press('Escape');
    s = await state(page);
    expect(s.deliveries.active.find((d: any) => d.id === o.id).status).toBe('carrying');
    const before = s.money;
    const point = await destPointOf(page, o.dest);
    await tp(page, 'town', point.x, point.z, 0);
    const near = await g<any>(page, 'nearest');
    expect(near?.kind).toBe('dest');
    await pressE(page);
    s = await state(page);
    expect(s.money).toBe(before + o.pay);
    expect(s.deliveries.active.find((d: any) => d.id === o.id)).toBeUndefined();
    await pressE(page);
    expect((await state(page)).money).toBe(before + o.pay);
  }

  // 4. café shift: drink, sugar, here / to go; pay and time added once
  await g(page, 'setTime', minuteOf(11));
  const cafe = await g<any>(page, 'lot', 'agora_cafe');
  await tp(page, 'town', cafe.front.x, cafe.front.z, cafe.rot + Math.PI);
  await pressE(page);
  await standAt(page, 'jobStation', 'cafe');
  await pressE(page);
  await page.getByTestId('ask-yes').click();
  const job = page.locator('[data-panel=job]');
  await expect(job).toBeVisible();
  for (let i = 0; i < 4; i++) {
    s = await state(page);
    const j = s.jobs.active;
    const order = CAFE_ORDERS.find((o) => o.id === j.orders[j.index])!;
    const amended = j.amendAt === j.index;
    for (const c of order.cups) {
      await job.getByTestId(`drink-${c.drink}`).click();
      await job.getByTestId(`sugar-${amended ? 'metrio' : c.sugar}`).click();
    }
    if (order.water) await job.getByTestId('water').click();
    if (!order.where) await job.getByTestId('ask-where').click();
    await job.getByTestId(`where-${order.where ?? order.answer}`).click();
    if (i === 1) await shot(page, '04-cafe');
    await job.getByTestId('serve').click();
    await expect.poll(async () => (await state(page)).jobs.active.index).toBe(i + 1);
  }
  const beforeCafe = await state(page);
  await job.getByTestId('finish-shift').click();
  s = await state(page);
  expect(s.money).toBe(beforeCafe.money + 1800);
  // +120 game minutes once (the walking clock may add a few seconds after the panel closes)
  expect(s.time - beforeCafe.time).toBeGreaterThanOrEqual(120);
  expect(s.time - beforeCafe.time).toBeLessThan(121);
  expect(s.jobs.active).toBeNull();
  expect(s.jobs.history).toHaveLength(1);
  await standAt(page, 'exit', 'agora_cafe');
  await pressE(page);

  // 5. clothes: buy a straw hat and wear it
  await buy(page, 'agora_clothes', { c18: 1 }, true);
  await page.keyboard.press('Tab');
  await page.getByTestId('bagtab-clothes').click();
  await page.getByTestId('wear-c18').click();
  expect((await state(page)).clothes.worn.acc).toBe('c18');
  await page.keyboard.press('Escape');
  await g(page, 'cameraYaw', (await g<any>(page, 'player')).yaw + Math.PI);
  await page.waitForTimeout(600);
  await shot(page, '05-straw-hat');

  // 6. home: furniture (pot on the balcony, clock and desk, vase on the desk, rotate, store, undo)
  const h02 = await g<any>(page, 'lot', 'h02');
  await tp(page, 'town', h02.front.x, h02.front.z, h02.rot + Math.PI);
  await pressE(page);
  await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('home:h02');
  await page.getByTestId('btn-edit').click();
  const edit = page.locator('[data-panel=edit]');
  await edit.getByTestId('pick-f21').click();
  await edit.getByTestId('area-out').click();
  await edit.getByTestId('place').click();
  await edit.getByTestId('pick-f28').click();
  await page.keyboard.press('ArrowRight');
  await edit.getByTestId('place').click();
  await edit.getByTestId('move-f03').click();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
  await edit.getByTestId('place').click();
  await edit.getByTestId('pick-f39').click();
  await edit.getByTestId('place').click();
  await edit.getByTestId('move-f04').click();
  await edit.getByTestId('rotate').click();
  await edit.getByTestId('place').click();
  s = await state(page);
  const byId = (id: string) => s.furniture.find((f: any) => f.id === id);
  expect(byId('f21').place).toMatchObject({ k: 'floor', area: 'out' });
  expect(byId('f28').place).toEqual({ k: 'wall', wall: 'n', c: 4, row: 2 });
  expect(byId('f03').place).toMatchObject({ k: 'floor', x: 4, z: 0 });
  expect(byId('f39').place).toMatchObject({ k: 'anchor', host: byId('f03').uid });
  expect(byId('f04').place.r).toBe(1);
  await shot(page, '06-arranged');
  await edit.getByTestId('store-f04').click();
  expect((await state(page)).furniture.find((f: any) => f.id === 'f04').place).toBeNull();
  await edit.getByTestId('undo').click();
  expect((await state(page)).furniture.find((f: any) => f.id === 'f04').place).not.toBeNull();
  await page.keyboard.press('Escape');
  // the clock is still on the wall after the desk moved under it
  expect((await state(page)).furniture.find((f: any) => f.id === 'f28').place).not.toBeNull();

  // 7. cooking: village salad and fried potatoes; missing ingredients block a recipe
  await standAt(page, 'kitchen', 'h02');
  await pressE(page);
  const k = page.locator('[data-panel=kitchen]');
  await expect(k.getByTestId('cook-r02')).toBeDisabled();
  await k.getByTestId('cook-r01').click();
  for (let i = 0; i < 4; i++) await k.getByTestId('step-action').click();
  for (const id of ['olives', 'feta', 'oregano', 'olive_oil']) await k.getByTestId(`pick-${id}`).click();
  await k.getByTestId('cook-finish').click();
  await expect(k.getByTestId('cook-r13')).toBeVisible({ timeout: 5000 });
  await k.getByTestId('cook-r13').click();
  for (let i = 0; i < 4; i++) await k.getByTestId('step-action').click();
  const hold = k.getByTestId('step-hold');
  await hold.hover();
  await page.mouse.down();
  await page.waitForTimeout(1700);
  await page.mouse.up();
  await k.getByTestId('pick-salt').click();
  await shot(page, '07-cooking');
  await k.getByTestId('cook-finish').click();
  s = await state(page);
  expect(s.inventory['dish:r01']).toBe(2);
  expect(s.inventory['dish:r13']).toBe(2);
  expect(s.inventory.tomato).toBeUndefined();
  await page.keyboard.press('Escape');

  // eat once: full until the next day/night switch
  await page.keyboard.press('Tab');
  await page.getByTestId('eat-dish:r01').click();
  await expect(page.getByTestId('eat-dish:r13')).toBeDisabled();
  await page.keyboard.press('Escape');

  // 8. evening taverna shift: water and bread first, then the dishes
  await g(page, 'setTime', minuteOf(19, 30));
  const tav = await g<any>(page, 'lot', 'port_taverna');
  await tp(page, 'town', tav.front.x, tav.front.z, tav.rot + Math.PI);
  await pressE(page);
  await standAt(page, 'jobStation', 'taverna');
  await pressE(page);
  await page.getByTestId('ask-yes').click();
  s = await state(page);
  for (let i = 0; i < s.jobs.active.tables.length; i++) {
    await job.getByTestId(`water-${i}`).click();
    await job.getByTestId(`kitchen-${i}`).click();
    const order = TAVERNA_ORDERS.find((o) => o.id === s.jobs.active.tables[i].order)!;
    for (const [dish, n] of Object.entries(order.dishes)) for (let c = 0; c < n; c++) await job.getByTestId(`dish-${dish}`).click();
    if (i === 0) await shot(page, '08-taverna');
    await job.getByTestId(`serve-${i}`).click();
  }
  const beforeTav = await state(page);
  await job.getByTestId('finish-shift').click();
  expect((await state(page)).money).toBe(beforeTav.money + 2800);
  await standAt(page, 'exit', 'port_taverna');
  await pressE(page);

  // 9. sleep until the morning (saves)
  await tp(page, 'town', h02.front.x, h02.front.z, h02.rot + Math.PI);
  await pressE(page);
  await standAt(page, 'bed', (await state(page)).furniture.find((f: any) => f.id === 'f01').uid);
  await pressE(page);
  await page.getByTestId('ask-yes').click();
  s = await state(page);
  expect(Math.floor(s.time) % 1440).toBe(8 * 60); // a few game seconds may tick after the panel closes
  expect(Math.floor(s.time / 1440)).toBe(1);

  // 10. reload and continue: everything is back
  await page.reload();
  await page.waitForFunction(() => (window as any).__greece?.ready, null, { timeout: 120_000 });
  await page.getByTestId('continue').click();
  const back = await state(page);
  for (const key of ['home', 'money', 'inventory', 'clothes', 'settings', 'deliveries', 'jobs']) expect(back[key], key).toEqual(s[key]);
  // the walking clock may run a few game seconds before the page saves on reload
  expect(Math.abs(back.time - s.time)).toBeLessThan(1);
  expect(back.furniture.map((f: any) => [f.id, f.place])).toEqual(s.furniture.map((f: any) => [f.id, f.place]));
  expect(await g<any>(page, 'player').then((p: any) => p.area)).toBe('home:h02');
  await shot(page, '09-after-reload');

  // 11. move to h03: still one home, all furniture kept (in the storage box)
  await g(page, 'setTime', back.time + 90);
  const office = await g<any>(page, 'lot', 'home_office');
  await tp(page, 'town', office.front.x, office.front.z, office.rot + Math.PI);
  await pressE(page);
  await page.getByTestId('take-h03').click();
  await page.getByTestId('ask-yes').click();
  await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('home:h03');
  const moved = await state(page);
  expect(moved.home).toBe('h03');
  expect(moved.furniture).toHaveLength(back.furniture.length);
  expect(moved.furniture.every((f: any) => f.place === null)).toBe(true);
  expect(moved.money).toBe(back.money - 2000);
});


test('all 72 residents can be met and answered ', async ({ page }) => {
  test.setTimeout(900_000);
  await mockSpeech(page, [ATHINA]);
  await boot(page);
  await page.getByTestId('new').click();
  await page.getByTestId('intro-skip').click();
  await g(page, 'setTime', minuteOf(11));

  for (const n of NPCS) {
    const sp = await g<any>(page, 'npcSpot', n.id);
    // approach from the front first, then from the other sides
    let near: any = null;
    for (const a of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const yaw = sp.yaw + a;
      await tp(page, sp.area, sp.x + Math.sin(yaw) * 0.95, sp.z + Math.cos(yaw) * 0.95, yaw + Math.PI);
      near = await g<any>(page, 'nearest');
      if (near?.kind === 'npc' && near.ref === n.id) break;
    }
    expect(near?.ref, `${n.id} ${n.name}`).toBe(n.id);
    await pressE(page);
    const talk = page.locator('[data-panel=talk]');
    await expect(talk).toContainText(n.name);
    const reply = talk.getByTestId('reply-1');
    if (await reply.count()) await reply.click();
    await talk.getByTestId('bye').click();
    await expect(talk).toBeHidden();
  }
  const met = await state(page);
  expect(NPCS.filter((n) => (met.npcs[n.id]?.talks ?? 0) > 0)).toHaveLength(72);
  await shot(page, '10-people');
});

async function destPointOf(page: Page, destId: string) {
  const list = await g<any[]>(page, 'allDest');
  return list.find((d: any) => d.ref === destId);
}
