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
                index: 'src/index.html',
                main: 'src/pages/main/index.html',
                admin: 'src/pages/admin/index.html',
                admin_audit: 'src/pages/admin/audit-logs.html',
                admin_backup: 'src/pages/admin/backup-center.html',
                admin_health: 'src/pages/admin/system-health.html',
                admin_users: 'src/pages/admin/user-management.html',
                admin_roles: 'src/pages/admin/RoleManager.html',
                admin_branches: 'src/pages/admin/branches.html',
                admin_settings: 'src/pages/admin/settings.html',
                admin_datacheck: 'src/pages/admin/data-check.html',
                admin_integrity: 'src/pages/admin/integrity-check.html',
                hr_index: 'src/pages/hr/index.html',
                hr_dashboard: 'src/pages/hr/hrdashboard.html',
                hr_checkin: 'src/pages/hr/checkin.html',
                hr_payroll: 'src/pages/hr/payroll.html',
                hr_leave: 'src/pages/hr/leave.html',
                operations_index: 'src/pages/operations/index.html',
                bc_ops_entry: 'src/pages/branch-operations/entry.html',
                bc_ops_verification: 'src/pages/branch-operations/verification.html',
                bc_ops_audit: 'src/pages/branch-operations/audit.html',
                unified_dashboard: 'src/pages/dashboard/index.html',
                mungkhudshop: 'src/pages/mungkhudshop/index.html',
                mechanic: 'src/pages/mechanic/index.html',
            },
        },
        outDir: resolve(__dirname, 'dist'),
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
