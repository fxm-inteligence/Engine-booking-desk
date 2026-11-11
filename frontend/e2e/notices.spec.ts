import { expect, test } from "@playwright/test";

test.describe("Уведомления (/notices)", () => {
  test("sends a visitor without a session to /login", async ({ page }) => {
    await page.goto("/notices");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  });
});
