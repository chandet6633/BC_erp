# BC Auto Management — UI Patterns & Aesthetic

> AI agents **MUST** follow these patterns for a premium, consistent, glassmorphic experience.
> Last updated: 2026-03-17

---

## 1. The Glassmorphic Core

The app uses a premium "Glass" aesthetic:

- **CSS Variables**: `--glass-bg` (transparent white), `--blur-md` (12px blur)
- **Core Classes**: `.card`, `.glass-panel`
- **Glow Effects**: `.shimmer` class for interactive elements

```css
/* Glassmorphism pattern */
background: var(--glass-bg);
backdrop-filter: blur(var(--blur-md));
border: 1px solid rgba(255, 255, 255, 0.3);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-md);
```

---

## 2. Color Palette (Slate + Blue 600)

| Token | Value | Usage |
|-------|-------|-------|
| `--primary-600` | `#2563eb` | Branding, primary buttons, active states |
| `--surface-50` to `--surface-900` | Slate scale | Backgrounds, text, borders |
| `--success` | `#10b981` | Positive records, verified states |
| `--danger` | `#ef4444` | Delete actions, negative values, errors |

---

## 3. Typography & Language

- **Thai Language**: Always use Thai for UI labels, buttons, headings, placeholders
- **Fonts**: `Prompt` (Thai text), `Inter` (numbers/English)
- **Sizes**: `.text-lg` for card titles, `.text-sub` for hints

---

## 4. Component Patterns

### Skeleton Loaders
```javascript
UIService.generateTableSkeleton(cols, rows)
```
Use **before** data fetching. Never use plain spinners.

### Empty States
```javascript
UIService.generateEmptyStateRow(cols, 'ไม่มีข้อมูล', 'ลองเปลี่ยนเงื่อนไขการค้นหา')
```
Show when queries return zero rows.

### Context Menus (Three-Dot)
```javascript
UIService.generateActionMenu(recordId, actions)
```
Do NOT clutter rows with inline Edit/Delete buttons.

### Validation Wizards
Multi-step forms with real-time green/red indicators. Reference: `admin/user-management.html`.

### Inline Card Editing
For KPI cards where speed is critical:
- **Idle**: Formatted currency with `cursor: pointer`
- **Editing**: Centered `<input>` with auto-focus
- **Save**: `Enter` key, pulse with `rgba(34,197,94,0.1)` for 1s
- **Cancel**: `Escape` or `blur`

---

## 5. Layout Patterns

- **Tables**: Wrap in `.table-container` for mobile scroll
- **Buttons**: `.btn-primary` (main), `.btn-outline` (secondary), pill-shaped by default
- **Toasts**: `showToast(msg, type)` instead of `alert()`
- **Touch targets**: Min `48px` height (mobile PWA)
- **Navigation**: `#app-sidebar` (desktop) + `#app-bottom-nav` (mobile)

---

## 6. PWA Requirements

Every new entry page **MUST** include:
- PWA meta tags (`theme-color`, link to `manifest.json`)
- `app-shell.js` import (handles service worker + sidebar)

---

> [!TIP]
> For reference implementation, see `src/pages/dashboard/index.html` (latest header and grid patterns).
