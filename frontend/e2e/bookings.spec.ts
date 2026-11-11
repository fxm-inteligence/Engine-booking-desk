import { expect, test } from "@playwright/test";

test.describe("Записи (/bookings)", () => {
  test("sends a visitor without a session to /login", async ({ page }) => {
    await page.goto("/bookings");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  });
});
