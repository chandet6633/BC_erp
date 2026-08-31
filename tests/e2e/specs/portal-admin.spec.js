const { test, expect } = require('@playwright/test');
const { loginPortal } = require('../utils/auth');

test.describe('Portal: Admin Role', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Portal', 'Only runs in Portal project');
    await loginPortal(page, 'admin', 'admin123');
  });

  test('Verify Admin Dashboard & Financial KPIs', async ({ page }) => {
    const response = await page.goto('/dashboard/index.html');
    expect(response.status()).toBe(200);

    // Verify revenue KPIs are visible
    const revenueCard = page.locator('.kpi-card:has-text("Revenue"), .kpi-card:has-text("รายรับ"), #kpi-revenue').first();
    await expect.soft(revenueCard).toBeVisible({ timeout: 5000 });
  });

  test('Verify Admin HR Module Access', async ({ page }) => {
    const response = await page.goto('/hr/index.html');
    expect(response.status()).toBe(200);

    const hrContainer = page.locator('.hr-dashboard, #hr-container').first();
    await expect.soft(hrContainer).toBeVisible({ timeout: 5000 });
  });

  test('Verify Admin Settings Access', async ({ page }) => {
    const response = await page.goto('/settings.html');
    expect(response.status()).toBe(200);
  });
});
