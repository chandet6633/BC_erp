# AI Development Guide — BC AutoXperience Webapp

> **⚠️ MANDATORY**: Every AI agent working on this codebase MUST read this file before making any changes.

---

## Before You Start

### 1. Read the Knowledge Items
Check the Antigravity knowledge base for these KIs:
- **`bcauto-webapp-architecture`** — Full system architecture, services, schema, CSS system
- **`bcauto-service-patterns`** — Copy-paste recipes for common tasks

### 2. Read the Project README
- [`webapp/README.md`](./README.md) — system overview, stack, ports, API routes, frontend services, and page map

### 3. Understand the Architecture
```
Browser → Nginx (/api/*) → Express API (JWT) → NocoDB (xc-token)
```
- The browser NEVER has the xc-token
- All data goes through `pb.collection('table').method()`
- CSS uses `design-system.css` — no Tailwind

---

## After Every Task — Documentation Checklist

### ✅ MANDATORY: Update docs if your changes affect any of these:

| What Changed | Update This |
|-------------|-------------|
| New page or tool | `README.md` (Management pages), `registry.js`, `vite.config.js` |
| New shared service | `README.md` (Data and Auth / app sections) |
| New API route | `README.md` (API Server routes table) |
| New NocoDB table or column | `README.md` (Database section) |
| New CSS class or component | `README.md` (Management CSS section) |
| New middleware or auth change | `README.md` (API Server section) |
| Architecture change | `README.md` |
| New reusable pattern | Knowledge Item: `bcauto-service-patterns` |
| Breaking change to existing service | Knowledge Item: `bcauto-webapp-architecture` |

### How to Update Knowledge Items
Knowledge Items live at:
```
C:\Users\Unique5270\.gemini\antigravity\knowledge\bcauto-webapp-architecture\artifacts\architecture-wiki.md
C:\Users\Unique5270\.gemini\antigravity\knowledge\bcauto-service-patterns\artifacts\service-cookbook.md
```
Update the relevant section directly. These files persist across all conversations.

---

## Coding Standards

### File Naming
- Pages: `kebab-case.html` (e.g., `system-health.html`)
- Services: `camelCase.js` (e.g., `authService.js`)
- CSS: `kebab-case.css` (e.g., `design-system.css`)

### HTML Page Template
Every page MUST include:
1. Inter font + Material Icons from Google Fonts
2. `design-system.css` → `page-header.css` → `style.css` → `app-shell.css`
3. `<body class="page-bg">`
4. `<div class="page-header">` with title + back button
5. `<script type="module" src="../../assets/js/app-shell.js"></script>` at end of body

### Data Access
```js
// ✅ Always use pb.collection()
const items = await pb.collection('table_name').getFullList();

// ❌ Never use fetch() to NocoDB directly
```

### Error Handling
```js
// ✅ Always wrap AuditService in try/catch
try { AuditService.log('action', 'detail', 'category'); } catch {}

// ✅ Always show user-facing feedback
window.showToast?.('สำเร็จ ✅', 'success');
```

### NocoDB Fields
- Always use **lowercase** field names: `name`, `phone`, `address`, `is_active`
- System fields are PascalCase: `Id`, `CreatedAt`, `UpdatedAt`
- Never send unknown field names — NocoDB returns 400

### Build & Deploy
```bash
# After frontend changes:
cd webapp/Management && npm run build

# After API server changes:
docker compose -f docker-compose.test.nocodb.yml up -d --build test-api
```

---

## Quick Reference: Key File Locations

| Need | File |
|------|------|
| Add a new tool | `Management/src/registry.js` + `Management/vite.config.js` |
| Data access | `Management/src/services/pocketbase.js` |
| Auth/roles | `Management/src/services/authService.js` |
| Toast/modal | `Management/src/components/ui.js` |
| Branch selector | `Management/src/components/branch-switcher.js` |
| Formatting utils | `Management/src/utils/helpers.js` |
| CSS design tokens | `Management/src/assets/css/design-system.css` |
| API CRUD routes | `api-server/routes/data.js` |
| NocoDB client | `api-server/lib/nocodb.js` |
| Nginx config | `nginx-test-management.conf` |
| Docker stack | `docker-compose.test.nocodb.yml` |
