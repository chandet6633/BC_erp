const { test, expect } = require('@playwright/test');
const { loginMungkhudShop } = require('../utils/auth');

test.describe('MungkhudShop Document Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  const pagesToTest = [
    '/#/quotation',
    '/#/invoice',
    '/#/receipt',
    '/#/credit-note'
  ];

  for (const pageUrl of pagesToTest) {
    test(`Navigate to ${pageUrl}`, async ({ page }) => {
      const response = await page.goto(pageUrl);
      
      const formOrTable = page.locator('form, table, .container, #pageContent').first();
      await expect.soft(formOrTable).toBeVisible({ timeout: 5000 });
    });
  }
});
