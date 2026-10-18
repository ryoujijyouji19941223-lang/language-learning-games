// `npm start`: installs dependencies on the first run, then serves the game on
// http://localhost:4175 and opens the browser. Used by start-greece.cmd as well.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!existsSync(path.join(root, 'node_modules', 'vite'))) {
  console.log('First run: installing dependencies (one time only)…');
  const result = spawnSync('npm', [existsSync(path.join(root, 'package-lock.json')) ? 'ci' : 'install'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error('Could not install dependencies. Check the internet connection and try again.');
    process.exit(result.status ?? 1);
  }
}

const { createServer } = await import('vite');
try {
  const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts') });
  await server.listen();
  console.log('\nΑσπρόγιαλος is running. Keep this window open while you play; close it to stop.');
  server.printUrls();
} catch (error) {
  if (String(error?.message ?? error).includes('4175')) {
    console.error('Port 4175 is already in use. The game may already be running in another window.');
  } else {
    console.error(error);
  }
  process.exit(1);
}
