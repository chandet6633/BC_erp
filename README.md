# BC AutoXperience ERP

Multi-branch auto-service ERP for BC Bancha Group, Thailand.

This is the single current README for the project. Older PocketBase-era docs are kept under `docs/archive/` only as history; use this file and `AI_GUIDE.md` for active development.

## Start Here

- AI agents: read `AI_GUIDE.md` before editing code.
- Active runtime: Docker stack in `docker-compose.test.nocodb.yml`.
- Data flow: Browser -> Nginx `/api/*` -> Express API -> NocoDB.
- The browser never receives the NocoDB `xc-token`; Express keeps it server-side and browser requests use JWTs.
- Production roadmap: `docs/production-roadmap-app-first.md`. Current priority is functional app workflows first; production auth and LINE Login are deferred until the app is pilot-ready.

## Current Architecture

```text
Portal      MungkhudShop      Express API        NocoDB
Vite MPA        Vite SPA          Node/Express       SQLite-backed
Port 9092       Port 9091         Port 9093          Port 9080
   |               |                  |                  |
   +---- /api/* ---+---- Nginx -------+---- xc-token ----+
```

## Quick Start

```bash
docker compose -f docker-compose.test.nocodb.yml up -d --build
```

Services:

| Service | URL |
| --- | --- |
| MungkhudShop | http://localhost:9091 |
| Portal | http://localhost:9092 |
| API health | http://localhost:9093/api/health |
| NocoDB admin | http://localhost:9080 |

Useful commands:

```bash
# Rebuild everything
docker compose -f docker-compose.test.nocodb.yml up -d --build

# Rebuild only the API image
docker compose -f docker-compose.test.nocodb.yml up -d --build test-api

# Recreate stateless frontend containers after npm builds
docker compose -f docker-compose.test.nocodb.yml up -d --force-recreate test-portal test-mungkhud

# API logs
docker logs --tail 80 bctest-api
```

## Local Development

Portal:

```bash
cd Portal
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

MungkhudShop:

```bash
cd MungkhudShop
npm install
npm run dev
npm run build
```

API server:

```bash
cd api-server
npm install
node --check server.js
node --check routes/auth.js
node --check routes/data.js
node --check routes/notify.js
```

Build outputs go to `Portal/dist/` and `MungkhudShop/dist/`, which the test Nginx containers serve as read-only bind mounts.

## Project Layout

```text
BC_ERP/
  AI_GUIDE.md                       AI agent workflow and coding rules
  docker-compose.test.nocodb.yml    Active NocoDB test/dev stack
  nginx-test-portal.conf        Portal Nginx config
  nginx-test-mungkhud.conf          MungkhudShop Nginx config
  api-server/                       Express API and NocoDB proxy
  shared/                           Shared frontend adapter/utilities
  Portal/                       Back-office frontend
  MungkhudShop/                     Front-office shop ERP
  tests/e2e/                        Playwright smoke tests
  docs/production-roadmap-app-first.md App-first production roadmap
  docs/archive/                     Old PocketBase-era documents
