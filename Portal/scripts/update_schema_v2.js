import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');
const ADMIN_EMAIL = 'admin@bcauto.local';
const ADMIN_PASS = '1234567890';

async function updateSchema() {
    try {
        console.log('Authenticating...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        // 1. Create 'receipts' collection for file storage
        try {
            await pb.collections.create({
                name: 'receipts',
                type: 'base',
                schema: [
                    { name: 'file', type: 'file', options: { maxSelect: 1, maxSize: 5242880 } }
                ]
            });
            console.log('✅ Created receipts collection');
        } catch (e) {
            console.log('ℹ️ Receipts collection might already exist');
        }

        // 2. Create 'revenue_verification' collection
        try {
            await pb.collections.create({
                name: 'revenue_verification',
                type: 'base',
                schema: [
                    { name: 'date', type: 'date', required: true },
                    { name: 'description', type: 'text' },
                    { name: 'amount', type: 'number' },
                    { name: 'notes', type: 'text' },
                    { name: 'receipt_url', type: 'url' }
                ]
            });
            console.log('✅ Created revenue_verification collection');
        } catch (e) {
            console.log('ℹ️ Revenue verification collection might already exist');
        }

        // 3. Add 'receipt_url' to 'expenses'
        try {
            const collection = await pb.collections.getOne('expenses');
            // Check if field exists
            const hasField = collection.schema.find(f => f.name === 'receipt_url');
            if (!hasField) {
                collection.schema.push({ name: 'receipt_url', type: 'url' });
                await pb.collections.update('expenses', collection);
                console.log('✅ Added receipt_url to expenses');
            }
        } catch (e) {
            console.error('Error updating expenses schema', e);
        }

    } catch (err) {
        console.error('Fatal:', err);
    }
}

updateSchema();
