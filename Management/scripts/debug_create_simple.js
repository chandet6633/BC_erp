import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function debug() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');

        console.log('Creating revenue_verification_simple...');
        const res = await pb.collections.create({
            name: 'revenue_verification',
            type: 'base',
            schema: [
                { name: 'description', type: 'text' }
            ]
        });
        console.log('Success:', res.name);
    } catch (e) {
        console.error('Error:', JSON.stringify(e.data || e, null, 2));
    }
}
debug();
