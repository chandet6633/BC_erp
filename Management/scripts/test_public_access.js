
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function testPublic() {
    try {
        // No auth here!
        console.log('Testing public access...');
        const result = await pb.collection('transactions').getList(1, 1);
        console.log('Success! Found transactions:', result.totalItems);
    } catch (e) {
        console.error('Failed:', e.message);
    }
}

testPublic();
