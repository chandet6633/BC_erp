/**
 * MungkhudShop — Inventory Service
 * Manages posting to stock_ledgers table when documents are saved.
 * Includes weighted average cost calculation on goods receipt (RR).
 */
import { createRecord, fetchFullList, deleteRecord, updateRecord, fetchOne } from './pb.js'
import { sanitizeFilter } from '../utils/sanitize.js'
import { BATCH_SIZE, COST_DIFF_THRESHOLD } from '../utils/constants.js'

/**
 * Posts document items to the stock_ledger.
 * Automatically determines IN/OUT transaction type based on docType.
 * For Goods Receipt (RR), also updates the product's weighted average cost.
 * 
 * @param {string} docType - e.g. 'RR', 'RQ', 'RE', 'SA', 'JOB'
 * @param {string} docNo - The document reference number
 * @param {Array} items - Array of { product_id, qty, unit_price }
 * @param {string} [branch_id] - Optional branch_id to scope the ledger
 */
export async function postToStockLedger(docType, docNo, items, branch_id = null, destinationBranch = null) {
    // 1. First, delete any existing ledger entries for this document (to handle edits)
    const existing = await fetchFullList('stock_ledgers', { filter: `reference_doc='${sanitizeFilter(docNo)}'`, requestKey: null })
    // Batch parallel deletes instead of sequential
    for (let i = 0; i < existing.length; i += BATCH_SIZE) {
        await Promise.all(existing.slice(i, i + BATCH_SIZE).map(e => deleteRecord('stock_ledgers', e.id)))
    }

    // 2. Determine transaction type based on docType
    let txnType = 'ADJ'
    let isPositive = true

    switch (docType) {
        case 'RR': // Goods Receipt -> IN
        case 'RE': // Stock Return -> IN
            txnType = 'IN'
            isPositive = true
            break
        case 'RQ': // Requisition -> OUT
        case 'JOB': // Job Closing -> OUT
            txnType = 'OUT'
            isPositive = false
            break
        case 'SA': // Stock Adjust -> Depends on qty polarity
            txnType = 'ADJ'
            break
        case 'TF': // Transfer → OUT from source branch, IN to destination branch
            txnType = 'TF'
            break
        // A3: Doc types that do NOT affect physical stock
        case 'PI':  // Purchase Invoice
        case 'PCN': // Purchase Credit Note
        case 'IV':  // Sales Invoice
        case 'QT':  // Quotation
        case 'RC':  // Receipt
        case 'CN':  // Credit Note
        case 'PAY': // Payment
        case 'WT':  // Withholding Tax
            return
        default:
            console.warn(`[Inventory] Unknown doc type: ${docType} — skipping stock ledger`)
            return;
    }

    const pIds = [...new Set(items.map(i => i.product_id).filter(Boolean))]
    const productMap = {}
    if (pIds.length > 0) {
        // BUG 17 FIX: Only fetch the specific products being posted, not the entire catalog
        let products = []
        for (let i = 0; i < pIds.length; i += BATCH_SIZE) {
            const chunk = pIds.slice(i, i + BATCH_SIZE)
            const filterStr = chunk.map(id => `id='${sanitizeFilter(id)}'`).join('||')
            const prodsChunk = await fetchFullList('products', { filter: `(${filterStr})`, requestKey: null })
            products = products.concat(prodsChunk)
        }
        products.forEach(p => productMap[p.id] = p)
    }

    // 3. Insert new ledger records
    const ledgerErrors = []
    for (const item of items) {
        if (!item.product_id || !item.qty) continue

        let ledgerQty = item.qty
        if (txnType === 'OUT') {
            ledgerQty = -Math.abs(item.qty)
        } else if (txnType === 'IN') {
            ledgerQty = Math.abs(item.qty)
        } // For ADJ, keep original polarity

        // Prevent 0 qty ledgers
        if (ledgerQty === 0) continue

        // BUG 18 FIX: Use actual cost for OUT transactions, preventing negative valuation
        let costToUse = item.unit_price || 0
        if (txnType === 'OUT') {
            const prod = productMap[item.product_id]
            costToUse = prod ? (parseFloat(prod.cost) || 0) : 0
        }

        const payload = {
            // BUG 1 FIX: Use crypto.randomUUID() to eliminate timestamp collision risk
            transaction_no: `LEDGER-${crypto.randomUUID()}`,
            transaction_type: txnType,
            product_id: item.product_id,
            warehouse_location: 'Main',
            qty: ledgerQty,
            unit_cost: costToUse,
            total_value: ledgerQty * costToUse,
            reference_doc: docNo,
            branch_id: branch_id
        }

        try {
            if (txnType === 'TF') {
                // Dual-branch posting: OUT from source, IN to destination
                const outPayload = {
                    transaction_no: `LEDGER-${crypto.randomUUID()}`,
                    transaction_type: 'OUT',
                    product_id: item.product_id,
                    warehouse_location: 'Main',
                    qty: -Math.abs(item.qty),
                    unit_cost: costToUse,
                    total_value: -Math.abs(item.qty) * costToUse,
                    reference_doc: docNo,
                    branch_id: branch_id
                }
                await createRecord('stock_ledgers', outPayload)

                if (destinationBranch) {
                    const inPayload = {
                        transaction_no: `LEDGER-${crypto.randomUUID()}`,
                        transaction_type: 'IN',
                        product_id: item.product_id,
                        warehouse_location: 'Main',
                        qty: Math.abs(item.qty),
                        unit_cost: costToUse,
                        total_value: Math.abs(item.qty) * costToUse,
                        reference_doc: docNo,
                        branch_id: destinationBranch
                    }
                    await createRecord('stock_ledgers', inPayload)
                }
            } else {
                await createRecord('stock_ledgers', payload)
            }
        } catch (e) {
            ledgerErrors.push(e)
            console.error(`Failed to post stock ledger for ${docNo}`, e)
        }
    }

    if (ledgerErrors.length > 0) {
        const posted = await fetchFullList('stock_ledgers', { filter: `reference_doc='${sanitizeFilter(docNo)}'`, requestKey: null }).catch(() => [])
        for (let i = 0; i < posted.length; i += BATCH_SIZE) {
            await Promise.all(posted.slice(i, i + BATCH_SIZE).map(e => deleteRecord('stock_ledgers', e.id).catch(() => {})))
        }
        throw new Error(`Stock ledger posting failed for ${docNo}: ${ledgerErrors[0].message}`)
    }

    // BUG 19 FIX: Unified and secure Moving Average Cost Recalculation
    if (docType === 'RR' || docType === 'RE') {
        await recalculateAvgCost(items)
    }
}

