import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.browser.js",
  workers: 1,
  timeout: 300000,
  reporter: "list",
  use: {
    actionTimeout: 15000,
    baseURL: "http://127.0.0.1:4180",
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: !process.env.CI,
  },
});
