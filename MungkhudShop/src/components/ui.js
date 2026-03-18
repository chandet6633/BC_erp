/**
 * MungkhudShop — Component helpers
 * Reusable UI helper functions.
 */

/**
 * Create a tabbed interface inside a container.
 * @param {HTMLElement} container
 * @param {Array<{id:string, label:string, icon?:string}>} tabs
 * @param {Function} onTabChange  — receives tab id
 */
export function createTabs(container, tabs, onTabChange) {
    const tabBar = document.createElement('div')
    tabBar.className = 'tabs'
    tabs.forEach((t, i) => {
        const btn = document.createElement('button')
        btn.className = `tab-btn${i === 0 ? ' active' : ''}`
        btn.dataset.tab = t.id
        btn.innerHTML = `${t.icon ? `<span class="material-icons-outlined">${t.icon}</span>` : ''}${t.label}`
        btn.addEventListener('click', () => {
            tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
            const panel = container.querySelector(`#panel-${t.id}`)
            if (panel) panel.classList.add('active')
            if (onTabChange) onTabChange(t.id)
        })
        tabBar.appendChild(btn)
    })
    container.appendChild(tabBar)
}

/**
 * Render a data grid (table) from rows.
 * @param {object} opts
 * @param {Array<{key:string,label:string,render?:Function}>} opts.columns
 * @param {Array<object>} opts.items
 * @param {Function} [opts.onRowClick]
 * @returns {string} HTML string
 */
export function renderDataGrid({ columns, items, onRowClick }) {
    if (!items || items.length === 0) {
        return `
            <div class="data-grid">
                <table><thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead></table>
                <div class="grid-empty">
                    <span class="material-icons-outlined">inbox</span>
                    <p>ไม่มีข้อมูล</p>
                </div>
            </div>`
    }
    const rows = items.map((item, idx) => {
        const cells = columns.map(c => {
            const val = c.render ? c.render(item, idx) : (item[c.key] ?? '')
            return `<td>${val}</td>`
        }).join('')
        return `<tr data-id="${item.id || idx}" style="cursor:pointer">${cells}</tr>`
    }).join('')

    return `
        <div class="data-grid">
            <table>
                <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`
}

/**
 * Show a toast notification.
 */
export function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container')
    if (!container) {
        container = document.createElement('div')
        container.className = 'toast-container'
        document.body.appendChild(container)
    }

    // Limit stack to 5 toasts
    const MAX_TOASTS = 5
    while (container.children.length >= MAX_TOASTS) {
        container.firstChild.remove()
    }

    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' }
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    toast.innerHTML = `<span class="material-icons-outlined">${icons[type] || 'info'}</span>${message}`
    container.appendChild(toast)

    // Auto-dismiss with fade out
    setTimeout(() => {
        toast.style.opacity = '0'
        toast.style.transform = 'translateX(100%)'
        setTimeout(() => toast.remove(), 300)
    }, 4000)
}

/**
 * Show a confirmation dialog.
 */
export function showConfirm(title, message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div')
        overlay.className = 'modal-overlay show'
        overlay.innerHTML = `
            <div class="modal" style="max-width:420px;">
                <div class="modal-header"><h3>${title}</h3></div>
                <div class="modal-body"><p>${message}</p></div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="confirmCancel">ยกเลิก</button>
                    <button class="btn btn-danger" id="confirmOk">ตกลง</button>
                </div>
            </div>`
        document.body.appendChild(overlay)
        overlay.querySelector('#confirmCancel').onclick = () => { overlay.remove(); resolve(false) }
        overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); resolve(true) }
    })
}

/**
 * Format a date to Thai locale short format.
 */
