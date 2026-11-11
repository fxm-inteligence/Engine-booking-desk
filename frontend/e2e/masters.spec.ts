import { expect, test } from "@playwright/test";

test.describe("Masters (/masters)", () => {
  test("opens and shows its content", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto("/masters");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle("Masters");
    expect(errors).toEqual([]);
  });
});
