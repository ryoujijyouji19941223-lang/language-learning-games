import { test } from '@playwright/test';
import { boot, newGameSkipIntro, g, tp } from './helpers';

// Screenshots of the town on its hill and the windmill cliff (visual check only).
test('town on the hillside and the windmill cliff', async ({ page }) => {
  await boot(page);
  await newGameSkipIntro(page);
  await g(page, 'setTime', 10 * 60);
  const views: [string, number, number, number, number, number][] = [
    // name, x, z, camera yaw (look direction), pitch, distance
    ['harbour-up-to-chora', 150, 42, -Math.PI / 2 - 0.25, 0.32, 11],
    ['market-street-steps', 60, 24, -Math.PI / 2, 0.3, 7],
    ['square-down-to-harbour', -32, -8, Math.PI / 2 + 0.25, 0.35, 9],
    ['church-street-stairs', -5, 15, -Math.PI * 0.75, 0.35, 7],
    ['neighbourhood-slope', 40, -88, Math.PI / 2 + 0.4, 0.35, 9],
    ['windmills-cliff', -205, -78, -Math.PI / 2 - 0.15, 0.3, 10],
    ['cliff-from-beach', -200, 20, -Math.PI * 0.82, 0.25, 9],
    ['chapel-and-lighthouse', -212, -55, -Math.PI * 0.6, 0.3, 9],
    ['west-cliff-from-beach-end', -226, 22, Math.PI + 0.35, 0.18, 10],
    ['windmills-by-the-wall', -228, -78, Math.PI / 2 + 0.6, 0.3, 9],
  ];
  for (const [name, x, z, yaw, pitch, dist] of views) {
    await tp(page, 'town', x, z, yaw);
    await g(page, 'cameraView', yaw, pitch, dist);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `tests/artifacts/terrain-${name}.png` });
  }
});
