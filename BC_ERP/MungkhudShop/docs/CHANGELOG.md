# MungkhudShop — Changelog

All notable changes are documented here.

---

## v2.1.0 — 2026-03-17

### Cross-App Integration & New Features

- **Kanban Board** (`kanban.js`) — Job status workflow with branch badges
- **PIN Shared Login** — Authenticates via Management's PocketBase (`pb.js:10-24`)
- **SSO Support** — Base64 token exchange from Management (`app.js:350-410`)
- **Password Hashing** — SHA-256 via WebCrypto with auto-migration (`crypto.js`, `auth.js:34-57`)
- **Dark Mode** — Theme toggle with localStorage persistence (`app.js:443-470`)
- **Session Timeout** — 30-minute inactivity auto-logout (`app.js:280-308`)
- **Lazy Loading** — Dynamic `import()` for all routes except dashboard (`app.js:14-47`)
- **Telegram Notifications** — Alert integration (`telegram.js`)
- **PDF Engine** — Client-side PDF generation (`pdf-engine.js`)
- **Excel Export** — Spreadsheet export utility (`excel-export.js`)
- **Low-Stock Alerts** — Automatic check with audio notification (`app.js:498-540`)
- **Back to Management** — Button for SSO/PIN users (`app.js:428-440`)
- **Embedded Mode** — iframe support when loaded inside Management (`app.js:413-425`)

---

## v2.0.0 — 2026-03-09

### Production Polish & Feature Expansion

**New UI Components (`ui.js`)**
- `createAutocomplete()` — Type-ahead with debounce, keyboard nav, highlight
- `createDropdown()` — `<select>` from PocketBase collections
- `createVatToggle()` — VAT on/off + customer_pays / shop_absorbs mode
- `calcVat()` — VAT calculation helper
- `exportCSV()` — UTF-8 BOM CSV export

**Database Schema Expansion**
- 6 new collections: `branches`, `product_brands`, `product_groups`, `favorite_products`, `job_evaluations`, `job_payments`
- Expanded fields on `products`, `vehicles`, `customers`, `jobs`, `documents`, `settings`, `app_users`

**Multi-Shop Branch Support**
- Branch management CRUD (`master-branch.js`)
- Branch switcher in topnav — admin sees all, employees lock to assigned branch
- `getBranch()`, `setBranch()`, `getBranchFilter()`, `hasPermission()` in `auth.js`

**VAT Toggle**
- Integrated in `job.js` and `document-factory.js`
- Two modes: customer_pays (+7%) and shop_absorbs (from margin)

**Autocomplete & Smart Inputs**
- Job: plate → auto-fills vehicle + linked customer
- Job: product items → shows stock qty & price
- Document factory: entity + product autocomplete

**New Pages**
- `master-brand.js` — ยี่ห้อสินค้า CRUD
- `master-group.js` — กลุ่มสินค้า CRUD
- `master-branch.js` — จัดการสาขา CRUD
- `user-permissions.js` — 14 granular permissions across 5 groups

**Other Features**
- Favorite products quick-add panel in job form
- Repair evaluation (pass/fix/fail + evaluator + notes)
- Multiple payment methods per job
- Enhanced dashboard (5 stat cards, branch-aware, quick actions)
- Quick date buttons on all report pages
- VAT-aware print templates with dynamic columns
- Settings page (VAT defaults + print layout config)

---

## v1.0.0 — 2026-03-09

### Initial Release

- Vite 6 + Vanilla JS SPA with hash-based routing
- PocketBase backend on port 8091
- Glassmorphism UI (Navy/Gold/White)
- Thai-language UI throughout
- Custom login with `app_users` collection
- RBAC with 3 roles, sidebar filtering, localStorage sessions
- Dashboard, Job, Inventory (5 sub-modules), Purchasing (5 sub-modules)
- Master Data (6 entities), Reports, Forms, Settings
- `document-factory.js` (14 doc types), `master-factory.js` (6 entities)
- Auto stock ledger posting (IN/OUT/ADJ)
- Setup scripts: `setup-db.js`, `setup-auth.js`, `start-mungkhud.bat`
