// @ts-nocheck
/**
 * UIService - A generic utility for generating modern UI states.
 * Handles Skeleton Loaders and Empty States to improve perceived performance
 * and user experience inside the App Shell.
 */
window.UIService = {
    /**
     * Render a skeleton table body
     * @param {number} cols Number of columns
     * @param {number} rows Number of rows to generate
     * @returns {string} HTML string
     */
    generateTableSkeleton(cols, rows = 4) {
        let html = '';
        for (let i = 0; i < rows; i++) {
            // Apply slight animation delay to create a cascading shimmer effect
            html += `<tr style="animation-delay: ${i * 0.1}s">`;
            for (let j = 0; j < cols; j++) {
                html += `<td><div class="skeleton-box skeleton-text"></div></td>`;
            }
            html += `</tr>`;
        }
        return html;
    },

    /**
     * Render an empty state block that spans the entire table
     * @param {number} cols Number of columns to span over
     * @param {string} title Empty state title
     * @param {string} description Empty state description
     * @param {string} iconSVG Optional SVG icon string
     * @returns {string} HTML string
     */
    generateEmptyStateRow(cols, title = "ไม่พบข้อมูล", description = "ยังไม่มีข้อมูลในระบบ ณ ขณะนี้", iconSVG = "") {
        if (!iconSVG) {
            // Default Inbox Icon (Lucide)
            iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="animate-fade-in"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>`;
        }

        return `
            <tr>
                <td colspan="${cols}" style="padding: 0; background: transparent !important; border-bottom: none;">
                    <div class="empty-state animate-fade-in">
                        <div class="empty-state-icon" style="opacity: 0.8;">${iconSVG}</div>
                        <div class="empty-state-title">${title}</div>
                        <div class="empty-state-desc">${description}</div>
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Render a generic empty state for a div container (non-table)
     */
    generateEmptyStateBlock(title = "ไม่พบข้อมูล", description = "ยังไม่มีข้อมูลในระบบ ณ ขณะนี้", iconSVG = "") {
        if (!iconSVG) {
            iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`;
        }
        return `
            <div class="empty-state animate-fade-in">
                <div class="empty-state-icon">${iconSVG}</div>
                <div class="empty-state-title">${title}</div>
                <div class="empty-state-desc">${description}</div>
            </div>
        `;
    },

    /* ═══════════════════════════════════════════════════
       Advanced Input Components (Ported from v2.0)
       ═══════════════════════════════════════════════════ */

    _acStyleInjected: false,
    injectAutocompleteStyles() {
        if (this._acStyleInjected) return;
        this._acStyleInjected = true;
        const style = document.createElement('style');
        style.textContent = `
            .ac-wrapper { position: relative; width: 100%; }
            .ac-wrapper input { width: 100%; }
            .ac-list {
                position: absolute; top: calc(100% + 4px); left: 0; right: 0;
                max-height: 240px; overflow-y: auto;
                background: var(--surface-0, #fff);
                border: 1px solid var(--surface-200, #e2e8f0);
                border-radius: var(--radius-md, 12px);
                box-shadow: var(--shadow-xl);
                z-index: 1000;
                display: none;
                animation: modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .ac-list.open { display: block; }
            .ac-item {
                padding: 10px 14px; cursor: pointer;
                display: flex; align-items: center; gap: 8px;
                font-size: 0.9rem; transition: all 150ms;
                border-bottom: 1px solid var(--surface-50);
            }
            .ac-item:last-child { border-bottom: none; }
            .ac-item:hover, .ac-item.highlighted {
                background: var(--primary-50);
                color: var(--primary-700);
            }
            .ac-item .ac-code {
                font-family: inherit;
                font-size: 0.8rem; opacity: 0.7;
                background: var(--surface-100);
                padding: 2px 6px;
                border-radius: 4px;
                min-width: 40px;
                text-align: center;
            }
            .ac-item .ac-secondary {
                margin-left: auto; font-size: 0.78rem; opacity: 0.6;
            }
            .ac-empty {
                padding: 16px; text-align: center;
                color: var(--surface-400, #94A3B8); font-size: 0.85rem;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Create an autocomplete input.
     * @param {object} opts
     */
    createAutocomplete(opts) {
        this.injectAutocompleteStyles();

        const wrapper = document.createElement('div');
        wrapper.className = 'ac-wrapper';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = opts.inputClass || 'input';
        input.placeholder = opts.placeholder || 'พิมพ์เพื่อค้นหา...';
        if (opts.value) input.value = opts.value;
        if (opts.id) input.id = opts.id;
        if (opts.required) input.required = true;

        const list = document.createElement('div');
        list.className = 'ac-list';

        wrapper.appendChild(input);
        wrapper.appendChild(list);
        opts.container.appendChild(wrapper);

        let items = [];
        let highlighted = -1;
        let debounceTimer = null;

        const loadItems = async () => {
            if (opts.fetchItems) items = await opts.fetchItems();
        };

        const filter = (query) => {
            const q = query.toLowerCase().trim();
            if (!q && (opts.minChars || 0) > 0) return [];
            if (!q) return items.slice(0, 50);
            return items.filter(it => {
                const hay = `${it.code || ''} ${it.label} ${it.secondary || ''}`.toLowerCase();
                return hay.includes(q);
            }).slice(0, 50);
        };

        const render = (filtered) => {
            highlighted = -1;
            if (filtered.length === 0) {
                list.innerHTML = '<div class="ac-empty">ไม่พบข้อมูล</div>';
            } else {
                list.innerHTML = filtered.map((it, idx) => `
                    <div class="ac-item" data-idx="${idx}">
                        ${it.code ? `<span class="ac-code">${it.code}</span>` : ''}
                        <span>${it.label}</span>
                        ${it.secondary ? `<span class="ac-secondary">${it.secondary}</span>` : ''}
                    </div>
                `).join('');
            }
            list.classList.add('open');

            list.querySelectorAll('.ac-item').forEach(el => {
                el.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const idx = parseInt(el.dataset.idx);
                    selectItem(filtered[idx]);
                });
            });
        };

        const selectItem = (item) => {
            if (!item) return;
            input.value = item.label;
            input.dataset.selectedId = item.id || '';
            input.dataset.selectedCode = item.code || '';
            list.classList.remove('open');
            if (opts.onSelect) opts.onSelect(item);
        };

        const highlight = (dir) => {
            const listItems = list.querySelectorAll('.ac-item');
            if (listItems.length === 0) return;
            listItems.forEach(el => el.classList.remove('highlighted'));
            highlighted += dir;
            if (highlighted < 0) highlighted = listItems.length - 1;
            if (highlighted >= listItems.length) highlighted = 0;
            listItems[highlighted].classList.add('highlighted');
            listItems[highlighted].scrollIntoView({ block: 'nearest' });
        };

        input.addEventListener('focus', async () => {
            if (items.length === 0) await loadItems();
            render(filter(input.value));
        });

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                if (items.length === 0) await loadItems();
                render(filter(input.value));
                if (opts.onChange) opts.onChange(input.value);
            }, 150);
        });

        input.addEventListener('keydown', (e) => {
            const filtered = filter(input.value);
            if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlighted >= 0) {
                    selectItem(filtered[highlighted]);
                } else if (filtered.length > 0) {
                    // select first if none highlighted
                    selectItem(filtered[0]);
                }
            }
            else if (e.key === 'Escape') { list.classList.remove('open'); }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => list.classList.remove('open'), 200);
        });

        return {
            input,
            setValue(val) { input.value = val; },
            setSelectedId(id) { input.dataset.selectedId = id; },
            async refresh() { items = []; await loadItems(); },
            getSelectedId() { return input.dataset.selectedId || ''; }
        };
    },

    /**
     * Create a dropdown populated from a fetchItems function.
     * @param {object} opts
     */
    createDropdown(opts) {
        const select = document.createElement('select');
        select.className = opts.selectClass || 'input';
        if (opts.id) select.id = opts.id;

        const load = async () => {
            const items = opts.fetchItems ? await opts.fetchItems() : [];
            select.innerHTML = '';
            if (opts.allLabel) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = opts.allLabel;
                select.appendChild(opt);
            }
            items.forEach(it => {
                const opt = document.createElement('option');
                opt.value = it.value;
                opt.textContent = it.label;
                select.appendChild(opt);
            });
            if (opts.value) select.value = opts.value;
        };

        select.addEventListener('change', () => {
            if (opts.onChange) opts.onChange(select.value);
        });

        opts.container.appendChild(select);
        load();

        return {
            select,
            async refresh() { await load(); },
            getValue() { return select.value; },
            setValue(v) { select.value = v; }
        };
    },

    /**
     * Create a VAT toggle panel.
     */
    createVatToggle(opts) {
        const panel = document.createElement('div');
        panel.className = 'vat-toggle-panel';
        panel.style.cssText = 'padding: 12px; border: 1px solid var(--surface-200); border-radius: var(--radius-md); background: var(--surface-50); margin-bottom: 16px;';

        const id = 'vat_' + Math.random().toString(36).slice(2, 8);
        panel.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600;">
                    <input type="checkbox" id="${id}_chk" ${opts.vatEnabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary-600);">
                    ภาษีมูลค่าเพิ่ม (VAT 7%)
                </label>
                <div id="${id}_modes" style="display: ${opts.vatEnabled ? 'flex' : 'none'}; gap: 16px; align-items: center; margin-left: 16px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="radio" name="${id}_mode" value="customer_pays" ${(!opts.vatMode || opts.vatMode === 'customer_pays') ? 'checked' : ''}>
                        ลูกค้าจ่าย
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="radio" name="${id}_mode" value="shop_absorbs" ${opts.vatMode === 'shop_absorbs' ? 'checked' : ''}>
                        ร้านออกให้
                    </label>
                </div>
            </div>
        `;
        opts.container.appendChild(panel);

        const chk = panel.querySelector(`#${id}_chk`);
        const modesDiv = panel.querySelector(`#${id}_modes`);
        const radios = panel.querySelectorAll(`input[name="${id}_mode"]`);

        const getState = () => ({
            vatEnabled: chk.checked,
            vatMode: chk.checked ? (panel.querySelector(`input[name="${id}_mode"]:checked`)?.value || 'customer_pays') : 'customer_pays'
        });

        const fireUpdate = () => { if (opts.onUpdate) opts.onUpdate(getState()); };

        chk.addEventListener('change', () => {
            modesDiv.style.display = chk.checked ? 'flex' : 'none';
            fireUpdate();
        });
        radios.forEach(r => r.addEventListener('change', fireUpdate));

        return {
            getState,
            setState({ vatEnabled, vatMode }) {
                chk.checked = !!vatEnabled;
                modesDiv.style.display = vatEnabled ? 'flex' : 'none';
                if (vatMode) {
                    const radio = panel.querySelector(`input[name="${id}_mode"][value="${vatMode}"]`);
                    if (radio) radio.checked = true;
                }
            }
        };
    },

    /**
     * Calculate VAT.
     */
    calcVat(subtotal, discount, vatEnabled, vatMode) {
        const net = subtotal - (discount || 0);
        if (!vatEnabled) return { vat_amount: 0, grand_total: net };
        if (vatMode === 'shop_absorbs') {
            const vat_amount = Math.round((net * 7 / 107) * 100) / 100;
            return { vat_amount, grand_total: net };
        }
        const vat_amount = Math.round(net * 0.07 * 100) / 100;
        return { vat_amount, grand_total: net + vat_amount };
    },

    /**
     * Generate a three-dot action dropdown menu for table rows.
     * @param {string} tableName Collection/table name
     * @param {string} id Record ID
     * @param {string} editFn Function name for editing (default: 'editRow')
     * @param {string} deleteFn Function name for deleting (default: 'deleteRow')
     * @returns {string} HTML string
     */
    generateActionMenu(tableName, id, editFn = 'editRow', deleteFn = 'deleteRow') {
        const menuId = `menu_${tableName}_${id}`;
        return `
            <div class="dropdown" id="${menuId}" style="position:relative;display:inline-block;">
                <button class="btn-icon" onclick="event.stopPropagation(); document.querySelectorAll('.dropdown.active').forEach(d => { if(d.id!=='${menuId}') d.classList.remove('active'); }); document.getElementById('${menuId}').classList.toggle('active');" 
                    style="background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:var(--radius-md,8px);font-size:1.2rem;color:var(--text-secondary,#64748b);transition:all 150ms;"
                    onmouseover="this.style.background='var(--surface-100,#f1f5f9)'"
                    onmouseout="this.style.background='none'">
                    ⋮
                </button>
                <div class="dropdown-menu" style="display:none;position:absolute;right:0;top:100%;min-width:140px;background:var(--surface-0,#fff);border:1px solid var(--surface-200,#e2e8f0);border-radius:var(--radius-md,12px);box-shadow:var(--shadow-xl,0 4px 24px rgba(0,0,0,.12));z-index:100;overflow:hidden;">
                    <button onclick="event.stopPropagation(); ${editFn}('${tableName}','${id}'); document.getElementById('${menuId}').classList.remove('active');"
                        style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;font-size:0.9rem;color:var(--text-primary,#1e293b);transition:background 150ms;"
                        onmouseover="this.style.background='var(--surface-50,#f8fafc)'"
                        onmouseout="this.style.background='none'">
                        ✏️ แก้ไข
                    </button>
                    <button onclick="event.stopPropagation(); if(confirm('ยืนยันการลบ?')) ${deleteFn}('${tableName}','${id}'); document.getElementById('${menuId}').classList.remove('active');"
                        style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 16px;border:none;background:none;cursor:pointer;font-size:0.9rem;color:var(--danger,#ef4444);transition:background 150ms;"
                        onmouseover="this.style.background='var(--danger-50,#fef2f2)'"
                        onmouseout="this.style.background='none'">
                        🗑️ ลบ
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Open vehicle timeline modal (placeholder for future implementation).
     * @param {string} plate Car registration plate
     */
    openTimeline(plate) {
        alert(`ประวัติรถ: ${plate}\n\n(ฟีเจอร์นี้กำลังพัฒนา)`);
    }
};

// Global listener to close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown.active').forEach(d => {
        d.classList.remove('active');
        const menu = d.querySelector('.dropdown-menu');
        if (menu) menu.style.display = 'none';
    });
});

// Toggle dropdown-menu visibility when .dropdown gets .active class
const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
            const el = m.target;
            if (el.classList.contains('dropdown')) {
                const menu = el.querySelector('.dropdown-menu');
                if (menu) menu.style.display = el.classList.contains('active') ? 'block' : 'none';
            }
        }
    });
});
observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });

