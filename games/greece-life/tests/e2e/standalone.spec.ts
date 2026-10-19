import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// dist/greece-life.html must work by double-click (file://, no server). Build it first: npm run build:standalone
test('the single HTML file runs from disk', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto(pathToFileURL(path.resolve('dist/greece-life.html')).href);
  await page.waitForFunction(() => (window as any).__greece?.ready, null, { timeout: 120_000 });
  await page.getByTestId('new').click();
  await page.getByTestId('intro-skip').click();
  await expect.poll(() => page.evaluate(() => (window as any).__greece.player().area)).toBe('home:h01');
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => (window as any).__greece.player().area)).toBe('town');
  const fonts = await page.evaluate(() => document.fonts.check('700 20px "Noto Sans"', 'ΦΟΥΡΝΟΣ'));
  expect(fonts).toBe(true);
  await page.screenshot({ path: 'tests/artifacts/standalone.png' });
  expect(requests.filter((u) => !u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
  expect(errors).toEqual([]);
});
