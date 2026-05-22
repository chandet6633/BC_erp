# JOURNAL.md — Development Journal

> Session notes, discoveries, and learnings. Most recent first.

---

## 2026-05-04 — Project Initialization (/new-project)

### Questioning Phase
- Deep-dived into MungkhudShop codebase: job.js (527 lines), kanban.js (393 lines), forms.js (309 lines), job-data.js (257 lines), inventory.js (198 lines)
- Identified 6 working features, 7 broken/missing areas
- User clarified: combined customer+vehicle card, ad-hoc items with product type, mechanic from users table, daily kanban reset, editable print templates, customer history page
- Brainstormed 8 additional features, user approved 6: quick print, payment status+proof, duplicate prevention, daily summary, job timer, vehicle service badge
- Mobile-first design added as cross-cutting requirement

### Key Audit Findings
- Technician field is free text (not linked to users table) — needs mechanic dropdown
- Kanban shows ALL closed jobs forever — needs daily archive
- Customer ↔ Vehicle link exists in schema but never written from job form
- No inline customer/vehicle creation — must pre-exist in master data
- No ad-hoc item support — every line item tries to match products table
- Print templates have no logo/QR support — hardcoded HTML
- No payment status tracking — can't tell if job is paid
- No duplicate prevention — can create 2 open jobs for same plate

### Documents Created
- SPEC.md: 14 features, 7 non-goals, 10 success criteria
- ROADMAP.md: 5 phases (Schema → Job Card → Kanban/Payment → Print/History → Polish)
- REQUIREMENTS.md: 28 testable requirements
- ARCHITECTURE.md, STACK.md (from /map)

---

## 2026-05-04 — Codebase Mapping (/map)

Ran `/map` on the webapp directory. Documented:
- 5 components, 27 NocoDB tables, 10 production dependencies
- Full data flow from browser → Nginx → Express → NocoDB
- 8 technical debt items identified
- Architecture and Stack documents created in `.gsd/`
