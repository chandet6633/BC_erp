import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fix() {
    try {
        await pb.admins.authWithPassword('admin@bcauto.local', '1234567890');

        // Revenue Verification
        console.log('Checking revenue_verification...');
        let rv;
        try {
            rv = await pb.collections.getOne('revenue_verification');
            console.log('Found revenue_verification, ID:', rv.id);
        } catch (e) {
            console.log('revenue_verification not found, creating...');
        }

        const rvSchema = [
            { name: 'date', type: 'date', required: true },
            { name: 'description', type: 'text' },
            { name: 'amount', type: 'number' },
            { name: 'notes', type: 'text' },
            { name: 'receipt_url', type: 'url' }
        ];

        if (rv) {
            // Update
            rv.schema = rvSchema;
            await pb.collections.update(rv.id, rv);
            console.log('Updated revenue_verification schema.');
        } else {
            // Create
            try {
                await pb.collections.create({
                    name: 'revenue_verification',
                    type: 'base',
                    schema: rvSchema
                });
                console.log('Created revenue_verification.');
            } catch (e) {
                console.error('Create failed:', JSON.stringify(e));
            }
        }

        // Expenses
        console.log('Checking expenses...');
        const exp = await pb.collections.getOne('expenses');
        const hasUrl = exp.schema.find(f => f.name === 'receipt_url');
        if (!hasUrl) {
            exp.schema.push({ name: 'receipt_url', type: 'url' });
            await pb.collections.update(exp.id, exp);
            console.log('Added receipt_url to expenses.');
        } else {
            console.log('expenses already has receipt_url.');
        }

    } catch (e) {
        console.error('Fatal:', JSON.stringify(e));
    }
}
fix();
