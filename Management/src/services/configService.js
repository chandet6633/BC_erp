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
                this.rolePermissions[r.role_name] = r.allowed_tools || [];
            });

            localStorage.setItem('bc_rolePermissions', JSON.stringify(this.rolePermissions));
            localStorage.setItem('bc_settings', JSON.stringify(this.settings));

            console.log('⚙️ ConfigService Initialized');
        } catch (error) {
            console.warn('⚠️ Failed to load dynamic config, using defaults:', error.message);
        }
    },

    /**
     * Check if a role has access to a tool ID
     */
    hasAccess(role, toolId, branch = null) {
        if (toolId === 'bctool_external') {
            if (role === 'admin' || role === 'owner') return true;
            return branch === 'samchuk' || branch === 'suphanburi';
        }

        let effectiveRole = role;
        if (role === 'sa' && branch) {
            effectiveRole = `sa_${branch}`;
            // If branch-specific role doesn't exist, fallback to generic sa
            if (!this.rolePermissions[effectiveRole]) {
                effectiveRole = role;
            }
        }

        // If dynamic permissions exist for this role, use them
        if (this.rolePermissions[effectiveRole]) {
            if (toolId === 'operations_menu') {
                const opsTools = ['audit', 'entry', 'employee_entry', 'verification'];
                if (opsTools.some(id => this.rolePermissions[effectiveRole].includes(id))) {
                    return true;
                }
            }
            return this.rolePermissions[effectiveRole].includes(toolId);
        }

        // Fallback to static defaults in registry
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
