const { test, expect } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:9093';
const MANAGER_BASELINE_TOOLS = [
  'dashboard',
  'operations_menu',
  'entry',
  'verification',
  'mungkhudshop',
  'mechanic_dashboard',
  'technical_knowledge',
  'sa_docs',
  'checkin',
  'hr_dashboard'
];

function devHeaders(role = 'admin') {
  return {
    'x-bcauto-dev-auth': '1',
    'x-bcauto-dev-role': role,
    'x-bcauto-dev-user-id': `dev-${role}-bc-auto-service`,
    'x-bcauto-dev-user-name': `Dev ${role}`,
    'x-bcauto-dev-branch': 'bc-auto-service'
  };
}

async function apiJson(request, path, options = {}) {
  const response = await request.fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...devHeaders('admin')
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function getManagerRole(request) {
  const { response, body } = await apiJson(request, '/api/data/custom/admin/roles');
  expect(response.status()).toBe(200);
  const role = (body.roles || []).find(row => row.role === 'manager');
  expect(role).toBeTruthy();
  return role;
}

async function saveManagerTools(request, allowedTools) {
  const { response } = await apiJson(request, '/api/data/custom/admin/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: {
      roles: [{ role: 'manager', allowed_tools: allowedTools }]
    }
  });
  expect(response.status()).toBe(200);
}

async function enterPortalAsManager(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('bc_rolePermissions');
    sessionStorage.clear();
    localStorage.removeItem('app.session.devAuth');
    localStorage.removeItem('app.session.branchId');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-role="manager"]').click();
  await page.locator('[data-branch="bc-auto-service"]').click();
  await page.locator('#enterPortalBtn').click();
  await expect(page.locator('#portalHome')).toHaveClass(/active/);
}

test.describe('Role Metadata Portal Visibility', () => {
  test('portal module cards follow system_roles allowed_tools metadata', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'Portal', 'Run from the Portal project so localhost:9092 is the portal');

    const original = await getManagerRole(request);
    const originalTools = Array.isArray(original.allowed_tools) ? original.allowed_tools : [];
    const restoreTools = originalTools.length ? originalTools : MANAGER_BASELINE_TOOLS;

    try {
      await saveManagerTools(request, ['dashboard']);
      await expect.poll(async () => (await getManagerRole(request)).allowed_tools)
        .toEqual(['dashboard']);
      await enterPortalAsManager(page);
      await expect.poll(async () => page.evaluate(async () => {
        const res = await fetch('/api/data/custom/role-metadata', {
          headers: {
            'x-bcauto-dev-auth': localStorage.getItem('app.session.devAuth') || '',
            'x-bcauto-dev-role': localStorage.getItem('app.session.role') || '',
            'x-bcauto-dev-user-id': localStorage.getItem('app.session.userId') || '',
            'x-bcauto-dev-user-name': encodeURIComponent(localStorage.getItem('app.session.userName') || ''),
            'x-bcauto-dev-branch': localStorage.getItem('app.session.branchId') || ''
          }
        });
        const body = await res.json().catch(() => ({}));
        return {
          status: res.status,
          role: localStorage.getItem('app.session.role'),
          dev: localStorage.getItem('app.session.devAuth'),
          managerTools: (body.roles || []).find(role => role.role === 'manager')?.allowed_tools || []
        };
      })).toEqual({ status: 200, role: 'manager', dev: '1', managerTools: ['dashboard'] });
      await expect.poll(async () => page.evaluate(() => window.ConfigService?.rolePermissions?.manager || []))
        .toEqual(['dashboard']);
      await expect(page.locator('[data-module="dashboard"]')).toBeVisible();
      await expect(page.locator('[data-module="mungkhudshop"]')).toHaveCount(0);
      await expect(page.locator('[data-module="admin_suite"]')).toHaveCount(0);

      await saveManagerTools(request, ['mungkhudshop']);
      await page.evaluate(() => localStorage.removeItem('bc_rolePermissions'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-module="mungkhudshop"]')).toBeVisible();
      await expect(page.locator('[data-module="dashboard"]')).toHaveCount(0);
    } finally {
      await saveManagerTools(request, restoreTools);
    }
  });
});
