/* Builds assets/icon.ico + icon.png from assets/icon.svg.
   Rasterises through the Chromium that already ships with Electron, so the
   icon pipeline needs no image libraries at all.

   Run:  npm run build:icon        (i.e. electron assets/make-icon.js)
   Only needed after editing icon.svg — the generated files are committed. */
"use strict";

const { app, BrowserWindow } = require("electron");
const fs   = require("node:fs");
const path = require("node:path");

const ASSETS = __dirname;
const SVG    = path.join(ASSETS, "icon.svg");
const SIZES  = [16, 24, 32, 48, 64, 128, 256];

/* ── ICO container ───────────────────────────────────────────────────
   Each entry stores a whole PNG. Windows has supported PNG-compressed
   icon entries since Vista, and it keeps the 256px frame from bloating. */
function buildIco(frames){
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // 1 = icon
  header.writeUInt16LE(frames.length, 4);

  const dir = Buffer.alloc(16 * frames.length);
  let offset = header.length + dir.length;

  frames.forEach((f, i) => {
    const e = i * 16;
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, e + 0);  // 0 means 256
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, e + 1);
    dir.writeUInt8(0, e + 2);                            // palette entries
    dir.writeUInt8(0, e + 3);                            // reserved
    dir.writeUInt16LE(1,  e + 4);                        // colour planes
    dir.writeUInt16LE(32, e + 6);                        // bits per pixel
    dir.writeUInt32LE(f.png.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += f.png.length;
  });

  return Buffer.concat([header, dir, ...frames.map(f => f.png)]);
}

async function main(){
  const svg = fs.readFileSync(SVG, "utf8");
  const dataUrl = "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");

  const win = new BrowserWindow({
    show: false,
    width: 320,
    height: 320,
    webPreferences: { offscreen: false, contextIsolation: true, nodeIntegration: false }
  });
  await win.loadURL("data:text/html,<body style='margin:0'></body>");

  const encoded = await win.webContents.executeJavaScript(`
    (async () => {
      const img = new Image();
      img.src = ${JSON.stringify(dataUrl)};
      await img.decode();
      const out = {};
      for (const s of ${JSON.stringify(SIZES)}) {
        const c = document.createElement("canvas");
        c.width = s; c.height = s;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, s, s);
        out[s] = c.toDataURL("image/png").split(",")[1];
      }
      return out;
    })()
  `);

  const frames = SIZES.map(size => ({ size, png: Buffer.from(encoded[size], "base64") }));

  fs.writeFileSync(path.join(ASSETS, "icon.ico"), buildIco(frames));
  fs.writeFileSync(path.join(ASSETS, "icon.png"), frames[frames.length - 1].png);

  for (const f of frames) console.log(`  ${String(f.size).padStart(3)}px  ${String(f.png.length).padStart(6)} bytes`);
  console.log(`icon.ico written (${fs.statSync(path.join(ASSETS, "icon.ico")).size.toLocaleString()} bytes)`);

  win.destroy();
  app.quit();
}

app.whenReady().then(main).catch(err => {
  console.error("make-icon failed:", err);
  app.exit(1);
});
