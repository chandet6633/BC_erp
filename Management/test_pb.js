import PocketBase from 'pocketbase';
const pb = new PocketBase('http://localhost:8092');

async function check() {
    try {
        const users = await pb.collection('users').getFullList({ expand: '' });
        console.log(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin, pin_code: u.pin_code })), null, 2));
    } catch (e) {
        console.error('Error fetching users:', e.message);
    }
}
check();
