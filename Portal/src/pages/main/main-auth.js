import { AuthService } from '../../services/authService.js';
import { pb } from '../../services/pocketbase.js';
import { clearAuthToken } from '@shared/nocodb-adapter.js';
import { fetchBranchMetadata, getBranchLabel as getMetadataBranchLabel, getBranchOptions } from '@shared/branch-metadata.js';
import {
    clearAppSession,
    clearLegacySessionKeys,
    getSession,
    getSessionLanguage,
    isRealBranchId,
    setDevSession as writeDevSession,
    setSessionBranch,
    setSessionLanguage
} from '@shared/session.js';
import { ConfigService } from '../../services/configService.js';

const TOKEN_KEY = 'bcauto_jwt';

const i18n = {
    th: {
        brandSubtitle: 'ศูนย์รวมระบบปฏิบัติงาน',
        switchRole: 'เปลี่ยนบทบาท',
        devMode: 'DEV ACCESS MODE',
        devHeading: 'เลือกบทบาทเพื่อเข้าใช้งานทันที',
        devCopy: 'ช่วงพัฒนานี้ยังไม่ใช้รหัสผ่าน เลือกบทบาทและสาขาเพื่อทดสอบหน้าจอและสิทธิ์การเข้าถึงได้รวดเร็ว',
        devNote: 'โหมดนี้สำหรับพัฒนาและทดสอบเท่านั้น ระบบยืนยันตัวตนจริงจะถูกเพิ่มกลับเข้ามาภายหลัง',
        chooseRole: '1. เลือกบทบาท',
        chooseBranch: '2. เลือกสาขา',
        enterPortal: 'เข้าสู่ Portal',
        portalKicker: 'ระบบกลางสำหรับทีม BC Auto',
        portalSubtitle: 'เลือกโมดูลที่ต้องการใช้งาน ระบบจะแสดงเฉพาะส่วนที่บทบาทนี้เข้าถึงได้',
        currentSession: 'เซสชันทดสอบ',
        footerText: 'BC AutoXperience Dev Portal',
        ready: 'พร้อมใช้งาน',
        inProgress: 'กำลังพัฒนา',
        openModule: 'เปิดโมดูล',
        noModules: 'ไม่มีโมดูลสำหรับบทบาทนี้',
        allBranches: 'Branch scope',
        adminTitle: 'ผู้ดูแลระบบ',
        adminDesc: 'เข้าถึงทุกโมดูลและตั้งค่าระบบ',
        ownerTitle: 'เจ้าของ',
        ownerDesc: 'Branch-scoped business overview',
        managerTitle: 'ผู้จัดการ',
        managerDesc: 'ดูแดชบอร์ดและจัดการทีม',
        saTitle: 'S.A.',
        saDesc: 'งานบริการ ลูกค้า และเอกสาร',
        mechanicTitle: 'ช่าง / Technician',
        mechanicDesc: 'งานซ่อมและ HR ส่วนตัว',
        greeting: name => `สวัสดีคุณ ${name}`,
        sessionLine: (role, branch) => `${role} • ${branch}`,
        moduleGarageTitle: 'ระบบจัดการอู่',
        moduleGarageDesc: 'ใบงาน สต็อก เอกสาร จัดซื้อ และงานหน้าร้านของ MungkhudShop',
        moduleHrTitle: 'ระบบบุคคล',
        moduleHrDesc: 'เช็คอิน/เช็คเอาท์ ลา และตรวจสอบเงินเดือนตามสิทธิ์',
        moduleKnowledgeTitle: 'คลังความรู้เทคนิค',
        moduleKnowledgeDesc: 'ข้อมูลรถแต่ละรุ่น เทคนิคการซ่อม และแนวทางตรวจวิเคราะห์',
        moduleManagerTitle: 'แดชบอร์ดผู้จัดการ',
        moduleManagerDesc: 'รายรับ กำไร ค่าใช้จ่าย และภาพรวมการดำเนินงานแบบเรียลไทม์',
        moduleSaTitle: 'ฐานข้อมูลและเอกสาร S.A.',
        moduleSaDesc: 'บันทึกราคาซัพพลายเออร์ เอกสารบริการ และข้อมูลอ้างอิงของทีม S.A.',
        moduleAdminTitle: 'ชุดเครื่องมือผู้ดูแลระบบ',
        moduleAdminDesc: 'ลงทะเบียน จัดการ ลบผู้ใช้ กำหนดสิทธิ์ และตั้งค่าระบบ'
    },
    en: {
        brandSubtitle: 'Operations portal',
        switchRole: 'Switch role',
        devMode: 'DEV ACCESS MODE',
        devHeading: 'Choose a role and enter instantly',
        devCopy: 'Authentication is bypassed during development. Pick a role and branch to test screens and access levels quickly.',
        devNote: 'This mode is for development and manual testing only. Real authentication will be added back later.',
        chooseRole: '1. Choose role',
        chooseBranch: '2. Choose branch',
        enterPortal: 'Enter Portal',
        portalKicker: 'Central workspace for BC Auto teams',
        portalSubtitle: 'Choose a module. The portal only shows what this role can access.',
        currentSession: 'Test session',
        footerText: 'BC AutoXperience Dev Portal',
        ready: 'Ready',
        inProgress: 'In progress',
        openModule: 'Open module',
        noModules: 'No modules available for this role',
        allBranches: 'Branch scope',
        adminTitle: 'Admin',
        adminDesc: 'Access all modules and system settings',
        ownerTitle: 'Owner',
        ownerDesc: 'Branch-scoped business overview',
        managerTitle: 'Manager',
        managerDesc: 'Use dashboards and manage teams',
        saTitle: 'S.A.',
        saDesc: 'Service, customer, and documentation work',
        mechanicTitle: 'Mechanic / Technician',
        mechanicDesc: 'Repair workflow and personal HR',
        greeting: name => `Welcome, ${name}`,
        sessionLine: (role, branch) => `${role} • ${branch}`,
        moduleGarageTitle: 'Garage Management System',
        moduleGarageDesc: 'Jobs, stock, documents, procurement, and MungkhudShop operations',
        moduleHrTitle: 'HR Module',
        moduleHrDesc: 'Check in/out, leave requests, and payroll access by role',
        moduleKnowledgeTitle: 'Technical Knowledge',
        moduleKnowledgeDesc: 'Vehicle model data, repair tips, diagnostic references, and team knowledge',
        moduleManagerTitle: 'Manager Dashboard',
        moduleManagerDesc: 'Real-time revenue, profit, expenses, and operational updates',
        moduleSaTitle: 'S.A. Database and Documentation',
        moduleSaDesc: 'Supplier prices, service documentation, and S.A. team reference records',
        moduleAdminTitle: 'Admin Suite',
        moduleAdminDesc: 'Register, manage, remove users, configure roles, and adjust system settings'
    }
};

const roles = [
    { id: 'admin', icon: 'admin_panel_settings', title: 'adminTitle', desc: 'adminDesc' },
    { id: 'owner', icon: 'workspace_premium', title: 'ownerTitle', desc: 'ownerDesc' },
    { id: 'manager', icon: 'monitoring', title: 'managerTitle', desc: 'managerDesc' },
    { id: 'sa', icon: 'support_agent', title: 'saTitle', desc: 'saDesc' },
    { id: 'mechanic', icon: 'engineering', title: 'mechanicTitle', desc: 'mechanicDesc' }
];

let branches = [];

const portalModules = [
    {
        id: 'mungkhudshop',
        title: 'moduleGarageTitle',
        desc: 'moduleGarageDesc',
        icon: 'store',
        color: 'green',
        path: '__mungkhudshop__',
        fallbackRoles: ['admin', 'owner', 'manager', 'sa', 'mechanic'],
        toolIds: ['mungkhudshop', 'mechanic_dashboard']
    },
    {
        id: 'hr_portal',
        title: 'moduleHrTitle',
        desc: 'moduleHrDesc',
        icon: 'groups',
        color: 'blue',
        path: '/pages/hr/checkin.html',
        fallbackRoles: ['admin', 'owner', 'manager', 'sa', 'mechanic'],
        toolIds: ['checkin', 'hr_dashboard']
    },
    {
        id: 'technical_knowledge',
        title: 'moduleKnowledgeTitle',
        desc: 'moduleKnowledgeDesc',
        icon: 'tips_and_updates',
        color: 'gold',
        path: '/pages/knowledge/index.html',
        fallbackRoles: ['admin', 'owner', 'manager', 'sa', 'mechanic'],
        toolIds: ['technical_knowledge']
    },
    {
        id: 'dashboard',
        title: 'moduleManagerTitle',
        desc: 'moduleManagerDesc',
        icon: 'bar_chart',
        color: 'blue',
        path: '/pages/dashboard/index.html',
        fallbackRoles: ['admin', 'owner', 'manager'],
        toolIds: ['dashboard']
    },
    {
        id: 'sa_docs',
        title: 'moduleSaTitle',
        desc: 'moduleSaDesc',
        icon: 'folder_managed',
        color: 'green',
        path: '/pages/sa-docs/index.html',
        fallbackRoles: ['admin', 'owner', 'manager', 'sa'],
        toolIds: ['sa_docs']
    },
    {
        id: 'admin_suite',
        title: 'moduleAdminTitle',
        desc: 'moduleAdminDesc',
        icon: 'settings',
        color: 'red',
        path: '/pages/admin/index.html',
        fallbackRoles: ['admin'],
        toolIds: ['admin_suite']
    }
];

