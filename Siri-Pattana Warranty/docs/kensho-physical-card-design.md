# KENSHO Beam Physical Warranty Card

## Understanding Summary

- Create a KENSHO Beam physical warranty card for QR activation.
- Use a landscape business-card format with front and back faces.
- Keep the existing QR registration workflow unchanged.
- Product is assigned before card generation, so the card can show the KENSHO model name.
- The card is for printing and customer activation, not for storing private customer data.
- Text on the physical card is bilingual: English first, Thai second.

## Assumptions

- Business-card ratio is treated as 3.5 x 2 inches, implemented as a stable 7:4 aspect ratio in CSS.
- The card is generated from HTML/CSS in the admin card generator and lookup previews.
- QR code must remain large enough to scan reliably from a printed business card.
- KENSHO uses the existing website logo asset and dark hi-tech styling.

## Decision Log

- Front + back layout was chosen over a single-face card for a more premium print result.
- Product images were removed to keep the card cleaner and avoid print clutter.
- The small support line was removed to keep the back focused on QR activation.
- Bilingual text was chosen for customer clarity in Thailand.
- Glassify and iDash keep the existing physical card template for now.

## Final Design

Front face:
- KENSHO logo.
- Product name/model.
- `2 Year Warranty / รับประกัน 2 ปี`.
- Premium black, blue, and subtle beam/grid styling.

Back face:
- QR code as the primary element.
- `Scan to activate / สแกนเพื่อลงทะเบียน`.
- Serial/card ID.

No customer personal data is printed on the physical card.
