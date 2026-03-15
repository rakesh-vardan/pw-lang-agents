# Feature: Guest Checkout

## Goal

A guest user can add an item to cart and checkout successfully.

## Preconditions

- Site is reachable at the base URL
- At least one test product exists in the catalog

## Steps

1. Open the home page
   - **Expect:** Home page loads with a search bar visible

2. Search for a product
   - **Search query:** "shirt"
   - **Expect:** Results page shows at least 1 item

3. Open the first product from results
   - **Expect:** Product detail page shows a price and an "Add to cart" button

4. Click "Add to cart"
   - **Expect:** Cart icon count increases by 1

5. Navigate to cart
   - **Expect:** Cart page shows the added item with correct name

6. Proceed to checkout as guest
   - **Expect:** Checkout form loads with fields for name, email, and address

7. Fill in guest details and submit
   - **Guest details:**
     - Name: Test User
     - Email: test.user@example.com
     - Address: 123 Test Street
   - **Expect:** Order confirmation page appears

## Test Data

| Field | Value |
|---|---|
| Search query | shirt |
| Guest name | Test User |
| Guest email | test.user@example.com |
| Address | 123 Test Street |
