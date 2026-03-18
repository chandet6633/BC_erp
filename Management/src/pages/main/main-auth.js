import { AuthService } from '../../services/authService.js';
import { pb } from '../../services/pocketbase.js';
import { TOOLS } from '../../registry.js';
import { ConfigService } from '../../services/configService.js';
import { AuditService } from '../../services/auditService.js';

let currentRole = '';
let pinBuffer = '';

// Initialize Config
(async () => {
    await ConfigService.init();
    refreshUI();
})();

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
    admin: {
        label: 'ใส่ PIN Admin',
        iconBg: '#fffbeb',
        iconColor: '#d97706',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
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

    // Build role filter based on selected role
    let roleFilter = '';
    let errorMsg = '';
    if (currentRole === 'manager') {
        roleFilter = `(role='owner' || role='manager')`;
        errorMsg = 'PIN ผู้จัดการไม่ถูกต้อง';
    } else if (currentRole === 'admin') {
        roleFilter = `(role='admin')`;
        errorMsg = 'PIN Admin ไม่ถูกต้อง';
    } else if (currentRole === 'mechanic') {
        roleFilter = `(role='mechanic')`;
        errorMsg = 'PIN ช่างไม่ถูกต้อง';
    } else {
        roleFilter = `(role='sa')`;
        errorMsg = 'รหัส PIN ไม่ถูกต้อง';
    }

    try {
        const res = await pb.collection('users').getFirstListItem(`pin='${pinBuffer}' && ${roleFilter}`);
        if (res) {
            sessionStorage.setItem('bcauto_role', res.role || currentRole);
            sessionStorage.setItem('bcauto_user_name', res.name);
            sessionStorage.setItem('bcauto_user_id', res.id);
            localStorage.setItem('bcauto_branch', res.branch === 'main' ? 'BC Auto Service' : (res.branch || 'BC Auto Service'));
            AuditService.log('login_success', `PIN login: ${res.name} (${res.role}, ${res.branch || 'BC Auto service (วิริยะเซอร์วิส)'})`, 'auth');
            hideModal();
        }
    } catch (e) {
        AuditService.log('login_failed', `Invalid ${currentRole} PIN attempt`, 'auth');
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

    // Resolve MungkhudShop URL from config or fallback to port 8091
    if (url === '__mungkhudshop__') {
        const configured = ConfigService.getSetting('mungkhudshop_url');
        if (configured) {
            url = configured.replace(/\/$/, '') + '/#/dashboard';
        } else {
            url = `${window.location.protocol}//${window.location.hostname}:8091/#/dashboard`;
        }
    }

    // SSO Injection: If the tool is external or explicitly MungkhudShop
    const isExternal = url.startsWith('http') || tool.id === 'mungkhudshop' || tool.id === 'bctool_external';

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
    pb.authStore.clear();
    refreshUI();
    if (typeof window.refreshAppShell === 'function') {
        window.refreshAppShell();
    }
};

function refreshUI() {
    const user = AuthService.getUser();
    const grid = document.getElementById('tool-grid');
    const modal = document.getElementById('auth-modal');

    if (!user) {
        if (modal) modal.classList.remove('hidden');
        if (grid) grid.innerHTML = '';
    } else {
        if (modal) modal.classList.add('hidden');

        const tools = TOOLS.filter(tool => {
            if (tool.hidden) return false;
            const branch = localStorage.getItem('bcauto_branch') || 'BC Auto Service';
            return ConfigService.hasAccess(user.role, tool.id, branch);
        });

        if (grid) {
            grid.innerHTML = tools.map((tool, i) => `
                <a href="javascript:void(0)"
                   onclick="window.handleToolClick(${JSON.stringify(tool).replace(/"/g, '&quot;')})"
                   class="menu-card animate-slide-up"
                   style="animation-delay: ${0.08 * (i + 1)}s"
                   role="button" tabindex="0"
                   aria-label="${tool.title}">
                    <div class="icon">${tool.icon}</div>
                    <div class="title">${tool.title}</div>
                    <div class="desc">${tool.description || tool.group || 'Utility'}</div>
                </a>
            `).join('');
        }

        if (typeof window.refreshAppShell === 'function') {
            window.refreshAppShell();
        }
    }
}

// Expose refreshUI globally just in case other scripts need it
window.refreshUI = refreshUI;

// Execute immediately on load
refreshUI();
