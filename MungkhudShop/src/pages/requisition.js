import { createDocumentPage } from './document-factory.js'
export const initRequisitionPage = createDocumentPage({
    title: 'ใบเบิก (RQ)',
    icon: 'assignment',
    prefix: 'RQ',
    collection: 'requisitions',
    entityLabel: 'ผู้เบิก / ช่าง',
    refLabel: 'อ้างอิงใบงาน',
    notesLabel: 'เหตุผลการเบิก',
    itemsTitle: 'รายการสินค้าเบิกออก'
})
