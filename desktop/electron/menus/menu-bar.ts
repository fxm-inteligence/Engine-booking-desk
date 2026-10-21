import { Menu, type MenuItemConstructorOptions } from "electron";

/**
 * Application Menu "Menu Bar" — installed process-wide by main.ts. Add more
 * MenuItemConstructorOptions entries to `template` to grow the menu.
 */
export function installMenuBar(): void {
  const template: MenuItemConstructorOptions[] = [
    {
  label: "Menu Bar",
  click: () => {
    // Connect an Actions or Logic Block to "Menu Bar" to give this item behaviour.
    console.log("Menu item invoked: Menu Bar");
  },
},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