const initialSession = getSession();
let selectedRole = initialSession.role || '';
let selectedBranch = isRealBranchId(initialSession.branchId) ? initialSession.branchId : '';
let lang = getSessionLanguage();

function consumeReturnFromModule() {
    const params = new URLSearchParams(window.location.search);
    const fromModule = params.get('from');
    const reason = params.get('reason');
    if (fromModule !== 'mungkhudshop' && !reason) return;

    clearAuthToken();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('mungkhud_jwt');
    sessionStorage.removeItem('mungkhud_jwt');
    localStorage.removeItem('mungkhud_auth');
    sessionStorage.removeItem('mungkhud_auth');

    params.delete('from');
    params.delete('reason');
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
}

function normalizeLang(value) {
    return value === 'en' ? 'en' : 'th';
}

function t(key, ...args) {
    const value = i18n[lang][key] ?? i18n.th[key] ?? key;
    return typeof value === 'function' ? value(...args) : value;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));
}

function getRoleLabel(roleId) {
    const role = roles.find(r => r.id === roleId);
    return role ? t(role.title) : roleId;
}

function getBranchLabel(branchId) {
    return getBranchLabelFromMetadata(branchId) || branchId;
}

function getBranchLabelFromMetadata(branchId) {
    return getMetadataBranchLabel(branchId, branches, lang);
}

function defaultBranchForRole(roleId) {
    const scoped = branchOptionsForRole(roleId);
    return scoped[0]?.id || '';
}

function branchOptionsForRole(roleId) {
    return getBranchOptions(branches, { scopedOnly: true })
        .filter(branch => isRealBranchId(branch.branch_id || branch.id))
        .map(branch => ({ ...branch, id: branch.branch_id || branch.id }));
}

async function loadBranchMetadata() {
    try {
        branches = (await fetchBranchMetadata({ includeAll: false }))
            .map(branch => ({ ...branch, id: branch.branch_id || branch.id }));
    } catch (err) {
        console.warn('[Portal] Could not load branch metadata:', err.message);
    }
}

function applyLanguage() {
    document.documentElement.lang = lang;
    setSessionLanguage(lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    renderRoleChoices();
    renderBranchChoices();
    renderPortal();
}

function renderRoleChoices() {
    const grid = document.getElementById('roleGrid');
    if (!grid) return;
    grid.innerHTML = roles.map(role => `
        <button type="button" class="choice-card ${selectedRole === role.id ? 'selected' : ''}" data-role="${role.id}">
            <span class="choice-icon"><span class="material-icons-outlined">${role.icon}</span></span>
            <span>
                <span class="choice-title">${escapeHtml(t(role.title))}</span>
                <span class="choice-desc">${escapeHtml(t(role.desc))}</span>
            </span>
        </button>
    `).join('');
    grid.querySelectorAll('[data-role]').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedRole = btn.dataset.role;
            const allowedBranches = branchOptionsForRole(selectedRole).map(b => b.id);
            if (!allowedBranches.includes(selectedBranch)) {
                selectedBranch = defaultBranchForRole(selectedRole);
            }
            renderRoleChoices();
            renderBranchChoices();
            updateEnterState();
        });
    });
}

