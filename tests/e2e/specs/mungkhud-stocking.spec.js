const { test, expect } = require('@playwright/test');
const { loginMungkhudShop, gotoMungkhudRoute, getDevPortalHeaders } = require('../utils/auth');

test.describe('MungkhudShop Stocking Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'MungkhudShop', 'Only runs in MungkhudShop project');
    await loginMungkhudShop(page, 'admin', 'admin123');
    // Select Samchuk through the metadata-backed branch id to force page refresh in that context.
    await page.selectOption('#branchSelect', 'bc-auto-samchuk');
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
    const headers = getDevPortalHeaders('admin', 'bc-auto-service');
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
          branch_id: 'bc-auto-samchuk',
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
          branch_id: 'bc-auto-samchuk'
        }
      });
      expect(itemRes.ok()).toBeTruthy();

      const confirmRes = await page.request.post(`/api/data/custom/confirm-document/${encodeURIComponent(doc.id)}`, { headers });
      expect(confirmRes.ok()).toBeTruthy();
    };

    await createStockDoc('RR', 3, 300);
    await createStockDoc('SA', -1, -100);

    const stockRes = await page.request.get('/api/data/custom/stock-balances?branch_id=bc-auto-samchuk', { headers });
    expect(stockRes.ok()).toBeTruthy();
    const stock = await stockRes.json();
    expect(stock[String(product.id)]).toMatchObject({ qty: 2, total_value: 200 });
  });

  test('E2E UI: Confirm RR increases stock and Void reverts it', async ({ page }) => {
    const headers = getDevPortalHeaders('admin', 'bc-auto-service');
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
        branch_id: 'bc-auto-samchuk',
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
        branch_id: 'bc-auto-samchuk'
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

  test('Document UI saves serialized and batch traceability fields', async ({ page }) => {
    const headers = getDevPortalHeaders('admin', 'bc-auto-service');
    const suffix = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const createTrackedProduct = async (trackingType) => {
      const code = `UI-${trackingType}-${suffix}`;
      const res = await page.request.post('/api/data/products', {
        headers,
        data: {
          code,
          name: `UI ${trackingType} Product ${suffix}`,
          type: 'part',
          unit: 'pcs',
          price: 250,
          cost: 100,
          min_qty: 1,
          is_track_stock: true,
          tracking_type: trackingType,
          metadata_json: JSON.stringify({ tracking_type: trackingType })
        }
      });
      if (!res.ok()) {
        console.error(`PRODUCT ${trackingType} CREATE FAILED:`, res.status(), await res.text());
      }
      expect(res.ok()).toBeTruthy();
      return { ...(await res.json()), code };
    };

    const fetchSavedItem = async (refNo) => {
      const docRes = await page.request.get(`/api/data/documents/all?where=${encodeURIComponent(`(ref_no,eq,${refNo})`)}`, { headers });
      expect(docRes.ok()).toBeTruthy();
      const docs = await docRes.json();
      expect(docs.length).toBeGreaterThan(0);
      const itemRes = await page.request.get(`/api/data/document_items/all?where=${encodeURIComponent(`(document_id,eq,${docs[0].id})`)}`, { headers });
      expect(itemRes.ok()).toBeTruthy();
      const items = await itemRes.json();
      expect(items.length).toBe(1);
      return items[0];
    };

    const itemMetadata = (item) => {
      if (!item?.metadata_json) return {};
      if (typeof item.metadata_json === 'object') return item.metadata_json;
      try {
        return JSON.parse(item.metadata_json);
      } catch {
        return {};
      }
    };

    const selectProductInFirstLine = async (product) => {
      await page.click('.btn-add-line');
      const row = page.locator('.doc-items-body tr:not(.grid-empty)').first();
      await row.locator('.line-prod').fill(product.code);
      await page.locator('.ac-item', { hasText: product.code }).first().click();
      await expect(row.locator('.line-tracking-panel')).toBeVisible();
      return row;
    };

    const serialProduct = await createTrackedProduct('SERIALIZED');
    const serialRef = `RR-UI-SERIAL-${suffix}`;
    await gotoMungkhudRoute(page, 'goods-receipt', '#panel-search');
    await page.locator('.tab-btn[data-tab="add"]').click();
    await page.fill('#issue_date', today);
    await page.fill('#ref_no', serialRef);
    const serialRow = await selectProductInFirstLine(serialProduct);
    await serialRow.locator('.line-qty').fill('2');
    await serialRow.locator('.line-serials').fill(`SN-${suffix}-1\nSN-${suffix}-2`);
    await expect(serialRow.locator('.traceability-badge')).toContainText('Serialized');
    await page.click('#btnSaveDoc');
    await expect(page.locator('#panel-search')).toBeVisible({ timeout: 10000 });
    const serialItem = await fetchSavedItem(serialRef);
    const serialMeta = itemMetadata(serialItem);
    expect(serialItem.tracking_type || serialMeta.tracking_type).toBe('SERIALIZED');
    expect(serialItem.serial_numbers || serialMeta.serial_numbers).toContain(`SN-${suffix}-1`);
    expect(serialItem.serial_numbers || serialMeta.serial_numbers).toContain(`SN-${suffix}-2`);

    const batchProduct = await createTrackedProduct('BATCH');
    const batchRef = `RR-UI-BATCH-${suffix}`;
    await gotoMungkhudRoute(page, 'goods-receipt', '#panel-search');
    await page.locator('.tab-btn[data-tab="add"]').click();
    await page.fill('#issue_date', today);
    await page.fill('#ref_no', batchRef);
    const batchRow = await selectProductInFirstLine(batchProduct);
    await batchRow.locator('.line-qty').fill('5');
    await batchRow.locator('.line-batch').fill(`LOT-${suffix}`);
    await batchRow.locator('.line-expiry').fill('2028-12-31');
    await expect(batchRow.locator('.traceability-badge')).toContainText('Batch/Lot');
    await page.click('#btnSaveDoc');
    await expect(page.locator('#panel-search')).toBeVisible({ timeout: 10000 });
    const batchItem = await fetchSavedItem(batchRef);
    const batchMeta = itemMetadata(batchItem);
    expect(batchItem.tracking_type || batchMeta.tracking_type).toBe('BATCH');
    expect(batchItem.batch_no || batchMeta.batch_no).toBe(`LOT-${suffix}`);
    expect(String(batchItem.expiry_date || batchMeta.expiry_date)).toContain('2028-12-31');
  });

});
