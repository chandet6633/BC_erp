import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function testPublic() {
    try {
        pb.authStore.clear(); // Ensure no auth
        const records = await pb.collection('financial_ledger').getList(1, 10);
        console.log("Public query success, found:", records.items.length);
    } catch (e) {
        console.error('Public query failed:', e.message);
    }
}

testPublic();
