# Portal Bug Report & Test Failures

## Systemic Failures
- **Login Authentication/Redirection Timeout**: All 7 role-based E2E tests for the Portal failed in the `beforeEach` hook. 
  - **Error**: `page.waitForURL: Test timeout of 30000ms exceeded. waiting for navigation to "**/dashboard/index.html*"`
  - **Location**: `tests/e2e/utils/auth.js:25`
  - **Cause/Implication**: Similar to the MungkhudShop failure, the Portal test suite cannot progress past the login screen. This is primarily because the hardcoded test credentials (`admin`, `manager`, `sa`, `mechanic`) do not exist in the local NocoDB test database, or the UI is unable to redirect to `/dashboard/index.html` after the form is submitted.
  - **Phase 4 Fix**: We need to seed valid test user accounts into NocoDB, and/or update the `auth.js` utility to handle the specific UI response (e.g. waiting for an API response or checking for error toasts) to successfully authenticate before the role-based functional tests can run.

## Pending Validation
Once the authentication layer is fixed in Phase 4, the test suite must be re-run to discover specific access control bugs across:
- **Admin**: Dashboard Revenue KPIs, HR Modules, Settings.
- **Manager**: Dashboard, Jobs List, HR Check-in/Approvals.
- **Service Advisor**: Jobs List, Customer Data (Verifying Revenue KPIs are hidden).
- **Mechanic**: Mechanic Dashboard (Verifying global lists, HR, and Revenue are strictly inaccessible).
