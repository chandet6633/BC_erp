/**
 * MungkhudShop — Help Instructions System
 * Shows a per-page Thai instruction modal accessed via a help button.
 */

/** Thai instruction content for each route */
const helpContent = {
    '#/dashboard': {
        title: 'แดชบอร์ด',
        steps: [
            'แดชบอร์ดแสดงภาพรวมการทำงานของร้าน',
            'ดูยอดขายทั้งหมด จำนวนใบงาน และสถานะต่างๆ',
            'ข้อมูลจะอัปเดตอัตโนมัติเมื่อมีการบันทึกข้อมูลใหม่'
        ]
    },
    '#/job': {
        title: 'ใบงาน (Job Order)',
        steps: [
            'คลิก "ค้นหา" เพื่อดูรายการใบงานทั้งหมด',
            'คลิก "เพิ่ม/แก้ไข" เพื่อสร้างใบงานใหม่',
            'กรอกข้อมูลรถ: ทะเบียนรถ, รุ่น, เลขไมล์',
            'กรอกข้อมูลลูกค้า: ชื่อ, เบอร์โทร',
            'เพิ่มรายการบริการ/สินค้า โดยกดปุ่ม "เพิ่มรายการ"',
            'ระบบจะคำนวณยอดรวม VAT 7% ให้อัตโนมัติ',
            'กดบันทึกเพื่อบันทึกใบงาน',
            'กดปิดงานเมื่องานเสร็จ หรือยกเลิกได้ถ้าต้องการ'
        ]
    },
    '#/quotation': {
        title: 'ใบเสนอราคา (Quotation)',
        steps: [
            'ค้นหาใบเสนอราคาที่มีอยู่ในแท็บ "ค้นหา"',
            'สร้างใบเสนอราคาใหม่ในแท็บ "เพิ่ม/แก้ไข"',
            'กรอกเลขเอกสาร วันที่ อ้างอิง',
            'เพิ่มรายการสินค้า/บริการ',
            'กดบันทึกเมื่อเสร็จ'
        ]
    },
    '#/invoice': {
        title: 'ใบแจ้งหนี้ (Invoice)',
        steps: [
            'ใช้สำหรับออกใบแจ้งหนี้/ใบกำกับภาษี',
            'สร้างเอกสารใหม่ในแท็บ "เพิ่ม/แก้ไข"',
            'กรอกข้อมูลเอกสาร: เลขเอกสาร วันที่ อ้างอิง',
            'เพิ่มรายการสินค้า แล้วกดบันทึก'
        ]
    },
    '#/receipt': {
        title: 'ใบเสร็จรับเงิน (Receipt)',
        steps: [
            'ใช้สำหรับออกใบเสร็จรับเงิน',
            'สร้างเอกสารใหม่ในแท็บ "เพิ่ม/แก้ไข"',
            'กรอกข้อมูลเช่นเดียวกับใบแจ้งหนี้',
            'ระบบจะคำนวณ VAT อัตโนมัติ'
        ]
    },
    '#/credit-note': {
        title: 'ใบลดหนี้ (Credit Note)',
        steps: [
            'ใช้เมื่อต้องการลดหนี้หรือคืนเงินลูกค้า',
            'อ้างอิงเลขใบแจ้งหนี้เดิมในช่อง "อ้างอิงเอกสาร"',
            'ระบุจำนวนเงินที่ต้องการลดหนี้'
        ]
    },
    '#/stock-list': {
        title: 'รายการสินค้าคงคลัง',
        steps: [
            'ดูรายการสินค้าและจำนวนคงเหลือทั้งหมด',
            'ค้นหาสินค้าจากชื่อ รหัส หรือหมวดหมู่',
            'จำนวนจะปรับอัตโนมัติเมื่อมีการเบิก/รับ/โอนย้าย'
        ]
    },
    '#/service-price-list': {
        title: 'รายการค่าบริการ',
        steps: [
            'ดูรายการบริการ ค่าแรง และรายการที่ไม่ตัดสต็อก',
            'แก้ไขต้นทุนหรือราคาขาย แล้วกดปุ่มบันทึกในแถวนั้น',
            'เพิ่มรายการใหม่หรือแก้ไขข้อมูลเต็มได้ที่หน้าสินค้า / บริการ'
        ]
    },
    '#/requisition': {
        title: 'ใบเบิกสินค้า (Requisition)',
        steps: [
            'ใช้สำหรับเบิกสินค้าออกจากคลัง',
            'สร้างใบเบิกใหม่ในแท็บ "เพิ่ม/แก้ไข"',
            'ระบุสินค้า จำนวน และเหตุผลการเบิก',
            'สินค้าจะถูกหักออกจากคลังอัตโนมัติ'
        ]
    },
    '#/stock-return': {
        title: 'ใบคืนสินค้า (Return)',
        steps: [
            'ใช้สำหรับคืนสินค้ากลับเข้าคลัง',
            'ระบุสินค้า จำนวนที่คืน',
            'สินค้าจะถูกเพิ่มเข้าคลังอัตโนมัติ'
        ]
    },
    '#/stock-transfer': {
        title: 'ใบโอนย้ายสินค้า (Transfer)',
        steps: [
            'ใช้สำหรับโอนย้ายสินค้าระหว่างคลัง',
            'ระบุคลังต้นทาง คลังปลายทาง',
            'ระบุสินค้าและจำนวนที่ต้องการโอนย้าย'
        ]
    },
    '#/stock-adjust': {
        title: 'ปรับปรุงสินค้า (Adjustment)',
        steps: [
            'ใช้สำหรับปรับปรุงจำนวนสินค้าในคลัง',
            'ระบุเหตุผลการปรับปรุง เช่น สินค้าเสื่อม, ตรวจนับ',
            'สามารถปรับเพิ่มหรือลดได้'
        ]
    },
    '#/goods-receipt': {
        title: 'ใบรับสินค้า (Goods Receipt)',
        steps: [
            'ใช้สำหรับบันทึกการรับสินค้าจากผู้ขาย',
            'อ้างอิงใบสั่งซื้อ (PO) ถ้ามี',
            'ตรวจสอบจำนวนและคุณภาพก่อนรับเข้าคลัง'
        ]
    },
    '#/purchase-invoice': {
        title: 'ใบแจ้งหนี้ซื้อ (Purchase Invoice)',
        steps: [
            'ใช้สำหรับบันทึกใบแจ้งหนี้จากผู้ขาย',
            'ดูรายการทั้งหมดในแท็บ "ค้นหา"',
            'สร้างรายการใหม่ในแท็บ "เพิ่ม/แก้ไข"'
        ]
    },
    '#/purchase-cn': {
        title: 'ใบลดหนี้ซื้อ (Purchase CN)',
        steps: [
            'ใช้เมื่อได้รับส่วนลดหรือคืนสินค้าให้ผู้ขาย',
            'อ้างอิงใบแจ้งหนี้ซื้อเดิม'
        ]
    },
    '#/payment': {
        title: 'การชำระเงิน (Payment)',
        steps: [
            'บันทึกการชำระเงินให้ผู้ขาย',
            'ระบุจำนวน วิธีชำระเงิน และอ้างอิงเอกสาร'
        ]
    },
    '#/withholding-tax': {
        title: 'ภาษีหัก ณ ที่จ่าย (Withholding Tax)',
        steps: [
            'บันทึกข้อมูลภาษีหัก ณ ที่จ่าย',
            'ระบุผู้ขาย ยอดเงิน อัตราภาษี',
            'ใช้สำหรับการยื่นแบบภาษี'
        ]
    },
    '#/master-company': {
        title: 'ข้อมูลบริษัท',
        steps: [
            'จัดการข้อมูลบริษัท/สาขาในระบบ',
            'กรอก รหัส ชื่อ เลขประจำตัวผู้เสียภาษี ที่อยู่',
            'กดบันทึกเพื่อเพิ่มหรืออัปเดต'
        ]
    },
    '#/master-customer': {
        title: 'ข้อมูลลูกค้า',
        steps: [
            'จัดการข้อมูลลูกค้าในระบบ',
            'เพิ่มลูกค้าใหม่ หรือแก้ไข/ลบลูกค้าเดิม',
            'สามารถค้นหาด้วยชื่อ รหัส หรือเบอร์โทร'
        ]
    },
    '#/master-vehicle': {
        title: 'ข้อมูลรถ',
        steps: [
            'จัดการข้อมูลรถในระบบ',
            'กรอก ทะเบียน ยี่ห้อ รุ่น ปี สี เลขไมล์',
            'เชื่อมโยงกับลูกค้าเจ้าของรถ'
        ]
    },
    '#/master-product': {
        title: 'ข้อมูลสินค้า/บริการ',
        steps: [
            'จัดการรายการสินค้าและบริการ',
            'กรอก รหัส ชื่อ ประเภท ราคาขาย ต้นทุน',
            'ระบุหน่วยนับและบาร์โค้ด (ถ้ามี)'
        ]
    },
    '#/master-vendor': {
        title: 'ข้อมูลผู้จำหน่าย',
        steps: [
            'จัดการข้อมูลผู้จำหน่าย/ซัพพลายเออร์',
            'กรอก รหัส ชื่อ ผู้ติดต่อ เบอร์โทร อีเมล'
        ]
    },
    '#/master-lookup': {
        title: 'ข้อมูลอ้างอิง (Lookup)',
        steps: [
            'จัดการข้อมูลอ้างอิงระบบ เช่น จังหวัด ธนาคาร',
            'เพิ่ม แก้ไข หรือปิดการใช้งานข้อมูลอ้างอิง'
        ]
    },
    '#/report-sales': {
        title: 'รายงานการขาย',
        steps: [
            'ดูรายงานยอดขายตามช่วงเวลา',
            'วิเคราะห์ผลการดำเนินงานร้าน',
            'ข้อมูลจะดึงจากใบงานที่ปิดแล้วโดยอัตโนมัติ'
        ]
    },
    '#/report-inventory': {
        title: 'รายงานคลังสินค้า',
        steps: [
            'ดูมูลค่าสินค้าคงเหลือ',
            'ตรวจสอบสินค้าที่เคลื่อนไหวช้า',
            'วิเคราะห์ต้นทุนคงคลัง'
        ]
    },
    '#/report-finance': {
        title: 'รายงานการเงิน',
        steps: [
            'สรุปรายรับ-รายจ่ายตามช่วงเวลา',
            'ดูกำไรขาดทุน',
            'วิเคราะห์สถานการณ์ทางการเงินของร้าน'
        ]
    },
    '#/forms': {
        title: 'แบบฟอร์ม',
        steps: [
            'เลือกแบบฟอร์มที่ต้องการพิมพ์',
            'กรอกข้อมูลหรือเลือกเอกสารที่ต้องการ',
            'กดพิมพ์เพื่อสร้างเอกสาร PDF'
        ]
    },
    '#/settings': {
        title: 'ตั้งค่าระบบ',
        steps: [
            'ตั้งค่าข้อมูลร้าน: ชื่อ ที่อยู่ เบอร์โทร',
            'ตั้งค่ารูปแบบเลขเอกสาร',
            'เชื่อมต่อ PocketBase',
            'จัดการข้อมูลสาขา'
        ]
    }
}

