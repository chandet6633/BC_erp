import { createDocumentPage } from './document-factory.js'
export const initWithholdingTaxPage = createDocumentPage({
    title: 'ภาษีหัก ณ ที่จ่าย (WT)',
    icon: 'percent',
    prefix: 'WT',
    collection: 'withholding_tax',
    hasItems: false,
    amountOnly: true,
    amountLabel: 'ยอดภาษีหัก ณ ที่จ่าย',
    entityLabel: 'ผู้ถูกหักภาษี / ผู้จำหน่าย',
    refLabel: 'อ้างอิงเอกสารจ่ายเงิน',
    notesLabel: 'รายละเอียดภาษี'
})
