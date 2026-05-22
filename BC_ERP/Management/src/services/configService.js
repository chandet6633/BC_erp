import { pb } from './pocketbase.js';
import { TOOLS } from '../registry.js';

/**
 * ConfigService manages dynamic system settings and role permissions from PocketBase.
 */
export const ConfigService = {
    settings: {},
    rolePermissions: {},

    /**
     * Initialize configuration by fetching from PocketBase
     */
    async init() {
        // Optimistic load
        const cachedRoles = localStorage.getItem('bc_rolePermissions');
        const cachedSettings = localStorage.getItem('bc_settings');
        if (cachedRoles) this.rolePermissions = JSON.parse(cachedRoles);
        if (cachedSettings) this.settings = JSON.parse(cachedSettings);

        try {
            const [settingsData, rolesData] = await Promise.all([
                pb.collection('system_settings').getFullList(),
                pb.collection('system_roles').getFullList()
            ]);

            // Map settings
            settingsData.forEach(s => {
                this.settings[s.key] = s.value;
            });

            // Map role permissions (tool IDs)
            rolesData.forEach(r => {
                if (Array.isArray(r.allowed_tools) && r.allowed_tools.length > 0) {
                    this.rolePermissions[r.role_name] = r.allowed_tools;
                }
            });

            // If no dynamic roles were loaded, clear stale cache to prevent
            // old cached permissions from hiding newly-added tools
            if (rolesData.length === 0) {
                this.rolePermissions = {};
                localStorage.removeItem('bc_rolePermissions');
            } else {
                localStorage.setItem('bc_rolePermissions', JSON.stringify(this.rolePermissions));
            }
            localStorage.setItem('bc_settings', JSON.stringify(this.settings));

            console.log('⚙️ ConfigService Initialized');
        } catch (error) {
            console.warn('⚠️ Failed to load dynamic config, using defaults:', error.message);
            // On fetch failure, clear dynamic permissions so static registry is used
            this.rolePermissions = {};
        }
    },

    /**
     * Check if a role has access to a tool ID.
     * Strategy: dynamic permissions are ADDITIVE on top of static registry.
     * If either dynamic or static grants access, the tool is shown.
     */
    hasAccess(role, toolId, branch = null) {
        if (toolId === 'bctool_external') {
            if (role === 'mechanic' || role === 'employee') return false;
            if (role === 'admin' || role === 'owner') return true;
            return branch === 'samchuk' || branch === 'suphanburi';
        }

        let effectiveRole = role;
        if (role === 'sa' && branch) {
            effectiveRole = `sa_${branch}`;
            if (!this.rolePermissions[effectiveRole]) {
                effectiveRole = role;
            }
        }

        // Check dynamic permissions first (if they exist)
        if (this.rolePermissions[effectiveRole]) {
            if (toolId === 'operations_menu') {
                const opsTools = ['audit', 'entry', 'employee_entry', 'verification'];
                if (opsTools.some(id => this.rolePermissions[effectiveRole].includes(id))) {
                    return true;
                }
            }
            if (this.rolePermissions[effectiveRole].includes(toolId)) {
                return true;
            }
        }

        // Always fall back to static registry — dynamic perms are additive, not exclusive
        const tool = TOOLS.find(t => t.id === toolId);
        return tool ? tool.roles.includes(role) : false;
    },

    /**
     * Get a system setting
     */
    getSetting(key, defaultValue = null) {
        return this.settings[key] !== undefined ? this.settings[key] : defaultValue;
    }
};

// @ts-ignore
window.ConfigService = ConfigService;
