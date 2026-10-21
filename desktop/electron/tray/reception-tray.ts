import { Menu, Tray, nativeImage } from "electron";
import { join } from "node:path";

let trayRef: Tray | null = null;

/** Tray Icon "Reception Tray" — created once by main.ts when the app is ready. */
export function createReceptionTray(): Tray {
  if (trayRef) return trayRef;
  const tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip("Запись");
  tray.setContextMenu(Menu.buildFromTemplate([{ role: "quit" }]));
  trayRef = tray;
  return tray;
}
