import { createDocumentPage } from './document-factory.js'
export const initPurchaseInvoicePage = createDocumentPage({
    title: 'ใบกำกับภาษีซื้อ (IV)',
    icon: 'description',
    prefix: 'PIV',
    collection: 'purchase_invoices',
    entityLabel: 'ผู้จำหน่าย',
    refLabel: 'เลขที่ใบกำกับภาษีผู้ขาย',
    notesLabel: 'หมายเหตุเจ้าหนี้',
    itemsTitle: 'รายการซื้อ / ค่าใช้จ่าย'
})
