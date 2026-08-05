/* Bridges just enough of the desktop shell into the page. The tracker is a
   plain client-side app, so nothing here grants it filesystem or Node access —
   only the app version and the login-item switch. */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  appVersion: ipcRenderer.sendSync("app:version"),
  electron: process.versions.electron,

  openAtLogin: {
    get: ()        => ipcRenderer.invoke("startup:get"),
    set: (enabled) => ipcRenderer.invoke("startup:set", !!enabled)
  }
});
