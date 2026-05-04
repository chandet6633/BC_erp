/**
 * Job Page — Line Items & Calculations (v2)
 * v2: Adds ad-hoc item toggle (📦 product vs ⚡ manual entry, no stock impact).
 */
import { createAutocomplete, calcVat } from '../components/ui.js'
import { getProductsWithStock, getState } from './job-state.js'

/** Add a line row to the job items table (v2: supports adhoc toggle) */
export function addJobLineRow(panel, data = null, index = 1) {
    const tbody = panel.querySelector('#jobItemsBody')
    if (tbody.querySelector('.grid-empty')) tbody.innerHTML = ''
    const isAdhoc = data?.type === 'adhoc'
    const displayName = data ? (data.product_name || data.product_id || '') : ''

    const tr = document.createElement('tr')
    tr.innerHTML = `
        <td>${index}</td>
        <td style="min-width:180px;">
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
                <button type="button" class="item-type-btn ${isAdhoc ? 'adhoc' : 'product'}"
                        data-type="${isAdhoc ? 'adhoc' : 'product'}"
                        title="คลิกเพื่อสลับ: สินค้าจากคลัง / รายการด่วน"
                        style="min-width:32px;height:32px;padding:4px 8px;font-size:13px;
                               border-radius:var(--radius-sm);cursor:pointer;
                               border:1px solid var(--bc-border);
                               background:${isAdhoc ? 'var(--bc-warning-light,#FEF3C7)' : 'var(--bc-surface-solid)'};
                               color:var(--bc-text);transition:all 0.15s;">${isAdhoc ? '⚡' : '📦'}</button>
                <span style="font-size:0.75rem;color:var(--bc-text-muted);">${isAdhoc ? 'ด่วน' : 'คลัง'}</span>
            </div>
            <div class="ac-line-host" style="${isAdhoc ? 'display:none;' : ''}"></div>
            <input type="text" class="form-control item-adhoc-name"
                   placeholder="ชื่อรายการ..."
                   value="${isAdhoc ? escapeForAttr(displayName) : ''}"
                   style="${isAdhoc ? '' : 'display:none;'}margin-bottom:4px;">
            <select class="form-control item-product-type" style="${isAdhoc ? '' : 'display:none;'}font-size:0.8rem;padding:4px 8px;height:32px;">
                <option value="">-- ประเภท --</option>
                <option value="service" ${data?.product_type === 'service' ? 'selected' : ''}>บริการ</option>
                <option value="part" ${data?.product_type === 'part' ? 'selected' : ''}>อะไหล่</option>
                <option value="labor" ${data?.product_type === 'labor' ? 'selected' : ''}>ค่าแรง</option>
                <option value="other" ${data?.product_type === 'other' ? 'selected' : ''}>อื่นๆ</option>
            </select>
        </td>
        <td><input type="number" class="form-control item-qty" value="${data ? data.qty : 1}" min="1" style="width:72px;"></td>
        <td>
            <input type="number" class="form-control item-price" value="${data ? (data.unit_price || data.price || 0) : 0}" min="0" style="width:96px;">
            <div class="adhoc-cost-wrapper" style="${isAdhoc ? '' : 'display:none;'} margin-top:4px;">
                <input type="number" class="form-control item-cost" placeholder="ทุน/หน่วย" title="ต้นทุนต่อหน่วย (เฉพาะรายการด่วน)" value="${data ? (data.cost || '') : ''}" min="0" style="width:96px; font-size:0.8rem; height:26px; border-color:var(--bc-warning-mid, #F59E0B);">
            </div>
        </td>
        <td><input type="number" class="form-control item-disc" value="${data ? data.discount : 0}" min="0" style="width:80px;"></td>
        <td class="item-total text-bold">฿0.00</td>
        <td><button type="button" class="btn btn-sm btn-danger item-remove"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
    `
    tbody.appendChild(tr)

    // Adhoc toggle handler
    const typeBtn = tr.querySelector('.item-type-btn')
    const acHost = tr.querySelector('.ac-line-host')
    const adhocName = tr.querySelector('.item-adhoc-name')
    const adhocType = tr.querySelector('.item-product-type')
    const typeLabel = typeBtn.nextElementSibling

    typeBtn.addEventListener('click', () => {
        const nowAdhoc = typeBtn.dataset.type !== 'adhoc'
        typeBtn.dataset.type = nowAdhoc ? 'adhoc' : 'product'
        typeBtn.textContent = nowAdhoc ? '⚡' : '📦'
        typeBtn.style.background = nowAdhoc ? 'var(--bc-warning-light,#FEF3C7)' : 'var(--bc-surface-solid)'
        typeBtn.className = `item-type-btn ${nowAdhoc ? 'adhoc' : 'product'}`
        typeLabel.textContent = nowAdhoc ? 'ด่วน' : 'คลัง'
        acHost.style.display = nowAdhoc ? 'none' : ''
        adhocName.style.display = nowAdhoc ? '' : 'none'
        adhocType.style.display = nowAdhoc ? '' : 'none'
        tr.querySelector('.adhoc-cost-wrapper').style.display = nowAdhoc ? '' : 'none'
        recalcTotals(panel)
    })

    // Product autocomplete (catalog mode)
    const lineAC = createAutocomplete({
        container: acHost,
        placeholder: 'พิมพ์ชื่อสินค้า...',
        value: isAdhoc ? '' : displayName,
        fetchItems: async () => {
            const { products: prods, stockMap } = await getProductsWithStock()
            return prods.map(p => ({
                id: p.id,
                code: p.code,
                label: p.name,
                secondary: `คงเหลือ: ${stockMap[p.id] || 0} | ฿${p.price || 0}`,
                _raw: p
            }))
        },
        onSelect: (item) => {
            tr.querySelector('.item-price').value = item._raw.price || 0
            lineAC.input.dataset.selectedId = item.id
            lineAC.input.classList.add('item-prod')
            recalcTotals(panel)
        }
    })
    lineAC.input.classList.add('item-prod')
    if (!isAdhoc && data?.product_id) lineAC.input.dataset.selectedId = data.product_id

    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => recalcTotals(panel)))
    tr.querySelector('.item-remove').addEventListener('click', () => { tr.remove(); recalcTotals(panel) })
    recalcTotals(panel)
}

