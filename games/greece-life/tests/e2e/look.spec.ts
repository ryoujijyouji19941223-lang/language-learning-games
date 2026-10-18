import { test } from '@playwright/test';

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
