/**
 * Branch Management CRUD page.
 * Admin can create, edit, and delete branches (shops).
 */
import { createTabs, renderDataGrid, showToast, showConfirm } from '../components/ui.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'

export function initBranchPage(container) {
    let currentBranches = []
    let editingId = null

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">store</span>
                <h1>จัดการสาขา</h1>
            </div>
        </div>
        <div id="branchTabs"></div>
        <div id="panel-search" class="tab-panel active"></div>
        <div id="panel-add" class="tab-panel"></div>
    `
    const tabContainer = container.querySelector('#branchTabs')
    createTabs(container, [
        { id: 'search', label: 'รายชื่อสาขา', icon: 'store' },
        { id: 'add', label: 'เพิ่ม / แก้ไข', icon: 'add_business' },
    ])
    const tabBar = container.querySelector('.tabs')
    if (tabBar && tabContainer) tabContainer.appendChild(tabBar)

    const searchPanel = container.querySelector('#panel-search')
    searchPanel.innerHTML = `
        <div id="branchGrid"></div>
    `

    const addPanel = container.querySelector('#panel-add')
    addPanel.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveBranch"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline" id="btnClearBranch"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>ข้อมูลสาขา</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label required">รหัสสาขา</label>
                        <input type="text" class="form-control" id="branchCode" placeholder="e.g. HQ, BR01">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">ชื่อสาขา</label>
                        <input type="text" class="form-control" id="branchName" placeholder="สาขาหลัก">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ที่อยู่</label>
                        <textarea class="form-control" id="branchAddress" rows="2" placeholder="ที่อยู่สาขา..."></textarea>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>ข้อมูลเพิ่มเติม</h3></div>
                <div class="card-body">
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">เบอร์โทร</label>
                            <input type="text" class="form-control" id="branchPhone">
                        </div>
                        <div class="form-group">
                            <label class="form-label">อีเมล</label>
                            <input type="email" class="form-control" id="branchEmail">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขประจำตัวผู้เสียภาษี</label>
                        <input type="text" class="form-control" id="branchTaxId">
                    </div>
                    <div class="form-group">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" id="branchActive">
                            <option value="true">เปิดใช้งาน</option>
                            <option value="false">ปิดใช้งาน</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `

    async function loadBranches() {
        const gridEl = searchPanel.querySelector('#branchGrid')
        gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลด...</div>'
        currentBranches = await fetchFullList('branches', { requestKey: null })
        gridEl.innerHTML = renderDataGrid({
            columns: [
                { key: 'code', label: 'รหัส' },
                { key: 'name', label: 'ชื่อสาขา' },
                { key: 'address', label: 'ที่อยู่' },
                { key: 'phone', label: 'โทร' },
                { key: 'is_active', label: 'สถานะ', render: r => r.is_active !== false ? '<span class="badge badge-open">เปิด</span>' : '<span class="badge badge-cancelled">ปิด</span>' },
                {
                    key: 'actions', label: '', render: r => `
                    <div class="grid-actions">
                        <button class="btn btn-sm btn-outline btn-edit" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                    </div>
                ` }
            ],
            items: currentBranches
        })
        gridEl.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = () => editBranch(btn.dataset.id))
        gridEl.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = () => deleteBranch(btn.dataset.id))
    }

    function editBranch(id) {
        const b = currentBranches.find(x => x.id === id)
        if (!b) return
        editingId = id
        addPanel.querySelector('#branchCode').value = b.code || ''
        addPanel.querySelector('#branchName').value = b.name || ''
        addPanel.querySelector('#branchAddress').value = b.address || ''
        addPanel.querySelector('#branchPhone').value = b.phone || ''
        addPanel.querySelector('#branchEmail').value = b.email || ''
        addPanel.querySelector('#branchTaxId').value = b.tax_id || ''
        addPanel.querySelector('#branchActive').value = b.is_active !== false ? 'true' : 'false'
        container.querySelector('.tab-btn[data-tab="add"]').click()
    }

    async function deleteBranch(id) {
        if (await showConfirm('ยืนยันลบ', 'คุณต้องการลบสาขานี้?')) {
            await deleteRecord('branches', id)
            showToast('ลบสาขาเรียบร้อย', 'success')
            loadBranches()
        }
    }

    addPanel.querySelector('#btnSaveBranch').addEventListener('click', async () => {
        const code = addPanel.querySelector('#branchCode').value.trim()
        const name = addPanel.querySelector('#branchName').value.trim()
        if (!code || !name) return showToast('กรุณากรอกรหัสและชื่อสาขา', 'error')

        const data = {
            code, name,
            address: addPanel.querySelector('#branchAddress').value,
            phone: addPanel.querySelector('#branchPhone').value,
            email: addPanel.querySelector('#branchEmail').value,
            tax_id: addPanel.querySelector('#branchTaxId').value,
            is_active: addPanel.querySelector('#branchActive').value === 'true'
        }
        try {
            if (editingId) {
                await updateRecord('branches', editingId, data)
            } else {
                await createRecord('branches', data)
            }
            showToast('บันทึกสาขาเรียบร้อย', 'success')
            clearForm()
            container.querySelector('.tab-btn[data-tab="search"]').click()
            loadBranches()
        } catch (e) {
            showToast('เกิดข้อผิดพลาด: ' + e.message, 'error')
        }
    })

    function clearForm() {
        editingId = null
        addPanel.querySelector('#branchCode').value = ''
        addPanel.querySelector('#branchName').value = ''
        addPanel.querySelector('#branchAddress').value = ''
        addPanel.querySelector('#branchPhone').value = ''
        addPanel.querySelector('#branchEmail').value = ''
        addPanel.querySelector('#branchTaxId').value = ''
        addPanel.querySelector('#branchActive').value = 'true'
    }
    addPanel.querySelector('#btnClearBranch').addEventListener('click', clearForm)

    loadBranches()
}
