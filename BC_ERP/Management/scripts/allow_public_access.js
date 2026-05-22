
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function enablePublicAccess() {
    try {
        // Authenticate as superuser to change rules
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');
        console.log('Authenticated as admin.');

        const collections = [
            'transactions',
            'service_items',
            'product_groups',
            'expenses',
            'owner_expenses',
            'revenue_verification',
            'receipts'
        ];

        for (const name of collections) {
            try {
                const collection = await pb.collections.getOne(name);

                // Allow public access for all operations (list, view, create, update, delete)
                // In PB, specific rules: "" = public, null = admin only.
                collection.listRule = "";
                collection.viewRule = "";
                collection.createRule = "";
                collection.updateRule = "";
                collection.deleteRule = "";

                await pb.collections.update(collection.id, collection);
                console.log(`✅ allowed public access for: ${name}`);
            } catch (e) {
                console.error(`❌ Failed to update ${name}:`, e.message);
            }
        }

    } catch (e) {
        console.error('Fatal error:', e);
    }
}

enablePublicAccess();
