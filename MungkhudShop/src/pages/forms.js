/**
 * Forms / Print Templates page.
 * VAT-aware, configurable print layout that respects settings.
 * Shows product_name instead of just product_id, shows discount column when applicable.
 */
import { showToast } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { generateInvoicePDF } from '../services/pdf-engine.js'
import { sanitizeFilter, escapeHtml } from '../utils/sanitize.js'

export function initFormsPage(container) {
    const templates = [
        { id: 'job', label: 'ใบรับรถ / ใบงาน', icon: 'build', desc: 'พิมพ์ใบรับรถและรายละเอียดงาน', collection: 'jobs', keyField: 'job_no' },
        { id: 'QT', label: 'ใบเสนอราคา', icon: 'request_quote', desc: 'เอกสารเสนอราคาสำหรับลูกค้า', collection: 'documents', keyField: 'doc_no' },
        { id: 'IV', label: 'ใบแจ้งหนี้ / ใบกำกับภาษี', icon: 'receipt_long', desc: 'เอกสารเรียกเก็บเงินและภาษี', collection: 'documents', keyField: 'doc_no' },
        { id: 'RC', label: 'ใบเสร็จรับเงิน', icon: 'paid', desc: 'เอกสารยืนยันการรับชำระเงิน', collection: 'documents', keyField: 'doc_no' },
        { id: 'RR', label: 'ใบรับสินค้า', icon: 'inventory', desc: 'เอกสารบันทึกการรับสินค้าเข้าคลัง', collection: 'documents', keyField: 'doc_no' },
        { id: 'PI', label: 'ใบสั่งซื้อ / ใบแจ้งหนี้ซื้อ', icon: 'shopping_cart', desc: 'เอกสารการสั่งซื้อจากผู้จำหน่าย', collection: 'documents', keyField: 'doc_no' },
        { id: 'CN', label: 'ใบลดหนี้', icon: 'remove_circle_outline', desc: 'เอกสารลดยอดหนี้', collection: 'documents', keyField: 'doc_no' },
        { id: 'WT', label: 'หนังสือรับรองหัก ณ ที่จ่าย', icon: 'percent', desc: 'เอกสารภาษีหัก ณ ที่จ่าย', collection: 'documents', keyField: 'doc_no' },
    ]

    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <span class="material-icons-outlined">print</span>
                <h1>แบบฟอร์ม / พิมพ์เอกสาร</h1>
            </div>
        </div>
        <div class="card" style="margin-bottom:var(--sp-4);">
            <div class="card-body">
                <div class="form-row-2">
                    <div class="form-group">
                        <label class="form-label">เลือกประเภทเอกสาร</label>
                        <select class="form-control" id="formDocType">
                            ${templates.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">เลขเอกสาร</label>
                        <input type="text" class="form-control" id="formDocNo" placeholder="เช่น JOB2603-0001 หรือ IV2603-0001">
                    </div>
                </div>
                <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);">
                    <button class="btn btn-primary" id="btnPrintDoc"><span class="material-icons-outlined">print</span> พิมพ์เอกสาร</button>
                    <button class="btn btn-outline" id="btnPdfDoc" style="color:#C8A048;border-color:#C8A048;"><span class="material-icons-outlined">picture_as_pdf</span> PDF</button>
                </div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--sp-4);">
            ${templates.map(t => `
                <div class="card form-template-card" data-id="${t.id}" style="cursor:pointer;transition:all var(--transition-fast);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='';this.style.boxShadow='';">
                    <div class="card-body" style="display:flex;gap:var(--sp-4);align-items:center;">
                        <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--color-primary-light);display:flex;align-items:center;justify-content:center;color:var(--color-primary);flex-shrink:0;">
                            <span class="material-icons-outlined">${t.icon}</span>
                        </div>
                        <div>
                            <div style="font-weight:600;margin-bottom:2px;">${t.label}</div>
                            <div class="text-sm text-muted">${t.desc}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `

    // Clicking a template card selects it
    container.querySelectorAll('.form-template-card').forEach(card => {
        card.addEventListener('click', () => {
            container.querySelector('#formDocType').value = card.dataset.id
            container.querySelector('#formDocNo').focus()
        })
    })

    // Print button
    container.querySelector('#btnPrintDoc').addEventListener('click', async () => {
        const typeId = container.querySelector('#formDocType').value
        const docNo = container.querySelector('#formDocNo').value.trim()
        if (!docNo) return showToast('กรุณาระบุเลขเอกสาร', 'error')

        const tmpl = templates.find(t => t.id === typeId)
        if (!tmpl) return

        try {
            let record = null
            let items = []

            if (tmpl.collection === 'jobs') {
                const results = await fetchFullList('jobs', { filter: `job_no='${sanitizeFilter(docNo)}'`, requestKey: null })
                if (results.length === 0) return showToast('ไม่พบเอกสาร: ' + docNo, 'error')
                record = results[0]
                items = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(record.id)}'`, requestKey: null })
            } else {
                const results = await fetchFullList('documents', { filter: `doc_no='${sanitizeFilter(docNo)}'`, requestKey: null })
                if (results.length === 0) return showToast('ไม่พบเอกสาร: ' + docNo, 'error')
                record = results[0]
                items = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(record.id)}'`, requestKey: null })
            }

            // Load shop settings for header
            let shopInfo = { shopName: 'MungkhudShop', shopAddress: '', shopPhone: '', shopTaxId: '' }
            let printConfig = { showVat: 'auto', showDiscount: true, showBank: true, showSignature: true }
            try {
                const settings = await fetchFullList('settings', { requestKey: null })
                if (settings.length > 0) {
                    const s = settings[0]
                    shopInfo.shopName = s.shop_name || shopInfo.shopName
                    shopInfo.shopAddress = s.address || ''
                    shopInfo.shopPhone = s.phone || ''
                    shopInfo.shopTaxId = s.tax_id || ''
                    // Print config from settings (if stored as JSON or individual fields - use defaults if not)
                }
            } catch (e) { /* ignore */ }

            openPrintWindow(tmpl, record, items, shopInfo, printConfig)

        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาด: ' + e.message, 'error')
        }
    })

    // PDF export button
    container.querySelector('#btnPdfDoc').addEventListener('click', async () => {
        const typeId = container.querySelector('#formDocType').value
        const docNo = container.querySelector('#formDocNo').value.trim()
        if (!docNo) return showToast('กรุณาระบุเลขเอกสาร', 'error')

        const tmpl = templates.find(t => t.id === typeId)
        if (!tmpl) return

        const btn = container.querySelector('#btnPdfDoc')
        btn.disabled = true
        btn.innerHTML = '<span class="material-icons-outlined spin">hourglass_empty</span> กำลังสร้าง PDF...'

        try {
            let record = null
            let items = []

            if (tmpl.collection === 'jobs') {
                const results = await fetchFullList('jobs', { filter: `job_no='${sanitizeFilter(docNo)}'`, requestKey: null })
                if (results.length === 0) return showToast('ไม่พบเอกสาร: ' + docNo, 'error')
                record = results[0]
                items = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(record.id)}'`, requestKey: null })
            } else {
                const results = await fetchFullList('documents', { filter: `doc_no='${sanitizeFilter(docNo)}'`, requestKey: null })
                if (results.length === 0) return showToast('ไม่พบเอกสาร: ' + docNo, 'error')
                record = results[0]
                items = await fetchFullList('document_items', { filter: `document_id='${sanitizeFilter(record.id)}'`, requestKey: null })
            }

            let shopInfo = { shopName: 'MungkhudShop', shopAddress: '', shopPhone: '', shopTaxId: '' }
            try {
                const settings = await fetchFullList('settings', { requestKey: null })
                if (settings.length > 0) {
                    const s = settings[0]
                    shopInfo.shopName = s.shop_name || shopInfo.shopName
                    shopInfo.shopAddress = s.address || ''
                    shopInfo.shopPhone = s.phone || ''
                    shopInfo.shopTaxId = s.tax_id || ''
                }
            } catch (e) { /* ignore */ }

            await generateInvoicePDF(tmpl, record, items, shopInfo)
            showToast('PDF สร้างเรียบร้อย', 'success')

        } catch (e) {
            console.error(e)
            showToast('เกิดข้อผิดพลาด: ' + e.message, 'error')
        } finally {
            btn.disabled = false
            btn.innerHTML = '<span class="material-icons-outlined">picture_as_pdf</span> PDF'
        }
    })
}

