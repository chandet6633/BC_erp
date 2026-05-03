#!/usr/bin/env node
/**
 * BC AUTO XPERIENCE — Seed Test Data into NocoDB
 * ═══════════════════════════════════════════════
 * Inserts realistic test data so every feature can be tested.
 *
 * Usage:
 *   node scripts/seed-test-data.mjs \
 *     --url=http://localhost:9080 \
 *     --email=admin@bcauto.work \
 *     --password=YourPassword123
 *
 * OR with API token:
 *   node scripts/seed-test-data.mjs \
 *     --url=http://localhost:9080 \
 *     --token=YOUR_API_TOKEN
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=')
        return [k, v]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const EMAIL = args['email'] || ''
const PASSWORD = args['password'] || ''
const API_TOKEN = args['token'] || ''

let AUTH_TOKEN = ''

async function nocoFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (API_TOKEN) {
        headers['xc-token'] = API_TOKEN
    } else if (AUTH_TOKEN) {
        headers['xc-auth'] = AUTH_TOKEN
    }
    return fetch(`${NOCO_URL}${path}`, { ...opts, headers })
}

async function signIn() {
    if (API_TOKEN) { console.log('✅ Using API token'); return }
    if (!EMAIL || !PASSWORD) {
        console.error('❌ Provide --email + --password OR --token')
        process.exit(1)
    }
    const res = await fetch(`${NOCO_URL}/api/v1/auth/user/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    })
    const data = await res.json()
    AUTH_TOKEN = data.token
    console.log('✅ Signed in')
}

// ── Table ID cache ──
let tableIdMap = {}

async function loadTableIds() {
    const wsRes = await nocoFetch('/api/v2/meta/workspaces')
    const ws = await wsRes.json()
    const wsId = ws.list[0].id
    const basesRes = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`)
    const bases = await basesRes.json()
    const base = bases.list.find(b => b.title === 'BC_ERP') || bases.list[0]
    const tablesRes = await nocoFetch(`/api/v2/meta/bases/${base.id}/tables`)
    const tables = await tablesRes.json()
    tables.list.forEach(t => { tableIdMap[t.title.toLowerCase()] = t.id })
    console.log(`✅ ${Object.keys(tableIdMap).length} tables loaded from base "${base.title}"`)
}

async function insert(table, data) {
    const tableId = tableIdMap[table.toLowerCase()]
    if (!tableId) { console.warn(`⚠️ Table "${table}" not found`); return null }
    const res = await nocoFetch(`/api/v2/tables/${tableId}/records`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    if (!res.ok) { console.error(`❌ ${table}:`, await res.text()); return null }
    return res.json()
}

async function seed() {
    console.log('═══════════════════════════════════════')
    console.log('  Seeding Test Data')
    console.log('═══════════════════════════════════════')

    await signIn()
    await loadTableIds()

    // ── Users ──
    console.log('\n👤 Users...')
    await insert('users', { name: 'Admin ระบบ', email: 'admin@bcauto.work', pin: '000000', role: 'admin', branch: '', active: true, display_name: 'Admin' })
    await insert('users', { name: 'เจ้าของร้าน', email: 'owner@bcauto.work', pin: '280612', role: 'owner', branch: '', active: true, display_name: 'เจ้าของ' })
    await insert('users', { name: 'ผู้จัดการ สามชุก', email: 'mgr@bcauto.work', pin: '111111', role: 'manager', branch: 'samchuk', active: true, display_name: 'ผู้จัดการ' })
    await insert('users', { name: 'พนักงาน SA', pin: '222222', role: 'sa', branch: 'samchuk', active: true, display_name: 'SA สามชุก' })
    await insert('users', { name: 'ช่าง สมชาย', pin: '333333', role: 'employee', branch: 'samchuk', active: true, display_name: 'สมชาย' })

    // ── App Users ──
    console.log('🔐 App Users...')
    await insert('app_users', { username: 'admin', password: 'admin123', display_name: 'ผู้ดูแลระบบ', role: 'admin', is_active: true })
    await insert('app_users', { username: 'owner', password: 'owner123', display_name: 'เจ้าของร้าน', role: 'owner', is_active: true })
    await insert('app_users', { username: 'sa1', password: 'sa123', display_name: 'SA ประจำสาขา', role: 'sa', is_active: true, branch_id: 'samchuk' })

    // ── System Roles ──
    console.log('🔒 System Roles...')
    await insert('system_roles', { name: 'admin', role_name: 'admin', allowed_menus: '*' })
    await insert('system_roles', { name: 'owner', role_name: 'owner', allowed_menus: '*' })
    await insert('system_roles', { name: 'manager', role_name: 'manager', allowed_menus: '*' })
    await insert('system_roles', { name: 'sa', role_name: 'sa', allowed_menus: '#/dashboard,#/job,#/quotation,#/invoice,#/receipt,#/stock-list,#/requisition,#/goods-receipt' })

    // ── Branches ──
    console.log('🏢 Branches...')
    await insert('branches', { code: 'SAM', name: 'สามชุก', address: '123 ถ.สามชุก อ.สามชุก จ.สุพรรณบุรี', phone: '035-571-xxx', is_active: true })
    await insert('branches', { code: 'SUP', name: 'สุพรรณบุรี', address: '456 ถ.สุพรรณ อ.เมือง จ.สุพรรณบุรี', phone: '035-521-xxx', is_active: true })

    // ── Products ──
    console.log('📦 Products...')
    await insert('products', { code: 'OIL-001', name: 'น้ำมันเครื่อง 5W-40 (4L)', type: 'Fluid', price: 1200, cost: 650, unit: 'แกลลอน', min_stock: 10, is_track_stock: true })
    await insert('products', { code: 'OIL-002', name: 'น้ำมันเครื่อง 10W-30 (1L)', type: 'Fluid', price: 350, cost: 180, unit: 'ขวด', min_stock: 20, is_track_stock: true })
    await insert('products', { code: 'FLT-001', name: 'กรองน้ำมัน Toyota', type: 'Part', price: 250, cost: 80, unit: 'ชิ้น', min_stock: 15, is_track_stock: true })
    await insert('products', { code: 'FLT-002', name: 'กรองอากาศ Honda', type: 'Part', price: 350, cost: 120, unit: 'ชิ้น', min_stock: 10, is_track_stock: true })
    await insert('products', { code: 'BRK-001', name: 'ผ้าเบรคหน้า', type: 'Part', price: 1500, cost: 450, unit: 'ชุด', min_stock: 5, is_track_stock: true })
    await insert('products', { code: 'SVC-001', name: 'ค่าแรงเปลี่ยนถ่าย', type: 'Service', price: 300, cost: 0, unit: 'ครั้ง', is_track_stock: false })
    await insert('products', { code: 'SVC-002', name: 'ค่าแรงเช็คระยะ', type: 'Service', price: 500, cost: 0, unit: 'ครั้ง', is_track_stock: false })

    // ── Vendors ──
    console.log('🏭 Vendors...')
    await insert('vendors', { code: 'V001', name: 'บจก.น้ำมันแห่งชาติ', contact_person: 'คุณสมศรี', phone: '02-xxx-xxxx', tax_id: '1234567890123' })
    await insert('vendors', { code: 'V002', name: 'อะไหล่รถยนต์ สุพรรณ', contact_person: 'คุณสมชาย', phone: '035-xxx-xxxx' })

    // ── Customers ──
    console.log('👥 Customers...')
    await insert('customers', { code: 'C001', name: 'คุณสมศักดิ์ แก้วงาม', phone: '081-xxx-xxxx', credit_limit: 50000 })
    await insert('customers', { code: 'C002', name: 'บจก.ขนส่งสุพรรณ', phone: '035-xxx-xxxx', tax_id: '9876543210123', credit_limit: 200000, credit_days: 30 })

    // ── Vehicles ──
    console.log('🚗 Vehicles...')
    await insert('vehicles', { plate_number: 'กข 1234', province: 'สุพรรณบุรี', brand: 'Toyota', model: 'Vios', year: 2022, color: 'ขาว', customer_id: 'C001' })
    await insert('vehicles', { plate_number: '2กก 5678', province: 'สุพรรณบุรี', brand: 'Honda', model: 'City', year: 2023, color: 'ดำ', customer_id: 'C001' })

    // ── Lookups ──
    console.log('📋 Lookups...')
    for (const l of [
        { type: 'payment_method', label: 'เงินสด', value: 'cash', is_active: true },
        { type: 'payment_method', label: 'โอนเงิน', value: 'transfer', is_active: true },
        { type: 'payment_method', label: 'บัตรเครดิต', value: 'credit', is_active: true },
        { type: 'bank', label: 'กสิกรไทย', value: 'KBANK', is_active: true },
        { type: 'bank', label: 'กรุงเทพ', value: 'BBL', is_active: true },
    ]) await insert('lookups', l)

    // ── Product Brands & Groups ──
    console.log('🏷️ Brands & Groups...')
    await insert('product_brands', { code: 'TOYOTA', name: 'Toyota', is_active: true })
    await insert('product_brands', { code: 'HONDA', name: 'Honda', is_active: true })
    await insert('product_groups', { code: 'OIL', name: 'น้ำมันหล่อลื่น', is_active: true })
    await insert('product_groups', { code: 'FILTER', name: 'กรอง', is_active: true })
    await insert('product_groups', { code: 'SVC', name: 'ค่าบริการ', is_active: true })

    // ── Settings ──
    console.log('⚙️ Settings...')
    await insert('settings', {
        shop_name: 'BC บัญชา ออโต้เอ็กซ์พีเรียนซ์',
        address: '123 ถ.สามชุก อ.สามชุก จ.สุพรรณบุรี 72130',
        phone: '035-571-xxx', tax_id: '0725560000123',
        prefix_job: 'JOB', prefix_qt: 'QT', prefix_iv: 'IV', prefix_rc: 'RC',
        vat_rate: 7, default_vat_enabled: true, default_vat_mode: 'customer_pays'
    })

    // ── Sample Jobs ──
    console.log('🔧 Sample Jobs...')
    await insert('jobs', {
        job_no: 'JOB-2026-0001', status: 'open',
        start_date: '2026-04-28T09:00:00Z', plate: 'กข 1234',
        model: 'Toyota Vios', customer_name: 'คุณสมศักดิ์ แก้วงาม',
        subtotal: 2050, grand_total: 2050, branch_id: 'samchuk',
        technician: 'สมชาย', repair_details: 'เปลี่ยนถ่ายน้ำมันเครื่อง + กรอง'
    })
    await insert('jobs', {
        job_no: 'JOB-2026-0002', status: 'completed',
        start_date: '2026-04-25T10:00:00Z', end_date: '2026-04-25T15:00:00Z',
        plate: '2กก 5678', model: 'Honda City',
        customer_name: 'คุณสมศักดิ์ แก้วงาม', subtotal: 2650,
        grand_total: 2650, branch_id: 'samchuk', payment_type: 'cash'
    })

    console.log('\n═══════════════════════════════════════')
    console.log('  ✅ Test data seeded!')
    console.log('═══════════════════════════════════════')
    console.log('\nTest Credentials:')
    console.log('  MungkhudShop:  admin/admin123  or  owner/owner123')
    console.log('  PIN Login:     000000 (admin)  280612 (owner)  111111 (manager)')
}

seed().catch(e => { console.error('Seed failed:', e); process.exit(1) })
