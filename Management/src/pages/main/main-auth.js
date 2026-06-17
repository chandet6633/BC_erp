import { AuthService } from '../../services/authService.js';
import { pb } from '../../services/pocketbase.js';
import { loginWithPin, loginWithUsername, changePassword, validateToken, setAuthToken, clearAuthToken } from '@shared/nocodb-adapter.js';
import { TOOLS } from '../../registry.js';
import { ConfigService } from '../../services/configService.js';
import { AuditService } from '../../services/auditService.js';

let currentRole = '';
let pinBuffer = '';

const TOKEN_KEY = 'bcauto_jwt';

// Initialize Config + Auto-Login
(async () => {
    await ConfigService.init();

    // Auto-login: check for stored JWT before showing login modal
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
        try {
            const user = await validateToken(storedToken);
            if (user && !user.must_change_password) {
                setAuthToken(storedToken);
                sessionStorage.setItem('bcauto_role', user.role);
                sessionStorage.setItem('bcauto_user_name', user.name || user.username);
                sessionStorage.setItem('bcauto_user_id', user.id);
                localStorage.setItem('bcauto_branch', user.branch === 'main' ? 'BC Auto Service' : (user.branch || 'BC Auto Service'));
                console.log('[Auth] Auto-login:', user.name);
            }
        } catch { /* token invalid, show login */ }
    }

    refreshUI();

    // Focus username field if login modal visible
    setTimeout(() => {
        const modal = document.getElementById('auth-modal');
        if (modal && !modal.classList.contains('hidden')) {
            document.getElementById('loginUsername')?.focus();
        }
    }, 300);
})();

// ==========================================
// USERNAME/PASSWORD LOGIN (Primary)
// ==========================================
window.submitUsernameLogin = async () => {
    const username = document.getElementById('loginUsername')?.value?.trim()?.toLowerCase();
    const password = document.getElementById('loginPassword')?.value;
    const remember = document.getElementById('rememberMe')?.checked;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('loginBtn');

    if (!username || !password) {
        errorEl.textContent = 'กรุณากรอก username และรหัสผ่าน';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ กำลังเข้าสู่ระบบ...';
    errorEl.style.display = 'none';

    try {
        const { user, token } = await loginWithUsername(username, password);

        // Store JWT for persistent login
        if (remember) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            sessionStorage.setItem(TOKEN_KEY, token);
        }

        // Check force password change
        if (user.must_change_password) {
            document.getElementById('loginFormSection').style.display = 'none';
            document.getElementById('pinRoleSection').style.display = 'none';
            document.getElementById('changePasswordSection').style.display = '';
            document.getElementById('newPassword')?.focus();
            btn.disabled = false;
            btn.textContent = '🔑 เข้าสู่ระบบ';
            return;
        }

        // Store session
        sessionStorage.setItem('bcauto_role', user.role);
        sessionStorage.setItem('bcauto_user_name', user.name || username);
        sessionStorage.setItem('bcauto_user_id', user.id);
        localStorage.setItem('bcauto_branch', user.branch === 'main' ? 'BC Auto Service' : (user.branch || 'BC Auto Service'));

        AuditService.log('login_success', `Password login: ${user.name} (${user.role})`, 'auth');
        hideModal();
    } catch (e) {
        errorEl.textContent = e.message || 'เข้าสู่ระบบไม่สำเร็จ';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '🔑 เข้าสู่ระบบ';
    }
};

// Enter key support
document.addEventListener('keydown', (e) => {
    const loginForm = document.getElementById('loginFormSection');
    if (loginForm && loginForm.style.display !== 'none') {
        if (e.key === 'Enter' && document.activeElement?.id === 'loginUsername') {
            document.getElementById('loginPassword')?.focus();
        } else if (e.key === 'Enter' && document.activeElement?.id === 'loginPassword') {
            window.submitUsernameLogin();
        }
    }
});

// Password visibility toggle
document.getElementById('togglePassword')?.addEventListener('click', () => {
    const pwd = document.getElementById('loginPassword');
    const btn = document.getElementById('togglePassword');
    if (pwd.type === 'password') {
        pwd.type = 'text';
        btn.textContent = '🙈';
    } else {
        pwd.type = 'password';
        btn.textContent = '👁';
    }
});

