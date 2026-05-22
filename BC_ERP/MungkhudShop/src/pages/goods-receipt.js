import { createDocumentPage } from './document-factory.js'
export const initGoodsReceiptPage = createDocumentPage({
    title: 'ใบรับสินค้า (RR)',
    icon: 'local_shipping',
    prefix: 'RR',
    collection: 'goods_receipts',
    entityLabel: 'ผู้จำหน่าย',
    refLabel: 'เลขที่ใบส่งของ / ใบกำกับผู้ขาย',
    notesLabel: 'หมายเหตุการรับสินค้า',
    itemsTitle: 'รายการสินค้าที่รับเข้าคลัง'
})