export function formatDate(dateStr) {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Format number as Thai baht currency.
 */
export function formatCurrency(n) {
    if (n == null || isNaN(n)) return '฿0.00'
    return '฿' + Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Generate a document-style auto-ID.
 * @param {string} prefix e.g. 'JOB', 'RQ', etc.
 * @param {number} seq    sequence number
 */
export function generateDocId(prefix, seq = 1) {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(-2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    return `${prefix}${yy}${mm}-${String(seq).padStart(4, '0')}`
}

/* ═══════════════════════════════════════════════════
   Autocomplete Component
   ═══════════════════════════════════════════════════ */

let _acStyleInjected = false
function injectAutocompleteStyles() {
    if (_acStyleInjected) return
    _acStyleInjected = true
    const style = document.createElement('style')
    style.textContent = `
        .ac-wrapper { position: relative; width: 100%; }
        .ac-wrapper input { width: 100%; }
        .ac-list {
            position: absolute; top: 100%; left: 0; right: 0;
            max-height: 240px; overflow-y: auto;
            background: var(--color-surface-alt, #fff);
            border: 1px solid var(--color-border, #e2e8f0);
            border-radius: var(--radius-sm, 6px);
            box-shadow: var(--shadow-md);
            z-index: 150;
            display: none;
        }
        .ac-list.open { display: block; }
        .ac-item {
            padding: 8px 12px; cursor: pointer;
            display: flex; align-items: center; gap: 8px;
            font-size: 0.9rem; transition: background 120ms;
        }
        .ac-item:hover, .ac-item.highlighted {
            background: var(--color-primary-light, #2A3B6E);
            color: var(--color-text-inverse, #fff);
        }
        .ac-item .ac-code {
            font-family: var(--font-mono, monospace);
            font-size: 0.8rem; opacity: 0.7;
            min-width: 60px;
        }
        .ac-item .ac-secondary {
            margin-left: auto; font-size: 0.78rem; opacity: 0.6;
        }
        .ac-empty {
            padding: 10px 12px; text-align: center;
            color: var(--color-text-muted, #94A3B8); font-size: 0.85rem;
        }
    `
    document.head.appendChild(style)
}

/**
 * Create an autocomplete input.
 * @param {object} opts
 * @param {HTMLElement} opts.container — where to append the autocomplete
 * @param {string} [opts.placeholder] — input placeholder
 * @param {string} [opts.inputClass] — CSS class for the input (default: 'form-control')
 * @param {string} [opts.value] — initial value
 * @param {Function} opts.fetchItems — async () => Array<{id, code?, label, secondary?}>
 * @param {Function} opts.onSelect — (item) => void
 * @param {Function} [opts.onChange] — (value) => void — fires on text change
 * @param {number} [opts.minChars] — minimum chars to trigger (default: 0)
 * @returns {{ input: HTMLInputElement, setValue: Function, refresh: Function }}
 */
export function createAutocomplete(opts) {
    injectAutocompleteStyles()

    const wrapper = document.createElement('div')
    wrapper.className = 'ac-wrapper'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = opts.inputClass || 'form-control'
    input.placeholder = opts.placeholder || 'พิมพ์เพื่อค้นหา...'
    if (opts.value) input.value = opts.value
    if (opts.id) input.id = opts.id

    const list = document.createElement('div')
    list.className = 'ac-list'

    wrapper.appendChild(input)
    wrapper.appendChild(list)
    opts.container.appendChild(wrapper)

    let items = []
    let highlighted = -1
    let debounceTimer = null

    async function loadItems() {
        if (opts.fetchItems) items = await opts.fetchItems()
    }

    function filter(query) {
        const q = query.toLowerCase().trim()
        if (!q && opts.minChars > 0) return items.slice(0, 50)
        return items.filter(it => {
            const hay = `${it.code || ''} ${it.label} ${it.secondary || ''}`.toLowerCase()
            return hay.includes(q)
        }).slice(0, 50)
    }

    function render(filtered) {
        highlighted = -1
        if (filtered.length === 0) {
            list.innerHTML = '<div class="ac-empty">ไม่พบข้อมูล</div>'
        } else {
            list.innerHTML = filtered.map((it, idx) => `
                <div class="ac-item" data-idx="${idx}">
                    ${it.code ? `<span class="ac-code">${it.code}</span>` : ''}
                    <span>${it.label}</span>
                    ${it.secondary ? `<span class="ac-secondary">${it.secondary}</span>` : ''}
                </div>
            `).join('')
        }
        list.classList.add('open')

        // Click handler
        list.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault()
                const idx = parseInt(el.dataset.idx)
                selectItem(filtered[idx])
            })
        })
    }

    function selectItem(item) {
        if (!item) return
        input.value = item.label
        input.dataset.selectedId = item.id || ''
        input.dataset.selectedCode = item.code || ''
        list.classList.remove('open')
        if (opts.onSelect) opts.onSelect(item)
    }

    function highlight(dir, filtered) {
        const items = list.querySelectorAll('.ac-item')
        if (items.length === 0) return
        items.forEach(el => el.classList.remove('highlighted'))
        highlighted += dir
        if (highlighted < 0) highlighted = items.length - 1
        if (highlighted >= items.length) highlighted = 0
        items[highlighted].classList.add('highlighted')
        items[highlighted].scrollIntoView({ block: 'nearest' })
    }

    // Events
    input.addEventListener('focus', async () => {
        if (items.length === 0) await loadItems()
        const filtered = filter(input.value)
        render(filtered)
    })

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(async () => {
            if (items.length === 0) await loadItems()
            const filtered = filter(input.value)
            render(filtered)
            if (opts.onChange) opts.onChange(input.value)
        }, 150)
    })

    input.addEventListener('keydown', (e) => {
        const filtered = filter(input.value)
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1, filtered) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1, filtered) }
        else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlighted >= 0) {
                const filtered2 = filter(input.value)
                selectItem(filtered2[highlighted])
            }
        }
        else if (e.key === 'Escape') { list.classList.remove('open') }
    })

    input.addEventListener('blur', () => {
        setTimeout(() => list.classList.remove('open'), 200)
    })

    return {
        input,
        setValue(val) { input.value = val },
        setSelectedId(id) { input.dataset.selectedId = id },
        async refresh() { items = []; await loadItems() },
        getSelectedId() { return input.dataset.selectedId || '' }
    }
}

