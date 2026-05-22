/**
 * app-shell.js
 * Automatically injects the global PWA Desktop Sidebar, Mobile Bottom Navigation, 
 * and Top Action Bar into any page that includes this script.
 * Also handles the global Toast Notification system.
 */

import '../../assets/css/app-shell.css';
import { TOOLS } from '../../registry.js';
import { ConfigService } from '../../services/configService.js';
import { changePassword } from '@shared/nocodb-adapter.js';

class AppShell {
    constructor() {
        this.registry = TOOLS;
        this.currentPath = window.location.pathname;
        let sRole = sessionStorage.getItem('bcauto_role');
        this.role = (sRole && sRole !== 'null') ? sRole : 'sa';
        let sName = sessionStorage.getItem('bcauto_user_name');
        this.userName = (sName && sName !== 'null') ? sName : 'User';

        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        // Prevent double injection
        if (document.getElementById('app-shell-injected')) return;

        // Ensure ConfigService is ready before building the shell
        if (window['ConfigService'] || typeof ConfigService !== 'undefined') {
            const service = window['ConfigService'] || ConfigService;
            if (typeof service.init === 'function') {
                try {
                    await service.init();
                } catch {
                    // ConfigService is optional during early boot; keep shell rendering.
                }
            }
        }

        // ── ROUTE GUARD ──
        // Check if the current page is allowed for this user's role.
        // Skip guard on the main/login page itself.
        const path = this.currentPath;
        const isMainPage = path === '/' || path.includes('/pages/main/');
        if (!isMainPage && this.role) {
            const matchedTool = this.registry.find(tool => {
                if (!tool.path || tool.path.startsWith('http') || tool.path === '__mungkhudshop__') return false;
                return path.includes(tool.path.replace('/index.html', '').replace('.html', ''));
            });

            if (matchedTool && matchedTool.roles && !matchedTool.roles.includes(this.role)) {
                // Block access — replace page content
                document.body.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#e0e7ff 100%);
                        font-family:'Inter',-apple-system,sans-serif;text-align:center;padding:40px;">
                        <div style="background:white;border-radius:24px;padding:48px 40px;
                            box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:420px;width:100%;">
                            <div style="width:72px;height:72px;border-radius:50%;
                                background:linear-gradient(135deg,#fee2e2,#fecaca);
                                display:flex;align-items:center;justify-content:center;
                                margin:0 auto 24px;font-size:32px;">🔒</div>
                            <h1 style="font-size:1.5rem;font-weight:800;color:#1e293b;margin:0 0 8px;">
                                ไม่มีสิทธิ์เข้าถึง</h1>
                            <p style="color:#64748b;font-size:0.9rem;margin:0 0 24px;line-height:1.6;">
                                บัญชีของคุณ (${this.role}) ไม่มีสิทธิ์เข้าถึงหน้านี้<br>
                                กรุณาติดต่อผู้จัดการหากต้องการเข้าถึง</p>
                            <a href="/pages/main/index.html"
                                style="display:inline-flex;align-items:center;gap:8px;
                                padding:12px 24px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);
                                color:white;border-radius:12px;text-decoration:none;
                                font-weight:600;font-size:0.9rem;
                                transition:transform 0.2s,box-shadow 0.2s;"
                                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(59,130,246,0.3)'"
                                onmouseout="this.style.transform='';this.style.boxShadow=''">
                                ← กลับหน้าหลัก
                            </a>
                        </div>
                    </div>`;
                return; // Don't build the shell
            }
        }

        // 1. Wrap existing body content into the main container
        this.wrapContent();

        // 2. Build UI Shell Components
        this.buildTopbar();
        this.buildSidebar();
        this.buildBottomNav();
        this.buildToastContainer();

        // Mark as injected
        const marker = document.createElement('div');
        marker.id = 'app-shell-injected';
        marker.style.display = 'none';
        document.body.appendChild(marker);
    }

    wrapContent() {
        // Move everything currently in body into an <article class="content-wrapper">
        // inside <main id="app-main-content"> inside <div id="app-container">

        const originalBodyChildren = Array.from(document.body.children);

        const container = document.createElement('div');
        container.id = 'app-container';

        const mainContent = document.createElement('main');
        mainContent.id = 'app-main-content';

        const wrapper = document.createElement('article');
        wrapper.className = 'content-wrapper';

        // Move children (skip scripts at the very end to prevent breaking logic if possible, 
        // though moving standard DOM elements is fine).
        originalBodyChildren.forEach(child => {
            if (child.tagName !== 'SCRIPT' && child.id !== 'auth-modal') {
                wrapper.appendChild(child);
            }
        });

        mainContent.appendChild(wrapper);
        container.appendChild(mainContent);

        // Prepend container to body
        document.body.insertBefore(container, document.body.firstChild);

        // 3. Register Service Worker (PWA)
        if ('serviceWorker' in navigator) {
            const register = () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW Registered', reg.scope))
                    .catch(err => console.log('SW Failed', err));
            };

            if (document.readyState === 'complete') {
                register();
            } else {
                window.addEventListener('load', register);
            }
        }
    }

    getAuthorizedTools() {
        return this.registry.filter(tool => {
            if (tool.hidden) return false;
            const branch = localStorage.getItem('bcauto_branch') || 'BC Auto Service';
            if (window['ConfigService'] || typeof ConfigService !== 'undefined') {
                const service = window['ConfigService'] || ConfigService;
                return service.hasAccess(this.role, tool.id, branch);
            }
            if (!tool.roles) return true;
            return tool.roles.includes(this.role);
        });
    }

    resolveToolPath(tool) {
        let href = tool.path;
        // Resolve MungkhudShop placeholder
        if (href === '__mungkhudshop__') {
            const service = window['ConfigService'] || ConfigService;
            const configured = service && typeof service.getSetting === 'function'
                ? service.getSetting('mungkhudshop_url') : null;
            if (configured) {
                href = configured.replace(/\/$/, '') + '/#/dashboard';
            } else {
                const currentPort = window.location.port || '8092';
                const shopPort = currentPort === '9092' ? '9091' : '8091';
                href = `${window.location.protocol}//${window.location.hostname}:${shopPort}/#/dashboard`;
            }
            return href;
        }
        // Standard relative path resolution
        if (this.currentPath.includes('/pages/') && href.startsWith('./pages/')) {
            href = '../' + href.replace('./pages/', '');
        } else if (href.startsWith('./')) {
            href = '../' + href.replace('./', '');
        }
        return href;
    }

