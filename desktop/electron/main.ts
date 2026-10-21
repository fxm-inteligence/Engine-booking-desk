import { installMenuBar } from "./menus/menu-bar.js";
import { createReceptionTray } from "./tray/reception-tray.js";
import { BrowserWindow, app } from "electron";
import { join } from "node:path";

const rendererDevServerUrl = process.env["VITE_DEV_SERVER_URL"];
const rendererDist = join(__dirname, "..", "dist");

function loadRoute(window: BrowserWindow, hash: string): void {
  if (rendererDevServerUrl) {
    void window.loadURL(rendererDevServerUrl + "#" + hash);
  } else {
    void window.loadFile(join(rendererDist, "index.html"), { hash });
  }
}

// The renderer's index.html has its own <title>; without this it replaces the window's configured title.
function keepConfiguredTitle(window: BrowserWindow): void {
  window.on("page-title-updated", (event) => event.preventDefault());
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    title: "Запись: стойка администратора",
    resizable: true,
    frame: true,
    webPreferences: { preload: join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  keepConfiguredTitle(window);
  loadRoute(window, "/");
  return window;
}

void app.whenReady().then(() => {
  installMenuBar();
  createReceptionTray();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