/* ═══════════════════════════════════════════════════
   Dropdown Component
   ═══════════════════════════════════════════════════ */

/**
 * Create a dropdown <select> populated from a PocketBase collection.
 * @param {object} opts
 * @param {HTMLElement} opts.container — where to append
 * @param {string} [opts.id] — element id
 * @param {string} [opts.selectClass] — CSS class (default: 'form-control')
 * @param {string} [opts.allLabel] — if provided, adds a first "all" option with this label (value = '')
 * @param {Function} opts.fetchItems — async () => Array<{value:string, label:string}>
 * @param {Function} [opts.onChange] — (value) => void
 * @param {string} [opts.value] — initial selected value
 * @returns {{ select: HTMLSelectElement, refresh: Function, getValue: Function }}
 */
export function createDropdown(opts) {
    const select = document.createElement('select')
    select.className = opts.selectClass || 'form-control'
    if (opts.id) select.id = opts.id

    async function load() {
        const items = opts.fetchItems ? await opts.fetchItems() : []
        select.innerHTML = ''
        if (opts.allLabel) {
            const opt = document.createElement('option')
            opt.value = ''
            opt.textContent = opts.allLabel
            select.appendChild(opt)
        }
        items.forEach(it => {
            const opt = document.createElement('option')
            opt.value = it.value
            opt.textContent = it.label
            select.appendChild(opt)
        })
        if (opts.value) select.value = opts.value
    }

    select.addEventListener('change', () => {
        if (opts.onChange) opts.onChange(select.value)
    })

    opts.container.appendChild(select)
    load()

    return {
        select,
        async refresh() { await load() },
        getValue() { return select.value },
        setValue(v) { select.value = v }
    }
}

/* ═══════════════════════════════════════════════════
   VAT Toggle Component
   ═══════════════════════════════════════════════════ */

/**
 * Create a VAT toggle panel.
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {boolean} [opts.vatEnabled] — initial state (default false)
 * @param {string} [opts.vatMode] — 'customer_pays' | 'shop_absorbs' (default 'customer_pays')
 * @param {Function} opts.onUpdate — ({ vatEnabled, vatMode }) => void
 * @returns {{ getState: Function, setState: Function }}
 */
