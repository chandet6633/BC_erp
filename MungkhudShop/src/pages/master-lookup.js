/**
 * Master Lookup (ข้อมูลอ้างอิง) page — system lookups.
 */
import { createTabs, showToast } from '../components/ui.js'

const LOOKUP_CATEGORIES = [
    { id: 'provinces', label: 'จังหวัด', icon: 'location_on' },
    { id: 'banks', label: 'ธนาคาร', icon: 'account_balance' },
    { id: 'credit_cards', label: 'บัตรเครดิต', icon: 'credit_card' },
    { id: 'tax_categories', label: 'ประเภทภาษี', icon: 'percent' },
    { id: 'prefixes', label: 'คำนำหน้า', icon: 'badge' },
    { id: 'units', label: 'หน่วยนับ', icon: 'straighten' },
    { id: 'product_groups', label: 'กลุ่มสินค้า', icon: 'category' },
    { id: 'job_types', label: 'ประเภทงาน', icon: 'build' },
]

export function initMasterLookupPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">list_alt</span>
                <h1>ข้อมูลอ้างอิง</h1>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:240px 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>หมวดหมู่</h3></div>
                <div class="card-body" style="padding:0;">
                    <div id="lookupCategories">
                        ${LOOKUP_CATEGORIES.map((c, i) => `
                            <div class="nav-item ${i === 0 ? 'active' : ''}" data-cat="${c.id}" style="padding:var(--sp-3) var(--sp-4);cursor:pointer;border-left:3px solid ${i === 0 ? 'var(--color-primary)' : 'transparent'};">
                                <span class="material-icons-outlined" style="font-size:18px;">${c.icon}</span>
                                <span>${c.label}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3 id="lookupTitle">${LOOKUP_CATEGORIES[0].label}</h3>
                    <button class="btn btn-sm btn-primary" id="btnAddLookup"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>
                </div>
                <div class="card-body">
                    <div class="data-grid">
                        <table>
                            <thead><tr><th>#</th><th>รหัส</th><th>ชื่อ</th><th>สถานะ</th><th></th></tr></thead>
                            <tbody id="lookupBody">
                                <tr><td colspan="5" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">เลือกหมวดหมู่เพื่อดูข้อมูล</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `
    // Category navigation
    container.querySelectorAll('#lookupCategories .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            container.querySelectorAll('#lookupCategories .nav-item').forEach(i => {
                i.classList.remove('active')
                i.style.borderLeftColor = 'transparent'
            })
            item.classList.add('active')
            item.style.borderLeftColor = 'var(--color-primary)'
            const cat = LOOKUP_CATEGORIES.find(c => c.id === item.dataset.cat)
            container.querySelector('#lookupTitle').textContent = cat?.label || ''
        })
    })
    container.querySelector('#btnAddLookup').addEventListener('click', () => showToast('เพิ่มรายการใหม่', 'info'))
}