function renderBranchChoices() {
    const grid = document.getElementById('branchGrid');
    if (!grid) return;
    const options = branchOptionsForRole(selectedRole);
    grid.innerHTML = options.map(branch => `
        <button type="button" class="choice-card ${selectedBranch === branch.id ? 'selected' : ''}" data-branch="${branch.id}">
            <span class="choice-icon"><span class="material-icons-outlined">storefront</span></span>
            <span>
                <span class="choice-title">${escapeHtml(getBranchLabel(branch.id))}</span>
                <span class="choice-desc">${escapeHtml(branch.id)}</span>
            </span>
        </button>
    `).join('');
    grid.querySelectorAll('[data-branch]').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedBranch = btn.dataset.branch;
            renderBranchChoices();
            updateEnterState();
        });
    });
}

function updateEnterState() {
    const btn = document.getElementById('enterPortalBtn');
    if (btn) btn.disabled = !(selectedRole && selectedBranch);
}

function createDevUser(role, branch) {
    return {
        id: `dev-${role}-${branch}`.replace(/[^a-z0-9_-]/gi, '-').toLowerCase(),
        username: `dev_${role}`,
        email: `dev_${role}@bcauto.local`,
        name: `Dev ${getRoleLabel(role)}`,
        display_name: `Dev ${getRoleLabel(role)}`,
        role,
        branch,
        branch_id: branch,
        active: true,
        dev_mode: true
    };
}

