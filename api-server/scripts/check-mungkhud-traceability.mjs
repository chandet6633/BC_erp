const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')
const BRANCH_ID = process.env.TEST_BRANCH_ID || 'bc-auto-service'

function devHeaders(role = 'admin') {
    return {
        'content-type': 'application/json',
        'x-bcauto-dev-auth': '1',
        'x-bcauto-dev-role': role,
        'x-bcauto-dev-user-id': `dev-${role}-all`,
        'x-bcauto-dev-user-name': `Dev ${role}`,
        'x-bcauto-dev-branch': 'bc-auto-service'
    }
}

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { ...devHeaders('admin'), ...(options.headers || {}) }
    })
    const text = await res.text()
    let body = null
    try {
        body = text ? JSON.parse(text) : null
    } catch {
        body = text
    }
    return { res, body }
}

function assert(condition, message) {
    if (!condition) throw new Error(message)
}

function recordId(record) {
    return record?.id ?? record?.Id ?? record?.ID
}

function metadata(record) {
    if (!record?.metadata_json) return {}
    if (typeof record.metadata_json === 'object') return record.metadata_json || {}
    try {
        return JSON.parse(record.metadata_json)
    } catch {
        return {}
    }
}

async function create(table, data) {
    const { res, body } = await request(`/api/data/${table}`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    assert(res.ok, `create ${table} failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function confirmDocument(id) {
    const { res, body } = await request(`/api/data/custom/confirm-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
    assert(res.ok, `confirm document failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function confirmDocumentResult(id) {
    return request(`/api/data/custom/confirm-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
}

async function documentLedgers(docNo) {
    const { res, body } = await request('/api/data/stock_ledgers?limit=1000')
    assert(res.ok, `stock ledger lookup failed: ${res.status} ${JSON.stringify(body)}`)
    return (body.items || body).filter(ledger => String(ledger.reference_doc || '') === String(docNo))
}

async function stockLots(productId, branchId = BRANCH_ID) {
    const { res, body } = await request(`/api/data/custom/stock-lots?product_id=${encodeURIComponent(productId)}&branch_id=${encodeURIComponent(branchId)}`)
    assert(res.ok, `stock lot lookup failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function createDocumentWithItem({ docType, docNo, product, item = {}, total = 100 }) {
    const doc = await create('documents', {
        doc_type: docType,
        doc_no: docNo,
        issue_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
        branch_id: BRANCH_ID,
        subtotal: total,
        discount: 0,
        vat_amount: 0,
        grand_total: total
    })
    await create('document_items', {
        document_id: recordId(doc),
        product_id: recordId(product),
        product_name: product.name,
        qty: item.qty ?? 1,
        uom: 'piece',
        price: item.price ?? total,
        unit_price: item.price ?? total,
        discount: 0,
        total,
        tracking_type: item.tracking_type || product.tracking_type,
        serial_numbers: item.serial_numbers || '',
        batch_no: item.batch_no || '',
        expiry_date: item.expiry_date || '',
        branch_id: BRANCH_ID
    })
    return doc
}

const suffix = Date.now()

const serialProduct = await create('products', {
    code: `PH2-SERIAL-${suffix}`,
    name: `Phase2 Serial Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 150,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'SERIALIZED',
    branch_id: BRANCH_ID
})

const serialNo = `SN-${suffix}`
const serialReceipt = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-SERIAL-${suffix}`,
    product: serialProduct,
    item: { qty: 1, price: 100, serial_numbers: serialNo },
    total: 100
})
const serialReceiptConfirm = await confirmDocument(recordId(serialReceipt))
assert(serialReceiptConfirm.document?.status === 'confirmed', `serialized RR expected confirmed, got ${serialReceiptConfirm.document?.status}`)

let ledgers = await documentLedgers(serialReceipt.doc_no)
assert(ledgers.some(ledger => String(ledger.serial_numbers || ledger.serial_no || metadata(ledger).serial_numbers || '').includes(serialNo)), 'serialized receipt ledger must preserve serial number')

const duplicateSerialReceipt = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-SERIAL-DUP-${suffix}`,
    product: serialProduct,
    item: { qty: 1, price: 100, serial_numbers: serialNo },
    total: 100
})
const duplicateSerialConfirm = await confirmDocumentResult(recordId(duplicateSerialReceipt))
assert(duplicateSerialConfirm.res.status === 400, `duplicate serial receipt should be rejected with 400, got ${duplicateSerialConfirm.res.status} ${JSON.stringify(duplicateSerialConfirm.body)}`)

const missingSerialIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-SERIAL-MISS-${suffix}`,
    product: serialProduct,
    item: { qty: 1, price: 100, serial_numbers: `SN-MISSING-${suffix}` },
    total: 100
})
const missingSerialConfirm = await confirmDocumentResult(recordId(missingSerialIssue))
assert(missingSerialConfirm.res.status === 400, `missing serial issue should be rejected with 400, got ${missingSerialConfirm.res.status} ${JSON.stringify(missingSerialConfirm.body)}`)

const serialIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-SERIAL-${suffix}`,
    product: serialProduct,
    item: { qty: 1, price: 100, serial_numbers: serialNo },
    total: 100
})
const serialIssueConfirm = await confirmDocument(recordId(serialIssue))
assert(serialIssueConfirm.document?.status === 'confirmed', `serialized RQ expected confirmed, got ${serialIssueConfirm.document?.status}`)