// ==========================================
// FORCE CHANGE PASSWORD
// ==========================================
window.submitNewPassword = async () => {
    const newPwd = document.getElementById('newPassword')?.value;
    const confirmPwd = document.getElementById('confirmPassword')?.value;
    const errorEl = document.getElementById('change-password-error');
    const btn = document.getElementById('changePasswordBtn');

    if (!newPwd || newPwd.length < 4) {
        errorEl.textContent = 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร';
        errorEl.style.display = 'block';
        return;
    }
    if (newPwd !== confirmPwd) {
        errorEl.textContent = 'รหัสผ่านไม่ตรงกัน';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';
    errorEl.style.display = 'none';

    try {
        await changePassword('', newPwd);
        // Now complete the login
        hideModal();
        location.reload();
    } catch (e) {
        errorEl.textContent = e.message || 'เกิดข้อผิดพลาด';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'ตั้งรหัสผ่าน';
    }
};

// ==========================================
// VIEW SWITCHING (Login form ↔ PIN section)
// ==========================================
window.showPinSection = () => {
    document.getElementById('loginFormSection').style.display = 'none';
    document.getElementById('pinRoleSection').style.display = '';
};

window.showLoginForm = () => {
    document.getElementById('loginFormSection').style.display = '';
    document.getElementById('pinRoleSection').style.display = 'none';
};

// Keyboard support for PIN popup
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('pin-overlay');
    if (overlay && overlay.classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9') {
            window.pressKey(e.key);
        } else if (e.key === 'Backspace') {
            window.clearPIN();
        } else if (e.key === 'Enter') {
            window.submitAuth();
        } else if (e.key === 'Escape') {
            window.closePinPopup();
        }
    }
});

// Role icon configs for PIN popup
const ROLE_CONFIG = {
    manager: {
        label: 'ใส่ PIN ผู้จัดการ',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>'
    },
    sa: {
        label: 'ใส่ PIN SA',
        iconBg: '#f0fdf4',
        iconColor: '#16a34a',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
    },

    mechanic: {
        label: 'ใส่ PIN ช่าง',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
    }
};

window.selectRole = (role) => {
    currentRole = role;
    const config = ROLE_CONFIG[role];
    const iconEl = document.getElementById('pin-popup-icon');
    iconEl.style.background = config.iconBg;
    iconEl.style.color = config.iconColor;
    iconEl.innerHTML = config.icon;
    document.getElementById('pin-instr').textContent = config.label;
    clearPIN();
    document.getElementById('pin-overlay').classList.add('active');
};

window.closePinPopup = () => {
    document.getElementById('pin-overlay').classList.remove('active');
    clearPIN();
};

window.pressKey = (num) => {
    if (pinBuffer.length < 6) {
        pinBuffer += num;
        updateDots();
        document.getElementById('auth-error').classList.add('hidden');
    }
};

window.clearPIN = () => {
    pinBuffer = '';
    updateDots();
    document.getElementById('auth-error').classList.add('hidden');
};

function updateDots() {
    document.querySelectorAll('#pin-overlay .pin-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < pinBuffer.length);
    });
}

window.submitAuth = async () => {
    if (pinBuffer.length < 4) return;
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');

    // Error messages per role
    let errorMsg = '';
    if (currentRole === 'manager') errorMsg = 'PIN ผู้จัดการไม่ถูกต้อง';
    else if (currentRole === 'sa') errorMsg = 'PIN SA ไม่ถูกต้อง';
    else if (currentRole === 'mechanic') errorMsg = 'PIN ช่างไม่ถูกต้อง';
    else errorMsg = 'รหัส PIN ไม่ถูกต้อง';

    try {
        // Call Express API server — PIN verified server-side, JWT returned
        const { user } = await loginWithPin(pinBuffer, currentRole);

        sessionStorage.setItem('bcauto_role', user.role || currentRole);
        sessionStorage.setItem('bcauto_user_name', user.name);
        sessionStorage.setItem('bcauto_user_id', user.id);
        localStorage.setItem('bcauto_branch', user.branch === 'main' ? 'BC Auto Service' : (user.branch || 'BC Auto Service'));
        hideModal();
    } catch (e) {
        pinBuffer = '';
        updateDots();
        errorEl.textContent = errorMsg;
        errorEl.classList.remove('hidden');
    }
};

