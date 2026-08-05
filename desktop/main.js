/* ─────────────────────────────────────────────────────────────────────
   Quiet Progress — Electron main process

   The renderer is the same single HTML file the browser build uses. It is
   served over a registered `app://` scheme rather than `file://` on purpose:
   file:// origins are opaque in Chromium, so localStorage is unreliable and
   can be wiped between launches. A standard, secure scheme gives the page a
   stable origin, which is what keeps the habit history alive.
   ───────────────────────────────────────────────────────────────────── */
"use strict";

const { app, BrowserWindow, protocol, net, shell, Menu, ipcMain } = require("electron");
const path = require("node:path");
const fs   = require("node:fs");
const { pathToFileURL } = require("node:url");

const ROOT   = path.join(__dirname, "..");
const SCHEME = "app";
const START  = `${SCHEME}://local/index.html`;

const MIN_WIDTH  = 900;
const MIN_HEIGHT = 620;

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true }
}]);

/* ── Remember where the window was ──────────────────────────────────── */
const boundsFile = () => path.join(app.getPath("userData"), "window-state.json");

function loadBounds(){
  try {
    const b = JSON.parse(fs.readFileSync(boundsFile(), "utf8"));
    if (Number.isFinite(b.width) && Number.isFinite(b.height)) return b;
  } catch { /* first run, or the file got mangled — fall back to defaults */ }
  return null;
}

function saveBounds(win){
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
    fs.writeFileSync(boundsFile(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch { /* losing window position is not worth surfacing to the user */ }
}

/* ── Serve the app files ────────────────────────────────────────────── */
function registerProtocol(){
  protocol.handle(SCHEME, async request => {
    let rel;
    try { rel = decodeURIComponent(new URL(request.url).pathname); }
    catch { return new Response("Bad request", { status: 400 }); }

    if (rel === "/" || rel === "") rel = "/index.html";

    const target = path.normalize(path.join(ROOT, rel));
    // Never let a crafted URL climb out of the app directory.
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
      return new Response("Forbidden", { status: 403 });
    }
    if (!fs.existsSync(target)) return new Response("Not found", { status: 404 });

    return net.fetch(pathToFileURL(target).toString());
  });
}

/* ── Window ─────────────────────────────────────────────────────────── */
let mainWindow = null;

function createWindow(){
  const saved = loadBounds();

  mainWindow = new BrowserWindow({
    width:  saved?.width  ?? 1360,
    height: saved?.height ?? 900,
    x: saved?.x,
    y: saved?.y,
    minWidth:  MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    show: false,
    backgroundColor: "#080c15",   // matches the page ground, so no white flash
    autoHideMenuBar: true,        // Alt reveals it
    title: "Quiet Progress",
    // Packaged builds take the icon from the exe resources; this is what gives
    // the taskbar a real icon when running unpackaged via `npm start`.
    icon: path.join(ROOT, "assets", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Live Exam Mode must keep firing its voice announcements while the
      // window is minimised or behind another app; Chromium throttles
      // background timers to roughly once a minute without this.
      backgroundThrottling: false
    }
  });

  if (saved?.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", () => saveBounds(mainWindow));
  mainWindow.on("closed", () => { mainWindow = null; });

  // Anything that isn't our own scheme belongs in the user's real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:$/.test(safeProtocol(url))) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${SCHEME}://`)) {
      event.preventDefault();
      if (/^https?:$/.test(safeProtocol(url))) shell.openExternal(url);
    }
  });

  mainWindow.loadURL(START);
}

function safeProtocol(url){
  try { return new URL(url).protocol; } catch { return ""; }
}

/* ── Menu ───────────────────────────────────────────────────────────── */
function buildMenu(){
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.reload()
        },
        { type: "separator" },
        { role: process.platform === "darwin" ? "close" : "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ── IPC: the Settings drawer's "Open when I sign in" switch ────────── */
ipcMain.on("app:version", event => { event.returnValue = app.getVersion(); });

ipcMain.handle("startup:get", () => app.getLoginItemSettings().openAtLogin);

ipcMain.handle("startup:set", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: !!enabled, openAsHidden: false });
  return app.getLoginItemSettings().openAtLogin;
});

/* ── Lifecycle ──────────────────────────────────────────────────────── */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    registerProtocol();
    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