    buildTopbar() {
        const topbar = document.createElement('header');
        topbar.id = 'app-topbar';

        // Title Area
        const leftArea = document.createElement('div');
        leftArea.className = 'topbar-left';

        // Find current tool title
        const currentTool = this.registry.find(t => this.currentPath.includes(t.path.replace('./', '')));
        const titleText = currentTool ? currentTool.title : '<img src="/logo-app.png?v=7" alt="Logo" style="height: 38px; vertical-align: middle; margin-right: 12px; margin-top: -6px;" />BC AUTO XPERIENCE';

        leftArea.innerHTML = `<h1 class="topbar-title">${titleText}</h1>`;

        // Right Area (Branch Switcher Mount + User Profile)
        const rightArea = document.createElement('div');
        rightArea.className = 'topbar-right';

        // Branch Switcher mounting point
        const branchMount = document.createElement('div');
        branchMount.id = 'branch-switcher';

        // User Actions Container
        const userActions = document.createElement('div');
        userActions.style.display = 'flex';
        userActions.style.gap = '8px';

        // Change Password Button
        const changePwdBtn = document.createElement('button');
        changePwdBtn.className = 'btn btn-outline btn-sm';
        changePwdBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span class="d-none d-md-inline" style="margin-left: 6px;">เปลี่ยนรหัสผ่าน</span>
        `;
        changePwdBtn.onclick = () => this.openChangePasswordModal();

        // Logout Button
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn btn btn-outline-danger btn-sm';
        logoutBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="d-none d-md-inline" style="margin-left: 6px;">ออกระบบ</span>
        `;
        logoutBtn.onclick = () => {
            if (typeof window.logoutUser === 'function') {
                window.logoutUser();
            } else if (window.AuthService && typeof window.AuthService.logout === 'function') {
                window.AuthService.logout();
            } else {
                // Fallback if services fail to load natively
                sessionStorage.clear();
                localStorage.removeItem('pocketbase_auth');
                window.location.href = '../main/index.html';
            }
        };

        userActions.appendChild(changePwdBtn);
        userActions.appendChild(logoutBtn);

        rightArea.appendChild(branchMount);
        rightArea.appendChild(userActions);

        topbar.appendChild(leftArea);
        topbar.appendChild(rightArea);

        document.getElementById('app-container').appendChild(topbar);

        // If the old app logic triggered renderBranchSwitcher(), it will now target this new #branch-switcher.
        if (typeof window['renderBranchSwitcher'] === 'function') {
            setTimeout(() => window['renderBranchSwitcher'](), 100);
        }
    }

    buildSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'app-sidebar';

        // Header
        const header = document.createElement('div');
        header.className = 'sidebar-header';
        header.innerHTML = `<span class="sidebar-logo-text" style="font-size: 1.1rem; display: flex; align-items: center;"><img src="/logo-app.png?v=7" alt="Logo" style="height: 34px; margin-right: 10px;" />BC AUTO XPERIENCE</span>`;
        sidebar.appendChild(header);

        // Navigation Links
        const content = document.createElement('nav');
        content.className = 'sidebar-content';

        const tools = this.getAuthorizedTools();