/** Simple attribute escape helper */
function escapeForAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Recalculate subtotal, discount, VAT, and grand total */
export function recalcTotals(panel) {
    const { vatToggle } = getState()
    let subtotal = 0
    panel.querySelectorAll('#jobItemsBody tr').forEach(tr => {
        if (tr.classList.contains('grid-empty')) return
        const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0
        const price = parseFloat(tr.querySelector('.item-price')?.value) || 0
        const disc = parseFloat(tr.querySelector('.item-disc')?.value) || 0
        const lineTotal = (qty * price) - disc
        subtotal += lineTotal
        const cell = tr.querySelector('.item-total')
        if (cell) cell.textContent = '฿' + lineTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })
    })

    const discPct = parseFloat(panel.querySelector('#jobDiscount')?.value) || 0
    const discAmt = subtotal * (discPct / 100)

    const vatState = vatToggle ? vatToggle.getState() : { vatEnabled: false, vatMode: 'customer_pays' }
    const { vat_amount, grand_total } = calcVat(subtotal, discAmt, vatState.vatEnabled, vatState.vatMode)

    panel.querySelector('#jobSubtotal').textContent = '฿' + subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })
    panel.querySelector('#jobDiscountAmt').textContent = '-฿' + discAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })
    panel.querySelector('#jobVat').textContent = '฿' + vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })
    panel.querySelector('#jobTotal').textContent = '฿' + grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })

    panel.dataset.subtotal = subtotal
    panel.dataset.discAmt = discAmt
    panel.dataset.vat = vat_amount
    panel.dataset.total = grand_total
}
