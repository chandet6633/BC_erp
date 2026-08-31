import { resolve } from 'path'
import { defineConfig } from 'vite'

const page = path => resolve(__dirname, path)

export default defineConfig({
    root: resolve(__dirname, 'src'),
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
                index: page('src/index.html'),
                main: page('src/pages/main/index.html'),
                admin: page('src/pages/admin/index.html'),
                admin_audit: page('src/pages/admin/audit-logs.html'),
                admin_backup: page('src/pages/admin/backup-center.html'),
                admin_health: page('src/pages/admin/system-health.html'),
                admin_users: page('src/pages/admin/user-management.html'),
                admin_roles: page('src/pages/admin/RoleManager.html'),
                admin_branches: page('src/pages/admin/branches.html'),
                admin_settings: page('src/pages/admin/settings.html'),
                admin_datacheck: page('src/pages/admin/data-check.html'),
                admin_integrity: page('src/pages/admin/integrity-check.html'),
                hr_index: page('src/pages/hr/index.html'),
                hr_dashboard: page('src/pages/hr/hrdashboard.html'),
                hr_checkin: page('src/pages/hr/checkin.html'),
                hr_payroll: page('src/pages/hr/payroll.html'),
                hr_leave: page('src/pages/hr/leave.html'),
                operations_index: page('src/pages/operations/index.html'),
                knowledge_index: page('src/pages/knowledge/index.html'),
                sa_docs_index: page('src/pages/sa-docs/index.html'),
                bc_ops_entry: page('src/pages/branch-operations/entry.html'),
                bc_ops_verification: page('src/pages/branch-operations/verification.html'),
                bc_ops_audit: page('src/pages/branch-operations/audit.html'),
                unified_dashboard: page('src/pages/dashboard/index.html'),
                mungkhudshop: page('src/pages/mungkhudshop/index.html'),
                mechanic: page('src/pages/mechanic/index.html'),
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
