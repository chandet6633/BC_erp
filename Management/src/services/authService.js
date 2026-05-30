// @ts-nocheck
import { pb } from './pocketbase.js';
import { getAuthToken } from '@shared/nocodb-adapter.js';

/**
 * AuthService handles authentication, user identity, and role-based permissions.
 * Follows Poka-Yoke: prevents invalid states and unauthorized access by design.
 *
 * Migration: PocketBase auth → NocoDB-backed custom auth via PB-compatible wrapper.
 * pb.authStore and pb.collection() are now provided by the NocoDB wrapper,
 * so this service required minimal changes.
 */
export const AuthService = {
    /**
     * Get the currently logged-in user and their role
     */
    getUser() {
        // Check backend auth (NocoDB wrapper authStore)
        if (pb.authStore.isValid) {
            const model = pb.authStore.model;
            if (model) {
                // Poka-Yoke: Check if forced logout happened after last login
                const lastForceLogout = model.last_force_logout ? new Date(model.last_force_logout) : null;
                const lastLogin = sessionStorage.getItem('bcauto_last_login') ? new Date(sessionStorage.getItem('bcauto_last_login')) : null;

                if (lastForceLogout && (!lastLogin || lastForceLogout > lastLogin)) {
                    this.logout();
                    return null;
                }

                return {
                    id: model.id,
                    email: model.email,
                    name: sessionStorage.getItem('bcauto_user_name') || model.display_name || model.name || 'Admin',
                    role: sessionStorage.getItem('bcauto_role') || model.role || 'sa',
                    branch: model.branch || model.branch_id || null
                };
            }
        }

        // Fallback to session/PIN roles (Employees)
        const sessionRole = sessionStorage.getItem('bcauto_role');
        const sessionName = sessionStorage.getItem('bcauto_user_name');
        if (sessionRole && sessionRole !== 'null') {
            return {
                id: sessionStorage.getItem('bcauto_user_id') || 'session-user',
                name: sessionName || sessionRole.charAt(0).toUpperCase() + sessionRole.slice(1),
                role: sessionRole,
                branch: localStorage.getItem('bcauto_branch')
            };
        }

        return null;
    },

    /**
     * Check if the user has a specific role
     * @param {string|string[]} roles - Single role or array of allowed roles
     */
    hasRole(roles) {
        const user = this.getUser();
        if (!user) return false;

        if (Array.isArray(roles)) {
            return roles.includes(user.role);
        }
        return user.role === roles;
    },

    /**
     * Poka-Yoke: Strict gatekeeper for page access.
     * Redirects to index if the user doesn't meet the requirements.
     */
    requireRole(allowedRoles, redirectPath = '/pages/main/index.html') {
        if (!this.hasRole(allowedRoles)) {
            console.error('Access Denied: Insufficient permissions');
            window.location.href = redirectPath;
            return false;
        }
        return true;
    },

    /**
     * Login with email/password (Admins/Managers)
     * Uses the NocoDB wrapper's authWithPassword method.
     */
    async login(email, password) {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            sessionStorage.setItem('bcauto_last_login', new Date().toISOString());
            // Default name to display_name or generic
            sessionStorage.setItem('bcauto_user_name', authData.record.display_name || 'Admin');
            sessionStorage.setItem('bcauto_role', authData.record.role || 'manager');
            window['AuditService']?.log('login', `User logged in with email: ${email}`, 'auth');
            return { success: true, user: authData.record };
        } catch (error) {
            console.error('Login failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Employee Registration
     */
    async registerEmployee(name, branch, pin) {
        try {
            const record = await pb.collection('users').create({
                name,
                branch,
                pin: pin,
                active: true
            });
            return { success: true, record };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Employee Login (PIN based)
     */
    async loginEmployee(id, pin) {
        try {
            const employee = await pb.collection('users').getOne(id);
            if (employee.pin === pin) {
                sessionStorage.setItem('bcauto_role', employee.role || 'sa');
                sessionStorage.setItem('bcauto_user_name', employee.name);
                sessionStorage.setItem('bcauto_user_id', employee.id);
                localStorage.setItem('bcauto_branch', employee.branch || employee.branch_id || '');
                window['AuditService']?.log('login_employee', `Employee logged in via PIN: ${employee.name}`, 'auth');
                return { success: true, employee };
            }
            return { success: false, error: 'PIN ไม่ถูกต้อง' };
        } catch (error) {
            return { success: false, error: 'ไม่พบข้อมูลพนักงาน' };
        }
    },

    /**
     * Get all registered employees for a branch
     */
    async getEmployees(branch = null) {
        try {
            const filter = branch ? `branch="${branch}" && active=true` : 'active=true';
            return await pb.collection('users').getFullList({ filter, sort: 'name' });
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            return [];
        }
    },

    /**
     * Update Employee PIN
     */
    async updateEmployeePIN(id, newPin) {
        try {
            await pb.collection('users').update(id, { pin: newPin });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    logout() {
        const user = this.getUser();
        if (user) {
            window['AuditService']?.log('logout', `User logged out: ${user.name}`, 'auth');
        }
        pb.authStore.clear();
        sessionStorage.removeItem('bcauto_role');
        sessionStorage.removeItem('bcauto_user_name');
        sessionStorage.removeItem('bcauto_user_id');
        window.location.href = '../main/index.html';
    },

    /**
     * Get the current branch
     */
    getBranch() {
        let b = null;
        if (!pb.authStore.isValid || !pb.authStore.model) {
            // Fallback for session/PIN users
            const sessionRole = sessionStorage.getItem('bcauto_role');
            if (sessionRole) {
                b = localStorage.getItem('bcauto_branch');
            }
        } else {
            const uiBranch = localStorage.getItem('bcauto_branch');

            // If locked to a branch via BC Auto App
            if (localStorage.getItem('bcauto_branch_locked') === 'true' && uiBranch) {
                b = uiBranch;
            } else if (this.isOwner() && uiBranch) {
                // For Admins/Owners, respect the branch they explicitly selected via UI
                b = uiBranch;
            } else {
                b = pb.authStore.model.branch || pb.authStore.model.branch_id || uiBranch || 'all';
            }
        }

        if (b === 'suphan') return 'suphanburi';
        return b;
    },

    /**
     * Get the branch filter expression for queries
     */
    getBranchFilter() {
        const b = this.getBranch();

        // If owner/admin and no specific branch is selected (e.g., 'all' or null/empty),
        // return an always-true filter to fetch ALL data across all branches.
        // We use 'id!=""' because returning '' would break queries using '&& ${getBranchFilter()}'.
        if (this.isOwner() && (!b || b === 'all')) {
            return 'id!=""';
        }

        // For regular employees or managers locked to a branch, Or if 'BC Auto Service' was explicitly passed
        if (!b || b === 'BC Auto Service' || b === 'main') return "(branch='BC Auto Service' || branch='main' || branch='')";

        return `branch='${b}'`;
    },

    /**
     * Check if user is admin
     */
    isAdmin() {
        const model = pb.authStore.model;
        return pb.authStore.isValid && model?.role === 'admin';
    },

    /**
     * Check if user is owner
     */
    isOwner() {
        // Support both backend and legacy session roles
        if (pb.authStore.isValid && ['owner', 'manager', 'admin'].includes(pb.authStore.model?.role)) {
            return true;
        }
        const sessionRole = sessionStorage.getItem('bcauto_role');
        return ['owner', 'manager', 'admin'].includes(sessionRole);
    },

    /**
     * Poka-Yoke: Strict gatekeeper for admin/owner pages.
     */
    requireOwner(redirectPath = '/pages/main/index.html') {
        if (!this.isOwner()) {
            window.location.href = redirectPath;
            return false;
        }
        return true;
    },

    /**
     * Generate a Base64 SSO token for cross-app authentication
     */
    getSSOToken() {
        const user = this.getUser();
        if (!user) return null;

        // Map Management user to SSO format
        const ssoData = {
            id: user.id,
            username: user.email || user.name,
            display_name: user.name,
            role: user.role,
            branch_id: user.branch || 'main',
            issued_at: Date.now(),
            jwt: getAuthToken()
                || localStorage.getItem('bcauto_jwt')
                || sessionStorage.getItem('bcauto_jwt')
                || localStorage.getItem('mungkhud_jwt')
                || sessionStorage.getItem('mungkhud_jwt')
                || ''
        };

        try {
            return btoa(unescape(encodeURIComponent(JSON.stringify(ssoData))));
        } catch (e) {
            console.error('SSO Generation failed:', e);
            return null;
        }
    }
};

window.AuthService = AuthService;
window.isOwner = () => AuthService.isOwner();
window.requireOwner = () => AuthService.requireOwner();
window.getBranch = () => AuthService.getBranch();
window.getBranchFilter = () => AuthService.getBranchFilter();
window.setBranch = (branch) => localStorage.setItem('bcauto_branch', branch);
