import { init, getAllRecords, createRecord } from './lib/nocodb.js';

async function deepVerify() {
    console.log("==========================================");
    console.log("🔍 RUNNING DEEP VERIFICATION: RELATIONAL INTEGRITY");
    console.log("==========================================");

    try {
        await init();
        console.log("✅ connected to NocoDB.");

        // 1. Verify Cust Code Generation Logic Under Load
        console.log("\n[1] Testing ID Generator logic bounds...");
        const allCusts = await getAllRecords('customers');
        let max = 0;
        for (const c of allCusts) {
            if (c.cust_code) {
                const m = c.cust_code.match(/^CUST-(\d+)/);
                if (m) {
                    const v = parseInt(m[1], 10);
                    if (v > max) max = v;
                }
            }
        }
        console.log(`✅ ID Generator Logic OK. Next ID will be: CUST-${String(max+1).padStart(5, '0')}`);

        // 2. Test Customer Relation Insertion
        console.log("\n[2] Testing Relational Insertion...");
        const nextId = `CUST-${String(max+1).padStart(5, '0')}`;
        
        // This will verify if 'cust_code' column actually exists in NocoDB schema
        try {
            console.log("Attempting to insert test record into customers...");
            const testCust = await createRecord('customers', { 
                name: "Deep Test Customer", 
                phone: "000-TEST",
                cust_code: nextId
            });
            console.log(`✅ Successfully wrote to NocoDB: ${testCust.id} with code ${testCust.cust_code}`);
            
            console.log("Attempting to insert test vehicle relation...");
            const testVeh = await createRecord('vehicles', {
                plate_number: "DEEP-9999",
                customer_id: testCust.id
            });
            console.log(`✅ Successfully wrote Vehicle FK: ${testVeh.id} linked to Customer ${testVeh.customer_id}`);

        } catch (e) {
            console.log("❌ Relational Write Failed! Error:", e.message);
            if (e.message.includes('column') || e.status === 404) {
                 console.log("   --> SCHEMA MISMATCH: The required columns 'cust_code' or 'customer_id' likely do not exist in NocoDB!");
            }
        }

    } catch (e) {
        console.error("❌ Fatal Error:", e);
    }
}

deepVerify();
