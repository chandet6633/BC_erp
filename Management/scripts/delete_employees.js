import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function deleteEmployees() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        await pb.collections.delete('employees');
        console.log('✅ Deleted legacy employees collection.');
    } catch (e) {
        console.error('Fatal error:', e.message);
    }
}
deleteEmployees();
