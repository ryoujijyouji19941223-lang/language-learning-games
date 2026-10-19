// `npm run build:standalone`: builds the game and inlines the script, styles and
// fonts into dist/greece-life.html, which opens by double-click (no server).
import { build } from 'vite';
import { readFile, readdir, rm, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = path.join(root, 'dist', 'standalone-tmp');

await build({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  logLevel: 'warn',
  build: { outDir: temp, emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
});

let html = await readFile(path.join(temp, 'index.html'), 'utf8');
const assetDir = path.join(temp, 'assets');
const files = await readdir(assetDir);
for (const name of files) {
  const body = await readFile(path.join(assetDir, name), 'utf8');
  const ref = new RegExp(`<script[^>]*src="\./assets/${name.replace(/[.]/g, '\.')}"[^>]*></script>`);
  const css = new RegExp(`<link[^>]*href="\./assets/${name.replace(/[.]/g, '\.')}"[^>]*>`);
  if (name.endsWith('.js')) html = html.replace(ref, () => `<script type="module">${body.replace(/<\/script/gi, '<\/script')}</script>`);
  else if (name.endsWith('.css')) html = html.replace(css, () => `<style>${body}</style>`);
}
if (/(?:src|href)="\.\/assets\//.test(html)) throw new Error('External assets remain in the standalone HTML');

const output = path.join(root, 'dist', 'greece-life.html');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(`${output}.tmp`, html);
await rename(`${output}.tmp`, output);
await rm(temp, { recursive: true, force: true });
console.log(`Created ${path.relative(root, output)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB). Double-click it to play; no server needed.`);
