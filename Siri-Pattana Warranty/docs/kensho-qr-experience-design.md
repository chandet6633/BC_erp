# KENSHO Beam QR Experience Design

## Understanding Summary

- Redesign the KENSHO Beam customer-facing QR pages: `/register?id=...` and `/details?id=...`.
- The experience should feel premium, hi-tech, and performance-oriented instead of using the fixed UV Gard-style certificate template.
- Customers scanning for the first time should see the purchased KENSHO product in an animated performance stage beside the registration form.
- Customers scanning again should see a KENSHO-styled digital warranty card with the same visual language.
- Admin card generation remains product-specific for KENSHO.
- Glassify and iDash are out of scope for this pass.

## Assumptions

- Opening video assets will be uploaded later.
- The implementation should include a video-ready slot and use existing product image animation as the fallback.
- Existing KENSHO product images are sufficient for the first implementation.
- No database schema change is required.
- The warranty rule remains 2 years for all KENSHO Beam LED products.
- Public QR pages remain accessible without login.

## Decision Log

- Chosen style: aggressive performance.
- Alternatives considered: dark hi-tech premium and clean luxury premium.
- Reason for chosen style: best match for LED performance products and strongest product-specific customer impression.
- Animation choice: lightweight CSS/JS image stage now, optional video slot later.
- Scope decision: KENSHO QR register/details only, not the admin workspace or other brands.

## Final Design

The KENSHO registration page uses a dark performance layout with electric blue-white light beams, product image, serial, model, 2-year warranty badge, and a clear registration form. The product is locked from the generated physical card.

The KENSHO details page uses a digital warranty card rather than the fixed certificate template. It shows verified status, product image, serial, product model, customer, vehicle, plate, install center, install date, expiry date, and coverage duration.

When video assets are available, the product stage should render the video opening animation first. Until then, the product image fallback remains active.

## Video Optimization

Opening videos should be optimized as mobile web assets:

- Keep MP4/H.264 as the primary format for iPhone and Android compatibility.
- Remove audio because the animation is decorative and autoplay must stay muted.
- Limit width to about 1280px and 24fps.
- Use `-movflags +faststart` so playback can begin before the full file downloads.
- Target roughly 1-4 MB per product if visual quality allows.

Run this after installing `ffmpeg`:

```powershell
.\tools\optimize-kensho-videos.ps1
```

The public page lazy-loads the video after the initial product image/poster is visible. If the customer has Data Saver enabled or reduced motion enabled, the page keeps the poster/product image and skips the video download.
