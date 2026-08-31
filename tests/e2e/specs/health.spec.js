const { test, expect } = require('@playwright/test');

test.describe('Health Checks', () => {
  test('MungkhudShop login page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    
    // MungkhudShop usually redirects or is served at the root or /login.html
    // Assuming /login.html based on typical setup. Modify if needed.
    await page.goto('/login.html');
    
    // Basic health check: Page loads, title exists
    const title = await page.title();
    expect(title).not.toBe('');
    console.log(`[MungkhudShop] Title: ${title}`);
    
    // Check if the page contains a login form or username field
    const usernameInput = page.locator('input[type="text"], input[name="username"]').first();
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
  });

  test('Portal login page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Portal', 'Only runs in Portal project');
    
    // Portal is usually at /index.html
    await page.goto('/index.html');
    
    // Basic health check: Page loads, title exists
    const title = await page.title();
    expect(title).not.toBe('');
    console.log(`[Portal] Title: ${title}`);
    
    // Check if the page contains a login form or username field
    const usernameInput = page.locator('input[type="text"], input[name="username"]').first();
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
  });
});
