import { expect, test } from "@playwright/test";

test.describe("Вход (/login)", () => {
  test("opens and shows its content", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const response = await page.goto("/login");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle("Вход");
    await expect(page.getByRole("button", { name: "Войти", exact: true }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
