/* Wraps app.html (the shared source) into a standalone index.html.
   Runs automatically before `npm start`, `npm run make` and `npm run package`,
   so the desktop build can never ship a stale renderer.

   Cross-platform replacement for the PowerShell wrapper; both emit the same file. */
"use strict";

const fs   = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SRC  = path.join(ROOT, "app.html");
const OUT  = path.join(ROOT, "index.html");

const HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="description" content="Offline habit and study tracker. Everything stays on this device."/>
<link rel="icon" type="image/svg+xml" href="assets/icon.svg"/>
<link rel="icon" type="image/png" sizes="256x256" href="assets/icon.png"/>
</head>
<body>
<!-- Generated from app.html by desktop/build-index.js — edit app.html, not this file. -->
`;

const FOOT = "\n</body>\n</html>\n";

if (!fs.existsSync(SRC)) {
  console.error(`build-index: cannot find ${SRC}`);
  process.exit(1);
}

const html = HEAD + "\n" + fs.readFileSync(SRC, "utf8") + FOOT;
fs.writeFileSync(OUT, html, "utf8");

console.log(`build-index: wrote index.html (${Buffer.byteLength(html, "utf8").toLocaleString()} bytes)`);
