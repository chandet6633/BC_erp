// @ts-nocheck
import { pb } from './pocketbase.js';
import { AuthService } from './authService.js';

export const EntryService = {
    async createExpense(data) {
        const record = await pb.collection('financial_ledger').create({
            ...data,
            entry_type: 'expense',
            is_confidential: false,
            branch: AuthService.getBranch()
        });
        return record;
    },

    async getExpenses(page = 1, limit = 100, options = {}) {
        options.filter = options.filter ? `(${options.filter}) && entry_type = 'expense'` : `entry_type = 'expense'`;
        return await pb.collection('financial_ledger').getList(page, limit, options);
    },

    async updateExpense(id, data) {
        const record = await pb.collection('financial_ledger').update(id, data);
        return record;
    },

    async deleteExpense(id) {
        const record = await pb.collection('financial_ledger').delete(id);
        return record;
    },

    async createRevenue(data) {
        // Map description to category for financial_ledger
        const payload = { ...data };
        if (payload.description) {
            payload.category = payload.description;
            delete payload.description;
        }
        const record = await pb.collection('financial_ledger').create({
            ...payload,
            entry_type: 'revenue',
            is_confidential: false,
            branch: AuthService.getBranch()
        });
        return record;
    },

    async getRevenues(page = 1, limit = 100, options = {}) {
        options.filter = options.filter ? `(${options.filter}) && entry_type = 'revenue'` : `entry_type = 'revenue'`;
        const result = await pb.collection('financial_ledger').getList(page, limit, options);
        // Map category back to description for UI compatibility
        if (result.items) {
            result.items = result.items.map(item => ({
                ...item,
                description: item.description || item.category
            }));
        }
        return result;
    },

    // Alias for entry.js compatibility
    async getRevenue(page = 1, limit = 100, options = {}) {
        return await this.getRevenues(page, limit, options);
    },

    async updateRevenue(id, data) {
        const payload = { ...data };
        if (payload.description !== undefined) {
            payload.category = payload.description;
            delete payload.description;
        }
        const record = await pb.collection('financial_ledger').update(id, payload);
        return record;
    },

    async deleteRevenue(id) {
        const record = await pb.collection('financial_ledger').delete(id);
        return record;
    },

    async getOwnerExpenses(page = 1, limit = 100, options = {}) {
        options.filter = options.filter ? `(${options.filter}) && entry_type = 'owner_withdrawal'` : `entry_type = 'owner_withdrawal'`;
        return await pb.collection('financial_ledger').getList(page, limit, options);
    },

    async deleteOwnerExpense(id) {
        const record = await pb.collection('financial_ledger').delete(id);
        return record;
    },

    async clearTable(table, branchFilter = '') {
        let actualTable = table;
        let filterStr = branchFilter;
        if (table === 'expenses') {
            actualTable = 'financial_ledger';
            filterStr = filterStr ? `(${filterStr}) && entry_type = 'expense'` : `entry_type = 'expense'`;
        } else if (table === 'revenue_verification') {
            actualTable = 'financial_ledger';
            filterStr = filterStr ? `(${filterStr}) && entry_type = 'revenue'` : `entry_type = 'revenue'`;
        } else if (table === 'owner_expenses') {
            actualTable = 'financial_ledger';
            filterStr = filterStr ? `(${filterStr}) && entry_type = 'owner_withdrawal'` : `entry_type = 'owner_withdrawal'`;
        }

        const records = await pb.collection(actualTable).getFullList({
            fields: 'id',
            filter: filterStr
        });
        const ids = records.map(r => r.id);
        const chunk = 50;
        for (let i = 0; i < ids.length; i += chunk) {
            const batch = ids.slice(i, i + chunk);
            await Promise.all(batch.map(id => pb.collection(actualTable).delete(id)));
        }
        window.AuditService?.log('clear_table', `Cleared ${ids.length} records from ${actualTable} for ${table}`, 'EntryService');
        return ids.length;
    },

    async verifyBatch(collection, ids, verifiedBy = 'ผู้จัดการ') {
        const actualTable = ['expenses', 'revenue_verification', 'owner_expenses'].includes(collection) ? 'financial_ledger' : collection;
        const now = new Date().toISOString();
        const chunk = 50;
        for (let i = 0; i < ids.length; i += chunk) {
            const batch = ids.slice(i, i + chunk);
            await Promise.all(
                batch.map(id =>
                    pb.collection(actualTable).update(id, {
                        verified: true,
                        verified_at: now,
                        verified_by: verifiedBy
                    })
                )
            );
        }
        window.AuditService?.log('verify_batch', `Verified ${ids.length} records in ${actualTable}`, 'EntryService');
        return ids.length;
    },

    async unverifyBatch(collection, ids) {
        const actualTable = ['expenses', 'revenue_verification', 'owner_expenses'].includes(collection) ? 'financial_ledger' : collection;
        const chunk = 50;
        for (let i = 0; i < ids.length; i += chunk) {
            const batch = ids.slice(i, i + chunk);
            await Promise.all(
                batch.map(id =>
                    pb.collection(actualTable).update(id, {
                        verified: false,
                        verified_at: null,
                        verified_by: null
                    })
                )
            );
        }
        window.AuditService?.log('unverify_batch', `Unverified ${ids.length} records in ${actualTable}`, 'EntryService');
        return ids.length;
    },

    async getSystemDiscrepancy(date, branch, manualTotal) {
        const startOfDay = date + 'T00:00:00';
        const endOfDay = date + 'T23:59:59';

        const txData = await pb.collection('transactions').getFullList({
            filter: `open_date >= '${startOfDay}' && open_date <= '${endOfDay}' && branch = '${branch}'`,
            fields: 'job_id, total_revenue, customer_name'
        });

        const systemTotal = txData.reduce((s, t) => s + Number(t.total_revenue || 0), 0);
        const diff = Math.abs(systemTotal - manualTotal);

        return {
            systemTotal,
            manualTotal,
            diff,
            isMatch: diff < 1,
            txCount: txData.length
        };
    }
};

window.EntryService = EntryService; // temporarily expose globally for transition
