# Phase 2 Integrity Checks

This document describes the MungkhudShop integrity checks added during Phase 2.

## Admin Page

Open Portal Admin Suite:

- `http://localhost:9092/pages/admin/integrity-check.html`

The page is admin scoped and provides:

- Run all stock and document integrity checks.
- View finding counts by category.
- Export the current report as JSON.
- Run a conservative safe repair.
- Recalculate weighted average product costs from stock ledger history.

## API Endpoints

### `GET /api/data/custom/integrity/stock-check`

Admin only. Returns:

- `negativeStock`: products whose ledger balance is below zero.
- `orphanLedgers`: stock ledger rows that reference missing or unsafe documents.
- `confirmedNoLedger`: confirmed/in-transit/received stock documents with no ledger rows.
- `invalidProductLedgers`: stock ledger rows pointing to a missing product.
- `suspiciousCosts`: ledger rows with negative unit cost or value direction that does not match quantity direction.
- `duplicateProductCodes`: product codes used by more than one product.

### `GET /api/data/custom/integrity/document-check`

Admin only. Returns:

- `duplicateDocNos`: duplicate document numbers.
- `orphanItems`: document items whose parent document is missing.
- `invalidProductItems`: document items pointing to a missing product.
- `confirmedNoLedger`: confirmed stock documents with no ledger rows.
- `invalidBranchDocs`: documents without `branch_id`.
- `invalidStatusDocs`: documents outside the supported status state machine.
- `duplicateProductCodes`: product codes used by more than one product.

### `POST /api/data/custom/admin/recalculate-costs`

Admin only. Recalculates product weighted average cost from stock ledger history.

### `POST /api/data/custom/admin/integrity/repair`

Admin only. Runs conservative safe repairs.

Payload:

```json
{
  "mode": "safe_auto",
  "dry_run": false
}
```

Safe automatic repair currently does:

- Delete `document_items` whose parent document no longer exists.
- Rebuild missing stock ledgers for confirmed or in-transit stock documents only when:
  - the document number is unique
  - the document has items
  - normal server-side stock posting rules pass

Safe automatic repair intentionally does **not** auto-fix:

- orphan stock ledgers
- duplicate document numbers
- invalid product references
- received transfers with missing ledgers
- negative stock
- suspicious historical costs

Use `dry_run: true` for automated verification without mutating data.

## Automated Check

Run:

```powershell
cd api-server
npm.cmd run check:mungkhud-integrity
```

The script verifies:

- Stock integrity endpoint is admin only.
- Document integrity endpoint is admin only.
- Safe repair endpoint is admin only.
- Both endpoints return all expected finding arrays.
- Safe repair dry-run returns the expected repair result arrays.
- Finding rows include actionable fields such as ids, document numbers, product ids, quantities, and counts.

## Current Test Data Notes

The test database may contain historical dirty records from earlier development. That is acceptable for this stage. The important behavior is that integrity findings are structured, visible, and exportable so they can be repaired deliberately.

Before pilot production, run the checks and resolve or explicitly accept every finding.
