const { test, expect } = require('@playwright/test');

async function installAdminDevSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('app.session.devAuth', '1');
    localStorage.setItem('app.session.branchId', 'bc-auto-service');
    localStorage.setItem('app.session.branchLocked', 'true');
    localStorage.setItem('app.session.language', 'en');
    localStorage.setItem('app.session.role', 'admin');
    localStorage.setItem('app.session.userId', 'dev-admin-bc-auto-service');
    localStorage.setItem('app.session.userName', 'Dev Admin');
    localStorage.setItem('app.session.authModel', JSON.stringify({
      id: 'dev-admin-bc-auto-service',
      name: 'Dev Admin',
      role: 'admin',
      branch: 'bc-auto-service',
      branch_id: 'bc-auto-service',
      dev_mode: true
    }));
  });
}

test.describe('Admin Suite Smoke', () => {
  test('user management loads database roles and branches', async ({ page }) => {
    await installAdminDevSession(page);
    await page.goto('/pages/admin/user-management.html');

    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    await expect(page.locator('#userBody tr').first()).toBeVisible();
    await expect(page.locator('#role option[value="admin"]')).toHaveCount(1);
    await expect(page.locator('#branch option[value="all"]')).toHaveCount(0);
    await expect(page.locator('#branch option[value="bc-auto-service"]')).toHaveCount(1);
    await expect(page.locator('#totalUsers')).not.toHaveText('-');
  });

  test('system health reports metadata checks', async ({ page }) => {
    await installAdminDevSession(page);
    await page.goto('/pages/admin/system-health.html');

    await expect(page.getByRole('heading', { name: /system health/i })).toBeVisible();
    await expect(page.locator('#overall')).toHaveText(/OK/i);
    for (const label of ['Branch metadata', 'Role metadata', 'System settings', 'User directory', 'Dev portal session contract']) {
      await expect(page.getByText(label)).toBeVisible();
    }
  });
});
