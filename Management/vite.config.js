import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    root: 'src',
    publicDir: resolve(__dirname, 'public'),
    base: '', // Important for relative paths in built files
    resolve: {
        alias: {
            '@shared': resolve(__dirname, '../shared'),
        }
    },
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'src/index.html'),
                main: resolve(__dirname, 'src/pages/main/index.html'),
                admin: resolve(__dirname, 'src/pages/admin/index.html'),
                admin_audit: resolve(__dirname, 'src/pages/admin/audit-logs.html'),
                admin_backup: resolve(__dirname, 'src/pages/admin/backup-center.html'),
                admin_health: resolve(__dirname, 'src/pages/admin/system-health.html'),
                admin_users: resolve(__dirname, 'src/pages/admin/user-management.html'),
                admin_roles: resolve(__dirname, 'src/pages/admin/RoleManager.html'),
                admin_branches: resolve(__dirname, 'src/pages/admin/branches.html'),
                admin_settings: resolve(__dirname, 'src/pages/admin/settings.html'),
                admin_datacheck: resolve(__dirname, 'src/pages/admin/data-check.html'),
                hr_index: resolve(__dirname, 'src/pages/hr/index.html'),
                hr_dashboard: resolve(__dirname, 'src/pages/hr/hrdashboard.html'),
                hr_checkin: resolve(__dirname, 'src/pages/hr/checkin.html'),
                hr_payroll: resolve(__dirname, 'src/pages/hr/payroll.html'),
                hr_leave: resolve(__dirname, 'src/pages/hr/leave.html'),
                operations_index: resolve(__dirname, 'src/pages/operations/index.html'),
                bc_ops_entry: resolve(__dirname, 'src/pages/branch-operations/entry.html'),
                bc_ops_verification: resolve(__dirname, 'src/pages/branch-operations/verification.html'),
                bc_ops_audit: resolve(__dirname, 'src/pages/branch-operations/audit.html'),
                unified_dashboard: resolve(__dirname, 'src/pages/dashboard/index.html'),
                mungkhudshop: resolve(__dirname, 'src/pages/mungkhudshop/index.html'),
            },
        },
        outDir: resolve(__dirname, 'pb_public'),
        emptyOutDir: true,
    },
    server: {
        port: 3000,
        open: '/pages/main/index.html',
        fs: {
            allow: [resolve(__dirname, '..')]  // Allow access to parent (shared/)
        }
    }
})
