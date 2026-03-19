import PocketBase from 'pocketbase';

const port = process.argv[2] || '8092';
const pb = new PocketBase(`http://127.0.0.1:${port}`);

async function seed() {
    try {
        await pb.collection('_superusers').authWithPassword('admin@management.local', 'adminpassword123');
    } catch (e) {
        console.error('Auth failed:', e.message);
        return;
    }

    // Check if already exists
    try {
        const existing = await pb.collection('system_settings').getFirstListItem("key='mungkhudshop_url'");
        console.log('Setting already exists, updating...');
        await pb.collection('system_settings').update(existing.id, { value: 'https://shop.bcauto.work' });
        console.log('Updated mungkhudshop_url = https://shop.bcauto.work');
    } catch {
        // Not found, create
        try {
            await pb.collection('system_settings').create({
                key: 'mungkhudshop_url',
                value: 'https://shop.bcauto.work'
            });
            console.log('Created mungkhudshop_url = https://shop.bcauto.work');
        } catch (e) {
            console.error('Create failed:', e.message);
        }
    }
}

seed();
