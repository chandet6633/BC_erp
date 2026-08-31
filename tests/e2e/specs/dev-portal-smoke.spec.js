const { test, expect } = require('@playwright/test');

test.describe('Dev Portal SSO Smoke', () => {
  async function enterPortalAs(page, role) {
    await page.goto('/?from=mungkhudshop&reason=token_expired', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('http://localhost:9092/');
    await expect(page.locator('#devAccess')).toHaveClass(/active/);
    await page.locator(`[data-role="${role}"]`).click();
    await page.locator('[data-branch="bc-auto-service"]').click();
    await expect(page.locator('#enterPortalBtn')).toBeEnabled();
    await page.locator('#enterPortalBtn').click();
    await expect(page.locator('#portalHome')).toHaveClass(/active/);
    await expect(page.locator('[data-module="mungkhudshop"]')).toBeVisible();
  }

  test('expired Mungkhud return can select role, enter portal, open Mungkhud, and survive refresh', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Portal', 'Run from the Portal project so localhost:9092 is the starting app');

    await page.goto('/?from=mungkhudshop&reason=token_expired', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('http://localhost:9092/');
    await expect(page.locator('#devAccess')).toHaveClass(/active/);
    await expect(page.locator('[data-role]')).toHaveCount(5);
    await expect(page.locator('[data-branch]')).toHaveCount(3);
    await expect(page.locator('[data-branch="all"]')).toHaveCount(0);
    await expect(page.locator('#enterPortalBtn')).toBeDisabled();

    await page.locator('[data-role="manager"]').click();
    await page.locator('[data-branch="bc-auto-service"]').click();
    await expect(page.locator('#enterPortalBtn')).toBeEnabled();
    await page.locator('#enterPortalBtn').click();

    await expect(page.locator('#portalHome')).toHaveClass(/active/);
    await expect(page.locator('[data-module="mungkhudshop"]')).toBeVisible();

    const portalStorage = await page.evaluate(() => ({
      devAuth: localStorage.getItem('bcauto_dev_auth'),
      newDevAuth: localStorage.getItem('app.session.devAuth'),
      role: localStorage.getItem('app.session.role'),
      userId: localStorage.getItem('app.session.userId'),
      userName: localStorage.getItem('app.session.userName'),
      authModel: localStorage.getItem('app.session.authModel'),
      branch: localStorage.getItem('app.session.branchId'),
      branchLocked: localStorage.getItem('app.session.branchLocked'),
      oldRole: sessionStorage.getItem('bcauto_role'),
      oldBranch: localStorage.getItem('bcauto_branch')
    }));
    expect(portalStorage).toMatchObject({
      newDevAuth: '1',
      role: 'manager',
      branch: 'bc-auto-service',
      branchLocked: 'true',
      oldRole: null,
      oldBranch: null
    });
    expect(portalStorage.devAuth).toBeNull();
    expect(portalStorage.userId).toBeTruthy();
    expect(portalStorage.userName).toBeTruthy();
    expect(() => JSON.parse(portalStorage.authModel)).not.toThrow();

    const moduleHref = await page.locator('[data-module="mungkhudshop"]').getAttribute('href');
    expect(moduleHref).toContain('http://localhost:9091/');
    expect(moduleHref).toContain('sso_token=');
    expect(moduleHref).toContain('#/dashboard');

    await page.locator('[data-module="mungkhudshop"]').click();
    await expect(page).toHaveURL(/localhost:9091\/#\/dashboard/);
    await expect(page.locator('.sidebar, .topnav')).toHaveCount(2);
    await page.waitForFunction(() => {
      const auth = localStorage.getItem('mungkhud_auth');
      if (!auth) return false;
      try {
        return JSON.parse(auth).role === 'manager';
      } catch {
        return false;
      }
    });

    const mungkhudStorage = await page.evaluate(() => {
      const auth = localStorage.getItem('mungkhud_auth');
      return {
        href: window.location.href,
        devAuth: localStorage.getItem('app.session.devAuth'),
        role: localStorage.getItem('app.session.role'),
        userId: localStorage.getItem('app.session.userId'),
        userName: localStorage.getItem('app.session.userName'),
        branch: localStorage.getItem('app.session.branchId'),
        mungkhudAuth: auth,
        mungkhudRole: auth ? JSON.parse(auth).role : ''
      };
    });
    expect(mungkhudStorage).toMatchObject({
      devAuth: '1',
      role: 'manager',
      branch: 'bc-auto-service',
      mungkhudRole: 'manager'
    });
    expect(mungkhudStorage.userId).toBeTruthy();
    expect(mungkhudStorage.userName).toBeTruthy();
    expect(mungkhudStorage.mungkhudAuth).toBeTruthy();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/localhost:9091\/#\/dashboard/);
    await expect(page.locator('.sidebar, .topnav')).toHaveCount(2);
    await expect(page.locator('body')).toContainText('MungkhudShop');

  });

  for (const role of ['admin', 'owner', 'manager', 'sa']) {
    test(`opens MungkhudShop from Portal as ${role}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'Portal', 'Run from the Portal project so localhost:9092 is the starting app');

      await enterPortalAs(page, role);
      await page.locator('[data-module="mungkhudshop"]').click();
      await expect(page).toHaveURL(/localhost:9091\/#\/dashboard/);
      await expect(page.locator('.sidebar, .topnav')).toHaveCount(2);
      await page.waitForFunction(expectedRole => {
        const auth = localStorage.getItem('mungkhud_auth');
        if (!auth) return false;
        try {
          return JSON.parse(auth).role === expectedRole;
        } catch {
          return false;
        }
      }, role);
      await expect(page.locator('body')).toContainText('MungkhudShop');
    });
  }

  test('opens mechanic work page from Portal as mechanic', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Portal', 'Run from the Portal project so localhost:9092 is the starting app');

    await enterPortalAs(page, 'mechanic');
    const moduleHref = await page.locator('[data-module="mungkhudshop"]').getAttribute('href');
    expect(moduleHref).toContain('http://localhost:9091/');
    expect(moduleHref).toContain('sso_token=');
    expect(moduleHref).toContain('#/mechanic-kpi');

    await page.locator('[data-module="mungkhudshop"]').click();
    await expect(page).toHaveURL(/localhost:9091\/#\/mechanic-kpi/);
    await expect(page.locator('.sidebar, .topnav')).toHaveCount(2);
    await page.waitForFunction(() => {
      const auth = localStorage.getItem('mungkhud_auth');
      if (!auth) return false;
      try {
        return JSON.parse(auth).role === 'mechanic';
      } catch {
        return false;
      }
    });
  });
});
