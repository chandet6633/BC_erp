const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

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
      await plateInput.first().fill('3\u0e01\u0e04-1234');
    }

    const adHocBtn = page.locator('button:has-text("Ad-Hoc"), .btn-add-adhoc');
    if (await adHocBtn.count() > 0) {
      await adHocBtn.first().click();
      await expect.soft(page.locator('input[name="adhoc_name"], .adhoc-input').first()).toBeVisible();
    }
  });

  test('Samchuk branch shows active lead mechanic', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mungkhud_branch', 'samchuk');
      localStorage.setItem('mungkhud_changelog_version', '2.3.0');
    });

    await gotoMungkhudRoute(page, 'job', '.tabs');
    await page.keyboard.press('Escape');
    await page.locator('.tab-btn[data-tab="add"]').click({ force: true });

    await page.locator('#jobLeadMechanic').waitFor({ state: 'attached', timeout: 30000 });
    await page.waitForFunction(() => [...document.querySelectorAll('#jobLeadMechanic option')].some(o => o.value), null, { timeout: 30000 });

    const optionTexts = await page.locator('#jobLeadMechanic option').evaluateAll(options => options.map(o => o.textContent.trim()));
    expect(optionTexts).toContain('ช่างมังคุด');
  });
  test('Mechanic page shows assigned work and advances to QC', async ({ page }, testInfo) => {
    const mechanic = { id: '2', username: 'mechanic-samchuk', name: 'ช่างมังคุด', role: 'mechanic', branch: 'สามชุก' };
    const mechanicToken = jwt.sign(mechanic, process.env.JWT_SECRET || 'bcauto_jwt_secret_2026_change_in_production', { expiresIn: '24h' });

    const createdJob = await page.evaluate(async () => {
      const token = localStorage.getItem('mungkhud_jwt');
      const payload = {
        status: 'pending',
        start_date: new Date().toISOString().slice(0, 10),
        plate: '9กฮ-4455',
        customer_name: 'Mechanic Loop Test',
        customer_phone: '0800000000',
        notes: 'ตรวจช่วงล่างและเสียงดังตอนเบรก',
        lead_mechanic_id: '2',
        branch_id: 'สามชุก',
        payment_status: 'unpaid',
        payment_type: 'cash',
        subtotal: 0,
        discount_amount: 0,
        vat_amount: 0,
        grand_total: 0
      };
      const response = await fetch('/api/data/jobs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      const job = await response.json();
      const jobId = job.id || job.Id || job.ID;
      const itemResponse = await fetch('/api/data/job_items', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, product_name: 'ตรวจระบบเบรก', qty: 1, unit_price: 0, total: 0, type: 'adhoc', product_type: 'service', branch_id: 'สามชุก' })
      });
      if (!itemResponse.ok) throw new Error(await itemResponse.text());
      return job;
    });

    await page.addInitScript(({ token, user }) => {
      const session = {
        id: user.id,
        username: user.username,
        display_name: user.name,
        role: user.role,
        allowed_menus: '#/mechanic-kpi',
        branch_id: user.branch,
        permissions: '{}',
        sso_source: 'api_jwt',
        _expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem('mungkhud_auth', JSON.stringify(session));
      localStorage.setItem('mungkhud_jwt', token);
      localStorage.setItem('bcauto_jwt', token);
      localStorage.setItem('mungkhud_branch', user.branch);
      localStorage.setItem('mungkhud_changelog_version', '2.3.0');
    }, { token: mechanicToken, user: mechanic });

    const createdJobId = createdJob.id || createdJob.Id || createdJob.ID;
    const evidencePath = path.join(testInfo.outputDir, 'qc-evidence.png');
    fs.mkdirSync(testInfo.outputDir, { recursive: true });
    fs.writeFileSync(evidencePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'));

    try {
      await gotoMungkhudRoute(page, 'mechanic-kpi', '#assignedJobsList');
      await expect(page.locator('#assignedJobsList')).toContainText('9กฮ-4455', { timeout: 15000 });
      await expect(page.locator('#assignedJobsList')).toContainText('ตรวจช่วงล่างและเสียงดังตอนเบรก');
      await expect(page.locator('#assignedJobsList')).toContainText('ตรวจระบบเบรก');

      await page.locator(`[data-job-action="accept"][data-job-id="${createdJobId}"]`).click();
      await page.locator(`[data-confirm-accept="${createdJobId}"]`).click();
      await expect(page.locator('#assignedJobsList')).toContainText('ตรวจสภาพรถก่อนเริ่มงาน', { timeout: 15000 });

      await page.locator(`[data-job-action="precheck"][data-job-id="${createdJobId}"]`).click();
      await page.locator('#precheckNote').fill('ตรวจ รถ ก่อน เริ่มงาน');
      await page.locator(`[data-confirm-precheck="${createdJobId}"]`).click();
      await expect(page.locator('#assignedJobsList')).toContainText('กำลังซ่อม', { timeout: 15000 });
      await expect(page.locator('#assignedJobsList .elapsed').first()).toBeVisible();

      await page.locator(`[data-job-action="qc"][data-job-id="${createdJobId}"]`).click();
      await page.locator('.qc-file').first().setInputFiles(evidencePath);
      await page.locator(`[data-confirm-qc="${createdJobId}"]`).click();
      await expect(page.locator('#assignedJobsList')).toContainText('ส่ง QC แล้ว', { timeout: 15000 });
    } finally {
      await page.evaluate(async jobId => {
        const token = localStorage.getItem('mungkhud_jwt');
        await fetch(`/api/data/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });
      }, createdJobId).catch(() => {});
    }
  });
});
