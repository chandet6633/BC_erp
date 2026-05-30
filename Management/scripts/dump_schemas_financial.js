import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function migrate() {
    try {
        // Authenticate as the working admin account
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');

        console.log('Fetching collections...');
        const expMeta = await pb.collections.getOne('expenses').catch(() => null);
        const oexpMeta = await pb.collections.getOne('owner_expenses').catch(() => null);
        const revMeta = await pb.collections.getOne('revenue_verification').catch(() => null);

        if (expMeta) console.log('expenses schema:', JSON.stringify(expMeta.schema, null, 2));
        if (oexpMeta) console.log('owner_expenses schema:', JSON.stringify(oexpMeta.schema, null, 2));
        if (revMeta) console.log('revenue_verification schema:', JSON.stringify(revMeta.schema, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}
migrate();
