const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Job Workflow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    // Assuming standard admin credentials exist. If this fails, it gets logged as a bug.
    await loginMungkhudShop(page, 'admin', 'admin123'); 
  });

  test('Navigate to Job Creation and interact with form', async ({ page }) => {
    await gotoMungkhudRoute(page, 'job', '.tabs');
    
    // Close changelog modal if it's open (it intercepts clicks)
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /add_circle_outline|เพิ่ม|แก้ไข/i }).click();
    
    // Form interactions should not crash. We use soft assertions so the test can continue.
    const plateInput = page.locator('#jobPlateAC input');
    await expect(plateInput.first()).toBeVisible({ timeout: 5000 });
    
    if (await plateInput.first().isVisible()) {
      await plateInput.first().fill('TEST-1234');
    }

    // Try to click an "Add Ad-Hoc Item" button
    const adHocBtn = page.locator('button:has-text("Ad-Hoc"), button:has-text("กำหนดเอง"), .btn-add-adhoc');
    // It might not exist or might be named differently; we check if it exists
    if (await adHocBtn.count() > 0) {
      await adHocBtn.first().click();
      // Ensure the adhoc modal/row appears
      await expect.soft(page.locator('input[name="adhoc_name"], .adhoc-input').first()).toBeVisible();
    }
  });
});
