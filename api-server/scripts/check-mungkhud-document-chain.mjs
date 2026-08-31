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

async function patchResult(table, id, data, role = 'admin') {
    return request(`/api/data/${table}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: devHeaders(role),
        body: JSON.stringify(data)
    })
}

async function deleteResult(table, id, role = 'admin') {
    return request(`/api/data/${table}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: devHeaders(role)
    })
}

async function confirmDocument(id) {
    const { res, body } = await request(`/api/data/custom/confirm-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: '{}'
    })
    assert(res.ok, `confirm document failed: ${res.status} ${JSON.stringify(body)}`)
    return body
}

async function confirmDocumentResult(id, role = 'admin') {
    return request(`/api/data/custom/confirm-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: devHeaders(role),
        body: '{}'
    })
}

async function voidDocumentResult(id, role = 'admin') {
    return request(`/api/data/custom/void-document/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: devHeaders(role),
        body: '{}'
    })
}

async function copyItems(sourceDocumentId, targetDocumentId) {
    const { res, body } = await request(`/api/data/document_items?limit=500&where=(document_id,eq,${encodeURIComponent(sourceDocumentId)})`)
    assert(res.ok, `list source document_items failed: ${res.status} ${JSON.stringify(body)}`)
    for (const item of body.items || []) {
        await create('document_items', {
            document_id: targetDocumentId,
            product_id: item.product_id || '',
            product_name: item.product_name || item.name || '',
            qty: item.qty,
            price: item.unit_price ?? item.price ?? 0,
            unit_price: item.unit_price ?? item.price ?? 0,
            discount: item.discount || 0,
            cost: item.cost || 0,
            total: item.total || 0,
            type: item.type || 'adhoc',
            product_type: item.product_type || 'service',
            branch_id: BRANCH_ID
        })
    }
}

const suffix = Date.now()
const today = new Date().toISOString().slice(0, 10)

const qt = await create('documents', {
    doc_type: 'QT',
    doc_no: `QT-CHAIN-${suffix}`,
    issue_date: today,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: 1000,
    discount: 0,
    vat_amount: 70,
    grand_total: 1070,
    vat_enabled: true,
    vat_mode: 'customer_pays'
})
const qtId = recordId(qt)

const qtItem = await create('document_items', {
    document_id: qtId,
    product_name: 'Document chain service',
    qty: 1,
    price: 1000,
    unit_price: 1000,
    discount: 0,
    total: 1000,
    type: 'adhoc',
    product_type: 'service',
    branch_id: BRANCH_ID
})
const qtItemId = recordId(qtItem)

const qtConfirm = await confirmDocument(qtId)
assert(qtConfirm.document?.status === 'confirmed', `QT expected confirmed, got ${qtConfirm.document?.status}`)
assert(qtConfirm.ledger?.skipped === true, `QT should not post stock ledger, got ${JSON.stringify(qtConfirm.ledger)}`)

const qtItemEditAsSa = await patchResult('document_items', qtItemId, { total: 900 }, 'sa')
assert(qtItemEditAsSa.res.status === 403, `SA should not edit confirmed QT item, got ${qtItemEditAsSa.res.status} ${JSON.stringify(qtItemEditAsSa.body)}`)

const qtDeleteAsAdmin = await deleteResult('documents', qtId, 'admin')
assert(qtDeleteAsAdmin.res.status === 403, `confirmed QT should not be deleted, got ${qtDeleteAsAdmin.res.status} ${JSON.stringify(qtDeleteAsAdmin.body)}`)

const invoice = await create('documents', {
    doc_type: 'IV',
    doc_no: `IV-CHAIN-${suffix}`,
    issue_date: today,
    ref_no: qt.doc_no,
    source_doc_id: qtId,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: qt.subtotal,
    discount: qt.discount || 0,
    vat_amount: qt.vat_amount,
    grand_total: qt.grand_total,
    vat_enabled: qt.vat_enabled,
    vat_mode: qt.vat_mode
})
const invoiceId = recordId(invoice)
await copyItems(qtId, invoiceId)
const invoiceConfirm = await confirmDocument(invoiceId)
assert(invoiceConfirm.document?.status === 'confirmed', `IV expected confirmed, got ${invoiceConfirm.document?.status}`)
assert(invoiceConfirm.ledger?.skipped === true, `IV should not post stock ledger, got ${JSON.stringify(invoiceConfirm.ledger)}`)

const invoicePatchAsManager = await patchResult('documents', invoiceId, { notes: 'should be locked' }, 'manager')
assert(invoicePatchAsManager.res.status === 403, `manager should not edit confirmed IV, got ${invoicePatchAsManager.res.status} ${JSON.stringify(invoicePatchAsManager.body)}`)

const receipt = await create('documents', {
    doc_type: 'RC',
    doc_no: `RC-CHAIN-${suffix}`,
    issue_date: today,
    ref_no: invoice.doc_no,
    source_doc_id: invoiceId,
    status: 'draft',
    branch_id: BRANCH_ID,
    subtotal: invoice.subtotal,
    discount: invoice.discount || 0,
    vat_amount: invoice.vat_amount,
    grand_total: invoice.grand_total,
    vat_enabled: invoice.vat_enabled,
    vat_mode: invoice.vat_mode
})
const receiptId = recordId(receipt)
await copyItems(invoiceId, receiptId)
const receiptConfirm = await confirmDocument(receiptId)
assert(receiptConfirm.document?.status === 'confirmed', `RC expected confirmed, got ${receiptConfirm.document?.status}`)
assert(receiptConfirm.ledger?.skipped === true, `RC should not post stock ledger, got ${JSON.stringify(receiptConfirm.ledger)}`)

const paidPatch = await patchResult('documents', receiptId, { status: 'paid' }, 'admin')
assert(paidPatch.res.ok, `admin should mark receipt paid, got ${paidPatch.res.status} ${JSON.stringify(paidPatch.body)}`)

const paidConfirm = await confirmDocumentResult(receiptId, 'admin')
assert(paidConfirm.res.status === 403, `paid RC should not confirm again, got ${paidConfirm.res.status} ${JSON.stringify(paidConfirm.body)}`)

const paidVoid = await voidDocumentResult(receiptId, 'admin')
assert(paidVoid.res.status === 403, `paid RC should not void, got ${paidVoid.res.status} ${JSON.stringify(paidVoid.body)}`)

const paidPatchAsManager = await patchResult('documents', receiptId, { notes: 'paid lock' }, 'manager')
assert(paidPatchAsManager.res.status === 403, `manager should not edit paid RC, got ${paidPatchAsManager.res.status} ${JSON.stringify(paidPatchAsManager.body)}`)

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    branch_id: BRANCH_ID,
    quotation_id: qtId,
    invoice_id: invoiceId,
    receipt_id: receiptId,
    quotation_status: qtConfirm.document.status,
    invoice_status: invoiceConfirm.document.status,
    receipt_status: receiptConfirm.document.status,
    paid_confirm_status: paidConfirm.res.status,
    paid_void_status: paidVoid.res.status,
    confirmed_item_edit_status: qtItemEditAsSa.res.status,
    confirmed_delete_status: qtDeleteAsAdmin.res.status
}, null, 2))
