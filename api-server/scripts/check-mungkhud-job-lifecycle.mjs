const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')
const BRANCH_ID = process.env.TEST_BRANCH_ID || 'bc-auto-service'

function devHeaders(role = 'admin', branch = 'bc-auto-service') {
    return {
        'content-type': 'application/json',
        'x-bcauto-dev-auth': '1',
        'x-bcauto-dev-role': role,
        'x-bcauto-dev-user-id': `dev-${role}-${branch}`,
        'x-bcauto-dev-user-name': `Dev ${role}`,
        'x-bcauto-dev-branch': branch
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

async function patch(table, id, data) {
    const { res, body } = await request(`/api/data/${table}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    })
    assert(res.ok, `patch ${table}/${id} failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function getRecord(table, id) {
    const { res, body } = await request(`/api/data/${table}/${encodeURIComponent(id)}`)
    assert(res.ok, `get ${table}/${id} failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function getList(table, params = '') {
    const { res, body } = await request(`/api/data/${table}${params}`)
    assert(res.ok, `list ${table} failed: ${res.status} ${JSON.stringify(body)}`)
    return body.items || body
}

async function confirmDocument(id) {
    const { res, body } = await request(`/api/data/custom/confirm-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
    assert(res.ok, `confirm document failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function postJobStock(id) {
    const { res, body } = await request(`/api/data/custom/post-job-stock/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
    assert(res.ok, `post job stock failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function closeJobPayment(id, splits) {
    const { res, body } = await request(`/api/data/custom/close-job-payment/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({ splits })
    })
    assert(res.ok, `close job payment failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function getStockBalances(branchId = BRANCH_ID) {
    const { res, body } = await request(`/api/data/custom/stock-balances?branch_id=${encodeURIComponent(branchId)}`)
    assert(res.ok, `stock balances failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function findMechanic() {
    const users = await getList('users', '?limit=500')
    return users.find(user => {
        const role = String(user.role || '').toLowerCase()
        const active = user.active !== false && user.active !== 'false' && user.is_active !== false && user.is_active !== 'false'
        const branch = String(user.branch_id || user.branch || '').trim()
        return active && ['mechanic', 'technician', 'employee'].includes(role) && (!branch || branch === BRANCH_ID)
    }) || null
}

const suffix = Date.now()
const today = new Date().toISOString().slice(0, 10)
let mechanic = await findMechanic()
if (!mechanic) {
    mechanic = await create('users', {
        username: `phase2_mechanic_${suffix}`,
        display_name: `Phase2 Mechanic ${suffix}`,
        name: `Phase2 Mechanic ${suffix}`,
        email: `phase2_mechanic_${suffix}@bcauto.local`,
        role: 'mechanic',
        branch: BRANCH_ID,
        branch_id: BRANCH_ID,
        active: true,
        is_active: true
    })
}

const product = await create('products', {
    code: `PH2-JOB-${suffix}`,
    name: `Phase2 Job Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 180,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'NONE',
    branch_id: BRANCH_ID
})

const rr = await create('documents', {
    doc_type: 'RR',
    doc_no: `RR-JOB-${suffix}`,
    issue_date: today,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 400,
    discount: 0,
    vat_amount: 0,
    grand_total: 400
})

await create('document_items', {
    document_id: recordId(rr),
    product_id: recordId(product),
    product_name: product.name,
    qty: 4,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 400,
    branch_id: BRANCH_ID
})

const rrConfirm = await confirmDocument(recordId(rr))
assert(rrConfirm.document?.status === 'confirmed', `RR expected confirmed, got ${rrConfirm.document?.status}`)

let balances = await getStockBalances()
let balance = balances[recordId(product)]
assert(Number(balance?.on_hand ?? balance?.qty) === 4, `expected initial job stock 4, got ${JSON.stringify(balance)}`)

const jobPayload = {
    job_no: `JOB-LIFE-${suffix}`,
    status: 'pending',
    start_date: today,
    plate: `TEST-${String(suffix).slice(-4)}`,
    customer_name: `Lifecycle Customer ${suffix}`,
    customer_phone: '0800000000',
    branch_id: BRANCH_ID,
    payment_status: 'unpaid',
    payment_type: 'cash',
    subtotal: 560,
    discount: 0,
    discount_amount: 0,
    vat_amount: 0,
    grand_total: 560,
    notes: 'Automated Phase 2 job lifecycle smoke'
}
if (mechanic) jobPayload.lead_mechanic_id = recordId(mechanic)

const job = await create('jobs', jobPayload)
const jobId = recordId(job)
assert(jobId, 'created job missing id')
const createdJob = await getRecord('jobs', jobId)
assert(String(createdJob.lead_mechanic_id || '') === String(recordId(mechanic)), `job mechanic assignment did not persist, got ${createdJob.lead_mechanic_id}`)

await create('job_items', {
    job_id: jobId,
    product_id: recordId(product),
    product_name: product.name,
    qty: 2,
    uom: 'piece',
    price: 180,
    unit_price: 180,
    discount: 0,
    total: 360,
    branch_id: BRANCH_ID
})

await create('job_items', {
    job_id: jobId,
    product_name: 'Lifecycle labor',
    qty: 1,
    price: 200,
    unit_price: 200,
    discount: 0,
    total: 200,
    type: 'adhoc',
    product_type: 'service',
    branch_id: BRANCH_ID
})

await patch('jobs', jobId, { status: 'in_progress' })
const inProgressJob = await getRecord('jobs', jobId)
assert(inProgressJob.status === 'in_progress', `job expected in_progress, got ${inProgressJob.status}`)

await patch('jobs', jobId, { status: 'qc_done' })
const qcJob = await getRecord('jobs', jobId)
assert(qcJob.status === 'qc_done', `job expected qc_done, got ${qcJob.status}`)

const posted = await postJobStock(jobId)
assert((posted.ledger?.posted || 0) === 1, `job stock should post one part ledger, got ${JSON.stringify(posted.ledger)}`)

const postedAgain = await postJobStock(jobId)
assert(postedAgain.ledger?.alreadyPosted === true || postedAgain.ledger?.posted === 0, `job stock posting must be idempotent, got ${JSON.stringify(postedAgain.ledger)}`)

balances = await getStockBalances()
balance = balances[recordId(product)]
assert(Number(balance?.on_hand ?? balance?.qty) === 2, `expected stock 2 after job stock post, got ${JSON.stringify(balance)}`)

const invoice = await create('documents', {
    doc_type: 'IV',
    doc_no: `IV-JOB-${suffix}`,
    issue_date: today,
    ref_no: job.job_no,
    entity_id: jobId,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 560,
    discount: 0,
    vat_amount: 0,
    grand_total: 560
})

await create('document_items', {
    document_id: recordId(invoice),
    product_name: `Job ${job.job_no}`,
    qty: 1,
    price: 560,
    unit_price: 560,
    discount: 0,
    total: 560,
    type: 'adhoc',
    product_type: 'service',
    branch_id: BRANCH_ID
})

const invoiceConfirm = await confirmDocument(recordId(invoice))
assert(invoiceConfirm.document?.status === 'confirmed', `IV expected confirmed, got ${invoiceConfirm.document?.status}`)
assert(invoiceConfirm.ledger?.skipped === true, `IV should not post stock ledger, got ${JSON.stringify(invoiceConfirm.ledger)}`)

const receipt = await create('documents', {
    doc_type: 'RC',
    doc_no: `RC-JOB-${suffix}`,
    issue_date: today,
    ref_no: invoice.doc_no,
    entity_id: jobId,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 560,
    discount: 0,
    vat_amount: 0,
    grand_total: 560
})

await create('document_items', {
    document_id: recordId(receipt),
    product_name: `Payment for ${job.job_no}`,
    qty: 1,
    price: 560,
    unit_price: 560,
    discount: 0,
    total: 560,
    type: 'adhoc',
    product_type: 'service',
    branch_id: BRANCH_ID
})

const receiptConfirm = await confirmDocument(recordId(receipt))
assert(receiptConfirm.document?.status === 'confirmed', `RC expected confirmed, got ${receiptConfirm.document?.status}`)
assert(receiptConfirm.ledger?.skipped === true, `RC should not post stock ledger, got ${JSON.stringify(receiptConfirm.ledger)}`)

await patch('jobs', jobId, {
    status: 'completed',
    payment_status: 'paid',
    end_date: today
})
const completedJob = await getRecord('jobs', jobId)
assert(completedJob.status === 'completed', `job expected completed, got ${completedJob.status}`)
assert(completedJob.payment_status === 'paid', `job expected paid, got ${completedJob.payment_status}`)

const verifiedJob = await getRecord('jobs', jobId)
assert(verifiedJob.status === 'completed', `verified job expected completed, got ${verifiedJob.status}`)
assert(verifiedJob.payment_status === 'paid', `verified job expected paid, got ${verifiedJob.payment_status}`)

const serialProduct = await create('products', {
    code: `PH2-JOB-SERIAL-${suffix}`,
    name: `Phase2 Job Serialized Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 250,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'SERIALIZED',
    metadata_json: JSON.stringify({ tracking_type: 'SERIALIZED' }),
    branch_id: BRANCH_ID
})
const serialNo = `JOB-SN-${suffix}`
const serialRr = await create('documents', {
    doc_type: 'RR',
    doc_no: `RR-JOB-SERIAL-${suffix}`,
    issue_date: today,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 100,
    discount: 0,
    vat_amount: 0,
    grand_total: 100
})
await create('document_items', {
    document_id: recordId(serialRr),
    product_id: recordId(serialProduct),
    product_name: serialProduct.name,
    qty: 1,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 100,
    serial_numbers: serialNo,
    tracking_type: 'SERIALIZED',
    branch_id: BRANCH_ID
})
await confirmDocument(recordId(serialRr))
const serialJob = await create('jobs', {
    job_no: `JOB-SERIAL-${suffix}`,
    status: 'qc_done',
    start_date: today,
    plate: `SN-${String(suffix).slice(-4)}`,
    customer_name: `Serialized Job Customer ${suffix}`,
    branch_id: BRANCH_ID,
    payment_status: 'unpaid',
    subtotal: 250,
    discount: 0,
    vat_amount: 0,
    grand_total: 250
})
await create('job_items', {
    job_id: recordId(serialJob),
    product_id: recordId(serialProduct),
    product_name: serialProduct.name,
    qty: 1,
    uom: 'piece',
    price: 250,
    unit_price: 250,
    discount: 0,
    total: 250,
    tracking_type: 'SERIALIZED',
    serial_numbers: serialNo,
    metadata_json: JSON.stringify({ tracking_type: 'SERIALIZED', serial_numbers: serialNo }),
    branch_id: BRANCH_ID
})
const serialPosted = await postJobStock(recordId(serialJob))
assert((serialPosted.ledger?.posted || 0) === 1, `serialized job stock should post one ledger, got ${JSON.stringify(serialPosted.ledger)}`)
const serialRepost = await postJobStock(recordId(serialJob))
assert(serialRepost.ledger?.alreadyPosted === true || serialRepost.ledger?.posted === 0, `serialized job stock posting must be idempotent, got ${JSON.stringify(serialRepost.ledger)}`)

const closeProduct = await create('products', {
    code: `PH2-CLOSE-${suffix}`,
    name: `Phase2 Close Part ${suffix}`,
    type: 'part',
    unit: 'piece',
    base_uom: 'piece',
    purchase_uom: 'piece',
    sales_uom: 'piece',
    price: 300,
    cost: 0,
    is_track_stock: true,
    tracking_type: 'NONE',
    branch_id: BRANCH_ID
})
const closeRr = await create('documents', {
    doc_type: 'RR',
    doc_no: `RR-JOB-CLOSE-${suffix}`,
    issue_date: today,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 200,
    discount: 0,
    vat_amount: 0,
    grand_total: 200
})
await create('document_items', {
    document_id: recordId(closeRr),
    product_id: recordId(closeProduct),
    product_name: closeProduct.name,
    qty: 2,
    uom: 'piece',
    price: 100,
    unit_price: 100,
    discount: 0,
    total: 200,
    branch_id: BRANCH_ID
})
await confirmDocument(recordId(closeRr))
const closeJob = await create('jobs', {
    job_no: `JOB-CLOSE-${suffix}`,
    status: 'qc_done',
    start_date: today,
    plate: `CL-${String(suffix).slice(-4)}`,
    customer_name: `Close Endpoint Customer ${suffix}`,
    branch_id: BRANCH_ID,
    payment_status: 'unpaid',
    subtotal: 500,
    discount: 0,
    vat_amount: 0,
    grand_total: 500
})
await create('job_items', {
    job_id: recordId(closeJob),
    product_id: recordId(closeProduct),
    product_name: closeProduct.name,
    qty: 1,
    uom: 'piece',
    price: 300,
    unit_price: 300,
    discount: 0,
    total: 300,
    branch_id: BRANCH_ID
})
await create('job_items', {
    job_id: recordId(closeJob),
    product_name: 'Close endpoint labor',
    qty: 1,
    price: 200,
    unit_price: 200,
    discount: 0,
    total: 200,
    type: 'adhoc',
    product_type: 'service',
    branch_id: BRANCH_ID
})
const closeResult = await closeJobPayment(recordId(closeJob), [{ method: 'cash', amount: 500 }])
assert(closeResult.job?.status === 'completed', `close endpoint job expected completed, got ${closeResult.job?.status}`)
assert(closeResult.job?.payment_status === 'paid', `close endpoint job expected paid, got ${closeResult.job?.payment_status}`)
assert(closeResult.invoice?.status === 'confirmed', `close endpoint invoice expected confirmed, got ${closeResult.invoice?.status}`)
assert(closeResult.receipt?.status === 'confirmed', `close endpoint receipt expected confirmed, got ${closeResult.receipt?.status}`)
assert(closeResult.financial_ledger?.posted === 1, `close endpoint expected one financial ledger, got ${JSON.stringify(closeResult.financial_ledger)}`)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    branch_id: BRANCH_ID,
    mechanic_id: mechanic ? recordId(mechanic) : null,
    product_id: recordId(product),
    job_id: jobId,
    job_status: verifiedJob.status,
    payment_status: verifiedJob.payment_status,
    stock_after_job: Number(balance?.on_hand ?? balance?.qty),
    serialized_job_id: recordId(serialJob),
    serialized_job_serial_no: serialNo,
    close_endpoint_job_id: recordId(closeJob),
    close_endpoint_invoice_status: closeResult.invoice.status,
    close_endpoint_receipt_status: closeResult.receipt.status,
    invoice_status: invoiceConfirm.document.status,
    receipt_status: receiptConfirm.document.status
}, null, 2))
