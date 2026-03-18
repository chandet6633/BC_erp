/**
 * User & Permissions Management page.
 * Admin can view/edit app_users and assign granular JSON permissions.
 */
import { createTabs, renderDataGrid, showToast, showConfirm } from '../components/ui.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'
import { hashPassword } from '../services/crypto.js'

const PERMISSION_KEYS = [
    { key: 'can_create_job', label: 'สร้างใบงาน', group: 'ใบงาน' },
    { key: 'can_close_job', label: 'ปิดใบงาน', group: 'ใบงาน' },
    { key: 'can_cancel_job', label: 'ยกเลิกใบงาน', group: 'ใบงาน' },
    { key: 'can_create_doc', label: 'สร้างเอกสาร', group: 'เอกสาร' },
    { key: 'can_void_doc', label: 'ยกเลิกเอกสาร', group: 'เอกสาร' },
    { key: 'can_print_doc', label: 'พิมพ์เอกสาร', group: 'เอกสาร' },
    { key: 'can_manage_stock', label: 'จัดการคลังสินค้า', group: 'คลัง' },
    { key: 'can_approve_stock', label: 'อนุมัติรายการคลัง', group: 'คลัง' },
    { key: 'can_view_cost', label: 'ดูราคาทุน', group: 'การเงิน' },
    { key: 'can_view_reports', label: 'ดูรายงาน', group: 'การเงิน' },
    { key: 'can_export_data', label: 'ส่งออกข้อมูล', group: 'การเงิน' },
    { key: 'can_manage_users', label: 'จัดการผู้ใช้', group: 'ระบบ' },
    { key: 'can_manage_settings', label: 'จัดการตั้งค่า', group: 'ระบบ' },
    { key: 'can_manage_branches', label: 'จัดการสาขา', group: 'ระบบ' },
]

