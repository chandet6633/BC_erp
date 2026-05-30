# MungkhudShop Bug Report & Test Failures

## Systemic Failures
- **Login Authentication/Redirection Timeout**: All 15 E2E tests for MungkhudShop failed in the `beforeEach` hook. 
  - **Error**: `page.waitForURL: Test timeout of 30000ms exceeded. waiting for navigation to "**/index.html*"`
  - **Location**: `tests/e2e/utils/auth.js:13`
  - **Cause/Implication**: Either the standard `admin:password` credentials are invalid in the testing environment (no seed data for test db), the login button selector failed to submit the form, or the application redirects to `dashboard.html` instead of `index.html` after a successful login. 
  - **Phase 4 Fix**: Update the `auth.js` utility to use valid testing credentials or correct the expected post-login redirection URL to match MungkhudShop's behavior.

## Pending Validation
Due to the systemic login failure blocking access to the authenticated routes, the specific feature tests (dead buttons, schema links, etc.) timed out before they could run. Once the login flow is fixed in Phase 4, the test suite must be re-run to discover any page-specific failures across:
- Job Flow & Kanban
- Document Generation (Invoice, Receipt, etc.)
- Master Data Grids
- Inventory & Stocking
- Settings & Customer History