function hideModal() {
    document.getElementById('pin-overlay').classList.remove('active');
    document.getElementById('auth-modal').classList.add('hidden');
    refreshUI();
}

window.handleToolClick = (tool) => {
    if (tool.branch) localStorage.setItem('bcauto_branch', tool.branch);

    let url = tool.path || tool.url;

    // Resolve MungkhudShop URL from config or auto-detect port
    if (url === '__mungkhudshop__' || url === '__mungkhudshop_mechanic__') {
        const configured = ConfigService.getSetting('mungkhudshop_url');
        if (configured) {
            url = configured.replace(/\/$/, '') + (tool.path === '__mungkhudshop_mechanic__' ? '/#/mechanic-kpi' : '/#/dashboard');
        } else {
            // Auto-detect: Management 9092 → MungkhudShop 9091, Management 8092 → 8091
            const currentPort = window.location.port || '8092';
            const shopPort = currentPort === '9092' ? '9091' : '8091';
            url = `${window.location.protocol}//${window.location.hostname}:${shopPort}${tool.path === '__mungkhudshop_mechanic__' ? '/#/mechanic-kpi' : '/#/dashboard'}`;
        }
    }

    // SSO Injection: If the tool is external or explicitly MungkhudShop
    const isExternal = url.startsWith('http') || tool.id === 'mungkhudshop' || tool.id === 'mechanic_dashboard' || tool.id === 'bctool_external';

    if (isExternal && typeof AuthService.getSSOToken === 'function') {
        const token = AuthService.getSSOToken();
        if (token) {
            const separator = url.includes('?') ? '&' : '?';
            // Inject before hash if hash exists
            if (url.includes('#')) {
                const parts = url.split('#');
                url = `${parts[0]}${separator}sso_token=${token}#${parts[1]}`;
            } else {
                url = `${url}${separator}sso_token=${token}`;
            }
        }
    }

    window.location.href = url;
};

// ==========================================
// BRANCH SWITCHER
// ==========================================
window.switchBranch = (branch) => {
    localStorage.setItem('bcauto_branch', branch);
    updateBranchUI();
    refreshUI();
};

function updateBranchUI() {
    const branch = localStorage.getItem('bcauto_branch') || 'all';
    let label = '';
    if (branch === 'suphanburi') label = 'BC Auto เมืองสุพรรณ';
    else if (branch === 'samchuk') label = 'BC AUTO XPERIENCE (สามชุก)';
    else if (branch === 'BC Auto Service' || branch === 'main') label = 'BC Auto service (วิริยะเซอร์วิส)';
    else label = 'ภาพรวมธุรกิจ (ทุกสาขา)';

    const branchLabelEl = document.getElementById('branch-label');
    if (branchLabelEl) {
        branchLabelEl.textContent = 'กำลังดูข้อมูล: ' + label;
    }

    document.querySelectorAll('.branch-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.branch === branch);
    });
}

// ==========================================
// LOGOUT
// ==========================================
window.logoutUser = () => {
    const userName = sessionStorage.getItem('bcauto_user_name') || 'Unknown';
    AuditService.log('logout', `User logged out: ${userName}`, 'auth');
    sessionStorage.removeItem('bcauto_role');
    sessionStorage.removeItem('bcauto_user_name');
    sessionStorage.removeItem('bcauto_user_id');
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    clearAuthToken();
    pb.authStore.clear();
    refreshUI();
    if (typeof window.refreshAppShell === 'function') {
        window.refreshAppShell();
    }
};

// ==========================================
// SESSION TIMEOUT (30 min idle → auto-logout)
// ==========================================
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let _lastActivity = Date.now();

function resetActivity() { _lastActivity = Date.now(); }

['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
    document.addEventListener(evt, resetActivity, { passive: true });
});

