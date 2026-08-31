const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { loginMungkhudShop, gotoMungkhudRoute, getDevPortalHeaders } = require('../utils/auth');

const SAMCHUK_BRANCH_ID = 'bc-auto-samchuk';
const recordId = record => record.id || record.Id || record.ID;

test.describe('MungkhudShop Job Workflow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
  });

  test('Navigate to Job Creation and interact with form', async ({ page }) => {
    await gotoMungkhudRoute(page, 'job', '.tabs');

    await page.keyboard.press('Escape');
    await page.locator('.tab-btn[data-tab="add"]').click({ force: true });

    const plateInput = page.locator('#jobPlateAC input');
    await expect(plateInput.first()).toBeVisible({ timeout: 5000 });

    if (await plateInput.first().isVisible()) {
      await plateInput.first().fill('E2E-1234');
    }

    const adHocBtn = page.locator('button:has-text("Ad-Hoc"), .btn-add-adhoc');
    if (await adHocBtn.count() > 0) {
      await adHocBtn.first().click();
      await expect.soft(page.locator('input[name="adhoc_name"], .adhoc-input').first()).toBeVisible();
    }
  });

  test('Samchuk branch shows active lead mechanic options', async ({ page }) => {
    await page.addInitScript(branchId => {
      localStorage.setItem('app.session.branchId', branchId);
      localStorage.setItem('app.session.branchLocked', 'true');
      localStorage.setItem('mungkhud_changelog_version', '2.3.0');
    }, SAMCHUK_BRANCH_ID);

    await gotoMungkhudRoute(page, 'job', '.tabs');
    await page.keyboard.press('Escape');
    await page.locator('.tab-btn[data-tab="add"]').click({ force: true });

    await page.locator('#jobLeadMechanic').waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForFunction(() => {
      return [...document.querySelectorAll('#jobLeadMechanic option')].some(option => option.value);
    }, null, { timeout: 30000 });

    const optionValues = await page.locator('#jobLeadMechanic option').evaluateAll(options => {
      return options.map(option => option.value).filter(Boolean);
    });
    expect(optionValues.length).toBeGreaterThan(0);
  });

  test('Job item UI exposes serial fields for serialized stock products', async ({ page }) => {
    const headers = getDevPortalHeaders('admin', 'bc-auto-service');
    const suffix = Date.now();
    const productRes = await page.request.post('/api/data/products', {
      headers,
      data: {
        code: `JOB-UI-SERIAL-${suffix}`,
        name: `Job UI Serialized Part ${suffix}`,
        type: 'part',
        unit: 'piece',
        price: 250,
        cost: 100,
        is_track_stock: true,
        tracking_type: 'SERIALIZED',
        metadata_json: JSON.stringify({ tracking_type: 'SERIALIZED' }),
        branch_id: SAMCHUK_BRANCH_ID
      }
    });
    if (!productRes.ok()) throw new Error(await productRes.text());
    const product = await productRes.json();

    await gotoMungkhudRoute(page, 'job', '.tabs');
    await page.keyboard.press('Escape');
    await page.locator('.tab-btn[data-tab="add"]').click({ force: true });
    await page.locator('#btnAddItem').click();
    const row = page.locator('#jobItemsBody tr:not(.grid-empty)').first();
    await row.locator('.item-prod').fill(product.code);
    await page.locator('.ac-item', { hasText: product.code }).first().click();

    await expect(row.locator('.job-tracking-panel')).toBeVisible({ timeout: 10000 });
    await expect(row.locator('.traceability-badge')).toContainText('Serialized');
    await expect(row.locator('.item-serials')).toBeVisible();
  });

  test('Kanban payment modal closes job and creates invoice and receipt', async ({ page }) => {
    const headers = getDevPortalHeaders('admin', 'bc-auto-service');
    const suffix = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const productRes = await page.request.post('/api/data/products', {
      headers,
      data: {
        code: `KANBAN-PAY-${suffix}`,
        name: `Kanban Payment Part ${suffix}`,
        type: 'part',
        unit: 'piece',
        base_uom: 'piece',
        purchase_uom: 'piece',
        sales_uom: 'piece',
        price: 300,
        cost: 0,
        is_track_stock: true,
        tracking_type: 'NONE',
        branch_id: SAMCHUK_BRANCH_ID
      }
    });
    if (!productRes.ok()) throw new Error(await productRes.text());
    const product = await productRes.json();
    const productId = recordId(product);

    const rrRes = await page.request.post('/api/data/documents', {
      headers,
      data: {
        doc_type: 'RR',
        doc_no: `RR-KANBAN-PAY-${suffix}`,
        issue_date: today,
        status: 'draft',
        branch_id: SAMCHUK_BRANCH_ID,
        subtotal: 200,
        discount: 0,
        vat_amount: 0,
        grand_total: 200
      }
    });
    if (!rrRes.ok()) throw new Error(await rrRes.text());
    const rr = await rrRes.json();

    const rrItemRes = await page.request.post('/api/data/document_items', {
      headers,
      data: {
        document_id: recordId(rr),
        product_id: productId,
        product_name: product.name,
        qty: 2,
        uom: 'piece',
        price: 100,
        unit_price: 100,
        discount: 0,
        total: 200,
        branch_id: SAMCHUK_BRANCH_ID
      }
    });
    if (!rrItemRes.ok()) throw new Error(await rrItemRes.text());

    const confirmRes = await page.request.post(`/api/data/custom/confirm-document/${encodeURIComponent(recordId(rr))}`, { headers });
    if (!confirmRes.ok()) throw new Error(await confirmRes.text());

    const jobNo = `JOB-KANBAN-PAY-${suffix}`;
    const jobRes = await page.request.post('/api/data/jobs', {
      headers,
      data: {
        job_no: jobNo,
        status: 'qc_done',
        start_date: today,
        plate: `KP-${String(suffix).slice(-4)}`,
        customer_name: `Kanban Payment Customer ${suffix}`,
        branch_id: SAMCHUK_BRANCH_ID,
        payment_status: 'unpaid',
        subtotal: 500,
        discount: 0,
        discount_amount: 0,
        vat_amount: 0,
        grand_total: 500
      }
    });
    if (!jobRes.ok()) throw new Error(await jobRes.text());
    const job = await jobRes.json();
    const jobId = recordId(job);

    const partItemRes = await page.request.post('/api/data/job_items', {
      headers,
      data: {
        job_id: jobId,
        product_id: productId,
        product_name: product.name,
        qty: 1,
        uom: 'piece',
        price: 300,
        unit_price: 300,
        discount: 0,
        total: 300,
        branch_id: SAMCHUK_BRANCH_ID
      }
    });
    if (!partItemRes.ok()) throw new Error(await partItemRes.text());

    const laborItemRes = await page.request.post('/api/data/job_items', {
      headers,
      data: {
        job_id: jobId,
        product_name: 'Kanban payment labor',
        qty: 1,
        price: 200,
        unit_price: 200,
        discount: 0,
        total: 200,
        type: 'adhoc',
        product_type: 'service',
        branch_id: SAMCHUK_BRANCH_ID
      }
    });
    if (!laborItemRes.ok()) throw new Error(await laborItemRes.text());

    await gotoMungkhudRoute(page, 'kanban', '.kanban-board');

    const card = page.locator(`.kanban-card[data-job-id="${jobId}"]`);
    await expect(card).toBeVisible({ timeout: 20000 });
    await card.locator('.btn-kanban-action.pay').click();

    await expect(page.locator('#paymentModalOverlay.show')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#payAmount')).toContainText('500');
    await page.locator('#btnPaymentSubmit').click();
    await expect(page.locator('#paymentModalOverlay.show')).toHaveCount(0, { timeout: 20000 });

    await expect.poll(async () => {
      const refreshed = await page.request.get(`/api/data/jobs/${encodeURIComponent(jobId)}`, { headers });
      if (!refreshed.ok()) return null;
      const body = await refreshed.json();
      return `${body.status}:${body.payment_status}`;
    }, { timeout: 20000 }).toBe('completed:paid');

    const docsRes = await page.request.get(`/api/data/documents/all?where=${encodeURIComponent(`(entity_id,eq,${jobId})`)}`, { headers });
    if (!docsRes.ok()) throw new Error(await docsRes.text());
    const docs = await docsRes.json();
    expect(docs.some(doc => doc.doc_type === 'IV' && doc.status === 'confirmed')).toBeTruthy();
    expect(docs.some(doc => doc.doc_type === 'RC' && doc.status === 'confirmed')).toBeTruthy();
  });

  test('Mechanic page shows assigned work and advances to QC', async ({ page }, testInfo) => {
    const headers = getDevPortalHeaders('admin', 'bc-auto-service');
    const createdJobResponse = await page.request.post('/api/data/jobs', {
      headers,
      data: {
        status: 'pending',
        start_date: new Date().toISOString().slice(0, 10),
        plate: 'E2E-4455',
        customer_name: 'Mechanic Loop Test',
        customer_phone: '0800000000',
        notes: 'Brake inspection before road test',
        lead_mechanic_id: '2',
        branch_id: SAMCHUK_BRANCH_ID,
        payment_status: 'unpaid',
        payment_type: 'cash',
        subtotal: 0,
        discount_amount: 0,
        vat_amount: 0,
        grand_total: 0
      }
    });
    if (!createdJobResponse.ok()) throw new Error(await createdJobResponse.text());
    const createdJob = await createdJobResponse.json();
    const createdJobId = createdJob.id || createdJob.Id || createdJob.ID;

    const itemResponse = await page.request.post('/api/data/job_items', {
      headers,
      data: {
        job_id: createdJobId,
        product_name: 'Brake system check',
        qty: 1,
        unit_price: 0,
        total: 0,
        type: 'adhoc',
        product_type: 'service',
        branch_id: SAMCHUK_BRANCH_ID
      }
    });
    if (!itemResponse.ok()) throw new Error(await itemResponse.text());

    await loginMungkhudShop(page, 'somchai', 'mechanic123');

    const evidencePath = path.join(testInfo.outputDir, 'qc-evidence.png');
    fs.mkdirSync(testInfo.outputDir, { recursive: true });
    fs.writeFileSync(
      evidencePath,
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64')
    );

    try {
      await gotoMungkhudRoute(page, 'mechanic-kpi', '#assignedJobsList');
      await expect(page.locator('#assignedJobsList')).toContainText('E2E-4455', { timeout: 15000 });
      await expect(page.locator('#assignedJobsList')).toContainText('Brake inspection before road test');
      await expect(page.locator('#assignedJobsList')).toContainText('Brake system check');

      await page.locator(`[data-job-action="accept"][data-job-id="${createdJobId}"]`).click();
      await page.locator(`[data-confirm-accept="${createdJobId}"]`).click();
      await expect(page.locator('#assignedJobsList')).toContainText(/precheck|ก่อน/i, { timeout: 15000 });

      await page.locator(`[data-job-action="precheck"][data-job-id="${createdJobId}"]`).click();
      await page.locator('#precheckNote').fill('Vehicle checked before repair');
      await page.locator(`[data-confirm-precheck="${createdJobId}"]`).click();
      await expect(page.locator('#assignedJobsList .elapsed').first()).toBeVisible({ timeout: 15000 });

      await page.locator(`[data-job-action="qc"][data-job-id="${createdJobId}"]`).click();
      await page.locator('.qc-file').first().setInputFiles(evidencePath);
      await page.locator(`[data-confirm-qc="${createdJobId}"]`).click();
      await expect(page.locator('#assignedJobsList')).toContainText(/QC/i, { timeout: 15000 });
    } finally {
      await page.request.patch(`/api/data/jobs/${createdJobId}`, {
        headers,
        data: { status: 'cancelled' }
      }).catch(() => {});
    }
  });
});
