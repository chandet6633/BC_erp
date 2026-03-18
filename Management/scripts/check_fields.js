
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function checkFields() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');
        const collection = await pb.collections.getOne('transactions');
        // Check both 'schema' and 'fields' just in case
        const schema = collection.schema || [];
        const fields = collection.fields || [];

        console.log('Schema:', schema.map(f => `${f.name} (${f.type})`));
        console.log('Fields:', fields.map(f => `${f.name} (${f.type})`));

        const openDate = fields.find(f => f.name === 'open_date') || schema.find(f => f.name === 'open_date');
        if (openDate) {
            console.log('✅ open_date exists:', openDate);
        } else {
            console.log('❌ open_date MISSING!');
        }
    } catch (e) {
        console.error(e);
    }
}
checkFields();