export function initUserPermissionsPage(container) {
    let currentUsers = []
    let editingId = null

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">admin_panel_settings</span>
                <h1>จัดการผู้ใช้ & สิทธิ์</h1>
            </div>
        </div>
        <div id="userPermTabs"></div>
        <div id="panel-search" class="tab-panel active"></div>
        <div id="panel-add" class="tab-panel"></div>
    `
    const tabContainer = container.querySelector('#userPermTabs')
    createTabs(container, [
        { id: 'search', label: 'รายชื่อผู้ใช้', icon: 'people' },
        { id: 'add', label: 'เพิ่ม / แก้ไข', icon: 'person_add' },
    ])
    const tabBar = container.querySelector('.tabs')
    if (tabBar && tabContainer) tabContainer.appendChild(tabBar)

    // ── Search Panel ──
    const searchPanel = container.querySelector('#panel-search')
    searchPanel.innerHTML = `
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="search-bar" style="max-width:400px;">
                    <span class="material-icons-outlined">search</span>
                    <input type="text" id="searchUserInput" placeholder="ค้นหาผู้ใช้...">
                </div>
            </div>
        </div>
        <div id="userGrid"></div>
    `

    async function loadUsers() {
        const gridEl = container.querySelector('#userGrid')
        gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
        currentUsers = await fetchFullList('app_users', { requestKey: null })
        renderUserGrid(currentUsers)
    }

    function renderUserGrid(users) {
        const gridEl = container.querySelector('#userGrid')
        gridEl.innerHTML = renderDataGrid({
            columns: [
                { key: 'username', label: 'ชื่อผู้ใช้' },
                { key: 'display_name', label: 'ชื่อแสดง' },
                {
                    key: 'role', label: 'บทบาท', render: r => {
                        const labels = { admin: '👑 ผู้ดูแล', manager: '📋 ผู้จัดการ', employee: '👤 พนักงาน' }
                        return labels[r.role] || r.role
                    }
                },
                { key: 'is_active', label: 'สถานะ', render: r => r.is_active ? '<span class="badge badge-open">ใช้งาน</span>' : '<span class="badge badge-cancelled">ปิดใช้งาน</span>' },
                {
                    key: 'permissions', label: 'สิทธิ์พิเศษ', render: r => {
                        if (r.role === 'admin') return '<span class="text-sm text-muted">ทั้งหมด</span>'
                        try {
                            const perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {})
                            const count = Object.values(perms).filter(v => v).length
                            return `<span class="text-sm">${count} สิทธิ์</span>`
                        } catch { return '-' }
                    }
                },
                {
                    key: 'actions', label: '', render: r => `
                    <div class="grid-actions">
                        <button class="btn btn-sm btn-outline btn-edit" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                    </div>
                `}
            ],
            items: users
        })
        gridEl.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation()
            editUser(e.currentTarget.dataset.id)
        })
        gridEl.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation()
            deleteUser(e.currentTarget.dataset.id)
        })
    }

    container.querySelector('#searchUserInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase()
        const filtered = currentUsers.filter(u =>
            (u.username || '').toLowerCase().includes(val) ||
            (u.display_name || '').toLowerCase().includes(val)
        )
        renderUserGrid(filtered)
    })

    // ── Add/Edit Panel ──
    const addPanel = container.querySelector('#panel-add')

    // Group permissions by category
    const groups = {}
    PERMISSION_KEYS.forEach(p => {
        if (!groups[p.group]) groups[p.group] = []
        groups[p.group].push(p)
    })

    const permGroupsHtml = Object.entries(groups).map(([group, perms]) => `
        <div style="margin-bottom:var(--sp-3);">
            <div style="font-weight:600;font-size:0.85rem;color:var(--color-primary);margin-bottom:var(--sp-2);">${group}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
                ${perms.map(p => `
                    <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;font-size:0.85rem;">
                        <input type="checkbox" class="perm-check" data-key="${p.key}">
                        ${p.label}
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('')

    addPanel.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveUser"><span class="material-icons-outlined">save</span> บันทึก</button>
                <button class="btn btn-outline" id="btnClearUser"><span class="material-icons-outlined">refresh</span> ล้างฟอร์ม</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
            <div class="card">
                <div class="card-header"><h3>ข้อมูลผู้ใช้</h3></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label required">ชื่อผู้ใช้</label>
                        <input type="text" class="form-control" id="userUsername">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">รหัสผ่าน</label>
                        <input type="password" class="form-control" id="userPassword" placeholder="ตั้งรหัสผ่าน...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ชื่อแสดง</label>
                        <input type="text" class="form-control" id="userDisplayName">
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label">บทบาท</label>
                            <select class="form-control" id="userRole">
                                <option value="employee">พนักงาน</option>
                                <option value="manager">ผู้จัดการ</option>
                                <option value="admin">ผู้ดูแลระบบ</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">สถานะ</label>
                            <select class="form-control" id="userActive">
                                <option value="true">ใช้งาน</option>
                                <option value="false">ปิดใช้งาน</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">สาขา</label>
                        <select class="form-control" id="userBranch">
                            <option value="">ไม่กำหนด (ทุกสาขา)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>สิทธิ์การใช้งาน</h3>
                    <div class="toolbar-actions" style="gap:var(--sp-2);">
                        <button class="btn btn-sm btn-outline" id="btnCheckAll">เลือกทั้งหมด</button>
                        <button class="btn btn-sm btn-outline" id="btnUncheckAll">ยกเลิกทั้งหมด</button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="padding:var(--sp-2);background:var(--color-warning-light);border-radius:var(--radius-sm);margin-bottom:var(--sp-3);font-size:0.8rem;">
                        💡 <strong>Admin</strong> มีสิทธิ์ทั้งหมดโดยอัตโนมัติ — ไม่ต้องเลือก checkbox
                    </div>
                    ${permGroupsHtml}
                </div>
            </div>
        </div>
    `

    // Load branches into branch select
    fetchFullList('branches').then(branches => {
        const sel = addPanel.querySelector('#userBranch')
        branches.forEach(b => {
            const opt = document.createElement('option')
            opt.value = b.id
            opt.textContent = b.name
            sel.appendChild(opt)
        })
    }).catch(() => { })

    // Check/Uncheck all
    addPanel.querySelector('#btnCheckAll').addEventListener('click', () => {
        addPanel.querySelectorAll('.perm-check').forEach(cb => cb.checked = true)
    })
    addPanel.querySelector('#btnUncheckAll').addEventListener('click', () => {
        addPanel.querySelectorAll('.perm-check').forEach(cb => cb.checked = false)
    })

    function editUser(id) {
        const user = currentUsers.find(u => u.id === id)
        if (!user) return
        editingId = id
        addPanel.querySelector('#userUsername').value = user.username || ''
        addPanel.querySelector('#userPassword').value = ''  // Never expose stored hash
        addPanel.querySelector('#userPassword').placeholder = '(ไม่เปลี่ยนแปลง — กรอกเฉพาะเมื่อต้องการเปลี่ยน)'
        addPanel.querySelector('#userDisplayName').value = user.display_name || ''
        addPanel.querySelector('#userRole').value = user.role || 'employee'
        addPanel.querySelector('#userActive').value = user.is_active ? 'true' : 'false'
        addPanel.querySelector('#userBranch').value = user.branch_id || ''

        // Set permissions checkboxes
        let perms = {}
        try {
            perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {})
        } catch { perms = {} }
        addPanel.querySelectorAll('.perm-check').forEach(cb => {
            cb.checked = !!perms[cb.dataset.key]
        })

        container.querySelector('.tab-btn[data-tab="add"]').click()
    }

    async function deleteUser(id) {
        if (await showConfirm('ยืนยันลบ', 'คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?')) {
            try {
                await deleteRecord('app_users', id)
                showToast('ลบผู้ใช้เรียบร้อย', 'success')
                loadUsers()
            } catch (e) {
                showToast('ไม่สามารถลบผู้ใช้ได้', 'error')
            }
        }
    }

    addPanel.querySelector('#btnSaveUser').addEventListener('click', async () => {
        const username = addPanel.querySelector('#userUsername').value.trim()
        const password = addPanel.querySelector('#userPassword').value.trim()

        // New user requires password; edit can skip if unchanged
        if (!username) return showToast('กรุณากรอกชื่อผู้ใช้', 'error')
        if (!editingId && !password) return showToast('กรุณากรอกรหัสผ่าน', 'error')

        // Build permissions JSON
        const perms = {}
        addPanel.querySelectorAll('.perm-check').forEach(cb => {
            perms[cb.dataset.key] = cb.checked
        })

        const data = {
            username,
            display_name: addPanel.querySelector('#userDisplayName').value,
            role: addPanel.querySelector('#userRole').value,
            is_active: addPanel.querySelector('#userActive').value === 'true',
            branch_id: addPanel.querySelector('#userBranch').value,
            permissions: JSON.stringify(perms)
        }

        // Only hash and include password if a new one was entered
        if (password) {
            data.password = await hashPassword(password)
        }

        try {
            if (editingId) {
                await updateRecord('app_users', editingId, data)
                showToast('อัปเดตผู้ใช้เรียบร้อย', 'success')
            } else {
                await createRecord('app_users', data)
                showToast('เพิ่มผู้ใช้ใหม่เรียบร้อย', 'success')
            }
            clearForm()
            container.querySelector('.tab-btn[data-tab="search"]').click()
            loadUsers()
        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาด: ' + (e.message || ''), 'error')
        }
    })

    function clearForm() {
        editingId = null
        addPanel.querySelector('#userUsername').value = ''
        addPanel.querySelector('#userPassword').value = ''
        addPanel.querySelector('#userDisplayName').value = ''
        addPanel.querySelector('#userRole').value = 'employee'
        addPanel.querySelector('#userActive').value = 'true'
        addPanel.querySelector('#userBranch').value = ''
        addPanel.querySelectorAll('.perm-check').forEach(cb => cb.checked = false)
    }

    addPanel.querySelector('#btnClearUser').addEventListener('click', clearForm)

    loadUsers()
}
