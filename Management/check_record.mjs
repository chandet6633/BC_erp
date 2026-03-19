import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8092');

async function checkRecord() {
    try {
        await pb.admins.authWithPassword('admin2@bcauto.local', '1234567890');
        const recordId = 'k74r3bmn102m5ic';
        const record = await pb.collection('financial_ledger').getOne(recordId);

        console.log("Branch:", record.branch);
        console.log("Is Confidential:", record.is_confidential);
        console.log("Entry Type:", record.entry_type);
        console.log("Date:", record.date);
        console.log("Amount:", record.amount);
        console.log("Notes:", record.notes);
        console.log("Verified:", record.verified);
        console.log("Excluded:", record.excluded);
        console.log("Created:", record.created);
        console.log("Updated:", record.updated);
    } catch (e) {
        console.error('Error fetching record:', e.message);
    }
}

checkRecord();
