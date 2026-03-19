import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function testQuery() {
    try {
        await pb.admins.authWithPassword('ADMIN_EMAIL', 'ADMIN_PASSWORD');

        const date = '2026-02-25';
        const startOfDay = date + ' 00:00:00';
        const endOfDay = date + ' 23:59:59';

        const filterStr = `date >= '${startOfDay}' && date <= '${endOfDay}' && branch = 'suphan' && entry_type = 'expense'`;
        console.log("Filter:", filterStr);

        const records = await pb.collection('financial_ledger').getList(1, 50, {
            filter: filterStr
        });

        console.log("Found records:", records.items.length);
        if (records.items.length > 0) {
            console.log("IDs:", records.items.map(r => r.id).join(', '));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testQuery();
