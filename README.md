# KeySuite V3.00

Complete GitHub-ready source built from the supplied KeySuite V2.38 full source.

## V3.00 amendments

- **Coupling Card Layout V2** — coupling cards use automatic height, the resolution message is separated from the selection controls, bush details have their own spacing, and the layout responds cleanly across desktop/tablet/mobile widths.
- **Quote History – Year Expand / Collapse** — quotation history years can be expanded or collapsed independently; an expanded year shows all 12 months. The current year opens by default while previous years start collapsed.

## Deployment

1. Extract `KeySuite_V3.00_GitHub.zip`.
2. Upload all extracted files and folders to the root of the existing GitHub repository and replace the old files.
3. Preserve the existing production `config.js`; it is intentionally not included in this package.
4. No new Supabase migration is required for V3.00.
5. After deployment, close/reopen KeySuite and press `Ctrl+F5`.

See `V300_CHANGES.txt`, `INSTALL_V300.txt`, `V300_NO_DATABASE_MIGRATION.txt`, and `V300_QA_REPORT.txt`.
