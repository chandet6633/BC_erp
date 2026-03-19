
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function debugRequests() {
    try {
        console.log('1. Testing transactions fetch (empty filter, sort -open_date)...');
        try {
            await pb.collection('transactions').getList(1, 50, {
                filter: "",
                sort: "-open_date"
            });
            console.log('✅ transactions: Success');
        } catch (e) {
            console.error('❌ transactions error:', JSON.stringify(e));
        }

        console.log('2. Testing product_groups fetch (empty filter, sort code)...');
        try {
            await pb.collection('product_groups').getList(1, 50, {
                filter: "",
                sort: "code"
            });
            console.log('✅ product_groups: Success');
        } catch (e) {
            console.error('❌ product_groups error:', JSON.stringify(e));
        }

        console.log('3. Testing with null filter...');
        try {
            await pb.collection('transactions').getList(1, 50, {
                sort: "-open_date"
            });
            console.log('✅ transactions (no filter): Success');
        } catch (e) {
            console.error('❌ transactions (no filter) error:', JSON.stringify(e));
        }

    } catch (e) {
        console.error('Fatal:', e);
    }
}

debugRequests();
