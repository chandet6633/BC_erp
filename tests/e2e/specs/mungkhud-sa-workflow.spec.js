const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Service Advisor practice flow', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'sa1', 'sa123');
  });

  test('SA can intake a real job and see it on Kanban', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const plate = `3\u0e01\u0e04-${suffix.slice(-4)}`;
    const customer = `SA Practice ${suffix}`;

    await gotoMungkhudRoute(page, 'job', '.tabs');

    await expect(page.locator('a[href="#/job"]')).toBeVisible();
    await expect(page.locator('a[href="#/kanban"]')).toBeVisible();
    await expect(page.locator('a[href="#/settings"]')).toBeHidden();
    await expect(page.locator('a[href="#/report-finance"]')).toBeHidden();

    await page.getByRole('button', { name: /add_circle_outline|เพิ่ม|แก้ไข/i }).click();
    await expect(page.locator('#jobPlateAC input')).toBeVisible();
    await expect(page.locator('#btnSaveJob')).toBeEnabled();

    await page.locator('#jobPlateAC input').fill(plate);
    await page.locator('#jobModel').fill('Toyota Test');
    await page.locator('#jobMileage').fill('12345');
    await page.locator('#jobCustomerAC input').fill(customer);
    await page.locator('#jobCustomerPhone').fill('0812345678');
    await page.locator('#btnSaveJob').click();

    await expect(page.locator('.toast.success')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('.toast.error')).toHaveCount(0);
    await page.locator('#btnSearchJob').click();
    await expect(page.locator('#jobSearchResults')).toContainText(plate, { timeout: 30000 });

    await gotoMungkhudRoute(page, 'kanban', '#kanbanBoard');
    await expect(page.locator('#kanbanBoard')).toContainText(plate, { timeout: 30000 });
  });

  test('SA is blocked from system settings by direct URL', async ({ page }) => {
    await gotoMungkhudRoute(page, 'settings', '.empty-state');
    await expect(page.locator('.empty-state')).toBeVisible();
  });
});
