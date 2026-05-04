# DECISIONS.md — Architecture Decision Records

> Decisions that shape the project. Add new entries at the bottom.

## ADR-001: NocoDB over PocketBase
- **Date:** 2026-04
- **Decision:** Migrated from PocketBase to NocoDB (SQLite) as the database backend
- **Rationale:** NocoDB provides a more flexible REST API, better admin UI for non-technical users, and avoids PocketBase auth limitations
- **Consequence:** Required building a custom Express API middleware layer to handle JWT auth and xc-token isolation

## ADR-002: Express API Middleware
- **Date:** 2026-04
- **Decision:** All browser-to-database communication goes through an Express API server
- **Rationale:** Keeps the NocoDB xc-token server-side only (security), enables RBAC, rate limiting, input validation, audit logging, and write serialization
- **Consequence:** Added a 4th container to the Docker stack; all CRUD operations must be proxied

## ADR-003: SHA-256 Password Hashing
- **Date:** 2026-05
- **Decision:** All passwords and PINs are SHA-256 hashed before storage
- **Rationale:** Simple, fast, and sufficient for an internal ERP. Express middleware auto-hashes on POST/PATCH to prevent plaintext storage
- **Consequence:** Cannot recover passwords — only reset

## ADR-004: SSO via Base64 Token
- **Date:** 2026-04
- **Decision:** Cross-app authentication between Management and MungkhudShop uses Base64-encoded JSON tokens with embedded JWT
- **Rationale:** Avoids shared cookie complexity; works with separate Nginx containers on different ports
- **Consequence:** 5-minute expiry window; token must include JWT for authenticated API calls in the target app

## ADR-005: Admin-Assigned Passwords (No Forced Reset)
- **Date:** 2026-05
- **Decision:** Admins explicitly set passwords during user creation; employees can voluntarily change via the topbar modal but are not forced to on first login
- **Rationale:** Simpler UX for a small team; avoids disruption for tablet-based shared devices
- **Consequence:** Users may keep initial passwords indefinitely
