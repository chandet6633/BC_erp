/**
 * PDF Engine — Generate Thai-capable PDF invoices using jsPDF.
 * Uses jsPDF loaded from CDN (esm.sh) with THSarabunNew font support.
 */

let jsPDFLoaded = null

/** Lazy-load jsPDF from CDN */
async function loadJsPDF() {
    if (jsPDFLoaded) return jsPDFLoaded
    
    // Load jsPDF via CDN
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js'
    
    await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })
    
    // Load autotable plugin for tables
    const tableScript = document.createElement('script')
    tableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js'
    
    await new Promise((resolve, reject) => {
        tableScript.onload = resolve
        tableScript.onerror = reject
        document.head.appendChild(tableScript)
    })

    jsPDFLoaded = window.jspdf
    return jsPDFLoaded
}

/** Format number as Thai Baht currency */
function fmtCurrency(n) {
    return (n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Generate PDF invoice and open in new tab.
 * @param {Object} tmpl - Template info { id, label }
 * @param {Object} record - The document/job record
 * @param {Array} items - Line items
 * @param {Object} shop - Shop info { shopName, shopAddress, shopPhone, shopTaxId }
 */
export async function generateInvoicePDF(tmpl, record, items, shop) {
    const { jsPDF } = await loadJsPDF()
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    const contentWidth = pageWidth - margin * 2
    let y = margin

    // ── Colors ──
    const NAVY = [30, 42, 79]       // #1E2A4F
    const GOLD = [200, 160, 72]     // #C8A048
    const GRAY = [120, 120, 120]
    const BLACK = [51, 51, 51]

    const isJob = tmpl.id === 'job'
    const docNo = isJob ? record.job_no : record.doc_no
    const date = isJob ? (record.start_date || '') : (record.issue_date || '')
    const dateStr = date ? date.split(' ')[0] : '-'
    const customer = isJob ? (record.customer_name || '-') : (record.entity_id || '-')

    // ── Header: Shop Name + Info ──
    doc.setFontSize(18)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.text(shop.shopName || 'MungkhudShop', margin, y + 6)
    
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    if (shop.shopAddress) {
        y += 10
        doc.text(shop.shopAddress, margin, y + 2)
    }
    if (shop.shopPhone) {
        y += 4
        doc.text('Tel: ' + shop.shopPhone, margin, y + 2)
    }

    // Right side: Tax ID + print date
    const rightX = pageWidth - margin
    let ry = margin + 2
    if (shop.shopTaxId) {
        doc.setFontSize(9)
        doc.setTextColor(...GRAY)
        doc.text('Tax ID: ' + shop.shopTaxId, rightX, ry, { align: 'right' })
        ry += 4
    }
    doc.text('Print: ' + new Date().toLocaleDateString('th-TH'), rightX, ry, { align: 'right' })

    // Header line
    y += 8
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)

    // ── Document Title ──
    y += 10
    doc.setFontSize(16)
    doc.setTextColor(...GOLD)
    doc.setFont('helvetica', 'bold')
    doc.text(tmpl.label, pageWidth / 2, y, { align: 'center' })

    // ── Info Grid ──
    y += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    
    const infoLeft = [
        ['Doc No:', docNo],
        [isJob ? 'Customer:' : 'Entity:', customer],
    ]
    const infoRight = [
        ['Date:', dateStr],
    ]

    if (isJob) {
        infoLeft.push(['Plate:', record.plate || '-'])
        infoRight.push(['Model:', record.model || '-'])
        if (record.mileage) infoRight.push(['Mileage:', record.mileage])
        if (record.technician) infoLeft.push(['Tech:', record.technician])
    } else {
        if (record.ref_no) infoRight.push(['Ref:', record.ref_no])
    }

    const midX = pageWidth / 2
    let infoY = y
    
    infoLeft.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NAVY)
        doc.text(label, margin, infoY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BLACK)
        doc.text(String(value), margin + 28, infoY)
        infoY += 5
    })

    infoY = y
    infoRight.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NAVY)
        doc.text(label, midX + 5, infoY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BLACK)
        doc.text(String(value), midX + 28, infoY)
        infoY += 5
    })

    y = Math.max(y + infoLeft.length * 5, y + infoRight.length * 5) + 5

    // ── Items Table ──
    const hasDiscount = items.some(i => (i.discount || 0) > 0) || (record.discount_amount || 0) > 0
    
    const headers = [['#', 'Item', 'Qty', 'Unit Price']]
    if (hasDiscount) headers[0].push('Discount')
    headers[0].push('Total')

    const tableData = items.map((item, idx) => {
        const displayName = item.product_name || item.product_id || '-'
        const lineDisc = item.discount || 0
        const lineTotal = item.total || ((item.qty || 0) * (item.unit_price || 0) - lineDisc)
        const row = [
            String(idx + 1),
            displayName,
            String(item.qty || 0),
            fmtCurrency(item.unit_price),
        ]
        if (hasDiscount) row.push(lineDisc > 0 ? fmtCurrency(lineDisc) : '-')
        row.push(fmtCurrency(lineTotal))
        return row
    })

    const colStyles = {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
    }
    
    if (hasDiscount) {
        colStyles[4] = { cellWidth: 25, halign: 'right' }
        colStyles[5] = { cellWidth: 28, halign: 'right' }
    } else {
        colStyles[4] = { cellWidth: 28, halign: 'right' }
    }

    doc.autoTable({
        startY: y,
        head: headers,
        body: tableData.length > 0 ? tableData : [hasDiscount 
            ? ['', 'No items', '', '', '', '']
            : ['', 'No items', '', '', '']
        ],
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: NAVY,
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
        },
        bodyStyles: {
            fontSize: 9,
            textColor: BLACK,
        },
        alternateRowStyles: {
            fillColor: [249, 249, 249],
        },
        columnStyles: colStyles,
        theme: 'grid',
    })

    y = doc.lastAutoTable.finalY + 8

    // ── Totals ──
    const subtotal = record.subtotal || 0
    const discAmt = record.discount_amount || 0
    const showVat = record.vat_enabled
    const vat = record.vat_amount || 0
    const total = record.grand_total || 0

    const totalsX = pageWidth - margin - 55
    const totalsValX = pageWidth - margin

    doc.setFontSize(10)
    
    // Subtotal
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('Subtotal:', totalsX, y, { align: 'right' })
    doc.setTextColor(...BLACK)
    doc.text(fmtCurrency(subtotal), totalsValX, y, { align: 'right' })
    y += 5

    // Discount
    if (hasDiscount && discAmt > 0) {
        doc.setTextColor(...GRAY)
        doc.text('Discount:', totalsX, y, { align: 'right' })
        doc.setTextColor(239, 68, 68) // red
        doc.text('-' + fmtCurrency(discAmt), totalsValX, y, { align: 'right' })
        y += 5
    }

    // VAT
    if (showVat) {
        const vatLabel = record.vat_mode === 'shop_absorbs' ? 'VAT 7% (absorbed):' : 'VAT 7%:'
        doc.setTextColor(...GRAY)
        doc.text(vatLabel, totalsX, y, { align: 'right' })
        doc.setTextColor(...BLACK)
        doc.text(fmtCurrency(vat), totalsValX, y, { align: 'right' })
        y += 5
    }

    // Grand total
    y += 2
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(0.5)
    doc.line(totalsX - 25, y - 2, totalsValX, y - 2)
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD)
    doc.text('Grand Total:', totalsX, y + 4, { align: 'right' })
    doc.text(fmtCurrency(total), totalsValX, y + 4, { align: 'right' })
    y += 12

    // VAT note
    if (showVat && record.vat_mode === 'shop_absorbs') {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...GRAY)
        doc.text('* Shop absorbs VAT — prices shown include VAT', totalsValX, y, { align: 'right' })
        y += 6
    }

    // ── Notes ──
    if (record.notes) {
        y += 5
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NAVY)
        doc.text('Notes:', margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BLACK)
        y += 5
        const noteLines = doc.splitTextToSize(record.notes, contentWidth)
        doc.text(noteLines, margin, y)
        y += noteLines.length * 4
    }

    if (isJob && record.repair_details) {
        y += 3
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...NAVY)
        doc.text('Repair Details:', margin, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BLACK)
        y += 5
        const repairLines = doc.splitTextToSize(record.repair_details, contentWidth)
        doc.text(repairLines, margin, y)
        y += repairLines.length * 4
    }

    // ── Signature Lines ──
    y = Math.max(y + 20, doc.internal.pageSize.getHeight() - 40)
    doc.setDrawColor(...GRAY)
    doc.setLineWidth(0.3)
    
    const sig1X = margin + 30
    const sig2X = pageWidth - margin - 30
    
    doc.line(margin, y, sig1X + 30, y)
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Customer / Receiver', margin + 15, y + 5, { align: 'center' })
    
    doc.line(sig2X - 30, y, pageWidth - margin, y)
    doc.text('Authorized Signature', pageWidth - margin - 15, y + 5, { align: 'center' })

    // ── Open PDF in new tab ──
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    
    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 60000)
}
