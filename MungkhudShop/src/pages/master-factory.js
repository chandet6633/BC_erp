/**
 * Master Data CRUD page factory.
 * Creates Search + Add/Edit tabs for master data entities via PocketBase.
 */
import { createTabs, renderDataGrid, showToast, showConfirm } from '../components/ui.js'
import { getCurrentUser } from '../services/auth.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'

export function createMasterPage(cfg) {
    return function (container) {
        const user = getCurrentUser()
        const canEditMasterData = ['manager', 'owner', 'admin'].includes(user?.role)
        const recordId = (item) => item?.id ?? item?.Id ?? item?.ID ?? ''
        container.innerHTML = `
            <div class="page-header">
                <div class="page-title">
                    <span class="material-icons-outlined">${cfg.icon}</span>
                    <h1>${cfg.title}</h1>
                </div>
            </div>
            <div id="${cfg.collection}Tabs"></div>
            <div id="panel-search" class="tab-panel active"></div>
            <div id="panel-add" class="tab-panel"></div>
        `
        const tabContainer = container.querySelector(`#${cfg.collection}Tabs`)
        createTabs(container, [
            { id: 'search', label: 'ค้นหา', icon: 'search' },
            ...(canEditMasterData ? [{ id: 'add', label: 'เพิ่ม / แก้ไข', icon: 'add_circle_outline' }] : []),
        ])
        const tabBar = container.querySelector('.tabs')
        if (tabBar && tabContainer) tabContainer.appendChild(tabBar)

        const gridCols = canEditMasterData ? [...cfg.columns, {
            key: 'actions', label: 'จัดการ', render: (item) => `
                <div class="grid-actions">
                    <button class="btn btn-sm btn-outline btn-edit" data-id="${recordId(item)}" title="แก้ไข"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${recordId(item)}" title="ลบ"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
            `
        }] : cfg.columns

        let currentItems = []
        let editingId = null

        const searchPanel = container.querySelector('#panel-search')
        searchPanel.innerHTML = `
            <div class="card" style="margin-bottom:var(--sp-4);">
                <div class="card-body">
                    <div style="display:flex;gap:var(--sp-3);align-items:flex-end;">
                        <div class="form-group" style="flex:1;margin:0;">
                            <label class="form-label">ค้นหา</label>
                            <div class="search-bar">
                                <span class="material-icons-outlined">search</span>
                                <input type="text" id="masterSearchInput" placeholder="ค้นหา ${cfg.title}...">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="masterGrid"></div>
        `

        async function loadData() {
            const gridEl = container.querySelector('#masterGrid')
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
            try {
                currentItems = await fetchFullList(cfg.collection)
                // U2: Optional post-load hook for data enrichment (e.g., resolve IDs to names)
                if (cfg.onDataLoaded) await cfg.onDataLoaded(currentItems)
                if (currentItems.length === 0) {
                    gridEl.innerHTML = `<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">${canEditMasterData ? 'ยังไม่มีข้อมูล — เพิ่มรายการแรกได้ที่แท็บ "เพิ่ม / แก้ไข"' : 'ยังไม่มีข้อมูล'}</div>`
                    return
                }
                renderGridItems(currentItems)
            } catch (e) {
                console.warn(`[Master] Collection "${cfg.collection}" may not exist yet:`, e.message)
                gridEl.innerHTML = `<div style="padding:var(--sp-8);text-align:center;color:var(--color-warning);">Collection "${cfg.collection}" ยังไม่มีในระบบ<br><small style="color:var(--color-text-muted);">กรุณาสร้าง Collection ใน PocketBase Admin ก่อน</small></div>`
            }
        }

        function renderGridItems(items) {
            const gridEl = container.querySelector('#masterGrid')
            gridEl.innerHTML = renderDataGrid({ columns: gridCols, items })
            gridEl.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => {
                e.stopPropagation()
                editItem(e.currentTarget.dataset.id)
            })
            gridEl.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => {
                e.stopPropagation()
                deleteItem(e.currentTarget.dataset.id)
            })
        }

        container.querySelector('#masterSearchInput').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase()
            const filtered = currentItems.filter(item =>
                Object.values(item).some(v => String(v).toLowerCase().includes(val))
            )
            renderGridItems(filtered)
        })

        const fieldsHtml = cfg.fields.map(f => {
            let input = ''
            if (f.type === 'textarea') {
                input = `<textarea class="form-control" id="field_${f.key}" rows="3" placeholder="${f.label}"></textarea>`
            } else if (f.type === 'async_select') {
                input = `<select class="form-control" id="field_${f.key}"><option value="">กำลังโหลด...</option></select>`
            } else if (f.type === 'select' && f.options) {
                input = `<select class="form-control" id="field_${f.key}">${f.options.map(o => `<option value="${o.value || o}">${o.label || o}</option>`).join('')}</select>`
            } else if (f.readonly) {
                // Readonly — for auto-generated fields like cust_code
                input = `<input type="text" class="form-control" id="field_${f.key}" placeholder="${f.placeholder || f.label}" readonly style="background:var(--color-surface);color:var(--color-text-muted);cursor:default;">`
            } else {
                input = `<input type="${f.type || 'text'}" class="form-control" id="field_${f.key}" placeholder="${f.label}">`
            }
            return `<div class="form-group"><label class="form-label${f.required ? ' required' : ''}">${f.label}</label>${input}</div>`
        }).join('')

        const addPanel = container.querySelector('#panel-add')
        if (!canEditMasterData) {
            addPanel.innerHTML = ''
            loadData()
            return
        }

        addPanel.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 id="formTitle">เพิ่มข้อมูลใหม่</h3>
                    <div class="toolbar-actions">
                        <button class="btn btn-primary" id="btnSaveMaster"><span class="material-icons-outlined">save</span> บันทึก</button>
                        <button class="btn btn-outline" id="btnClearMaster"><span class="material-icons-outlined">refresh</span> ล้างแบบฟอร์ม</button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="form-row-2">${fieldsHtml}</div>
                </div>
            </div>
        `

        function editItem(id) {
            if (!canEditMasterData) return
            const item = currentItems.find(i => String(recordId(i)) === String(id))
            if (!item) return
            editingId = id
            container.querySelector('#formTitle').innerText = 'แก้ไขข้อมูล'
            cfg.fields.forEach(f => {
                const el = container.querySelector(`#field_${f.key}`)
                if (el) el.value = item[f.key] ?? ''
            })
            container.querySelector('.tab-btn[data-tab="add"]').click()
        }

        async function deleteItem(id) {
            if (!canEditMasterData) return
            if (await showConfirm('ยืนยันลบข้อมูล', 'คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
                try {
                    await deleteRecord(cfg.collection, id)
                    showToast('ลบข้อมูลเรียบร้อย', 'success')
                    loadData()
                } catch (e) {
                    showToast('ไม่สามารถลบข้อมูลได้', 'error')
                }
            }
        }

        addPanel.querySelector('#btnSaveMaster').addEventListener('click', async () => {
            let data = {}
            let missing = false
            cfg.fields.forEach(f => {
                const el = container.querySelector(`#field_${f.key}`)
                if (el) {
                    data[f.key] = el.value
                    if (f.required && !el.value) missing = true
                }
            })
            if (missing) return showToast('กรุณากรอกข้อมูลที่จำเป็น (*)', 'error')

            try {
                // beforeSave hook — allows auto-generating codes like cust_code
                if (cfg.beforeSave) data = await cfg.beforeSave(data, editingId)

                if (editingId) {
                    await updateRecord(cfg.collection, editingId, data)
                    showToast('อัปเดตข้อมูลเรียบร้อย', 'success')
                } else {
                    await createRecord(cfg.collection, data)
                    showToast('เพิ่มข้อมูลใหม่เรียบร้อย', 'success')
                }
                editingId = null
                container.querySelector('#formTitle').innerText = 'เพิ่มข้อมูลใหม่'
                addPanel.querySelectorAll('.form-control').forEach(el => el.value = '')
                container.querySelector('.tab-btn[data-tab="search"]').click()
                loadData()
            } catch (e) {
                console.error(e)
                showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error')
            }
        })

        addPanel.querySelector('#btnClearMaster').addEventListener('click', () => {
            editingId = null
            container.querySelector('#formTitle').innerText = 'เพิ่มข้อมูลใหม่'
            addPanel.querySelectorAll('.form-control').forEach(el => el.value = '')
        })

        // Populate async_select fields
        cfg.fields.filter(f => f.type === 'async_select' && f.fetchOptions).forEach(async f => {
            const sel = container.querySelector(`#field_${f.key}`)
            if (!sel) return
            try {
                const options = await f.fetchOptions()
                sel.innerHTML = `<option value="">${f.placeholder || '-- เลือก --'}</option>`
                options.forEach(o => {
                    const opt = document.createElement('option')
                    opt.value = o.value || o
                    opt.textContent = o.label || o
                    sel.appendChild(opt)
                })
            } catch (e) {
                sel.innerHTML = `<option value="">โหลดไม่สำเร็จ</option>`
                console.warn(`[Master] Could not load options for ${f.key}:`, e.message)
            }
        })

        // Initial Data Load
        loadData()
    }
}
