import { test, expect } from "@playwright/test";

test("seed: open base URL and verify page loads", async ({ page }) => {
  const baseUrl =
    process.env.BASE_URL || "https://ecommerce-playground.lambdatest.io/";
  await page.goto(baseUrl);
  await expect(page).toHaveTitle(/.+/); // any non-empty title
});
