import { fetchFullList } from './pb.js'
import { sanitizeFilter } from '../utils/sanitize.js'
import { formatDate, formatCurrency } from '../components/ui.js'

/**
 * Print Engine — Generates an isolated HTML document in a hidden iframe
 * and triggers the native browser print dialog.
 */
export async function printJob(jobId) {
    if (!jobId) return

    try {
        // 1. Fetch Job Data
        const jobs = await fetchFullList('jobs', { filter: `id='${sanitizeFilter(jobId)}'`, requestKey: null })
        if (jobs.length === 0) throw new Error('Job not found')
        const job = jobs[0]

        // 2. Fetch Job Items
        const items = await fetchFullList('job_items', { filter: `job_id='${sanitizeFilter(jobId)}'`, requestKey: null })

        // 3. Fetch Settings (for Logo, QR, Payment Text, etc)
        let settings = {}
        const sList = await fetchFullList('settings', { requestKey: null })
        if (sList.length > 0) settings = sList[0]

        // 4. Generate HTML content
        const html = generateInvoiceHtml(job, items, settings)

        // 5. Print via Iframe
        printHtml(html)

    } catch (e) {
        console.error('Print Engine Error:', e)
        alert('เกิดข้อผิดพลาดในการพิมพ์เอกสาร: ' + e.message)
    }
}

function printHtml(htmlContent) {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0px'
    iframe.style.height = '0px'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(htmlContent)
    doc.close()

    // Wait for images to load before printing
    setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
            document.body.removeChild(iframe)
        }, 1000)
    }, 500)
}

function generateInvoiceHtml(job, items, settings) {
    // Extract images
    let logoUrl = ''
    if (settings.logo_image && settings.logo_image.length > 0) {
        logoUrl = typeof settings.logo_image[0] === 'string' ? settings.logo_image[0] : settings.logo_image[0].url
    }
    
    let qrUrl = ''
    if (settings.qr_payment_image && settings.qr_payment_image.length > 0) {
        qrUrl = typeof settings.qr_payment_image[0] === 'string' ? settings.qr_payment_image[0] : settings.qr_payment_image[0].url
    }

    const isPaid = job.payment_status === 'paid'

    let itemsHtml = ''
    items.forEach((item, idx) => {
        itemsHtml += `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td>${item.product_name || item.product_id}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:right;">${formatCurrency(item.unit_price || 0)}</td>
                <td style="text-align:right;">${formatCurrency(item.discount || 0)}</td>
                <td style="text-align:right;">${formatCurrency((item.qty * item.unit_price) - (item.discount || 0))}</td>
            </tr>
        `
    })

    if (items.length === 0) {
        itemsHtml = `<tr><td colspan="6" style="text-align:center;">ไม่มีรายการ</td></tr>`
    }

    return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>ใบเสร็จรับเงิน / ใบกำกับภาษี - ${job.job_no}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Sarabun', sans-serif;
            font-size: 14px;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            box-sizing: border-box;
            background: white;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .shop-info h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            color: #000;
        }
        .shop-info p {
            margin: 2px 0;
            font-size: 13px;
        }
        .logo {
            max-width: 150px;
            max-height: 80px;
            object-fit: contain;
        }
        .doc-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 15px 0;
            text-transform: uppercase;
        }
        .meta-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 13px;
        }
        .meta-box {
            width: 48%;
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
        }
        .meta-box strong {
            display: inline-block;
            width: 80px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
        }
        th {
            background-color: #f5f5f5;
            border: 1px solid #333;
            padding: 8px;
            text-align: center;
        }
        td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        .totals {
            width: 300px;
            float: right;
            border: 1px solid #333;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        .totals-row:last-child {
            border-bottom: none;
            background: #f5f5f5;
            font-weight: bold;
            font-size: 16px;
        }
        .payment-info {
            margin-top: 30px;
            padding: 15px;
            border: 1px dashed #999;
            background: #fafafa;
            border-radius: 4px;
            display: flex;
            gap: 20px;
            align-items: center;
            clear: both;
        }
        .qr-img {
            width: 100px;
            height: 100px;
            object-fit: contain;
        }
        .signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            clear: both;
        }
        .sig-box {
            width: 30%;
        }
        .sig-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 30px;
        }
        .status-stamp {
            position: absolute;
            top: 250px;
            right: 50px;
            font-size: 40px;
            font-weight: bold;
            color: ${isPaid ? 'rgba(0, 150, 0, 0.3)' : 'rgba(200, 0, 0, 0.3)'};
            transform: rotate(-15deg);
            border: 4px solid ${isPaid ? 'rgba(0, 150, 0, 0.3)' : 'rgba(200, 0, 0, 0.3)'};
            padding: 10px 20px;
            border-radius: 10px;
            z-index: 0;
            pointer-events: none;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 100%; min-height: auto; padding: 0; margin: 0; border: none; }
            @page { margin: 10mm; size: A4 portrait; }
        }
    </style>
