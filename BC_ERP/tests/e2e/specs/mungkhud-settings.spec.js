const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Settings', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Navigate to Settings and verify inputs', async ({ page }) => {
    await gotoMungkhudRoute(page, 'settings', '#settingLogoImage');

    // Verify settings form exists
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 5000 });
  });
});
