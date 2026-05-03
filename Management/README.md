# Management — Back-Office Frontend

> Vite Multi-Page App (MPA) serving the admin, HR, financial, and operations dashboards.
>
> ⚠️ **AI Agents**: Read [`../AI_GUIDE.md`](../AI_GUIDE.md) before making changes. Update this README if you add pages, services, or components.

## Quick Start

```bash
npm install
npm run dev    # Dev server at http://localhost:3000
npm run build  # Build → ../pb_public/ (served by Nginx container)
```

## Adding a New Page

1. **Create page**: `src/pages/my-feature/index.html`
2. **Register tool**: Add entry to `src/registry.js`
3. **Add to build**: Add to `vite.config.js` → `build.rollupOptions.input`
4. **Build**: `npm run build`

See [`../AI_GUIDE.md`](../AI_GUIDE.md) for the standard HTML template.

---

## Services

| Service | File | Global | Purpose |
|---------|------|--------|---------|
| **Data Access** | `services/pocketbase.js` | `window.pb` | PocketBase-compatible CRUD wrapper over NocoDB |
| **Auth** | `services/authService.js` | `window.AuthService` | Login, roles, page gating |
| **Config** | `services/configService.js` | `window.ConfigService` | Dynamic settings + role→tool permissions |
| **Audit** | `services/auditService.js` | — | Audit trail logging |
| **Revenue** | `services/revenueService.js` | — | Revenue calculations |
| **Transaction** | `services/transaction.js` | — | Transaction processing |
| **Entry** | `services/entry.js` | — | Expense entry logic |
| **UI Service** | `services/uiService.js` | — | Advanced UI rendering |
| **Report** | `services/reportService.js` | — | Report generation |

### Data Access — `pb.collection()`
```js
import { pb } from '../../services/pocketbase.js';

// List
const items = await pb.collection('branches').getFullList();
// Paginated
const page = await pb.collection('financial_ledger').getList(1, 25, { filter: "..." });
// Create
await pb.collection('table').create({ field: value });
// Update
await pb.collection('table').update(id, { field: value });
// Delete
await pb.collection('table').delete(id);
```

### Auth — `AuthService`
```js
import { AuthService } from '../../services/authService.js';

// Gate page access
if (!AuthService.requireRole(['admin', 'owner'])) return;

// Get user
const user = AuthService.getUser();
// → { id, name, role, branch, email }
```

---

## Components

| Component | File | Purpose |
|-----------|------|---------|
| **UI** | `components/ui.js` | Toast notifications, loading overlay, image modal |
| **Branch Switcher** | `components/branch-switcher.js` | Branch tab selector (admin/owner/manager) |
| **App Shell** | `assets/js/app-shell.js` | Global sidebar navigation |

### Toast
```js
window.showToast('สำเร็จ ✅', 'success');  // 'info', 'success', 'error', 'danger'
```

### Loading
```js
window.showLoading();
window.hideLoading();
```

### Image Viewer
```js
window.showImage(imageUrl);
```

---

## CSS Design System

### Files (load in this order)
1. `assets/css/design-system.css` — Core tokens, buttons, inputs, cards
2. `assets/css/page-header.css` — Standard page header layout
3. `assets/css/style.css` — Additional styles
4. `assets/css/glass-ui.css` — Glassmorphism effects (optional)
5. `assets/css/app-shell.css` — Sidebar navigation

### Key Classes
| Class | Purpose |
|-------|---------|
| `.page-bg` | Body background |
| `.page-header`, `.page-title`, `.page-subtitle` | Standard header |
| `.page-actions`, `.page-back-btn` | Header actions |
| `.card` | White card with shadow |
| `.btn .btn-primary`, `.btn-outline`, `.btn-ghost` | Buttons |
| `.btn-sm` | Small button |
| `.input` | Form inputs |
| `.modal-overlay` + `.active` | Modal dialog |

### Variables
```css
--primary-600, --primary-700     /* Brand blue */
--surface-50 to --surface-900    /* Gray scale */
--success-600, --danger          /* Status */
--space-1 to --space-8           /* Spacing */
--text-xs, --text-sm, --text-lg  /* Typography */
--radius-md, --radius-lg         /* Borders */
--shadow-sm, --shadow-md         /* Shadows */
```

---

## Utilities (`utils/helpers.js`)

All exported to `window.*` for legacy support:

| Function | Returns |
|----------|---------|
| `formatCurrency(num)` | `"1,234.56"` |
| `formatDate(str)` | Thai formatted date |
| `formatDateTime(str)` | Thai date + time |
| `getTodayThailand()` | `"2026-05-03"` in Bangkok TZ |
| `parseNumber(val)` | Clean number parse |
| `compressImage(file, maxWidth, quality)` | Compressed File blob |
| `debounce(fn, ms)` | Debounced function |
| `EXPENSE_CATEGORIES` | Array of category strings |

---

## Pages

| Page | Path | Roles | Description |
|------|------|-------|-------------|
| Main Menu | `pages/main/index.html` | All | Tool launcher |
| Dashboard | `pages/dashboard/index.html` | owner, manager, admin | Revenue analytics |
| Expense Entry | `pages/branch-operations/entry.html` | owner, manager, admin | Record expenses |
| Verification | `pages/branch-operations/verification.html` | owner, manager, admin | Verify transactions |
| Audit | `pages/branch-operations/audit.html` | owner, manager, admin | Audit trail |
| Operations Hub | `pages/operations/index.html` | owner, manager, admin, sa | Operations menu |
| Check-in/out | `pages/hr/checkin.html` | All roles | GPS attendance |
| HR Dashboard | `pages/hr/index.html` | owner, manager, admin | HR management hub |
| HR Summary | `pages/hr/hrdashboard.html` | owner, manager, admin | Attendance summary |
| Payroll | `pages/hr/payroll.html` | owner, manager, admin | Salary management |
| Leave | `pages/hr/leave.html` | owner, manager, admin | Leave requests |
| Admin Suite | `pages/admin/index.html` | admin | Admin dashboard |
| User Mgmt | `pages/admin/user-management.html` | admin | User CRUD |
| Branches | `pages/admin/branches.html` | admin | Branch + GPS mgmt |
| Role Manager | `pages/admin/RoleManager.html` | admin | Tool permissions |
| Settings | `pages/admin/settings.html` | admin | System settings |
| Audit Logs | `pages/admin/audit-logs.html` | admin | View audit logs |
| System Health | `pages/admin/system-health.html` | admin | System status |
| Backup Center | `pages/admin/backup-center.html` | admin | Database backup |
| Data Check | `pages/admin/data-check.html` | admin | Data integrity |
