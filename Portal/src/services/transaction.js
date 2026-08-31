// @ts-nocheck
import { pb } from './pocketbase.js';
import { excelDateToJS, parseNumber } from '../utils/helpers.js';

export const TransactionService = {
    async getTransactions(page = 1, limit = 100, options = {}) {
        return await pb.collection('transactions').getList(page, limit, options);
    },

    async getServiceItems(page = 1, limit = 100, options = {}) {
        return await pb.collection('service_items').getList(page, limit, options);
    },

    async getProductGroups(page = 1, limit = 100, options = {}) {
        return await pb.collection('product_groups').getList(page, limit, options);
    },

    async getFullTransactions(options = {}) {
        return await pb.collection('transactions').getFullList(options);
    },

    async getFullServiceItems(options = {}) {
        return await pb.collection('service_items').getFullList(options);
    },

    async getFullProductGroups(options = {}) {
        return await pb.collection('product_groups').getFullList(options);
    },

    async createTransaction(data) {
        const record = await pb.collection('transactions').create(data);
        return record;
    },

    async updateTransaction(id, data) {
        const record = await pb.collection('transactions').update(id, data);
        return record;
    },

    async deleteTransaction(id) {
        const record = await pb.collection('transactions').delete(id);
        return record;
    },

    async deleteServiceItem(id) {
        const record = await pb.collection('service_items').delete(id);
        return record;
    },

    async deleteProductGroup(id) {
        const record = await pb.collection('product_groups').delete(id);
        return record;
    },

    async createServiceItem(data) {
        const record = await pb.collection('service_items').create(data);
        return record;
    },

    async createProductGroup(data) {
        const record = await pb.collection('product_groups').create(data);
        return record;
    },

    async updateProductGroup(id, data) {
        const record = await pb.collection('product_groups').update(id, data);
        return record;
    },

    async clearTable(table, branchFilter = '') {
        const records = await pb.collection(table).getFullList({
            fields: 'id',
            filter: branchFilter
        });
        const ids = records.map(r => r.id);
        const chunk = 50;
        for (let i = 0; i < ids.length; i += chunk) {
            const batch = ids.slice(i, i + chunk);
            await Promise.all(batch.map(id => pb.collection(table).delete(id)));
        }
        window.AuditService?.log('clear_table', `Cleared ${ids.length} records from ${table}`, 'TransactionService');
        return ids.length;
    },

    async importTransactions(rows, branch, existingIds = new Set()) {
        let inserted = 0, skipped = 0;
        const toInsert = [];

        for (const row of rows) {
            const jobId = String(row[0] || '').trim();
            if (!jobId) continue;
            if (existingIds.has(jobId)) {
                skipped++;
                continue;
            }

            toInsert.push({
                job_id: jobId,
                open_date: excelDateToJS(row[1])?.toISOString() || null,
                close_date: excelDateToJS(row[2])?.toISOString() || null,
                customer_name: row[3] || null,
                total_revenue: parseNumber(row[4]),
                vat_amount: parseNumber(row[5]),
                net_revenue: parseNumber(row[6]),
                total_cost: parseNumber(row[7]),
                total_profit: parseNumber(row[8]),
                payment_due: row[9] || null,
                car_registration: row[10] || null,
                car_province: row[11] || null,
                red_plate: row[12] || null,
                red_plate_province: row[13] || null,
                branch: branch || ''
            });
        }

        if (toInsert.length > 0) {
            for (let i = 0; i < toInsert.length; i += 50) {
                const batch = toInsert.slice(i, i + 50);
                await Promise.all(batch.map(item => pb.collection('transactions').create(item)));
            }
            inserted = toInsert.length;
            window.AuditService?.log('import_transactions', `Imported ${inserted} transactions`, 'TransactionService');
        }
        return { inserted, skipped };
    },

    async importServiceItems(rows, branch) {
        let inserted = 0;
        const toInsert = [];

        for (const row of rows) {
            const jobId = String(row[0] || '').trim();
            const itemName = String(row[5] || '').trim();
            if (!jobId || !itemName) continue;

            toInsert.push({
                job_id: jobId,
                open_date: excelDateToJS(row[1])?.toISOString() || null,
                close_date: excelDateToJS(row[2])?.toISOString() || null,
                customer_name: row[3] || null,
                item_code: String(row[4] || '').trim(),
                item_name: itemName,
                quantity: parseNumber(row[6]),
                total_cost: parseNumber(row[7]),
                total_price: parseNumber(row[8]),
                total_profit: parseNumber(row[9]),
                avg_cost: parseNumber(row[10]),
                avg_price: parseNumber(row[11]),
                avg_profit: parseNumber(row[12]),
                car_registration: row[13] || null,
                red_plate: row[14] || null,
                branch: branch || ''
            });
        }

        if (toInsert.length > 0) {
            for (let i = 0; i < toInsert.length; i += 50) {
                const batch = toInsert.slice(i, i + 50);
                await Promise.all(batch.map(item => pb.collection('service_items').create(item)));
            }
            inserted = toInsert.length;
            window.AuditService?.log('import_service_items', `Imported ${inserted} service items`, 'TransactionService');
        }
        return { inserted, skipped: 0 };
    },

    async importProductGroups(rows, branch, reportMonth) {
        let inserted = 0;
        let updated = 0;
        const aggregated = new Map();

        // 1. Aggregate rows by code
        for (const row of rows) {
            const code = String(row[0] || '').trim();
            const name = String(row[1] || '').trim();
            if (!code || !name) continue;

            if (!aggregated.has(code)) {
                aggregated.set(code, {
                    code,
                    name,
                    quantity: 0,
                    total_cost: 0,
                    total_sales: 0,
                    total_profit: 0,
                    avg_cost: 0,
                    avg_price: 0,
                    avg_profit: 0,
                    report_month: reportMonth,
                    branch: branch || ''
                });
            }

            const item = aggregated.get(code);
            item.quantity += parseNumber(row[2]);
            item.total_cost += parseNumber(row[3]);
            item.total_sales += parseNumber(row[4]);
            item.total_profit += parseNumber(row[5]);
            // Re-calculate averages if needed, or just take the last ones/weighted
            // Usually, these files provide totals per group. If we have multiple lines, we sum them.
            item.avg_cost = parseNumber(row[6]) || item.avg_cost;
            item.avg_price = parseNumber(row[7]) || item.avg_price;
            item.avg_profit = parseNumber(row[8]) || item.avg_profit;
        }

        const toUpsert = Array.from(aggregated.values());

        if (toUpsert.length > 0) {
            const existingMap = new Map();
            if (reportMonth) {
                const bFilter = branch ? `branch='${branch}'` : 'id!=""';

                try {
                    const existing = await pb.collection('product_groups').getFullList({
                        filter: `report_month = '${reportMonth}' && ${bFilter}`
                    });
                    existing.forEach(e => existingMap.set(e.code, e.id));
                } catch (e) {
                    console.error('Error fetching existing product groups:', e);
                }
            }

            for (const item of toUpsert) {
                try {
                    const existingId = existingMap.get(item.code);
                    if (existingId) {
                        await pb.collection('product_groups').update(existingId, item);
                        updated++;
                    } else {
                        const record = await pb.collection('product_groups').create(item);
                        existingMap.set(item.code, record.id); // Add to map to prevent duplicate creates in same run (though we aggregated)
                        inserted++;
                    }
                } catch (err) {
                    console.error(`Failed to upsert product group ${item.code}:`, err);
                }
            }
            window.AuditService?.log('import_product_groups', `Imported ${inserted}, updated ${updated} product groups`, 'TransactionService');
        }
        return { inserted, updated, skipped: 0 };
    },

    async getDuplicates() {
        // --- Transactions: duplicate job_id within the same branch ---
        const allTx = await this.getFullTransactions({
            fields: 'id,job_id,branch,open_date,customer_name,total_revenue'
        });
        const txByUniqueKey = {};
        allTx.forEach(tx => {
            const branch = tx.branch || '';
            const key = `${branch}|${tx.job_id}`;
            if (!txByUniqueKey[key]) txByUniqueKey[key] = [];
            txByUniqueKey[key].push(tx);
        });
        const txDups = Object.entries(txByUniqueKey).filter(([_, arr]) => arr.length > 1);

        // --- Service Items: duplicate by composite key including branch ---
        const allSI = await this.getFullServiceItems({
            fields: 'id,job_id,branch,item_code,item_name,total_price'
        });
        const siByKey = {};
        allSI.forEach(si => {
            const branch = si.branch || '';
            const key = `${branch}|${si.job_id}|${si.item_code}|${Number(si.total_price || 0).toFixed(2)}`;
            if (!siByKey[key]) siByKey[key] = [];
            siByKey[key].push(si);
        });
        const siDups = Object.entries(siByKey).filter(([_, arr]) => arr.length > 1);

        return { txDups, siDups };
    },

    async archiveData(cutoff, collections) {
        const archived = {};
        let totalCount = 0;

        for (const col of collections) {
            let old = [];
            const filter = `${col.dateField} < '${cutoff} 00:00:00'`;

            if (col.name === 'transactions') old = await this.getFullTransactions({ filter });
            else if (col.name === 'service_items') old = await this.getFullServiceItems({ filter });
            else if (col.name === 'expenses') {
                const expFilter = filter ? `(${filter}) && entry_type = 'expense'` : `entry_type = 'expense'`;
                old = await pb.collection('financial_ledger').getFullList({ filter: expFilter });
            } else if (col.name === 'owner_expenses') {
                const ownerFilter = filter ? `(${filter}) && entry_type = 'owner_withdrawal'` : `entry_type = 'owner_withdrawal'`;
                old = await pb.collection('financial_ledger').getFullList({ filter: ownerFilter });
            } else {
                old = await pb.collection(col.name).getFullList({ filter });
            }

            if (old.length > 0) {
                archived[col.name] = old;
                totalCount += old.length;
            }
        }
        return { archived, totalCount };
    },

    async deleteBatch(collection, ids) {
        const chunk = 50;
        for (let i = 0; i < ids.length; i += chunk) {
            const batch = ids.slice(i, i + chunk);
            await Promise.all(batch.map(id => pb.collection(collection).delete(id)));
        }
        window.AuditService?.log('delete_batch', `Deleted ${ids.length} records from ${collection}`, 'TransactionService');
        return ids.length;
    }
};

window.TransactionService = TransactionService;
