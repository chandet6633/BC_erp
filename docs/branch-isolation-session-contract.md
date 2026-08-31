# Branch Isolation And Session Contract

BC AutoXperience normal app sessions are single-branch sessions.

Users select one active real branch in the Portal before entering modules. `all` is not a normal UI branch and must not be offered in Portal, MungkhudShop, dashboards, HR, stock, jobs, reports, or Admin Suite user assignment flows.

## Browser Session Keys

New code writes only these neutral keys:

- `app.session.devAuth`
- `app.session.role`
- `app.session.userId`
- `app.session.userName`
- `app.session.authModel`
- `app.session.branchId`
- `app.session.branchLocked`
- `app.session.language`

Use `shared/session.js` for reads, writes, cleanup, and dev API headers. Legacy `bcauto_*` keys are read only by that helper for migration and should not be written by active code.

## Branch Rules

- `app.session.branchId` must be an active real branch ID.
- `app.session.branchLocked=true` for dev portal sessions.
- Admin, Owner, and Manager still work inside one selected branch at a time.
- Cross-branch reporting should be implemented later as a separate owner/admin reporting module.
- Cross-branch stock movement is allowed only through transfer documents:
  - source branch creates/confirms transfer
  - transfer stock becomes in-transit
  - destination branch can receive only transfers addressed to its selected branch
  - receiving creates destination IN ledger

## Reserved Legacy Scope

`all` remains reserved only for legacy compatibility, diagnostics, and future explicit reporting endpoints. Normal workflows should reject or recover from missing/`all` branch sessions instead of silently loading all-branch data.
