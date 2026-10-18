import { defineConfig, devices } from '@playwright/test';

// Runs against the same server as `npm start` (port 4175), without opening a browser window.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4175',
    viewport: { width: 1280, height: 760 },
    actionTimeout: 20_000,
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'node scripts/start.mjs',
    url: 'http://localhost:4175',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { BROWSER: 'none' },
  },
});
