import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function migrateSuphan() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        console.log("Logged in as admin");

        console.log("Migrating financial_ledger...");
        const ledgerRecords = await pb.collection('financial_ledger').getFullList({
            filter: "branch = 'suphan'"
        });

        console.log(`Found ${ledgerRecords.length} records in financial_ledger with branch='suphan'`);
        for (const record of ledgerRecords) {
            await pb.collection('financial_ledger').update(record.id, { branch: 'suphanburi' });
            console.log(`Updated ledger record ${record.id}`);
        }

        console.log("Migrating users...");
        const users = await pb.collection('users').getFullList({
            filter: "branch = 'suphan'"
        });

        console.log(`Found ${users.length} records in users with branch='suphan'`);
        for (const user of users) {
            await pb.collection('users').update(user.id, { branch: 'suphanburi' });
            console.log(`Updated user record ${user.id}`);
        }

        console.log("Migration complete!");
    } catch (e) {
        console.error("Migration failed:", e.message);
    }
}

migrateSuphan();
