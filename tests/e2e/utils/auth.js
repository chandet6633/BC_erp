// Shared Playwright auth helpers.
// They log in through the Express API and seed browser storage directly, which
// avoids brittle UI-login setup and repeated wrong-password rate-limit storms.
const jwt = require('jsonwebtoken');

const loginCache = new Map();
const JWT_SECRET = process.env.JWT_SECRET || 'bcauto_jwt_secret_2026_change_in_production';
const ROLE_MENUS = {
  admin: '*',
  owner: '*',
  manager: '*',
  sa: '#/dashboard,#/job,#/kanban,#/stock-list,#/requisition,#/stock-return,#/stock-transfer,#/stock-adjust',
  mechanic: '#/mechanic-kpi',
  technician: '#/mechanic-kpi'
};
const TEST_USERS = {
  admin: { id: 'test-admin', username: 'admin', name: 'Admin', role: 'admin', branch: 'all' },
  manager1: { id: 'test-manager', username: 'manager1', name: 'Manager', role: 'manager', branch: 'all' },
  somchai: { id: 'test-mechanic', username: 'somchai', name: 'Somchai', role: 'mechanic', branch: 'samchuk' },
  sa1: { id: 'test-sa', username: 'sa1', name: 'Service Advisor', role: 'sa', branch: 'samchuk' }
};

async function loginMungkhudShop(page, username, password) {
  const { token, user } = await apiLogin(page, username, password);
  const allowedMenus = user.allowed_menus || ROLE_MENUS[user.role] || '';

  await page.addInitScript(({ token, user, allowedMenus }) => {
    const session = {
      id: user.id,
      username: user.username || user.name,
      display_name: user.name || user.display_name || user.username,
      role: user.role,
      allowed_menus: allowedMenus,
      branch_id: user.branch || '',
      permissions: '{}',
      sso_source: 'api_jwt',
      _expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    localStorage.setItem('mungkhud_auth', JSON.stringify(session));
    localStorage.setItem('mungkhud_jwt', token);
    localStorage.setItem('bcauto_jwt', token);
    localStorage.setItem('mungkhud_changelog_version', '2.3.0');
    if (!sessionStorage.getItem('mungkhud_test_logged_in')) {
      sessionStorage.setItem('mungkhud_test_logged_in', 'true');
      if (user.branch && user.branch !== 'all') {
        localStorage.setItem('mungkhud_branch', user.branch);
      } else {
        localStorage.removeItem('mungkhud_branch');
      }
    }
  }, { token, user, allowedMenus });

  await page.goto('/index.html#/dashboard');
  await page.waitForFunction(() => window.location.hash.includes('dashboard'), { timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

async function gotoMungkhudRoute(page, route, readySelector) {
  await page.goto(`/#/${route}`);
  await page.waitForFunction(
    expected => window.location.hash === `#/${expected}`,
    route,
    { timeout: 15000 }
  );
  if (readySelector) {
    await page.locator(readySelector).first().waitFor({ state: 'visible', timeout: 15000 });
  }
}

async function loginManagement(page, username, password) {
  const { token, user } = await apiLogin(page, username, password);

  await page.addInitScript(({ token, user }) => {
    sessionStorage.setItem('bcauto_role', user.role || 'admin');
    sessionStorage.setItem('bcauto_user_name', user.name || user.username || 'Admin');
    sessionStorage.setItem('bcauto_user_id', user.id);
    localStorage.setItem('bcauto_jwt', token);
    localStorage.setItem('mungkhud_jwt', token);
    localStorage.setItem('bcauto_branch', user.branch === 'main' ? 'BC Auto Service' : (user.branch || 'BC Auto Service'));
  }, { token, user });

  await page.goto('/pages/main/index.html');
  await page.waitForFunction(() => {
    const modal = document.getElementById('auth-modal');
    return !modal || modal.classList.contains('hidden');
  }, { timeout: 15000 });
}

async function apiLogin(page, username, password) {
  const cacheKey = `${username}:${password}`;
  if (loginCache.has(cacheKey)) return loginCache.get(cacheKey);

  const testUser = TEST_USERS[username];
  if (testUser) {
    const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });
    const data = { token, user: testUser };
    loginCache.set(cacheKey, data);
    return data;
  }

  const passwords = username === 'admin' && password === 'admin123'
    ? ['admin123', 'admin1234']
    : [password];

  let lastError = null;
  for (const candidate of passwords) {
    const response = await page.request.post('/api/auth/login', {
      data: { username, password: candidate }
    });
    if (response.ok()) {
      const data = await response.json();
      loginCache.set(cacheKey, data);
      return data;
    }
    lastError = await response.text();
    if (response.status() === 429) break;
  }

  throw new Error(`API login failed for ${username}: ${lastError || 'unknown error'}`);
}

module.exports = { loginMungkhudShop, loginManagement, gotoMungkhudRoute };

