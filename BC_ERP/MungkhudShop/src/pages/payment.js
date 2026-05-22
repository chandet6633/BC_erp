import { createDocumentPage } from './document-factory.js'
export const initPaymentPage = createDocumentPage({
    title: 'จ่ายเงิน (P)',
    icon: 'account_balance_wallet',
    prefix: 'PAY',
    collection: 'payments',
    hasItems: false,
    amountOnly: true,
    amountLabel: 'ยอดจ่ายเงิน',
    entityLabel: 'ผู้รับเงิน / ผู้จำหน่าย',
    refLabel: 'อ้างอิงใบกำกับภาษีซื้อ',
    notesLabel: 'ช่องทาง / หมายเหตุการจ่าย'
})
