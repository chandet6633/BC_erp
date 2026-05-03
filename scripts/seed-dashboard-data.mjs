#!/usr/bin/env node
/**
 * Seed Dashboard Test Data — Jobs, Job Items, and Financial Ledger
 * Generates 6 months of realistic data so the financial dashboard renders.
 *
 * Usage:
 *   node scripts/seed-dashboard-data.mjs --url=http://localhost:9080 --token=YOUR_TOKEN
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=')
        return [k, v]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const API_TOKEN = args['token'] || ''

if (!API_TOKEN) { console.error('❌ --token required'); process.exit(1) }

async function nocoFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', 'xc-token': API_TOKEN, ...(opts.headers || {}) }
    return fetch(`${NOCO_URL}${path}`, { ...opts, headers })
}

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
    console.log(`✅ ${Object.keys(tableIdMap).length} tables loaded from "${base.title}"`)
}

async function insert(table, data) {
    const tableId = tableIdMap[table.toLowerCase()]
    if (!tableId) { console.warn(`⚠️ Table "${table}" not found, skipping`); return null }
    const res = await nocoFetch(`/api/v2/tables/${tableId}/records`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    if (!res.ok) { console.error(`❌ ${table}:`, await res.text()); return null }
    return res.json()
}

// ── Helpers ──
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

const CUSTOMERS = [
    { name: 'คุณสมศักดิ์ แก้วงาม', plate: 'กข 1234', model: 'Toyota Vios' },
    { name: 'คุณวิชัย ทองดี', plate: 'ขค 5678', model: 'Honda City' },
    { name: 'คุณสมหมาย จันทร์เพ็ง', plate: '1กก 9012', model: 'Isuzu D-Max' },
    { name: 'คุณปรีชา สุขสำราญ', plate: '2ขข 3456', model: 'Toyota Hilux Revo' },
    { name: 'คุณนิรุต วงศ์สุวรรณ', plate: 'กง 7890', model: 'Mitsubishi Triton' },
    { name: 'บจก.ขนส่งสุพรรณ', plate: '80-1234', model: 'Hino 500' },
    { name: 'คุณแดง ชาวนา', plate: 'ผก 2468', model: 'Toyota Yaris Ativ' },
    { name: 'คุณนภา ศรีสวัสดิ์', plate: 'ฉช 1357', model: 'Honda HR-V' },
]

const SERVICES = [
    { name: 'น้ำมันเครื่อง 5W-40 (4L)', price: 1200, cost: 650, type: 'Fluid' },
    { name: 'น้ำมันเครื่อง 10W-30 (1L)', price: 350, cost: 180, type: 'Fluid' },
    { name: 'กรองน้ำมัน Toyota', price: 250, cost: 80, type: 'Part' },
    { name: 'กรองอากาศ Honda', price: 350, cost: 120, type: 'Part' },
    { name: 'ผ้าเบรคหน้า', price: 1500, cost: 450, type: 'Part' },
    { name: 'ค่าแรงเปลี่ยนถ่าย', price: 300, cost: 0, type: 'Service' },
    { name: 'ค่าแรงเช็คระยะ', price: 500, cost: 0, type: 'Service' },
    { name: 'น้ำยาหล่อเย็น', price: 280, cost: 90, type: 'Fluid' },
    { name: 'ผ้าเบรคหลัง', price: 1200, cost: 380, type: 'Part' },
    { name: 'ค่าแรงเปลี่ยนเบรค', price: 800, cost: 0, type: 'Service' },
]

const EXPENSE_CATEGORIES = ['ค่าไฟ', 'ค่าน้ำ', 'ค่าเช่า', 'ค่าอุปกรณ์', 'ค่าน้ำมันรถ', 'ค่าโฆษณา', 'ค่าซ่อมบำรุง', 'เงินเดือน']
const BRANCHES = ['samchuk', 'suphanburi']
const TECHS = ['สมชาย', 'วิชัย', 'ประเสริฐ']
const STATUSES = ['completed', 'completed', 'completed', 'invoiced', 'open']

async function seed() {
    console.log('═══════════════════════════════════════')
    console.log('  Seeding Dashboard Test Data')
    console.log('═══════════════════════════════════════')
    
    await loadTableIds()

    const now = new Date()
    let jobNum = 3  // start after existing seed data

    // ── Generate 6 months of jobs ──
    console.log('\n🔧 Generating jobs (6 months)...')
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
        const baseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
        const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
        const jobsThisMonth = rand(8, 15)

        for (let j = 0; j < jobsThisMonth; j++) {
            const day = rand(1, daysInMonth)
            const hour = rand(8, 17)
            const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), day, hour)
            const customer = pick(CUSTOMERS)
            const branch = pick(BRANCHES)
            const status = pick(STATUSES)
            const tech = pick(TECHS)

            // Pick 1-4 services for this job
            const numItems = rand(1, 4)
            const selectedItems = []
            const usedIdx = new Set()
            for (let i = 0; i < numItems; i++) {
                let idx
                do { idx = rand(0, SERVICES.length - 1) } while (usedIdx.has(idx))
                usedIdx.add(idx)
                const svc = SERVICES[idx]
                const qty = svc.type === 'Service' ? 1 : rand(1, 3)
                selectedItems.push({ ...svc, qty })
            }

            const subtotal = selectedItems.reduce((s, i) => s + i.price * i.qty, 0)
            const jobNo = `JOB-${startDate.getFullYear()}-${String(jobNum++).padStart(4, '0')}`

            const endDate = status === 'completed' || status === 'invoiced'
                ? new Date(startDate.getTime() + rand(2, 8) * 3600000)
                : null

            const jobData = {
                job_no: jobNo,
                status,
                start_date: startDate.toISOString(),
                plate: customer.plate,
                model: customer.model,
                customer_name: customer.name,
                subtotal,
                grand_total: subtotal,
                branch_id: branch,
                technician: tech,
                repair_details: selectedItems.map(i => i.name).join(', ')
            }
            if (endDate) jobData.end_date = endDate.toISOString()
            if (status === 'completed' || status === 'invoiced') jobData.payment_type = pick(['cash', 'transfer', 'credit'])

            const jobRes = await insert('jobs', jobData)
            if (!jobRes) continue

            // Insert job items
            const jobId = jobRes.Id || jobRes.id
            for (const item of selectedItems) {
                await insert('job_items', {
                    job_id: String(jobId),
                    product_name: item.name,
                    type: item.type,
                    qty: item.qty,
                    price: item.price,
                    cost: item.cost,
                    total: item.price * item.qty
                })
            }
        }
        console.log(`  📅 ${baseDate.toLocaleDateString('th-TH', {month:'long', year:'numeric'})} — ${jobsThisMonth} jobs`)
    }

    // ── Generate expenses ──
    console.log('\n💸 Generating expenses (6 months)...')
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
        const baseDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
        const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
        const expCount = rand(5, 10)

        for (let e = 0; e < expCount; e++) {
            const day = rand(1, daysInMonth)
            const dateStr = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const category = pick(EXPENSE_CATEGORIES)
            const branch = pick(BRANCHES)
            const isOwner = Math.random() < 0.15

            await insert('financial_ledger', {
                date: dateStr,
                entry_type: isOwner ? 'owner_withdrawal' : 'expense',
                category,
                notes: `${category} ประจำเดือน`,
                amount: rand(500, 15000),
                payment_type: pick(['cash', 'transfer']),
                branch_id: branch,
                created_by: 'seed-script'
            })
        }
        console.log(`  💰 ${baseDate.toLocaleDateString('th-TH', {month:'long', year:'numeric'})} — ${expCount} expenses`)
    }

    console.log('\n═══════════════════════════════════════')
    console.log('  ✅ Dashboard data seeded!')
    console.log(`  📊 ~60-90 jobs + ~30-60 expenses`)
    console.log('═══════════════════════════════════════')
}

seed().catch(e => { console.error('Seed failed:', e); process.exit(1) })
