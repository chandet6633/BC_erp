import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function cleanOldCollections() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        console.log('Logged in as admin');

        try {
            await pb.collections.delete('expenses');
            console.log('✅ Deleted expenses collection');
        } catch (e) { console.log('⚠️ Could not delete expenses:', e.message); }

        try {
            await pb.collections.delete('owner_expenses');
            console.log('✅ Deleted owner_expenses collection');
        } catch (e) { console.log('⚠️ Could not delete owner_expenses:', e.message); }

        try {
            await pb.collections.delete('revenue_verification');
            console.log('✅ Deleted revenue_verification collection');
        } catch (e) { console.log('⚠️ Could not delete revenue_verification:', e.message); }

        console.log('Cleanup complete.');
    } catch (error) {
        console.error('Fatal error:', error.message);
    }
}

cleanOldCollections();
