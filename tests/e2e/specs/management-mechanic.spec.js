const { test, expect } = require('@playwright/test');
const { loginManagement } = require('../utils/auth');

test.describe('Management Portal: Mechanic Role', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Management', 'Only runs in Management project');
    await loginManagement(page, 'somchai', 'somchai123');
  });

  test('Verify Mechanic Dashboard Restrictions', async ({ page }) => {
    const response = await page.goto('/dashboard/mechanic.html');
    expect(response.status()).toBe(200);

    // Verify Active Jobs and QC Upload are visible
    const activeJobs = page.locator('#active-jobs-list, .mechanic-jobs').first();
    await expect.soft(activeJobs).toBeVisible({ timeout: 5000 });

    // Verify they cannot see Revenue KPIs
    const revenueCard = page.locator('.kpi-card:has-text("Revenue"), .kpi-card:has-text("รายรับ")');
    await expect.soft(revenueCard).toBeHidden();
  });
});
