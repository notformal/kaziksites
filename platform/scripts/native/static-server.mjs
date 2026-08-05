import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.env.STATIC_ROOT || "apps/lobby/dist");
const port = Number(process.env.STATIC_PORT || 8080);
const host = process.env.STATIC_HOST || "127.0.0.1";
const role = process.env.STATIC_ROLE || "lobby";
// Когда задан — все запросы /api/* проксируются на API, как это делает nginx в
// проде. Благодаря этому сессионная cookie остаётся same-origin и SameSite=Lax работает.
const apiProxyOrigin = process.env.API_PROXY_ORIGIN || "";
const apiPrefix = process.env.API_PROXY_PREFIX || "/api";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
};

function resolveFile(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const candidate = path.resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  const index = path.join(candidate, "index.html");
  if (fs.existsSync(index)) return index;
  return path.join(root, "index.html");
}

const scriptPolicy = role === "games" ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";
const csp = [
  "default-src 'self'",
  `script-src ${scriptPolicy}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' http://127.0.0.1:*",
  "frame-src 'self' http://127.0.0.1:*",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function proxyToApi(req, res) {
  const target = new URL(req.url, apiProxyOrigin);
  const upstream = http.request(
    target,
    {
      method: req.method,
      headers: { ...req.headers, host: target.host },
    },
    (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "api_unreachable" }));
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  if (apiProxyOrigin && req.url.startsWith(`${apiPrefix}/`)) return proxyToApi(req, res);
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  const file = resolveFile(req.url);
  if (!file || !fs.existsSync(file)) {
    res.writeHead(404).end("Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const immutable = /[.-][a-f0-9]{8,}\./i.test(path.basename(file));
  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream",
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": csp,
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () =>
  console.log(
    `Static origin ${root} on http://${host}:${port}${apiProxyOrigin ? ` (proxy ${apiPrefix} → ${apiProxyOrigin})` : ""}`,
  ),
);
const stop = () => server.close(() => process.exit(0));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