</head>
<body>
    <div class="page" style="position:relative;">
        <div class="status-stamp">${isPaid ? 'PAID / ชำระแล้ว' : 'UNPAID / ค้างชำระ'}</div>
        
        <div class="header">
            <div class="shop-info">
                <h1>${settings.shop_name || 'MungkhudShop'}</h1>
                <p>${(settings.address || '').replace(/\\n/g, '<br>')}</p>
                <p>โทร: ${settings.phone || '-'} | อีเมล: ${settings.email || '-'}</p>
                <p>เลขประจำตัวผู้เสียภาษี: ${settings.tax_id || '-'}</p>
            </div>
            ${logoUrl ? `<img src="${logoUrl}" class="logo">` : ''}
        </div>

        <div class="doc-title">${isPaid ? 'ใบเสร็จรับเงิน / RECEIPT' : 'ใบแจ้งหนี้ / INVOICE'}</div>

        <div class="meta-grid">
            <div class="meta-box">
                <div style="margin-bottom:5px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:5px;">ลูกค้า</div>
                <div><strong>ชื่อ:</strong> ${job.customer_name || '-'}</div>
                <div><strong>โทร:</strong> ${job.customer_phone || '-'}</div>
                <div><strong>ทะเบียน:</strong> ${job.plate || '-'}</div>
                <div><strong>รุ่นรถ:</strong> ${job.model || '-'}</div>
            </div>
            <div class="meta-box">
                <div style="margin-bottom:5px;font-weight:bold;border-bottom:1px solid #ddd;padding-bottom:5px;">ข้อมูลเอกสาร</div>
                <div><strong>เลขที่:</strong> ${job.job_no || '-'}</div>
                <div><strong>วันที่:</strong> ${formatDate(job.start_date || new Date().toISOString())}</div>
                <div><strong>อ้างอิง:</strong> ${job.chassis || '-'}</div>
                <div><strong>พนักงาน:</strong> ${job.lead_mechanic_id || '-'}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width:5%;">#</th>
                    <th style="width:40%;">รายการ</th>
                    <th style="width:10%;">จำนวน</th>
                    <th style="width:15%;">ราคา/หน่วย</th>
                    <th style="width:15%;">ส่วนลด</th>
                    <th style="width:15%;">รวม</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <span>รวมเป็นเงิน (Subtotal)</span>
                <span>${formatCurrency(job.subtotal || 0)}</span>
            </div>
            <div class="totals-row">
                <span>ส่วนลด (Discount)</span>
                <span>-${formatCurrency(job.discount_amount || 0)}</span>
            </div>
            <div class="totals-row">
                <span>ภาษีมูลค่าเพิ่ม (VAT)</span>
                <span>${formatCurrency(job.vat_amount || 0)}</span>
            </div>
            <div class="totals-row">
                <span>จำนวนเงินทั้งสิ้น (Grand Total)</span>
                <span>${formatCurrency(job.grand_total || 0)}</span>
            </div>
        </div>

        ${!isPaid && qrUrl ? `
        <div class="payment-info">
            <img src="${qrUrl}" class="qr-img" alt="QR Payment">
            <div>
                <strong style="display:block;margin-bottom:5px;font-size:16px;">สแกนเพื่อชำระเงิน</strong>
                <div style="white-space:pre-line;">${settings.qr_payment_text || ''}</div>
            </div>
        </div>
        ` : ''}

        <div class="signatures">
            <div class="sig-box">
                <div class="sig-line"></div>
                <div>ผู้รับเงิน / Collector</div>
                <div style="font-size:11px;color:#666;margin-top:5px;">วันที่ ________/________/________</div>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <div>ผู้ชำระเงิน / Payer</div>
                <div style="font-size:11px;color:#666;margin-top:5px;">วันที่ ________/________/________</div>
            </div>
        </div>
    </div>
