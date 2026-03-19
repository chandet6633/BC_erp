import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Authenticaton info
const ADMIN_EMAIL = 'admin@bcauto.local';
const ADMIN_PASS = '1234567890';

async function initSchema() {
    try {
        console.log('Authenticating as Admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
        console.log('Authentication successful.');

        const collections = [
            {
                name: 'transactions',
                type: 'base',
                fields: [
                    { name: 'job_id', type: 'text', required: true, unique: true },
                    { name: 'open_date', type: 'date' },
                    { name: 'close_date', type: 'date' },
                    { name: 'customer_name', type: 'text' },
                    { name: 'total_revenue', type: 'number' },
                    { name: 'vat_amount', type: 'number' },
                    { name: 'net_revenue', type: 'number' },
                    { name: 'total_cost', type: 'number' },
                    { name: 'total_profit', type: 'number' },
                    { name: 'payment_due', type: 'text' },
                    { name: 'car_registration', type: 'text' },
                    { name: 'car_province', type: 'text' },
                    { name: 'red_plate', type: 'text' },
                    { name: 'red_plate_province', type: 'text' }
                ]
            },
            {
                name: 'service_items',
                type: 'base',
                fields: [
                    { name: 'job_id', type: 'text', required: true },
                    { name: 'open_date', type: 'date' },
                    { name: 'close_date', type: 'date' },
                    { name: 'customer_name', type: 'text' },
                    { name: 'item_code', type: 'text' },
                    { name: 'item_name', type: 'text' },
                    { name: 'quantity', type: 'number' },
                    { name: 'total_cost', type: 'number' },
                    { name: 'total_price', type: 'number' },
                    { name: 'total_profit', type: 'number' },
                    { name: 'avg_cost', type: 'number' },
                    { name: 'avg_price', type: 'number' },
                    { name: 'avg_profit', type: 'number' },
                    { name: 'car_registration', type: 'text' },
                    { name: 'red_plate', type: 'text' }
                ]
            },
            {
                name: 'product_groups',
                type: 'base',
                fields: [
                    { name: 'code', type: 'text', required: true },
                    { name: 'name', type: 'text', required: true },
                    { name: 'quantity', type: 'number' },
                    { name: 'total_sales', type: 'number' },
                    { name: 'total_cost', type: 'number' },
                    { name: 'total_profit', type: 'number' },
                    { name: 'avg_cost', type: 'number' },
                    { name: 'avg_price', type: 'number' },
                    { name: 'avg_profit', type: 'number' },
                    { name: 'report_month', type: 'text' },
                ]
            },
            {
                name: 'expenses',
                type: 'base',
                fields: [
                    { name: 'date', type: 'date', required: true },
                    { name: 'category', type: 'text' },
                    { name: 'amount', type: 'number' },
                    { name: 'notes', type: 'text' },
                    { name: 'excluded', type: 'bool' },
                    { name: 'receipt_url', type: 'url' }
                ]
            },
            {
                name: 'owner_expenses',
                type: 'base',
                fields: [
                    { name: 'date', type: 'date', required: true },
                    { name: 'category', type: 'text' },
                    { name: 'amount', type: 'number' },
                    { name: 'notes', type: 'text' }
                ]
            },
            {
                name: 'revenue_verification',
                type: 'base',
                fields: [
                    { name: 'date', type: 'date', required: true },
                    { name: 'description', type: 'text' },
                    { name: 'amount', type: 'number' },
                    { name: 'notes', type: 'text' },
                    { name: 'receipt_url', type: 'url' }
                ]
            },
            {
                name: 'receipts',
                type: 'base',
                fields: [
                    { name: 'file', type: 'file', options: { maxSelect: 1, maxSize: 5242880 } }
                ]
            }
        ];

        for (const col of collections) {
            try {
                // Try to delete if exists to ensure clean slate (optional, but good for reset)
                // But this script might be run on existing data?
                // For this Fix, we know data is corrupted (empty), so we SHOULD delete.
                // But let's handle deletion in a separate step or just fail if exists.
                // WE WANT TO UPDATE if exists, or CREATE if not.
                // But 'update' with new types is tricky.
                // Best to delete and recreate since we know data is bad.

                try {
                    const existing = await pb.collections.getOne(col.name);
                    console.log(`Deleting existing ${col.name}...`);
                    await pb.collections.delete(existing.id);
                } catch (e) { /* ignore 404 */ }

                console.log(`Creating collection: ${col.name}...`);
                await pb.collections.create(col);
                console.log(`✅ Created ${col.name}`);
            } catch (err) {
                console.error(`❌ Failed to create ${col.name}:`, err.message);
            }
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

initSchema();
