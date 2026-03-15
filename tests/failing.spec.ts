import { test, expect } from "@playwright/test";

const BASE_URL = "https://ecommerce-playground.lambdatest.io/";

// ---- Failure Pattern 1: Stale/wrong selector (simulates selector drift) ----
test("FAIL: click on non-existent element (selector drift)", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  // This selector was "valid in v1" but no longer matches — classic selector drift
  await page.click("#old-promo-banner-btn", { timeout: 3_000 });
});

// ---- Failure Pattern 2: Wrong assertion (logic/regression bug) ----
test("FAIL: homepage title should be Amazon (wrong expectation)", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  // The real title is "Your Store" — this simulates a regression test
  // that was written against the wrong expected value
  await expect(page).toHaveTitle(/Amazon/, { timeout: 3_000 });
});

// ---- Failure Pattern 3: Timeout on slow element ----
test("FAIL: wait for spinner that never appears (timeout)", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  // This element doesn't exist at all — simulates waiting for a lazy component
  await expect(page.locator("#loading-spinner")).toBeVisible({
    timeout: 3_000,
  });
});

// ---- Failure Pattern 4: Stale locator after navigation ----
test("FAIL: interact with element after navigation (stale)", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  const searchInput = page.getByRole("textbox", {
    name: "Search For Products",
  });
  await searchInput.fill("laptop");
  await searchInput.press("Enter");
  // After search results load, try to click an element that only exists on homepage
  await page.click(".carousel-inner .carousel-item >> nth=0", {
    timeout: 3_000,
  });
});

// ---- A passing test to prove the suite isn't entirely broken ----
test("PASS: homepage loads correctly (control test)", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Your Store/);
});
