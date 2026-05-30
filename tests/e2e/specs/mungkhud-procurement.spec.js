const { test, expect } = require('@playwright/test');
const { loginMungkhudShop } = require('../utils/auth');

test.describe('MungkhudShop Procurement Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Navigate to Requisition and Goods Receipt', async ({ page }) => {
    await page.goto('/index.html#/requisition');
    await expect(page.locator('#pageContent, main').first()).toBeVisible({ timeout: 5000 });

    await page.goto('/index.html#/goods-receipt');
    await expect(page.locator('#pageContent, main').first()).toBeVisible({ timeout: 5000 });
  });
});
