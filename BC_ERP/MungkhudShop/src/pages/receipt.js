import { createDocumentPage } from './document-factory.js'
export const initReceiptPage = createDocumentPage({ title: 'ใบเสร็จรับเงิน', icon: 'paid', prefix: 'RC', collection: 'receipts' })
