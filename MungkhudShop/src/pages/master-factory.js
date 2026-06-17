import { createTabs, renderDataGrid, showToast, showConfirm, createAutocomplete } from '../components/ui.js'
import { getCurrentUser } from '../services/auth.js'
import { fetchFullList, createRecord, updateRecord, deleteRecord } from '../services/pb.js'

function coerceValue(field, value) {
    if (typeof value === 'string') value = value.trim()
    if (value === '') return null
    if (field.type === 'number') {
        const n = Number(value)
        return Number.isFinite(n) ? n : null
    }
    if (field.valueType === 'boolean') {
        if (value === true || value === 'true') return true
        if (value === false || value === 'false') return false
    }
    return value
}

function compactPayload(data) {
    Object.keys(data).forEach(key => {
        if (data[key] === null || data[key] === undefined || data[key] === '') delete data[key]
    })
    return data
}

export function createMasterPage(cfg) {
    return function (container) {
        const user = getCurrentUser()
        const canEditMasterData = ['manager', 'owner', 'admin'].includes(user?.role)
        const recordId = (item) => item?.id ?? item?.Id ?? item?.ID ?? ''
        const autocompleteControls = {}

        container.innerHTML = `
            <div class="page-header"><div class="page-title"><span class="material-icons-outlined">${cfg.icon}</span><h1>${cfg.title}</h1></div></div>
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
                </div>`
        }] : cfg.columns

        let currentItems = []
        let editingId = null

        const searchPanel = container.querySelector('#panel-search')
        searchPanel.innerHTML = `
            <div class="card" style="margin-bottom:var(--sp-4);"><div class="card-body">
                <div class="form-group" style="margin:0;"><label class="form-label">ค้นหา</label><div class="search-bar"><span class="material-icons-outlined">search</span><input type="text" id="masterSearchInput" placeholder="ค้นหา ${cfg.title}..."></div></div>
            </div></div><div id="masterGrid"></div>`

        async function loadData() {
            const gridEl = container.querySelector('#masterGrid')
            gridEl.innerHTML = '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">กำลังโหลดข้อมูล...</div>'
            try {
                currentItems = await fetchFullList(cfg.collection)
                if (cfg.onDataLoaded) await cfg.onDataLoaded(currentItems)
                renderGridItems(currentItems)
            } catch (e) {
                console.warn(`[Master] Collection "${cfg.collection}" load failed:`, e.message)
                gridEl.innerHTML = `<div style="padding:var(--sp-8);text-align:center;color:var(--color-warning);">ไม่สามารถโหลดข้อมูล ${cfg.title}</div>`
            }
        }

        function renderGridItems(items) {
            const gridEl = container.querySelector('#masterGrid')
            gridEl.innerHTML = items.length ? renderDataGrid({ columns: gridCols, items }) : '<div style="padding:var(--sp-8);text-align:center;color:var(--color-text-muted);">ยังไม่มีข้อมูล</div>'
            gridEl.querySelectorAll('.btn-edit').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); editItem(e.currentTarget.dataset.id) })
            gridEl.querySelectorAll('.btn-delete').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); deleteItem(e.currentTarget.dataset.id) })
        }

        container.querySelector('#masterSearchInput').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase()
            renderGridItems(currentItems.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(val))))
        })

        const fieldsHtml = cfg.fields.map(f => {
            let input = ''
            if (f.type === 'textarea') input = `<textarea class="form-control" id="field_${f.key}" rows="3" placeholder="${f.label}"></textarea>`
            else if (f.type === 'async_select') input = `<select class="form-control" id="field_${f.key}"><option value="">กำลังโหลด...</option></select>`
            else if (f.type === 'autocomplete') input = `<div id="field_${f.key}_ac"></div><input type="hidden" id="field_${f.key}">`
            else if (f.type === 'select' && f.options) input = `<select class="form-control" id="field_${f.key}">${f.options.map(o => `<option value="${o.value ?? o}">${o.label ?? o}</option>`).join('')}</select>`
            else if (f.type === 'datalist' && f.options) input = `<input type="text" class="form-control" id="field_${f.key}" placeholder="${f.label}" list="list_${f.key}"><datalist id="list_${f.key}">${f.options.map(o => `<option value="${o.value ?? o}">${o.label ?? o}</option>`).join('')}</datalist>`
            else if (f.readonly) input = `<input type="text" class="form-control" id="field_${f.key}" placeholder="${f.placeholder || f.label}" readonly style="background:var(--color-surface);color:var(--color-text-muted);cursor:default;">`
            else input = `<input type="${f.type || 'text'}" class="form-control" id="field_${f.key}" placeholder="${f.label}">`
            const action = f.inlineCreate ? `<button type="button" class="btn btn-sm btn-outline master-inline-create" data-field="${f.key}" style="margin-top:6px;"><span class="material-icons-outlined" style="font-size:16px;">add</span> ${f.inlineCreate.label || 'เพิ่มใหม่'}</button>` : ''
            return `<div class="form-group"><label class="form-label${f.required ? ' required' : ''}">${f.label}</label>${input}${action}</div>`
        }).join('')

        const addPanel = container.querySelector('#panel-add')
        if (!canEditMasterData) { addPanel.innerHTML = ''; loadData(); return }
        addPanel.innerHTML = `<div class="card"><div class="card-header"><h3 id="formTitle">เพิ่มข้อมูลใหม่</h3><div class="toolbar-actions"><button class="btn btn-primary" id="btnSaveMaster"><span class="material-icons-outlined">save</span> บันทึก</button><button class="btn btn-outline" id="btnClearMaster"><span class="material-icons-outlined">refresh</span> ล้างแบบฟอร์ม</button></div></div><div class="card-body"><div class="form-row-2">${fieldsHtml}</div></div></div>`

        function editItem(id) {
            const item = currentItems.find(i => String(recordId(i)) === String(id))
            if (!item) return
            editingId = id
            container.querySelector('#formTitle').innerText = 'แก้ไขข้อมูล'
            cfg.fields.forEach(f => {
                const el = container.querySelector(`#field_${f.key}`)
                if (el) el.value = item[f.key] ?? ''
                if (f.type === 'autocomplete' && autocompleteControls[f.key]) {
                    autocompleteControls[f.key].setValue(f.displayValue ? f.displayValue(item) : (item[f.key] || ''))
                    autocompleteControls[f.key].setSelectedId(item[f.key] || '')
                }
            })
            container.querySelector('.tab-btn[data-tab="add"]').click()
        }

        async function deleteItem(id) {
            if (await showConfirm('ยืนยันลบข้อมูล', 'ต้องการลบรายการนี้ใช่หรือไม่?')) {
                try { await deleteRecord(cfg.collection, id); showToast('ลบข้อมูลเรียบร้อย', 'success'); loadData() }
                catch { showToast('ไม่สามารถลบข้อมูลได้', 'error') }
            }
        }

        async function saveItem() {
            let data = {}
            let missing = false
            cfg.fields.forEach(f => {
                const el = container.querySelector(`#field_${f.key}`)
                if (!el) return
                data[f.key] = coerceValue(f, el.value)
                if (f.required && (data[f.key] === null || data[f.key] === undefined || data[f.key] === '')) missing = true
            })
            if (missing) return showToast('กรุณากรอกข้อมูลที่จำเป็น (*)', 'error')
            try {
                if (cfg.beforeSave) data = await cfg.beforeSave(data, editingId)
                data = compactPayload(data)
                if (editingId) await updateRecord(cfg.collection, editingId, data)
                else await createRecord(cfg.collection, data)
                showToast('บันทึกข้อมูลเรียบร้อย', 'success')
                clearForm()
                container.querySelector('.tab-btn[data-tab="search"]').click()
                loadData()
            } catch (e) {
                console.error(e)
                showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error')
            }
        }

        function clearForm() {
            editingId = null
            container.querySelector('#formTitle').innerText = 'เพิ่มข้อมูลใหม่'
            addPanel.querySelectorAll('.form-control').forEach(el => el.value = '')
            Object.values(autocompleteControls).forEach(ac => { ac.setValue(''); ac.setSelectedId('') })
        }

        addPanel.querySelector('#btnSaveMaster').addEventListener('click', saveItem)
        addPanel.querySelector('#btnClearMaster').addEventListener('click', clearForm)

        cfg.fields.filter(f => f.type === 'async_select' && f.fetchOptions).forEach(async f => {
            const sel = container.querySelector(`#field_${f.key}`)
            try {
                const options = await f.fetchOptions()
                sel.innerHTML = `<option value="">${f.placeholder || '-- เลือก --'}</option>`
                options.forEach(o => { const opt = document.createElement('option'); opt.value = o.value ?? o; opt.textContent = o.label ?? o; sel.appendChild(opt) })
            } catch (e) { sel.innerHTML = '<option value="">โหลดไม่สำเร็จ</option>'; console.warn(`[Master] Could not load options for ${f.key}:`, e.message) }
        })

        cfg.fields.filter(f => f.type === 'autocomplete' && f.fetchItems).forEach(f => {
            const host = container.querySelector(`#field_${f.key}_ac`)
            const hidden = container.querySelector(`#field_${f.key}`)
            autocompleteControls[f.key] = createAutocomplete({
                container: host,
                placeholder: f.placeholder || f.label,
                fetchItems: f.fetchItems,
                onSelect: (item) => { hidden.value = item.id || item.value || ''; if (f.onSelect) f.onSelect(item, container) },
                onChange: () => { hidden.value = '' }
            })
        })

        addPanel.querySelectorAll('.master-inline-create').forEach(btn => {
            btn.addEventListener('click', async () => {
                const field = cfg.fields.find(f => f.key === btn.dataset.field)
                const spec = field?.inlineCreate
                if (!spec) return
                const name = prompt(spec.prompt || 'Name')
                if (!name || !name.trim()) return
                try {
                    const created = await createRecord(spec.collection, compactPayload(await spec.buildPayload(name.trim())))
                    const label = spec.optionLabel ? spec.optionLabel(created) : (created.name || name.trim())
                    showToast(spec.success || 'สร้างรายการใหม่เรียบร้อย', 'success')
                    if (field.type === 'async_select') {
                        const sel = container.querySelector(`#field_${field.key}`)
                        const opt = document.createElement('option')
                        opt.value = created.id
                        opt.textContent = label
                        sel.appendChild(opt)
                        sel.value = created.id
                    }
                } catch (e) { console.error(e); showToast('ไม่สามารถสร้างรายการใหม่ได้', 'error') }
            })
        })

        loadData()
    }
}
