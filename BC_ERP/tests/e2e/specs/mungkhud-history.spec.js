const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Customer History', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Navigate to Customer History and verify components', async ({ page }) => {
    await gotoMungkhudRoute(page, 'customer-history', '#customerSearchAC input');

    await expect(page.locator('#customerSearchAC input').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#customerResultPanel')).toBeAttached();
  });
});
