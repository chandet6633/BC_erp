import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:9093'; // bctest-api
const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// Generate auth tokens for roles/branches
const adminToken = createToken({ id: 'admin1', username: 'admin', name: 'Admin', role: 'admin', branch: 'all' });
const managerToken = createToken({ id: 'mgr1', username: 'manager', name: 'Manager', role: 'manager', branch: 'main' });
const saMainToken = createToken({ id: 'sa1', username: 'sa_main', name: 'SA Main', role: 'sa', branch: 'main' });
const saSuphanToken = createToken({ id: 'sa2', username: 'sa_suphan', name: 'SA Suphan', role: 'sa', branch: 'suphanburi' });

async function runTests() {
    console.log('--- STARTING PHASE 5 INTEGRATION TESTS ---');
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        // Fetch baseline products to get their real IDs
        const productsRes = await fetch(`${BASE_URL}/api/data/products`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const productsData = await productsRes.json();
        const items = productsData.items || [];
        const p001 = items.find(p => p.code === 'P001');
        const p002 = items.find(p => p.code === 'P002');
        const svc01 = items.find(p => p.code === 'SVC01');

        if (!p001 || !p002 || !svc01) {
            throw new Error('Baseline products (P001, P002, SVC01) must be seeded first.');
        }

        // =====================================================================
        // Test A — Service product does NOT create stock ledger on RR confirm
        // =====================================================================
        console.log('\n[TEST A] Service product does NOT create stock ledger on RR confirm');
        // 1. Create document RR
        const docARes = await fetch(`${BASE_URL}/api/data/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ doc_type: 'RR', branch_id: 'main', status: 'draft', doc_date: new Date().toISOString() })
        });
        const docA = await docARes.json();
        assert(docA.id !== undefined, `Created RR document (ID: ${docA.id})`);

        // 2. Add document_item with service product (SVC01)
        const itemARes = await fetch(`${BASE_URL}/api/data/document_items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ document_id: docA.id, product_id: svc01.id, qty: 5, price: 200, cost: 0, branch_id: 'main' })
        });
        const itemA = await itemARes.json();
        assert(itemA.id !== undefined, 'Added service item (SVC01) to RR');

        // 3. Confirm document
        const confirmARes = await fetch(`${BASE_URL}/api/data/custom/confirm-document/${docA.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        const confirmA = await confirmARes.json();
        assert(confirmARes.status === 200, 'Confirmed RR document with service item');

        // 4. Check stock ledgers for this doc
        const ledgerARes = await fetch(`${BASE_URL}/api/data/stock_ledgers?where=(reference_doc,eq,${docA.doc_no})`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const ledgerA = await ledgerARes.json();
        const ledgerItems = ledgerA.items || [];
        assert(ledgerItems.length === 0, 'No stock ledger entry created for service product');


        // =====================================================================
        // Test B — Double-confirm is idempotent (no double posting)
        // =====================================================================
        console.log('\n[TEST B] Double-confirm is idempotent (no double posting)');
        // 1. Create RR
        const docBRes = await fetch(`${BASE_URL}/api/data/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ doc_type: 'RR', branch_id: 'main', status: 'draft', doc_date: new Date().toISOString() })
        });
        const docB = await docBRes.json();

        // 2. Add product item P001 qty=10
        await fetch(`${BASE_URL}/api/data/document_items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ document_id: docB.id, product_id: p001.id, qty: 10, price: 350, cost: 200, branch_id: 'main' })
        });

        // 3. First confirm
        const confB1Res = await fetch(`${BASE_URL}/api/data/custom/confirm-document/${docB.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        const confB1 = await confB1Res.json();
        assert(confB1.ledger !== undefined, 'First confirmation posted ledgers successfully');

        // 4. Second confirm
        const confB2Res = await fetch(`${BASE_URL}/api/data/custom/confirm-document/${docB.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        const confB2 = await confB2Res.json();
        assert(confB2.alreadyConfirmed === true, 'Second confirmation returned alreadyConfirmed: true');

        // 5. Verify only 1 ledger row exists
        const ledgerBRes = await fetch(`${BASE_URL}/api/data/stock_ledgers?where=(reference_doc,eq,${docB.doc_no})`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const ledgerB = await ledgerBRes.json();
        assert((ledgerB.items || []).length === 1, 'Only one stock ledger record exists for the document');


        // =====================================================================
        // Test C — Void reverses stock balance exactly
        // =====================================================================
        console.log('\n[TEST C] Void reverses stock balance exactly');
        // 1. Get initial balance of P002
        const bal1Res = await fetch(`${BASE_URL}/api/data/custom/stock-balances?branch_id=main`, {
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        const bal1 = await bal1Res.json();
        const initialQty = bal1[p002.id]?.qty || 0;
        console.log(`- Initial stock of P002: ${initialQty}`);

        // 2. Create and confirm RR with P002 qty=5
        const docCRes = await fetch(`${BASE_URL}/api/data/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ doc_type: 'RR', branch_id: 'main', status: 'draft', doc_date: new Date().toISOString() })
        });
        const docC = await docCRes.json();
        await fetch(`${BASE_URL}/api/data/document_items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ document_id: docC.id, product_id: p002.id, qty: 5, price: 120, cost: 60, branch_id: 'main' })
        });
        await fetch(`${BASE_URL}/api/data/custom/confirm-document/${docC.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });

        // Verify stock increased
        const bal2Res = await fetch(`${BASE_URL}/api/data/custom/stock-balances?branch_id=main`, {
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        const bal2 = await bal2Res.json();
        const confirmedQty = bal2[p002.id]?.qty || 0;
        assert(confirmedQty === initialQty + 5, `Stock increased to ${confirmedQty} (+5) after confirm`);

        // 3. Void the document
        const voidRes = await fetch(`${BASE_URL}/api/data/custom/void-document/${docC.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        assert(voidRes.status === 200, 'Void document endpoint completed with 200 OK');

        // Verify stock reverted
        const bal3Res = await fetch(`${BASE_URL}/api/data/custom/stock-balances?branch_id=main`, {
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        const bal3 = await bal3Res.json();
        const voidedQty = bal3[p002.id]?.qty || 0;
        assert(voidedQty === initialQty, `Stock reverted back to ${voidedQty} after void`);


        // =====================================================================
        // Test D — SA cannot access another branch's stock document
        // =====================================================================
        console.log('\n[TEST D] SA cannot access another branch\'s stock document');
        // 1. Create document for branch 'suphanburi'
        const docDRes = await fetch(`${BASE_URL}/api/data/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ doc_type: 'RR', branch_id: 'suphanburi', status: 'draft', doc_date: new Date().toISOString() })
        });
        const docD = await docDRes.json();

        // 2. Fetch docD using SA Main (branch: main) token -> expect 403
        const saGetRes = await fetch(`${BASE_URL}/api/data/documents/${docD.id}`, {
            headers: { 'Authorization': `Bearer ${saMainToken}` }
        });
        assert(saGetRes.status === 403, `SA from branch 'main' GET documents/:id of branch 'suphanburi' returns 403 Forbidden`);


        // =====================================================================
        // Test E — Invalid product_id in document_item handled cleanly
        // =====================================================================
        console.log('\n[TEST E] Invalid product_id in document_item handled cleanly');
        // 1. Create RR document
        const docERes = await fetch(`${BASE_URL}/api/data/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ doc_type: 'RR', branch_id: 'main', status: 'draft', doc_date: new Date().toISOString() })
        });
        const docE = await docERes.json();

        // 2. Add document_item with non-existent product_id
        const itemERes = await fetch(`${BASE_URL}/api/data/document_items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${managerToken}` },
            body: JSON.stringify({ document_id: docE.id, product_id: 'NONEXISTENT_XYZ_999', qty: 1, price: 100, cost: 50, branch_id: 'main' })
        });
        const itemE = await itemERes.json();

        // 3. Confirm document
        const confirmERes = await fetch(`${BASE_URL}/api/data/custom/confirm-document/${docE.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${managerToken}` }
        });
        assert(confirmERes.status === 200, 'Confirming document with non-existent product_id does not crash API (200 OK)');


        // =====================================================================
        // Test F — Duplicate product code is rejected
        // =====================================================================
        console.log('\n[TEST F] Duplicate product code is rejected');
        const uniqueCode = `CODE-${Date.now()}`;
        
        // 1. Create product 1
        const p1Res = await fetch(`${BASE_URL}/api/data/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ code: uniqueCode, name: 'Product Test F', type: 'part', price: 100, cost: 50, is_track_stock: true })
        });
        assert(p1Res.status === 201, 'Created first product with code ' + uniqueCode);

        // 2. Create product 2 with same code -> expect 400
        const p2Res = await fetch(`${BASE_URL}/api/data/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ code: uniqueCode, name: 'Product Test F Duplicate', type: 'part', price: 200, cost: 100, is_track_stock: true })
        });
        assert(p2Res.status === 400, 'Creating second product with same code returns 400 Bad Request');
        const p2Data = await p2Res.json();
        assert(p2Data.error && p2Data.error.includes('มีอยู่แล้วในระบบ'), 'Error message states duplicate code is already in system');

    } catch (e) {
        console.error('❌ Tests execution failed with error:', e.message);
        failed++;
    }

    console.log(`\n--- PHASE 5 TESTS RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
