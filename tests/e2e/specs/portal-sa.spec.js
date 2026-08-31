const { test, expect } = require('@playwright/test');
const { loginPortal } = require('../utils/auth');

test.describe('Portal: Service Advisor (SA) Role', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Portal', 'Only runs in Portal project');
    await loginPortal(page, 'sa1', 'sa123');
  });

  test('Verify SA Access to Jobs but not Revenue KPIs', async ({ page }) => {
    const response = await page.goto('/dashboard/index.html');
    expect(response.status()).toBe(200);

    // Verify jobs list is visible
    const jobsTable = page.locator('.jobs-table, #jobs-grid').first();
    await expect.soft(jobsTable).toBeVisible({ timeout: 5000 });

    // Verify revenue KPI is HIDDEN
    const revenueCard = page.locator('.kpi-card:has-text("Revenue"), .kpi-card:has-text("รายรับ")');
    await expect.soft(revenueCard).toBeHidden();
  });
});