const serialReissue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-SERIAL-REISSUE-${suffix}`,
    product: serialProduct,
    item: { qty: 1, price: 100, serial_numbers: serialNo },
    total: 100
})
const serialReissueConfirm = await confirmDocumentResult(recordId(serialReissue))
assert(serialReissueConfirm.res.status === 400, `serial reissue should be rejected with 400, got ${serialReissueConfirm.res.status} ${JSON.stringify(serialReissueConfirm.body)}`)

const batchProduct = await create('products', {
    code: `PH2-BATCH-${suffix}`,
    name: `Phase2 Batch Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 80,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'BATCH',
    branch_id: BRANCH_ID
})

const batchNo = `LOT-${suffix}`
const expiryDate = '2027-12-31'
const batchReceipt = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-BATCH-${suffix}`,
    product: batchProduct,
    item: { qty: 5, price: 40, batch_no: batchNo, expiry_date: expiryDate },
    total: 200
})
const batchReceiptConfirm = await confirmDocument(recordId(batchReceipt))
assert(batchReceiptConfirm.document?.status === 'confirmed', `batch RR expected confirmed, got ${batchReceiptConfirm.document?.status}`)

ledgers = await documentLedgers(batchReceipt.doc_no)
assert(ledgers.some(ledger => {
    const meta = metadata(ledger)
    return (ledger.batch_no || meta.batch_no) === batchNo
        && String(ledger.expiry_date || meta.expiry_date || '').slice(0, 10) === expiryDate
}), 'batch receipt ledger must preserve batch and expiry')

const unknownBatchIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-BATCH-UNKNOWN-${suffix}`,
    product: batchProduct,
    item: { qty: 1, price: 40, batch_no: `LOT-MISSING-${suffix}` },
    total: 40
})
const unknownBatchConfirm = await confirmDocumentResult(recordId(unknownBatchIssue))
assert(unknownBatchConfirm.res.status === 409, `unknown batch issue should be rejected with 409, got ${unknownBatchConfirm.res.status} ${JSON.stringify(unknownBatchConfirm.body)}`)

const batchIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-BATCH-${suffix}`,
    product: batchProduct,
    item: { qty: 2, price: 40, batch_no: batchNo },
    total: 80
})
const batchIssueConfirm = await confirmDocument(recordId(batchIssue))
assert(batchIssueConfirm.document?.status === 'confirmed', `batch RQ expected confirmed, got ${batchIssueConfirm.document?.status}`)

const overBatchIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-BATCH-OVER-${suffix}`,
    product: batchProduct,
    item: { qty: 4, price: 40, batch_no: batchNo },
    total: 160
})
const overBatchConfirm = await confirmDocumentResult(recordId(overBatchIssue))
assert(overBatchConfirm.res.status === 409, `over-batch issue should be rejected with 409, got ${overBatchConfirm.res.status} ${JSON.stringify(overBatchConfirm.body)}`)

const oldBatch = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-BATCH-OLD-${suffix}`,
    product: batchProduct,
    item: { qty: 1, price: 40, batch_no: `LOT-OLD-${suffix}`, expiry_date: '2027-01-31' },
    total: 40
})
await confirmDocument(recordId(oldBatch))
const newBatch = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-BATCH-NEW-${suffix}`,
    product: batchProduct,
    item: { qty: 1, price: 40, batch_no: `LOT-NEW-${suffix}`, expiry_date: '2028-01-31' },
    total: 40
})
await confirmDocument(recordId(newBatch))
const oldBatchLedger = (await documentLedgers(oldBatch.doc_no)).find(ledger => (ledger.batch_no || metadata(ledger).batch_no) === `LOT-OLD-${suffix}`)
const newBatchLedger = (await documentLedgers(newBatch.doc_no)).find(ledger => (ledger.batch_no || metadata(ledger).batch_no) === `LOT-NEW-${suffix}`)
assert(oldBatchLedger && newBatchLedger, 'FIFO readiness ledgers must exist for old and new batches')
const oldTime = new Date(oldBatchLedger.CreatedAt || oldBatchLedger.created_at || oldBatchLedger.timestamp || 0).getTime()
const newTime = new Date(newBatchLedger.CreatedAt || newBatchLedger.created_at || newBatchLedger.timestamp || 0).getTime()
assert(oldTime <= newTime, 'FIFO readiness requires older receipt ledger to sort before newer receipt ledger')

