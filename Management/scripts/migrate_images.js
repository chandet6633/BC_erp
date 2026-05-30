import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function migrateImages() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');

        let col;
        try {
            col = await pb.collections.getOne('receipts');
            console.log('Found receipts collection:', col.id);
        } catch (e) {
            console.log('receipts not found. Exiting.');
            return;
        }

        col.name = 'image_storage';
        col.fields.push({
            name: 'tool_reference',
            type: 'text',
            required: false,
            presentable: false,
            unique: false,
            options: {
                min: null,
                max: null,
                pattern: ''
            }
        });

        await pb.collections.update(col.id, col);
        console.log('✅ Successfully renamed to image_storage and added tool_reference');
    } catch (error) {
        console.error('Error:', error.message);
        if (error.data) console.error(JSON.stringify(error.data, null, 2));
    }
}
migrateImages();
