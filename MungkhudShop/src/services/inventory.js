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
 */
export async function postToStockLedger(docType, docNo, items) {
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
        case 'TF': // Transfer -> Both OUT (source) and IN (dest) - Simplification: just log ADJ for now
            txnType = 'ADJ'
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

    // 3. Insert new ledger records
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

        const payload = {
            transaction_no: `LEDGER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            transaction_type: txnType,
            product_id: item.product_id,
            warehouse_location: 'Main',
            qty: ledgerQty,
            unit_cost: item.unit_price || 0,
            total_value: ledgerQty * (item.unit_price || 0),
            reference_doc: docNo
        }

        try {
            await createRecord('stock_ledgers', payload)
        } catch (e) {
            console.error(`Failed to post stock ledger for ${docNo}`, e)
        }
    }

    // 4. For Goods Receipt (RR) — Update weighted average cost on products
    if (docType === 'RR') {
        await updateWeightedAvgCost(items)
    }

    // FIX #10: For Stock Returns (RE) — Reverse weighted average cost
    if (docType === 'RE') {
        await reverseWeightedAvgCost(items)
    }
}

/**
 * Update product cost using Weighted Average Cost formula.
 * Formula: new_avg_cost = (current_qty * current_cost + received_qty * received_cost) / total_qty
 * 
 * This runs after a goods receipt (RR) is posted so ราคาทุน stays accurate.
 * @param {Array} items - Array of { product_id, qty, unit_price }
 */
async function updateWeightedAvgCost(items) {
    if (items.length === 0) return
    // Prefetch all product data and ledgers in batch to avoid N+1
    const productIds = [...new Set(items.filter(i => i.product_id && i.qty && i.unit_price).map(i => i.product_id))]
    if (productIds.length === 0) return

    const [allProducts, allLedgers] = await Promise.all([
        fetchFullList('products', { requestKey: null }),
        fetchFullList('stock_ledgers', { requestKey: null })
    ])
    const productMap = {}
    allProducts.forEach(p => { productMap[p.id] = p })
    // Pre-aggregate ledger quantities per product
    const ledgerQtyMap = {}
    allLedgers.forEach(l => {
        ledgerQtyMap[l.product_id] = (ledgerQtyMap[l.product_id] || 0) + (l.qty || 0)
    })

    for (const item of items) {
        if (!item.product_id || !item.qty || !item.unit_price) continue
        try {
            const product = productMap[item.product_id]
            if (!product) continue
            const currentCost = parseFloat(product.cost) || 0
            const currentQty = ledgerQtyMap[item.product_id] || 0
            const qtyBefore = currentQty - Math.abs(item.qty)

            const receivedQty = Math.abs(item.qty)
            const receivedCost = item.unit_price

            let newAvgCost
            if (qtyBefore <= 0) {
                newAvgCost = receivedCost
            } else {
                newAvgCost = ((qtyBefore * currentCost) + (receivedQty * receivedCost)) / (qtyBefore + receivedQty)
            }
            newAvgCost = Math.round(newAvgCost * 100) / 100

            await updateRecord('products', item.product_id, { cost: newAvgCost })
        } catch (e) {
            console.warn(`[AvgCost] Failed to update avg cost for product ${item.product_id}:`, e.message)
        }
    }
}

/**
 * Reverse weighted average cost for stock returns (RE).
 * When goods are returned to vendor, remove them from the average.
 * If qty goes to 0, keep the last known cost.
 * @param {Array} items - Array of { product_id, qty, unit_price }
 */
async function reverseWeightedAvgCost(items) {
    if (items.length === 0) return
    // Prefetch all data in batch
    const [allProducts, allLedgers] = await Promise.all([
        fetchFullList('products', { requestKey: null }),
        fetchFullList('stock_ledgers', { requestKey: null })
    ])
    const productMap = {}
    allProducts.forEach(p => { productMap[p.id] = p })

    for (const item of items) {
        if (!item.product_id || !item.qty) continue
        try {
            const product = productMap[item.product_id]
            if (!product) continue
            const currentCost = parseFloat(product.cost) || 0

            const itemLedgers = allLedgers.filter(l => l.product_id === item.product_id)
            const currentQty = itemLedgers.reduce((sum, l) => sum + (l.qty || 0), 0)

            if (currentQty <= 0) continue

            const totalValue = itemLedgers.reduce((sum, l) => sum + (l.total_value || 0), 0)
            let newAvgCost = Math.round((totalValue / currentQty) * 100) / 100

            if (Math.abs(newAvgCost - currentCost) > COST_DIFF_THRESHOLD) {
                await updateRecord('products', item.product_id, { cost: newAvgCost })
            }
        } catch (e) {
            console.warn(`[AvgCost] Failed to reverse avg cost for product ${item.product_id}:`, e.message)
        }
    }
}

