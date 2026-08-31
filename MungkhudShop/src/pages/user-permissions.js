/**
 * Role Permissions Portal page.
 * Admin can view and edit granular JSON permissions for system roles (admin, owner, manager, etc.).
 */
import { createTabs, renderDataGrid, showToast } from '../components/ui.js'
import { fetchFullList, updateRecord } from '../services/pb.js'

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
    let currentRoles = []
    let editingId = null

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">admin_panel_settings</span>
                <h1>จัดการบทบาท & สิทธิ์ (Role Permissions)</h1>
            </div>
        </div>
        <div id="rolePermTabs"></div>
        <div id="panel-list" class="tab-panel active"></div>
        <div id="panel-edit" class="tab-panel"></div>
    `
    const tabContainer = container.querySelector('#rolePermTabs')
    createTabs(container, [
        { id: 'list', label: 'รายการบทบาท', icon: 'shield' },
        { id: 'edit', label: 'แก้ไขสิทธิ์', icon: 'edit' },
    ])
    const tabBar = container.querySelector('.tabs')
    if (tabBar && tabContainer) tabContainer.appendChild(tabBar)

    // ── List Panel ──
    const listPanel = container.querySelector('#panel-list')
    listPanel.innerHTML = `
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div style="font-size:0.9rem;color:var(--color-text-muted);">
                    การกำหนดสิทธิ์ในระบบนี้อ้างอิงตาม "บทบาท" (Role-Based Access Control) 
                    เมื่อเปลี่ยนสิทธิ์ของบทบาท จะส่งผลต่อผู้ใช้ทุกคนที่อยู่ในบทบาทนั้นทันที
                </div>
            </div>
        </div>
        <div id="roleGrid"></div>
    `

    async function loadRoles() {
        const gridEl = container.querySelector('#roleGrid')
        gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
        
        try {
            currentRoles = await fetchFullList('system_roles')
            renderRoleGrid(currentRoles)
        } catch (e) {
            console.error('Failed to load roles:', e)
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--bc-danger);">ไม่สามารถโหลดข้อมูลบทบาทได้</div>'
        }
    }

    function renderRoleGrid(roles) {
        const gridEl = container.querySelector('#roleGrid')
        gridEl.innerHTML = renderDataGrid({
            columns: [
                { key: 'name', label: 'รหัสบทบาท' },
                { key: 'description', label: 'ชื่อบทบาท (ภาษาไทย)' },
                {
                    key: 'permissions', label: 'สิทธิ์พิเศษ', render: r => {
                        if (r.name === 'admin' || r.name === 'owner') return '<span class="text-sm text-muted">ทั้งหมด (ระบบจัดการให้)</span>'
                        try {
                            const perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {})
                            const count = Object.values(perms).filter(v => v).length
                            return `<span class="text-sm">${count} สิทธิ์</span>`
                        } catch { return '-' }
                    }
                },
                {
                    key: 'actions', label: '', render: r => {
                        if (r.name === 'admin' || r.name === 'owner') return '' // Cannot edit admin/owner via UI safely
                        return `
                        <div class="grid-actions">
                            <button class="btn btn-sm btn-outline btn-edit" data-id="${r.id}">
                                <span class="material-icons-outlined" style="font-size:16px;">edit</span> แก้ไขสิทธิ์
                            </button>
                        </div>
                    `}
                }
            ],
            items: roles
        })
        gridEl.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => {
            e.stopPropagation()
            editRole(e.currentTarget.dataset.id)
        })
    }

    // ── Edit Panel ──
    const editPanel = container.querySelector('#panel-edit')

    const groups = {}
    PERMISSION_KEYS.forEach(p => {
        if (!groups[p.group]) groups[p.group] = []
        groups[p.group].push(p)
    })

    const permGroupsHtml = Object.entries(groups).map(([group, perms]) => `
        <div style="margin-bottom:var(--sp-4);">
            <div style="font-weight:600;font-size:0.95rem;color:var(--color-primary);margin-bottom:var(--sp-2);border-bottom:1px solid var(--color-border);padding-bottom:4px;">${group}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);">
                ${perms.map(p => `
                    <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;font-size:0.9rem;padding:var(--sp-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);background:var(--color-surface);">
                        <input type="checkbox" class="perm-check" data-key="${p.key}">
                        ${p.label}
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('')

    editPanel.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-actions">
                <button class="btn btn-primary" id="btnSaveRole"><span class="material-icons-outlined">save</span> บันทึกสิทธิ์</button>
                <button class="btn btn-outline" id="btnCancelEdit"><span class="material-icons-outlined">close</span> ยกเลิก</button>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-header">
                <h3>กำลังแก้ไขบทบาท: <span id="editRoleName" style="color:var(--color-primary);"></span></h3>
            </div>
            <div class="card-body">
                <div class="toolbar-actions" style="gap:var(--sp-2);margin-bottom:var(--sp-4);">
                    <button class="btn btn-sm btn-outline" id="btnCheckAll">เลือกทั้งหมด</button>
                    <button class="btn btn-sm btn-outline" id="btnUncheckAll">ยกเลิกทั้งหมด</button>
                </div>
                ${permGroupsHtml}
            </div>
        </div>
    `

    editPanel.querySelector('#btnCheckAll').addEventListener('click', () => {
        editPanel.querySelectorAll('.perm-check').forEach(cb => cb.checked = true)
    })
    editPanel.querySelector('#btnUncheckAll').addEventListener('click', () => {
        editPanel.querySelectorAll('.perm-check').forEach(cb => cb.checked = false)
    })

    function editRole(id) {
        const role = currentRoles.find(r => r.id === id)
        if (!role) return
        editingId = id
        
        editPanel.querySelector('#editRoleName').textContent = `${role.description} (${role.name})`

        // Set permissions checkboxes
        let perms = {}
        try {
            perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || {})
        } catch { perms = {} }
        
        editPanel.querySelectorAll('.perm-check').forEach(cb => {
            cb.checked = !!perms[cb.dataset.key]
        })

        container.querySelector('.tab-btn[data-tab="edit"]').click()
    }

    editPanel.querySelector('#btnSaveRole').addEventListener('click', async () => {
        if (!editingId) return

        const perms = {}
        editPanel.querySelectorAll('.perm-check').forEach(cb => {
            perms[cb.dataset.key] = cb.checked
        })

        try {
            await updateRecord('system_roles', editingId, { permissions: JSON.stringify(perms) })
            showToast('อัปเดตสิทธิ์บทบาทเรียบร้อย', 'success')
            container.querySelector('.tab-btn[data-tab="list"]').click()
            loadRoles()
        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาด: ' + (e.message || ''), 'error')
        }
    })

    editPanel.querySelector('#btnCancelEdit').addEventListener('click', () => {
        container.querySelector('.tab-btn[data-tab="list"]').click()
    })

    loadRoles()
}
