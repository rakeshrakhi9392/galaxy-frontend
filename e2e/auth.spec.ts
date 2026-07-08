import { expect, test } from "@playwright/test";

test.describe("Auth shell", () => {
  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("workflows route requires authentication", async ({ page }) => {
    await page.goto("/workflows");
    await expect(page).toHaveURL(/sign-in/);
  });
});
