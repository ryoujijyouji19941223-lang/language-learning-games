// この作品の名前付きES modulesを、外部通信不要の単一HTMLへまとめる。
// 汎用バンドラーではない。未対応のimport/exportは黙って通さずエラーにする。
import { readFile, readdir, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const assets = {};
for (const name of (await readdir(path.join(root, "assets"))).sort()) {
  if (!name.endsWith(".svg")) continue;
  assets[`assets/${name}`] = `data:image/svg+xml;base64,${(await readFile(path.join(root, "assets", name))).toString("base64")}`;
}
function embedImages(source) {
  return source.replace(/assets\/[\w-]+\.svg/gu, name => {
    if (!assets[name]) throw new Error(`Missing image: ${name}`);
    return assets[name];
  });
}
const compiled = [];
const visited = new Set();
async function bundle(name) {
  if (visited.has(name)) return;
  if (!/^src\/[\w-]+\.js$/u.test(name)) throw new Error(`Unsupported module: ${name}`);
  visited.add(name);
  let source = await readFile(path.join(root, name), "utf8");
  const imports = [...source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?/gmu)];
  for (const [statement, bindings, relative] of imports) {
    const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(name), relative));
    await bundle(dependency);
    source = source.replace(statement, `const { ${bindings.replace(/\s+as\s+/gu, ": ")} } = modules[${JSON.stringify(dependency)}];`);
  }
  const names = [];
  source = source.replace(/^export\s+(const|function|class)\s+([\w$]+)/gmu, (_, kind, name) => {
    names.push(name);
    return `${kind} ${name}`;
  });
  if (/^(?:import|export)\s/gmu.test(source)) throw new Error(`Unsupported syntax in ${name}`);
  if (name === "src/data.js") source += '\nfor (const item of items) item.imageVariants = item.imageVariants.map(name => assets[name]);';
  compiled.push(`modules[${JSON.stringify(name)}] = (() => {\n${embedImages(source)}\nreturn { ${names.join(", ")} };\n})();`);
}
await bundle("src/app.js");
const script = `(() => {\n"use strict";\nconst assets = ${JSON.stringify(assets)};\nconst modules = {};\n${compiled.join("\n")}\n})();`;
const css = await readFile(path.join(root, "style.css"), "utf8");
let html = await readFile(path.join(root, "index.html"), "utf8");
html = html.replace(/<link\b[^>]*href="style\.css"[^>]*>/u, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script\b[^>]*src="src\/app\.js"[^>]*>\s*<\/script>/u, "");
html = embedImages(html);
html = html.replace("</body>", () => `<script>\n${script.replace(/<\/script/giu, "\\x3c/script")}\n</script>\n</body>`);
if (/\b(?:src|href)="(?:src|assets)\//u.test(html) || html.includes('type="module"')) throw new Error("External resources remain");
const output = path.join(root, "dist", "english-errands.html");
await mkdir(path.dirname(output), { recursive: true });
const temporary = `${output}.${process.pid}.tmp`;
await writeFile(temporary, html);
await rename(temporary, output);
console.log(`Created ${output} (${Buffer.byteLength(html)} bytes). Open this file in a browser; no server needed.`);
