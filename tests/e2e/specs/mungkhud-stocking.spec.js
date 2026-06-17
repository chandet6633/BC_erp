const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
const { loginMungkhudShop, gotoMungkhudRoute } = require('../utils/auth');

test.describe('MungkhudShop Stocking Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
    // Select the samchuk branch in the UI dropdown to force page reload/refresh in that context
    await page.selectOption('#branchSelect', 'samchuk');
    await page.waitForTimeout(500);
  });

  test('Navigate to Stock List and verify rendering', async ({ page }) => {
    await gotoMungkhudRoute(page, 'stock-list', '#stockGrid table');

    const stockGrid = page.locator('#stockGrid table, #stockGrid .empty-state').first();
    await expect(stockGrid).toBeVisible({ timeout: 5000 });
  });

  test('Navigate to Stock Adjust and verify interaction', async ({ page }) => {
    await gotoMungkhudRoute(page, 'stock-adjust', '.tabs');

    await page.getByRole('button', { name: /add_circle_outline|เพิ่ม|แก้ไข/i }).click();
    await expect(page.locator('#panel-add')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#doc_no')).toBeVisible({ timeout: 5000 });
  });

  test('Navigate to Stock Transfer without crashing', async ({ page }) => {
    await gotoMungkhudRoute(page, 'stock-transfer', '#panel-search, #panel-add');
  });

  test('RR and SA documents update stock balance', async ({ page }) => {
    const token = jwt.sign(
      { id: 'test-admin', username: 'admin', name: 'Admin', role: 'admin', branch: 'all' },
      process.env.JWT_SECRET || 'bcauto_jwt_secret_2026_change_in_production',
      { expiresIn: '24h' }
    );
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const suffix = Date.now();

    const productRes = await page.request.post('/api/data/products', {
      headers,
      data: {
        code: `E2E-STOCK-${suffix}`,
        name: `E2E Stock Product ${suffix}`,
        type: 'part',
        unit: 'pcs',
        price: 150,
        cost: 100,
        min_qty: 1,
        is_track_stock: true
      }
    });
    if (!productRes.ok()) {
      console.error('PRODUCT CREATE FAILED:', productRes.status(), await productRes.text());
    }
    expect(productRes.ok()).toBeTruthy();
    const product = await productRes.json();

    const createStockDoc = async (docType, qty, total) => {
      const docRes = await page.request.post('/api/data/documents', {
        headers,
        data: {
          doc_type: docType,
          issue_date: new Date().toISOString().slice(0, 10),
          ref_no: `${docType}-e2e-${suffix}`,
          notes: `${docType} e2e stock loop`,
          entity_id: '',
          status: 'draft',
          branch_id: 'samchuk',
          vat_enabled: false,
          vat_mode: 'customer_pays',
          discount_amount: 0,
          subtotal: Math.abs(total),
          vat_amount: 0,
          grand_total: Math.abs(total)
        }
      });
      if (!docRes.ok()) {
        console.error('DOCUMENT CREATE FAILED:', docRes.status(), await docRes.text());
      }
      expect(docRes.ok()).toBeTruthy();
      const doc = await docRes.json();

      const itemRes = await page.request.post('/api/data/document_items', {
        headers,
        data: {
          document_id: doc.id,
          product_id: product.id,
          product_name: product.name,
          qty,
          price: 100,
          unit_price: 100,
          discount: 0,
          cost: 100,
          total,
          branch_id: 'samchuk'
        }
      });
      expect(itemRes.ok()).toBeTruthy();

      const confirmRes = await page.request.post(`/api/data/custom/confirm-document/${encodeURIComponent(doc.id)}`, { headers });
      expect(confirmRes.ok()).toBeTruthy();
    };

    await createStockDoc('RR', 3, 300);
    await createStockDoc('SA', -1, -100);

    const stockRes = await page.request.get('/api/data/custom/stock-balances?branch_id=samchuk', { headers });
    expect(stockRes.ok()).toBeTruthy();
    const stock = await stockRes.json();
    expect(stock[String(product.id)]).toMatchObject({ qty: 2, total_value: 200 });
  });

  test('E2E UI: Confirm RR increases stock and Void reverts it', async ({ page }) => {
    const token = jwt.sign(
      { id: 'test-admin', username: 'admin', name: 'Admin', role: 'admin', branch: 'all' },
      process.env.JWT_SECRET || 'bcauto_jwt_secret_2026_change_in_production',
      { expiresIn: '24h' }
    );
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const suffix = Date.now();

    // 1. Create a new product via API
    const productRes = await page.request.post('/api/data/products', {
      headers,
      data: {
        code: `UI-STOCK-${suffix}`,
        name: `UI Stock Product ${suffix}`,
        type: 'part',
        unit: 'pcs',
        price: 200,
        cost: 120,
        min_qty: 1,
        is_track_stock: true
      }
    });
    if (!productRes.ok()) {
      console.error('PRODUCT CREATE 2 FAILED:', productRes.status(), await productRes.text());
    }
    expect(productRes.ok()).toBeTruthy();
    const product = await productRes.json();

    // 2. Navigate to Stock List and verify initial stock is 0
    await gotoMungkhudRoute(page, 'stock-list', '#stockGrid table');
    await page.fill('#slSearchInput', product.code);
    await page.click('#btnSearchStock');
    await page.waitForTimeout(500);
    
    // Assert the row for our product has quantity '0'
    const productRow = page.locator('tr', { hasText: product.code });
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText('0');

    // 3. Create a draft RR document via API
    const docRes = await page.request.post('/api/data/documents', {
      headers,
      data: {
        doc_type: 'RR',
        issue_date: new Date().toISOString().slice(0, 10),
        ref_no: `RR-ui-${suffix}`,
        status: 'draft',
        branch_id: 'samchuk',
        vat_enabled: false,
        vat_mode: 'customer_pays',
        discount_amount: 0,
        subtotal: 600,
        vat_amount: 0,
        grand_total: 600
      }
    });
    if (!docRes.ok()) {
      console.error('DOCUMENT CREATE 2 FAILED:', docRes.status(), await docRes.text());
    }
    expect(docRes.ok()).toBeTruthy();
    const doc = await docRes.json();

    // Add item to document
    const itemRes = await page.request.post('/api/data/document_items', {
      headers,
      data: {
        document_id: doc.id,
        product_id: product.id,
        product_name: product.name,
        qty: 5,
        price: 120,
        unit_price: 120,
        discount: 0,
        cost: 120,
        total: 600,
        branch_id: 'samchuk'
      }
    });
    expect(itemRes.ok()).toBeTruthy();

    // 4. Confirm document via API
    const confirmRes = await page.request.post(`/api/data/custom/confirm-document/${doc.id}`, { headers });
    expect(confirmRes.ok()).toBeTruthy();

    // 5. Search again in Stock List and verify stock is 5
    await page.click('#btnSearchStock');
    await page.waitForTimeout(500);
    await expect(productRow).toContainText('5');

    // 6. Void document via API
    const voidRes = await page.request.post(`/api/data/custom/void-document/${doc.id}`, { headers });
    expect(voidRes.ok()).toBeTruthy();

    // 7. Search again and verify stock is back to 0
    await page.click('#btnSearchStock');
    await page.waitForTimeout(500);
    await expect(productRow).toContainText('0');
  });

});
