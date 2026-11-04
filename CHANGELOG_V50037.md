# KeySuite V5.00.37

Built from the supplied V5.00.36 FULL BUILD. No production deployment or database write was performed.

## Changes

1. Old Bug 001: integrated the investigated CHC catalogue/pricing-category separation. All shared pricing lookups validate supplied category objects and fall back to the selected customer's assigned category. ISO has the same guard. ES pricing, six source columns, separate Assembly/Individual trails and audit permissions are retained. ISO business settings are not invented.
2. Old Bug 003: BSW M/MA/T/TA price and rarity groups share one horizontal model row and one Save button. Available variants are submitted in one bulk upsert database statement, which is transactional. Local records update only after the whole response is confirmed. Unavailable variants retain dashes. No workbook import or dataset reset.
3. Old Bug 005: move and restore the actual CHC, CR and KV product controls above the active curve, with responsive spacing. CR and KV retain their own options. KV configuration changes now repost the same model to its curve. Existing motor inclusion rules remain.
4. Old Bug 010: new database save/preview entry points use exact requested-reference occupancy for manual saves and highest existing company/year running number plus one for automatic previews. Internal counters and reuse queues no longer reject unused manual numbers. Duplicate checks execute under the existing company/year transaction lock. The frontend does not retry with a different reference. Existing updates and revision persistence delegate to existing handlers; history sorting and date logic are unchanged.
5. Improvement 002: printed Date/Rev labels, Project width aligned to the introductory paragraph, hanging value indentation, following metadata rows flow beneath Project, and later cover sections receive extra space for wrapped Project lines.
6. Improvement 003: item-page date/reference block sizes to its text, keeps normal date text on one line, and places the table after the block in document flow, removing the fixed top-position collision.

## Verification

- JavaScript syntax checks passed for all changed JavaScript files.
- Existing V5.00.36 browser regression passed BFI, BGF, GWS, KeyPLC, CHC C4/C6, CR, KV, ES and ISO source/final fixtures; BSW model/variant counts; permissions; component actions; configuration restore; remarks integration.
- Existing motor/bare-shaft/snapshot regression passed.
- Targeted browser checks passed one BSW Save per model, one complete payload, unavailable variant controls absent, and long date/reference layout above the table.
- Print-media layout screenshot inspected at tests/v50037-page2-layout.png.

## Remaining acceptance checks

The new SQL is supplied for staging review and has not been executed. Actual concurrent saves, database rollback on rejected BSW values, old/new client coexistence, original/revised quotation saves and full PDFs in Safari/macOS Preview and Windows remain staging acceptance requirements. The layout fixture is Chromium, not a claim of cross-platform PDF certification. Existing baseline tests use local test dependencies and are included as supplied.

ISO Special has no configured ISO rule/currencies. Key → Category → Special → ISO → Hold 3s to Edit: choose approved source currencies, enter approved Margin/Normal/Rare/Trimming/Transport and Use choices, then save. The owner must supply these business choices. Other categories with intentionally disabled families must not be automatically enabled.
