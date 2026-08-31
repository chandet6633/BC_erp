import jwt from 'jsonwebtoken';

const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';
const API_URL = 'http://localhost:9093/api';

const token = jwt.sign(
    { id: '1', name: 'Admin User', role: 'admin', branch: 'bc-auto-service' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function verifyPhase3() {
    console.log('--- Phase 3 Verification Start ---');
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 1. Test Negative Discount Exploit
    console.log('\n[1] Testing Negative Discount Exploit...');
    const docRes = await fetch(`${API_URL}/data/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            doc_type: 'invoice',
            ref_no: 'TEST-INV-001',
            status: 'draft',
            subtotal: 1000,
            discount: -500 // Malicious negative discount
        })
    });
    
    if (docRes.ok) {
        const doc = await docRes.json();
        if (doc.discount === 0) {
            console.log(`✅ SUCCESS: Negative discount intercepted! Server saved discount as: ${doc.discount}`);
        } else {
            console.log(`❌ FAIL: Server saved negative discount: ${doc.discount}`);
        }
        await fetch(`${API_URL}/data/documents/${doc.id}`, { method: 'DELETE', headers });
    } else {
        console.error('❌ FAIL: Request failed', await docRes.text());
    }

    // 2. Test Phantom Inventory Protection (No Reason)
    console.log('\n[2] Testing Phantom Inventory Protection (Empty Reason)...');
    const adjustRes = await fetch(`${API_URL}/data/stock_adjusts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            product_id: 1,
            qty_change: 10,
            type: 'adjust',
            reason: '' // Missing reason
        })
    });
    
    if (adjustRes.status === 400) {
        const err = await adjustRes.json();
        if (err.error.includes('Reason is required')) {
            console.log(`✅ SUCCESS: Phantom inventory blocked! Server response: "${err.error}"`);
        } else {
            console.log(`❌ FAIL: Unexpected error message: ${JSON.stringify(err)}`);
        }
    } else {
        console.log(`❌ FAIL: Request succeeded when it should have failed. Status: ${adjustRes.status}`);
        if (adjustRes.ok) {
            const data = await adjustRes.json();
            await fetch(`${API_URL}/data/stock_adjusts/${data.id}`, { method: 'DELETE', headers });
        }
    }

    console.log('\n--- Phase 3 Verification Complete ---');
}

verifyPhase3();
