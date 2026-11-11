import { expect, test } from "@playwright/test";

test.describe("Clients (/clients)", () => {
  test("sends a visitor without a session to /login", async ({ page }) => {
    await page.goto("/clients");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  });
});
