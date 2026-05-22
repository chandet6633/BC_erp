const { test, expect } = require('@playwright/test');
const { loginManagement } = require('../utils/auth');

test.describe('Management Portal: Manager Role', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Management', 'Only runs in Management project');
    await loginManagement(page, 'manager1', 'owner123');
  });

  test('Verify Manager Dashboard & Jobs List', async ({ page }) => {
    const response = await page.goto('/dashboard/index.html');
    expect(response.status()).toBe(200);

    // Verify jobs list table exists
    const jobsTable = page.locator('.jobs-table, #jobs-grid').first();
    await expect.soft(jobsTable).toBeVisible({ timeout: 5000 });
  });

  test('Verify Manager HR Operations Access', async ({ page }) => {
    const response = await page.goto('/hr/hrdashboard.html');
    expect(response.status()).toBe(200);
  });
});
