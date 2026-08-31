const API_URL = (process.env.API_URL || 'http://localhost:9093').replace(/\/$/, '')

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

async function request(path, role = 'admin', options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...devHeaders(role),
            ...(options.headers || {})
        }
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

function assertArrayPayload(body, keys, label) {
    assert(body && typeof body === 'object' && !Array.isArray(body), `${label} response must be an object`)
    for (const key of keys) {
        assert(Array.isArray(body[key]), `${label}.${key} must be an array`)
    }
}

function assertActionable(items, key, requiredFields) {
    for (const item of items.slice(0, 10)) {
        for (const field of requiredFields) {
            assert(
                Object.prototype.hasOwnProperty.call(item, field),
                `${key} finding should include "${field}": ${JSON.stringify(item)}`
            )
        }
    }
}

const stockAsSa = await request('/api/data/custom/integrity/stock-check', 'sa')
assert(stockAsSa.res.status === 403, `stock integrity should be admin-only, got ${stockAsSa.res.status} ${JSON.stringify(stockAsSa.body)}`)

const docAsSa = await request('/api/data/custom/integrity/document-check', 'sa')
assert(docAsSa.res.status === 403, `document integrity should be admin-only, got ${docAsSa.res.status} ${JSON.stringify(docAsSa.body)}`)

const repairAsSa = await request('/api/data/custom/admin/integrity/repair', 'sa', {
    method: 'POST',
    body: JSON.stringify({ mode: 'safe_auto', dry_run: true })
})
assert(repairAsSa.res.status === 403, `integrity repair should be admin-only, got ${repairAsSa.res.status} ${JSON.stringify(repairAsSa.body)}`)

const stock = await request('/api/data/custom/integrity/stock-check', 'admin')
assert(stock.res.ok, `stock integrity failed: ${stock.res.status} ${JSON.stringify(stock.body)}`)
assertArrayPayload(stock.body, [
    'negativeStock',
    'orphanLedgers',
    'confirmedNoLedger',
    'invalidProductLedgers',
    'suspiciousCosts',
    'duplicateProductCodes'
], 'stock integrity')

assertActionable(stock.body.negativeStock, 'negativeStock', ['product_id', 'qty'])
assertActionable(stock.body.orphanLedgers, 'orphanLedgers', ['id', 'reference_doc', 'product_id'])
assertActionable(stock.body.confirmedNoLedger, 'confirmedNoLedger', ['id', 'doc_no', 'doc_type'])
assertActionable(stock.body.invalidProductLedgers, 'invalidProductLedgers', ['id', 'product_id', 'reference_doc'])
assertActionable(stock.body.suspiciousCosts, 'suspiciousCosts', ['id', 'product_id', 'qty', 'value_delta'])
assertActionable(stock.body.duplicateProductCodes, 'duplicateProductCodes', ['code', 'count', 'products'])

const documents = await request('/api/data/custom/integrity/document-check', 'admin')
assert(documents.res.ok, `document integrity failed: ${documents.res.status} ${JSON.stringify(documents.body)}`)
assertArrayPayload(documents.body, [
    'duplicateDocNos',
    'orphanItems',
    'invalidProductItems',
    'confirmedNoLedger',
    'invalidBranchDocs',
    'invalidStatusDocs',
    'duplicateProductCodes'
], 'document integrity')

assertActionable(documents.body.duplicateDocNos, 'duplicateDocNos', ['doc_no', 'count', 'documents'])
assertActionable(documents.body.orphanItems, 'orphanItems', ['id', 'document_id'])
assertActionable(documents.body.invalidProductItems, 'invalidProductItems', ['id', 'document_id', 'product_id'])
assertActionable(documents.body.confirmedNoLedger, 'confirmedNoLedger', ['id', 'doc_no', 'doc_type'])
assertActionable(documents.body.invalidBranchDocs, 'invalidBranchDocs', ['id', 'doc_no', 'doc_type', 'status'])
assertActionable(documents.body.invalidStatusDocs, 'invalidStatusDocs', ['id', 'doc_no', 'status'])
assertActionable(documents.body.duplicateProductCodes, 'duplicateProductCodes', ['code', 'count', 'products'])

const repairDryRun = await request('/api/data/custom/admin/integrity/repair', 'admin', {
    method: 'POST',
    body: JSON.stringify({ mode: 'safe_auto', dry_run: true })
})
assert(repairDryRun.res.ok, `integrity repair dry-run failed: ${repairDryRun.res.status} ${JSON.stringify(repairDryRun.body)}`)
assert(repairDryRun.body && repairDryRun.body.dry_run === true, 'integrity repair dry-run should echo dry_run=true')
assert(Array.isArray(repairDryRun.body.deleted_orphan_items), 'integrity repair should return deleted_orphan_items array')
assert(Array.isArray(repairDryRun.body.rebuilt_ledgers), 'integrity repair should return rebuilt_ledgers array')
assert(Array.isArray(repairDryRun.body.skipped_documents), 'integrity repair should return skipped_documents array')
assert(Array.isArray(repairDryRun.body.errors), 'integrity repair should return errors array')

console.log(JSON.stringify({
    ok: true,
    api_url: API_URL,
    stock_findings: Object.fromEntries(Object.entries(stock.body).map(([key, value]) => [key, value.length])),
    document_findings: Object.fromEntries(Object.entries(documents.body).map(([key, value]) => [key, value.length]))
}, null, 2))
