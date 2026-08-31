# BC Auto Portal — Troubleshooting Guide

> Solutions for common issues encountered while working on the BC Auto Portal codebase.
> Last updated: 2026-03-17

---

## 1. Port 8092 Conflict (PocketBase)

**Symptom**: PocketBase fails to start or API returns 404/Connection Refused.

**Cause**: Another process holding port 8092.

**Fix**:
```bash
netstat -ano | findstr :8092
taskkill /PID <PID> /F
# Then restart PocketBase
.\pocketbase.exe serve --http=0.0.0.0:8092
```

---

## 2. PocketBase API Errors (400/403)

**Symptom**: Query returns `400 Client Error` or `403 Forbidden`.

**Checklist**:
1. **Authentication**: Check `pb_auth` cookie exists in browser DevTools
2. **Collection Rules**: PB Admin → Collection → API Rules tab
3. **Schema Mismatch**: Compare JS field names with `Docs/schema_reference.md`
4. **Filter Syntax**: Trailing `&&` from empty `getBranchFilter()` — should return `'id!=""'`

---

## 3. Vite Build Failures

**Symptom**: `npm run build` fails with "Could not resolve..." or syntax error.

**Fixes**:
1. Check import paths (relative vs absolute)
2. Verify imported files exist at the specified path
3. Run `npm install` for missing dependencies
4. Check `vite.config.js` — new pages must be registered in `rollupOptions.input`

---

## 4. Blank Page After Build (Inline Script Stripping)

**Symptom**: Page works in dev but is blank/broken in production.

**Cause**: Vite strips `<script type="module">` blocks from HTML during build.

**Fix**: Move inline logic to a separate `.js` file:
```html
<!-- ❌ Stripped in production -->
<script type="module">
  document.getElementById('foo').classList.remove('hidden');
</script>

<!-- ✅ Survives build -->
<script type="module" src="./logic.js"></script>
```

---

## 5. Auth/Session Issues

**Symptom**: Users logged out after refresh, or role reverts.

**Checklist**:
1. Check `bcauto_role` and `bcauto_user` in **Session** Storage
2. Check `pb.authStore.isValid` in console
3. Ensure `ConfigService.init()` runs early (check `app-shell.js`)
4. Check `last_force_logout` isn't newer than login time (`authService.js:17-23`)

---

## 6. Service Worker Cache Staleness

**Symptom**: Users see old version after deploy.

**Fixes**:
1. Tell users to press `Ctrl+F5` (Hard Refresh)
2. Update `sw.js` cache version to force cache invalidation
3. Clear `Application → Storage → Cache Storage` in DevTools

---

## 7. Docker Issues

**Symptom**: Container fails to start or is unhealthy.

**Fixes**:
```bash
# Check container logs
docker compose logs portal

# Rebuild
docker compose build portal --no-cache

# Check health
docker compose ps
curl http://localhost:8092/api/health
```

---

## 8. AuditService Undefined

**Symptom**: Console shows `AuditService is undefined`.

**Cause**: Normal — the global proxy in `pocketbase.js` handles this automatically by dynamically importing `auditService.js` on first CRUD. No action needed.

---

> [!TIP]
> For server-side errors, check `pb_data/logs.db` via PB Admin → Logs.
