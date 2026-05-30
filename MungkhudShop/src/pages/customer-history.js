import { createAutocomplete, showToast, formatCurrency, formatDate } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { escapeHtml } from '../utils/sanitize.js'
import { printJob } from '../services/print-engine.js'

export function initCustomerHistoryPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">manage_search</span>
                <h1>ประวัติลูกค้า (Customer History)</h1>
            </div>
        </div>
        
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-group" style="max-width:400px;">
                    <label class="form-label">ค้นหาลูกค้า (ชื่อ, เบอร์โทร หรือ รหัส CUST)</label>
                    <div id="customerSearchAC"></div>
                </div>
            </div>
        </div>

        <div id="customerResultPanel" style="display:none;">
            <!-- Lifetime stats & vehicles -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-4);">
                <div class="card">
                    <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">account_circle</span> ข้อมูลลูกค้า</h3></div>
                    <div class="card-body" id="customerProfileInfo">
                        <!-- Profile injected here -->
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">directions_car</span> รถยนต์ของลูกค้า</h3></div>
                    <div class="card-body">
                        <ul id="customerVehiclesList" style="list-style:none;padding:0;margin:0;line-height:1.6;">
                            <!-- Vehicles injected here -->
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Job History -->
            <div class="card">
                <div class="card-header"><h3><span class="material-icons-outlined" style="vertical-align:middle;margin-right:4px;">history</span> ประวัติการเข้ารับบริการ</h3></div>
                <div class="card-body" style="padding:0;overflow-x:auto;">
                    <table class="data-grid" style="width:100%;text-align:left;">
                        <thead>
                            <tr>
                                <th>วันที่</th>
                                <th>ใบงาน</th>
                                <th>ทะเบียนรถ</th>
                                <th>ยอดเงิน</th>
                                <th>สถานะใบงาน</th>
                                <th>ชำระเงิน</th>
                                <th style="text-align:center;">พิมพ์</th>
                            </tr>
                        </thead>
                        <tbody id="customerJobsTbody">
                            <!-- Jobs injected here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `

    createAutocomplete({
        container: container.querySelector('#customerSearchAC'),
        placeholder: 'พิมพ์ชื่อ หรือ เบอร์โทร...',
        fetchItems: async () => {
            const custs = await fetchFullList('customers', { requestKey: null })
            return custs.map(c => ({
                id: c.id,
                code: c.cust_code,
                label: c.name,
                secondary: `${c.cust_code ? '[' + c.cust_code + '] ' : ''}${c.phone || ''}`,
                _raw: c
            }))
        },
        onSelect: async (item) => {
            await loadCustomerHistory(item._raw.id, container)
        }
    })
}

async function loadCustomerHistory(customerId, container) {
    if (!customerId) return
    const panel = container.querySelector('#customerResultPanel')
    panel.style.display = 'block'
    
    try {
        // 1. Get Customer Info
        const custs = await fetchFullList('customers', { filter: `(id='${customerId}')` })
        if (custs.length === 0) throw new Error('ไม่พบข้อมูลลูกค้า')
        const cust = custs[0]

        // 2. Get Vehicles
        const vehicles = await fetchFullList('vehicles', { filter: `(customer_id='${customerId}')` })
        
        // 3. Get Jobs
        const jobs = await fetchFullList('jobs', { filter: `(customer_id='${customerId}')`, sort: '-start_date' })
        
        // Calculate lifetime spend (only paid or closed jobs)
        let lifetimeSpend = 0
        jobs.forEach(j => {
            if (j.status === 'completed' || j.payment_status === 'paid') {
                lifetimeSpend += parseFloat(j.grand_total || 0)
            }
        })

        // Render Profile
        container.querySelector('#customerProfileInfo').innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                ${cust.cust_code ? `<span style="background:var(--color-primary-light);color:var(--color-primary);font-family:monospace;font-weight:bold;font-size:1rem;padding:4px 10px;border-radius:var(--radius-sm);">${escapeHtml(cust.cust_code)}</span>` : ''}
                <div style="font-size:18px;font-weight:bold;">${escapeHtml(cust.name)}</div>
            </div>
            <div><strong>โทรศัพท์:</strong> ${escapeHtml(cust.phone || '-')}</div>
            ${cust.email ? `<div><strong>อีเมล:</strong> ${escapeHtml(cust.email)}</div>` : ''}
            <div><strong>ยอดใช้จ่ายสะสม:</strong> <span style="color:var(--color-success);font-weight:bold;">${formatCurrency(lifetimeSpend)}</span></div>
        `

        // Render Vehicles
        const vList = container.querySelector('#customerVehiclesList')
        vList.innerHTML = vehicles.length > 0 ? vehicles.map(v => `
            <li style="border-bottom:1px solid var(--bc-border);padding-bottom:4px;margin-bottom:4px;">
                <strong>${escapeHtml(v.plate_number || v.plate || '-')}</strong> — ${escapeHtml(v.brand || '')} ${escapeHtml(v.model || '')}
            </li>
        `).join('') : '<li class="text-muted">ไม่พบข้อมูลรถยนต์</li>'

        // Render Jobs
        const tbody = container.querySelector('#customerJobsTbody')
        tbody.innerHTML = jobs.length > 0 ? jobs.map(j => {
            const statusMap = {
                open: { className: 'warning', label: 'เปิด' },
                pending: { className: 'warning', label: 'รับรถ' },
                in_progress: { className: 'warning', label: 'กำลังซ่อม' },
                qc_done: { className: 'warning', label: 'รอเก็บเงิน' },
                completed: { className: 'success', label: 'ปิดงาน' },
                cancelled: { className: 'danger', label: 'ยกเลิก' }
            }
            const statusInfo = statusMap[j.status] || { className: 'warning', label: j.status || '-' }
            const statusBadge = `<span class="status-badge ${statusInfo.className}">${escapeHtml(statusInfo.label)}</span>`

            let payBadge = ''
            if (j.payment_status === 'paid') payBadge = '<span class="status-badge success">ชำระแล้ว</span>'
            else if (j.payment_status === 'partial') payBadge = '<span class="status-badge warning">จ่ายบางส่วน</span>'
            else payBadge = '<span class="status-badge danger">ค้างชำระ</span>'

            return `
                <tr>
                    <td data-label="วันที่">${formatDate(j.start_date)}</td>
                    <td data-label="ใบงาน"><a href="#/job?id=${j.id}" target="_blank">${escapeHtml(j.job_no)}</a></td>
                    <td data-label="ทะเบียนรถ">${escapeHtml(j.plate)}</td>
                    <td data-label="ยอดเงิน">${formatCurrency(j.grand_total || 0)}</td>
                    <td data-label="สถานะใบงาน">${statusBadge}</td>
                    <td data-label="ชำระเงิน">${payBadge}</td>
                    <td data-label="พิมพ์" style="text-align:center;">
                        <button class="btn btn-sm btn-outline btn-print-history" data-jobid="${j.id}">
                            <span class="material-icons-outlined" style="font-size:16px;">print</span>
                        </button>
                    </td>
                </tr>
            `
        }).join('') : '<tr><td colspan="7" style="text-align:center;">ไม่มีประวัติการเข้ารับบริการ</td></tr>'

        // Attach Print Event Listeners
        container.querySelectorAll('.btn-print-history').forEach(btn => {
            btn.addEventListener('click', () => {
                const jid = btn.dataset.jobid
                if (jid) printJob(jid)
            })
        })

    } catch (e) {
        console.error(e)
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + e.message, 'error')
    }
}