export function createVatToggle(opts) {
    const id = 'vat_' + Math.random().toString(36).slice(2, 8)
    const panel = document.createElement('div')
    panel.className = 'vat-toggle-panel'
    panel.innerHTML = `
        <div class="flex items-center gap-3" style="flex-wrap:wrap;">
            <label class="vat-toggle-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
                <input type="checkbox" id="${id}_chk" ${opts.vatEnabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-accent);">
                ภาษีมูลค่าเพิ่ม 7%
            </label>
            <div class="vat-mode-group" id="${id}_modes" style="display:${opts.vatEnabled ? 'flex' : 'none'};gap:var(--sp-3);align-items:center;margin-left:var(--sp-4);">
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;">
                    <input type="radio" name="${id}_mode" value="customer_pays" ${(!opts.vatMode || opts.vatMode === 'customer_pays') ? 'checked' : ''}>
                    ลูกค้าจ่าย VAT
                </label>
                <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.9rem;">
                    <input type="radio" name="${id}_mode" value="shop_absorbs" ${opts.vatMode === 'shop_absorbs' ? 'checked' : ''}>
                    ร้านออก VAT ให้
                </label>
            </div>
        </div>
    `
    opts.container.appendChild(panel)

    const chk = panel.querySelector(`#${id}_chk`)
    const modesDiv = panel.querySelector(`#${id}_modes`)
    const radios = panel.querySelectorAll(`input[name="${id}_mode"]`)

    function getState() {
        return {
            vatEnabled: chk.checked,
            vatMode: chk.checked ? panel.querySelector(`input[name="${id}_mode"]:checked`)?.value || 'customer_pays' : 'customer_pays'
        }
    }

    function fireUpdate() { if (opts.onUpdate) opts.onUpdate(getState()) }

    chk.addEventListener('change', () => {
        modesDiv.style.display = chk.checked ? 'flex' : 'none'
        fireUpdate()
    })
    radios.forEach(r => r.addEventListener('change', fireUpdate))

    return {
        getState,
        setState({ vatEnabled, vatMode }) {
            chk.checked = !!vatEnabled
            modesDiv.style.display = vatEnabled ? 'flex' : 'none'
            if (vatMode) {
                const radio = panel.querySelector(`input[name="${id}_mode"][value="${vatMode}"]`)
                if (radio) radio.checked = true
            }
        }
    }
}

/**
 * Calculate VAT amounts based on mode.
 * @param {number} subtotal
 * @param {number} discount
 * @param {boolean} vatEnabled
 * @param {string} vatMode — 'customer_pays' | 'shop_absorbs'
 * @returns {{ vat_amount: number, grand_total: number }}
 */
export function calcVat(subtotal, discount, vatEnabled, vatMode) {
    const net = subtotal - (discount || 0)
    if (!vatEnabled) return { vat_amount: 0, grand_total: net }

    // A1: Read VAT rate from settings cache, fallback to 7%
    let vatRate = 7
    try {
        const cached = localStorage.getItem('mungkhud_settings')
        if (cached) {
            const s = JSON.parse(cached)
            vatRate = parseFloat(s.vat_rate) || 7
        }
    } catch (_) { /* use default */ }

    if (vatMode === 'shop_absorbs') {
        const vat_amount = Math.round((net * vatRate / (100 + vatRate)) * 100) / 100
        return { vat_amount, grand_total: net }
    }
    // customer_pays — add VAT on top
    const vat_amount = Math.round(net * (vatRate / 100) * 100) / 100
    return { vat_amount, grand_total: net + vat_amount }
}

/* ═══════════════════════════════════════════════════
   Export CSV Utility
   ═══════════════════════════════════════════════════ */

/**
 * Export data to CSV file.
 * @param {string} filename
 * @param {Array<string>} headers
 * @param {Array<Array<string|number>>} rows — each row is an array of cell values
 */
export function exportCSV(filename, headers, rows) {
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = '\uFEFF' + [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
}
