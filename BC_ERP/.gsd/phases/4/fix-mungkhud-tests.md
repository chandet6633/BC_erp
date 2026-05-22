---
phase: 4
plan: fix-mungkhud-tests
wave: 1
gap_closure: true
---

# Fix Plan: MungkhudShop Test Locators

## Problem
The `mungkhud-history.spec.js` and `mungkhud-job-flow.spec.js` tests are failing because they are looking for generic placeholders or `name` attributes (e.g., `input[placeholder*="search"]`) instead of the actual autocomplete inputs injected by the UI framework (e.g., `#customerSearchAC input` and `#jobPlateAC input`).

## Tasks

<task type="auto">
  <name>Fix History Spec</name>
  <files>tests/e2e/specs/mungkhud-history.spec.js</files>
  <action>Change `searchInput` locator to target `#customerSearchAC input`.</action>
  <verify>Run the spec and ensure it passes.</verify>
  <done>Spec passes.</done>
</task>

<task type="auto">
  <name>Fix Job Flow Spec</name>
  <files>tests/e2e/specs/mungkhud-job-flow.spec.js</files>
  <action>Change `plateInput` locator to target `#jobPlateAC input`.</action>
  <verify>Run the spec and ensure it passes.</verify>
  <done>Spec passes.</done>
</task>