</body>
</html>
    `
}

export async function printDailySummary(data) {
    if (!data) return

    try {
        let settings = {}
        const sList = await fetchFullList('settings', { requestKey: null })
        if (sList.length > 0) settings = sList[0]

        // Format dates
        const dateStr = new Date(data.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
        
        // Build Payments HTML
        const payLabels = {
            'cash': 'เงินสด', 'transfer': 'โอนเงิน', 'credit': 'บัตรเครดิต', 'qr': 'QR Payment', 'credit_term': 'เครดิต', 'insurance': 'ประกัน'
        }
        const paymentsHtml = Object.keys(data.payments).filter(k => data.payments[k] > 0).map(k => `
            <tr>
                <td>${payLabels[k] || k}</td>
                <td style="text-align:right;">${formatCurrency(data.payments[k])}</td>
            </tr>
        `).join('') || '<tr><td colspan="2" style="text-align:center;">ไม่มีข้อมูล</td></tr>'

        // Build Mechanics HTML
        const mechanicsHtml = Object.keys(data.mechStats).map(mid => `
            <tr>
                <td>${escapeHtml(data.mechMap[mid] || 'ช่างไม่ทราบชื่อ')}</td>
                <td style="text-align:center;">${data.mechStats[mid].lead}</td>
                <td style="text-align:center;">${data.mechStats[mid].helper}</td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;">ไม่มีข้อมูล</td></tr>'

        // Build Unpaid Jobs HTML
        const unpaidHtml = data.unpaidJobs.map(j => `
            <tr>
                <td>${escapeHtml(j.job_no)}</td>
                <td>${escapeHtml(j.plate)}</td>
                <td style="text-align:right;">${formatCurrency(j.grand_total || 0)}</td>
                <td>${j.status === 'open' ? 'เปิด' : 'ปิดงาน'}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;">ไม่มีค้างชำระ</td></tr>'

        const html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>สรุปปิดยอดประจำวัน - ${data.date}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #333; margin: 0; padding: 0; }
        .page { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; background: white; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; font-size: 16px; }
        .grid-2 { display: flex; gap: 20px; margin-bottom: 20px; }
        .col { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { background-color: #f5f5f5; border: 1px solid #333; padding: 8px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; }
        .summary-box { border: 2px solid #333; padding: 15px; margin-bottom: 20px; text-align: center; }
        .summary-box h2 { margin: 0 0 10px 0; font-size: 18px; }
        .summary-box .amt { font-size: 28px; font-weight: bold; color: #000; }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { width: 100%; min-height: auto; padding: 0; margin: 0; border: none; }
            @page { margin: 10mm; size: A4 portrait; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <h1>${settings.shop_name || 'MungkhudShop'}</h1>
            <p>รายงานสรุปยอดขายประจำวัน: ${dateStr}</p>
        </div>

        <div class="grid-2">
            <div class="col">
                <div class="summary-box">
                    <h2>ยอดขายรวม (ปิดงานแล้ว)</h2>
                    <div class="amt">${formatCurrency(data.totalRev)}</div>
                    <div style="margin-top:10px;">จำนวนบิล: ${data.closedCount} ใบ</div>
                </div>
            </div>
            <div class="col">
                <div class="summary-box" style="border-color: #d9534f;">
                    <h2 style="color: #d9534f;">งานค้างชำระ / ยังไม่ปิด</h2>
                    <div class="amt" style="color: #d9534f;">${data.unpaidCount} ใบ</div>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <div class="col">
                <h3>แยกตามช่องทางการชำระเงิน</h3>
                <table>
                    <thead><tr><th>ช่องทาง</th><th style="text-align:right;">จำนวนเงิน</th></tr></thead>
                    <tbody>${paymentsHtml}</tbody>
                </table>
            </div>
            <div class="col">
                <h3>ผลงานช่าง (จำนวนใบงาน)</h3>
                <table>
                    <thead><tr><th>ช่าง</th><th style="text-align:center;">ช่างหลัก</th><th style="text-align:center;">ช่างช่วย</th></tr></thead>
                    <tbody>${mechanicsHtml}</tbody>
                </table>
            </div>
        </div>

        <h3>รายการค้างชำระ / ยังไม่ปิดงาน</h3>
        <table>
            <thead><tr><th>ใบงาน</th><th>ทะเบียนรถ</th><th style="text-align:right;">ยอดเงิน</th><th>สถานะ</th></tr></thead>
            <tbody>${unpaidHtml}</tbody>
        </table>

        <div style="margin-top:50px;text-align:center;">
            <div>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</div>
        </div>
    </div>
</body>
</html>
        `
        printHtml(html)
    } catch (e) {
        console.error('Print Summary Error:', e)
        alert('เกิดข้อผิดพลาดในการพิมพ์รายงาน: ' + e.message)
    }
}