        // Always add Home
        const homeLink = this.createNavItem('หน้าหลัก', '../main/index.html', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>');
        content.appendChild(homeLink);

        tools.forEach(tool => {
            const href = this.resolveToolPath(tool);

            const link = this.createNavItem(tool.title, href, this.getIconForGroup(tool.group));

            // MungkhudShop: resolve URL at click-time (ConfigService may not be ready at render-time)
            if (tool.path === '__mungkhudshop__') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const resolved = this.resolveToolPath(tool);
                    window.location.href = this.injectSSO(resolved);
                });
            }

            // Mark active
            if (tool.path !== '__mungkhudshop__' && this.currentPath.includes(tool.path.replace('./pages/', '').replace('/index.html', ''))) {
                link.classList.add('active');
            }

            content.appendChild(link);
        });

        // Footer (User Info)
        const footer = document.createElement('div');
        footer.className = 'sidebar-footer';

        const roleLabel = this.role === 'admin' ? 'Admin' : (this.role === 'owner' ? 'Owner' : (this.role === 'manager' ? 'Manager' : (this.role === 'mechanic' ? 'Mechanic' : (this.role === 'sa' ? 'SA' : 'Employee'))));
        const branch = localStorage.getItem('bcauto_branch') || 'BC Auto Service';
        const branchLabel = branch === 'suphanburi' ? 'BC Auto เมืองสุพรรณ' : (branch === 'samchuk' ? 'BC AUTO XPERIENCE (สามชุก)' : 'BC Auto Service (วิริยะเซอร์วิส)');

        footer.innerHTML = `
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-dark);">${this.userName}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                <span>Role: ${roleLabel}</span> • <span>${branchLabel}</span>
            </div>
        `;

        sidebar.appendChild(content);
        sidebar.appendChild(footer);

        document.getElementById('app-container').appendChild(sidebar);
    }

    buildBottomNav() {
        const bottomNav = document.createElement('nav');
        bottomNav.id = 'app-bottom-nav';

        const inner = document.createElement('div');
        inner.className = 'bottom-nav-inner';

        const tools = this.getAuthorizedTools();
        // Limit to 4 most important tools for bottom nav
        const topTools = tools.slice(0, 4);

        // Home
        const homeLink = this.createBottomNavItem('หน้าหลัก', '../main/index.html', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>');
        inner.appendChild(homeLink);

        topTools.forEach(tool => {
            const href = this.resolveToolPath(tool);

            const link = this.createBottomNavItem(tool.title, href, this.getIconForGroup(tool.group));

            // MungkhudShop: resolve URL at click-time (ConfigService may not be ready at render-time)
            if (tool.path === '__mungkhudshop__') {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const resolved = this.resolveToolPath(tool);
                    window.location.href = this.injectSSO(resolved);
                });
            }

            if (tool.path !== '__mungkhudshop__' && this.currentPath.includes(tool.path.replace('./pages/', '').replace('/index.html', ''))) {
                link.classList.add('active');
            }
            inner.appendChild(link);
        });

        bottomNav.appendChild(inner);
        document.getElementById('app-container').appendChild(bottomNav);
    }

    buildToastContainer() {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
    }

    // Helpers
    injectSSO(url) {
        if (!url || (!url.startsWith('http') && !url.includes('mungkhudshop'))) return url;
        const AuthService = window['AuthService'];
        if (AuthService && typeof AuthService.getSSOToken === 'function') {
            const token = AuthService.getSSOToken();
            if (token) {
                const separator = url.includes('?') ? '&' : '?';
                if (url.includes('#')) {
                    const parts = url.split('#');
                    return `${parts[0]}${separator}sso_token=${token}#${parts[1]}`;
                }
                return `${url}${separator}sso_token=${token}`;
            }
        }
        return url;
    }

    createNavItem(title, href, iconSvg) {
        const a = document.createElement('a');
        a.href = this.injectSSO(href);
        a.className = 'nav-item';
        a.innerHTML = `${iconSvg} <span>${title}</span>`;
        return a;
    }

    createBottomNavItem(title, href, iconSvg) {
        const a = document.createElement('a');
        a.href = this.injectSSO(href);
        a.className = 'bottom-nav-item';
        // Truncate long titles for mobile
        let shortTitle = title.split(' ')[0];
        if (title.includes('รายรับ')) shortTitle = 'รายรับ';
        if (title.includes('จัดการข้อมูล')) shortTitle = 'Database';
        if (title.includes('HR')) shortTitle = 'HR';

        a.innerHTML = `${iconSvg} <span>${shortTitle}</span>`;
        return a;
    }

    openChangePasswordModal() {
        let modal = document.getElementById('change-password-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'change-password-modal';
            modal.className = 'reg-modal-overlay';
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.background = 'rgba(15, 23, 42, 0.5)';
            modal.style.backdropFilter = 'blur(4px)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = '9999';
            modal.innerHTML = `
                <div class="reg-modal" style="background: white; border-radius: 24px; padding: 28px; width: 100%; max-width: 400px; box-shadow: 0 32px 64px -12px rgba(0,0,0,0.2);">
                    <h3 style="margin-bottom: 20px; font-size: 1.1rem; font-weight: 700;">🔑 เปลี่ยนรหัสผ่าน</h3>
                    <form id="cp-form">
                        <div class="form-group" style="margin-bottom: 14px;">
                            <label style="display:block; font-size:14px; font-weight:600; margin-bottom:4px;">รหัสผ่านปัจจุบัน</label>
                            <input type="password" id="cp-current" class="input" style="width:100%; padding:10px; border-radius:8px; border:1px solid #e2e8f0;" required />
                        </div>
                        <div class="form-group" style="margin-bottom: 14px;">
                            <label style="display:block; font-size:14px; font-weight:600; margin-bottom:4px;">รหัสผ่านใหม่</label>
                            <input type="password" id="cp-new" class="input" style="width:100%; padding:10px; border-radius:8px; border:1px solid #e2e8f0;" required minlength="8" />
                        </div>
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display:block; font-size:14px; font-weight:600; margin-bottom:4px;">ยืนยันรหัสผ่านใหม่</label>
                            <input type="password" id="cp-confirm" class="input" style="width:100%; padding:10px; border-radius:8px; border:1px solid #e2e8f0;" required minlength="8" />
                        </div>
                        <div id="cp-error" style="color: #ef4444; font-size: 14px; margin-bottom: 16px; display: none;"></div>
                        <div style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button type="button" class="btn btn-outline btn-sm" id="cp-cancel" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; cursor:pointer;">ยกเลิก</button>
                            <button type="submit" class="btn btn-primary btn-sm" id="cp-submit" style="padding: 8px 16px; border-radius: 8px; background: #2563eb; color: white; border:none; cursor:pointer; font-weight:600;">บันทึก</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('cp-cancel').onclick = () => {
                modal.style.display = 'none';
            };

            document.getElementById('cp-form').onsubmit = async (e) => {
                e.preventDefault();
                const current = document.getElementById('cp-current').value;
                const newPwd = document.getElementById('cp-new').value;
                const confirm = document.getElementById('cp-confirm').value;
                const errorEl = document.getElementById('cp-error');
                const submitBtn = document.getElementById('cp-submit');

                if (newPwd !== confirm) {
                    errorEl.textContent = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน';
                    errorEl.style.display = 'block';
                    return;
                }

                errorEl.style.display = 'none';
                submitBtn.disabled = true;
                submitBtn.textContent = 'กำลังบันทึก...';

                try {
                    await changePassword(current, newPwd);
                    alert('เปลี่ยนรหัสผ่านสำเร็จ!');
                    modal.style.display = 'none';
                } catch (err) {
                    errorEl.textContent = err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
                    errorEl.style.display = 'block';
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'บันทึก';
                }
            };
        }
        
        document.getElementById('cp-form').reset();
        document.getElementById('cp-error').style.display = 'none';
        modal.style.display = 'flex';
    }

    getIconForGroup(group) {
        switch (group) {
            case 'transactions': return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';
            case 'reports': return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>';
            case 'hr': return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
            case 'admin': return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
            default: return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>';
        }
    }
}

// Instantiate globally
window['BCAppShell'] = new AppShell();

window['refreshAppShell'] = async function () {
    const shell = window['BCAppShell'];
    if (!shell) return;

    // Prevent UI race conditions: if init() hasn't created the wrapper yet,
    // we don't need to rebuild anything. The upcoming init() will read the fresh state.
    if (!document.getElementById('app-container')) return;

    // Refresh state from storage
    let sRole = sessionStorage.getItem('bcauto_role');
    shell.role = (sRole && sRole !== 'null') ? sRole : 'sa';
    let sName = sessionStorage.getItem('bcauto_user_name');
    shell.userName = (sName && sName !== 'null') ? sName : 'User';

    // Clear old elements if they exist
    const oldSidebar = document.getElementById('app-sidebar');
    if (oldSidebar) oldSidebar.remove();
    const oldBottomNav = document.getElementById('app-bottom-nav');
    if (oldBottomNav) oldBottomNav.remove();

    // Rebuild UI components (skip wrapping and topbar to prevent duplicates)
    shell.buildSidebar();
    shell.buildBottomNav();
};

/**
 * Global API: showToast
 * Overrides the old manual toast systems across the app.
 */
window['showToast'] = function (message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found, falling back to alert');
        alert(message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    else if (type === 'danger') icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    else if (type === 'warning') icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    else icon = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    toast.innerHTML = `
        ${icon}
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Wait for transition
    }, 3000);
};
