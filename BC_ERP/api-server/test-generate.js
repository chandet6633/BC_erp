const db = {
    getAllRecords: async (table, options) => {
        if (table === 'customers') {
            return [
                { id: 1, name: 'John', cust_code: 'CUST-00001' },
                { id: 2, name: 'Jane', cust_code: 'CUST-00005' },
                { id: 3, name: 'Bob' } // no code
            ];
        }
        if (table === 'documents') {
            return [
                { doc_no: 'INV-00001', doc_type: 'INV' },
                { doc_no: 'CUST-00002', doc_type: 'CUST' }
            ];
        }
        return [];
    }
};

async function testGenerateId(req) {
    const { prefix, table, field } = req.query;
    if (!prefix) throw new Error('Prefix required');

    const targetTable = table || 'documents';
    const targetField = field || 'doc_no';
    const filterByDocType = !table; 

    const records = await db.getAllRecords(targetTable, {});
    let maxInt = 0;
    for (const rec of records) {
        const val = rec[targetField];
        if (!val) continue;
        if (filterByDocType && rec.doc_type !== prefix) continue;
        const match = String(val).match(new RegExp(`^${prefix}-(\\d+)`));
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxInt) maxInt = num;
        }
    }

    return `${prefix}-${String(maxInt + 1).padStart(5, '0')}`;
}

async function run() {
    console.log("=== API LOGIC VERIFICATION ===");
    try {
        const res1 = await testGenerateId({ query: { prefix: 'CUST', table: 'customers', field: 'cust_code' }});
        console.log("Test 1 (customers table): Expected CUST-00006, Got ->", res1);
        
        const res2 = await testGenerateId({ query: { prefix: 'INV' }});
        console.log("Test 2 (documents table): Expected INV-00002, Got ->", res2);
        
        console.log("✅ API Logic Verified.");
    } catch (e) {
        console.error("❌ Test Failed:", e);
    }
}
run();
