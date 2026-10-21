import { Menu } from "electron";

/**
 * Tray Menu "Tray Menu" — pass to a Tray via
 * `tray.setContextMenu(buildTrayMenu())`.
 */
export function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
  label: "Открыть",
  click: () => {
    // Connect an Actions or Logic Block to "Tray Menu" to give this item behaviour.
    console.log("Menu item invoked: Tray Menu");
  },
},
    { type: "separator" },
    { role: "quit" },
  ]);
}
