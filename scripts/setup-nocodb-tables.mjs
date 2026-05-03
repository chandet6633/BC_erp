#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE — NocoDB Table Setup (v2 API)
 * ════════════════════════════════════════════════
 * Creates all tables in NocoDB via workspace-scoped REST API.
 *
 * Usage:
 *   node scripts/setup-nocodb-tables.mjs \
 *     --url=http://localhost:9080 \
 *     --email=admin@bcauto.work \
 *     --password=BcAuto2026!
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, ...rest] = a.replace('--', '').split('=')
        return [k, rest.join('=')]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const EMAIL = args['email'] || ''
const PASSWORD = args['password'] || ''

if (!EMAIL || !PASSWORD) {
    console.error('❌ Usage: node setup-nocodb-tables.mjs --url=... --email=... --password=...')
    process.exit(1)
}

let AUTH_TOKEN = ''

async function api(path, opts = {}) {
    const res = await fetch(`${NOCO_URL}${path}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'xc-auth': AUTH_TOKEN,
            ...(opts.headers || {})
        }
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} ${path}: ${text}`)
    }
    return res.json()
}

async function signIn() {
    const data = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    }).then(r => r.json())
    AUTH_TOKEN = data.token
    console.log('✅ Signed in')
}

async function getOrCreateBase() {
    // Get workspace
    const ws = await api('/api/v2/meta/workspaces')
    const wsId = ws.list[0].id

    // List bases in workspace
    const bases = await api(`/api/v2/meta/workspaces/${wsId}/bases`)
    const existing = bases.list.find(b => b.title === 'BC_ERP')
    if (existing) {
        console.log('📦 Base "BC_ERP" exists (id:', existing.id + ')')
        return existing.id
    }

    // Create new base
    const newBase = await api(`/api/v2/meta/workspaces/${wsId}/bases`, {
        method: 'POST',
        body: JSON.stringify({ title: 'BC_ERP' })
    })
    console.log('✅ Created base "BC_ERP" (id:', newBase.id + ')')
    return newBase.id
}

