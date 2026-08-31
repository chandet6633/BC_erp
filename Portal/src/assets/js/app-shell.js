/**
 * app-shell.js
 * Automatically injects the shared top action bar into any Portal page that includes this script.
 * Also handles the global Toast Notification system.
 */

import '../../assets/css/app-shell.css';
import { TOOLS } from '../../registry.js';
import { ConfigService } from '../../services/configService.js';
import { changePassword } from '@shared/nocodb-adapter.js';
import { getSession } from '@shared/session.js';

class AppShell {
    constructor() {
        this.registry = TOOLS;
        this.currentPath = window.location.pathname;
        const appSession = getSession();
        let sRole = appSession.role;
        this.role = (sRole && sRole !== 'null') ? sRole : 'sa';
        let sName = appSession.userName;
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
                if (!tool.path || tool.path.startsWith('http') || tool.path === '__mungkhudshop__' || tool.path === '__mungkhudshop_mechanic__') return false;
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

    buildToastContainer() {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
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
    const appSession = getSession();
    let sRole = appSession.role;
    shell.role = (sRole && sRole !== 'null') ? sRole : 'sa';
    let sName = appSession.userName;
    shell.userName = (sName && sName !== 'null') ? sName : 'User';

    // Remove legacy nav elements if an older shell instance injected them.
    const oldSidebar = document.getElementById('app-sidebar');
    if (oldSidebar) oldSidebar.remove();
    const oldBottomNav = document.getElementById('app-bottom-nav');
    if (oldBottomNav) oldBottomNav.remove();
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
