/**
 * Master Lookup (ข้อมูลอ้างอิง) page — system lookups.
 * Fully wired to NocoDB `lookups` table with CRUD.
 */
import { showToast, showConfirm } from '../components/ui.js'
import { getCurrentUser } from '../services/auth.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'
import { sanitizeFilter } from '../utils/sanitize.js'

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
    const user = getCurrentUser()
    const canEditMasterData = ['manager', 'owner', 'admin'].includes(user?.role)
    let selectedCategory = LOOKUP_CATEGORIES[0].id
    let editingId = null

    container.innerHTML = `
        <style>
            .lookup-layout {
                display: grid;
                grid-template-columns: 240px minmax(0, 1fr);
                gap: var(--sp-5);
            }
            @media (max-width: 768px) {
                .lookup-layout { grid-template-columns: 1fr; }
                .lookup-layout .card { min-width: 0; }
                .lookup-layout .card-header {
                    align-items: flex-start;
                    gap: var(--sp-3);
                }
            }
        </style>
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">list_alt</span>
                <h1>ข้อมูลอ้างอิง</h1>
            </div>
        </div>
        <div class="lookup-layout">
            <div class="card">
                <div class="card-header"><h3>หมวดหมู่</h3></div>
                <div class="card-body" style="padding:0;">
                    <div id="lookupCategories">
                        ${LOOKUP_CATEGORIES.map((c, i) => `
                            <div class="nav-item ${i === 0 ? 'active' : ''}" data-cat="${c.id}" style="padding:var(--sp-3) var(--sp-4);cursor:pointer;border-left:3px solid ${i === 0 ? 'var(--color-primary)' : 'transparent'};display:flex;align-items:center;gap:var(--sp-2);transition:all var(--transition-fast);">
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
                    ${canEditMasterData ? '<button class="btn btn-sm btn-primary" id="btnAddLookup"><span class="material-icons-outlined" style="font-size:16px;">add</span> เพิ่มรายการ</button>' : ''}
                </div>
                <div class="card-body">
                    <!-- Inline Add/Edit Form (hidden by default) -->
                    <div id="lookupForm" style="display:none;margin-bottom:var(--sp-4);padding:var(--sp-4);background:var(--color-surface);border-radius:var(--radius-md);border:1px solid var(--color-border);">
                        <div style="display:flex;gap:var(--sp-3);align-items:flex-end;flex-wrap:wrap;">
                            <div class="form-group" style="flex:1;min-width:140px;margin:0;">
                                <label class="form-label">ชื่อ / รายการ</label>
                                <input type="text" class="form-control" id="lookupLabel" placeholder="เช่น กสิกรไทย">
                            </div>
                            <div class="form-group" style="flex:1;min-width:140px;margin:0;">
                                <label class="form-label">ค่า (Value)</label>
                                <input type="text" class="form-control" id="lookupValue" placeholder="เช่น KBANK">
                            </div>
                            <div style="display:flex;gap:var(--sp-2);">
                                <button class="btn btn-sm btn-primary" id="btnSaveLookup"><span class="material-icons-outlined" style="font-size:16px;">save</span> บันทึก</button>
                                <button class="btn btn-sm btn-outline" id="btnCancelLookup"><span class="material-icons-outlined" style="font-size:16px;">close</span></button>
                            </div>
                        </div>
                    </div>
                    <div class="data-grid">
                        <table>
                            <thead><tr><th>#</th><th>ชื่อ / รายการ</th><th>ค่า (Value)</th><th>สถานะ</th>${canEditMasterData ? '<th></th>' : ''}</tr></thead>
                            <tbody id="lookupBody">
                                <tr><td colspan="${canEditMasterData ? 5 : 4}" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `

    // ─── Category Navigation ───
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
            selectedCategory = item.dataset.cat
            hideForm()
            loadCategoryData()
        })
    })

    // ─── Add Button ───
    container.querySelector('#btnAddLookup')?.addEventListener('click', () => {
        if (!canEditMasterData) return
        editingId = null
        container.querySelector('#lookupLabel').value = ''
        container.querySelector('#lookupValue').value = ''
        container.querySelector('#lookupForm').style.display = 'block'
        container.querySelector('#lookupLabel').focus()
    })

    // ─── Cancel Button ───
    container.querySelector('#btnCancelLookup').addEventListener('click', hideForm)

    function hideForm() {
        editingId = null
        container.querySelector('#lookupForm').style.display = 'none'
    }

    // ─── Save Button ───
    container.querySelector('#btnSaveLookup').addEventListener('click', async () => {
        if (!canEditMasterData) return
        const label = container.querySelector('#lookupLabel').value.trim()
        const value = container.querySelector('#lookupValue').value.trim()
        if (!label) return showToast('กรุณาระบุชื่อรายการ', 'error')

        try {
            if (editingId) {
                await updateRecord('lookups', editingId, { label, value })
                showToast('อัปเดตข้อมูลเรียบร้อย', 'success')
            } else {
                await createRecord('lookups', { type: selectedCategory, label, value, is_active: true })
                showToast('เพิ่มข้อมูลเรียบร้อย', 'success')
            }
            hideForm()
            loadCategoryData()
        } catch (err) {
            console.error(err)
            showToast('เกิดข้อผิดพลาด: ' + err.message, 'error')
        }
    })

    // ─── Load Data ───
    async function loadCategoryData() {
        const tbody = container.querySelector('#lookupBody')
        const colSpan = canEditMasterData ? 5 : 4
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">กำลังโหลดข้อมูล...</td></tr>`

        try {
            const items = await fetchFullList('lookups', { filter: `type='${sanitizeFilter(selectedCategory)}'` })
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${colSpan}" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-text-muted);">ยังไม่มีข้อมูลในหมวดนี้</td></tr>`
                return
            }
            tbody.innerHTML = items.map((item, idx) => `
                <tr>
                    <td data-label="#">${idx + 1}</td>
                    <td data-label="ชื่อ">${item.label || '-'}</td>
                    <td data-label="ค่า">${item.value || '-'}</td>
                    <td data-label="สถานะ">
                        <span class="badge badge-${item.is_active === false || item.is_active === 'false' ? 'cancelled' : 'open'}" style="${canEditMasterData ? 'cursor:pointer;' : ''}" ${canEditMasterData ? `data-id="${item.id}" data-action="toggle"` : ''}>
                            ${item.is_active === false || item.is_active === 'false' ? '❌ ปิดใช้' : '✅ ใช้งาน'}
                        </span>
                    </td>
                    ${canEditMasterData ? `
                    <td data-label="จัดการ">
                        <div class="grid-actions">
                            <button class="btn btn-sm btn-outline" data-id="${item.id}" data-action="edit" title="แก้ไข"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                            <button class="btn btn-sm btn-danger" data-id="${item.id}" data-action="delete" title="ลบ"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                        </div>
                    </td>
                    ` : ''}
                </tr>
            `).join('')

            if (!canEditMasterData) return

            // Wire action buttons
            tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!canEditMasterData) return
                    const item = items.find(i => i.id === btn.dataset.id)
                    if (!item) return
                    editingId = item.id
                    container.querySelector('#lookupLabel').value = item.label || ''
                    container.querySelector('#lookupValue').value = item.value || ''
                    container.querySelector('#lookupForm').style.display = 'block'
                    container.querySelector('#lookupLabel').focus()
                })
            })
            tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!canEditMasterData) return
                    if (await showConfirm('ยืนยันลบ', 'คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
                        await deleteRecord('lookups', btn.dataset.id)
                        showToast('ลบข้อมูลเรียบร้อย', 'success')
                        loadCategoryData()
                    }
                })
            })
            tbody.querySelectorAll('[data-action="toggle"]').forEach(badge => {
                badge.addEventListener('click', async () => {
                    if (!canEditMasterData) return
                    const item = items.find(i => i.id === badge.dataset.id)
                    if (!item) return
                    const newStatus = !(item.is_active === true || item.is_active === 'true')
                    await updateRecord('lookups', item.id, { is_active: newStatus })
                    showToast(newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน', 'success')
                    loadCategoryData()
                })
            })
        } catch (err) {
            console.warn('[Lookup] Failed to load:', err.message)
            tbody.innerHTML = `<tr><td colspan="${colSpan}" class="grid-empty" style="text-align:center;padding:var(--sp-6);color:var(--color-warning);">ไม่สามารถโหลดข้อมูลได้<br><small style="color:var(--color-text-muted);">${err.message}</small></td></tr>`
        }
    }

    // ─── Initial Load ───
    loadCategoryData()
}
