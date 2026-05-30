const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Kanban & QC Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Navigate to Kanban and verify features', async ({ page }) => {
    await gotoMungkhudRoute(page, 'kanban', '#kanbanBoard');

    // Verify Kanban columns load
    const column = page.locator('.kanban-column, .kanban-board').first();
    await expect(column).toBeVisible({ timeout: 5000 });

    // Test QC modal trigger if it exists
    const qcBtn = page.locator('.btn-qc').first();
    if (await qcBtn.isVisible()) {
      await qcBtn.click({ force: true });
      const modal = page.locator('.modal.show, .modal[style*="display: block"]');
      await expect.soft(modal).toBeVisible();
    }
  });
});
