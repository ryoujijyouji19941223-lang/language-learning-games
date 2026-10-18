import { defineConfig } from 'vitest/config';

// Port 4175 is fixed (SPEC §3). `npm start` opens the browser; tests set BROWSER=none.
export default defineConfig({
  base: './',
  server: { port: 4175, strictPort: true, open: true },
  preview: { port: 4175, strictPort: true },
  build: { outDir: 'dist/app', emptyOutDir: true, target: 'es2022', modulePreload: false },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
