import { expect, test } from "@playwright/test";

test.describe("Записаться (/book)", () => {
  test("opens and shows its content", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto("/book");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle("Записаться");
    await expect(page.getByRole("button", { name: "Записаться", exact: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