setInterval(() => {
    const user = AuthService.getUser();
    if (!user) return;
    if (Date.now() - _lastActivity > SESSION_TIMEOUT_MS) {
        console.log('[Auth] Session timeout — logging out');
        window.logoutUser();
    }
}, 60_000); // Check every minute

// Start Clock
setInterval(() => {
    const clockEl = document.getElementById('current-date-time');
    if (clockEl && clockEl.querySelector('span')) {
        const now = new Date();
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        clockEl.querySelector('span').textContent = now.toLocaleDateString('th-TH', opts);
    }
}, 1000);

async function fetchDashboardKPIs(branch) {
    try {
        const hasBranch = branch && branch !== 'all' && branch !== 'BC Auto Service' && branch !== 'main';
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const todayStr = todayStart.toISOString().slice(0, 10) + ' 00:00:00';

        const branchLabels = {
            'samchuk': 'สามชุก',
            'suphanburi': 'สุพรรณบุรี',
            'BC Auto Service': 'วิริยะเซอร์วิส',
            'main': 'วิริยะเซอร์วิส'
        };

        // Fetch ALL active jobs (for branch breakdown)
        const activeRes = await pb.collection('jobs').getList(1, 200, {
            filter: `status != 'completed'`
        });

        // Fetch ALL today's jobs (for branch breakdown)
        const todayAllRes = await pb.collection('jobs').getList(1, 200, {
            filter: `created >= '${todayStr}'`
        });

        // --- Active jobs breakdown ---
        let activeTotal = 0;
        const activeBranch = {};
        if (activeRes && activeRes.items) {
            activeRes.items.forEach(j => {
                const bid = j.branch_id || 'ไม่ระบุ';
                if (!activeBranch[bid]) activeBranch[bid] = 0;
                activeBranch[bid]++;
                if (!hasBranch || j.branch_id === branch) activeTotal++;
            });
        }

        // --- Today's cars & revenue breakdown ---
        let todayCount = 0;
        let todayRevenue = 0;
        const todayCars = {};
        const todayRev = {};
        if (todayAllRes && todayAllRes.items) {
            todayAllRes.items.forEach(j => {
                const rev = Number(j.grand_total || 0);
                const bid = j.branch_id || 'ไม่ระบุ';

                if (!todayCars[bid]) todayCars[bid] = 0;
                todayCars[bid]++;

                if (!todayRev[bid]) todayRev[bid] = 0;
                todayRev[bid] += rev;

                if (!hasBranch || j.branch_id === branch) {
                    todayCount++;
                    todayRevenue += rev;
                }
            });
        }

        // Helper: build branch breakdown HTML
        function buildBreakdown(dataMap, options = {}) {
            const { isCurrency = false, color = 'rgba(255,255,255,0.85)' } = options;
            const keys = Object.keys(dataMap);
            if (keys.length === 0) return '';
            let html = '<div class="kpi-breakdown">';
            keys.forEach(bid => {
                const label = branchLabels[bid] || bid;
                const val = dataMap[bid];
                const display = isCurrency ? `฿${val.toLocaleString()}` : val;
                html += `<div class="kpi-branch-row">
                    <span class="kpi-branch-name">${label}</span>
                    <span class="kpi-branch-value" style="color:${color}">${display}</span>
                </div>`;
            });
            html += '</div>';
            return html;
        }

        // Revenue widget: only for financial roles
        const userRole = (AuthService.getUser() || {}).role;
        const canSeeRevenue = ['owner', 'manager', 'admin'].includes(userRole);

        const kpiHtml = `
            <div class="kpi-widget">
                <span class="kpi-widget-label">ใบงานที่กำลังซ่อม</span>
                <span class="kpi-widget-value" style="color: #60a5fa;">${activeTotal}</span>
                ${buildBreakdown(activeBranch, { color: 'rgba(96,165,250,0.9)' })}
            </div>
            <div class="kpi-widget">
                <span class="kpi-widget-label">รถเข้าวันนี้</span>
                <span class="kpi-widget-value" style="color: #34d399;">${todayCount}</span>
                ${buildBreakdown(todayCars, { color: 'rgba(52,211,153,0.9)' })}
            </div>
            ${canSeeRevenue ? `
            <div class="kpi-widget kpi-revenue-widget">
                <span class="kpi-widget-label">รายรับวันนี้ (โดยประมาณ)</span>
                <span class="kpi-widget-value" style="color: #fcd34d;">฿${todayRevenue.toLocaleString()}</span>
                ${buildBreakdown(todayRev, { isCurrency: true, color: 'rgba(252,211,77,0.9)' })}
            </div>
            ` : ''}
        `;
        document.getElementById('hero-kpis').innerHTML = kpiHtml;
    } catch (err) {
        console.error('Failed to fetch KPIs', err);
        document.getElementById('hero-kpis').innerHTML = `<p style="color:white; opacity:0.7">ไม่สามารถโหลดข้อมูลได้</p>`;
    }
}

