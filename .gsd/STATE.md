# STATE.md — Project Memory

> Last updated: 2026-05-04

## Last Session Summary
Codebase mapping complete.
- 5 major components identified (API Server, Management, MungkhudShop, Shared, Infrastructure)
- 10 production dependencies analyzed across 3 packages
- 8 technical debt items found
- 27 NocoDB tables documented

## Current Branch
`feat/password-flow-redesign`

## Key Context
- System migrated from PocketBase to NocoDB (some legacy naming remains)
- Both frontends share one NocoDB database via Express API middleware
- All auth credentials are SHA-256 hashed server-side
- SSO between Management ↔ MungkhudShop uses Base64 JSON tokens with embedded JWT
- Write serialization prevents SQLITE_BUSY on the SQLite backend
- Date comparison filters are handled in JavaScript due to NocoDB v2 limitations
