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
import { fetchBranchMetadata, getBranchLabel, getBranchOptions } from '@shared/branch-metadata.js';
import { getSession, isRealBranchId, setSessionBranch } from '@shared/session.js';

const chartIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`;
const storeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/></svg>`;

/**
 * Render branch switcher tabs into a container element.
 * Deferred to DOMContentLoaded to ensure tool JS is loaded.
 * @param {string} containerId - ID of the container element
 * @param {function} onSwitch - Callback when branch changes, receives branch id
 */
export function renderBranchSwitcher(containerId, onSwitch) {
    async function doRender() {
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

        const currentBranch = getSession().branchId || '';
        let branches = [];
        try {
            branches = await fetchBranchMetadata({ includeAll: false });
        } catch (err) {
            console.warn('[BranchSwitcher] Could not load branch metadata:', err.message);
            branches = isRealBranchId(currentBranch) ? [{ branch_id: currentBranch, branch_name: currentBranch, scoped: true, is_virtual: false }] : [];
        }
        const options = getBranchOptions(branches).filter(branch => isRealBranchId(branch.branch_id));
        if (!options.length) {
            container.style.display = 'none';
            return;
        }
        const selectedBranch = isRealBranchId(currentBranch) ? currentBranch : options[0].branch_id;
        const initialLabelText = getBranchLabel(selectedBranch, branches, 'th') || selectedBranch;

        container.innerHTML = `
            <div class="branch-switcher-bar">
                ${options.map(branch => {
                    const id = branch.branch_id;
                    const label = getBranchLabel(id, branches, 'th') || id;
                    return `
                    <button class="branch-tab${id === selectedBranch ? ' active' : ''}"
                            data-branch="${id}"
                            aria-label="${label}">
                        ${storeIcon}
                        <span>${label}</span>
                    </button>
                `}).join('')}
            </div>
            <p class="branch-switcher-label">กำลังดูข้อมูล: ${initialLabelText}</p>
        `;

        // Bind click events
        container.querySelectorAll('.branch-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const branch = /** @type {HTMLElement} */ (btn).dataset.branch;
                if (!isRealBranchId(branch)) return;
                setSessionBranch(branch, { locked: true });

                // Update active state
                container.querySelectorAll('.branch-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update label
                const label = container.querySelector('.branch-switcher-label');
                if (label) {
                    label.textContent = 'กำลังดูข้อมูล: ' + (getBranchLabel(branch, branches, 'th') || branch);
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

