# Exploratory Test Report

## Areas Explored
1. Homepage Navigation
2. Search Functionality
3. User Account Access

## Findings

### 1. Search Functionality with Special Characters
- **Category**: BUG
- **Steps to Reproduce**:
  1. Navigate to the homepage.
  2. Enter special characters `!@#$%^&*()` in the search input field.
  3. Click on the search button.
- **Actual Result**: The page displays a message stating "There is no product that matches the search criteria."
- **Expected Result**: The application should handle special characters gracefully, either by returning no results or providing a user-friendly message.

### 2. Empty Search Submission
- **Category**: BUG
- **Steps to Reproduce**:
  1. Navigate to the homepage.
  2. Leave the search input field empty.
  3. Click on the search button.
- **Actual Result**: The page displays a search results page with no criteria specified.
- **Expected Result**: The application should prompt the user to enter a search term or display a message indicating that the search term is required.

### 3. Navigation Links Timeout
- **Category**: USABILITY_ISSUE
- **Steps to Reproduce**:
  1. Navigate to the homepage.
  2. Attempt to click on various navigation links (e.g., Special, Hot, My Account).
- **Actual Result**: Multiple attempts resulted in timeout errors, indicating that the links were unresponsive.
- **Expected Result**: All navigation links should be responsive and lead to the appropriate pages without timeout errors.

## Risk Assessment
- **Overall Quality Impression**: The application has several critical bugs related to search functionality that could hinder user experience. The navigation issues also pose a usability risk.
- **Top Risks**:
  1. Users may be unable to find products due to the handling of special characters in search queries.
  2. Lack of feedback for empty search submissions could lead to user frustration.
  3. Unresponsive navigation links can lead to a poor user experience and potential loss of customers.