function setDevSession(role, branch) {
    const user = createDevUser(role, branch);
    writeDevSession({
        role,
        userId: user.id,
        userName: user.display_name,
        authModel: user,
        branchId: branch,
        branchLocked: true
    });
    clearLegacySessionKeys();
    clearAuthToken();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

function clearDevSession() {
    selectedRole = '';
    selectedBranch = '';
    clearAppSession();
    clearLegacySessionKeys();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    clearAuthToken();
    pb.authStore.clear();
    renderRoleChoices();
    renderBranchChoices();
    updateEnterState();
    refreshUI();
}

function hasModuleAccess(module, role, branch) {
    const ids = module.toolIds || [module.id];
    const configAllows = ids.some(id => ConfigService.hasAccess(role, id, branch));
    if (configAllows) return true;
    if (ConfigService.dynamicPermissionsLoaded && ConfigService.hasPermissionMetadata(role, branch)) return false;
    return (module.fallbackRoles || module.roles || []).includes(role);
}

function resolveModuleUrl(module) {
    let url = module.path;
    if (url === '__mungkhudshop__' || url === '__mungkhudshop_mechanic__') {
        const configured = ConfigService.getSetting('mungkhudshop_url');
        const targetRoute = url === '__mungkhudshop_mechanic__' || AuthService.getUser()?.role === 'mechanic'
            ? '/#/mechanic-kpi'
            : '/#/dashboard';
        if (configured) {
            url = configured.replace(/\/$/, '') + targetRoute;
        } else {
            const currentPort = window.location.port || '8092';
            const shopPort = currentPort === '3000' ? '4000' : (currentPort === '9092' ? '9091' : '8091');
            url = `${window.location.protocol}//${window.location.hostname}:${shopPort}${targetRoute}`;
        }
    }

    const isExternal = url.startsWith('http') || module.id === 'mungkhudshop';
    if (isExternal && typeof AuthService.getSSOToken === 'function') {
        const token = AuthService.getSSOToken();
        if (token) {
            const separator = url.includes('?') ? '&' : '?';
            if (url.includes('#')) {
                const parts = url.split('#');
                url = `${parts[0]}${separator}sso_token=${encodeURIComponent(token)}#${parts[1]}`;
            } else {
                url = `${url}${separator}sso_token=${encodeURIComponent(token)}`;
            }
        }
    }
    return url;
}

function renderPortal() {
    const user = AuthService.getUser();
    const grid = document.getElementById('moduleGrid');
    const greeting = document.getElementById('portalGreeting');
    const session = document.getElementById('sessionRoleBranch');
    const time = document.getElementById('sessionTime');
    if (!grid || !user) return;

    const appSession = getSession();
    const branch = isRealBranchId(appSession.branchId) ? appSession.branchId : defaultBranchForRole(user.role);
    const userName = appSession.userName || user.name || getRoleLabel(user.role);
    if (greeting) greeting.textContent = t('greeting', userName);
    if (session) session.textContent = t('sessionLine', getRoleLabel(user.role), getBranchLabel(branch));
    if (time) {
        const locale = lang === 'th' ? 'th-TH' : 'en-US';
        time.textContent = new Date().toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
    }

    const modules = portalModules.filter(module => hasModuleAccess(module, user.role, branch));
    if (modules.length === 0) {
        grid.innerHTML = `<div class="module-card"><p class="module-desc">${escapeHtml(t('noModules'))}</p></div>`;
        return;
    }

    grid.innerHTML = modules.map(module => {
        const statusKey = ['technical_knowledge', 'sa_docs'].includes(module.id) ? 'inProgress' : 'ready';
        const statusClass = statusKey === 'inProgress' ? 'soon' : '';
        return `
            <a class="module-card" href="${escapeHtml(resolveModuleUrl(module))}" data-module="${module.id}">
                <div class="module-head">
                    <span class="module-icon ${module.color || 'blue'}">
                        <span class="material-icons-outlined">${module.icon}</span>
                    </span>
                    <span class="module-status ${statusClass}">${escapeHtml(t(statusKey))}</span>
                </div>
                <div>
                    <h3 class="module-title">${escapeHtml(t(module.title))}</h3>
                    <p class="module-desc">${escapeHtml(t(module.desc))}</p>
                </div>
                <div class="module-foot">
                    <span>${escapeHtml(t('openModule'))}</span>
                    <span class="material-icons-outlined" style="font-size:18px;">arrow_forward</span>
                </div>
            </a>
        `;
    }).join('');
}

function refreshUI() {
    const user = AuthService.getUser();
    const devAccess = document.getElementById('devAccess');
    const portalHome = document.getElementById('portalHome');
    const switchBtn = document.getElementById('switchRoleBtn');

    if (!user) {
        devAccess?.classList.add('active');
        portalHome?.classList.remove('active');
        switchBtn?.classList.remove('visible');
        renderRoleChoices();
        renderBranchChoices();
        updateEnterState();
        return;
    }

    devAccess?.classList.remove('active');
    portalHome?.classList.add('active');
    switchBtn?.classList.add('visible');
    renderPortal();
}

async function init() {
    consumeReturnFromModule();
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.removeItem('bcauto_theme');
    renderRoleChoices();
    renderBranchChoices();
    updateEnterState();
    refreshUI();

    try {
        await ConfigService.init();
    } catch (err) {
        console.warn('[Portal] Could not initialize config service:', err.message);
    }

    document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', () => {
            lang = normalizeLang(btn.dataset.lang);
            applyLanguage();
        });
    });

    document.getElementById('enterPortalBtn')?.addEventListener('click', async () => {
        if (!selectedRole || !selectedBranch) return;
        const enterBtn = document.getElementById('enterPortalBtn');
        if (enterBtn) enterBtn.disabled = true;
        setDevSession(selectedRole, selectedBranch);
        try {
            await ConfigService.init();
        } catch (err) {
            console.warn('[Portal] Could not refresh config after dev session:', err.message);
        } finally {
            if (enterBtn) enterBtn.disabled = false;
            refreshUI();
        }
    });

    document.getElementById('switchRoleBtn')?.addEventListener('click', clearDevSession);

    if (selectedRole && !isRealBranchId(selectedBranch)) {
        selectedBranch = defaultBranchForRole(selectedRole);
    }

    await loadBranchMetadata();
    if (selectedRole) {
        const allowedBranches = branchOptionsForRole(selectedRole).map(b => b.id);
        if (!allowedBranches.includes(selectedBranch)) selectedBranch = defaultBranchForRole(selectedRole);
    }

    applyLanguage();
    refreshUI();
}

window.logoutUser = clearDevSession;
window.refreshUI = refreshUI;
window.switchBranch = branch => {
    if (!isRealBranchId(branch)) return;
    setSessionBranch(branch, { locked: true });
    renderPortal();
};

init();
