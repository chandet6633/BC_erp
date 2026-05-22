/**
 * Shared Print Utility — opens a print window with a formatted document.
 * Used by both forms.js (the print page) and document-factory.js (inline print button).
 */
import { escapeHtml } from './sanitize.js'

export function openPrintWindow(tmpl, record, items, shop, printCfg) {
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
        ${isJob ? `<div><span class="info-label">สถานะ:</span> ${record.status === 'completed' ? 'ปิดงาน' : record.status === 'cancelled' ? 'ยกเลิก' : 'เปิด'}</div>` : ''}
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
