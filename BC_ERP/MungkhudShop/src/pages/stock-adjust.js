import { createDocumentPage } from './document-factory.js'
export const initStockAdjustPage = createDocumentPage({
    title: 'ปรับสต็อก (SA)',
    icon: 'tune',
    prefix: 'SA',
    collection: 'stock_adjustments',
    entityLabel: 'ผู้ตรวจนับ / ผู้รับผิดชอบ',
    refLabel: 'อ้างอิงการตรวจนับ',
    notesLabel: 'เหตุผลการปรับสต็อก',
    notesPlaceholder: 'ระบุเหตุผล เช่น ตรวจนับจริง, สินค้าชำรุด, สูญหาย...',
    itemsTitle: 'รายการปรับเพิ่ม / ปรับลด',
    requireNotes: true,
    requireNotesMessage: 'กรุณาระบุเหตุผลก่อนบันทึกใบปรับสต็อก',
    allowNegativeQty: true
})