/** Show help modal for the current page */
export function showHelp(hash) {
    const content = helpContent[hash]
    if (!content) return

    // Remove existing modal if any
    const existing = document.querySelector('.help-modal-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.className = 'help-modal-overlay'
    overlay.innerHTML = `
        <div class="help-modal">
            <div class="help-modal-header">
                <span class="material-icons-outlined" style="color:var(--color-gold);margin-right:var(--sp-2);">help_outline</span>
                <h3>วิธีใช้: ${content.title}</h3>
                <button class="help-modal-close" aria-label="ปิด">
                    <span class="material-icons-outlined">close</span>
                </button>
            </div>
            <div class="help-modal-body">
                <ol class="help-steps">
                    ${content.steps.map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
            <div class="help-modal-footer">
                <button class="btn btn-primary help-modal-ok">เข้าใจแล้ว</button>
            </div>
        </div>
    `

    document.body.appendChild(overlay)

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'))

    // Close handlers
    overlay.querySelector('.help-modal-close').addEventListener('click', () => closeHelp(overlay))
    overlay.querySelector('.help-modal-ok').addEventListener('click', () => closeHelp(overlay))
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeHelp(overlay)
    })
}

function closeHelp(overlay) {
    overlay.classList.remove('visible')
    setTimeout(() => overlay.remove(), 300)
}

/** Get help content for testing / external use */
export function getHelpContent(hash) {
    return helpContent[hash] || null
}
