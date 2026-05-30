const { test, expect } = require('@playwright/test');
const { loginMungkhudShop } = require('../utils/auth');

test.describe('MungkhudShop Master Data Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  const pagesToTest = [
    '/#/master-product',
    '/#/master-customer',
    '/#/master-vehicle'
  ];

  for (const pageUrl of pagesToTest) {
    test(`Navigate to ${pageUrl} and test Add New`, async ({ page }) => {
      const response = await page.goto(pageUrl);
      
      
      const addBtn = page.locator('button:has-text("Add"), button:has-text("เพิ่ม"), .btn-add, .btn-primary').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        const modal = page.locator('.modal.show, form.show, .offcanvas.show');
        await expect.soft(modal).toBeVisible();
      }
    });
  }
});
