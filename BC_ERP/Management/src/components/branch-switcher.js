/**
 * Branch Switcher Component
 * Reusable branch tab switcher for admin/owner/manager roles.
 * Employees do not see this component (they are locked to their branch).
 *
 * Usage:
 *   import { renderBranchSwitcher } from '../../components/branch-switcher.js';
 *   renderBranchSwitcher('branch-switcher', () => loadData());
 */

import { AuthService } from '../services/authService.js';

const BRANCHES = [
    {
        id: 'all',
        label: 'ภาพรวมธุรกิจ (ทุกสาขา)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`
    },
    {
        id: 'BC Auto Service',
        label: 'BC Auto service (วิริยะเซอร์วิส)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`
    },
    {
        id: 'suphanburi',
        label: 'BC Auto เมืองสุพรรณ',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`
    },
    {
        id: 'samchuk',
        label: 'BC AUTO XPERIENCE (สามชุก)',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
    }
];

/**
 * Render branch switcher tabs into a container element.
 * Deferred to DOMContentLoaded to ensure tool JS is loaded.
 * @param {string} containerId - ID of the container element
 * @param {function} onSwitch - Callback when branch changes, receives branch id
 */
export function renderBranchSwitcher(containerId, onSwitch) {
    function doRender() {
        const container = document.getElementById(containerId);
        if (!container) return;

        const user = AuthService.getUser();
        if (!user) {
            container.style.display = 'none';
            return;
        }

        // Only show for admin/owner/manager
        if (!['admin', 'owner', 'manager'].includes(user.role)) {
            container.style.display = 'none';
            return;
        }

        const currentBranch = localStorage.getItem('bcauto_branch') || 'all';

        let initialLabelText = '';
        if (currentBranch === 'suphanburi') initialLabelText = 'BC Auto เมืองสุพรรณ';
        else if (currentBranch === 'samchuk') initialLabelText = 'BC AUTO XPERIENCE (สามชุก)';
        else if (currentBranch === 'BC Auto Service' || currentBranch === 'main') initialLabelText = 'BC Auto service (วิริยะเซอร์วิส)';
        else initialLabelText = 'ภาพรวมธุรกิจ (ทุกสาขา)';

        container.innerHTML = `
            <div class="branch-switcher-bar">
                ${BRANCHES.map(b => `
                    <button class="branch-tab${b.id === currentBranch ? ' active' : ''}" 
                            data-branch="${b.id}"
                            aria-label="${b.label}">
                        ${b.icon}
                        <span>${b.label}</span>
                    </button>
                `).join('')}
            </div>
            <p class="branch-switcher-label">กำลังดูข้อมูล: ${initialLabelText}</p>
        `;

        // Bind click events
        container.querySelectorAll('.branch-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const branch = /** @type {HTMLElement} */ (btn).dataset.branch;
                localStorage.setItem('bcauto_branch', branch);

                // Update active state
                container.querySelectorAll('.branch-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update label
                const label = container.querySelector('.branch-switcher-label');
                if (label) {
                    let text = '';
                    if (branch === 'suphanburi') text = 'BC Auto เมืองสุพรรณ';
                    else if (branch === 'samchuk') text = 'BC AUTO XPERIENCE (สามชุก)';
                    else if (branch === 'BC Auto Service' || branch === 'main') text = 'BC Auto service (วิริยะเซอร์วิส)';
                    else text = 'ภาพรวมธุรกิจ (ทุกสาขา)';
                    label.textContent = 'กำลังดูข้อมูล: ' + text;
                }

                // Fire callback
                if (typeof onSwitch === 'function') onSwitch(branch);
            });
        });

        container.style.display = 'block';
    }

    // Defer to DOMContentLoaded to ensure tool JS modules have registered window functions
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doRender);
    } else {
        // DOM already loaded, render immediately
        doRender();
    }
}

