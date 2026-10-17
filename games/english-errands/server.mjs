import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
createServer(async (req, res) => {
  try {
    const name =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\//u,
        "",
      ) || "index.html";
    // ソースと作品の画像以外を公開しない。パストラバーサルも拒否する。
    if (
      !["index.html", "style.css"].includes(name) &&
      !/^(src|assets)\/[\w/-]+\.(js|svg)$/u.test(name)
    )
      throw new Error("not found");
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep)) throw new Error("not found");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)],
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, host, () =>
  console.log(`English Errands running on ${host}:${port}`),
);
