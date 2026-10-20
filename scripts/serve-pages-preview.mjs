// GitHub Pages 배포본을 로컬에서 확인하기 위한 정적 서버 (http://localhost:8090/<repo>/)
// 사용법: npm run build:pages && node scripts/serve-pages-preview.mjs
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "out");
const base = process.env.PAGES_BASE_PATH ?? "/frame-fit";
const port = Number(process.env.PORT ?? 8090);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (!url.startsWith(base)) {
    res.writeHead(302, { Location: `${base}/` }).end();
    return;
  }
  let file = normalize(join(root, url.slice(base.length)));
  if (!file.startsWith(root)) return void res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) file = join(root, "404.html");
  res.writeHead(file.endsWith("404.html") && !url.endsWith("404.html") ? 404 : 200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`GitHub Pages 미리보기: http://localhost:${port}${base}/`));
