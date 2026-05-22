import { createDocumentPage } from './document-factory.js'
export const initPurchaseCNPage = createDocumentPage({
    title: 'ใบลดหนี้ซื้อ (CN)',
    icon: 'playlist_remove',
    prefix: 'PCN',
    collection: 'purchase_credit_notes',
    entityLabel: 'ผู้จำหน่าย',
    refLabel: 'อ้างอิงใบกำกับภาษีซื้อ',
    notesLabel: 'เหตุผลการลดหนี้ซื้อ',
    itemsTitle: 'รายการลดหนี้ซื้อ'
})
