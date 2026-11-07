# Architecture rules

- Prepare OFX person-registration defaults in the parser utility and pass unmasked document digits to the shared person dialog, so document detection remains testable and the existing dialog owns masking and validation.
- Persist OFX drafts as validated browser-local JSON scoped to authenticated user and bank account; restore only after consent and update pending rows after successful inserts to avoid recovering already imported entries.