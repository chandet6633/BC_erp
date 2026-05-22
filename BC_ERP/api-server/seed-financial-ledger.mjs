/**
 * Seed: Create financial_ledger table in NocoDB
 * Run inside bctest-api: node seed-financial-ledger.mjs
 */
const TOKEN = process.env.NOCODB_TOKEN;
const BASE = process.env.NOCODB_URL;
const BASE_TITLE = process.env.NOCODB_BASE_TITLE || 'BC_ERP';

async function run() {
    // Find base
    const ws = await (await fetch(`${BASE}/api/v2/meta/workspaces`, { headers: { 'xc-token': TOKEN } })).json();
    const wsId = ws.list[0].id;
    const bases = await (await fetch(`${BASE}/api/v2/meta/workspaces/${wsId}/bases`, { headers: { 'xc-token': TOKEN } })).json();
    const targetBase = bases.list.find(b => b.title === BASE_TITLE);
    if (!targetBase) {
        throw new Error(`Base "${BASE_TITLE}" not found`);
    }
    const baseId = targetBase.id;

    // Check if table already exists
    const tables = await (await fetch(`${BASE}/api/v2/meta/bases/${baseId}/tables`, { headers: { 'xc-token': TOKEN } })).json();
    if (tables.list.find(t => t.title === 'financial_ledger')) {
        console.log('⚠️  financial_ledger table already exists, skipping');
        return;
    }

    // Create table
    const res = await fetch(`${BASE}/api/v2/meta/bases/${baseId}/tables`, {
        method: 'POST',
        headers: { 'xc-token': TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'financial_ledger',
            columns: [
                { title: 'entry_type', uidt: 'SingleLineText', rqd: true },
                { title: 'date', uidt: 'Date', rqd: true },
                { title: 'category', uidt: 'SingleLineText', rqd: true },
                { title: 'amount', uidt: 'Number', rqd: true },
                { title: 'notes', uidt: 'SingleLineText' },
                { title: 'payment_type', uidt: 'SingleLineText' },
                { title: 'branch_id', uidt: 'SingleLineText' },
                { title: 'receipt_url', uidt: 'LongText' },
                { title: 'reference_doc', uidt: 'SingleLineText' },
                { title: 'excluded', uidt: 'Checkbox' },
                { title: 'verified', uidt: 'Checkbox' },
                { title: 'verified_by', uidt: 'SingleLineText' },
                { title: 'verified_at', uidt: 'DateTime' },
                { title: 'is_confidential', uidt: 'Checkbox' },
                { title: 'created_by', uidt: 'SingleLineText' }
            ]
        })
    });

    if (res.ok) {
        console.log('✅ financial_ledger table created');
    } else {
        console.log('❌ Failed:', res.status, await res.text());
    }
}

run().catch(e => console.error(e));
