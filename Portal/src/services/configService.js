import { pb } from './pocketbase.js';
import { TOOLS } from '../registry.js';
import { getAuthToken } from '@shared/nocodb-adapter.js';
import { buildDevAuthHeaders } from '@shared/session.js';

function authHeaders() {
    let headers = {};
    try {
        const jwt = getAuthToken()
            || localStorage.getItem('bcauto_jwt')
            || sessionStorage.getItem('bcauto_jwt')
            || localStorage.getItem('mungkhud_jwt')
            || sessionStorage.getItem('mungkhud_jwt')
            || '';
        if (jwt) headers.Authorization = `Bearer ${jwt}`;
        if (!jwt) headers = buildDevAuthHeaders(headers);
    } catch { /* storage unavailable */ }
    return headers;
}

async function fetchRoleMetadata() {
    const res = await fetch('/api/data/custom/role-metadata', { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Role metadata failed (${res.status})`);
    return data.roles || [];
}

const toolPathToId = new Map();
TOOLS.forEach(tool => {
    if (!tool.path) return;
    toolPathToId.set(tool.path, tool.id);
    const pagesIndex = tool.path.indexOf('/pages/');
    if (pagesIndex >= 0) {
        toolPathToId.set(tool.path.slice(pagesIndex), tool.id);
    }
});

function parsePermissionList(raw) {
    if (Array.isArray(raw)) {
        return raw.map(value => String(value).trim()).filter(Boolean);
    }

    if (raw && typeof raw === 'object') {
        return Object.entries(raw)
            .filter(([, value]) => value === true || value === 'true' || value === 1 || value === '1')
            .map(([key]) => key);
    }

    const text = String(raw ?? '').trim();
    if (!text) return [];

    if (text.startsWith('[')) {
        try {
            return parsePermissionList(JSON.parse(text));
        } catch (error) {
            console.warn('[ConfigService] Could not parse role permission list:', error.message);
        }
    }

    return text.split(',').map(value => value.trim()).filter(Boolean);
}

function normalizePermissionId(value) {
    const permission = String(value ?? '').trim();
    if (!permission || permission === '*') return permission;

    if (permission.startsWith('#/')) {
        return permission === '#/mechanic-kpi' ? 'mechanic_dashboard' : 'mungkhudshop';
    }

    return toolPathToId.get(permission) || permission;
}

function normalizeRolePermissions(rows = []) {
    return rows.reduce((permissions, row) => {
        const roleKey = String(row.role_name || row.name || row.role || '').trim().toLowerCase();
        if (!roleKey) return permissions;

        const rawPermissions = row.allowed_tools ?? row.allowed_modules ?? row.modules ?? row.tools ?? row.allowed_menus;
        const normalized = parsePermissionList(rawPermissions)
            .map(normalizePermissionId)
            .filter(Boolean);

        if (normalized.length > 0 || row.id || row.Id) {
            permissions[roleKey] = [...new Set(normalized)];
        }

        return permissions;
    }, {});
}

/**
 * ConfigService manages dynamic system settings and role permissions from metadata.
 */
export const ConfigService = {
    settings: {},
    rolePermissions: {},
    dynamicPermissionsLoaded: false,

    async init() {
        const cachedRoles = localStorage.getItem('bc_rolePermissions');
        const cachedSettings = localStorage.getItem('bc_settings');

        if (cachedRoles) {
            this.rolePermissions = JSON.parse(cachedRoles);
            this.dynamicPermissionsLoaded = Object.keys(this.rolePermissions).length > 0;
        }
        if (cachedSettings) {
            this.settings = JSON.parse(cachedSettings);
        }

        try {
            const [settingsResult, rolesData] = await Promise.all([
                pb.collection('system_settings').getFullList().catch(error => {
                    console.warn('[ConfigService] Could not load system settings:', error.message);
                    return [];
                }),
                fetchRoleMetadata()
            ]);

            settingsResult.forEach(setting => {
                this.settings[setting.key] = setting.value;
            });

            this.rolePermissions = normalizeRolePermissions(rolesData);
            this.dynamicPermissionsLoaded = Object.keys(this.rolePermissions).length > 0;

            if (!this.dynamicPermissionsLoaded) {
                this.rolePermissions = {};
                localStorage.removeItem('bc_rolePermissions');
            } else {
                localStorage.setItem('bc_rolePermissions', JSON.stringify(this.rolePermissions));
            }
            localStorage.setItem('bc_settings', JSON.stringify(this.settings));

            console.log('[ConfigService] Initialized');
        } catch (error) {
            console.warn('[ConfigService] Failed to load dynamic config, using defaults:', error.message);
            this.rolePermissions = {};
            this.dynamicPermissionsLoaded = false;
        }
    },

    hasAccess(role, toolId, branch = null) {
        if (toolId === 'bctool_external') {
            if (role === 'mechanic' || role === 'employee') return false;
            if (role === 'admin' || role === 'owner') return true;
            const allowedBranches = String(this.getSetting('bctool_external_branches', ''))
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
            return allowedBranches.length > 0 && allowedBranches.includes(branch);
        }

        let effectiveRole = role;
        if (role === 'sa' && branch) {
            effectiveRole = `sa_${branch}`;
            if (!this.rolePermissions[effectiveRole]) {
                effectiveRole = role;
            }
        }

        const permissions = this.rolePermissions[effectiveRole] || this.rolePermissions[role];
        if (permissions) {
            if (toolId === 'operations_menu') {
                const opsTools = ['audit', 'entry', 'employee_entry', 'verification'];
                if (opsTools.some(id => permissions.includes(id) || permissions.includes('*'))) {
                    return true;
                }
            }
            return permissions.includes('*') || permissions.includes(toolId);
        }

        if (this.dynamicPermissionsLoaded) {
            return false;
        }

        const tool = TOOLS.find(item => item.id === toolId);
        return tool ? tool.roles.includes(role) : false;
    },

    hasPermissionMetadata(role, branch = null) {
        if (!role) return false;
        if (role === 'sa' && branch) {
            const branchRole = `sa_${branch}`;
            if (this.rolePermissions[branchRole]) return true;
        }
        return Object.prototype.hasOwnProperty.call(this.rolePermissions, role);
    },

    getSetting(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }
};

// @ts-ignore
window.ConfigService = ConfigService;
