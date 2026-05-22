# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Transform the highly polished static Glassify marketing site into a production-ready, performant, and lead-generating platform by integrating the NocoDB backend for bookings, optimizing for technical SEO, and elevating the UX with premium animations.

## Goals
1. Integrate the frontend contact form with NocoDB to automatically capture VIP booking leads.
2. Implement technical SEO and Open Graph (OG) tags to ensure beautiful rich previews when shared on social media (LINE, Facebook).
3. Enhance UX with subtle, premium micro-interactions and scroll-reveal animations.
4. Improve load performance by implementing lazy loading for heavy media assets (videos and high-res images).

## Non-Goals (Out of Scope)
- Developing a custom CMS (content will remain statically defined for now).
- Full E-commerce checkout integration (payments will continue to be handled offline/manually).
- Rewriting the site into a JavaScript framework like React/Next.js (we will keep the Vanilla HTML/JS structure for simplicity and raw speed).

## Users
- High-end vehicle owners looking for premium window film solutions.
- Prospects clicking through from social media campaigns (Facebook/LINE ads).

## Constraints
- Must remain compatible with the existing Vanilla HTML/CSS structure.
- NocoDB integration must handle API requests securely.

## Success Criteria
- [ ] VIP Contact form successfully writes data to a NocoDB table.
- [ ] Passing scores (90+) on Google PageSpeed Insights for Mobile and Desktop.
- [ ] Rich social previews correctly display the Glassify brand when linking the site on LINE/Facebook.
- [ ] Smooth, 60fps scroll-reveal animations without jank.
