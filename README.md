# BC AutoXperience — ERP Platform

> **Multi-branch auto-service ERP** for BC Bancha Group, Thailand.
> 
> ⚠️ **AI Agents**: Read [`AI_GUIDE.md`](./AI_GUIDE.md) before making any changes.

## Architecture (Current — NocoDB)

```
┌─────────────┐   ┌─────────────┐   ┌────────────────┐   ┌─────────────┐
│ Management  │   │ MungkhudShop│   │  Express API   │   │   NocoDB    │
│  (Nginx)    │   │   (Nginx)   │   │  (Node 20)     │   │  (SQLite)   │
│  Port 9092  │   │  Port 9091  │   │  Port 9093     │   │  Port 9080  │
│             │   │             │   │                │   │             │
│ Static HTML ├──►│ Static HTML ├──►│ JWT + CRUD     ├──►│ 24 tables   │
│ Vite Build  │   │ Vite Build  │   │ Proxy          │   │ BC_ERP base │
└─────────────┘   └─────────────┘   └────────────────┘   └─────────────┘
         │                │                 ▲
         └────────────────┴── /api/* ───────┘
                        (via Nginx proxy)
```

### Data Flow
```
Browser → Nginx (/api/*) → Express API (JWT verified) → NocoDB (xc-token)
```
- The **browser never touches the NocoDB xc-token**
- Express API (`api-server/`) holds the token server-side
- JWT tokens authenticate browser requests

## Quick Start

### Docker (Test Environment)
```bash
docker compose -f docker-compose.test.nocodb.yml up -d --build

# Management:  http://localhost:9092
# MungkhudShop: http://localhost:9091
# NocoDB Admin: http://localhost:9080
# API Health:   http://localhost:9093/api/health
```

### Frontend Development
```bash
cd Management
npm install
npm run dev    # Dev server at port 3000
npm run build  # Build → pb_public/ (served by Nginx)
```

## Project Structure

```
webapp/
├── AI_GUIDE.md                     # ⭐ AI agent instructions (READ FIRST)
├── api-server/                     # Express API middleware
│   ├── server.js                   # Entry point
│   ├── lib/nocodb.js               # NocoDB client (xc-token, retry, write queue)
│   ├── middleware/                  # JWT, rate-limit, validation
│   ├── routes/auth.js              # Login, register, change-password
│   └── routes/data.js              # CRUD proxy with RBAC + branch scoping
├── shared/                         # Code shared between frontends
│   ├── nocodb-adapter.js           # Frontend API client (JWT-authenticated)
│   ├── filter-translator.js        # PocketBase filter → NocoDB where clause
│   └── design-tokens.css           # Shared CSS variables
├── Management/                     # Back-office frontend (Vite MPA)
│   ├── src/registry.js             # ⭐ TOOL REGISTRY (all tools defined here)
│   ├── src/services/               # pocketbase, auth, audit, config, revenue
│   ├── src/components/             # ui, branch-switcher
│   ├── src/utils/helpers.js        # Formatting, dates, compression
│   ├── src/assets/css/             # Design system CSS
│   ├── src/pages/                  # All page modules
│   └── vite.config.js              # Build config (all page entries)
├── MungkhudShop/                   # Front-office shop ERP
├── docker-compose.test.nocodb.yml  # ⭐ Active Docker stack
├── nginx-test-management.conf      # Nginx config for Management
└── nginx-test-mungkhud.conf        # Nginx config for MungkhudShop
```

## Roles & Access

| Role | Access Level | Auth Method |
|------|-------------|-------------|
| `admin` | Full system access | Username + Password |
| `owner` | All branches, all tools | Username + Password |
| `manager` | Own branch, most tools | Username + Password |
| `sa` | Operations, check-in | Username + Password |
| `mechanic` | Check-in/out only | Username + Password |

## NocoDB Database (BC_ERP)

24 tables. Key tables:
- `users` — User accounts with roles
- `branches` — Branch locations with GPS (latitude/longitude)
- `financial_ledger` — Income/expense entries (branch-scoped)
- `hr_attendance` — Employee check-in/out (branch-scoped)
- `hr_leaves` — Leave requests (branch-scoped)
- `jobs`, `job_items` — Service work orders (branch-scoped)
- `system_roles` — Role → tool permission mapping
- `audit_logs` — System audit trail

## Build & Deploy

```bash
# Frontend rebuild
cd Management && npm run build

# API server rebuild
docker compose -f docker-compose.test.nocodb.yml up -d --build test-api

# Full stack rebuild
docker compose -f docker-compose.test.nocodb.yml up -d --build

# View logs
docker logs --tail 50 bctest-api
```

## Documentation

| Document | Purpose |
|----------|---------|
| [`AI_GUIDE.md`](./AI_GUIDE.md) | **AI agent instructions** — read before coding, update docs after |
| [`Management/README.md`](./Management/README.md) | Frontend services, components, pages reference |
| [`api-server/README.md`](./api-server/README.md) | API routes, middleware, NocoDB client reference |
