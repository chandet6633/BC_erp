import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function debug() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');

        try {
            console.log('Deleting revenue_verification...');
            await pb.collections.delete('revenue_verification');
            console.log('Deleted.');
        } catch (e) {
            // ignore
        }

        console.log('Creating revenue_verification...');
        const res = await pb.collections.create({
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
        console.log('Success:', res.name);

        console.log('Updating expenses schema...');
        try {
            const collection = await pb.collections.getOne('expenses');
            const hasField = collection.schema.find(f => f.name === 'receipt_url');
            if (!hasField) {
                collection.schema.push({ name: 'receipt_url', type: 'url' });
                await pb.collections.update('expenses', collection);
                console.log('✅ Added receipt_url to expenses');
            } else {
                console.log('ℹ️ expenses already has receipt_url');
            }
        } catch (e) {
            console.error('Error updating expenses:', e);
        }

    } catch (e) {
        console.error('Error:', JSON.stringify(e.data || e, null, 2));
    }
}
debug();
