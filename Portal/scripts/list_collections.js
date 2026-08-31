import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function list() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');
        const collections = await pb.collections.getFullList();
        console.log('Collections:', collections.map(c => c.name));
    } catch (e) {
        console.error(e);
    }
}
list();
