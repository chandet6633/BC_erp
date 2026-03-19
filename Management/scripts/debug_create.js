import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function debug() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');

        try {
            console.log('Deleting receipts...');
            await pb.collections.delete('receipts');
            console.log('Deleted.');
        } catch (e) {
            console.log('Delete failed (expected if not exists):', e.status);
        }

        console.log('Creating receipts...');
        const res = await pb.collections.create({
            name: 'receipts',
            type: 'base',
            schema: [
                { name: 'file', type: 'file', options: { maxSelect: 1, maxSize: 5242880 } }
            ]
        });
        console.log('Success:', res.name);
    } catch (e) {
        console.error('Error creating receipts:', JSON.stringify(e.data || e, null, 2));
    }
}
debug();
