
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function check() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');
        const tables = ['transactions', 'service_items', 'product_groups', 'expenses'];
        for (const t of tables) {
            const res = await pb.collection(t).getList(1, 1);
            console.log(`${t}: ${res.totalItems} records`);
        }
    } catch (e) { console.error(e); }
}
check();
