# API Server — Express Middleware

> JWT-authenticated CRUD proxy between frontends and NocoDB.
>
> ⚠️ **AI Agents**: Read [`../AI_GUIDE.md`](../AI_GUIDE.md) before making changes. Update this README if you add routes or middleware.

## Architecture

```
Frontend → Nginx → THIS SERVER (JWT + RBAC) → NocoDB (xc-token)
```

This server:
- Holds the NocoDB `xc-token` server-side (never exposed to browsers)
- Issues JWT tokens on login
- Validates JWT on every `/api/data/*` request
- Enforces RBAC (role-based access control) and branch scoping
- Serializes writes to prevent SQLite BUSY errors
- Auto-retries on SQLITE_BUSY with exponential backoff

## Routes

### Auth Routes (`/api/auth/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | None | Username + password → JWT |
| POST | `/api/auth/pin-login` | None | PIN → JWT (employees) |
| POST | `/api/auth/password-login` | None | Email + password → JWT |
| POST | `/api/auth/change-password` | JWT | Change password |
| GET | `/api/auth/me` | JWT | Get current user info |

### Data Routes (`/api/data/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/data/:table` | JWT | List records (paginated) |
| GET | `/api/data/:table/all` | JWT | Get ALL records |
| GET | `/api/data/:table/:id` | JWT | Get single record |
| POST | `/api/data/:table` | JWT | Create record |
| PATCH | `/api/data/:table/:id` | JWT | Update record |
| DELETE | `/api/data/:table/:id` | JWT | Delete (admin/owner/manager) |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |

## RBAC Rules

### Branch Scoping (automatic)
Non-admin/owner users automatically have `branch_id` filters injected for:
`jobs`, `job_items`, `documents`, `document_items`, `stock_ledgers`, `hr_attendance`, `hr_leaves`, `financial_ledger`

### Financial Tables (owner/manager/admin only)
`financial_ledger`, `documents`, `document_items`, `audit_logs`

### Admin-Only Tables
`system_settings`, `system_roles`, `app_users`

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Entry point, registers routes |
| `lib/nocodb.js` | NocoDB client — CRUD, write queue, retry logic |
| `middleware/jwt.js` | `requireAuth`, `requireRole` middleware |
| `middleware/rate-limit.js` | Rate limiter (100 req/15min) |
| `middleware/validate.js` | Input validation per table |
| `routes/auth.js` | Authentication endpoints |
| `routes/data.js` | CRUD proxy with RBAC + branch scoping |

## NocoDB Client (`lib/nocodb.js`)

### Write Serialization
All writes go through `enqueueWrite()` to prevent SQLITE_BUSY:
```js
export function createRecord(table, data) {
    return enqueueWrite(async () => { /* ... */ });
}
```

### SQLITE_BUSY Retry
`nocoFetch()` automatically retries up to 5 times with exponential backoff when NocoDB returns SQLITE_BUSY.

### Table ID Resolution
On startup, `init()` fetches all table IDs from NocoDB and caches them in `tableIdMap`. Table names are resolved case-insensitively.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOCODB_URL` | `http://bctest-nocodb:8080` | NocoDB internal URL |
| `NOCODB_TOKEN` | (required) | NocoDB API token (xc-token) |
| `JWT_SECRET` | (required) | Secret for signing JWT tokens |
| `PORT` | `3000` | Server port |

## Build & Deploy

```bash
# Rebuild container
docker compose -f docker-compose.test.nocodb.yml up -d --build test-api

# View logs
docker logs --tail 50 bctest-api
```
