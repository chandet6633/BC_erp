# Catalog and Admin Auth Design

## Understanding Summary

- Warranty card registration must read selectable products, film options, and install centers from NocoDB.
- Customers only access QR routes: `/v`, `/register`, and `/details`.
- `/admin`, `/glassify`, `/idash`, and `/kensho` are admin-only.
- Admin users live in NocoDB with a single `Admin` role for now.
- Catalog data is split into `Products`, `FilmOptions`, `InstallCenters`, and `AdminUsers`.
- Glassify film options are one row per selectable film/VLT, grouped by series.

## Assumptions

- The current NocoDB base can be extended with new tables.
- Dev auth can use simple password handling, isolated so hashing can replace it later.
- The server remains the only component with the NocoDB API token.
- Existing warranty records remain valid; catalog tables affect new generation and registration.

## Decision Log

- Use separate NocoDB tables instead of a generic catalog table because fields and validation differ by item type.
- Use a server-side catalog API layer so the NocoDB token is not exposed to browsers.
- Keep QR routes public and protect all admin/catalog/card-generation routes.
- Use one Admin role now; role-based expansion can happen later without changing route structure.
- Seed catalog defaults from the current app once, so the system works immediately after schema creation.

## Final Design

NocoDB tables:

- `Products`: `brandId`, `brandName`, `name`, `variant`, `warrantyYears`, `category`, `active`, `sortOrder`, `notes`.
- `FilmOptions`: `brandId`, `series`, `filmName`, `warrantyYears`, `active`, `sortOrder`, `notes`.
- `InstallCenters`: `name`, `location`, `phone`, `active`, `sortOrder`, `notes`.
- `AdminUsers`: `username`, `password`, `role`, `active`, `displayName`.

Server APIs:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- CRUD under `/api/catalog/products`, `/api/catalog/film-options`, and `/api/catalog/install-centers`.

Customer registration reads active catalog records. Admin screens can read and edit active or inactive records. Card generation requires a product for iDash and KENSHO Beam; Glassify physical cards stay product-blank until the customer chooses film options during QR registration.
