/**
 * Universal LLM Tokenizer â€” Zero-Dependency Backend
 * ---------------------------------------------------
 * Serves the vanilla frontend AND adds real backend capability
 * without a single npm package (node:http + global fetch, Node >= 18):
 *
 *   GET  /                     -> landing page
 *   GET  /app.html | /playground | /compare | /bpe | /battle | /guess | /learn
 *   GET  /api/health           -> service status JSON
 *   GET  /api/github/commits   -> cached GitHub commits proxy (beats rate limits)
 *   anything else              -> 404.html
 *
 * Run:  node server.js     (PORT=9000 node server.js to change port)
 */
"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// Pretty routes the app's History-API router understands -> serve app.html
const APP_ROUTES = new Set(["playground", "compare", "bpe", "battle", "guess", "learn"]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

// ---------------------------------------------------------------------------
// GitHub proxy with in-memory cache (kills the 60 req/hr unauthenticated pain)
// ---------------------------------------------------------------------------
const GH_CACHE_TTL_MS = 5 * 60 * 1000;
const ghCache = new Map(); // key -> { at, body }

async function ghProxy(req, res, url) {
  const perPage = Math.min(10, Math.max(1, parseInt(url.searchParams.get("per_page") || "1", 10) || 1));
  const cacheKey = "commits:" + perPage;
  const repo = "indranil122/universal-llm-tokenizer";

  const cached = ghCache.get(cacheKey);
  if (cached && Date.now() - cached.at < GH_CACHE_TTL_MS) {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "X-Cache": "HIT",
      "Cache-Control": "no-cache",
    });
    res.end(cached.body);
    log("GET /api/github/commits 200 (CACHE HIT)");
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const upstream = await fetch(
      "https://api.github.com/repos/" + repo + "/commits?per_page=" + perPage,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "universal-llm-tokenizer-backend",
          "Accept": "application/vnd.github+json",
          ...(process.env.GITHUB_TOKEN ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN } : {}),
        },
      }
    );
    clearTimeout(timeout);
    const body = await upstream.text();
    if (!upstream.ok) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "GitHub responded " + upstream.status, status: upstream.status }));
      log("GET /api/github/commits 502 (upstream " + upstream.status + ")");
      return;
    }
    ghCache.set(cacheKey, { at: Date.now(), body });
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "X-Cache": "MISS",
      "Cache-Control": "no-cache",
    });
    res.end(body);
    log("GET /api/github/commits 200 (FRESH)");
  } catch (err) {
    clearTimeout(timeout);
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "GitHub unreachable", detail: String((err && err.message) || err) }));
    log("GET /api/github/commits 502 (unreachable)");
  }
}

// ---------------------------------------------------------------------------
// Static files (with traversal protection)
// ---------------------------------------------------------------------------
function sendFile(res, absPath, status) {
  status = status || 200;
  fs.readFile(absPath)
    .then(function (data) {
      const ext = path.extname(absPath).toLowerCase();
      const isHtml = ext === ".html";
      res.writeHead(status, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": isHtml ? "no-cache" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
      log("GET " + (status === 200 ? path.basename(absPath) : "(pretty route)") + " " + status);
    })
    .catch(function () {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 // INTERNAL READ ERROR");
      log("GET (read error) 500");
    });
}

function serveNotFound(res) {
  sendFile(res, path.join(ROOT, "404.html"), 404);
}

async function handleStatic(req, res, pathname) {
  // Pretty app routes -> app.html (mirrors the GitHub Pages 404.html fallback)
  const seg = pathname.replace(/^\/+|\/+$/g, "");
  if (seg && !path.extname(seg) && APP_ROUTES.has(seg)) {
    sendFile(res, path.join(ROOT, "app.html"));
    return;
  }

  let rel = decodeURIComponent(pathname);
  if (rel === "/" || rel === "") rel = "/index.html";

  const abs = path.normalize(path.join(ROOT, rel));
  // Traversal guard: resolved path must stay inside ROOT
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 // FORBIDDEN");
    log("GET (traversal blocked) 403");
    return;
  }

  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    serveNotFound(res);
    return;
  }
  if (stat.isDirectory()) {
    sendFile(res, path.join(abs, "index.html"));
    return;
  }
  sendFile(res, abs);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log("[SYS " + ts + "] " + msg);
}

const server = http.createServer(async function (req, res) {
  // Method guard first: this is a read-only service (GET/HEAD only)
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("405 // METHOD NOT ALLOWED");
    log("METHOD " + req.method + " (rejected) 405");
    return;
  }

  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const p = url.pathname;

  if (p === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ok: true,
      service: "universal-llm-tokenizer",
      mode: "backend+frontend",
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
    }));
    log("GET /api/health 200");
    return;
  }

  if (p === "/api/github/commits") {
    await ghProxy(req, res, url);
    return;
  }

  if (p.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "unknown API route" }));
    log("GET " + p + " 404");
    return;
  }

  await handleStatic(req, res, p);
});

server.listen(PORT, HOST, function () {
  console.log("==============================================");
  console.log("  UNIVERSAL LLM TOKENIZER // BACKEND ONLINE");
  console.log("  http://localhost:" + PORT);
  console.log("  API  /api/health  /api/github/commits");
  console.log("  0 DEPENDENCIES // NODE " + process.version);
  console.log("==============================================");
});
