const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Payment & Daily Summary Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    
    await loginMungkhudShop(page, 'admin', 'admin123');
    
    // Select the samchuk branch in the UI dropdown to force page reload/refresh in that context
    await page.selectOption('#branchSelect', 'samchuk');
    await page.waitForTimeout(500);
  });

  test('Record payment for job and verify in daily summary', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    const token = jwtSignForTest();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const suffix = Date.now();

    // 1. Create a completed unpaid job via API for samchuk branch
    const jobRes = await page.request.post('/api/data/jobs', {
      headers,
      data: {
        job_no: `JOB-PAY-${suffix}`,
        status: 'qc_done',
        start_date: new Date().toISOString().slice(0, 10),
        plate: `กข-${suffix.toString().slice(-4)}`,
        customer_name: `Customer Pay ${suffix}`,
        customer_phone: '0811112222',
        lead_mechanic_id: '2', // ช่างมังคุด
        branch_id: 'samchuk',
        payment_status: 'unpaid',
        payment_type: 'cash',
        subtotal: 200,
        discount_amount: 0,
        vat_amount: 0,
        grand_total: 200
      }
    });
    expect(jobRes.ok()).toBeTruthy();
    const job = await jobRes.json();

    // Add a job item (required for data completeness)
    const itemRes = await page.request.post('/api/data/job_items', {
      headers,
      data: {
        job_id: job.id,
        product_name: 'ค่าแรงเปลี่ยนถ่ายน้ำมัน',
        qty: 1,
        price: 200,
        discount: 0,
        total: 200,
        type: 'adhoc',
        product_type: 'service',
        branch_id: 'samchuk'
      }
    });
    expect(itemRes.ok()).toBeTruthy();

    // 2. Go to job list page in UI
    await gotoMungkhudRoute(page, 'job', '#searchKeyword');
    
    // 3. Search for the job
    await page.fill('#searchKeyword', job.job_no);
    await page.waitForTimeout(600); // Wait for debounce and reload

    // 4. Click edit on the job row
    const jobRow = page.locator('tr', { hasText: job.job_no });
    await expect(jobRow).toBeVisible({ timeout: 10000 });
    await jobRow.locator('.btn-edit').click();
    
    // 5. Wait for edit form to populate
    const payAmtInput = page.locator('#jobPaymentMethods .payment-row .pay-amount').first();
    await payAmtInput.waitFor({ state: 'visible', timeout: 15000 });
    
    // 6. Enter payment amount
    await payAmtInput.fill('200');

    // 7. Click Save
    await page.click('#btnSaveJob');
    
    // Wait for save operation to finish (save button is no longer showing 'กำลังบันทึก...')
    await expect(page.locator('#btnSaveJob')).not.toContainText('กำลังบันทึก...', { timeout: 15000 });

    // 8. Verify payment status is paid on API
    const verifyRes = await page.request.get(`/api/data/jobs/${job.id}`, { headers });
    expect(verifyRes.ok()).toBeTruthy();
    const verifiedJob = await verifyRes.json();
    expect(verifiedJob.payment_status).toBe('paid');

    // 9. Go to Daily Summary page
    await gotoMungkhudRoute(page, 'daily-summary', '#summaryDate');
    
    // Click load summary
    await page.click('#btnLoadSummary');
    await page.waitForTimeout(500);

    // Assert that the job is closed and revenue matches at least 200
    const revenueEl = page.locator('#kpiTotalRevenue');
    await expect(revenueEl).toBeVisible();
    const revenueText = await revenueEl.textContent();
    const revenueNum = parseFloat(revenueText.replace(/[^0-9.]/g, ''));
    expect(revenueNum).toBeGreaterThanOrEqual(200);
  });
});

function jwtSignForTest() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: 'test-admin', username: 'admin', name: 'Admin', role: 'admin', branch: 'bc-auto-service' },
    process.env.JWT_SECRET || 'bcauto_jwt_secret_2026_change_in_production',
    { expiresIn: '24h' }
  );
}
