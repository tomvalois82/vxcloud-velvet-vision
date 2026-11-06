# Architecture rules

- Prepare OFX person-registration defaults in the parser utility and pass unmasked document digits to the shared person dialog, so document detection remains testable and the existing dialog owns masking and validation.