const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')
const BRANCH_ID = process.env.TEST_BRANCH_ID || 'bc-auto-service'
const DESTINATION_BRANCH_ID = process.env.TEST_DESTINATION_BRANCH_ID || 'bc-auto-samchuk'

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

async function voidDocument(id) {
    const { res, body } = await request(`/api/data/custom/void-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
    assert(res.ok, `void document failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function receiveTransfer(id) {
    const { res, body } = await request(`/api/data/custom/receive-transfer/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
    assert(res.ok, `receive transfer failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function getStockBalances(branchId = BRANCH_ID) {
    const { res, body } = await request(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(branchId)}`)
    assert(res.ok, `stock balances failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function balanceFor(productId, branchId = BRANCH_ID) {
    const balances = await getStockBalances(branchId)
    return balances[productId] || { on_hand: 0, qty: 0, in_transit: 0, available: 0, total_value: 0, avg_cost: 0 }
}

async function getRecord(table, id) {
    const { res, body } = await request(`/api/data/${table}/${encodeURIComponent(id)}`)
    assert(res.ok, `get ${table}/${id} failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function update(table, id, data) {
    const { res, body } = await request(`/api/data/${table}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
    assert(res.ok, `update ${table}/${id} failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

const suffix = Date.now()
const product = await create('products', {
    code: `PH2-SMOKE-${suffix}`,
    name: `Phase2 Stock Smoke ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 150,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'NONE',
    branch_id: BRANCH_ID
})

const rr = await create('documents', {
    doc_type: 'RR',
    doc_no: `RR-SMOKE-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 1000,
    discount: 0,
    vat_amount: 0,
    grand_total: 1000
})

await create('document_items', {
    document_id: recordId(rr),
    product_id: recordId(product),
    product_name: product.name,
    qty: 10,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 1000,
    branch_id: BRANCH_ID
})

const rrConfirm = await confirmDocument(recordId(rr))
assert(rrConfirm.document?.status === 'confirmed', `RR expected confirmed, got ${rrConfirm.document?.status}`)
assert((rrConfirm.ledger?.posted || 0) >= 1, 'RR confirmation must post stock ledger')

let balances = await getStockBalances()
let balance = balances[recordId(product)]
assert(balance, 'stock balance missing received product')
assert(Number(balance.on_hand ?? balance.qty) === 10, `expected on_hand 10 after RR, got ${JSON.stringify(balance)}`)
assert(Math.abs(Number(balance.avg_cost || 0) - 100) < 0.01, `expected avg_cost 100 after RR, got ${balance.avg_cost}`)

const updatedProduct = await getRecord('products', recordId(product))
assert(Math.abs(Number(updatedProduct.cost || 0) - 100) < 0.01, `product cost should be recalculated to 100, got ${updatedProduct.cost}`)

const rrHighCost = await create('documents', {
    doc_type: 'RR',
    doc_no: `RR-SMOKE-HIGH-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 2000,
    discount: 0,
    vat_amount: 0,
    grand_total: 2000
})

await create('document_items', {
    document_id: recordId(rrHighCost),
    product_id: recordId(product),
    product_name: product.name,
    qty: 10,
    uom: 'piece',
    price: 200,
    unit_price: 200,
    discount: 0,
    total: 2000,
    branch_id: BRANCH_ID
})

const rrHighCostConfirm = await confirmDocument(recordId(rrHighCost))
assert(rrHighCostConfirm.document?.status === 'confirmed', `second RR expected confirmed, got ${rrHighCostConfirm.document?.status}`)
assert((rrHighCostConfirm.ledger?.posted || 0) >= 1, 'second RR confirmation must post stock ledger')

balances = await getStockBalances()
balance = balances[recordId(product)]
assert(Number(balance.on_hand ?? balance.qty) === 20, `expected on_hand 20 after second RR, got ${JSON.stringify(balance)}`)
assert(Math.abs(Number(balance.avg_cost || 0) - 150) < 0.01, `expected moving avg_cost 150 after mixed receipts, got ${balance.avg_cost}`)

const averagedProduct = await getRecord('products', recordId(product))
assert(Math.abs(Number(averagedProduct.cost || 0) - 150) < 0.01, `product cost should be recalculated to 150, got ${averagedProduct.cost}`)

await update('products', recordId(product), { cost: 999 })
const { res: recalcRes, body: recalcBody } = await request('/api/data/custom/admin/recalculate-costs', {
    method: 'POST',
    body: '{}'
})
assert(recalcRes.ok, `admin recalculate-costs failed: ${recalcRes.status} ${JSON.stringify(recalcBody)}`)
const repairedProduct = await getRecord('products', recordId(product))
assert(Math.abs(Number(repairedProduct.cost || 0) - 150) < 0.01, `recalculate-costs should repair product cost to 150, got ${repairedProduct.cost}`)

const rq = await create('documents', {
    doc_type: 'RQ',
    doc_no: `RQ-SMOKE-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 300,
    discount: 0,
    vat_amount: 0,
    grand_total: 300
})

await create('document_items', {
    document_id: recordId(rq),
    product_id: recordId(product),
    product_name: product.name,
    qty: 3,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 300,
    branch_id: BRANCH_ID
})

const rqConfirm = await confirmDocument(recordId(rq))
assert(rqConfirm.document?.status === 'confirmed', `RQ expected confirmed, got ${rqConfirm.document?.status}`)
assert((rqConfirm.ledger?.posted || 0) >= 1, 'RQ confirmation must post stock ledger')

balances = await getStockBalances()
balance = balances[recordId(product)]
assert(Number(balance.on_hand ?? balance.qty) === 17, `expected on_hand 17 after RQ, got ${JSON.stringify(balance)}`)
assert(Math.abs(Number(balance.avg_cost || 0) - 150) < 0.01, `expected avg_cost to remain 150 after RQ, got ${balance.avg_cost}`)
assert(Math.abs(Number(balance.total_value || 0) - 2550) < 0.01, `expected total_value 2550 after RQ at moving average, got ${balance.total_value}`)

const overIssue = await create('documents', {
    doc_type: 'RQ',
    doc_no: `RQ-OVER-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 1800,
    discount: 0,
    vat_amount: 0,
    grand_total: 1800
})

await create('document_items', {
    document_id: recordId(overIssue),
    product_id: recordId(product),
    product_name: product.name,
    qty: 18,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 1800,
    branch_id: BRANCH_ID
})

const overIssueConfirm = await confirmDocumentResult(recordId(overIssue))
assert(overIssueConfirm.res.status === 409, `over-issue should be rejected with 409, got ${overIssueConfirm.res.status} ${JSON.stringify(overIssueConfirm.body)}`)

balances = await getStockBalances()
balance = balances[recordId(product)]
assert(Number(balance.on_hand ?? balance.qty) === 17, `over-issue must not change source balance, got ${JSON.stringify(balance)}`)

const transfer = await create('documents', {
    doc_type: 'TF',
    doc_no: `TF-SMOKE-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    destination_branch_id: DESTINATION_BRANCH_ID,
    subtotal: 200,
    discount: 0,
    vat_amount: 0,
    grand_total: 200
})

await create('document_items', {
    document_id: recordId(transfer),
    product_id: recordId(product),
    product_name: product.name,
    qty: 2,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 200,
    branch_id: BRANCH_ID
})

const transferConfirm = await confirmDocument(recordId(transfer))
assert(transferConfirm.document?.status === 'in_transit', `TF expected in_transit, got ${transferConfirm.document?.status}`)
assert((transferConfirm.ledger?.posted || 0) >= 2, 'TF confirmation must post dispatch and in-transit ledgers')

balances = await getStockBalances()
balance = balances[recordId(product)]
assert(Number(balance.on_hand ?? balance.qty) === 15, `expected source on_hand 15 after TF dispatch, got ${JSON.stringify(balance)}`)
assert(Math.abs(Number(balance.avg_cost || 0) - 150) < 0.01, `expected source avg_cost 150 after TF dispatch, got ${balance.avg_cost}`)

let destinationBalances = await getStockBalances(DESTINATION_BRANCH_ID)
let destinationBalance = destinationBalances[recordId(product)]
assert(Number(destinationBalance?.in_transit || 0) === 2, `expected destination in_transit 2 before receive, got ${JSON.stringify(destinationBalance)}`)
assert(Number(destinationBalance?.on_hand || 0) === 0, `expected destination on_hand 0 before receive, got ${JSON.stringify(destinationBalance)}`)

const transferReceive = await receiveTransfer(recordId(transfer))
assert(transferReceive.document?.status === 'received', `TF expected received, got ${transferReceive.document?.status}`)
assert((transferReceive.ledger?.posted || 0) >= 2, 'TF receive must clear in-transit and post destination stock')

destinationBalances = await getStockBalances(DESTINATION_BRANCH_ID)
destinationBalance = destinationBalances[recordId(product)]
assert(Number(destinationBalance?.on_hand || 0) === 2, `expected destination on_hand 2 after receive, got ${JSON.stringify(destinationBalance)}`)
assert(Number(destinationBalance?.in_transit || 0) === 0, `expected destination in_transit 0 after receive, got ${JSON.stringify(destinationBalance)}`)
assert(Math.abs(Number(destinationBalance?.avg_cost || 0) - 150) < 0.01, `expected destination avg_cost 150 after receive, got ${destinationBalance?.avg_cost}`)

const transferVoid = await voidDocument(recordId(transfer))
assert(transferVoid.document?.status === 'voided', `received TF void expected voided, got ${transferVoid.document?.status}`)
assert((transferVoid.ledger?.reversed || 0) >= 4, `received TF void should reverse dispatch, in-transit, clear, and receive ledgers, got ${JSON.stringify(transferVoid.ledger)}`)
balance = await balanceFor(recordId(product), BRANCH_ID)
assert(Number(balance.on_hand || 0) === 17, `expected source on_hand restored to 17 after received TF void, got ${JSON.stringify(balance)}`)
destinationBalance = await balanceFor(recordId(product), DESTINATION_BRANCH_ID)
assert(Number(destinationBalance.on_hand || 0) === 0, `expected destination on_hand 0 after received TF void, got ${JSON.stringify(destinationBalance)}`)
assert(Number(destinationBalance.in_transit || 0) === 0, `expected destination in_transit 0 after received TF void, got ${JSON.stringify(destinationBalance)}`)

const transferInTransit = await create('documents', {
    doc_type: 'TF',
    doc_no: `TF-INTRANSIT-VOID-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    destination_branch_id: DESTINATION_BRANCH_ID,
    subtotal: 100,
    discount: 0,
    vat_amount: 0,
    grand_total: 100
})
await create('document_items', {
    document_id: recordId(transferInTransit),
    product_id: recordId(product),
    product_name: product.name,
    qty: 1,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 100,
    branch_id: BRANCH_ID
})
const transferInTransitConfirm = await confirmDocument(recordId(transferInTransit))
assert(transferInTransitConfirm.document?.status === 'in_transit', `second TF expected in_transit, got ${transferInTransitConfirm.document?.status}`)
balance = await balanceFor(recordId(product), BRANCH_ID)
assert(Number(balance.on_hand || 0) === 16, `expected source on_hand 16 after second TF dispatch, got ${JSON.stringify(balance)}`)
destinationBalance = await balanceFor(recordId(product), DESTINATION_BRANCH_ID)
assert(Number(destinationBalance.in_transit || 0) === 1, `expected destination in_transit 1 before second TF void, got ${JSON.stringify(destinationBalance)}`)
const transferInTransitVoid = await voidDocument(recordId(transferInTransit))
assert(transferInTransitVoid.document?.status === 'voided', `in-transit TF void expected voided, got ${transferInTransitVoid.document?.status}`)
balance = await balanceFor(recordId(product), BRANCH_ID)
assert(Number(balance.on_hand || 0) === 17, `expected source on_hand restored to 17 after in-transit TF void, got ${JSON.stringify(balance)}`)
destinationBalance = await balanceFor(recordId(product), DESTINATION_BRANCH_ID)
assert(Number(destinationBalance.in_transit || 0) === 0, `expected destination in_transit 0 after in-transit TF void, got ${JSON.stringify(destinationBalance)}`)

const transferConsumed = await create('documents', {
    doc_type: 'TF',
    doc_no: `TF-CONSUMED-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    destination_branch_id: DESTINATION_BRANCH_ID,
    subtotal: 100,
    discount: 0,
    vat_amount: 0,
    grand_total: 100
})
await create('document_items', {
    document_id: recordId(transferConsumed),
    product_id: recordId(product),
    product_name: product.name,
    qty: 1,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 100,
    branch_id: BRANCH_ID
})
await confirmDocument(recordId(transferConsumed))
await receiveTransfer(recordId(transferConsumed))
const destinationIssue = await create('documents', {
    doc_type: 'RQ',
    doc_no: `RQ-CONSUME-TRANSFER-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: DESTINATION_BRANCH_ID,
    subtotal: 100,
    discount: 0,
    vat_amount: 0,
    grand_total: 100
})
await create('document_items', {
    document_id: recordId(destinationIssue),
    product_id: recordId(product),
    product_name: product.name,
    qty: 1,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 100,
    branch_id: DESTINATION_BRANCH_ID
})
await confirmDocument(recordId(destinationIssue))
const transferConsumedVoid = await request(`/api/data/custom/void-document/${encodeURIComponent(recordId(transferConsumed))}`, {
    method: 'POST',
    body: '{}'
})
assert(transferConsumedVoid.res.status === 409, `received TF void after destination consumption should be rejected with 409, got ${transferConsumedVoid.res.status} ${JSON.stringify(transferConsumedVoid.body)}`)
assert(transferConsumedVoid.body?.code === 'INSUFFICIENT_STOCK', `consumed TF void should return INSUFFICIENT_STOCK, got ${JSON.stringify(transferConsumedVoid.body)}`)

const adjustmentProduct = await create('products', {
    code: `PH2-ADJ-${suffix}`,
    name: `Phase2 Adjustment Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 120,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'NONE',
    branch_id: BRANCH_ID
})

const adjustmentRr = await create('documents', {
    doc_type: 'RR',
    doc_no: `RR-ADJ-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 500,
    discount: 0,
    vat_amount: 0,
    grand_total: 500
})
await create('document_items', {
    document_id: recordId(adjustmentRr),
    product_id: recordId(adjustmentProduct),
    product_name: adjustmentProduct.name,
    qty: 5,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 500,
    branch_id: BRANCH_ID
})
await confirmDocument(recordId(adjustmentRr))
let adjustmentBalance = await balanceFor(recordId(adjustmentProduct))
assert(Number(adjustmentBalance.on_hand || 0) === 5, `expected adjustment product on_hand 5 after RR, got ${JSON.stringify(adjustmentBalance)}`)

const adjustmentRq = await create('documents', {
    doc_type: 'RQ',
    doc_no: `RQ-VOID-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 200,
    discount: 0,
    vat_amount: 0,
    grand_total: 200
})
await create('document_items', {
    document_id: recordId(adjustmentRq),
    product_id: recordId(adjustmentProduct),
    product_name: adjustmentProduct.name,
    qty: 2,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 200,
    branch_id: BRANCH_ID
})
await confirmDocument(recordId(adjustmentRq))
adjustmentBalance = await balanceFor(recordId(adjustmentProduct))
assert(Number(adjustmentBalance.on_hand || 0) === 3, `expected adjustment product on_hand 3 after RQ, got ${JSON.stringify(adjustmentBalance)}`)
const rqVoid = await voidDocument(recordId(adjustmentRq))
assert(rqVoid.document?.status === 'voided', `RQ void expected voided, got ${rqVoid.document?.status}`)
assert((rqVoid.ledger?.reversed || 0) >= 1, `RQ void should post reversal ledger, got ${JSON.stringify(rqVoid.ledger)}`)
adjustmentBalance = await balanceFor(recordId(adjustmentProduct))
assert(Number(adjustmentBalance.on_hand || 0) === 5, `expected adjustment product on_hand restored to 5 after RQ void, got ${JSON.stringify(adjustmentBalance)}`)
const rqVoidAgain = await voidDocument(recordId(adjustmentRq))
assert(rqVoidAgain.alreadyVoided === true, `second RQ void should be idempotent, got ${JSON.stringify(rqVoidAgain)}`)

const adjustmentNoReason = await create('documents', {
    doc_type: 'SA',
    doc_no: `SA-NOREASON-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 100,
    discount: 0,
    vat_amount: 0,
    grand_total: 100
})
await create('document_items', {
    document_id: recordId(adjustmentNoReason),
    product_id: recordId(adjustmentProduct),
    product_name: adjustmentProduct.name,
    qty: 1,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 100,
    branch_id: BRANCH_ID
})
const adjustmentNoReasonConfirm = await confirmDocumentResult(recordId(adjustmentNoReason))
assert(adjustmentNoReasonConfirm.res.status === 400, `SA without reason should be rejected with 400, got ${adjustmentNoReasonConfirm.res.status} ${JSON.stringify(adjustmentNoReasonConfirm.body)}`)
assert(adjustmentNoReasonConfirm.body?.code === 'ADJUSTMENT_REASON_REQUIRED', `SA without reason should return ADJUSTMENT_REASON_REQUIRED, got ${JSON.stringify(adjustmentNoReasonConfirm.body)}`)

const adjustmentOver = await create('documents', {
    doc_type: 'SA',
    doc_no: `SA-OVER-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    notes: 'Physical count correction - over adjustment check',
    subtotal: 1000,
    discount: 0,
    vat_amount: 0,
    grand_total: 1000
})
await create('document_items', {
    document_id: recordId(adjustmentOver),
    product_id: recordId(adjustmentProduct),
    product_name: adjustmentProduct.name,
    qty: -6,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: -600,
    branch_id: BRANCH_ID
})
const adjustmentOverConfirm = await confirmDocumentResult(recordId(adjustmentOver))
assert(adjustmentOverConfirm.res.status === 409, `SA over-adjustment should be rejected with 409, got ${adjustmentOverConfirm.res.status} ${JSON.stringify(adjustmentOverConfirm.body)}`)

const adjustmentSa = await create('documents', {
    doc_type: 'SA',
    doc_no: `SA-OK-${suffix}`,
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
    branch_id: BRANCH_ID,
    notes: 'Physical count correction - confirmed adjustment',
    subtotal: 100,
    discount: 0,
    vat_amount: 0,
    grand_total: 100
})
await create('document_items', {
    document_id: recordId(adjustmentSa),
    product_id: recordId(adjustmentProduct),
    product_name: adjustmentProduct.name,
    qty: -1,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: -100,
    branch_id: BRANCH_ID
})
const adjustmentSaConfirm = await confirmDocument(recordId(adjustmentSa))
assert(adjustmentSaConfirm.document?.status === 'confirmed', `SA expected confirmed, got ${adjustmentSaConfirm.document?.status}`)
adjustmentBalance = await balanceFor(recordId(adjustmentProduct))
assert(Number(adjustmentBalance.on_hand || 0) === 4, `expected adjustment product on_hand 4 after SA, got ${JSON.stringify(adjustmentBalance)}`)
const adjustmentSaVoid = await voidDocument(recordId(adjustmentSa))
assert(adjustmentSaVoid.document?.status === 'voided', `SA void expected voided, got ${adjustmentSaVoid.document?.status}`)
adjustmentBalance = await balanceFor(recordId(adjustmentProduct))
assert(Number(adjustmentBalance.on_hand || 0) === 5, `expected adjustment product on_hand restored to 5 after SA void, got ${JSON.stringify(adjustmentBalance)}`)

balance = await balanceFor(recordId(product), BRANCH_ID)
destinationBalance = await balanceFor(recordId(product), DESTINATION_BRANCH_ID)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    branch_id: BRANCH_ID,
    destination_branch_id: DESTINATION_BRANCH_ID,
    product_id: recordId(product),
    rr_status: rrConfirm.document.status,
    rr_high_cost_status: rrHighCostConfirm.document.status,
    rq_status: rqConfirm.document.status,
    over_issue_status: overIssueConfirm.res.status,
    transfer_status: transferReceive.document.status,
    transfer_void_status: transferVoid.document.status,
    in_transit_transfer_void_status: transferInTransitVoid.document.status,
    consumed_transfer_void_status: transferConsumedVoid.res.status,
    source_on_hand: Number(balance.on_hand ?? balance.qty),
    destination_on_hand: Number(destinationBalance.on_hand || 0),
    avg_cost: Number(balance.avg_cost || 0),
    adjustment_product_id: recordId(adjustmentProduct),
    adjustment_reason_status: adjustmentNoReasonConfirm.res.status,
    adjustment_over_status: adjustmentOverConfirm.res.status,
    adjustment_final_on_hand: Number(adjustmentBalance.on_hand || 0)
}, null, 2))
