import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || 'https://ecommerce-playground.lambdatest.io/';

// Test suite for product search and adding to cart

test.describe('Product Search and Add to Cart', () => {
  test('Positive Test: Search for a product and add to cart', async ({ page }) => {
    // Navigate to the base URL
    await page.goto(BASE_URL);

    // Search for a product by name
    await page.fill('input[name="search"]', 'iMac');
    await page.click('button[type="submit"]');

    // Verify that search results are displayed
    await expect(page).toHaveURL(/.*search=iMac/);
    await expect(page.locator('h2')).toContainText('iMac');

    // Click on the product link
    await page.click('div.caption a');

    // Verify product details page is displayed
    await expect(page).toHaveURL(/.*product_id=41/);
    await expect(page.locator('h1')).toHaveText('iMac');

    // Attempt to add the product to the cart
    await expect(page.locator('button[id="button-cart"]').isVisible()).toBeTruthy();
    await page.click('button[id="button-cart"]');

    // Verify that the product is added to the cart
    await expect(page.locator('.alert-success')).toContainText('Success: You have added');
  });

  test('Edge Case: Attempt to add an out-of-stock product to cart', async ({ page }) => {
    // Navigate to the base URL
    await page.goto(BASE_URL);

    // Search for a product by name
    await page.fill('input[name="search"]', 'iMac');
    await page.click('button[type="submit"]');

    // Click on the product link
    await page.click('div.caption a');

    // Verify product is out of stock
    await expect(page.locator('div.alert')).toContainText('OUT OF STOCK');

    // Attempt to add the product to the cart
    await page.click('button[id="button-cart"]');

    // Verify that no success message is shown
    await expect(page.locator('.alert-success')).toHaveCount(0);
  });
});
