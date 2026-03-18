/**
 * Job Page — Line Items & Calculations (ARCH-2)
 * Extracted from job.js: addJobLineRow, recalcTotals
 */
import { createAutocomplete, calcVat } from '../components/ui.js'
import { getProductsWithStock, getState } from './job-state.js'

/** Add a line row to the job items table */
export function addJobLineRow(panel, data = null, index = 1) {
    const tbody = panel.querySelector('#jobItemsBody')
    if (tbody.querySelector('.grid-empty')) tbody.innerHTML = ''
    const tr = document.createElement('tr')
    const displayName = data ? (data.product_name || data.product_id || '') : ''
    tr.innerHTML = `
        <td>${index}</td>
        <td><div class="ac-line-host"></div></td>
        <td><input type="number" class="form-control item-qty" value="${data ? data.qty : 1}" min="1" style="width:80px;"></td>
        <td><input type="number" class="form-control item-price" value="${data ? data.unit_price : 0}" min="0" style="width:100px;"></td>
        <td><input type="number" class="form-control item-disc" value="${data ? data.discount : 0}" min="0" style="width:100px;"></td>
        <td class="item-total text-bold">฿0.00</td>
        <td><button class="btn btn-sm btn-danger item-remove"><span class="material-icons-outlined" style="font-size:16px;">close</span></button></td>
    `
    tbody.appendChild(tr)

    const acHost = tr.querySelector('.ac-line-host')
    const lineAC = createAutocomplete({
        container: acHost,
        placeholder: 'พิมพ์ชื่อสินค้า...',
        value: displayName,
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
    if (data?.product_id) lineAC.input.dataset.selectedId = data.product_id

    tr.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => recalcTotals(panel)))
    tr.querySelector('.item-remove').addEventListener('click', () => { tr.remove(); recalcTotals(panel) })
    recalcTotals(panel)
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