// ── Table definitions ──
const TABLES = [
    { title: 'users', columns: [
        { title: 'name', uidt: 'SingleLineText' }, { title: 'email', uidt: 'Email' },
        { title: 'pin', uidt: 'SingleLineText' }, { title: 'role', uidt: 'SingleLineText' },
        { title: 'branch', uidt: 'SingleLineText' }, { title: 'active', uidt: 'Checkbox' },
        { title: 'display_name', uidt: 'SingleLineText' }, { title: 'last_force_logout', uidt: 'DateTime' },
    ]},
    { title: 'app_users', columns: [
        { title: 'username', uidt: 'SingleLineText' }, { title: 'password', uidt: 'SingleLineText' },
        { title: 'display_name', uidt: 'SingleLineText' }, { title: 'role', uidt: 'SingleLineText' },
        { title: 'branch_id', uidt: 'SingleLineText' }, { title: 'permissions', uidt: 'LongText' },
        { title: 'is_active', uidt: 'Checkbox' },
    ]},
    { title: 'system_settings', columns: [
        { title: 'key', uidt: 'SingleLineText' }, { title: 'value', uidt: 'LongText' },
        { title: 'description', uidt: 'SingleLineText' },
    ]},
    { title: 'system_roles', columns: [
        { title: 'name', uidt: 'SingleLineText' }, { title: 'role_name', uidt: 'SingleLineText' },
        { title: 'allowed_menus', uidt: 'LongText' }, { title: 'allowed_tools', uidt: 'LongText' },
    ]},
    { title: 'audit_logs', columns: [
        { title: 'action', uidt: 'SingleLineText' }, { title: 'collection_name', uidt: 'SingleLineText' },
        { title: 'user_name', uidt: 'SingleLineText' }, { title: 'details', uidt: 'LongText' },
        { title: 'timestamp', uidt: 'DateTime' },
    ]},
    { title: 'branches', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'address', uidt: 'LongText' }, { title: 'phone', uidt: 'SingleLineText' },
        { title: 'is_active', uidt: 'Checkbox' },
    ]},
    { title: 'companies', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'address', uidt: 'LongText' }, { title: 'phone', uidt: 'SingleLineText' },
        { title: 'tax_id', uidt: 'SingleLineText' }, { title: 'contact_person', uidt: 'SingleLineText' },
    ]},
    { title: 'customers', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'phone', uidt: 'SingleLineText' }, { title: 'address', uidt: 'LongText' },
        { title: 'tax_id', uidt: 'SingleLineText' }, { title: 'email', uidt: 'Email' },
        { title: 'credit_limit', uidt: 'Decimal' }, { title: 'credit_days', uidt: 'Number' },
    ]},
    { title: 'vehicles', columns: [
        { title: 'plate_number', uidt: 'SingleLineText' }, { title: 'province', uidt: 'SingleLineText' },
        { title: 'brand', uidt: 'SingleLineText' }, { title: 'model', uidt: 'SingleLineText' },
        { title: 'year', uidt: 'Number' }, { title: 'color', uidt: 'SingleLineText' },
        { title: 'vin', uidt: 'SingleLineText' }, { title: 'customer_id', uidt: 'SingleLineText' },
        { title: 'mileage', uidt: 'Number' },
    ]},
    { title: 'product_brands', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'is_active', uidt: 'Checkbox' },
    ]},
    { title: 'product_groups', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'is_active', uidt: 'Checkbox' },
    ]},
    { title: 'products', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'type', uidt: 'SingleLineText' }, { title: 'brand_id', uidt: 'SingleLineText' },
        { title: 'group_id', uidt: 'SingleLineText' }, { title: 'price', uidt: 'Decimal' },
        { title: 'cost', uidt: 'Decimal' }, { title: 'unit', uidt: 'SingleLineText' },
        { title: 'min_stock', uidt: 'Number' }, { title: 'is_track_stock', uidt: 'Checkbox' },
        { title: 'barcode', uidt: 'SingleLineText' },
    ]},
    { title: 'vendors', columns: [
        { title: 'code', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'contact_person', uidt: 'SingleLineText' }, { title: 'phone', uidt: 'SingleLineText' },
        { title: 'address', uidt: 'LongText' }, { title: 'tax_id', uidt: 'SingleLineText' },
    ]},
    { title: 'lookups', columns: [
        { title: 'type', uidt: 'SingleLineText' }, { title: 'label', uidt: 'SingleLineText' },
        { title: 'value', uidt: 'SingleLineText' }, { title: 'is_active', uidt: 'Checkbox' },
        { title: 'sort_order', uidt: 'Number' },
    ]},
    { title: 'jobs', columns: [
        { title: 'job_no', uidt: 'SingleLineText' }, { title: 'status', uidt: 'SingleLineText' },
        { title: 'start_date', uidt: 'DateTime' }, { title: 'end_date', uidt: 'DateTime' },
        { title: 'plate', uidt: 'SingleLineText' }, { title: 'model', uidt: 'SingleLineText' },
        { title: 'customer_name', uidt: 'SingleLineText' }, { title: 'customer_phone', uidt: 'SingleLineText' },
        { title: 'customer_id', uidt: 'SingleLineText' }, { title: 'vehicle_id', uidt: 'SingleLineText' },
        { title: 'subtotal', uidt: 'Decimal' }, { title: 'discount', uidt: 'Decimal' },
        { title: 'vat_amount', uidt: 'Decimal' }, { title: 'grand_total', uidt: 'Decimal' },
        { title: 'payment_type', uidt: 'SingleLineText' }, { title: 'branch_id', uidt: 'SingleLineText' },
        { title: 'technician', uidt: 'SingleLineText' }, { title: 'repair_details', uidt: 'LongText' },
        { title: 'notes', uidt: 'LongText' }, { title: 'mileage_in', uidt: 'Number' },
    ]},
    { title: 'job_items', columns: [
        { title: 'job_id', uidt: 'SingleLineText' }, { title: 'product_id', uidt: 'SingleLineText' },
        { title: 'product_name', uidt: 'SingleLineText' }, { title: 'qty', uidt: 'Decimal' },
        { title: 'unit', uidt: 'SingleLineText' }, { title: 'price', uidt: 'Decimal' },
        { title: 'discount', uidt: 'Decimal' }, { title: 'total', uidt: 'Decimal' },
        { title: 'type', uidt: 'SingleLineText' },
    ]},
    { title: 'documents', columns: [
        { title: 'doc_no', uidt: 'SingleLineText' }, { title: 'doc_type', uidt: 'SingleLineText' },
        { title: 'status', uidt: 'SingleLineText' }, { title: 'doc_date', uidt: 'DateTime' },
        { title: 'due_date', uidt: 'DateTime' }, { title: 'ref_doc', uidt: 'SingleLineText' },
        { title: 'job_id', uidt: 'SingleLineText' }, { title: 'customer_id', uidt: 'SingleLineText' },
        { title: 'customer_name', uidt: 'SingleLineText' }, { title: 'vendor_id', uidt: 'SingleLineText' },
        { title: 'vendor_name', uidt: 'SingleLineText' }, { title: 'subtotal', uidt: 'Decimal' },
        { title: 'discount', uidt: 'Decimal' }, { title: 'vat_amount', uidt: 'Decimal' },
        { title: 'grand_total', uidt: 'Decimal' }, { title: 'payment_type', uidt: 'SingleLineText' },
        { title: 'branch_id', uidt: 'SingleLineText' }, { title: 'notes', uidt: 'LongText' },
        { title: 'created_by', uidt: 'SingleLineText' },
    ]},
    { title: 'document_items', columns: [
        { title: 'document_id', uidt: 'SingleLineText' }, { title: 'product_id', uidt: 'SingleLineText' },
        { title: 'product_name', uidt: 'SingleLineText' }, { title: 'qty', uidt: 'Decimal' },
        { title: 'unit', uidt: 'SingleLineText' }, { title: 'price', uidt: 'Decimal' },
        { title: 'discount', uidt: 'Decimal' }, { title: 'total', uidt: 'Decimal' },
    ]},
    { title: 'stock_ledgers', columns: [
        { title: 'transaction_no', uidt: 'SingleLineText' }, { title: 'transaction_type', uidt: 'SingleLineText' },
        { title: 'product_id', uidt: 'SingleLineText' }, { title: 'warehouse_location', uidt: 'SingleLineText' },
        { title: 'qty', uidt: 'Decimal' }, { title: 'unit_cost', uidt: 'Decimal' },
        { title: 'total_value', uidt: 'Decimal' }, { title: 'reference_doc', uidt: 'SingleLineText' },
        { title: 'branch_id', uidt: 'SingleLineText' },
    ]},
    { title: 'settings', columns: [
        { title: 'shop_name', uidt: 'SingleLineText' }, { title: 'address', uidt: 'LongText' },
        { title: 'phone', uidt: 'SingleLineText' }, { title: 'tax_id', uidt: 'SingleLineText' },
        { title: 'prefix_job', uidt: 'SingleLineText' }, { title: 'prefix_qt', uidt: 'SingleLineText' },
        { title: 'prefix_iv', uidt: 'SingleLineText' }, { title: 'prefix_rc', uidt: 'SingleLineText' },
        { title: 'vat_rate', uidt: 'Decimal' }, { title: 'default_vat_enabled', uidt: 'Checkbox' },
        { title: 'default_vat_mode', uidt: 'SingleLineText' },
    ]},
    { title: 'app_settings', columns: [
        { title: 'key', uidt: 'SingleLineText' }, { title: 'value', uidt: 'LongText' },
    ]},
    { title: 'favorite_products', columns: [
        { title: 'user_id', uidt: 'SingleLineText' }, { title: 'product_id', uidt: 'SingleLineText' },
    ]},
    { title: 'job_evaluations', columns: [
        { title: 'job_id', uidt: 'SingleLineText' }, { title: 'score', uidt: 'Number' },
        { title: 'feedback', uidt: 'LongText' }, { title: 'evaluator', uidt: 'SingleLineText' },
    ]},
    { title: 'job_payments', columns: [
        { title: 'job_id', uidt: 'SingleLineText' }, { title: 'amount', uidt: 'Decimal' },
        { title: 'payment_method', uidt: 'SingleLineText' }, { title: 'payment_date', uidt: 'DateTime' },
        { title: 'reference', uidt: 'SingleLineText' },
    ]},
    { title: 'hr_employees', columns: [
        { title: 'emp_id', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'department', uidt: 'SingleLineText' }, { title: 'sex', uidt: 'SingleLineText' },
    ]},
    { title: 'hr_attendance', columns: [
        { title: 'employee_id', uidt: 'SingleLineText' }, { title: 'timestamp', uidt: 'DateTime' },
        { title: 'type', uidt: 'SingleLineText' }, { title: 'department', uidt: 'SingleLineText' },
        { title: 'store', uidt: 'SingleLineText' },
    ]},
    { title: 'hr_leaves', columns: [
        { title: 'employee_id', uidt: 'SingleLineText' }, { title: 'name', uidt: 'SingleLineText' },
        { title: 'start_date', uidt: 'Date' }, { title: 'end_date', uidt: 'Date' },
        { title: 'reason', uidt: 'LongText' }, { title: 'type', uidt: 'SingleLineText' },
    ]},
    { title: 'financial_entries', columns: [
        { title: 'date', uidt: 'DateTime' }, { title: 'type', uidt: 'SingleLineText' },
        { title: 'category', uidt: 'SingleLineText' }, { title: 'description', uidt: 'LongText' },
        { title: 'amount', uidt: 'Decimal' }, { title: 'payment_method', uidt: 'SingleLineText' },
        { title: 'branch', uidt: 'SingleLineText' }, { title: 'created_by', uidt: 'SingleLineText' },
        { title: 'verified', uidt: 'Checkbox' }, { title: 'reference', uidt: 'SingleLineText' },
    ]},
    { title: 'daily_summaries', columns: [
        { title: 'date', uidt: 'Date' }, { title: 'branch', uidt: 'SingleLineText' },
        { title: 'total_income', uidt: 'Decimal' }, { title: 'total_expense', uidt: 'Decimal' },
        { title: 'net', uidt: 'Decimal' }, { title: 'job_count', uidt: 'Number' },
    ]},
]

async function createTables(baseId) {
    const existing = await api(`/api/v2/meta/bases/${baseId}/tables`)
    const existingNames = new Set((existing.list || []).map(t => t.title.toLowerCase()))
    let created = 0, skipped = 0

    for (const table of TABLES) {
        if (existingNames.has(table.title.toLowerCase())) {
            console.log(`  ⏭ ${table.title} (exists)`)
            skipped++; continue
        }
        try {
            await api(`/api/v2/meta/bases/${baseId}/tables`, {
                method: 'POST',
                body: JSON.stringify({ title: table.title, columns: table.columns })
            })
            console.log(`  ✅ ${table.title} (${table.columns.length} cols)`)
            created++
        } catch (e) { console.error(`  ❌ ${table.title}: ${e.message}`) }
    }
    return { created, skipped }
}

async function main() {
    console.log('═══════════════════════════════════════')
    console.log('  NocoDB Table Setup')
    console.log('═══════════════════════════════════════')

    await signIn()
    const baseId = await getOrCreateBase()

    console.log('\n📋 Creating tables...')
    const { created, skipped } = await createTables(baseId)

    console.log(`\n✅ Done: ${created} created, ${skipped} skipped`)
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