function refreshUI() {
    const user = AuthService.getUser();
    const cmdCenter = document.getElementById('command-center');
    const categoriesContainer = document.getElementById('tool-categories');
    const modal = document.getElementById('auth-modal');

    if (!user) {
        if (modal) modal.classList.remove('hidden');
        if (cmdCenter) cmdCenter.style.display = 'none';
    } else {
        if (modal) modal.classList.add('hidden');
        if (cmdCenter) cmdCenter.style.display = 'block';

        const userName = sessionStorage.getItem('bcauto_user_name') || 'ผู้ใช้งาน';
        const greetingEl = document.getElementById('greeting-text');
        if (greetingEl) greetingEl.textContent = `สวัสดีคุณ ${userName}`;

        const branch = localStorage.getItem('bcauto_branch') || 'all';
        fetchDashboardKPIs(branch);

        const tools = TOOLS.filter(tool => {
            if (tool.hidden) return false;
            return ConfigService.hasAccess(user.role, tool.id, branch);
        });

        if (categoriesContainer) {
            // Group tools
            const groups = {
                'financial': { title: '<span class="material-icons-outlined" style="font-size:20px;vertical-align:middle;">analytics</span> การเงินและวิเคราะห์', tools: [] },
                'operations': { title: '<span class="material-icons-outlined" style="font-size:20px;vertical-align:middle;">work</span> ปฏิบัติการและบริการ', tools: [] },
                'hr': { title: '<span class="material-icons-outlined" style="font-size:20px;vertical-align:middle;">groups</span> บุคคลและพนักงาน', tools: [] },
                'admin': { title: '<span class="material-icons-outlined" style="font-size:20px;vertical-align:middle;">admin_panel_settings</span> ระบบ', tools: [] }
            };

            tools.forEach(t => {
                const g = t.group || 'operations';
                if (groups[g]) groups[g].tools.push(t);
            });

            let html = '';
            let delayIndex = 0;

            Object.values(groups).forEach(group => {
                if (group.tools.length === 0) return;
                html += `<div class="category-group">
                            <h2 class="category-header">${group.title}</h2>
                            <div class="menu-grid" style="margin-top: 16px;">`;
                group.tools.forEach(tool => {
                    delayIndex++;
                    html += `
                        <a href="javascript:void(0)"
                           onclick="window.handleToolClick(${JSON.stringify(tool).replace(/"/g, '&quot;')})"
                           class="menu-card animate-slide-up"
                           style="animation-delay: ${0.08 * delayIndex}s"
                           role="button" tabindex="0"
                           aria-label="${tool.title}">
                            <div class="icon">${tool.icon}</div>
                            <div class="title">${tool.title}</div>
                            <div class="desc">${tool.description || tool.group || 'Utility'}</div>
                        </a>
                    `;
                });
                html += `   </div>
                          </div>`;
            });

            categoriesContainer.innerHTML = html;
        }

        if (typeof window.refreshAppShell === 'function') {
            window.refreshAppShell();
        }
    }
}

// Expose refreshUI globally just in case other scripts need it
window.refreshUI = refreshUI;

// Force light theme (dark mode removed)
document.documentElement.setAttribute('data-theme', 'light');
localStorage.removeItem('bcauto_theme');

// Execute immediately on load
refreshUI();
