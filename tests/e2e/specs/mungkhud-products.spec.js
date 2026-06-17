const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Product Management', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Create product, verify stock-list, check duplicate rejection, and clean up', async ({ page }) => {
    const testCode = 'E2E-P-001';
    const testName = 'ผลิตภัณฑ์ทดสอบ E2E';

    // 1. Go to Product Master page
    await gotoMungkhudRoute(page, 'master-product', '#masterSearchInput');

    // 2. Switch to Add Tab
    await page.click('.tab-btn[data-tab="add"]');
    await page.waitForSelector('#field_code', { timeout: 5000 });

    // 3. Fill in product details
    await page.fill('#field_code', testCode);
    await page.fill('#field_name', testName);
    await page.selectOption('#field_type', 'part');
    await page.fill('#field_price', '100');
    await page.fill('#field_cost', '50');
    await page.selectOption('#field_unit', 'ชิ้น');

    // 4. Click Save
    await page.click('#btnSaveMaster');

    // 5. Verify success notification (toast)
    const toast = page.locator('.toast.success').last();
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast).toContainText(/บันทึกข้อมูลเรียบร้อย/i);

    // 6. Go to Stock List page and verify initial stock is 0
    await gotoMungkhudRoute(page, 'stock-list', '#slSearchInput');
    await page.fill('#slSearchInput', testCode);
    await page.click('#btnSearchStock');
    await page.waitForTimeout(500);

    const productRowStock = page.locator('tr', { hasText: testCode });
    await expect(productRowStock).toBeVisible({ timeout: 5000 });
    await expect(productRowStock).toContainText('0');

    // 7. Go back to Product Master page and try to add the duplicate code
    await gotoMungkhudRoute(page, 'master-product', '#masterSearchInput');
    await page.click('.tab-btn[data-tab="add"]');
    await page.waitForSelector('#field_code', { timeout: 5000 });

    await page.fill('#field_code', testCode);
    await page.fill('#field_name', testName + ' Duplicate');
    await page.selectOption('#field_type', 'part');
    await page.fill('#field_price', '100');
    await page.fill('#field_cost', '50');

    // Save duplicate
    await page.click('#btnSaveMaster');

    // Verify error notification (toast)
    const errToast = page.locator('.toast.error').last();
    await expect(errToast).toBeVisible({ timeout: 5000 });
    // The error toast from Express API should contain duplicate code message in Thai
    await expect(errToast).toContainText(/รหัสสินค้า "E2E-P-001" มีอยู่แล้วในระบบ|เกิดข้อผิดพลาด/i);

    // 8. Clean up: Delete the test product
    await page.click('.tab-btn[data-tab="search"]');
    await page.fill('#masterSearchInput', testCode);
    await page.waitForTimeout(500);

    const productRowMaster = page.locator('tr', { hasText: testCode });
    await expect(productRowMaster).toBeVisible({ timeout: 5000 });

    // Click delete on the row
    await productRowMaster.locator('.btn-delete').click();

    // Confirm deletion in custom confirmation modal
    await page.click('#confirmOk');

    // Verify delete success toast
    const deleteToast = page.locator('.toast.success').last();
    await expect(deleteToast).toBeVisible({ timeout: 5000 });
    await expect(deleteToast).toContainText(/ลบข้อมูลเรียบร้อย/i);
  });
});