/**
 * BUG 19 FIX: Recalculate moving average cost securely by aggregating all historical ledgers.
 * This is immune to historical edits, unlike the previous rolling state formula.
 */
async function recalculateAvgCost(items) {
    if (items.length === 0) return
    const pIds = [...new Set(items.map(i => i.product_id).filter(Boolean))]
    if (pIds.length === 0) return

    const [allProducts, allLedgers] = await Promise.all([
        fetchFullList('products', { filter: `(${pIds.map(id => `id='${id}'`).join('||')})`, requestKey: null }),
        fetchFullList('stock_ledgers', { filter: `(${pIds.map(id => `product_id='${id}'`).join('||')})`, requestKey: null })
    ])
    
    const productMap = {}
    allProducts.forEach(p => { productMap[p.id] = p })

    for (const pid of pIds) {
        try {
            const product = productMap[pid]
            if (!product) continue
            const currentCost = parseFloat(product.cost) || 0

            const itemLedgers = allLedgers.filter(l => l.product_id === pid)
            
            // BUG 42 FIX: Sequential Moving Average Cost Calculation to prevent lifetime drift
            // BUG 3 FIX: Normalize CreatedAt sort field for cross-version NocoDB compatibility
            // NocoDB may return 'CreatedAt' or 'created_at' depending on version.
            const sortedLedgers = itemLedgers.sort((a, b) => {
                const tA = new Date(a.CreatedAt || a.created_at || 0).getTime()
                const tB = new Date(b.CreatedAt || b.created_at || 0).getTime()
                return tA - tB
            })
            
            let runningQty = 0
            let runningValue = 0
            
            for (const l of sortedLedgers) {
                const lQty = l.qty || 0
                const lVal = l.total_value || 0
                
                if (lQty > 0 && l.transaction_type === 'IN') {
                    runningQty += lQty
                    runningValue += lVal
                } else if (lQty < 0) {
                    const currentAvg = runningQty > 0 ? (runningValue / runningQty) : 0
                    runningQty += lQty
                    runningValue += (lQty * currentAvg) // lQty is negative, so this subtracts value
                } else if (lQty > 0 && l.transaction_type === 'ADJ') {
                    runningQty += lQty
                    runningValue += lVal
                }
                
                // Prevent negative stock valuation artifacts
                if (runningQty <= 0) {
                    runningQty = 0
                    runningValue = 0
                }
            }

            if (runningQty <= 0) continue // Prevent div by zero, keep last known cost
            let newAvgCost = Math.round((runningValue / runningQty) * 100) / 100

            // Only update if it actually changed
            if (Math.abs(newAvgCost - currentCost) > COST_DIFF_THRESHOLD) {
                await updateRecord('products', pid, { cost: newAvgCost })
            }
        } catch (e) {
            console.warn(`[AvgCost] Failed to recalculate avg cost for product ${pid}:`, e.message)
        }
    }
}

