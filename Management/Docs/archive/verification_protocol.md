# BC Auto Management — Verification Protocol

> AI agents **MUST** complete this checklist before marking any change as done.
> Last updated: 2026-03-17

---

## 1. Build Integrity

- [ ] **Build Check**: Run `npm run build` in the Management root.
  ```bash
  cd Management
  npm run build
  # Expected: "✓ built in Xs" with 0 errors
  ```
- [ ] **File Location**: New files are in correct directory (`src/services/`, `src/pages/`, etc.) with camelCase naming.
- [ ] **Vite Config**: New pages are registered in `vite.config.js` → `build.rollupOptions.input`.
- [ ] **No Inline Scripts**: No `<script type="module">` blocks in HTML — all logic in separate `.js` files.

---

## 2. Browser Verification

- [ ] **Console Watch**: Open DevTools → Console. Check for red errors.
  - Look for: PocketBase auth errors, "Failed to load module", 404s
- [ ] **Mobile Responsiveness**: Resize to 375px width.
  - Buttons reachable, tables scrollable, sidebar collapses
- [ ] **Branch Isolation**: Log in as a branch-specific user, verify only that branch's data is visible.

---

## 3. Data Integrity

- [ ] **Financial Calculation**: If modifying financial logic, verify sample: `Revenue - Cost = Profit`.
- [ ] **30-Minute Rule**: If editing employee-entry logic, test that Edit button disappears after 30min.
- [ ] **Audit Trail**: After any CRUD operation, check `audit_logs` collection:
  ```
  PB Admin → http://localhost:8092/_/ → audit_logs → verify action logged
  ```

---

## 4. Docker Verification (if applicable)

- [ ] **Container Build**: `docker compose build management` completes without errors.
- [ ] **Container Start**: `docker compose up -d management` → container healthy.
- [ ] **Health Check**: `curl http://localhost:8092/api/health` returns 200.

---

## 5. Final Handover

- [ ] **Thai Language**: All new user-facing text is in Thai.
- [ ] **No Placeholders**: No "TODO" or placeholder text in committed code.
- [ ] **Registry Check**: New tools registered in `src/registry.js` with correct roles array.
- [ ] **Role Names**: Using current role names (`sa`, `mechanic`) not legacy names (`employee`).

---

## 6. PWA Health

- [ ] **Service Worker**: Console shows "SW Registered" on page load.
- [ ] **Manifest**: DevTools → Application → Manifest shows valid config.
- [ ] **Install Prompt**: Browser "Install" option available.

---

> [!IMPORTANT]
> If any step fails, do NOT proceed. Revert the breaking change and fix before notifying the user.