```

## Data And Auth

All frontend code should use the PocketBase-compatible shim, not direct NocoDB calls.

```js
const records = await pb.collection('jobs').getFullList({
  filter: "status='open'",
  sort: '-CreatedAt'
});
```

The shim lives in `shared/nocodb-adapter.js` and is exposed through:

| App | Data entry point |
| --- | --- |
| Portal | `Portal/src/services/pocketbase.js` |
| MungkhudShop | `MungkhudShop/src/services/pb.js` |

JWT storage is unified across both apps:

- `mungkhud_jwt`
- `bcauto_jwt`

Both keys are written so SSO-style handoff between Portal and MungkhudShop keeps working after the migration from PocketBase to NocoDB.

Current app-first development uses a dev portal session instead of production login. The stable session keys are:

- `bcauto_dev_auth`
- `bcauto_role`
- `bcauto_user_id`
- `bcauto_user_name`
- `bcauto_auth_model`
- `bcauto_branch`

Production authentication and LINE Login are deferred until the core app workflows are pilot-ready.

## API Server

The API server is the security boundary between browser clients and NocoDB.

Key files:

| File | Purpose |
| --- | --- |
| `api-server/server.js` | Express entry point and route registration |
| `api-server/lib/nocodb.js` | Server-side NocoDB client, table cache, retries, write queue |
| `api-server/middleware/jwt.js` | `requireAuth` and `requireRole` middleware |
| `api-server/middleware/rate-limit.js` | Auth and API rate limiting |
| `api-server/middleware/validate.js` | Per-table input validation |
| `api-server/routes/auth.js` | Login, PIN login, password changes, current user |
| `api-server/routes/data.js` | JWT-protected CRUD proxy with branch scoping |
| `api-server/routes/notify.js` | JWT-protected Telegram notification proxy |
| `api-server/routes/upload.js` | Attachment upload proxy |

Destructive dev routes are disabled by default. Set `ENABLE_DEV_ROUTES=true` only in a disposable local environment.

Routes:

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | none | Username/password login, returns JWT |
| `POST` | `/api/auth/pin-login` | none | PIN login for shared tablets |
| `POST` | `/api/auth/password-login` | none | Legacy email/password login alias |
| `POST` | `/api/auth/change-password` | JWT | Change current user password |
| `GET` | `/api/auth/me` | JWT | Read current user |
| `GET` | `/api/auth/tables` | JWT | List cached NocoDB tables |
| `GET` | `/api/data/:table` | JWT | Paginated records |
| `GET` | `/api/data/:table/all` | JWT | All records |
| `GET` | `/api/data/:table/:id` | JWT | One record |
| `POST` | `/api/data/:table` | JWT | Create record |
| `PATCH` | `/api/data/:table/:id` | JWT | Update record |
| `DELETE` | `/api/data/:table/:id` | JWT | Delete record |
| `POST` | `/api/notify/*` | JWT | Telegram notification actions |
| `GET` | `/api/health` | none | Health check |
| `POST` | `/api/data/custom/confirm-document/:id` | JWT | Confirm document + post stock ledgers atomically |
| `POST` | `/api/data/custom/void-document/:id` | JWT | Void document + reverse stock ledgers |
| `GET` | `/api/data/custom/stock-balances` | JWT | Aggregated stock qty by product (server-side SUM) |
| `GET` | `/api/data/custom/generate-doc-id` | JWT | Generate next document number for a prefix |
| `POST` | `/api/data/custom/upsert-customer` | JWT | Atomic create-or-find customer |
| `POST` | `/api/data/custom/upsert-vehicle` | JWT | Atomic create-or-find vehicle |
| `GET` | `/api/data/custom/branch-metadata` | none | Active branch metadata for app-wide selectors |
| `GET` | `/api/data/custom/manager-dashboard` | JWT/dev auth | Server-side dashboard KPIs, trends, branch comparison, and alerts |
| `GET` | `/api/data/custom/admin/branches` | JWT/dev auth (admin/owner) | List branch metadata for Admin Suite |
| `POST` | `/api/data/custom/admin/branches` | JWT/dev auth (admin/owner) | Create a branch metadata record |
| `PATCH` | `/api/data/custom/admin/branches/:id` | JWT/dev auth (admin/owner) | Update a branch metadata record |
| `DELETE` | `/api/data/custom/admin/branches/:id` | JWT/dev auth (admin/owner) | Deactivate a branch metadata record |
| `POST` | `/api/data/custom/admin/branches/migrate` | JWT/dev auth (admin/owner) | Dry-run or apply branch code migrations |
| `GET` | `/api/data/custom/admin/roles` | JWT/dev auth (admin/owner) | List normalized role permission metadata |
| `POST` | `/api/data/custom/admin/roles` | JWT/dev auth (admin/owner) | Upsert role-to-tool metadata |
| `GET` | `/api/data/custom/integrity/stock-check` | JWT (admin) | Detect stock integrity issues |
| `GET` | `/api/data/custom/integrity/document-check` | JWT (admin) | Detect document integrity issues |
| `POST` | `/api/data/custom/admin/recalculate-costs` | JWT (admin) | Recalculate weighted average cost for all products |
| `POST` | `/api/data/custom/admin/integrity/repair` | JWT (admin) | Run conservative safe integrity repair or dry-run |

Integrity details:

- Admin UI: `Portal/src/pages/admin/integrity-check.html`
- Documentation: `docs/phase-2-integrity-checks.md`
- Automated check: `cd api-server && npm.cmd run check:mungkhud-integrity`

RBAC notes:

- Non-admin/owner users are automatically branch-scoped for branch-owned tables.
- Financial and audit tables are restricted to owner/manager/admin roles.
- `system_settings`, `system_roles`, and user administration are admin-oriented surfaces.
- Branches and role-to-module visibility are metadata-driven. Static frontend registry values are bootstrap fallback only.
- Writes are serialized in `lib/nocodb.js` to reduce SQLite lock contention.

Environment variables:

| Variable | Description |
| --- | --- |
| `NOCODB_URL` | Internal NocoDB URL, usually `http://bctest-nocodb:8080` |
| `NOCODB_TOKEN` | Server-side NocoDB API token |
| `JWT_SECRET` | Secret used to sign browser JWTs |
| `PORT` | API port inside the container, usually `3000` |

## Portal App

Back-office Vite multi-page app for admin, HR, finance, operations, and dashboards.

Important files:

| File | Purpose |
| --- | --- |
| `Portal/src/registry.js` | Tool registry and role visibility |
| `Portal/vite.config.js` | MPA build inputs |
| `Portal/src/services/pocketbase.js` | Data shim over the shared NocoDB adapter |
| `Portal/src/services/authService.js` | Login, roles, SSO token handoff, page gating |
| `Portal/src/services/configService.js` | Dynamic settings and role-to-tool permissions |
| `Portal/src/services/auditService.js` | Audit trail logging |
| `Portal/src/components/ui.js` | Toasts, loading overlay, image modal |
| `Portal/src/components/branch-switcher.js` | Branch selector for privileged users |
| `Portal/src/assets/js/app-shell.js` | Global sidebar shell |
| `Portal/src/utils/helpers.js` | Formatting, dates, image compression |

Adding a Portal page:

1. Create `Portal/src/pages/my-feature/index.html`.
2. Add the page to `Portal/src/registry.js`.
3. Add the page to `Portal/vite.config.js` under `build.rollupOptions.input`.
4. Rebuild with `npm run build`.

Common globals:

```js
window.showToast('Saved', 'success');
window.showLoading();
window.hideLoading();
window.showImage(imageUrl);
```

CSS load order for pages:

1. `assets/css/design-system.css`
2. `assets/css/page-header.css`
3. `assets/css/style.css`
4. `assets/css/app-shell.css`
5. Optional page-specific CSS

Portal pages:

| Page | Path | Primary roles |
| --- | --- | --- |
| Main menu | `pages/main/index.html` | all |
| Dashboard | `pages/dashboard/index.html` | owner, manager, admin |
| Expense entry | `pages/branch-operations/entry.html` | owner, manager, admin |
| Verification | `pages/branch-operations/verification.html` | owner, manager, admin |
| Audit | `pages/branch-operations/audit.html` | owner, manager, admin |
| Operations hub | `pages/operations/index.html` | owner, manager, admin, sa |
| Mechanic board | `pages/mechanic/index.html` | mechanic, manager, admin |
| HR check-in | `pages/hr/checkin.html` | all |
| HR dashboard | `pages/hr/index.html` | owner, manager, admin |
| HR summary | `pages/hr/hrdashboard.html` | owner, manager, admin |
| Payroll | `pages/hr/payroll.html` | owner, manager, admin |
| Leave | `pages/hr/leave.html` | owner, manager, admin |
| Admin suite | `pages/admin/index.html` | admin |
| User management | `pages/admin/user-management.html` | admin |
| Branches | `pages/admin/branches.html` | admin |
| Role manager | `pages/admin/RoleManager.html` | admin |
| Settings | `pages/admin/settings.html` | admin |
| Audit logs | `pages/admin/audit-logs.html` | admin |
| System health | `pages/admin/system-health.html` | admin |
| Backup center | `pages/admin/backup-center.html` | admin |
| Data check | `pages/admin/data-check.html` | admin |

## MungkhudShop App

Front-office Vite SPA for service jobs, inventory, purchasing, documents, and shop reports.

Important files:

| File | Purpose |
| --- | --- |
| `MungkhudShop/src/app.js` | Hash router and shell orchestration |
| `MungkhudShop/src/services/pb.js` | Data shim over the shared NocoDB adapter |
| `MungkhudShop/src/services/auth.js` | Shop login/session handling |
| `MungkhudShop/src/services/inventory.js` | Stock and ledger helpers |
| `MungkhudShop/src/services/telegram.js` | Notification calls through `/api/notify/*` |
| `MungkhudShop/src/pages/` | Route modules |
| `MungkhudShop/src/utils/sanitize.js` | Filter value escaping |

Core routes include dashboard, jobs, kanban, customer/vendor/product masters, documents, inventory, stock ledgers, requisitions, goods receipt, reports, settings, and user permissions.

## Database

Current NocoDB base: `BC_ERP`.

Key tables:

| Table | Purpose |
| --- | --- |
| `users` | User accounts, roles, branch, password hash, PIN |
| `branches` | Branch locations and Telegram chat settings |
| `financial_ledger` | Income, expenses, owner withdrawals |
| `hr_attendance` | Employee check-in/out |
| `hr_leaves` | Leave requests |
| `jobs` | Service work orders |
| `job_items` | Work order line items |
| `documents` | Quotations, invoices, purchasing docs, stock docs |
| `document_items` | Document line items |
| `stock_ledgers` | Inventory movements |
| `products` | Product master |
| `customers` | Customer master |
| `vehicles` | Vehicle master |
| `vendors` | Vendor master |
| `system_roles` | Role-to-menu/tool permissions |
| `settings` | System configuration |
| `audit_logs` | Audit trail |

NocoDB field notes:

- Most business fields are lowercase, for example `name`, `phone`, `branch_id`.
- NocoDB system fields are PascalCase: `Id`, `CreatedAt`, `UpdatedAt`.
- Frontend records are normalized to also expose `id`.
- Unknown fields usually produce NocoDB 400 responses.

## Roles

| Role | Access |
| --- | --- |
| `admin` | Full system and configuration |
| `owner` | All branches and financial visibility |
| `manager` | Branch operations, HR, reports, finance surfaces |
| `sa` | Service advisor operations |
| `mechanic` | Assigned jobs and mechanic workflow |

## Testing And Verification

Recommended checks after changes:

```bash
cd Portal
npm run lint
npm run typecheck
npm run build

cd ../MungkhudShop
npm run build

cd ../api-server
node --check server.js
node --check routes/auth.js
node --check routes/data.js
node --check routes/notify.js
npm run check:dev-portal-auth
npm run check:metadata-foundation
```

API smoke:

```powershell
$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://localhost:9093/api/auth/login -Method Post -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri http://localhost:9093/api/auth/me -Headers $headers
Invoke-RestMethod -Uri http://localhost:9093/api/data/branches?limit=1 -Headers $headers
```

E2E tests live in `tests/e2e/` and use Playwright. They require a local browser process to launch successfully.

## Documentation Policy

- Keep active project documentation in this `README.md`.
- Keep AI workflow and coding rules in `AI_GUIDE.md`.
- Do not add new module-level `README.md` files unless the project deliberately splits docs again.
- PocketBase-era files under `docs/archive/` are historical and should not drive new development.
