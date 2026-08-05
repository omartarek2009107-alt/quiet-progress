/* Minimal static server, used only to test the *web* build in a live browser
   (the file:// preview renders static snapshots, which hid stale state).
   Run: node devserver.js   ->  http://127.0.0.1:8099/index.html */
"use strict";
const http = require("node:http");
const fs   = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = 8099;
const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css",
                ".svg":"image/svg+xml", ".png":"image/png", ".ico":"image/x-icon", ".json":"application/json" };

http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.normalize(path.join(ROOT, rel === "/" ? "/index.html" : rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    });
    res.end(buf);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`));
