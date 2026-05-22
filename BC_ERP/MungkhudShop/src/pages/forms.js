/**
 * Forms / Print Templates page.
 * VAT-aware, configurable print layout that respects settings.
 * Shows product_name instead of just product_id, shows discount column when applicable.
 */
import { showToast } from '../components/ui.js'
import { fetchFullList } from '../services/pb.js'
import { generateInvoicePDF } from '../services/pdf-engine.js'
import { sanitizeFilter } from '../utils/sanitize.js'
import { openPrintWindow } from '../utils/print-utils.js'

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
