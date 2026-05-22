/**
 * Job Page — Line Items & Calculations (v2)
 * v2: Adds ad-hoc item toggle (📦 product vs ⚡ manual entry, no stock impact).
 */
import { createAutocomplete, calcVat, showToast } from '../components/ui.js'
import { getProductsWithStock, getState } from './job-state.js'
import { isStockTrackedProduct, isServiceLikeProduct } from '../utils/stock-rules.js'

const parseNum = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
const formatNum = (val) => parseNum(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatInt = (val) => parseNum(val).toLocaleString('th-TH');

/** Add a line row to the job items table (v2: supports adhoc toggle) */
export function addJobLineRow(panel, data = null, index = 1) {
    const tbody = panel.querySelector('#jobItemsBody')
    if (tbody.querySelector('.grid-empty')) tbody.innerHTML = ''
    const isAdhoc = data?.type === 'adhoc'
    const displayName = data ? (data.product_name || data.product_id || '') : ''

    const tr = document.createElement('tr')
    tr.dataset.id = data ? (data.id || '') : ''
    tr.innerHTML = `
        <td data-label="#">${index}</td>
        <td data-label="รายการ" style="min-width:180px;">
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
        <td data-label="จำนวน"><input type="text" class="form-control item-qty" value="${data ? formatInt(data.qty) : 1}" style="width:72px;"></td>
        <td data-label="ราคา/หน่วย">
            <input type="text" class="form-control item-price" value="${data ? formatNum(data.unit_price || data.price || 0) : '0.00'}" style="width:96px;">
            <div class="adhoc-cost-wrapper" style="${isAdhoc ? '' : 'display:none;'} margin-top:4px;">
                <input type="text" class="form-control item-cost" placeholder="ทุน/หน่วย" title="ต้นทุนต่อหน่วย (เฉพาะรายการด่วน)" value="${data && data.cost !== undefined ? formatNum(data.cost) : ''}" style="width:96px; font-size:0.8rem; height:26px; border-color:var(--bc-warning-mid, #F59E0B);">
            </div>
        </td>
        <td data-label="ส่วนลด"><input type="text" class="form-control item-disc" value="${data ? formatNum(data.discount) : '0.00'}" style="width:80px;"></td>
        <td data-label="รวม" class="item-total text-bold">฿0.00</td>
        <td data-label="ลบ"><button type="button" class="btn btn-sm btn-danger item-remove"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
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
        tr.dataset.trackStock = nowAdhoc ? 'false' : ''
        currentStock = null
        recalcTotals(panel)
    })

    // Product autocomplete (catalog mode)
    let currentStock = null; // Cache stock for this row

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
                _raw: p,
                stock: stockMap[p.id] || 0
            }))
        },
        onSelect: (item) => {
            tr.querySelector('.item-price').value = formatNum(item._raw.price || 0)
            lineAC.input.dataset.selectedId = item.id
            lineAC.input.classList.add('item-prod')
            const trackStock = isStockTrackedProduct(item._raw)
            tr.dataset.trackStock = trackStock ? 'true' : 'false'
            tr.dataset.productType = item._raw.type || ''
            currentStock = trackStock ? item.stock : null
            
            // Initial check
            const qtyInp = tr.querySelector('.item-qty')
            if (trackStock && currentStock !== null && parseFloat(qtyInp.value) > currentStock) {
                // Ignore stock check for adhoc
                if (typeBtn.dataset.type !== 'adhoc') {
                    showToast(`สินค้าคงเหลือไม่พอ (${currentStock})`, 'warning')
                    qtyInp.value = currentStock > 0 ? currentStock : 1
                }
            }
            recalcTotals(panel)
        }
    })
    lineAC.input.classList.add('item-prod')
    if (!isAdhoc && data?.product_id) {
        lineAC.input.dataset.selectedId = data.product_id
        // Load initial stock if available
        getProductsWithStock().then(({ products, stockMap }) => {
            const prod = products.find(p => p.id === data.product_id)
            const trackStock = prod ? isStockTrackedProduct(prod) : data.is_track_stock !== false
            tr.dataset.trackStock = trackStock ? 'true' : 'false'
            tr.dataset.productType = prod?.type || data.product_type || ''
            currentStock = trackStock ? (stockMap[data.product_id] || 0) : null
        })
    }

    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', (e) => {
        if (e.target.classList.contains('item-qty') && typeBtn.dataset.type !== 'adhoc' && tr.dataset.trackStock !== 'false' && currentStock !== null) {
            const val = parseNum(e.target.value) || 0
            if (val > currentStock) {
                showToast(`สินค้าคงเหลือไม่พอ (${currentStock})`, 'warning')
                e.target.value = formatInt(currentStock > 0 ? currentStock : 1)
            }
        }
        recalcTotals(panel)
    }))

    // Bug 81 Fix: Format currency on blur, unformat on focus
    tr.querySelectorAll('.item-price, .item-cost, .item-disc').forEach(inp => {
        inp.addEventListener('blur', (e) => {
            if (e.target.value.trim() !== '') {
                e.target.value = formatNum(e.target.value);
            }
        });
        inp.addEventListener('focus', (e) => {
            if (e.target.value.trim() !== '') {
                e.target.value = parseNum(e.target.value);
                e.target.select();
            }
        });
    });
    
    tr.querySelectorAll('.item-qty').forEach(inp => {
        inp.addEventListener('blur', (e) => {
            if (e.target.value.trim() !== '') e.target.value = formatInt(e.target.value);
        });
        inp.addEventListener('focus', (e) => {
            if (e.target.value.trim() !== '') {
                e.target.value = parseNum(e.target.value);
                e.target.select();
            }
        });
    });

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
        const qty = parseNum(tr.querySelector('.item-qty')?.value) || 0
        const price = parseNum(tr.querySelector('.item-price')?.value) || 0
        const disc = parseNum(tr.querySelector('.item-disc')?.value) || 0
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
