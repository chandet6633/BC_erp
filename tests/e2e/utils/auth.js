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
  admin: { id: 'test-admin', username: 'admin', name: 'Admin', role: 'admin', branch: 'bc-auto-service' },
  manager1: { id: 'test-manager', username: 'manager1', name: 'Manager', role: 'manager', branch: 'bc-auto-service' },
  somchai: { id: '2', username: 'somchai', name: 'Somchai', role: 'mechanic', branch: 'bc-auto-samchuk' },
  sa1: { id: 'test-sa', username: 'sa1', name: 'Service Advisor', role: 'sa', branch: 'bc-auto-samchuk' }
};

async function loginMungkhudShop(page, username, password) {
  const { user } = await apiLogin(page, username, password);
  const allowedMenus = user.allowed_menus || ROLE_MENUS[user.role] || '';
  const ssoToken = createPortalSsoToken(user);

  await page.addInitScript(({ user, allowedMenus }) => {
    localStorage.setItem('mungkhud_changelog_version', '2.3.0');
    localStorage.setItem('app.session.devAuth', '1');
    localStorage.setItem('app.session.branchId', user.branch || 'bc-auto-service');
    localStorage.setItem('app.session.branchLocked', 'true');
    localStorage.setItem('app.session.role', user.role || '');
    localStorage.setItem('app.session.userId', user.id || '');
    localStorage.setItem('app.session.userName', user.name || user.display_name || user.username || 'Dev User');
    localStorage.setItem('app.session.authModel', JSON.stringify({
      id: user.id,
      username: user.username || user.name,
      display_name: user.name || user.display_name || user.username,
      role: user.role,
      branch_id: user.branch || 'bc-auto-service',
      allowed_menus: allowedMenus,
      dev_mode: true,
      portal_source: 'app.portal'
    }));
  }, { user, allowedMenus });

  await page.goto(`/?sso_token=${encodeURIComponent(ssoToken)}#/dashboard`);
  await page.waitForFunction(() => {
    const auth = localStorage.getItem('mungkhud_auth');
    if (!auth || !window.location.hash.includes('dashboard')) return false;
    try {
        return ['portal', 'app.portal'].includes(JSON.parse(auth).sso_source);
    } catch {
      return false;
    }
  }, { timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

function createPortalSsoToken(user) {
  const payload = {
    id: user.id,
    username: user.username || user.name,
    display_name: user.name || user.display_name || user.username,
    role: user.role,
    branch_id: user.branch || 'bc-auto-service',
    branch_locked: true,
    portal_source: 'app.portal',
    issued_at: Date.now()
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function getDevPortalHeaders(role = 'admin', branch = 'bc-auto-service', user = {}) {
  const testUser = {
    id: user.id || `test-${role}`,
    username: user.username || role,
    name: user.name || role,
    role,
    branch
  };
  return {
    'Content-Type': 'application/json',
    'x-bcauto-dev-auth': '1',
    'x-bcauto-dev-role': testUser.role,
    'x-bcauto-dev-user-id': testUser.id,
    'x-bcauto-dev-user-name': encodeURIComponent(testUser.name || testUser.username),
    'x-bcauto-dev-branch': testUser.branch || 'bc-auto-service'
  };
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

async function loginPortal(page, username, password) {
  const { token, user } = await apiLogin(page, username, password);

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('app.session.role', user.role || 'admin');
    localStorage.setItem('app.session.userName', user.name || user.username || 'Admin');
    localStorage.setItem('app.session.userId', user.id);
    localStorage.setItem('app.session.branchLocked', 'true');
    localStorage.setItem('bcauto_jwt', token);
    localStorage.setItem('mungkhud_jwt', token);
    localStorage.setItem('app.session.branchId', user.branch === 'main' ? 'bc-auto-service' : (user.branch || 'bc-auto-service'));
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

module.exports = { loginMungkhudShop, loginPortal, gotoMungkhudRoute, getDevPortalHeaders };