function openPrintWindow(tmpl, record, items, shop, printCfg) {
    const isJob = tmpl.collection === 'jobs'
    const docNo = isJob ? record.job_no : record.doc_no
    const date = isJob ? (record.start_date || '') : (record.issue_date || '')
    const dateStr = date ? date.split(' ')[0] : '-'
    const customer = isJob ? (record.customer_name || '-') : (record.entity_id || '-')

    // Determine if discount column is needed
    const hasDiscount = items.some(i => (i.discount || 0) > 0) || (record.discount_amount || 0) > 0
    const discColCount = hasDiscount ? 6 : 5

    // VAT visibility: auto respects the document's vat_enabled flag
    const showVat = printCfg.showVat === 'always' || (printCfg.showVat === 'auto' && record.vat_enabled)
    const vatModeLabel = record.vat_mode === 'shop_absorbs' ? ' (ร้านออกให้)' : ''

    const itemRows = items.map((item, idx) => {
        const displayName = escapeHtml(item.product_name || item.product_id || '-')
        const lineDisc = item.discount || 0
        const lineTotal = item.total || ((item.qty || 0) * (item.unit_price || 0) - lineDisc)
        return `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${displayName}</td>
            <td style="text-align:center;">${item.qty || 0}</td>
            <td style="text-align:right;">${(item.unit_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            ${hasDiscount ? `<td style="text-align:right;">${lineDisc > 0 ? lineDisc.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>` : ''}
            <td style="text-align:right;">${lineTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
        </tr>`
    }).join('')

    const subtotal = record.subtotal || 0
    const discAmt = record.discount_amount || 0
    const vat = record.vat_amount || 0
    const total = record.grand_total || 0

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>${tmpl.label} - ${docNo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 14px; padding: 20mm; color: #333; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1E2A4F; padding-bottom: 10px; margin-bottom: 15px; }
        .shop-name { font-size: 20px; font-weight: bold; color: #1E2A4F; }
        .doc-title { font-size: 18px; font-weight: bold; text-align: center; color: #C8A048; margin: 10px 0; text-transform: uppercase; letter-spacing: 1px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 15px; font-size: 13px; }
        .info-grid div { padding: 2px 0; }
        .info-label { font-weight: 600; color: #1E2A4F; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #1E2A4F; color: #fff; padding: 8px; text-align: left; font-size: 13px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .totals { text-align: right; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
        .totals .row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 3px; }
        .totals .label { color: #666; min-width: 120px; text-align: right; }
        .totals .value { min-width: 100px; text-align: right; font-weight: 600; }
        .grand-total { font-size: 18px; font-weight: bold; color: #C8A048; border-top: 2px solid #C8A048; padding-top: 8px; margin-top: 5px; }
        .vat-note { font-size: 11px; color: #999; font-style: italic; margin-top: 3px; }
        .footer { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 12px; }
        .sig-line { border-top: 1px solid #999; margin-top: 50px; padding-top: 5px; text-align: center; }
        .notes-box { margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 6px; border-left: 3px solid #C8A048; font-size: 12px; }
        @media print { body { padding: 10mm; } }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="shop-name">${shop.shopName}</div>
            <div style="font-size:12px;color:#666;">${shop.shopAddress}</div>
            <div style="font-size:12px;color:#666;">โทร: ${shop.shopPhone}</div>
        </div>
        <div style="text-align:right;">
            ${shop.shopTaxId ? `<div style="font-size:12px;">เลขประจำตัวผู้เสียภาษี: ${shop.shopTaxId}</div>` : ''}
            <div style="font-size:12px;">วันที่พิมพ์: ${new Date().toLocaleDateString('th-TH')}</div>
        </div>
    </div>

    <div class="doc-title">${tmpl.label}</div>

    <div class="info-grid">
        <div><span class="info-label">เลขเอกสาร:</span> ${docNo}</div>
        <div><span class="info-label">วันที่:</span> ${dateStr}</div>
        <div><span class="info-label">${isJob ? 'ลูกค้า' : 'คู่ค้า'}:</span> ${customer}</div>
        ${isJob ? `<div><span class="info-label">ทะเบียนรถ:</span> ${record.plate || '-'}</div>` : `<div><span class="info-label">อ้างอิง:</span> ${record.ref_no || '-'}</div>`}
        ${isJob ? `<div><span class="info-label">รุ่น:</span> ${record.model || '-'}</div>` : ''}
        ${isJob ? `<div><span class="info-label">เลขไมล์:</span> ${record.mileage || '-'}</div>` : ''}
        ${isJob && record.technician ? `<div><span class="info-label">ช่าง:</span> ${record.technician}</div>` : ''}
        ${isJob ? `<div><span class="info-label">สถานะ:</span> ${record.status === 'closed' ? 'ปิดงาน' : record.status === 'cancelled' ? 'ยกเลิก' : 'เปิด'}</div>` : ''}
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:40px;text-align:center;">#</th>
                <th>รายการ</th>
                <th style="width:60px;text-align:center;">จำนวน</th>
                <th style="width:90px;text-align:right;">ราคา/หน่วย</th>
                ${hasDiscount ? '<th style="width:80px;text-align:right;">ส่วนลด</th>' : ''}
                <th style="width:90px;text-align:right;">รวม</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows || `<tr><td colspan="${discColCount}" style="text-align:center;color:#999;">ไม่มีรายการ</td></tr>`}
        </tbody>
    </table>

    <div class="totals">
        <div class="row"><span class="label">รวม:</span><span class="value">฿${subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
        ${hasDiscount ? `<div class="row"><span class="label">ส่วนลด:</span><span class="value" style="color:#ef4444;">-฿${discAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${showVat ? `<div class="row"><span class="label">ภาษีมูลค่าเพิ่ม 7%${vatModeLabel}:</span><span class="value">฿${vat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>` : ''}
        <div class="row grand-total"><span class="label">ยอดรวมสุทธิ:</span><span class="value">฿${total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>
        ${showVat && record.vat_mode === 'shop_absorbs' ? '<div class="vat-note">* ร้านรับภาระ VAT — ราคาที่แสดงเป็นราคารวม VAT แล้ว</div>' : ''}
    </div>

    ${record.notes ? `<div class="notes-box"><strong>หมายเหตุ:</strong> ${record.notes}</div>` : ''}
    ${isJob && record.repair_details ? `<div class="notes-box" style="margin-top:8px;"><strong>รายละเอียดซ่อม:</strong> ${record.repair_details}</div>` : ''}

    ${printCfg.showSignature !== false ? `
    <div class="footer">
        <div><div class="sig-line">ผู้รับสินค้า / ลูกค้า</div></div>
        <div><div class="sig-line">ผู้ออกเอกสาร</div></div>
    </div>` : ''}

    <script>window.onload = () => window.print();<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
}
