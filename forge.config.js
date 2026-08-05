/* Electron Forge configuration.
   `npm run make`    -> installer + zip in ./out/make
   `npm run package` -> unpacked app in ./out  */
"use strict";

const path = require("node:path");

// Extension is intentionally omitted: Electron Packager appends .ico on
// Windows, .icns on macOS and .png on Linux.
const ICON = path.join(__dirname, "assets", "icon");

module.exports = {
  packagerConfig: {
    asar: true,
    name: "Quiet Progress",
    executableName: "quiet-progress",
    icon: ICON,
    appBundleId: "com.quietprogress.tracker",
    appCategoryType: "public.app-category.productivity",
    // Keep the shipped app to the renderer + main process. Everything below is
    // tooling or docs that would only bloat the installer.
    ignore: [
      /^\/out($|\/)/,
      /^\/\.git($|\/)/,
      /^\/\.vscode($|\/)/,
      /\.ps1$/,
      /^\/README/,
      /^\/forge\.config\.js$/,
      /^\/assets\/make-icon\.js$/   // build-time only; the .ico is what ships
    ]
  },

  rebuildConfig: {},

  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],
      config: {
        name: "quiet_progress",
        setupExe: "Quiet Progress Setup.exe",
        noMsi: true,
        // Squirrel builds a NuGet package under the hood and NuGet rejects a
        // nuspec without Authors, so this cannot be left to a default.
        authors: "Quiet Progress",
        owners: "Quiet Progress",
        description: "Offline habit and study tracker with an exam planner.",
        setupIcon: `${ICON}.ico`
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32", "darwin", "linux"]
    }
  ]
};