const fifoProduct = await create('products', {
    code: `PH2-FIFO-${suffix}`,
    name: `Phase2 FIFO Batch Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 120,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'BATCH',
    metadata_json: JSON.stringify({ fifo_enforced: true, stock_rotation: 'FIFO', tracking_type: 'BATCH' }),
    branch_id: BRANCH_ID
})
const fifoOldBatch = `FIFO-OLD-${suffix}`
const fifoNewBatch = `FIFO-NEW-${suffix}`
const fifoOldReceipt = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-FIFO-OLD-${suffix}`,
    product: fifoProduct,
    item: { qty: 1, price: 60, batch_no: fifoOldBatch, expiry_date: '2027-03-31' },
    total: 60
})
await confirmDocument(recordId(fifoOldReceipt))
const fifoNewReceipt = await createDocumentWithItem({
    docType: 'RR',
    docNo: `RR-FIFO-NEW-${suffix}`,
    product: fifoProduct,
    item: { qty: 1, price: 60, batch_no: fifoNewBatch, expiry_date: '2028-03-31' },
    total: 60
})
await confirmDocument(recordId(fifoNewReceipt))

let fifoLots = await stockLots(recordId(fifoProduct))
assert(fifoLots.fifo_enforced === true, 'stock-lots should report FIFO enforcement for FIFO batch product')
assert(fifoLots.lots?.[0]?.batch_no === fifoOldBatch, `FIFO stock-lots should return oldest batch first, got ${JSON.stringify(fifoLots.lots)}`)

const fifoNewIssueTooEarly = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-FIFO-NEW-EARLY-${suffix}`,
    product: fifoProduct,
    item: { qty: 1, price: 60, batch_no: fifoNewBatch },
    total: 60
})
const fifoNewIssueTooEarlyConfirm = await confirmDocumentResult(recordId(fifoNewIssueTooEarly))
assert(fifoNewIssueTooEarlyConfirm.res.status === 409, `newer FIFO batch issue should be rejected with 409, got ${fifoNewIssueTooEarlyConfirm.res.status} ${JSON.stringify(fifoNewIssueTooEarlyConfirm.body)}`)
assert(fifoNewIssueTooEarlyConfirm.body?.code === 'FIFO_BATCH_REQUIRED', `newer FIFO batch issue should return FIFO_BATCH_REQUIRED, got ${JSON.stringify(fifoNewIssueTooEarlyConfirm.body)}`)

const fifoOldIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-FIFO-OLD-${suffix}`,
    product: fifoProduct,
    item: { qty: 1, price: 60, batch_no: fifoOldBatch },
    total: 60
})
const fifoOldIssueConfirm = await confirmDocument(recordId(fifoOldIssue))
assert(fifoOldIssueConfirm.document?.status === 'confirmed', `oldest FIFO batch issue expected confirmed, got ${fifoOldIssueConfirm.document?.status}`)

fifoLots = await stockLots(recordId(fifoProduct))
assert(fifoLots.lots?.[0]?.batch_no === fifoNewBatch, `FIFO stock-lots should advance to next batch after old batch is consumed, got ${JSON.stringify(fifoLots.lots)}`)

const fifoNewIssue = await createDocumentWithItem({
    docType: 'RQ',
    docNo: `RQ-FIFO-NEW-${suffix}`,
    product: fifoProduct,
    item: { qty: 1, price: 60, batch_no: fifoNewBatch },
    total: 60
})
const fifoNewIssueConfirm = await confirmDocument(recordId(fifoNewIssue))
assert(fifoNewIssueConfirm.document?.status === 'confirmed', `next FIFO batch issue expected confirmed, got ${fifoNewIssueConfirm.document?.status}`)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    branch_id: BRANCH_ID,
    serial_product_id: recordId(serialProduct),
    serial_no: serialNo,
    duplicate_serial_status: duplicateSerialConfirm.res.status,
    missing_serial_status: missingSerialConfirm.res.status,
    serial_reissue_status: serialReissueConfirm.res.status,
    batch_product_id: recordId(batchProduct),
    batch_no: batchNo,
    unknown_batch_status: unknownBatchConfirm.res.status,
    over_batch_status: overBatchConfirm.res.status,
    fifo_old_batch: oldBatchLedger.batch_no || metadata(oldBatchLedger).batch_no,
    fifo_new_batch: newBatchLedger.batch_no || metadata(newBatchLedger).batch_no,
    fifo_enforced_product_id: recordId(fifoProduct),
    fifo_rejected_status: fifoNewIssueTooEarlyConfirm.res.status,
    fifo_rejected_code: fifoNewIssueTooEarlyConfirm.body?.code
}, null, 2))
