
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function dumpSchema() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');
        const collection = await pb.collections.getOne('transactions');
        console.log('Schema:', JSON.stringify(collection.schema, null, 2));
    } catch (e) {
        console.error(e);
    }
}
dumpSchema();
