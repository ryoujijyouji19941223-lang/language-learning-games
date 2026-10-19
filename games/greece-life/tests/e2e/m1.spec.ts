import { test, expect } from '@playwright/test';
import { boot, newGameSkipIntro, g, tp, pressE, mockSpeech, ATHINA, state } from './helpers';

// M1: walk the town, camera, input focus, signs and Greek speech (mocked).

const ROUTE: Record<string, [number, number][]> = {
  toMarket: [[30, -90], [64, -88], [92, -80], [112, -66], [116, -40], [110, -10], [100, 14], [98, 24]],
  toHarbour: [[96, 30], [105, 40], [150, 40], [200, 41]],
  toSquare: [[150, 40], [105, 40], [92, 24], [12, 24], [2, 20], [-12, 10], [-29, -6], [-38, -8]],
  toWindmills: [[-55, -22], [-61, -24], [-80, -32], [-105, -42], [-130, -52], [-152, -62], [-172, -70], [-180, -72]],
  toBeach: [[-172, -70], [-152, -62], [-155, -35], [-160, -10], [-160, 14], [-172, 20]],
  toHome: [[-160, 14], [-145, 20], [-125, 24], [-104, 27], [-80, 22], [-60, 18], [-47, 10], [-45, -1], [-40, -10], [-31, -27], [-30, -42], [-27, -56], [-24, -76], [-4, -86]],
};

test('walk: home → outside → market → harbour → square → windmills → beach → home', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);
  await newGameSkipIntro(page);
  await page.screenshot({ path: 'tests/artifacts/m1-01-home.png' });
  // leave the room through the door (real key press)
  await pressE(page);
  await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('town');
  const home = await g<any>(page, 'lot', 'h01');
  const shots: Record<string, string> = { toMarket: 'm1-02-agora', toHarbour: 'm1-03-harbour', toSquare: 'm1-04-square', toWindmills: 'm1-05-windmills', toBeach: 'm1-06-beach', toHome: 'm1-07-back-home' };
  for (const [name, pts] of Object.entries(ROUTE)) {
    const route = name === 'toHome' ? [...pts, [home.front.x, home.front.z] as [number, number]] : pts;
    const r = await g<any>(page, 'walkFast', route, true);
    expect(r.ok, `${name} blocked near ${JSON.stringify(r.at)}`).toBe(true);
    expect(await g(page, 'insideBuilding')).toBe(false);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `tests/artifacts/${shots[name]}.png` });
  }
  // the districts were recognised on the way
  const lex = (await state(page)).lexicon;
  for (const d of ['Λιμάνι', 'Αγορά', 'Χώρα', 'Γειτονιά', 'Παραλία & λόφος']) expect(lex[d], d).toBeDefined();
  // back inside through the door
  await pressE(page);
  await expect.poll(() => g(page, 'player').then((p: any) => p.area)).toBe('home:h01');
  // walking used game time (30 game s per real s of walking)
  expect((await state(page)).time).toBeGreaterThan(8 * 60 + 5);
});

test('real keyboard walking moves the player; keys do nothing while a text box or menu is open', async ({ page }) => {
  await boot(page);
  await newGameSkipIntro(page);
  await tp(page, 'town', 50, 24, -Math.PI / 2);
  await g(page, 'cameraYaw', -Math.PI / 2);
  const a = await g<any>(page, 'player');
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  const b = await g<any>(page, 'player');
  expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0.3);
  // dictionary search box focused: W types, the player stays
  await page.keyboard.press('l');
  await page.getByTestId('lex-search').focus();
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  expect(await page.getByTestId('lex-search').inputValue()).toContain('w');
  const c = await g<any>(page, 'player');
  expect(Math.hypot(c.x - b.x, c.z - b.z)).toBeLessThan(0.01);
  // a menu open (map): no movement and the clock is stopped
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.keyboard.press('m');
  const t0 = (await state(page)).time;
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  const d = await g<any>(page, 'player');
  expect(Math.hypot(d.x - c.x, d.z - c.z)).toBeLessThan(0.01);
  expect((await state(page)).time).toBe(t0);
  await page.screenshot({ path: 'tests/artifacts/m1-08-map.png' });
});

test('camera never stays inside buildings or people', async ({ page }) => {
  await boot(page);
  await newGameSkipIntro(page);
  const spots: [number, number][] = [[-55, 16], [-52, 13.5], [40, 24], [0, -86], [-30, -42], [200, 40], [-45, -6]];
  for (const [x, z] of spots) {
    await tp(page, 'town', x, z, 0);
    for (let k = 0; k < 8; k++) {
      await g(page, 'cameraYaw', (k / 8) * Math.PI * 2);
      await page.waitForTimeout(250);
      expect(await g(page, 'cameraInside'), `camera inside at ${x},${z} yaw ${k}`).toBe(false);
    }
  }
  await page.screenshot({ path: 'tests/artifacts/m1-09-alley-camera.png' });
});

test('signs show English and play Greek with the chosen voice (mocked Athina)', async ({ page }) => {
  await mockSpeech(page, [ATHINA, { name: 'Microsoft Stefanos - Greek', lang: 'el-GR' }, { name: 'Google US English', lang: 'en-US' }]);
  await boot(page);
  await newGameSkipIntro(page);
  const bakery = await g<any>(page, 'lot', 'agora_bakery');
  await tp(page, 'town', bakery.front.x, bakery.front.z + 1.5, Math.PI);
  await expect(page.getByTestId('sign-card')).toContainText('ΦΟΥΡΝΟΣ');
  await expect(page.getByTestId('sign-card')).toContainText('bakery');
  await page.getByTestId('sign-play').click();
  const spoken = await page.evaluate(() => (window as any).__spoken);
  expect(spoken.at(-1)).toMatchObject({ text: 'Φούρνος «Το Προζύμι»', lang: 'el-GR', voice: ATHINA.name });
  // first line of a resident
  const spot = await g<any>(page, 'npcSpot', 'g48');
  await tp(page, spot.area, spot.x + 1.0, spot.z, -Math.PI / 2);
  await pressE(page);
  await page.locator('[data-panel=talk] [data-testid=play]').first().click();
  const spoken2 = await page.evaluate(() => (window as any).__spoken);
  expect(spoken2.at(-1).lang).toBe('el-GR');
  await page.screenshot({ path: 'tests/artifacts/m1-10-sign-and-talk.png' });
  // settings show the voice in use
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('voice-current')).toContainText('Athina');
  expect((await state(page)).lexicon['Φούρνος «Το Προζύμι»'].listened).toBeGreaterThan(0);
});

test('without a Greek voice: English help, game continues, nothing counted as heard', async ({ page }) => {
  await mockSpeech(page, [{ name: 'Google US English', lang: 'en-US' }]);
  await boot(page);
  await expect(page.getByTestId('title-voice')).toContainText('No Greek voice');
  await newGameSkipIntro(page);
  const bakery = await g<any>(page, 'lot', 'agora_bakery');
  await tp(page, 'town', bakery.front.x, bakery.front.z + 1.5, Math.PI);
  await page.getByTestId('sign-play').click();
  await expect(page.locator('.toast.error')).toContainText('Add voices');
  expect(await page.evaluate(() => (window as any).__spoken.length)).toBe(0);
  const s = await state(page);
  expect(s.lexicon['Φούρνος «Το Προζύμι»'].listened).toBe(0);
  expect(s.stats.noVoicePlays).toBeGreaterThan(0);
  await page.screenshot({ path: 'tests/artifacts/m1-11-no-voice.png' });
});
