import { test, expect } from '@playwright/test';

// Visual check of each district (screenshots only).
test('look around the town', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__greece?.ready, null, { timeout: 90_000 });
  await page.getByTestId('new').click();
  await page.getByTestId('intro-skip').click();
  await page.waitForTimeout(500);
  const spots: [string, number, number, number][] = [
    ['harbour', 175, 42, Math.PI * 0.9], ['agora', 70, 24, -Math.PI / 2], ['square', -38, -10, -Math.PI / 2],
    ['geitonia', 10, -86, Math.PI / 2], ['windmills', -170, -72, -Math.PI / 2], ['beach', -150, 10, Math.PI * 0.85], ['alley', -55, 16, -Math.PI * 0.6],
  ];
  for (const [name, x, z, yaw] of spots) {
    await page.evaluate(([x, z, yaw]) => { const g = (window as any).__greece; g.teleport('town', x, z, yaw); g.cameraYaw(yaw); }, [x, z, yaw]);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `tests/artifacts/look-${name}.png` });
  }
});

test('a resident home from outside, and a rainy winter day', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__greece?.ready, null, { timeout: 90_000 });
  await page.getByTestId('new').click();
  await page.getByTestId('intro-skip').click();
  await page.evaluate(() => {
    const gg = (window as any).__greece;
    const f = gg.npcHome('g01');
    gg.teleport('town', f.x, f.z, 0);
    gg.cameraYaw(gg.player().yaw);
  });
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('sign-card')).toContainText('Μανώλης');
  await page.screenshot({ path: 'tests/artifacts/look-resident-home.png' });
  // January of year 2 (day 245 = 1 January): find a rainy noon
  const rainy = await page.evaluate(async () => {
    const gg = (window as any).__greece;
    for (let d = 245; d < 245 + 90; d++) {
      gg.setTime(d * 1440 + 12 * 60);
      await new Promise((r) => setTimeout(r, 120));
      if ((document.querySelector('[data-testid=weather]')?.textContent ?? '').includes('Βροχή')) return d;
    }
    return -1;
  });
  expect(rainy).toBeGreaterThan(0);
  await page.evaluate(() => { const gg = (window as any).__greece; gg.teleport('town', -40, -8, Math.PI); gg.cameraYaw(Math.PI); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/artifacts/look-rain.png' });
});
