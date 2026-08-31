import jwt from 'jsonwebtoken';

const JWT_SECRET = 'bcauto_jwt_secret_2026_change_in_production';
const API_URL = 'http://localhost:9093/api';

const token = jwt.sign(
    { id: '1', name: 'Admin User', role: 'admin', branch: 'bc-auto-service' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function testCostSpoofing() {
    console.log('Testing Cost Spoofing Protection...');
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 1. Create a dummy product with cost 500
    console.log('Creating dummy product...');
    const prodRes = await fetch(`${API_URL}/data/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'Test Brake Pad',
            code: 'TEST-BP-001',
            price: 1000,
            cost: 500,
            type: 'product',
            brand: 'TestBrand',
            group: 'Parts'
        })
    });
    
    if (!prodRes.ok) {
        console.error('Failed to create product:', await prodRes.text());
        return;
    }
    const product = await prodRes.json();
    console.log(`Product created: ID ${product.id}, True Cost: 500`);

    // 2. Create a dummy job to attach item to
    const jobRes = await fetch(`${API_URL}/data/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            status: 'pending',
            job_no: 'TEST-JOB-001'
        })
    });
    const job = await jobRes.json();
    console.log(`Dummy Job created: ID ${job.id}`);

    // 3. Attempt to spoof the cost by sending cost: 0
    console.log('Attempting to create job_item with spoofed cost: 0...');
    const itemRes = await fetch(`${API_URL}/data/job_items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            job_id: job.id,
            product_id: product.id,
            type: 'product',
            qty: 1,
            unit_price: 1000,
            cost: 0 // Spoof attempt!
        })
    });

    if (!itemRes.ok) {
        console.error('Failed to create job_item:', await itemRes.text());
        return;
    }
    const item = await itemRes.json();

    // 4. Verify the result
    if (item.cost === 500) {
        console.log(`✅ SUCCESS: Cost tampering blocked! Server enforced cost: ${item.cost}`);
    } else {
        console.log(`❌ FAIL: Cost was spoofed! Server returned cost: ${item.cost}`);
    }

    // Cleanup
    await fetch(`${API_URL}/data/job_items/${item.id}`, { method: 'DELETE', headers });
    await fetch(`${API_URL}/data/jobs/${job.id}`, { method: 'DELETE', headers });
    await fetch(`${API_URL}/data/products/${product.id}`, { method: 'DELETE', headers });
}

testCostSpoofing();
