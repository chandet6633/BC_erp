import { createDocumentPage } from './document-factory.js'
export const initStockTransferPage = createDocumentPage({
    title: 'ใบโอน (TF)',
    icon: 'swap_horiz',
    prefix: 'TF',
    collection: 'stock_transfers',
    entityLabel: 'ผู้ขอโอน / ผู้รับผิดชอบ',
    refLabel: 'อ้างอิงการโอน',
    notesLabel: 'หมายเหตุการโอน',
    itemsTitle: 'รายการสินค้าโอนย้าย'
})
