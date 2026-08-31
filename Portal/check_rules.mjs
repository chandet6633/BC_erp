import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkRules() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        const collection = await pb.collections.getOne('financial_ledger');
        console.log("List Rule:", collection.listRule);
        console.log("View Rule:", collection.viewRule);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkRules();
