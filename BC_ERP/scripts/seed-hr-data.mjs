#!/usr/bin/env node
/**
 * Seed HR Test Data — Attendance and Leaves
 * Generates data so the HR dashboards render.
 *
 * Usage:
 *   node scripts/seed-hr-data.mjs --url=http://localhost:9080 --token=YOUR_TOKEN
 */

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=')
        return [k, v]
    })
)

const NOCO_URL = args['url'] || 'http://localhost:9080'
const API_TOKEN = args['token'] || 'UmqurJUh0NhbrQWnhMJ-sXRgA6wfrlX4dvk9Y5YD' // fallback token

if (!API_TOKEN) { console.error('❌ --token required'); process.exit(1) }

async function nocoFetch(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', 'xc-token': API_TOKEN, ...(opts.headers || {}) }
    const res = await fetch(`${NOCO_URL}${path}`, { ...opts, headers })
    if (!res.ok) {
        const txt = await res.text()
        throw new Error(`${res.status} - ${txt}`)
    }
    return res.json()
}

let tableIdMap = {}

async function loadTableIds() {
    const wsRes = await nocoFetch('/api/v2/meta/workspaces')
    const wsId = wsRes.list[0].id
    const basesRes = await nocoFetch(`/api/v2/meta/workspaces/${wsId}/bases`)
    const base = basesRes.list.find(b => b.title === 'BC_ERP') || basesRes.list[0]
    const tablesRes = await nocoFetch(`/api/v2/meta/bases/${base.id}/tables`)
    tablesRes.list.forEach(t => { tableIdMap[t.title.toLowerCase()] = t.id })
    console.log(`✅ Loaded tables from "${base.title}"`)
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

async function seedHR() {
    console.log('Fetching users...')
    const usersRes = await nocoFetch(`/api/v2/tables/${tableIdMap['users']}/records?limit=100`)
    const employees = usersRes.list.filter(u => ['mechanic', 'sa', 'manager'].includes(u.role))
    
    if (employees.length === 0) {
        console.log('❌ No employees found to mock data for.')
        return
    }

    console.log(`Found ${employees.length} employees to mock.`)

    // We will generate the last 30 days of check-ins
    const attendanceRecords = []
    const leavesRecords = []

    const now = new Date()
    for (let i = 0; i < 30; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        // Skip Sundays as an example of a day off
        if (date.getDay() === 0) continue

        const dateStr = date.toISOString().split('T')[0]

        for (const emp of employees) {
            // 10% chance to be on leave
            const isLeave = Math.random() < 0.1
            const empName = emp.display_name || emp.name || emp.username
            const branch = emp.branch || emp.branch_id || 'samchuk'

            if (isLeave) {
                leavesRecords.push({
                    employee_id: empName,
                    name: empName,
                    start_date: dateStr,
                    end_date: dateStr,
                    reason: 'ลากิจส่วนตัว / ป่วย',
                    type: Math.random() > 0.5 ? 'sick' : 'personal'
                })
            } else {
                // Determine check in time
                // 80% on time (08:00 - 08:50), 20% late (09:05 - 10:00)
                const isLate = Math.random() < 0.2
                const inHour = isLate ? 9 : 8
                const inMin = isLate ? randomInt(5, 59) : randomInt(0, 50)
                
                const checkInDate = new Date(date)
                checkInDate.setHours(inHour, inMin, 0, 0)

                attendanceRecords.push({
                    employee_id: empName,
                    timestamp: checkInDate.toISOString(),
                    type: 'IN',
                    department: branch,
                    store: 'GPS: 14.75, 100.12'
                })

                // Determine check out time (17:00 - 18:30)
                const outHour = 17
                const outMin = randomInt(0, 59)

                const checkOutDate = new Date(date)
                checkOutDate.setHours(outHour, outMin, 0, 0)

                attendanceRecords.push({
                    employee_id: empName,
                    timestamp: checkOutDate.toISOString(),
                    type: 'OUT',
                    department: branch,
                    store: 'GPS: 14.75, 100.12'
                })
            }
        }
    }

    // Insert Attendance
    if (attendanceRecords.length > 0) {
        console.log(`Inserting ${attendanceRecords.length} attendance records...`)
        // NocoDB batch insert max 1000
        for (let i = 0; i < attendanceRecords.length; i += 100) {
            const chunk = attendanceRecords.slice(i, i + 100)
            await nocoFetch(`/api/v2/tables/${tableIdMap['hr_attendance']}/records`, {
                method: 'POST',
                body: JSON.stringify(chunk)
            })
        }
    }

    // Insert Leaves
    if (leavesRecords.length > 0) {
        console.log(`Inserting ${leavesRecords.length} leave records...`)
        for (let i = 0; i < leavesRecords.length; i += 100) {
            const chunk = leavesRecords.slice(i, i + 100)
            await nocoFetch(`/api/v2/tables/${tableIdMap['hr_leaves']}/records`, {
                method: 'POST',
                body: JSON.stringify(chunk)
            })
        }
    }

    console.log('✅ HR Mock Data Seeding Complete!')
}

async function run() {
    try {
        await loadTableIds()
        await seedHR()
    } catch (e) {
        console.error('Failed:', e.message)
    }
}

run()
