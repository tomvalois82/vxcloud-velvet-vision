# Architecture rules

- Prepare OFX person-registration defaults in the parser utility and pass unmasked document digits to the shared person dialog, so document detection remains testable and the existing dialog owns masking and validation.
- Persist OFX drafts as validated browser-local JSON scoped to authenticated user and bank account; restore only after consent and update pending rows after successful inserts to avoid recovering already imported entries.
- Prepare OFX movement payloads in a pure utility shared by all import paths, including purchase dates, so database-trigger inputs remain testable without changing financial rules.
- Load purchase candidates and closed-cycle plate history through the purchase vehicle service using the existing cycle view; keep eligibility and plate search in tested pure utilities so sold cycles and other purchases cannot enter the candidate list.
- Validate vehicle plate duplication through normalized active cycle rows; query closed cycles by identifiers on the server and reuse the latest stock ID with the view's total cycle count to avoid loading historical stock wholesale.