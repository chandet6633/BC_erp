import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function migrate() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        console.log('Logged in as admin');

        // 1. Create financial_ledger collection
        const schema = [
            { name: 'date', type: 'date', required: true },
            { name: 'amount', type: 'number', required: true },
            { name: 'category', type: 'text' },
            { name: 'notes', type: 'text' },
            { name: 'receipt_url', type: 'url' },
            { name: 'branch', type: 'text' },
            { name: 'payment_type', type: 'text' },
            { name: 'excluded', type: 'bool' },
            { name: 'verified', type: 'bool' },
            { name: 'verified_at', type: 'date' },
            { name: 'verified_by', type: 'text' },
            { name: 'entry_type', type: 'text', required: true },
            { name: 'is_confidential', type: 'bool' }
        ];

        let ledger;
        try {
            ledger = await pb.collections.getOne('financial_ledger');
            console.log('financial_ledger already exists');
        } catch (e) {
            console.log('Creating financial_ledger...');
            ledger = await pb.collections.create({
                name: 'financial_ledger',
                type: 'base',
                fields: schema,
                listRule: "is_confidential = false || @request.auth.role = 'admin' || @request.auth.role = 'owner'",
                viewRule: "is_confidential = false || @request.auth.role = 'admin' || @request.auth.role = 'owner'",
                createRule: "@request.auth.id != ''",
                updateRule: "is_confidential = false || @request.auth.role = 'admin' || @request.auth.role = 'owner'",
                deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'owner'"
            });
            console.log('financial_ledger created.');
        }

        // 2. Fetch data from old collections
        console.log('Fetching old records...');
        const expenses = await pb.collection('expenses').getFullList().catch(() => []);
        const ownerExpenses = await pb.collection('owner_expenses').getFullList().catch(() => []);
        const revs = await pb.collection('revenue_verification').getFullList().catch(() => []);
        console.log(`Found: ${expenses.length} expenses, ${ownerExpenses.length} owner, ${revs.length} revs`);

        // 3. Migrate expenses
        let mCount = 0;
        for (const e of expenses) {
            await pb.collection('financial_ledger').create({
                date: e.date,
                amount: e.amount || 0,
                category: e.category || '',
                notes: e.notes || '',
                receipt_url: e.receipt_url || '',
                branch: e.branch || 'main',
                payment_type: e.payment_type || '',
                excluded: e.excluded || false,
                verified: e.verified || false,
                verified_at: e.verified_at || null,
                verified_by: e.verified_by || '',
                entry_type: 'expense',
                is_confidential: false
            });
            mCount++;
        }
        console.log(`Migrated ${mCount} expenses`);

        // 4. Migrate owner_expenses
        let oCount = 0;
        for (const e of ownerExpenses) {
            await pb.collection('financial_ledger').create({
                date: e.date,
                amount: e.amount || 0,
                category: e.category || '',
                notes: e.notes || '',
                receipt_url: e.receipt_url || '',
                branch: e.branch || 'main',
                payment_type: e.payment_type || '',
                excluded: e.excluded || false,
                verified: e.verified || false,
                verified_at: e.verified_at || null,
                verified_by: e.verified_by || '',
                entry_type: 'owner_withdrawal',
                is_confidential: true
            });
            oCount++;
        }
        console.log(`Migrated ${oCount} owner expenses`);

        // 5. Migrate revenue_verification
        let rCount = 0;
        for (const e of revs) {
            await pb.collection('financial_ledger').create({
                date: e.date,
                amount: e.amount || 0,
                category: e.description || e.category || 'รายรับ',
                notes: e.notes || '',
                receipt_url: e.receipt_url || '',
                branch: e.branch || 'main',
                payment_type: e.payment_type || '',
                excluded: false,
                verified: e.verified || false,
                verified_at: e.verified_at || null,
                verified_by: e.verified_by || '',
                entry_type: 'revenue',
                is_confidential: false
            });
            rCount++;
        }
        console.log(`Migrated ${rCount} revenue entries`);

        console.log('Migration complete. You may now delete old collections if verified.');

    } catch (e) {
        if (e.data) {
            console.error('Error:', e.data);
        } else {
            console.error('Error:', e);
        }
    }
}
migrate();
