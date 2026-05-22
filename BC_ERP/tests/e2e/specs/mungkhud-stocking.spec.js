const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Stocking Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Navigate to Stock List and verify rendering', async ({ page }) => {
    await gotoMungkhudRoute(page, 'stock-list', '#stockGrid table');

    const stockGrid = page.locator('#stockGrid table, #stockGrid .empty-state').first();
    await expect(stockGrid).toBeVisible({ timeout: 5000 });
  });

  test('Navigate to Stock Adjust and verify interaction', async ({ page }) => {
    await gotoMungkhudRoute(page, 'stock-adjust', '.tabs');

    await page.getByRole('button', { name: /add_circle_outline|เพิ่ม|แก้ไข/i }).click();
    await expect(page.locator('#panel-add')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#doc_no')).toBeVisible({ timeout: 5000 });
  });

  test('Navigate to Stock Transfer without crashing', async ({ page }) => {
    await gotoMungkhudRoute(page, 'stock-transfer', '#panel-search, #panel-add');
  });
});
