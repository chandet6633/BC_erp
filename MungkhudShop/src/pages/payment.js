import { createDocumentPage } from './document-factory.js'
export const initPaymentPage = createDocumentPage({ title: 'จ่ายเงิน (P)', icon: 'account_balance_wallet', prefix: 'PAY', collection: 'payments' })
