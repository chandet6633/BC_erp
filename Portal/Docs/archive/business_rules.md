# BC Auto Portal — Business Rules & Logic

> AI agents **MUST** adhere to these rules when modifying or creating features.
> Last updated: 2026-03-17

---

## Core Directives

> [!CAUTION]
> 1. **Never bypass validation** — all data mutations must follow the rules below.
> 2. **Respect Branch Isolation** — data must never leak between branches.
> 3. **Thai Language First** — all user-facing text must be in Thai.

---

## 1. Data & Branch Normalization

The system is multi-branch. Always use normalized string values for DB queries:

| Branch | DB Value | UI Display |
|--------|----------|-----------|
| Main | `BC Auto Service` | BC Auto Service (วิริยะเซอร์วิส) |
| Suphan | `suphanburi` | BC Auto เมืองสุพรรณ |
| Samchuk | `samchuk` | BC AUTO XPERIENCE (สามชุก) |

- **Unified Path**: All operational tools reside in `src/pages/branch-operations`. Never create branch-specific folders.
- **Dynamic Labels**: Use `AuthService.getBranch()` to set `document.title` and local labels. (`authService.js:174-198`)
- **Filter Helper**: `AuthService.getBranchFilter()` returns a PocketBase filter string. Admin/owner with `'all'` gets `'id!=""'`. (`authService.js:203-217`)

---

## 2. Employee Entry Rules (Poka-Yoke)

### 30-Minute Editing Window
- **Rule**: SA employees can edit/delete entries within **30 minutes** of creation only.
- **Enforcement**: Compare `created` timestamp vs current time. Disable edit/delete after 30 min.
- **Exceptions**: Admin, Owner, and Manager are NOT subject to this limit.

### Category Restrictions
- **Rule**: SA employees cannot see confidential categories (Salary, Bonus, Commission).
- **Implementation**: Filtered via `EMPLOYEE_CATEGORIES` vs `OWNER_EXPENSE_CATEGORIES` in `employee-entry.js`.

---

## 3. Financial Logic

| Metric | Formula |
|--------|---------|
| **Total Revenue** | `Transactions Revenue` + `Verified Manual Revenues` (from financial_ledger) |
| **Gross Profit** | `Total Revenue` − `Total Cost` (verified manual revenue assumed 100% profit) |
| **Net Profit** | `Gross Profit` − `Operating Expenses (Opex)` |
| **Opex** | `financial_ledger` where `entry_type='expense'` AND `excluded=false` |
| **COGS** | `financial_ledger` where `excluded=true` (Materials/Parts) + `transactions` costs |

(`revenueService.js:41-62`)

---

## 4. Role-Based Access Control (RBAC)

| Role | Access Level |
|------|-------------|
| `admin` / `owner` | Full access — all branches, all tools, all financial data |
| `manager` | Full access to **assigned branch** + common tools, can verify entries |
| `sa` | Operations menu + check-in tools. Cannot see confidential financial data |
| `mechanic` | Check-in/out only (`checkin` tool) |

Dynamic permissions from `system_roles` collection, enforced by `ConfigService.hasAccess()`. (`configService.js:49-78`)

---

## 5. Data Reconciliation (Audit)

### Job-Level
- **Rule**: `transactions.total_revenue` must match `SUM(service_items.total_price)` per `job_id`.
- **Tolerance**: Discrepancies > ฿0.50 flagged in `audit.html`.
- **Smart Fix**: Auto-calculates missing amount and pre-fills "Quick Add" form.

### Month-Level
- **Rule**: `product_groups` totals ≈ `service_items` totals ≈ `transactions` totals.
- **Purpose**: Ensures imported bulk data aligns with individual records.

---

## 6. Verification & Audit

- Revenue entries in `financial_ledger` **MUST** be verified by Manager/Admin before inclusion in KPI dashboards.
- **Global Audit**: All CRUD mutations are auto-logged via the Proxy interceptor in `pocketbase.js:18-65`.
- **Manual Audit**: Login/Logout explicitly logged in `authService.js:86,124,162`.

> [!TIP]
> You do NOT need to add `AuditService.log()` for standard CRUD — the proxy handles it. Only use manual logging for composite actions (bulk imports, specialized reports).

---

## 7. Data Import & Deduplication

### Matching Keys
| Collection | Composite Key |
|-----------|---------------|
| `transactions` | `job_id` + `branch` |
| `service_items` | `job_id` + `item_name` + `branch` |
| `product_groups` | `code` + `report_month` + `branch` |

### Import Rules
- **Preview Required**: Show "New" vs "Duplicate" preview before committing.
- **Silent Failures**: Per-row `try/catch` — one bad row doesn't block the batch.
- **Aggregation**: Multiple rows for same `code` in same month must be summed before saving.
