import { test, expect } from '@playwright/test';

test('boots, shows the title and starts a new game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__greece?.ready, null, { timeout: 90_000 });
  await expect(page.getByTestId('title')).toBeVisible();
  await page.screenshot({ path: 'tests/artifacts/00-title.png' });
  await page.getByTestId('new').click();
  await expect(page.getByTestId('intro-skip')).toBeVisible();
  await page.getByTestId('intro-skip').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/artifacts/01-home.png' });
  const p = await page.evaluate(() => (window as any).__greece.player());
  console.log(JSON.stringify(p));
  expect(errors).toEqual([]);
});
