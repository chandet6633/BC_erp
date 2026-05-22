---
phase: 1
plan: 2
wave: 2
---

# Plan 1.2: Success Modal + Form UX Polish

## Objective
Replace the basic button color change with a premium glassmorphism success modal that matches the site's design language, and add client-side form validation for a polished UX.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- contact.html (after Plan 1.1 has wired the NocoDB backend)

## Tasks

<task type="auto">
  <name>Add premium success modal</name>
  <files>contact.html</files>
  <action>
    After a successful form submission, instead of just changing the button color:

    1. Create a glassmorphism modal overlay that appears with a fade-in animation
    2. Modal content:
       - Large animated checkmark icon (CSS animated, using Lucide `circle-check`)
       - "ส่งข้อมูลสำเร็จ!" heading
       - "เราจะติดต่อกลับภายใน 24 ชั่วโมง" subtitle
       - "ปิด" button that dismisses the modal
    3. The modal should use the same `--glass-card`, `--glass-blur`, `--brand` variables as the rest of the site
    4. Modal auto-dismisses after 5 seconds if user doesn't click close
    5. Form resets when modal closes

    CSS for the modal should be added inline in the existing `<style>` block (consistent with the site's pattern of inline styles).
  </action>
  <verify>Submit the form and verify the modal appears with correct animation, auto-dismisses, and the form resets</verify>
  <done>Premium success modal appears after form submission with fade-in animation, auto-dismiss, and form reset</done>
</task>

<task type="auto">
  <name>Add client-side form validation</name>
  <files>contact.html</files>
  <action>
    Add lightweight client-side validation before the API call:

    1. Phone number: Must be 9-10 digits (strip dashes before validation)
    2. Name (fname): Required, minimum 2 characters
    3. Show inline error messages below each invalid field using a `.form-error` class styled in red
    4. Prevent submission until validation passes
    5. Clear errors when user starts typing in the field

    Keep validation minimal — this is a lead form, not a checkout. Don't over-validate.
  </action>
  <verify>
    1. Submit with empty phone → shows error
    2. Submit with 3-digit phone → shows error
    3. Fill valid data → errors clear and form submits
  </verify>
  <done>Client-side validation prevents bad submissions and shows inline error messages</done>
</task>

## Success Criteria
- [ ] Success modal appears with glassmorphism styling after form submission
- [ ] Modal auto-dismisses after 5 seconds
- [ ] Phone and name validation prevents bad submissions
- [ ] Inline error messages appear and clear correctly
