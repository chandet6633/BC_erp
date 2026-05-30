import { createDocumentPage } from './document-factory.js'
export const initStockReturnPage = createDocumentPage({
    title: 'ใบคืน (RE)',
    icon: 'assignment_return',
    prefix: 'RE',
    collection: 'stock_returns',
    entityLabel: 'ผู้คืน / ช่าง',
    refLabel: 'อ้างอิงใบเบิกหรือใบงาน',
    notesLabel: 'หมายเหตุการคืนสินค้า',
    itemsTitle: 'รายการสินค้าคืนเข้าคลัง'
})
