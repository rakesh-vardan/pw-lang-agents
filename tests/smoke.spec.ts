import { test, expect } from "@playwright/test";

const BASE_URL = "https://ecommerce-playground.lambdatest.io/";

test("smoke: homepage loads with correct title", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Your Store/);
});

test("smoke: homepage has a search input", async ({ page }) => {
  await page.goto(BASE_URL);
  const searchInput = page.getByRole("textbox", { name: "Search For Products" });
  await expect(searchInput).toBeVisible();
});

test("smoke: top categories section is visible", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(
    page.getByRole("heading", { name: "TOP TRENDING CATEGORIES" })
  ).toBeVisible();
});

test("smoke: product search returns results", async ({ page }) => {
  await page.goto(BASE_URL);
  const searchInput = page.getByRole("textbox", { name: "Search For Products" });
  await searchInput.fill("iphone");
  await searchInput.press("Enter");
  await expect(page.locator(".product-thumb").first()).toBeVisible({
    timeout: 10_000,
  });
});
